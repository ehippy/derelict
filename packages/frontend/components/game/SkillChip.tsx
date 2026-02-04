import React from "react";

interface SkillChipProps {
  skillName: string;
  tier: 'trained' | 'expert' | 'master';
  size?: 'sm' | 'md';
}

const TIER_BONUS = {
  trained: 10,
  expert: 15,
  master: 20,
} as const;

const TIER_COLORS = {
  trained: 'bg-green-900/30 border-green-700 text-green-300',
  expert: 'bg-blue-900/30 border-blue-700 text-blue-300',
  master: 'bg-purple-900/30 border-purple-700 text-purple-300',
} as const;

export function SkillChip({ skillName, tier, size = 'md' }: SkillChipProps) {
  const bonus = TIER_BONUS[tier];
  const colorClass = TIER_COLORS[tier];
  const sizeClass = size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-xs';
  
  return (
    <span className={`border rounded ${colorClass} ${sizeClass}`}>
      {skillName} (+{bonus})
    </span>
  );
}
