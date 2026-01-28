'use client';

import React from 'react';
import { Flame, Scale, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GoalBadgeProps {
  goal: 'fat_loss' | 'maintenance' | 'muscle_gain' | null;
  className?: string;
}

export default function GoalBadge({ goal, className }: GoalBadgeProps) {
  const getGoalConfig = () => {
    switch (goal) {
      case 'fat_loss':
        return {
          label: 'Fat Loss',
          icon: Flame,
          className: 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
        };
      case 'maintenance':
        return {
          label: 'Maintenance',
          icon: Scale,
          className: 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
        };
      case 'muscle_gain':
        return {
          label: 'Muscle Gain',
          icon: TrendingUp,
          className: 'bg-green-500/20 text-green-400 border border-green-500/30'
        };
      default:
        return {
          label: 'Not Set',
          icon: null,
          className: 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
        };
    }
  };

  const config = getGoalConfig();
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        config.className,
        className
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      <span>{config.label}</span>
    </div>
  );
}
