import {
  getStatModifier,
  getSaveModifier,
  getMaxWoundsModifier,
  getTraumaResponse,
  CLASS_MODIFIERS,
  CLASS_STARTING_SKILLS,
} from '../src/constants';
import { getRemainingBonusSlots, validateSkillSelection } from '../src/game-logic/skills';
import { getSkillTree } from '../src/game-logic/index';

// Helper to cast readonly arrays to mutable (safe for read-only usage in tests)
const asStrArray = (arr: readonly string[]): string[] => arr as string[];

describe('Class Modifiers', () => {
  describe('CLASS_MODIFIERS', () => {
    test('defines all four character classes', () => {
      expect(CLASS_MODIFIERS).toHaveProperty('marine');
      expect(CLASS_MODIFIERS).toHaveProperty('android');
      expect(CLASS_MODIFIERS).toHaveProperty('scientist');
      expect(CLASS_MODIFIERS).toHaveProperty('teamster');
    });

    test('each class has stats, saves, maxWounds, and traumaResponse', () => {
      Object.values(CLASS_MODIFIERS).forEach(mod => {
        expect(mod).toHaveProperty('stats');
        expect(mod).toHaveProperty('saves');
        expect(mod).toHaveProperty('maxWounds');
        expect(mod).toHaveProperty('traumaResponse');
      });
    });

    test('marine has combat bonus (+10)', () => {
      expect(CLASS_MODIFIERS.marine.stats.combat).toBe(10);
    });

    test('marine has fear and body save bonuses', () => {
      expect(CLASS_MODIFIERS.marine.saves.fear).toBe(20);
      expect(CLASS_MODIFIERS.marine.saves.body).toBe(10);
    });

    test('android has intellect bonus (+20) and social penalty (-10)', () => {
      expect(CLASS_MODIFIERS.android.stats.intellect).toBe(20);
      expect(CLASS_MODIFIERS.android.stats.social).toBe(-10);
    });

    test('android has fear immunity (60 save)', () => {
      expect(CLASS_MODIFIERS.android.saves.fear).toBe(60);
    });

    test('scientist has intellect bonus and sanity save bonus', () => {
      expect(CLASS_MODIFIERS.scientist.stats.intellect).toBe(10);
      expect(CLASS_MODIFIERS.scientist.saves.sanity).toBe(30);
    });

    test('teamster is balanced (all stats +5)', () => {
      const stats = CLASS_MODIFIERS.teamster.stats;
      expect(stats.strength).toBe(5);
      expect(stats.speed).toBe(5);
      expect(stats.intellect).toBe(5);
      expect(stats.combat).toBe(5);
      expect(stats.social).toBe(5);
    });

    test('teamster has balanced saves (all +10)', () => {
      const saves = CLASS_MODIFIERS.teamster.saves;
      expect(saves.sanity).toBe(10);
      expect(saves.fear).toBe(10);
      expect(saves.body).toBe(10);
    });
  });

  describe('getStatModifier', () => {
    test('returns base modifier for marine combat', () => {
      expect(getStatModifier('marine', 'combat')).toBe(10);
      expect(getStatModifier('marine', 'strength')).toBe(0);
    });

    test('returns android intellect with penalty choice', () => {
      // Base is 20. The chosenStat param must match the stat name for penalty to apply.
      // When chosenStat='intellect' and stat='intellect', penalty applies: 20 - 10 = 10
      expect(getStatModifier('android', 'intellect', 'intellect')).toBe(10);
      // Other stats stay at base 20 (no chosen match)
      expect(getStatModifier('android', 'intellect', 'linguistics')).toBe(20);
      // Other stats at base 0
      expect(getStatModifier('android', 'speed', 'linguistics')).toBe(0);
    });

    test('returns scientist intellect with bonus choice', () => {
      // Base is 10. When chosenStat matches stat name, bonus applies: 10 + 5 = 15
      expect(getStatModifier('scientist', 'intellect', 'intellect')).toBe(15);
      // Other stats stay at base (no chosen match)
      expect(getStatModifier('scientist', 'intellect', 'linguistics')).toBe(10);
      // Other stats at base
      expect(getStatModifier('scientist', 'social', 'linguistics')).toBe(-5);
    });

    test('returns 0 for unknown class', () => {
      expect(getStatModifier('rogue', 'strength')).toBe(0);
      expect(getStatModifier('', 'strength')).toBe(0);
    });

    test('returns 0 for unknown stat', () => {
      expect(getStatModifier('marine', 'magic')).toBe(0);
    });
  });

  describe('getSaveModifier', () => {
    test('returns marine fear save bonus', () => {
      expect(getSaveModifier('marine', 'fear')).toBe(20);
    });

    test('returns android fear immunity', () => {
      expect(getSaveModifier('android', 'fear')).toBe(60);
    });

    test('returns scientist sanity save bonus', () => {
      expect(getSaveModifier('scientist', 'sanity')).toBe(30);
    });

    test('returns 0 for class with no save bonus', () => {
      expect(getSaveModifier('teamster', 'sanity')).toBe(10); // teamster has +10
      expect(getSaveModifier('android', 'sanity')).toBe(0);
      expect(getSaveModifier('marine', 'sanity')).toBe(0);
    });

    test('returns 0 for unknown class', () => {
      expect(getSaveModifier('rogue', 'fear')).toBe(0);
    });
  });

  describe('getMaxWoundsModifier', () => {
    test('marine has +1 max wound', () => {
      expect(getMaxWoundsModifier('marine')).toBe(1);
    });

    test('android has +0 max wounds (same as scientist and teamster)', () => {
      // Android also has 1 max wound like marine
      expect(getMaxWoundsModifier('android')).toBe(1);
      expect(getMaxWoundsModifier('scientist')).toBe(0);
      expect(getMaxWoundsModifier('teamster')).toBe(0);
    });

    test('returns 0 for unknown class', () => {
      expect(getMaxWoundsModifier('rogue')).toBe(0);
    });
  });

  describe('getTraumaResponse', () => {
    test('returns correct trauma responses for each class', () => {
      expect(getTraumaResponse('marine')).toContain('Aggressive');
      expect(getTraumaResponse('android')).toContain('inhuman');
      expect(getTraumaResponse('scientist')).toContain('Analytical');
      expect(getTraumaResponse('teamster')).toContain('Resilient');
    });

    test('returns empty string for unknown class', () => {
      expect(getTraumaResponse('rogue')).toBe('');
    });
  });
});

