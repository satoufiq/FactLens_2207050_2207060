// ============================================
// FactLens Mock Data
// Realistic Bengali-first prototype data
// ============================================

export interface EvidenceSource {
  id: string;
  title: string;
  titleBn?: string;
  url: string;
  sourceName: string;
  sourceType: 'government' | 'news' | 'university' | 'social_media' | 'organization';
  publishedDate: string;
  retrievedAt: string;
  relevantQuote?: string;
  relevantQuoteBn?: string;
  relationship: 'supports' | 'contradicts' | 'neutral';
}

export interface RumorResult {
  id: string;
  type: 'rumor';
  inputText: string;
  inputTextBn?: string;
  assessment: 'supported' | 'contradicted' | 'unverified' | 'unable_to_analyze';
  assessmentLabel: string;
  assessmentLabelBn: string;
  explanation: string;
  explanationBn: string;
  confidence: number;
  evidence: EvidenceSource[];
  createdAt: string;
  status: 'completed' | 'partial' | 'failed';
  processingSteps: ProcessingStep[];
}

export interface ScamIndicator {
  id: string;
  type: string;
  typeBn: string;
  description: string;
  descriptionBn: string;
  severity: 'high' | 'medium' | 'low';
}

export interface ScamResult {
  id: string;
  type: 'scam';
  inputText: string;
  inputTextBn?: string;
  riskLevel: 'high' | 'medium' | 'low';
  riskLabel: string;
  riskLabelBn: string;
  probability: number;
  explanation: string;
  explanationBn: string;
  indicators: ScamIndicator[];
  createdAt: string;
  status: 'completed' | 'partial' | 'failed';
  processingSteps: ProcessingStep[];
}

export interface ImageSignal {
  id: string;
  name: string;
  nameBn: string;
  value: number;
  description: string;
  descriptionBn: string;
}

export interface ImageMetadata {
  camera: string | null;
  software: string | null;
  dimensions: string;
  colorProfile: string;
  gps: string | null;
  timestamp: string | null;
}

export interface ImageResult {
  id: string;
  type: 'image';
  imageUrl: string;
  fileName: string;
  assessment: 'likely_authentic' | 'possible_manipulation' | 'likely_ai_generated' | 'unable_to_analyze';
  assessmentLabel: string;
  assessmentLabelBn: string;
  explanation: string;
  explanationBn: string;
  aiGenerationScore: number;
  technicalSignalScore: number;
  signals: ImageSignal[];
  metadata: ImageMetadata;
  createdAt: string;
  status: 'completed' | 'partial' | 'failed';
  processingSteps: ProcessingStep[];
}

export interface ProcessingStep {
  id: string;
  label: string;
  labelBn: string;
  status: 'completed' | 'in_progress' | 'pending' | 'failed';
}

export type ScanResult = RumorResult | ScamResult | ImageResult;

// ============================================
// Processing Steps Templates
// ============================================

export const rumorProcessingSteps: ProcessingStep[] = [
  { id: 'input', label: 'Input received', labelBn: 'ইনপুট গৃহীত', status: 'completed' },
  { id: 'validate', label: 'Content validated', labelBn: 'বিষয়বস্তু যাচাইকৃত', status: 'completed' },
  { id: 'ocr', label: 'OCR completed', labelBn: 'OCR সম্পন্ন', status: 'completed' },
  { id: 'extract', label: 'Extracting claim', labelBn: 'দাবি নিষ্কাশন', status: 'in_progress' },
  { id: 'search', label: 'Searching evidence', labelBn: 'প্রমাণ অনুসন্ধান', status: 'pending' },
  { id: 'compare', label: 'Comparing sources', labelBn: 'উৎস তুলনা', status: 'pending' },
  { id: 'explain', label: 'Preparing explanation', labelBn: 'ব্যাখ্যা প্রস্তুতি', status: 'pending' },
];

export const scamProcessingSteps: ProcessingStep[] = [
  { id: 'input', label: 'Input received', labelBn: 'ইনপুট গৃহীত', status: 'completed' },
  { id: 'validate', label: 'Content validated', labelBn: 'বিষয়বস্তু যাচাইকৃত', status: 'completed' },
  { id: 'pattern', label: 'Pattern analysis', labelBn: 'প্যাটার্ন বিশ্লেষণ', status: 'in_progress' },
  { id: 'url', label: 'URL reputation check', labelBn: 'URL খ্যাতি যাচাই', status: 'pending' },
  { id: 'classify', label: 'Risk classification', labelBn: 'ঝুঁকি শ্রেণীবিভাগ', status: 'pending' },
  { id: 'explain', label: 'Preparing report', labelBn: 'রিপোর্ট প্রস্তুতি', status: 'pending' },
];

