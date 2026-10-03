export interface WarningSignItem {
  id: string;
  icon: string;
  title: string;
  titleBn: string;
  description: string;
  severity: 'Critical' | 'High Attention' | 'Warning';
  badgeColor: string;
  exampleChips?: string[];
}

export interface RedFlagSpot {
  id: string;
  label: string;
  category: string;
  explanation: string;
}

export interface FAQItem {
  id: string;
  question: string;
  questionBn: string;
  answer: string;
  answerBn: string;
}

export const warningSignsData: WarningSignItem[] = [
  {
    id: "ws-1",
    icon: "Gift",
    title: "Unexpected rewards",
    titleBn: "অপ্রত্যাশিত লটারি বা গিফট অফার",
    description: "You receive a notification for a lottery, reward, or gift card even though you never participated.",
    severity: "High Attention",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-500/40"
  },
  {
    id: "ws-2",
    icon: "CreditCard",
    title: "Upfront payment required",
    titleBn: "পুরস্কারের নামে অগ্রিম ফি দাবি",
    description: "You are asked to pay a processing fee, tax, or advance charge before claiming a prize or receiving money.",
    severity: "Critical",
    badgeColor: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-500/40"
  },
  {
    id: "ws-3",
    icon: "Timer",
    title: "Pressure to act quickly",
    titleBn: "জরুরি পদক্ষেপ নেওয়ার চাপ",
    description: "Messages contain strict countdowns or threats like 'Act in 10 minutes!' to discourage careful verification.",
    severity: "Warning",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-500/40"
  },
  {
    id: "ws-4",
    icon: "ShieldAlert",
    title: "Requests for OTP or PIN",
    titleBn: "ওটিপি (OTP) বা পিন (PIN) চাওয়া",
    description: "The sender requests one-time verification codes, secret PINs, or account recovery numbers.",
    severity: "Critical",
    badgeColor: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-500/40",
    exampleChips: ["OTP", "PIN", "PASSWORD", "CVV"]
  },
  {
    id: "ws-5",
    icon: "Link",
    title: "Suspicious lookalike URL",
    titleBn: "সন্দেহজনক ওয়েবলিঙ্ক বা ডোমেইন",
    description: "Links contain unusual domain extensions (.xyz, .tk) or lookalike character substitutions (e.g. pr1ze-claim).",
    severity: "Warning",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-500/40",
    exampleChips: ["pr1ze-claim.xyz", "bkas-gift.tk"]
  },
  {
    id: "ws-6",
    icon: "UserRoundWarning",
    title: "Impersonation of trusted sources",
    titleBn: "পরিচিত প্রতিষ্ঠান বা ব্যক্তির ছদ্মবেশ",
    description: "The sender claims to represent bKash, Nagad, banks, government agencies, or a family member in distress.",
    severity: "Warning",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-500/40",
    exampleChips: ["bKash Admin", "Nagad Support", "Govt Officer"]
  },
  {
    id: "ws-7",
    icon: "WalletCards",
    title: "Financial credential extraction",
    titleBn: "ব্যাংক অ্যাকাউন্ট ও কার্ডের তথ্য চাওয়া",
    description: "Requests for debit/credit card numbers, expiry dates, CVV codes, or full mobile wallet credentials.",
    severity: "Critical",
    badgeColor: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-500/40"
  },
  {
    id: "ws-8",
    icon: "TrendingUp",
    title: "Unrealistic investment & job offers",
    titleBn: "অবাস্তব ইনভেস্টমেন্ট ও জবের লোভনীয় অফার",
    description: "Promises of guaranteed daily income, 200% returns in 3 days, or easy online task jobs requiring deposit.",
    severity: "High Attention",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-500/40"
  }
];