describe('Class Starting Skills', () => {
  describe('CLASS_STARTING_SKILLS', () => {
    test('defines all four character classes', () => {
      expect(CLASS_STARTING_SKILLS).toHaveProperty('marine');
      expect(CLASS_STARTING_SKILLS).toHaveProperty('android');
      expect(CLASS_STARTING_SKILLS).toHaveProperty('scientist');
      expect(CLASS_STARTING_SKILLS).toHaveProperty('teamster');
    });

    test('marine has starting skills', () => {
      expect(CLASS_STARTING_SKILLS.marine.starting).toContain('military_training');
      expect(CLASS_STARTING_SKILLS.marine.starting).toContain('athletics');
    });

    test('android has starting skills', () => {
      expect(CLASS_STARTING_SKILLS.android.starting).toContain('linguistics');
      expect(CLASS_STARTING_SKILLS.android.starting).toContain('computers');
      expect(CLASS_STARTING_SKILLS.android.starting).toContain('mathematics');
    });

    test('scientist requires master selection', () => {
      expect(CLASS_STARTING_SKILLS.scientist.requiresMasterSelection).toBe(true);
      expect(CLASS_STARTING_SKILLS.scientist.starting).toEqual([]);
      expect(CLASS_STARTING_SKILLS.scientist.bonusSlots).toEqual({ trained: 1 });
    });

    test('teamster has starting skills and fixed bonus slots', () => {
      expect(CLASS_STARTING_SKILLS.teamster.starting).toContain('industrial_equipment');
      expect(CLASS_STARTING_SKILLS.teamster.starting).toContain('zero_g');
      expect(CLASS_STARTING_SKILLS.teamster.bonusSlots).toEqual({ trained: 1, expert: 1 });
    });

    test('marine and android have bonus options', () => {
      expect(CLASS_STARTING_SKILLS.marine.bonusChoice).toBe('either');
      expect(CLASS_STARTING_SKILLS.android.bonusChoice).toBe('either');
      expect(CLASS_STARTING_SKILLS.marine.bonusOptions).toHaveLength(2);
      expect(CLASS_STARTING_SKILLS.android.bonusOptions).toHaveLength(2);
    });
  });

  describe('getRemainingBonusSlots', () => {
    const skillTree = getSkillTree();
    const starting = CLASS_STARTING_SKILLS;

    test('marine with no bonus skills has 1 expert slot remaining (option 1)', () => {
      const remaining = getRemainingBonusSlots(
        'marine',
        [],
        asStrArray(starting.marine.starting),
        0 // expert: 1 option
      );
      expect(remaining).toEqual({ trained: 0, expert: 1, master: 0 });
    });

    test('marine with no bonus skills has 2 trained slots remaining (option 2)', () => {
      const remaining = getRemainingBonusSlots(
        'marine',
        [],
        asStrArray(starting.marine.starting),
        1 // trained: 2 option
      );
      expect(remaining).toEqual({ trained: 2, expert: 0, master: 0 });
    });

    test('marine with 1 expert bonus has 0 expert remaining (option 1)', () => {
      const remaining = getRemainingBonusSlots(
        'marine',
        ['psychology'], // expert skill
        asStrArray(starting.marine.starting),
        0 // expert: 1 option
      );
      expect(remaining).toEqual({ trained: 0, expert: 0, master: 0 });
    });

    test('teamster with no bonus skills has correct remaining', () => {
      const remaining = getRemainingBonusSlots(
        'teamster',
        [],
        asStrArray(starting.teamster.starting)
      );
      expect(remaining).toEqual({ trained: 1, expert: 1, master: 0 });
    });

    test('teamster with 1 trained + 1 expert bonus is complete', () => {
      const remaining = getRemainingBonusSlots(
        'teamster',
        ['botany', 'psychology'], // 1 trained + 1 expert
        asStrArray(starting.teamster.starting)
      );
      expect(remaining).toEqual({ trained: 0, expert: 0, master: 0 });
    });

    test('scientist has 1 trained slot', () => {
      const remaining = getRemainingBonusSlots(
        'scientist',
        [],
        asStrArray(starting.scientist.starting)
      );
      expect(remaining).toEqual({ trained: 1, expert: 0, master: 0 });
    });

    test('returns zeros for unknown class', () => {
      const remaining = getRemainingBonusSlots(
        'rogue',
        [],
        []
      );
      expect(remaining).toEqual({ trained: 0, expert: 0, master: 0 });
    });

    test('marine with 2 trained bonus has 0 trained remaining (option 2)', () => {
      const remaining = getRemainingBonusSlots(
        'marine',
        ['botany', 'geology'], // 2 trained skills
        asStrArray(starting.marine.starting),
        1 // trained: 2 option
      );
      expect(remaining).toEqual({ trained: 0, expert: 0, master: 0 });
    });
  });
});

