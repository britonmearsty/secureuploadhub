'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface AnalyticsChartProps {
  data: any[];
  xKey: string;
  yKey: string;
  type: 'line' | 'bar' | 'pie';
  color?: string;
  height?: number;
  formatXAxis?: (value: any) => string;
  formatYAxis?: (value: any) => string;
  formatTooltip?: (value: any, name?: string) => [string, string];
}

const COLORS = [
  '#4F46E5',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#06B6D4',
  '#84CC16',
  '#F97316',
  '#EC4899',
  '#6B7280',
];

export function AnalyticsChart({
  data,
  xKey,
  yKey,
  type,
  color = '#4F46E5',
  height = 300,
  formatXAxis,
  formatYAxis,
  formatTooltip,
}: AnalyticsChartProps) {
  const formattedData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      [xKey]: formatXAxis ? formatXAxis(item[xKey]) : item[xKey],
    }));
  }, [data, xKey, formatXAxis]);

  const defaultFormatXAxis = (value: any) => {
    if (typeof value === 'string' && value.includes('T')) {
      try {
        return format(parseISO(value), 'MMM dd');
      } catch {
        return value;
      }
    }
    return value;
  };

  const defaultFormatYAxis = (value: any) => {
    if (typeof value === 'number') {
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      }
      if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      }
    }
    return value;
  };

  const defaultFormatTooltip = (value: any, name?: string) => {
    const formattedValue = formatYAxis ? formatYAxis(value) : defaultFormatYAxis(value);
    return [formattedValue, name || ''];
  };

  if (type === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={formattedData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey={yKey}
          >
            {formattedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={formatTooltip || defaultFormatTooltip} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey={xKey} 
            tickFormatter={formatXAxis || defaultFormatXAxis}
            className="text-xs fill-muted-foreground"
          />
          <YAxis 
            tickFormatter={formatYAxis || defaultFormatYAxis}
            className="text-xs fill-muted-foreground"
          />
          <Tooltip 
            formatter={formatTooltip || defaultFormatTooltip}
            labelFormatter={formatXAxis || defaultFormatXAxis}
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
            }}
          />
          <Bar dataKey={yKey} fill={color} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={formattedData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey={xKey} 
          tickFormatter={formatXAxis || defaultFormatXAxis}
          className="text-xs fill-muted-foreground"
        />
        <YAxis 
          tickFormatter={formatYAxis || defaultFormatYAxis}
          className="text-xs fill-muted-foreground"
        />
        <Tooltip 
          formatter={formatTooltip || defaultFormatTooltip}
          labelFormatter={formatXAxis || defaultFormatXAxis}
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
          }}
        />
        <Line 
          type="monotone" 
          dataKey={yKey} 
          stroke={color} 
          strokeWidth={2}
          dot={{ fill: color, strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}