export const imageProcessingSteps: ProcessingStep[] = [
  { id: 'input', label: 'Image received', labelBn: 'ছবি গৃহীত', status: 'completed' },
  { id: 'validate', label: 'Image validated', labelBn: 'ছবি যাচাইকৃত', status: 'completed' },
  { id: 'metadata', label: 'Extracting metadata', labelBn: 'মেটাডেটা নিষ্কাশন', status: 'in_progress' },
  { id: 'visual', label: 'Visual analysis', labelBn: 'ভিজ্যুয়াল বিশ্লেষণ', status: 'pending' },
  { id: 'ai', label: 'AI detection', labelBn: 'AI সনাক্তকরণ', status: 'pending' },
  { id: 'explain', label: 'Preparing assessment', labelBn: 'মূল্যায়ন প্রস্তুতি', status: 'pending' },
];

// ============================================
// Mock Rumor Result
// ============================================

export const mockRumorResult: RumorResult = {
  id: 'scan-001',
  type: 'rumor',
  inputText: 'All universities in the country will be closed tomorrow.',
  inputTextBn: 'আগামীকাল দেশের সব বিশ্ববিদ্যালয় বন্ধ থাকবে।',
  assessment: 'unverified',
  assessmentLabel: 'Unverified',
  assessmentLabelBn: 'অযাচাইকৃত',
  explanation: 'No sufficient authoritative evidence was found to confirm this claim. The Ministry of Education has not issued any official notification regarding university closures. Multiple university websites show normal academic schedules.',
  explanationBn: 'এই দাবিটি নিশ্চিত করার জন্য পর্যাপ্ত প্রামাণিক তথ্য পাওয়া যায়নি। শিক্ষা মন্ত্রণালয় বিশ্ববিদ্যালয় বন্ধের বিষয়ে কোনো আনুষ্ঠানিক বিজ্ঞপ্তি জারি করেনি। একাধিক বিশ্ববিদ্যালয়ের ওয়েবসাইটে স্বাভাবিক একাডেমিক সূচি দেখা যাচ্ছে।',
  confidence: 15,
  evidence: [
    {
      id: 'ev-001',
      title: 'Ministry announces examination schedule',
      titleBn: 'মন্ত্রণালয় পরীক্ষার সময়সূচী ঘোষণা',
      url: 'https://moedu.gov.bd/notices/2026/exam-schedule',
      sourceName: 'Ministry of Education',
      sourceType: 'government',
      publishedDate: '2026-09-18',
      retrievedAt: '2026-09-21T20:00:00Z',
      relevantQuote: 'The ministry stated that all examinations will proceed as scheduled.',
      relevantQuoteBn: 'মন্ত্রণালয় জানিয়েছে যে সকল পরীক্ষা নির্ধারিত সময়সূচী অনুযায়ী অনুষ্ঠিত হবে।',
      relationship: 'contradicts',
    },
    {
      id: 'ev-002',
      title: 'University Portal Academic Calendar',
      titleBn: 'বিশ্ববিদ্যালয় পোর্টাল একাডেমিক ক্যালেন্ডার',
      url: 'https://du.ac.bd/academic-calendar',
      sourceName: 'University of Dhaka',
      sourceType: 'university',
      publishedDate: '2026-09-15',
      retrievedAt: '2026-09-21T20:01:00Z',
      relevantQuote: 'Regular academic activities continue through September.',
      relevantQuoteBn: 'সেপ্টেম্বর মাস জুড়ে নিয়মিত একাডেমিক কার্যক্রম চলমান।',
      relationship: 'contradicts',
    },
    {
      id: 'ev-003',
      title: 'No official closure announcement found',
      titleBn: 'কোনো আনুষ্ঠানিক বন্ধের ঘোষণা পাওয়া যায়নি',
      url: 'https://bdnews24.com',
      sourceName: 'bdnews24.com',
      sourceType: 'news',
      publishedDate: '2026-09-21',
      retrievedAt: '2026-09-21T20:02:00Z',
      relevantQuote: 'No major news outlet has reported any upcoming university closures.',
      relevantQuoteBn: 'কোনো প্রধান সংবাদ মাধ্যম আসন্ন বিশ্ববিদ্যালয় বন্ধের কথা জানায়নি।',
      relationship: 'neutral',
    },
  ],
  createdAt: '2026-09-21T20:42:00Z',
  status: 'completed',
  processingSteps: rumorProcessingSteps.map(s => ({ ...s, status: 'completed' as const })),
};

