/**
 * FactLens API client.
 *
 * Every analysis is asynchronous. The API writes a PENDING scan, queues it and
 * returns a scan id immediately; this client polls until the status is
 * terminal. That is the proposal's lifecycle:
 *
 *     PENDING -> PROCESSING -> COMPLETED
 *       PARTIAL         a usable verdict produced without part of the system
 *       FAILED          a critical failure
 *       TIMEOUT         over the time budget, and retryable
 *       AWAITING_INPUT  OCR could not read the image; the user types the text
 *
 * PARTIAL is not an error. It means a model or an external service was
 * unavailable and the module fell back to its other signals. The UI must show
 * the verdict *and* say what was missing, so `degraded_reason` travels with
 * every response rather than being swallowed here.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/** Direct service ports, used when the nginx gateway is not in front. */
const DIRECT_PORTS = {
  identity: 8001,
  rumour: 8002,
  scam: 8003,
  image: 8004,
} as const;

type ServiceKey = keyof typeof DIRECT_PORTS;

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type ScanStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'FAILED'
  | 'TIMEOUT'
  | 'AWAITING_INPUT';

export const TERMINAL_STATUSES: ScanStatus[] = [
  'COMPLETED',
  'PARTIAL',
  'FAILED',
  'TIMEOUT',
  'AWAITING_INPUT',
];

export function isTerminal(status: string): boolean {
  return TERMINAL_STATUSES.includes(status as ScanStatus);
}

/** COMPLETED and PARTIAL both carry a usable verdict. */
export function hasVerdict(status: string): boolean {
  return status === 'COMPLETED' || status === 'PARTIAL';
}

/** One component that was unavailable, with copy written for the user. */
export interface DegradationEntry {
  component: string;
  reason: string;
  user_message: string;
  user_message_bn?: string | null;
  severity?: string;
}

export interface ModelRunRecord {
  model_name: string;
  model_version: string;
  status: 'OK' | 'UNAVAILABLE' | 'TIMEOUT' | 'ERROR';
  latency_ms?: number | null;
  error_message?: string | null;
}

export interface ScanAccepted {
  scan_id: string;
  status: ScanStatus;
  type: string;
  poll_url: string;
  created_at: string;
  estimated_seconds: number;
  cached: boolean;
  message: string;
}

/**
 * Submit a scan once per navigation.
 *
 * React's StrictMode (development) mounts every page twice, so a page that
 * submits from useEffect would create two scans for one click. The models
 * never queue: the duplicate arrived while the first was still running and
 * came back "model busy", and the page showed the duplicate. Keyed by the
 * router's location.key, both mounts share one submission. A failed
 * submission is forgotten so "Scan again" can retry.
 */
const submissions = new Map<string, Promise<ScanAccepted>>();

export function submitScanOnce(
  key: string,
  submit: () => Promise<ScanAccepted>,
): Promise<ScanAccepted> {
  const existing = submissions.get(key);
  if (existing) return existing;
  const pending = submit();
  submissions.set(key, pending);
  pending.catch(() => submissions.delete(key));
  if (submissions.size > 50) {
    const oldest = submissions.keys().next().value;
    if (oldest !== undefined) submissions.delete(oldest);
  }
  return pending;
}

export interface UrlFlag {
  code: string;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  message_bn?: string | null;
  detail?: string | null;
}