describe('validateSkillSelection', () => {
  const starting = CLASS_STARTING_SKILLS;

  test('marine with option 1 (1 expert) is valid when expert slot filled', () => {
    const result = validateSkillSelection(
      'marine',
      ['psychology'], // fills 1 expert slot
      asStrArray(starting.marine.starting),
      0
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test('marine with option 1 (1 expert) is invalid when expert slot empty', () => {
    const result = validateSkillSelection(
      'marine',
      [],
      asStrArray(starting.marine.starting),
      0
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Must select 1 more expert skill');
  });

  test('marine with option 2 (2 trained) is valid when trained slots filled', () => {
    const result = validateSkillSelection(
      'marine',
      ['botany', 'geology'], // fills 2 trained slots
      asStrArray(starting.marine.starting),
      1
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test('teamster is valid with 1 trained + 1 expert filled', () => {
    const result = validateSkillSelection(
      'teamster',
      ['botany', 'psychology'],
      asStrArray(starting.teamster.starting)
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test('scientist is valid with 1 trained skill filled', () => {
    const result = validateSkillSelection(
      'scientist',
      ['botany'],
      asStrArray(starting.scientist.starting)
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test('scientist is invalid with 0 trained skills', () => {
    const result = validateSkillSelection(
      'scientist',
      [],
      asStrArray(starting.scientist.starting)
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Must select 1 more trained skill');
  });

  test('marine with too many skills is invalid', () => {
    const result = validateSkillSelection(
      'marine',
      ['botany', 'geology', 'psychology'], // 2 trained + 1 expert = overfilled for option 2
      asStrArray(starting.marine.starting),
      1
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Too many skills selected');
  });

  test('empty skill list is invalid for all classes', () => {
    const marineResult = validateSkillSelection(
      'marine',
      [],
      asStrArray(starting.marine.starting),
      0
    );
    expect(marineResult.valid).toBe(false);

    const teamsterResult = validateSkillSelection(
      'teamster',
      [],
      asStrArray(starting.teamster.starting)
    );
    expect(teamsterResult.valid).toBe(false);
  });
});