// ============================================
// Mock Scam Result
// ============================================

export const mockScamResult: ScamResult = {
  id: 'scan-002',
  type: 'scam',
  inputText: 'Congratulations! You have won ৳50,000. Pay ৳500 processing fee to claim your reward. Visit: www.pr1ze-claim.xyz/win',
  inputTextBn: 'অভিনন্দন! আপনি ৳৫০,০০০ জিতেছেন। আপনার পুরস্কার দাবি করতে ৳৫০০ প্রক্রিয়াকরণ ফি প্রদান করুন। ভিজিট করুন: www.pr1ze-claim.xyz/win',
  riskLevel: 'high',
  riskLabel: 'High Risk',
  riskLabelBn: 'উচ্চ ঝুঁকি',
  probability: 92,
  explanation: 'This message exhibits multiple characteristics commonly associated with financial scams. It uses an unexpected reward claim, requests an upfront payment, employs urgency language, and directs to a suspicious domain with character substitution.',
  explanationBn: 'এই বার্তাটি আর্থিক প্রতারণার সাথে সাধারণত সম্পর্কিত একাধিক বৈশিষ্ট্য প্রদর্শন করে। এটি একটি অপ্রত্যাশিত পুরস্কার দাবি ব্যবহার করে, অগ্রিম পেমেন্ট অনুরোধ করে, জরুরি ভাষা ব্যবহার করে এবং অক্ষর প্রতিস্থাপনসহ একটি সন্দেহজনক ডোমেনে নির্দেশ করে।',
  indicators: [
    {
      id: 'ind-001',
      type: 'Unexpected Reward',
      typeBn: 'অপ্রত্যাশিত পুরস্কার',
      description: 'Claims of winning a prize without any participation',
      descriptionBn: 'কোনো অংশগ্রহণ ছাড়াই পুরস্কার জেতার দাবি',
      severity: 'high',
    },
    {
      id: 'ind-002',
      type: 'Upfront Payment Request',
      typeBn: 'অগ্রিম পেমেন্ট অনুরোধ',
      description: 'Requires payment of a "processing fee" before receiving rewards',
      descriptionBn: 'পুরস্কার পাওয়ার আগে "প্রক্রিয়াকরণ ফি" প্রদান প্রয়োজন',
      severity: 'high',
    },
    {
      id: 'ind-003',
      type: 'Urgency Language',
      typeBn: 'জরুরি ভাষা',
      description: 'Creates a false sense of urgency to pressure quick action',
      descriptionBn: 'দ্রুত পদক্ষেপের জন্য চাপ দিতে মিথ্যা জরুরি অনুভূতি তৈরি করে',
      severity: 'medium',
    },
    {
      id: 'ind-004',
      type: 'Suspicious Domain',
      typeBn: 'সন্দেহজনক ডোমেন',
      description: 'URL contains character substitution (pr1ze instead of prize) and uses .xyz TLD',
      descriptionBn: 'URL-এ অক্ষর প্রতিস্থাপন (prize এর বদলে pr1ze) এবং .xyz TLD ব্যবহৃত',
      severity: 'high',
    },
  ],
  createdAt: '2026-09-20T18:21:00Z',
  status: 'completed',
  processingSteps: scamProcessingSteps.map(s => ({ ...s, status: 'completed' as const })),
};

// ============================================
// Mock Image Result
// ============================================