export interface UrlAnalysisRecord {
  id: number;
  url: string;
  domain?: string | null;
  registered_domain?: string | null;
  tld?: string | null;
  has_https: boolean;
  redirect_chain?: string[] | null;
  reputation_score?: number | null;
  reputation_source?: string | null;
  flags?: UrlFlag[] | null;
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

function authToken(): string | null {
  return (
    localStorage.getItem('factlens_access_token') ||
    localStorage.getItem('factlens_auth_token')
  );
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = authToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

/** Candidate base URLs for a service: gateway first, then the direct port. */
function candidates(service: ServiceKey, path: string): string[] {
  const port = DIRECT_PORTS[service];
  const urls = [`${API_BASE_URL}${path}`];
  if (!API_BASE_URL) {
    urls.push(`http://127.0.0.1:${port}${path}`, `http://localhost:${port}${path}`);
  }
  return urls;
}

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(
  service: ServiceKey,
  path: string,
  init: RequestInit = {},
  timeoutMs = 20000,
): Promise<T> {
  let lastError: unknown = null;

  for (const url of candidates(service, path)) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);

      if (response.ok) {
        if (response.status === 204) return undefined as T;
        return (await response.json()) as T;
      }

      // A 4xx is the server's considered answer — a validation failure, a rate
      // limit, a permission error. Retrying the next host would only repeat
      // it, and would hide the message the user needs to see.
      if (response.status >= 400 && response.status < 500) {
        let detail = `Request failed (${response.status}).`;
        try {
          const body = await response.json();
          detail = body?.detail ?? detail;
        } catch {
          /* non-JSON error body */
        }
        throw new ApiError(response.status, detail);
      }

      lastError = new ApiError(response.status, `Server error (${response.status}).`);
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof ApiError) throw error;
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('The FactLens backend could not be reached.');
}

// ---------------------------------------------------------------------------
// Polling
// ---------------------------------------------------------------------------

export interface PollOptions {
  /** Called on each poll so the UI can show live progress. */
  onUpdate?: (status: ScanStatus, attempt: number) => void;
  /** Give up after this long and report a client-side timeout. */
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * Poll a scan until it reaches a terminal status.
 *
 * The interval backs off from 700 ms to 3 s: early polls catch the fast cases
 * (a cache hit, a rules-only scam scan) without making a 100-second rumor scan
 * hammer the API.
 */
async function pollScan<T extends { status: string }>(
  service: ServiceKey,
  path: string,
  options: PollOptions = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 180000;
  const startedAt = Date.now();
  let attempt = 0;

  for (;;) {
    if (options.signal?.aborted) throw new Error('Polling was cancelled.');

    const scan = await request<T>(service, path, { headers: authHeaders() }, 15000);
    attempt += 1;
    options.onUpdate?.(scan.status as ScanStatus, attempt);

    if (isTerminal(scan.status)) return scan;

    if (Date.now() - startedAt > timeoutMs) {
      throw new ApiError(
        504,
        'This scan is taking longer than expected. It is still running — open it ' +
          'from your history in a moment to see the result.',
      );
    }

    const delay = Math.min(3000, 700 + attempt * 250);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export interface ServiceHealth {
  service: string;
  status: string;
  version: string;
  degraded_components: string[];
  database?: { backend: string; reachable: boolean; degraded_to_sqlite: boolean };
  queue?: { mode: string; async: boolean; queue: string };
  cache?: { available: boolean };
  model?: {
    model: string;
    version: string;
    available: boolean;
    reason?: string | null;
    manifest?: Record<string, unknown>;
  };
  ocr?: { engine: string; available: boolean; version: string };
  rules?: { version: string; rule_count: number; available: boolean };
  registry?: {
    registered_count: number;
    total_count: number;
    models: Array<{ name: string; registered: boolean; version: string; notes?: string }>;
  };
}

export async function checkServiceHealth(service: ServiceKey): Promise<ServiceHealth | null> {
  // The gateway (nginx in production, the Vite proxy in development) exposes
  // each service's /health under /api/v1/health/<service>. The direct port is
  // the fallback when nothing sits in front of the services.
  const urls = [`${API_BASE_URL}/api/v1/health/${service}`];
  if (!API_BASE_URL) {
    urls.push(`http://127.0.0.1:${DIRECT_PORTS[service]}/health`);
  }

  for (const url of urls) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!response.ok) continue;
      // An SPA fallback returns index.html with a 200; only JSON is health.
      if (!(response.headers.get('content-type') ?? '').includes('application/json')) continue;
      return (await response.json()) as ServiceHealth;
    } catch {
      clearTimeout(timer);
    }
  }
  return null;
}

