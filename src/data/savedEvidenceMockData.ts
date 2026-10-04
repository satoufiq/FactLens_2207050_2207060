export type SavedEvidenceType = 'CLAIM_EVIDENCE' | 'SCAM_SIGNAL' | 'IMAGE_SIGNAL';

export type EvidenceRelationship =
  | 'SUPPORTING'
  | 'CONTRADICTING'
  | 'INSUFFICIENT'
  | 'RISK_INDICATOR'
  | 'DETECTED'
  | 'AUTHENTIC';

export interface SavedEvidenceItem {
  id: string;
  type: SavedEvidenceType;
  title: string;
  titleBn?: string;
  description: string;
  descriptionBn?: string;
  relationship: EvidenceRelationship;
  source: string;
  sourceType?: string;
  scanId: string;
  savedAt: string;
  timestampRaw?: string;
  collection: string;
  url?: string;
  imageThumbnail?: string;
  fullExplanation?: string;
  fullExplanationBn?: string;
  confidenceScore?: number;
}

export interface CollectionItem {
  id: string;
  name: string;
  nameBn?: string;
  count: number;
  color: string;
  bgClass: string;
  iconBg: string;
}

export const initialCollectionsData: CollectionItem[] = [
  {
    id: "col-1",
    name: "University Claims",
    nameBn: "বিশ্ববিদ্যালয়ের নোটিশ",
    count: 4,
    color: "#2563EB",
    bgClass: "bg-blue-50 dark:bg-blue-950/40 border-blue-200/80 dark:border-blue-900/60",
    iconBg: "bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400"
  },
  {
    id: "col-2",
    name: "Scam Examples",
    nameBn: "স্ক্যাম ও ফিশিং সংকেত",
    count: 3,
    color: "#DC2626",
    bgClass: "bg-red-50 dark:bg-red-950/40 border-red-200/80 dark:border-red-900/60",
    iconBg: "bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400"
  },
  {
    id: "col-3",
    name: "Image Checks",
    nameBn: "ছবি ও ভিডিও ফোরেনসিক্স",
    count: 2,
    color: "#9333EA",
    bgClass: "bg-purple-50 dark:bg-purple-950/40 border-purple-200/80 dark:border-purple-900/60",
    iconBg: "bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400"
  }
];

