export type AssessmentType = 'LIKELY_AUTHENTIC' | 'POSSIBLE_MANIPULATION' | 'LIKELY_AI_GENERATED' | 'UNABLE_TO_ANALYZE';

export interface VisualSignalItem {
  id: string;
  title: string;
  description: string;
  strength: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'DETECTED' | 'NORMAL';
  scorePct: number;
}

export interface TechnicalSignalItem {
  id: string;
  title: string;
  status: 'AVAILABLE' | 'NOTABLE' | 'MISSING';
  description: string;
}

export interface ImageResultData {
  scanId: string;
  type: string;
  status: string;
  assessment: AssessmentType;
  file: {
    name: string;
    format: string;
    size: string;
    dimensions: string;
  };
  summary: string;
  bilingualSummary: string;
  signalCount: number;
  visualSignals: VisualSignalItem[];
  technicalSignals: TechnicalSignalItem[];
  metadata: {
    exif: string;
    camera: string;
    timestamp: string;
    location: string;
    software: string;
  };
  explanation: string;
  submittedAt: string;
  completedAt: string;
}

export const imageResultMockData: ImageResultData = {
  scanId: "FL-IMAGE-0012",
  type: "IMAGE",
  status: "COMPLETED",
  assessment: "POSSIBLE_MANIPULATION",
  file: {
    name: "event_poster_example.webp",
    format: "WebP",
    size: "1.7 MB",
    dimensions: "1920 × 1080"
  },
  summary: "FactLens identified image signals that may indicate digital manipulation.",
  bilingualSummary: "FactLens ছবিটিতে ডিজিটাল পরিবর্তনের সম্ভাব্য কিছু সংকেত শনাক্ত করেছে।",
  signalCount: 3,
  visualSignals: [
    {
      id: "v1",
      title: "Edge consistency",
      description: "Some regions show inconsistent edge characteristics and sharpness boundaries around headline elements.",
      strength: "MEDIUM",
      status: "DETECTED",
      scorePct: 68
    },
    {
      id: "v2",
      title: "Texture consistency",
      description: "Certain regions contain unusual texture noise patterns compared with nearby background areas.",
      strength: "HIGH",
      status: "DETECTED",
      scorePct: 82
    },
    {
      id: "v3",
      title: "Overall visual structure",
      description: "The overall background image lighting and geometry appear relatively consistent across main channels.",
      strength: "LOW",
      status: "NORMAL",
      scorePct: 20
    }
  ],
  technicalSignals: [
    {
      id: "t1",
      title: "Compression characteristics (ELA)",
      status: "NOTABLE",
      description: "Error Level Analysis reveals double-JPEG compression artifacts localized in font overlay areas."
    },
    {
      id: "t2",
      title: "Software Header Tags",
      status: "NOTABLE",
      description: "File header tags contain Adobe Photoshop editing metadata traces."
    }
  ],
  metadata: {
    exif: "Available",
    camera: "Available (Exif Headers Identified)",
    timestamp: "Available (Edited 2026-09-30)",
    location: "Not available (GPS Location Stripped)",
    software: "Available (Adobe Photoshop CC)"
  },
  explanation: "FactLens identified several image signals that may indicate digital manipulation. Some text regions showed unusual visual edge characteristics and localized compression noise differences, while available technical EXIF header information confirmed post-processing software traces.",
  submittedAt: "Today, 11:12 PM",
  completedAt: "Today, 11:13 PM"
};
