// Skill selection and validation logic

import { getSkillTree } from './index';
import { CLASS_STARTING_SKILLS } from '../constants';

export interface SkillTreeSkill {
  id: string;
  name: string;
  tier: 'trained' | 'expert' | 'master';
  unlocks?: string[];
  unlocked_by?: string[];
}

export interface SkillsByTier {
  trained: SkillTreeSkill[];
  expert: SkillTreeSkill[];
  master: SkillTreeSkill[];
}

/**
 * Check if a skill can be selected based on current selections
 */
export function isSkillUnlocked(
  skillId: string,
  currentSkills: string[],
  skillTree: ReturnType<typeof getSkillTree>
): boolean {
  const skill = skillTree.skills.find(s => s.id === skillId);
  if (!skill) return false;

  // Trained skills (no prerequisites) are always unlocked
  if (!skill.unlocked_by || skill.unlocked_by.length === 0) {
    return true;
  }

  // Expert/Master skills need at least ONE prerequisite
  return skill.unlocked_by.some(prereqId => currentSkills.includes(prereqId));
}

/**
 * Get remaining bonus skill slots for a character class
 */
export function getRemainingBonusSlots(
  characterClass: string,
  selectedSkills: string[],
  startingSkills: string[],
  bonusChoiceIndex?: number // Which bonus option was chosen (for marine/android)
): { trained: number; expert: number; master: number } {
  const classConfig = CLASS_STARTING_SKILLS[characterClass as keyof typeof CLASS_STARTING_SKILLS];
  if (!classConfig) return { trained: 0, expert: 0, master: 0 };

  const skillTree = getSkillTree();
  
  // Count bonus skills already selected (exclude starting skills)
  const bonusSkills = selectedSkills.filter(id => !startingSkills.includes(id));
  const bonusSkillsByTier = bonusSkills.reduce((acc, skillId) => {
    const skill = skillTree.skills.find(s => s.id === skillId);
    if (skill) {
      const tier = skill.tier as 'trained' | 'expert' | 'master';
      acc[tier]++;
    }
    return acc;
  }, { trained: 0, expert: 0, master: 0 } as { trained: number; expert: number; master: number });

  // Calculate remaining slots based on class config
  if ('bonusSlots' in classConfig) {
    // Teamster or Scientist with fixed slots
    const slots = classConfig.bonusSlots as { trained?: number; expert?: number; master?: number };
    return {
      trained: (slots.trained || 0) - bonusSkillsByTier.trained,
      expert: (slots.expert || 0) - bonusSkillsByTier.expert,
      master: (slots.master || 0) - bonusSkillsByTier.master,
    };
  } else if ('bonusOptions' in classConfig && bonusChoiceIndex !== undefined) {
    // Marine or Android with choice
    const chosenOption = classConfig.bonusOptions[bonusChoiceIndex] as { trained?: number; expert?: number; master?: number };
    return {
      trained: (chosenOption.trained || 0) - bonusSkillsByTier.trained,
      expert: (chosenOption.expert || 0) - bonusSkillsByTier.expert,
      master: (chosenOption.master || 0) - bonusSkillsByTier.master,
    };
  }

  return { trained: 0, expert: 0, master: 0 };
}

/**
 * Group skills by tier for display
 */
export function getSkillsByTier(
  skillIds: string[],
  skillTree: ReturnType<typeof getSkillTree>
): SkillsByTier {
  const result: SkillsByTier = {
    trained: [],
    expert: [],
    master: []
  };

  skillIds.forEach(id => {
    const skill = skillTree.skills.find(s => s.id === id);
    if (skill) {
      const tier = skill.tier as 'trained' | 'expert' | 'master';
      result[tier].push(skill as SkillTreeSkill);
    }
  });

  return result;
}

/**
 * Get the prerequisite chain needed for a Master skill
 * For Scientists who must select a complete chain
 */
export function getMasterSkillChain(
  masterId: string,
  skillTree: ReturnType<typeof getSkillTree>
): { master: SkillTreeSkill; expert: SkillTreeSkill; trained: SkillTreeSkill } | null {
  const master = skillTree.skills.find(s => s.id === masterId && s.tier === 'master');
  if (!master || !master.unlocked_by) return null;

  // Get first available expert prerequisite
  const expertId = master.unlocked_by[0];
  const expert = skillTree.skills.find(s => s.id === expertId);
  if (!expert || !expert.unlocked_by) return null;

  // Get first available trained prerequisite
  const trainedId = expert.unlocked_by[0];
  const trained = skillTree.skills.find(s => s.id === trainedId);
  if (!trained) return null;

  return {
    master: master as SkillTreeSkill,
    expert: expert as SkillTreeSkill,
    trained: trained as SkillTreeSkill
  };
}

/**
 * Validate if skill selection is complete and valid
 */
export function validateSkillSelection(
  characterClass: string,
  selectedSkills: string[],
  startingSkills: string[],
  bonusChoiceIndex?: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const remaining = getRemainingBonusSlots(characterClass, selectedSkills, startingSkills, bonusChoiceIndex);

  // Check if all bonus slots are filled
  if (remaining.trained > 0) {
    errors.push(`Must select ${remaining.trained} more trained skill${remaining.trained > 1 ? 's' : ''}`);
  }
  if (remaining.expert > 0) {
    errors.push(`Must select ${remaining.expert} more expert skill${remaining.expert > 1 ? 's' : ''}`);
  }
  if (remaining.master > 0) {
    errors.push(`Must select ${remaining.master} more master skill${remaining.master > 1 ? 's' : ''}`);
  }

  // Check if any slots are overfilled (shouldn't happen with proper UI)
  if (remaining.trained < 0 || remaining.expert < 0 || remaining.master < 0) {
    errors.push('Too many skills selected');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
