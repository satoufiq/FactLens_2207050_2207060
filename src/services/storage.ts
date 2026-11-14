export type ScanType = 'RUMOR' | 'SCAM' | 'IMAGE';

/**
 * The verdict a scan produced, across all three modules.
 *
 * Distinct from the scan's *lifecycle* status (PENDING, PROCESSING, PARTIAL …),
 * which lives in `ScanRecord.lifecycleStatus`. The two were previously conflated
 * under one name; they answer different questions — "what did it find?" versus
 * "did it finish, and with everything working?"
 */
export type ScanVerdict =
  | 'SUPPORTED'
  | 'CONTRADICTED'
  | 'UNVERIFIED'
  | 'UNVERIFIED_SUSPICIOUS'
  | 'HIGH_RISK'
  | 'MEDIUM_RISK'
  | 'LOW_RISK'
  | 'AUTHENTIC'
  | 'LIKELY_AUTHENTIC'
  | 'POSSIBLE_MANIPULATION'
  | 'LIKELY_AI_GENERATED'
  | 'UNABLE_TO_ANALYZE';

/** @deprecated Use `ScanVerdict`. Kept so existing imports keep resolving. */
export type ScanStatus = ScanVerdict;

/** Lifecycle state, mirroring the backend's scan lifecycle. */
export type ScanLifecycleStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'FAILED'
  | 'TIMEOUT'
  | 'AWAITING_INPUT';

export interface ScanRecord {
  id: string;
  type: ScanType;
  title: string;
  inputText: string;
  inputUrl?: string;
  result: ScanVerdict;
  confidence: number;
  confidenceDisplay: string;
  createdAt: string;
  summary: string;
  summaryBn?: string;
  details?: Record<string, any>;
  evidenceCount?: number;
  userId?: string;
  /** COMPLETED or PARTIAL both carry a verdict; PARTIAL means degraded. */
  lifecycleStatus?: ScanLifecycleStatus;
  /** True when a model or external service was unavailable for this scan. */
  isDegraded?: boolean;
}

export interface SavedEvidenceItem {
  id: string;
  scanId: string;
  title: string;
  sourceName: string;
  sourceType: string;
  url: string;
  relevanceScore: number;
  relationship: 'SUPPORTING' | 'CONTRADICTING' | 'NEUTRAL' | 'INSUFFICIENT';
  snippet: string;
  savedAt: string;
  collection: string;
  userId?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  organization: string;
  joinedDate: string;
  avatarUrl?: string;
  mfaEnabled: boolean;
  phone: string;
  location: string;
}