export const savedEvidenceMockData: SavedEvidenceItem[] = [
  {
    id: "EV-001",
    type: "CLAIM_EVIDENCE",
    title: "University closure announcement",
    titleBn: "বিশ্ববিদ্যালয় বন্ধের নোটিশ পরীক্ষা",
    description: "No matching nationwide closure announcement was identified from official education ministry feeds.",
    descriptionBn: "শিক্ষা মন্ত্রণালয়ের অফিসিয়াল ফিড থেকে সারাদেশের বিশ্ববিদ্যালয় বন্ধের কোনো মিল পাওয়া যায়নি।",
    relationship: "INSUFFICIENT",
    source: "Education Authority",
    sourceType: "Institutional Source",
    scanId: "FL-RUMOR-0024",
    savedAt: "18 min ago",
    timestampRaw: "2026-10-03T21:00:00Z",
    collection: "University Claims",
    url: "moedu.gov.bd",
    fullExplanation: "FactLens cross-referenced public press bulletins and educational regulatory announcements. No official emergency decree was published for tomorrow.",
    fullExplanationBn: "ফ্যাক্টলেন্স সরকারি প্রেস বুলেটিন ও বিশ্ববিদ্যালয়ের নোটিশ বোর্ড যাচাই করেছে। কোনো জরুরি বন্ধের আদেশ জারি করা হয়নি।"
  },
  {
    id: "EV-002",
    type: "SCAM_SIGNAL",
    title: "Unexpected prize claim",
    titleBn: "প্রত্যাশিত পুরষ্কার জেতার ভুয়া দাবি",
    description: "The communication claims that the recipient has unexpectedly won a 50,000 BDT lottery prize.",
    descriptionBn: "মেসেজটিতে ব্যবহারকারীকে অপ্রত্যাশিতভাবে ৫০,০০০ টাকার লটারি পুরষ্কার জেতার লোভনীয় ভুয়া দাবি করা হয়েছে।",
    relationship: "RISK_INDICATOR",
    source: "Scam Threat Intelligence",
    sourceType: "Scam Pattern Rules",
    scanId: "FL-SCAM-0018",
    savedAt: "1 hour ago",
    timestampRaw: "2026-10-03T20:00:00Z",
    collection: "Scam Examples",
    url: "http://bkash-reward-2026.xyz",
    fullExplanation: "Unsolicited monetary gain promises are high-severity social engineering vectors used to entice users into disclosing financial OTPs or personal credentials.",
    fullExplanationBn: "অপ্রত্যাশিত অর্থ পুরষ্কারের লোভ দেখিয়ে ভুক্তভোগীকে ফিশিং পেজে নিয়ে পিন বা ওটিপি হাতিয়ে নেওয়ার চেষ্টা করা হয়।"
  },
  {
    id: "EV-003",
    type: "SCAM_SIGNAL",
    title: "Upfront payment request",
    titleBn: "অগ্রিম ফি প্রদানের প্ররোচনা",
    description: "The recipient is instructed to pay an upfront processing fee before receiving the claimed reward.",
    descriptionBn: "লটারি বা পুরষ্কারের টাকা ছাড়ের জন্য গ্রাহককে প্রারম্ভিক প্রসেসিং ফি বাবদ ক্যাশ-ইন করার নির্দেশ দেওয়া হয়।",
    relationship: "RISK_INDICATOR",
    source: "MFS Compliance Audit",
    sourceType: "Financial Risk Engine",
    scanId: "FL-SCAM-0018",
    savedAt: "1 hour ago",
    timestampRaw: "2026-10-03T20:00:00Z",
    collection: "Scam Examples",
    fullExplanation: "Regulated Mobile Financial Services (MFS) never request advance fee deposits or PIN numbers via automated SMS broadcasts.",
    fullExplanationBn: "কোনো বৈধ ব্যাংকিং বা এমএফএস প্রতিষ্ঠান অগ্রিম প্রসেসিং ফি বা বিকাশ পিন রিচার্জ চায় না।"
  },
  {
    id: "EV-004",
    type: "SCAM_SIGNAL",
    title: "Suspicious-looking domain",
    titleBn: "সন্দেহজনক ভুয়া ওয়েব ডোমেন (Typosquatting)",
    description: "The submitted link uses a suspicious non-official domain pattern 'www.pr1ze-claim.xyz/win'.",
    descriptionBn: "জমাদানকৃত বারতায় 'www.pr1ze-claim.xyz/win' নামক সন্দেহজনক আন-অফিসিয়াল ডোমেন পাওয়া গেছে।",
    relationship: "RISK_INDICATOR",
    source: "URL DNS Inspection",
    sourceType: "Threat Database",
    scanId: "FL-SCAM-0018",
    savedAt: "1 hour ago",
    timestampRaw: "2026-10-03T20:00:00Z",
    collection: "Scam Examples",
    url: "www.pr1ze-claim.xyz/win",
    fullExplanation: "WHOIS lookup reveals domain was registered 3 days ago with missing SSL TLS encryption certificate.",
    fullExplanationBn: "ডোমেনটি ৩ দিন আগে তৈরি এবং এতে কোনো সিকিউর SSL সার্টিফিকেট নেই।"
  },
  {
    id: "EV-005",
    type: "IMAGE_SIGNAL",
    title: "Texture consistency anomaly",
    titleBn: "ছবির নয়েজ ও টেক্সচার অসামঞ্জস্য",
    description: "High spatial frequency analysis revealed mismatched noise grain in the headline banner region.",
    descriptionBn: "ছবির মূল ব্যানার অংশে ডিজিটাল এডিটিং ও সফটওয়্যার ফিল্টারের অস্বাভাবিক পিক্সেল নয়েজ পাওয়া গেছে।",
    relationship: "DETECTED",
    source: "Visual Forensics Engine",
    sourceType: "Noise Gradient Filter",
    scanId: "FL-IMAGE-0012",
    savedAt: "Yesterday",
    timestampRaw: "2026-10-02T15:00:00Z",
    collection: "Image Checks",
    imageThumbnail: "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=400&q=80",
    fullExplanation: "Error Level Analysis (ELA) re-compression matrix confirms Photoshop CC text overlay export signatures.",
    fullExplanationBn: "এরর লেভেল অ্যানালাইসিস (ELA) ফটোশপের মাধ্যমে ব্যানার টেক্সট পরিবর্তনের জোরালো আলামত দিয়েছে।"
  },
  {
    id: "EV-006",
    type: "CLAIM_EVIDENCE",
    title: "Education authority official source",
    titleBn: "শিক্ষা বোর্ডের অফিশিয়াল নোটিশ যাচাই",
    description: "Available administrative announcements provided context but did not establish the submitted closure claim.",
    descriptionBn: "শিক্ষা বোর্ডের অন্যান্য সার্কুলার পর্যবেক্ষণ করা হলেও ভাইরাল দাবিটির সমর্থন পাওয়া যায়নি।",
    relationship: "INSUFFICIENT",
    source: "Official Press Bulletin",
    sourceType: "Institutional Source",
    scanId: "FL-RUMOR-0024",
    savedAt: "Yesterday",
    timestampRaw: "2026-10-02T12:00:00Z",
    collection: "University Claims",
    url: "dhakaeducationboard.gov.bd",
    fullExplanation: "Cross-comparison with historical gazette updates shows normal academic schedule operations for tomorrow.",
    fullExplanationBn: "শিক্ষা বোর্ডের অফিশিয়াল সার্কুলার অনুযায়ী আগামীকালের নিয়মিত একাডেমিক কার্যক্রম বহাল রয়েছে।"
  },
  {
    id: "EV-007",
    type: "CLAIM_EVIDENCE",
    title: "Fuel price adjustment gazette",
    titleBn: "জ্বালানি তেলের মূল্য পুনর্নির্ধারণ গ্যাজেট",
    description: "Energy ministry official gazette confirmed the scheduled automated monthly price tariff update.",
    descriptionBn: "জ্বালানি মন্ত্রণালয়ের অফিশিয়াল গ্যাজেট অনুযায়ী নিয়মিত স্বয়ংক্রিয় মূল্য সমন্বয়ের সিদ্ধান্ত প্রমাণিত।",
    relationship: "SUPPORTING",
    source: "Ministry of Power & Energy",
    sourceType: "Official Gazette",
    scanId: "FL-RUMOR-0023",
    savedAt: "2 days ago",
    timestampRaw: "2026-10-01T10:00:00Z",
    collection: "University Claims",
    url: "mpemr.gov.bd",
    fullExplanation: "Official press release matches the submitted statement details with 100% semantic alignment.",
    fullExplanationBn: "সরকারি সংবাদ বিজ্ঞপ্তির সাথে প্রকাশিত তথ্যের ১০০% হুবহু মিল রয়েছে।"
  },
  {
    id: "EV-008",
    type: "CLAIM_EVIDENCE",
    title: "Fake scholarship portal debunk",
    titleBn: "সরকারি মেধা বৃত্তির ভুয়া ওয়েবসাইটের খণ্ডন",
    description: "The primary education board debunked the third-party domain claiming to register students for cash stipends.",
    descriptionBn: "প্রাথমিক শিক্ষা অধিদপ্তর উক্ত মেধা বৃত্তির থার্ড-পার্টি লিঙ্কটি সম্পূর্ণ ভুয়া ও বিভ্রান্তিকর বলে খণ্ডন করেছে।",
    relationship: "CONTRADICTING",
    source: "DPE Fact Checker",
    sourceType: "Government Portal",
    scanId: "FL-RUMOR-0022",
    savedAt: "3 days ago",
    timestampRaw: "2026-09-30T14:00:00Z",
    collection: "University Claims",
    url: "dpe.gov.bd",
    fullExplanation: "DPE released a public circular cautioning citizens against entering NID or banking info on unverified portals.",
    fullExplanationBn: "অধিদপ্তর সতর্কবার্তা জারি করে জানিয়েছে যে বৃত্তির কোনো ফি বা অনলাইন নিবন্ধন চাওয়া হয়নি।"
  }
];