export const redFlagsData: RedFlagSpot[] = [
  {
    id: "rf-1",
    label: "Unexpected Prize Announcement",
    category: "UNEXPECTED REWARD",
    explanation: "You never registered for this lottery or campaign. Legitimate organizations do not distribute cash prizes via random SMS."
  },
  {
    id: "rf-2",
    label: "Upfront Processing Fee Request",
    category: "UPFRONT PAYMENT",
    explanation: "Scammers ask for ৳500 upfront. Legitimate contests never ask winners to pay fees to claim their earnings."
  },
  {
    id: "rf-3",
    label: "Lookalike & Suspicious URL",
    category: "SUSPICIOUS DOMAIN",
    explanation: "The domain 'pr1ze-claim.xyz' uses character substitution ('1' instead of 'i') and a cheap .xyz TLD."
  },
  {
    id: "rf-4",
    label: "Artificially Created Urgency",
    category: "PRESSURE TACTIC",
    explanation: "'Claim within 10 minutes' forces panic so you click without stopping to verify the sender."
  }
];

export const faqData: FAQItem[] = [
  {
    id: "faq-1",
    question: "How can I tell if a prize message is suspicious?",
    questionBn: "একটি পুরষ্কারের মেসেজ আসল নাকি ভুয়া কিভাবে বুঝব?",
    answer: "If you did not enter a contest, if the message demands an advance fee to release funds, or if it directs you to an unofficial link, it is almost certainly a scam.",
    answerBn: "আপনি যদি কোনো প্রতিযোগিতায় অংশগ্রহণ না করে থাকেন এবং মেসেজে টাকা পাওয়ার জন্য অগ্রিম ফি চাওয়া হয়, তবে এটি নিশ্চিত প্রতারণা।"
  },
  {
    id: "faq-2",
    question: "Should I click a suspicious URL to check it?",
    questionBn: "সন্দেহজনক কোনো লিঙ্কে ক্লিক করে পরীক্ষা করা উচিত?",
    answer: "No! Never click suspicious links. They can lead to phishing sites designed to steal credentials or download malware onto your device. Copy the text link into FactLens Scam Alert instead.",
    answerBn: "কখনোই সন্দেহজনক লিঙ্কে ক্লিক করবেন না। এটি আপনার অ্যাকাউন্ট হ্যাক করতে পারে। লিঙ্কটির টেক্সট কপি করে FactLens-এ যাচাই করুন।"
  },
  {
    id: "faq-3",
    question: "Why should I never share an OTP or PIN?",
    questionBn: "ওটিপি (OTP) বা গোপন পিন কখনো কারো সাথে শেয়ার করা উচিত নয় কেন?",
    answer: "An OTP (One-Time Password) is the master key to your bank or mobile wallet. Bank or customer support staff will NEVER ask for your OTP or PIN under any circumstances.",
    answerBn: "ওটিপি আপনার মোবাইল ব্যাংকিং বা ব্যাংক অ্যাকাউন্টের মাস্টার চাবি। কোনো ব্যাংক কর্মকর্তা বা প্রতিনিধি কখনোই ওটিপি চাইবেন না।"
  },
  {
    id: "faq-4",
    question: "Can a scam message look completely professional?",
    questionBn: "একটি ভুয়া মেসেজ কি পুরোপুরি আসল ও প্রফেশনাল দেখাত পারে?",
    answer: "Yes. Advanced phishing scams clone official logos, SMS sender IDs, and corporate language. Always scrutinize requested actions and links rather than relying solely on visual formatting.",
    answerBn: "হ্যাঁ, জালিয়াতি চক্র আসল লোগো ও এসএমএস হেডার কপি করতে পারে। তাই শুধু মেসেজের ডিজাইন না দেখে মূল উদ্দেশ্য বিশ্লেষণ করুন।"
  },
  {
    id: "faq-5",
    question: "What should I do if I already clicked a suspicious link or paid?",
    questionBn: "আমি যদি ইতিমধ্যে লিঙ্কে ক্লিক করে থাকি বা টাকা পাঠিয়ে ফেলি তবে কি করব?",
    answer: "Immediately change your passwords, notify your bank/mobile wallet provider to freeze your account, and file a report with Bangladesh Police Cyber Crime unit.",
    answerBn: "অবিলম্বে আপনার পিন ও পাসওয়ার্ড পরিবর্তন করুন, ব্যাংকে কল করে অ্যাকাউন্ট সাময়িক বন্ধ করুন এবং সাইবার ক্রাইম ইউনিটে অভিযোগ দায়ের করুন।"
  }
];