function getActiveUserKey(): string {
  try {
    const authData = localStorage.getItem('factlens_auth_user');
    if (authData) {
      const parsed = JSON.parse(authData);
      if (parsed?.id) return `user_${parsed.id}`;
      if (parsed?.email) return `user_${parsed.email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    }
  } catch {}
  return 'guest';
}

function getUserScansKey(): string {
  return `factlens_scans_${getActiveUserKey()}`;
}

function getUserEvidenceKey(): string {
  return `factlens_evidence_${getActiveUserKey()}`;
}

function getUserProfileKey(): string {
  return `factlens_user_profile_${getActiveUserKey()}`;
}

export const SystemStorage = {
  // Scans (Isolated strictly to the authenticated profile)
  getScans(): ScanRecord[] {
    try {
      const key = getUserScansKey();
      const data = localStorage.getItem(key);
      if (!data) {
        return [];
      }
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  getScanById(id: string): ScanRecord | null {
    const scans = this.getScans();
    return scans.find((s) => s.id === id) || null;
  },

  saveScan(scan: ScanRecord): void {
    const key = getUserScansKey();
    const userKey = getActiveUserKey();
    const recordToSave = { ...scan, userId: userKey };
    const scans = this.getScans();
    const existingIndex = scans.findIndex((s) => s.id === scan.id);
    if (existingIndex >= 0) {
      scans[existingIndex] = recordToSave;
    } else {
      scans.unshift(recordToSave);
    }
    localStorage.setItem(key, JSON.stringify(scans));
  },

  deleteScan(id: string): void {
    const key = getUserScansKey();
    const scans = this.getScans().filter((s) => s.id !== id);
    localStorage.setItem(key, JSON.stringify(scans));
  },

  clearAllScans(): void {
    const key = getUserScansKey();
    localStorage.setItem(key, JSON.stringify([]));
  },

  // Saved Evidence (Isolated per profile)
  getSavedEvidence(): SavedEvidenceItem[] {
    try {
      const key = getUserEvidenceKey();
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveEvidence(item: SavedEvidenceItem): void {
    const key = getUserEvidenceKey();
    const userKey = getActiveUserKey();
    const list = this.getSavedEvidence();
    if (!list.some((e) => e.id === item.id)) {
      list.unshift({ ...item, userId: userKey });
      localStorage.setItem(key, JSON.stringify(list));
    }
  },

  removeSavedEvidence(id: string): void {
    const key = getUserEvidenceKey();
    const list = this.getSavedEvidence().filter((e) => e.id !== id);
    localStorage.setItem(key, JSON.stringify(list));
  },

  isEvidenceSaved(id: string): boolean {
    return this.getSavedEvidence().some((e) => e.id === id);
  },

  // Collections
  getCollections(): string[] {
    try {
      const data = localStorage.getItem('factlens_collections');
      return data ? JSON.parse(data) : ['Official Gazettes', 'Clarification Circulars', 'Banking & MFS'];
    } catch {
      return ['Official Gazettes', 'Clarification Circulars', 'Banking & MFS'];
    }
  },

  addCollection(name: string): void {
    const collections = this.getCollections();
    if (!collections.includes(name)) {
      collections.push(name);
      localStorage.setItem('factlens_collections', JSON.stringify(collections));
    }
  },

  // User Profile (Isolated per authenticated profile)
  getUserProfile(): UserProfile {
    try {
      let liveName = '';
      let liveEmail = '';
      let liveRole = '';

      const authData = localStorage.getItem('factlens_auth_user');
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          if (parsed?.full_name) liveName = parsed.full_name;
          if (parsed?.email) liveEmail = parsed.email;
          if (parsed?.role) liveRole = parsed.role.replace('ROLE_', '');
        } catch {}
      }

      const profileKey = getUserProfileKey();
      const data = localStorage.getItem(profileKey);
      const base: UserProfile = data
        ? JSON.parse(data)
        : {
            name: liveName || 'FactLens Analyst',
            email: liveEmail || 'analyst@factlens.gov.bd',
            role: liveRole ? `${liveRole} Investigator` : 'Verification Analyst',
            organization: 'FactLens Verification Network',
            joinedDate: new Date().toISOString().split('T')[0],
            mfaEnabled: false,
            phone: '',
            location: 'Bangladesh',
          };

      return {
        ...base,
        name: liveName || base.name,
        email: liveEmail || base.email,
        role: liveRole ? `${liveRole} Investigator` : base.role,
      };
    } catch {
      return {
        name: 'FactLens Analyst',
        email: 'analyst@factlens.gov.bd',
        role: 'Verification Analyst',
        organization: 'FactLens Verification Network',
        joinedDate: new Date().toISOString().split('T')[0],
        mfaEnabled: false,
        phone: '',
        location: 'Bangladesh',
      };
    }
  },

  updateUserProfile(updated: Partial<UserProfile>): UserProfile {
    const profileKey = getUserProfileKey();
    const current = this.getUserProfile();
    const next = { ...current, ...updated };
    localStorage.setItem(profileKey, JSON.stringify(next));
    return next;
  },

  // Stats calculation (Strictly computed for active profile only)
  getSystemStats() {
    const scans = this.getScans();
    const total = scans.length;
    const rumor = scans.filter((s) => s.type === 'RUMOR').length;
    const scam = scans.filter((s) => s.type === 'SCAM').length;
    const image = scans.filter((s) => s.type === 'IMAGE').length;
    const saved = this.getSavedEvidence().length;
    return { total, rumor, scam, image, saved };
  }
};