/** Backwards-compatible: the rumour service's health. */
export async function checkBackendHealth(): Promise<
  (ServiceHealth & { model_loaded: boolean }) | null
> {
  const health = await checkServiceHealth('rumour');
  if (!health) return null;
  return { ...health, model_loaded: Boolean(health.model?.available) };
}

export interface SystemHealth {
  identity: ServiceHealth | null;
  rumour: ServiceHealth | null;
  scam: ServiceHealth | null;
  image: ServiceHealth | null;
}

/** All four services at once, for the system status panel. */
export async function checkSystemHealth(): Promise<SystemHealth> {
  const [identity, rumour, scam, image] = await Promise.all([
    checkServiceHealth('identity'),
    checkServiceHealth('rumour'),
    checkServiceHealth('scam'),
    checkServiceHealth('image'),
  ]);
  return { identity, rumour, scam, image };
}

// ---------------------------------------------------------------------------
// OCR — the shared input layer
// ---------------------------------------------------------------------------

export interface OcrResponseData {
  success: boolean;
  extracted_text: string;
  confidence: number;
  confidence_pct: string;
  language: string;
  resolution?: string;
  engine?: string;
  detected_urls?: string[];
  blocks?: Array<{ text: string; confidence: number; bbox: number[] }>;
  requires_user_review?: boolean;
  next_action?: 'REVIEW_AND_CONFIRM' | 'MANUAL_ENTRY';
  next_action_message?: string;
  next_action_message_bn?: string;
  error?: string | null;
}

/**
 * Extract text from a screenshot for the user to review.
 *
 * Nothing is analyzed here. The review step is not optional: Bangla OCR on
 * low-quality screenshots makes errors that would silently corrupt every
 * downstream stage, so the confirmed text is submitted separately.
 */
