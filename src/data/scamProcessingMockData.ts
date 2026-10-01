export interface ProcessingStep {
  id: number;
  title: string;
  titleBn: string;
  description: string;
  descriptionBn: string;
  status: 'completed' | 'processing' | 'pending' | 'failed' | 'partial';
  metadata?: string;
}

export interface ScamProcessingData {
  scanId: string;
  type: string;
  inputType: 'text' | 'OCR';
  language: string;
  ocrConfirmed?: boolean;
  content: string;
  detectedUrl?: string;
  steps: ProcessingStep[];
  riskIndicators: { label: string; labelBn: string; severity: 'HIGH' | 'MED' | 'CRIT' }[];
}

export const scamProcessingMockData: ScamProcessingData = {
  scanId: "FL-SCAM-0018",
  type: "SCAM",
  inputType: "text",
  language: "English",
  content:
    "Congratulations! You have won 50,000 taka. Pay 500 taka processing fee immediately to claim your prize. www.pr1ze-claim.xyz/win",
  detectedUrl: "www.pr1ze-claim.xyz/win",
  steps: [
    {
      id: 1,
      title: "Input received",
      titleBn: "ইনপুট গৃহীত হয়েছে",
      description: "Your submitted content has been received successfully.",
      descriptionBn: "আপনার জমা দেওয়া কন্টেন্ট সফলভাবে গৃহীত হয়েছে।",
      status: "completed"
    },
    {
      id: 2,
      title: "Understanding message",
      titleBn: "বার্তা অনুধাবন ও ভাষা সনাক্তকরণ",
      description: "Identifying language and preparing the submitted content.",
      descriptionBn: "ভাষা ও গঠন সনাক্ত করে কন্টেন্ট প্রস্তুত করা হচ্ছে।",
      status: "completed",
      metadata: "Language: English • Input: Text"
    },
    {
      id: 3,
      title: "Classifying scam-related patterns",
      titleBn: "স্ক্যাম প্যাটার্ন শ্রেণীবদ্ধকরণ",
      description: "Examining the message for suspicious communication patterns.",
      descriptionBn: "সন্দেহজনক যোগাযোগের ধরণ পরীক্ষার জন্য বার্তা বিশ্লেষণ করা হচ্ছে।",
      status: "processing"
    },
    {
      id: 4,
      title: "Identifying risk indicators",
      titleBn: "ঝুঁকি নির্দেশক সনাক্তকরণ",
      description: "Looking for signals associated with potentially fraudulent communication.",
      descriptionBn: "জরুরি তাগিদ, পেমেন্ট অনুরোধ ও পুরস্কারের প্রলোভনের লক্ষণ খোঁজা হচ্ছে।",
      status: "pending"
    },
    {
      id: 5,
      title: "Analyzing links",
      titleBn: "লিংক ও ডোমেইন বিশ্লেষণ",
      description: "Reviewing any URL included in the submitted content.",
      descriptionBn: "সংযুক্ত ইউআরএল ও ওয়েবসাইটের ডোমেইন গঠন পর্যালোচনা করা হচ্ছে।",
      status: "pending"
    },
    {
      id: 6,
      title: "Preparing risk assessment",
      titleBn: "ঝুঁকি মূল্যায়ন প্রস্তুতকরণ",
      description: "Combining the available signals.",
      descriptionBn: "প্রাপ্ত সমস্ত ঝুঁকি নির্দেশক এবং ডোমেইন সিগন্যাল একত্রিত করা হচ্ছে।",
      status: "pending"
    },
    {
      id: 7,
      title: "Preparing explanation",
      titleBn: "ব্যাখ্যা ও সিদ্ধান্ত সংকলন",
      description: "Preparing an understandable explanation of the assessment.",
      descriptionBn: "চূড়ান্ত মূল্যায়ন ও বোধগম্য ব্যাখ্যা প্রস্তুত করা হচ্ছে।",
      status: "pending"
    }
  ],
  riskIndicators: [
    { label: "Unexpected prize claim", labelBn: "অনাকাঙ্ক্ষিত লটারি বা পুরস্কার দাবি", severity: "HIGH" },
    { label: "Upfront payment request", labelBn: "অগ্রিম ফি প্রদানের অনুরোধ", severity: "HIGH" },
    { label: "Urgency", labelBn: "জরুরি চাপ সৃষ্টির ভাষা", severity: "HIGH" },
    { label: "Suspicious link/domain", labelBn: "সন্দেহজনক ডোমেইন লিংক (.xyz)", severity: "CRIT" }
  ]
};

