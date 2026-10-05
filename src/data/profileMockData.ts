export interface UserProfileData {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    location: string;
    timeZone: string;
    language: string;
    accountType: string;
    memberSince: string;
    lastActive: string;
    initials: string;
    status: string;
    completenessPct: number;
  };
  stats: {
    totalScans: number;
    savedEvidence: number;
    thisWeek: number;
  };
  activity: {
    rumor: number;
    scam: number;
    image: number;
  };
  weeklyActivity: {
    day: string;
    scans: number;
  }[];
  usage: {
    total: number;
    completed: number;
    partial: number;
    unableToAnalyze: number;
  };
  security: {
    passwordLastChanged: string;
    twoFactorEnabled: boolean;
    activeSessions: number;
    statusGood: boolean;
  };
  recentActivity: {
    id: string;
    title: string;
    type: 'RUMOR' | 'SCAM' | 'IMAGE';
    result: 'UNVERIFIED' | 'HIGH_RISK' | 'LIKELY_AUTHENTIC' | 'SUPPORTED' | 'CONTRADICTED';
    time: string;
    scanId: string;
  }[];
}

export const profileMockData: UserProfileData = {
  user: {
    id: "FL-USER-0007",
    name: "Shahriar Abdullah Toufiq",
    email: "shahriar@example.com",
    phone: "+880 1700-000000",
    location: "Bangladesh",
    timeZone: "GMT +06:00 (Dhaka)",
    language: "English / বাংলা",
    accountType: "Demo Account",
    memberSince: "September 2026",
    lastActive: "Today, 10:47 PM",
    initials: "ST",
    status: "Account active",
    completenessPct: 80
  },
  stats: {
    totalScans: 24,
    savedEvidence: 12,
    thisWeek: 6
  },
  activity: {
    rumor: 10,
    scam: 8,
    image: 6
  },
  weeklyActivity: [
    { day: "Mon", scans: 2 },
    { day: "Tue", scans: 4 },
    { day: "Wed", scans: 3 },
    { day: "Thu", scans: 6 },
    { day: "Fri", scans: 4 },
    { day: "Sat", scans: 7 },
    { day: "Sun", scans: 5 }
  ],
  usage: {
    total: 24,
    completed: 22,
    partial: 1,
    unableToAnalyze: 1
  },
  security: {
    passwordLastChanged: "30 days ago",
    twoFactorEnabled: false,
    activeSessions: 2,
    statusGood: true
  },
  recentActivity: [
    {
      id: "rec-1",
      title: "University closure claim",
      type: "RUMOR",
      result: "UNVERIFIED",
      time: "18 min ago",
      scanId: "FL-RUMOR-0024"
    },
    {
      id: "rec-2",
      title: "Prize message",
      type: "SCAM",
      result: "HIGH_RISK",
      time: "1 hour ago",
      scanId: "FL-SCAM-0018"
    },
    {
      id: "rec-3",
      title: "Event photograph",
      type: "IMAGE",
      result: "LIKELY_AUTHENTIC",
      time: "Yesterday",
      scanId: "FL-IMAGE-0012"
    }
  ]
};
