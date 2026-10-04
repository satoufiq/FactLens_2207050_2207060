export type ScanType = 'RUMOR' | 'SCAM' | 'IMAGE';

export type ResultStatus =
  | 'SUPPORTED'
  | 'UNVERIFIED'
  | 'CONTRADICTED'
  | 'HIGH_RISK'
  | 'MEDIUM_RISK'
  | 'LOW_RISK'
  | 'LIKELY_AUTHENTIC'
  | 'POSSIBLE_MANIPULATION'
  | 'LIKELY_AI_GENERATED'
  | 'PARTIAL'
  | 'UNABLE_TO_ANALYZE';

export interface TimelineStepItem {
  id: string;
  title: string;
  description: string;
  time: string;
  status: 'completed' | 'processing' | 'failed' | 'pending';
}

export interface EvidenceItem {
  id: number | string;
  sourceType: string;
  title: string;
  summary: string;
  relationship: 'SUPPORTING' | 'CONTRADICTING' | 'INSUFFICIENT';
  url?: string;
  domain?: string;
  credibilityScore?: number;
}

export interface RiskIndicatorItem {
  id: string;
  title: string;
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  description: string;
  iconName: string;
}

export interface ImageSignalItem {
  id: string;
  title: string;
  strength: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'DETECTED' | 'NORMAL';
  scorePct: number;
  description: string;
  details: string;
  category: string;
}

export interface TechnicalSignalItem {
  id: string;
  title: string;
  status: 'NOTABLE' | 'NORMAL' | 'MISSING';
  description: string;
}

export interface ScanDetailsData {
  id: string;
  scanId: string;
  title: string;
  titleBn?: string;
  type: ScanType;
  inputType: 'Screenshot' | 'Text' | 'URL' | 'Image' | 'WebP' | 'JPEG';
  status: 'COMPLETED' | 'PROCESSING' | 'PARTIAL' | 'FAILED';
  result: ResultStatus;
  language: string;
  claim: string;
  claimBn?: string;
  explanation: string;
  explanationBn?: string;
  submittedAt: string;
  completedAt: string;
  ocrConfirmed?: boolean;

  statistics?: {
    sourcesReviewed: number;
    supporting: number;
    contradicting: number;
    insufficient: number;
  };

  processingSteps: TimelineStepItem[];

  // For RUMOR
  evidence?: EvidenceItem[];

  // For SCAM
  riskIndicators?: RiskIndicatorItem[];
  urlAnalysis?: {
    submittedUrl: string;
    domain: string;
    createdDate: string;
    sslValid: boolean;
    suspiciousRedirects: boolean;
    phishingDatabaseMatch: boolean;
  };

  // For IMAGE
  visualSignals?: ImageSignalItem[];
  technicalSignals?: TechnicalSignalItem[];
  imageMetadata?: {
    filename: string;
    format: string;
    dimensions: string;
    size: string;
    exif: string;
    camera: string;
    software: string;
    location: string;
  };

  analysisDetailsSteps?: {
    title: string;
    status: string;
    detail?: string;
  }[];

  metadata: {
    scanType: string;
    inputType: string;
    language: string;
    ocr: string;
    status: string;
  };
}

