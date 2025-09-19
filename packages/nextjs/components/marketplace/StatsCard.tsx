"use client";

import { ReactNode } from "react";

interface StatsCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export const StatsCard = ({ 
  icon, 
  label, 
  value, 
  subtitle, 
  trend, 
  className = "" 
}: StatsCardProps) => {
  return (
    <div className={`card bg-base-100 shadow-lg hover:shadow-xl transition-shadow ${className}`}>
      <div className="card-body text-center">
        <div className="flex justify-center mb-2">
          {icon}
        </div>
        <h3 className="text-2xl font-bold text-primary mb-1">{value}</h3>
        <p className="text-sm text-base-content/70 mb-2">{label}</p>
        {subtitle && (
          <p className="text-xs text-base-content/50">{subtitle}</p>
        )}
        {trend && (
          <div className={`flex items-center justify-center text-xs ${
            trend.isPositive ? 'text-success' : 'text-error'
          }`}>
            <span className="mr-1">
              {trend.isPositive ? '↗' : '↘'}
            </span>
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
    </div>
  );
};
