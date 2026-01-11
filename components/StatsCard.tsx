import React from 'react';
import { ArrowUp, ArrowDown, Activity, Terminal } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  className?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, subValue, trend, icon, className }) => {
  return (
    <div className={`bg-black border border-terminal-darkGreen p-4 hover:border-terminal-green transition-colors group ${className}`}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-terminal-dim text-xs uppercase tracking-wider font-bold">[{title}]</span>
        {icon || <Terminal size={16} className="text-terminal-darkGreen group-hover:text-terminal-green" />}
      </div>
      <div className="flex flex-col">
        <span className="text-2xl font-bold text-terminal-green tracking-tighter terminal-glow">{value}</span>
        {subValue && (
          <div className="flex items-center mt-1 space-x-2">
            <span className={`text-xs font-mono flex items-center ${
              trend === 'up' ? 'text-green-400' : 
              trend === 'down' ? 'text-red-500' : 'text-gray-500'
            }`}>
              {trend === 'up' && <ArrowUp size={12} className="mr-1" />}
              {trend === 'down' && <ArrowDown size={12} className="mr-1" />}
              {subValue}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