export const scamScreenshotProcessingMock: ScamProcessingData = {
  scanId: "FL-SCAM-0019",
  type: "SCAM",
  inputType: "OCR",
  language: "Bengali",
  ocrConfirmed: true,
  content: "অভিনন্দন! আপনি ৫০,০০০ টাকা পুরস্কার জিতেছেন। পুরস্কার পেতে এখনই ৫০০ টাকা প্রসেসিং ফি প্রদান করুন। http://bkash-bonus.top",
  detectedUrl: "http://bkash-bonus.top",
  steps: [
    {
      id: 1,
      title: "Input received",
      titleBn: "ইনপুট গৃহীত হয়েছে",
      description: "Your screenshot has been received.",
      descriptionBn: "আপনার স্ক্রিনশট সফলভাবে গৃহীত হয়েছে।",
      status: "completed"
    },
    {
      id: 2,
      title: "OCR text confirmed",
      titleBn: "ওসিআর টেক্সট নিশ্চিত করা হয়েছে",
      description: "Extracted Bengali text confirmed from screenshot.",
      descriptionBn: "স্ক্রিনশট থেকে বাংলা টেক্সট সফলভাবে নিষ্কাশন করা হয়েছে।",
      status: "completed",
      metadata: "Screenshot • OCR confirmed • Bengali"
    },
    {
      id: 3,
      title: "Understanding message",
      titleBn: "বার্তা বিশ্লেষণ",
      description: "Analyzing text structure and terminology.",
      descriptionBn: "টেক্সটের গঠন ও শব্দচয়ন পরীক্ষা করা হচ্ছে।",
      status: "completed"
    },
    {
      id: 4,
      title: "Classifying scam-related patterns",
      titleBn: "স্ক্যাম প্যাটার্ন শ্রেণীবদ্ধকরণ",
      description: "Detecting smishing and brand spoofing patterns.",
      descriptionBn: "বিকাশ/নগদ ব্র্যান্ড জালিয়াতি প্যাটার্ন সনাক্ত করা হচ্ছে।",
      status: "processing"
    },
    {
      id: 5,
      title: "Identifying risk indicators",
      titleBn: "ঝুঁকি নির্দেশক সনাক্তকরণ",
      description: "Flagging urgency and payment demands.",
      descriptionBn: "জরুরি চাপ ও পেমেন্ট দাবি চিহ্নিত করা হচ্ছে।",
      status: "pending"
    },
    {
      id: 6,
      title: "Preparing risk assessment",
      titleBn: "ঝুঁকি মূল্যায়ন প্রস্তুতি",
      description: "Aggregating safety indicators.",
      descriptionBn: "নিরাপত্তা লক্ষণসমূহ সংকলন করা হচ্ছে।",
      status: "pending"
    }
  ],
  riskIndicators: [
    { label: "bKash brand spoofing", labelBn: "বিকাশ ব্র্যান্ড জালিয়াতি", severity: "CRIT" },
    { label: "Unexpected prize claim", labelBn: "অনাকাঙ্ক্ষিত পুরস্কারের প্রলোভন", severity: "HIGH" },
    { label: "Urgent cashback phrasing", labelBn: "জরুরি ক্যাশব্যাক প্রলোভন", severity: "HIGH" },
    { label: "Unofficial .top TLD domain", labelBn: "অনাফিশিয়াল .top ডোমেইন", severity: "CRIT" }
  ]
};
