// Mothership RPG Class Modifiers

export interface ClassModifiers {
  stats: {
    strength: number;
    speed: number;
    intellect: number;
    combat: number;
    social: number;
  };
  saves: {
    sanity: number;
    fear: number;
    body: number;
  };
  maxWounds: number;
  traumaResponse: string;
  requiresStatChoice?: 'bonus' | 'penalty'; // For Android/Scientist
}

export const CLASS_MODIFIERS: Record<string, ClassModifiers> = {
  marine: {
    stats: { strength: 0, speed: 0, intellect: 0, combat: 10, social: 0 },
    saves: { sanity: 0, fear: 20, body: 10 },
    maxWounds: 1,
    traumaResponse: "Aggressive - When you Panic, you may cause problems for the rest of the crew",
  },
  android: {
    stats: { strength: 0, speed: 0, intellect: 20, combat: 0, social: -10 },
    saves: { sanity: 0, fear: 60, body: 0 },
    maxWounds: 1,
    traumaResponse: "Cold - Your inhuman nature unnerves other crewmembers",
    requiresStatChoice: 'penalty', // -10 to 1 stat
  },
  scientist: {
    stats: { strength: 0, speed: 0, intellect: 10, combat: 0, social: -5 },
    saves: { sanity: 30, fear: 0, body: 0 },
    maxWounds: 0,
    traumaResponse: "Analytical - You approach panic with cold logic",
    requiresStatChoice: 'bonus', // +5 to 1 stat
  },
  teamster: {
    stats: { strength: 5, speed: 5, intellect: 5, combat: 5, social: 5 },
    saves: { sanity: 10, fear: 10, body: 10 },
    maxWounds: 0,
    traumaResponse: "Resilient - You've seen it all before",
  },
};

export function getStatModifier(
  characterClass: string,
  stat: string,
  chosenStat?: string
): number {
  const modifiers = CLASS_MODIFIERS[characterClass];
  if (!modifiers) return 0;

  const baseMod = modifiers.stats[stat as keyof typeof modifiers.stats] || 0;

  // Apply chosen stat modifier for Android/Scientist
  if (chosenStat === stat) {
    if (modifiers.requiresStatChoice === 'penalty') {
      return baseMod - 10; // Android: -10 to chosen stat
    } else if (modifiers.requiresStatChoice === 'bonus') {
      return baseMod + 5; // Scientist: +5 to chosen stat
    }
  }

  return baseMod;
}

export function getSaveModifier(characterClass: string, save: string): number {
  const modifiers = CLASS_MODIFIERS[characterClass];
  if (!modifiers) return 0;
  return modifiers.saves[save as keyof typeof modifiers.saves] || 0;
}

export function getMaxWoundsModifier(characterClass: string): number {
  const modifiers = CLASS_MODIFIERS[characterClass];
  return modifiers?.maxWounds || 0;
}

export function getTraumaResponse(characterClass: string): string {
  const modifiers = CLASS_MODIFIERS[characterClass];
  return modifiers?.traumaResponse || '';
}