export const mockImageResult: ImageResult = {
  id: 'scan-003',
  type: 'image',
  imageUrl: '/mock-image.jpg',
  fileName: 'event_poster_viral.jpg',
  assessment: 'possible_manipulation',
  assessmentLabel: 'Possible Manipulation',
  assessmentLabelBn: 'সম্ভাব্য কারসাজি',
  explanation: 'The image shows indicators consistent with digital manipulation. Metadata analysis reveals inconsistencies in compression patterns, and visual analysis detects signs of synthetic generation or significant post-processing.',
  explanationBn: 'ছবিটি ডিজিটাল কারসাজির সাথে সামঞ্জস্যপূর্ণ সূচক দেখায়। মেটাডেটা বিশ্লেষণ কম্প্রেশন প্যাটার্নে অসঙ্গতি প্রকাশ করে এবং ভিজ্যুয়াল বিশ্লেষণ সিন্থেটিক জেনারেশন বা উল্লেখযোগ্য পোস্ট-প্রক্রিয়াকরণের লক্ষণ সনাক্ত করে।',
  aiGenerationScore: 82,
  technicalSignalScore: 54,
  signals: [
    {
      id: 'sig-001',
      name: 'Metadata Anomaly',
      nameBn: 'মেটাডেটা অসঙ্গতি',
      value: 78,
      description: 'EXIF data is missing or inconsistent with claimed source',
      descriptionBn: 'EXIF ডেটা অনুপস্থিত বা দাবিকৃত উৎসের সাথে অসঙ্গতিপূর্ণ',
    },
    {
      id: 'sig-002',
      name: 'Compression Inconsistency',
      nameBn: 'কম্প্রেশন অসঙ্গতি',
      value: 65,
      description: 'Multiple compression artifacts suggest re-encoding',
      descriptionBn: 'একাধিক কম্প্রেশন আর্টিফ্যাক্ট পুনর্-এনকোডিং নির্দেশ করে',
    },
    {
      id: 'sig-003',
      name: 'Synthetic Visual Patterns',
      nameBn: 'সিন্থেটিক ভিজ্যুয়াল প্যাটার্ন',
      value: 82,
      description: 'Visual patterns consistent with AI image generation detected',
      descriptionBn: 'AI ইমেজ জেনারেশনের সাথে সামঞ্জস্যপূর্ণ ভিজ্যুয়াল প্যাটার্ন সনাক্ত',
    },
    {
      id: 'sig-004',
      name: 'Noise Analysis',
      nameBn: 'নয়েজ বিশ্লেষণ',
      value: 41,
      description: 'Noise distribution differs from typical camera sensor output',
      descriptionBn: 'নয়েজ বিতরণ সাধারণ ক্যামেরা সেন্সর আউটপুট থেকে আলাদা',
    },
  ],
  metadata: {
    camera: null,
    software: 'Unknown / Generated',
    dimensions: '1024 × 1024',
    colorProfile: 'sRGB',
    gps: null,
    timestamp: null,
  },
  createdAt: '2026-09-20T15:10:00Z',
  status: 'completed',
  processingSteps: imageProcessingSteps.map(s => ({ ...s, status: 'completed' as const })),
};

// ============================================
// Scan History
// ============================================

export const mockScanHistory: ScanResult[] = [
  mockRumorResult,
  mockScamResult,
  mockImageResult,
  {
    ...mockRumorResult,
    id: 'scan-004',
    inputTextBn: 'সরকার আগামী মাস থেকে ইন্টারনেটের দাম দ্বিগুণ করবে।',
    inputText: 'Government will double internet prices from next month.',
    assessment: 'contradicted',
    assessmentLabel: 'Contradicted',
    assessmentLabelBn: 'খন্ডিত',
    confidence: 85,
    createdAt: '2026-09-19T14:30:00Z',
  },
  {
    ...mockScamResult,
    id: 'scan-005',
    inputTextBn: 'আপনার বিকাশ অ্যাকাউন্ট ব্লক হয়ে গেছে। এখনই আপনার PIN দিন।',
    inputText: 'Your bKash account has been blocked. Provide your PIN immediately.',
    riskLevel: 'high',
    probability: 96,
    createdAt: '2026-09-18T09:45:00Z',
  },
];

// ============================================
// Dashboard Stats
// ============================================

export const mockDashboardStats = {
  totalChecks: 24,
  thisWeek: 8,
  highRisk: 3,
  userName: 'Shahriar',
  userNameBn: 'শাহরিয়ার',
};

// ============================================
// Safety Tips
// ============================================

export const safetyTips = [
  {
    id: 'tip-001',
    title: 'Never share OTPs',
    titleBn: 'কখনো OTP শেয়ার করবেন না',
    icon: '🔐',
  },
  {
    id: 'tip-002',
    title: 'Verify suspicious links',
    titleBn: 'সন্দেহজনক লিংক যাচাই করুন',
    icon: '🔗',
  },
  {
    id: 'tip-003',
    title: 'Check the source',
    titleBn: 'উৎস পরীক্ষা করুন',
    icon: '📰',
  },
  {
    id: 'tip-004',
    title: "Don't trust unsolicited prizes",
    titleBn: 'অযাচিত পুরস্কারে বিশ্বাস করবেন না',
    icon: '🎁',
  },
];
