export type ScanType = 'RUMOR' | 'SCAM' | 'IMAGE';
export type ScanResultStatus = 
  | 'SUPPORTED' 
  | 'UNVERIFIED' 
  | 'CONTRADICTED' 
  | 'HIGH_RISK' 
  | 'MEDIUM_RISK'
  | 'LOW_RISK'
  | 'LIKELY_AUTHENTIC' 
  | 'POSSIBLE_MANIPULATION' 
  | 'LIKELY_AI_GENERATED' 
  | 'UNABLE_TO_ANALYZE';

export interface ScanHistoryItem {
  id: string;
  title: string;
  titleBn?: string;
  type: ScanType;
  inputType: string;
  result: ScanResultStatus;
  status: 'COMPLETED' | 'PROCESSING' | 'PARTIAL' | 'FAILED';
  createdAt: string;
  timestamp: string;
  preview: string;
}

export const scanHistoryMockData: ScanHistoryItem[] = [
  {
    id: "FL-RUMOR-0024",
    title: "University closure claim",
    titleBn: "আগামীকাল দেশের সব বিশ্ববিদ্যালয় বন্ধ থাকার দাবি",
    type: "RUMOR",
    inputType: "Screenshot",
    result: "UNVERIFIED",
    status: "COMPLETED",
    createdAt: "18 min ago",
    timestamp: "Today, 11:24 PM",
    preview: "আগামীকাল দেশের সব শিক্ষা প্রতিষ্ঠান ও বিশ্ববিদ্যালয় বন্ধ থাকবে বলে ছড়ানো বিজ্ঞপ্তি..."
  },
  {
    id: "FL-SCAM-0018",
    title: "Prize lottery message",
    titleBn: "৫০,০০০ টাকা পুরষ্কার জেতার ভুয়া মেসেজ",
    type: "SCAM",
    inputType: "Text",
    result: "HIGH_RISK",
    status: "COMPLETED",
    createdAt: "1 hour ago",
    timestamp: "Today, 10:15 PM",
    preview: "Congratulations! You have won 50,000 taka in Bkash lottery. Click link to claim..."
  },
  {
    id: "FL-IMAGE-0012",
    title: "Event photograph analysis",
    titleBn: "জাতীয় যুব উদ্ভাবন সম্মেলন পোস্টার",
    type: "IMAGE",
    inputType: "WebP",
    result: "POSSIBLE_MANIPULATION",
    status: "COMPLETED",
    createdAt: "Yesterday",
    timestamp: "2026-09-29 09:40 PM",
    preview: "event_poster_example.webp"
  },
  {
    id: "FL-RUMOR-0023",
    title: "Fuel price hike rumor",
    titleBn: "জ্বালানি তেলের দাম বৃদ্ধির ভুয়া তথ্য",
    type: "RUMOR",
    inputType: "Text",
    result: "SUPPORTED",
    status: "COMPLETED",
    createdAt: "Yesterday",
    timestamp: "2026-09-29 04:12 PM",
    preview: "The price of fuel will change from next week as per energy ministry statement..."
  },
  {
    id: "FL-RUMOR-0022",
    title: "Scholarship announcement link",
    titleBn: "সরকারি বৃত্তির নোটিশ",
    type: "RUMOR",
    inputType: "URL",
    result: "CONTRADICTED",
    status: "COMPLETED",
    createdAt: "2 days ago",
    timestamp: "2026-09-28 02:30 PM",
    preview: "https://example-fake-scholarship.com/gov-announcement"
  },
  {
    id: "FL-IMAGE-0011",
    title: "Facebook viral photo inspection",
    titleBn: "ফেসবুক ভাইরাল ফটো ফোরেনসিক্স",
    type: "IMAGE",
    inputType: "JPEG",
    result: "LIKELY_AUTHENTIC",
    status: "PARTIAL",
    createdAt: "3 days ago",
    timestamp: "2026-09-27 11:05 AM",
    preview: "facebook_viral_news_card_01.jpg"
  }
];