export async function extractOcrApi(file: File): Promise<OcrResponseData | null> {
  const form = new FormData();
  form.append('file', file);
  try {
    return await request<OcrResponseData>(
      'rumour',
      '/api/v1/ocr',
      { method: 'POST', body: form, headers: authHeaders() },
      60000,
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        success: false,
        extracted_text: '',
        confidence: 0,
        confidence_pct: '0%',
        language: 'bn',
        error: error.detail,
        next_action: 'MANUAL_ENTRY',
      };
    }
    console.warn('[FactLens OCR] request failed:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Module 1 — Rumor / Claim Scanner
// ---------------------------------------------------------------------------

export interface EvidenceItem {
  id: string | number;
  title: string;
  source_name?: string;
  publisher?: string;
  source_type: string;
  url: string;
  relevance_score: number;
  source_reliability?: number;
  directness_score?: number;
  temporal_match_score?: number;
  stance?: 'SUPPORTING' | 'CONTRADICTING' | 'NEUTRAL' | 'INSUFFICIENT';
  relationship: 'SUPPORTING' | 'CONTRADICTING' | 'NEUTRAL' | 'INSUFFICIENT';
  stance_source?: string;
  published_date?: string;
  published_at?: string;
  snippet: string;
  reason?: string;
}

export interface BanglaVerifyDetails {
  model_name: string;
  version: string;
  base_architecture?: string;
  task_type?: string;
  available: boolean;
  reason?: string | null;
  /** Per-mode calibrated thresholds, e.g. { full: 0.65, short: 0.485 }. */
  decision_threshold?: number | Record<string, number> | null;
  metrics?: Record<string, unknown>;
  headline_word_threshold?: number;
}

export interface PrecedenceDetails {
  verdict: string;
  confidence: number;
  /** evidence | fuzzy_inference | model_prior | no_signal */
  decided_by: string;
  overrode_fuzzy: boolean;
  fuzzy_verdict?: string | null;
  model_label?: string | null;
  disagreement?: string | null;
  rationale: string[];
  evidence_strength: Record<string, number>;
}

export interface FuzzyScores {
  support_score: number;
  contradiction_score: number;
  decision_margin: number;
  fuzzy_verdict?: string;
  engine?: string;
  decided_by?: string;
  overrode_fuzzy?: boolean;
}

export interface RumorExplanation {
  headline: string;
  headline_bn: string;
  summary: string;
  summary_bn: string;
  evidence_found?: { supporting: number; contradicting: number; total: number };
  sources_cited?: Array<Record<string, unknown>>;
  reasoning?: string[];
  decided_by?: string;
  disagreement?: string | null;
  model_note?: string;
  degraded?: string[];
  unverified_notice?: string | null;
  unverified_notice_bn?: string | null;
}

export type RumorVerdict =
  | 'SUPPORTED'
  | 'CONTRADICTED'
  | 'UNVERIFIED'
  | 'UNVERIFIED_SUSPICIOUS'
  | 'UNABLE_TO_ANALYZE';

export interface ClaimVerifyResponse {
  scan_id: string;
  user_id?: string | null;
  type: 'RUMOR';
  status: ScanStatus;
  is_terminal: boolean;
  is_degraded: boolean;

  claim_text?: string;
  normalized_text?: string;
  input_url?: string | null;
  language?: string | null;

  verdict?: RumorVerdict | null;
  confidence?: number | null;
  confidence_display?: string | null;
  title?: string | null;
  title_bn?: string | null;

  summary?: string | null;
  summary_bn?: string | null;
  explanation?: RumorExplanation | null;
  limitations?: string[] | null;
  detail?: Record<string, any> | null;
  signal_summary?: Record<string, any> | null;
  degraded_reason?: DegradationEntry[] | null;

  banglaverify?: BanglaVerifyDetails | null;
  fuzzy_scores?: FuzzyScores | null;
  web_search?: {
    performed: boolean;
    queries_executed: string[];
    total_results: number;
    independent_sources?: number;
  } | null;
  evidence_summary?: {
    supporting_sources: number;
    contradicting_sources: number;
    neutral_sources: number;
    total_sources: number;
    decided_by?: string;
  } | null;

  evidence: EvidenceItem[];
  url_analyses?: UrlAnalysisRecord[];
  model_runs?: ModelRunRecord[];

  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  duration_ms?: number | null;
}

export interface RumorScanInput {
  claim: string;
  input_url?: string;
  source_format?: 'TEXT' | 'IMAGE' | 'URL';
  ocr_confirmed?: boolean;
}

/** Submit a claim. Returns as soon as the scan is queued. */
export async function createRumorScan(input: RumorScanInput): Promise<ScanAccepted> {
  return request<ScanAccepted>('rumour', '/api/v1/rumours/scans', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      claim: input.claim,
      input_url: input.input_url ?? null,
      source_format: input.source_format ?? 'TEXT',
      ocr_confirmed: input.ocr_confirmed ?? false,
    }),
  });
}

export async function getRumorScan(scanId: string): Promise<ClaimVerifyResponse> {
  return request<ClaimVerifyResponse>('rumour', `/api/v1/rumours/scans/${scanId}`, {
    headers: authHeaders(),
  });
}

export async function pollRumorScan(
  scanId: string,
  options: PollOptions = {},
): Promise<ClaimVerifyResponse> {
  return pollScan<ClaimVerifyResponse>(
    'rumour',
    `/api/v1/rumours/scans/${scanId}`,
    options,
  );
}

/**
 * Submit a claim and wait for the verdict.
 *
 * Returns null only when the backend is unreachable. A PARTIAL result is a
 * success: check `is_degraded` and show `degraded_reason` beside the verdict.
 */
