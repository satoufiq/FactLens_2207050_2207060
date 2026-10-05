import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

interface ActivityChartProps {
  data: { day: string; scans: number }[];
  isBn?: boolean;
}

export const ActivityChart: React.FC<ActivityChartProps> = ({ data, isBn }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {isBn ? 'সাপ্তাহিক যাচাইকরণ অ্যাক্টিভিটি গ্রাফ' : 'WEEKLY ACTIVITY (SCANS PER DAY)'}
        </span>
        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 font-mono">
          Avg 4.4 / day
        </span>
      </div>

      <div className="h-52 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="scansGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
              domain={[0, 8]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0F172A',
                borderRadius: '12px',
                border: '1px solid #1E293B',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 600,
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
              }}
              itemStyle={{ color: '#60A5FA' }}
              formatter={(val: any) => [`${val} scans`, 'Verification Scans']}
            />
            <Area
              type="monotone"
              dataKey="scans"
              stroke="#2563EB"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#scansGradient)"
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
