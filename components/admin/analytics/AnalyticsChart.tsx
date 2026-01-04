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
    if (!data || data.length === 0) {
      return [];
    }
    return data.map((item) => ({
      ...item,
      [xKey]: formatXAxis ? formatXAxis(item[xKey]) : item[xKey],
    }));
  }, [data, xKey, formatXAxis]);

  const defaultFormatXAxis = (value: any) => {
    if (typeof value === 'string') {
      // Handle YYYY-MM-DD format
      if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
        try {
          const date = new Date(value + 'T00:00:00');
          return format(date, 'MMM dd');
        } catch {
          return value;
        }
      }
      // Handle ISO date strings
      if (value.includes('T')) {
        try {
          return format(parseISO(value), 'MMM dd');
        } catch {
          return value;
        }
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

  // Handle empty data - show empty chart instead of null
  const chartData = formattedData && formattedData.length > 0 ? formattedData : [{ [xKey]: 'No data', [yKey]: 0 }];

  if (type === 'pie') {
    // For pie charts, don't show anything if no real data
    if (!formattedData || formattedData.length === 0) {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-2 rounded-full border-2 border-dashed border-muted-foreground/30"></div>
              <p className="text-sm">No data to display</p>
            </div>
          </div>
        </ResponsiveContainer>
      );
    }

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
        <BarChart data={chartData}>
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
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
          />
          <Bar dataKey={yKey} fill={color} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
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
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
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