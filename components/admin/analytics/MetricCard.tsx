'use client';

import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

export function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  trend,
  className,
  color = 'blue'
}: MetricCardProps) {
  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-slate-600';
  };

  const getTrendIcon = () => {
    if (trend === 'up') return TrendingUp;
    if (trend === 'down') return TrendingDown;
    return null;
  };

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    red: 'bg-red-50 text-red-600 border-red-100'
  };

  const TrendIcon = getTrendIcon();

  return (
    <div className={cn('bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className={cn('p-3 rounded-lg', colorClasses[color])}>
          <Icon className="w-6 h-6" />
        </div>
        {TrendIcon && (
          <TrendIcon className={cn('h-4 w-4', getTrendColor())} />
        )}
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-600">{title}</p>
        {(change !== undefined || changeLabel) && (
          <div className="flex items-center space-x-2 mt-2">
            {change !== undefined && (
              <span className={cn('text-xs font-medium', getTrendColor())}>
                {change > 0 ? '+' : ''}{change}
              </span>
            )}
            {changeLabel && (
              <p className="text-xs text-slate-500">{changeLabel}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}