export async function verifyClaimApi(
  claimText: string,
  options: PollOptions & { inputUrl?: string; sourceFormat?: 'TEXT' | 'IMAGE' | 'URL' } = {},
): Promise<ClaimVerifyResponse | null> {
  try {
    const accepted = await createRumorScan({
      claim: claimText,
      input_url: options.inputUrl,
      source_format: options.sourceFormat ?? 'TEXT',
      ocr_confirmed: options.sourceFormat === 'IMAGE',
    });
    return await pollRumorScan(accepted.scan_id, options);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.warn('[FactLens API] rumor scan failed:', error);
    return null;
  }
}

export interface BackendScanListItem {
  id: string;
  scan_id: string;
  claim_text?: string;
  status: ScanStatus;
  verdict?: string | null;
  confidence?: number | null;
  confidence_display?: string | null;
  evidence_count: number;
  created_at: string;
}

export async function listScansApi(): Promise<BackendScanListItem[]> {
  try {
    return await request<BackendScanListItem[]>('rumour', '/api/v1/rumours/scans', {
      headers: authHeaders(),
    });
  } catch {
    return [];
  }
}

export async function deleteRumorScan(scanId: string): Promise<boolean> {
  try {
    await request('rumour', `/api/v1/rumours/scans/${scanId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Module 2 — Scam Alert
// ---------------------------------------------------------------------------

export type RiskLevel = 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK' | 'UNABLE_TO_ANALYZE';
export type ScamRisk = 'High' | 'Medium' | 'Low' | 'Unable to Analyze';
export type ScamNetClass = 'normal' | 'promo' | 'smish';

export interface ScamIndicator {
  id: number;
  rule_id?: string | null;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  description_bn?: string | null;
  matched_text?: string | null;
  weight?: number | null;
}

export interface ScamExplanation {
  headline: string;
  headline_bn: string;
  summary: string;
  reasons: Array<{
    source: string;
    category: string;
    severity: string;
    text: string;
    text_bn?: string | null;
    url?: string;
  }>;
  model_note?: string | null;
  recommendation: string;
  recommendation_bn: string;
  degraded?: string[];
  scoring?: Record<string, unknown>;
}

export interface ScamScanResponse {
  scan_id: string;
  user_id?: string | null;
  type: 'SCAM';
  status: ScanStatus;
  is_terminal: boolean;
  is_degraded: boolean;

  message_text?: string | null;
  input_url?: string | null;
  language?: string | null;

  /** The proposal's categories. */
  risk?: ScamRisk | null;
  /** What to show: "High Risk", "Medium Risk", "Low Risk" or "Promotional message". */
  risk_label?: string | null;
  risk_level?: RiskLevel | null;
  /** With the model: its scam probability x 100. Without it: the rules + URL score. */
  risk_score?: number | null;
  confidence?: number | null;
  confidence_display?: string | null;

  // -- ScamNet-BN (null / empty on a PARTIAL scan where the model did not run)
  class?: ScamNetClass | null;
  probabilities?: Record<ScamNetClass, number> | null;
  /** Model indicator codes: url, phone, money, code, account, email, urgent, finance, reward, action, threat, job. */
  indicators: string[];
  model_version?: string | null;

  summary?: string | null;
  summary_bn?: string | null;
  explanation?: ScamExplanation | null;
  limitations?: string[] | null;
  detail?: Record<string, any> | null;
  signal_summary?: Record<string, any> | null;
  degraded_reason?: DegradationEntry[] | null;

  /** Every stored indicator row: YAML rule hits and model indicators. */
  indicator_details: ScamIndicator[];
  url_analyses: UrlAnalysisRecord[];
  model_runs: ModelRunRecord[];

  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  duration_ms?: number | null;
}

export interface ScamScanInput {
  message: string;
  input_url?: string;
  source_format?: 'TEXT' | 'IMAGE' | 'URL';
  ocr_confirmed?: boolean;
}

export async function createScamScan(input: ScamScanInput): Promise<ScanAccepted> {
  return request<ScanAccepted>('scam', '/api/v1/scams/scans', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      message: input.message,
      input_url: input.input_url ?? null,
      source_format: input.source_format ?? 'TEXT',
      ocr_confirmed: input.ocr_confirmed ?? false,
    }),
  });
}

export async function getScamScan(scanId: string): Promise<ScamScanResponse> {
  return request<ScamScanResponse>('scam', `/api/v1/scams/scans/${scanId}`, {
    headers: authHeaders(),
  });
}

export async function pollScamScan(
  scanId: string,
  options: PollOptions = {},
): Promise<ScamScanResponse> {
  return pollScan<ScamScanResponse>('scam', `/api/v1/scams/scans/${scanId}`, options);
}

/** Submit a message and wait for the risk assessment. */
export async function analyzeScamApi(
  message: string,
  options: PollOptions & { inputUrl?: string; sourceFormat?: 'TEXT' | 'IMAGE' | 'URL' } = {},
): Promise<ScamScanResponse | null> {
  try {
    const accepted = await createScamScan({
      message,
      input_url: options.inputUrl,
      source_format: options.sourceFormat ?? 'TEXT',
      ocr_confirmed: options.sourceFormat === 'IMAGE',
    });
    return await pollScamScan(accepted.scan_id, options);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.warn('[FactLens API] scam scan failed:', error);
    return null;
  }
}

export interface ScamScanListItem {
  scan_id: string;
  status: ScanStatus;
  risk?: ScamRisk | null;
  risk_label?: string | null;
  risk_level?: RiskLevel | null;
  confidence?: number | null;
  message_preview?: string | null;
  indicator_count: number;
  created_at: string;
}

export async function listScamScansApi(): Promise<ScamScanListItem[]> {
  try {
    return await request<ScamScanListItem[]>('scam', '/api/v1/scams/scans', {
      headers: authHeaders(),
    });
  } catch {
    return [];
  }
}

export async function deleteScamScan(scanId: string): Promise<boolean> {
  try {
    await request('scam', `/api/v1/scams/scans/${scanId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Module 3 — Image Check
// ---------------------------------------------------------------------------

export type ImageAssessment =
  | 'LIKELY_AUTHENTIC'
  | 'POSSIBLE_MANIPULATION'
  | 'LIKELY_AI_GENERATED'
  | 'UNABLE_TO_ANALYZE';

export interface ForensicSignal {
  source: string;
  code: string;
  points_to: 'synthetic' | 'authentic' | 'neutral';
  weight: number;
  text: string;
  text_bn?: string | null;
  caveat?: string | null;
}

export interface ImageExplanation {
  headline: string;
  headline_bn: string;
  summary: string;
  findings: ForensicSignal[];
  model_note?: string | null;
  /** Shown with every result: AI-image detection is an unsolved problem. */
  standing_caveat: string;
  standing_caveat_bn: string;
  degraded?: string[];
  scoring?: Record<string, unknown>;
}

export interface ImageAnalysisRecord {
  id: number;
  file_name: string;
  file_type?: string | null;
  file_size?: number | null;
  width?: number | null;
  height?: number | null;
  ai_probability?: number | null;
  manipulation_probability?: number | null;
  image_metadata?: Record<string, any> | null;
  technical_signals?: Record<string, any> | null;
  /** False once the retention window has deleted the original bytes. */
  file_retained: boolean;
}

export interface ImageScanResponse {
  scan_id: string;
  user_id?: string | null;
  type: 'IMAGE';
  status: ScanStatus;
  is_terminal: boolean;
  is_degraded: boolean;

  assessment?: ImageAssessment | null;
  score?: number | null;
  confidence?: number | null;
  confidence_display?: string | null;

  summary?: string | null;
  summary_bn?: string | null;
  explanation?: ImageExplanation | null;
  limitations?: string[] | null;
  detail?: Record<string, any> | null;
  signal_summary?: Record<string, any> | null;
  degraded_reason?: DegradationEntry[] | null;

  analysis?: ImageAnalysisRecord | null;
  model_runs: ModelRunRecord[];

  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  duration_ms?: number | null;
}

export async function createImageScan(file: File, note?: string): Promise<ScanAccepted> {
  const form = new FormData();
  form.append('file', file);
  if (note) form.append('note', note);
  return request<ScanAccepted>(
    'image',
    '/api/v1/images/scans',
    { method: 'POST', body: form, headers: authHeaders() },
    60000,
  );
}

export async function getImageScan(scanId: string): Promise<ImageScanResponse> {
  return request<ImageScanResponse>('image', `/api/v1/images/scans/${scanId}`, {
    headers: authHeaders(),
  });
}

export async function pollImageScan(
  scanId: string,
  options: PollOptions = {},
): Promise<ImageScanResponse> {
  return pollScan<ImageScanResponse>('image', `/api/v1/images/scans/${scanId}`, options);
}

/** Upload an image and wait for the forensic assessment. */
export async function analyzeImageApi(
  file: File,
  options: PollOptions & { note?: string } = {},
): Promise<ImageScanResponse | null> {
  try {
    const accepted = await createImageScan(file, options.note);
    return await pollImageScan(accepted.scan_id, options);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.warn('[FactLens API] image scan failed:', error);
    return null;
  }
}

export interface ImageScanListItem {
  scan_id: string;
  status: ScanStatus;
  assessment?: ImageAssessment | null;
  confidence?: number | null;
  file_name?: string | null;
  created_at: string;
}

export async function listImageScansApi(): Promise<ImageScanListItem[]> {
  try {
    return await request<ImageScanListItem[]>('image', '/api/v1/images/scans', {
      headers: authHeaders(),
    });
  } catch {
    return [];
  }
}

export async function deleteImageScan(scanId: string): Promise<boolean> {
  try {
    await request('image', `/api/v1/images/scans/${scanId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Profile (Identity service)
// ---------------------------------------------------------------------------

export interface UserProfileResponse {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  account_status: string;
  bio?: string;
  avatar_url?: string;
  phone?: string;
  organization?: string;
  designation?: string;
  location?: string;
  preferences?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface UpdateProfilePayload {
  full_name?: string;
  bio?: string;
  phone?: string;
  organization?: string;
  designation?: string;
  location?: string;
  preferences?: Record<string, any>;
}

export async function getProfileApi(): Promise<UserProfileResponse | null> {
  try {
    return await request<UserProfileResponse>('identity', '/api/v1/profile/me', {
      headers: authHeaders(),
    });
  } catch {
    return null;
  }
}

export async function updateProfileApi(
  payload: UpdateProfilePayload,
): Promise<UserProfileResponse | null> {
  try {
    return await request<UserProfileResponse>('identity', '/api/v1/profile/me', {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
  } catch {
    return null;
  }
}

export async function uploadAvatarApi(file: File): Promise<{ avatar_url: string } | null> {
  const form = new FormData();
  form.append('file', file);
  try {
    return await request<{ avatar_url: string }>(
      'identity',
      '/api/v1/profile/me/avatar',
      { method: 'PUT', body: form, headers: authHeaders() },
      30000,
    );
  } catch {
    return null;
  }
}

export async function removeAvatarApi(): Promise<boolean> {
  try {
    await request('identity', '/api/v1/profile/me/avatar', {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// PDF dossier
// ---------------------------------------------------------------------------

export async function downloadScanPdf(scanId: string, filename?: string): Promise<boolean> {
  for (const url of candidates('rumour', `/api/v1/rumours/scans/${scanId}/report.pdf`)) {
    try {
      const response = await fetch(url, { headers: authHeaders() });
      if (!response.ok) continue;

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename || `FactLens_Scan_Report_${scanId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
      return true;
    } catch (error) {
      console.warn(`[PDF Download] ${url} failed:`, error);
    }
  }
  return false;
}