export const scanDetailsDataMap: Record<string, ScanDetailsData> = {
  "FL-RUMOR-0024": {
    id: "FL-RUMOR-0024",
    scanId: "FL-RUMOR-0024",
    title: "University closure claim",
    titleBn: "আগামীকাল দেশের সব বিশ্ববিদ্যালয় বন্ধ থাকার দাবি",
    type: "RUMOR",
    inputType: "Screenshot",
    status: "COMPLETED",
    result: "UNVERIFIED",
    language: "Bengali",
    claim: "আগামীকাল দেশের সব শিক্ষা প্রতিষ্ঠান বন্ধ থাকবে।",
    claimBn: "আগামীকাল দেশের সব শিক্ষা প্রতিষ্ঠান বন্ধ থাকবে।",
    explanation: "FactLens did not find sufficient relevant evidence to confirm or contradict the submitted claim. The available sources provided context but did not establish enough evidence for either conclusion.",
    explanationBn: "ফ্যাক্টলেন্স জমাদানকৃত দাবিটি নিশ্চিত বা খণ্ডন করার মতো পর্যাপ্ত প্রাসঙ্গিক প্রমাণ খুঁজে পায়নি। উপলব্ধ উৎসগুলো কেবল তথ্য প্রদান করেছে কিন্তু কোনো চূড়ান্ত সিদ্ধান্তে পৌঁছাতে পারেনি।",
    submittedAt: "Today, 10:32 PM",
    completedAt: "Today, 10:33 PM",
    ocrConfirmed: true,
    statistics: {
      sourcesReviewed: 4,
      supporting: 0,
      contradicting: 0,
      insufficient: 4
    },
    processingSteps: [
      {
        id: "step-1",
        title: "Input received",
        description: "The submitted screenshot was received successfully.",
        status: "completed",
        time: "10:32:04 PM"
      },
      {
        id: "step-2",
        title: "OCR completed",
        description: "Text was extracted from the submitted screenshot with 98.4% optical confidence.",
        status: "completed",
        time: "10:32:08 PM"
      },
      {
        id: "step-3",
        title: "Claim identified",
        description: "The main factual statement was identified from the submitted content.",
        status: "completed",
        time: "10:32:12 PM"
      },
      {
        id: "step-4",
        title: "Evidence search",
        description: "Relevant external institutional databases and verified news feeds were searched.",
        status: "completed",
        time: "10:32:28 PM"
      },
      {
        id: "step-5",
        title: "Evidence comparison",
        description: "Retrieved information was compared with the extracted claim statement.",
        status: "completed",
        time: "10:32:51 PM"
      },
      {
        id: "step-6",
        title: "Assessment prepared",
        description: "The final assessment and transparency report were generated.",
        status: "completed",
        time: "10:33:02 PM"
      }
    ],
    evidence: [
      {
        id: 1,
        sourceType: "Government / Institutional Source",
        title: "Education authority announcement",
        summary: "No matching nationwide closure announcement was found on the official portal.",
        relationship: "INSUFFICIENT",
        domain: "moedu.gov.bd",
        credibilityScore: 98
      },
      {
        id: 2,
        sourceType: "University Source",
        title: "University notice board feed",
        summary: "Available administrative notices did not establish the submitted claim.",
        relationship: "INSUFFICIENT",
        domain: "du.ac.bd",
        credibilityScore: 95
      },
      {
        id: 3,
        sourceType: "News Source",
        title: "Education-related national news coverage",
        summary: "Retrieved media reports provided routine context but did not confirm any closure.",
        relationship: "INSUFFICIENT",
        domain: "prothomalo.com",
        credibilityScore: 92
      },
      {
        id: 4,
        sourceType: "Official Source",
        title: "Public press release bulletin",
        summary: "No official gazette or emergency press directive was released for tomorrow.",
        relationship: "INSUFFICIENT",
        domain: "press.gov.bd",
        credibilityScore: 96
      }
    ],
    analysisDetailsSteps: [
      { title: "Language Detection", status: "Bengali (BN - 99.8%)", detail: "FastText model verified Bengali unicode standard" },
      { title: "Claim Extraction", status: "Completed", detail: "Entity & temporal scope parsed successfully" },
      { title: "Search Query Generation", status: "Completed", detail: "Generated 14 distinct boolean query vectors" },
      { title: "External Evidence Search", status: "Completed", detail: "Indexed 4 authoritative domains" },
      { title: "Semantic Relevance Analysis", status: "Completed", detail: "Cosine distance > 0.45 score threshold" },
      { title: "Claim-Evidence Comparison", status: "Completed", detail: "Cross-entailment model returned NEUTRAL" }
    ],
    metadata: {
      scanType: "Rumor / Claim",
      inputType: "Screenshot",
      language: "Bengali",
      ocr: "Confirmed",
      status: "Completed"
    }
  },

  "FL-SCAM-0018": {
    id: "FL-SCAM-0018",
    scanId: "FL-SCAM-0018",
    title: "Prize lottery message",
    titleBn: "৫০,০০০ টাকা পুরষ্কার জেতার ভুয়া মেসেজ",
    type: "SCAM",
    inputType: "Text",
    status: "COMPLETED",
    result: "HIGH_RISK",
    language: "English / Bengali",
    claim: "Congratulations! You have won 50,000 BDT in Bkash anniversary lottery. Click http://bkash-reward-2026.xyz to claim immediately!",
    explanation: "FactLens detected multiple critical phishing and social engineering indicators in this message, including spoofed branding, urgent call-to-action, and an untrusted non-official domain.",
    explanationBn: "ফ্যাক্টলেন্স এই বারতায় একাধিক ঝুঁকিপূর্ণ ফিশিং ও জালিয়াতির উপাদান শনাক্ত করেছে, যার মধ্যে রয়েছে ভুয়া ব্র্যান্ডিং, জরুরি পদক্ষেপ নেওয়ার প্ররোচনা এবং সন্দেহজনক ওয়েবসাইট লিঙ্ক।",
    submittedAt: "Today, 10:15 PM",
    completedAt: "Today, 10:16 PM",
    riskIndicators: [
      {
        id: "risk-1",
        title: "Unexpected prize or monetary reward claim",
        type: "CRITICAL",
        description: "Promising large unverified financial grants without prior entry or registration.",
        iconName: "Gift"
      },
      {
        id: "risk-2",
        title: "Upfront payment or credentials request",
        type: "CRITICAL",
        description: "Attempts to harvest account credentials, OTPs, or processing fee payments.",
        iconName: "CreditCard"
      },
      {
        id: "risk-3",
        title: "Artificial urgency phrasing",
        type: "WARNING",
        description: "Uses urgent language ('claim immediately within 10 mins') to prevent logical verification.",
        iconName: "Clock"
      },
      {
        id: "risk-4",
        title: "Suspicious lookalike domain (Typosquatting)",
        type: "CRITICAL",
        description: "Domain 'bkash-reward-2026.xyz' is not affiliated with official bKash Limited infrastructure.",
        iconName: "AlertTriangle"
      }
    ],
    urlAnalysis: {
      submittedUrl: "http://bkash-reward-2026.xyz/claim-now",
      domain: "bkash-reward-2026.xyz",
      createdDate: "3 days ago (Registered 2026-09-30)",
      sslValid: false,
      suspiciousRedirects: true,
      phishingDatabaseMatch: true
    },
    processingSteps: [
      {
        id: "step-1",
        title: "Message received",
        description: "SMS / chat text payload parsed.",
        status: "completed",
        time: "10:15:02 PM"
      },
      {
        id: "step-2",
        title: "Pattern matching & NLP audit",
        description: "Heuristic scam taxonomy patterns matched 4 risk rules.",
        status: "completed",
        time: "10:15:15 PM"
      },
      {
        id: "step-3",
        title: "URL threat intelligence check",
        description: "Domain WHOIS, DNS record, and SSL TLS handshake inspected.",
        status: "completed",
        time: "10:15:40 PM"
      },
      {
        id: "step-4",
        title: "Risk assessment finalized",
        description: "High Risk alert classification assigned.",
        status: "completed",
        time: "10:16:00 PM"
      }
    ],
    metadata: {
      scanType: "Scam / Risk Alert",
      inputType: "Text",
      language: "English / Bengali",
      ocr: "N/A",
      status: "Completed"
    }
  },

  "FL-IMAGE-0012": {
    id: "FL-IMAGE-0012",
    scanId: "FL-IMAGE-0012",
    title: "Event photograph analysis",
    titleBn: "জাতীয় যুব উদ্ভাবন সম্মেলন পোস্টার সংকেত পরীক্ষা",
    type: "IMAGE",
    inputType: "WebP",
    status: "COMPLETED",
    result: "POSSIBLE_MANIPULATION",
    language: "Multilingual",
    claim: "Digital event photo submitted for deepfake, error level analysis (ELA), and metadata forensics.",
    explanation: "FactLens identified several localized signals indicating digital modification. Specific regions exhibited mismatched edge gradients and re-compression artifacts, while EXIF data indicates software editing.",
    explanationBn: "ফ্যাক্টলেন্স ডিজিটাল পরিবর্তনের একাধিক কারিগরি চিহ্ন শনাক্ত করেছে। ছবির নির্দিষ্ট কিছু অংশে এডিটিং ও সফটওয়্যার ব্যবহারের আলামত পাওয়া গেছে।",
    submittedAt: "Yesterday, 11:12 PM",
    completedAt: "Yesterday, 11:13 PM",
    visualSignals: [
      {
        id: "ve-1",
        title: "Edge consistency gradient",
        strength: "MEDIUM",
        status: "DETECTED",
        scorePct: 68,
        description: "Some text bounding boxes show unnatural localized edge sharpness variations.",
        details: "Localized spatial derivative filter highlights artificial boundaries around text overlay.",
        category: "Visual Edge Analysis"
      },
      {
        id: "ve-2",
        title: "Texture & noise frequency pattern",
        strength: "HIGH",
        status: "DETECTED",
        scorePct: 84,
        description: "Headline banner region displays mismatched noise distribution compared with background.",
        details: "High spatial frequency noise variance analysis shows 3.2x noise discrepancy in top banner.",
        category: "Texture Artifact Inspection"
      },
      {
        id: "ve-3",
        title: "Lighting & shadow geometry",
        strength: "LOW",
        status: "NORMAL",
        scorePct: 20,
        description: "Global lighting vectors and shadow cast directions remain internally consistent.",
        details: "Primary channel illumination vectors fall within expected normal baseline parameters.",
        category: "Global Visual Geometry"
      }
    ],
    technicalSignals: [
      {
        id: "te-1",
        title: "Error Level Analysis (ELA) Compression",
        status: "NOTABLE",
        description: "ELA heat map reveals double JPEG/WebP compression artifacts around the primary title box."
      },
      {
        id: "te-2",
        title: "EXIF & Software Signature Header",
        status: "NOTABLE",
        description: "File header contains metadata tags originating from Adobe Photoshop CC 24.1 software export."
      }
    ],
    imageMetadata: {
      filename: "event_poster_example.webp",
      format: "WebP Image",
      dimensions: "1920 × 1080 px",
      size: "1.7 MB",
      exif: "Available (Camera EXIF present)",
      camera: "Canon EOS R5",
      software: "Adobe Photoshop CC (Edited 2026-09-30)",
      location: "Stripped / Not available"
    },
    processingSteps: [
      {
        id: "step-1",
        title: "Image received for inspection",
        description: "High resolution raster file uploaded successfully.",
        status: "completed",
        time: "11:12:04 PM"
      },
      {
        id: "step-2",
        title: "Format & integrity validation",
        description: "Color space, dimensions, and compression headers validated.",
        status: "completed",
        time: "11:12:05 PM"
      },
      {
        id: "step-3",
        title: "Metadata & EXIF forensics audit",
        description: "Software tags, camera payload, and revision timestamps parsed.",
        status: "completed",
        time: "11:12:06 PM"
      },
      {
        id: "step-4",
        title: "Visual edge & noise analysis",
        description: "Neural edge detector and frequency domain noise comparison executed.",
        status: "completed",
        time: "11:12:31 PM"
      },
      {
        id: "step-5",
        title: "Error Level Analysis (ELA)",
        description: "Quantization error matrix calculated across re-compression cycles.",
        status: "completed",
        time: "11:12:48 PM"
      },
      {
        id: "step-6",
        title: "Assessment generated & recorded",
        description: "Multi-signal forensics report generated.",
        status: "completed",
        time: "11:13:02 PM"
      }
    ],
    metadata: {
      scanType: "Image Forensics",
      inputType: "WebP Image",
      language: "Multilingual",
      ocr: "Analyzed",
      status: "Completed"
    }
  }
};

// Default export fallback
export const scanDetailsMockData = scanDetailsDataMap["FL-RUMOR-0024"];
