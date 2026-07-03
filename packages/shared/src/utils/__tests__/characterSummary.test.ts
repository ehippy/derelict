// Unit tests for character summary utilities
import {
  formatCharacterSummary,
  formatCharacterSheet,
  formatCharacterOneLiner,
  formatPartyOverview,
  formatClassName,
  getClassEmoji,
  formatStatLabel,
  formatSaveLabel,
  formatSkill,
  formatSkillsList,
  getStatModifierDisplay,
  getSaveModifierDisplay,
} from '../characterSummary';
import type { Character } from '../../types';

const mockCharacter: Character = {
  id: 'test-char-001',
  playerId: 'discord-123',
  gameId: 'game-001',
  name: 'Void Runner',
  characterClass: 'marine',
  chosenStatModifier: undefined,
  status: 'ready',
  stats: { strength: 57, speed: 52, intellect: 47, combat: 67, social: 42 },
  saves: { sanity: 38, fear: 78, body: 47 },
  health: 18,
  maxHealth: 18,
  wounds: 0,
  maxWounds: 1,
  stress: 2,
  minStress: 2,
  maxStress: 10,
  skills: ['military_training', 'athletics', 'firearms'],
  loadout: ['Flares', 'Grappling Hook'],
  trinket: 'Locket',
  inventory: [],
  isRIP: false,
};

const mockAndroid: Character = {
  id: 'test-char-002',
  playerId: 'discord-456',
  gameId: 'game-001',
  name: 'Unit-7',
  characterClass: 'android',
  chosenStatModifier: 'strength',
  status: 'ready',
  stats: { strength: 52, speed: 47, intellect: 52, combat: 42, social: 32 },
  saves: { sanity: 33, fear: 38, body: 42 },
  health: 12,
  maxHealth: 12,
  wounds: 1,
  maxWounds: 1,
  stress: 3,
  minStress: 2,
  maxStress: 10,
  skills: ['linguistics', 'computers', 'mathematics', 'psychology'],
  loadout: ['Taser'],
  inventory: [],
  isRIP: false,
};

const mockDeceased: Character = {
  id: 'test-char-003',
  playerId: 'discord-789',
  gameId: 'game-001',
  name: 'Dr. Chen',
  characterClass: 'scientist',
  chosenStatModifier: 'intellect',
  status: 'ready',
  stats: { strength: 37, speed: 42, intellect: 57, combat: 32, social: 42 },
  saves: { sanity: 58, fear: 42, body: 37 },
  health: 0,
  maxHealth: 14,
  wounds: 2,
  maxWounds: 0,
  stress: 6,
  minStress: 2,
  maxStress: 10,
  skills: ['pathology', 'field_medicine', 'surgery', 'exobiology'],
  loadout: ['Medkit'],
  inventory: [],
  isRIP: true,
};

const mockUnready: Character = {
  id: 'test-char-004',
  playerId: 'discord-101',
  gameId: 'game-001',
  name: '',
  characterClass: undefined,
  chosenStatModifier: undefined,
  status: 'creating',
  stats: { strength: 0, speed: 0, intellect: 0, combat: 0, social: 0 },
  saves: { sanity: 0, fear: 0, body: 0 },
  health: 0,
  maxHealth: 0,
  wounds: 0,
  maxWounds: 2,
  stress: 2,
  minStress: 2,
  maxStress: 10,
  skills: [],
  loadout: [],
  inventory: [],
  isRIP: false,
};

describe('formatClassName', () => {
  it('capitalizes class names', () => {
    expect(formatClassName('marine')).toBe('Marine');
    expect(formatClassName('android')).toBe('Android');
    expect(formatClassName('scientist')).toBe('Scientist');
    expect(formatClassName('teamster')).toBe('Teamster');
  });
});

describe('getClassEmoji', () => {
  it('returns correct emoji for each class', () => {
    expect(getClassEmoji('marine')).toBe('\u{1F9EA}');
    expect(getClassEmoji('android')).toBe('\u{1F916}');
    expect(getClassEmoji('scientist')).toBe('\u{1F52C}');
    expect(getClassEmoji('teamster')).toBe('\u{1F69A}');
    expect(getClassEmoji('unknown')).toBe('\u{1F680}');
  });
});

describe('formatStatLabel', () => {
  it('formats stat labels correctly', () => {
    expect(formatStatLabel('strength')).toBe('STR');
    expect(formatStatLabel('speed')).toBe('SPD');
    expect(formatStatLabel('intellect')).toBe('INT');
    expect(formatStatLabel('combat')).toBe('CMB');
    expect(formatStatLabel('social')).toBe('SOC');
  });
});

describe('formatSaveLabel', () => {
  it('formats save labels correctly', () => {
    expect(formatSaveLabel('sanity')).toBe('SAN');
    expect(formatSaveLabel('fear')).toBe('FEAR');
    expect(formatSaveLabel('body')).toBe('BODY');
  });
});

describe('formatSkill', () => {
  it('formats skill with tier bonus', () => {
    expect(formatSkill('military_training')).toBe('Military Training (+10)');
    expect(formatSkill('firearms')).toBe('Firearms (+15)');
    expect(formatSkill('surgery')).toBe('Surgery (+20)');
  });

  it('falls back to skill id for unknown skills', () => {
    expect(formatSkill('nonexistent_skill')).toBe('nonexistent_skill');
  });
});

describe('formatSkillsList', () => {
  it('formats skill list as comma-separated string', () => {
    expect(formatSkillsList(['military_training', 'athletics'])).toBe(
      'Military Training (+10), Athletics (+10)'
    );
  });

  it('handles empty list', () => {
    expect(formatSkillsList([])).toBe('');
  });
});

describe('getStatModifierDisplay', () => {
  it('shows positive modifiers', () => {
    expect(getStatModifierDisplay(mockCharacter, 'combat')).toBe('+10');
    expect(getStatModifierDisplay(mockCharacter, 'social')).toBe('');
  });

  it('shows negative modifiers', () => {
    expect(getStatModifierDisplay(mockAndroid, 'social')).toBe('-10');
  });

  it('handles no class', () => {
    expect(getStatModifierDisplay(mockUnready, 'strength')).toBe('');
  });
});

describe('getSaveModifierDisplay', () => {
  it('shows positive save modifiers', () => {
    expect(getSaveModifierDisplay(mockCharacter, 'fear')).toBe('+20');
    expect(getSaveModifierDisplay(mockCharacter, 'body')).toBe('+10');
  });

  it('handles no class', () => {
    expect(getSaveModifierDisplay(mockUnready, 'sanity')).toBe('');
  });
});

describe('formatCharacterSummary', () => {
  it('generates summary with all fields for a ready character', () => {
    const summary = formatCharacterSummary(mockCharacter);

    expect(summary).toContain('Marine: Void Runner');
    expect(summary).toContain('STR 57');
    expect(summary).toContain('CMB 67');
    expect(summary).toContain('FEAR 78');
    expect(summary).toContain('Health: 18/18');
    expect(summary).toContain('Wounds: 0/1');
    expect(summary).toContain('Stress: 2/10');
    expect(summary).toContain('Military Training');
    expect(summary).toContain('Athletics');
    expect(summary).toContain('Firearms');
    expect(summary).toContain('Aggressive');
  });

  it('shows RIP status for deceased characters', () => {
    const summary = formatCharacterSummary(mockDeceased);

    expect(summary).toContain('☠');
    expect(summary).toContain('Dr. Chen');
    expect(summary).toContain('Health: 0/14');
  });

  it('shows creating status for unready characters', () => {
    const summary = formatCharacterSummary(mockUnready);

    expect(summary).toContain('⏳');
    expect(summary).toContain('No skills selected');
    expect(summary).toContain('Health: 0/0');
  });

  it('includes loadout and trinket', () => {
    const summary = formatCharacterSummary(mockCharacter);

    expect(summary).toContain('Loadout: Flares, Grappling Hook');
    expect(summary).toContain('Trinket: Locket');
  });

  it('works for android with stat choices', () => {
    const summary = formatCharacterSummary(mockAndroid);

    expect(summary).toContain('Android: Unit-7');
    expect(summary).toContain('STR 52');
  });
});

describe('formatCharacterSheet', () => {
  it('generates detailed sheet with ASCII box', () => {
    const sheet = formatCharacterSheet(mockCharacter);

    expect(sheet).toContain('╔════════════════════════════════╗');
    expect(sheet).toContain('╚════════════════════════════════╝');
    expect(sheet).toContain('MARINE: Void Runner');
    expect(sheet).toContain('── Stats ──');
    expect(sheet).toContain('── Saves ──');
    expect(sheet).toContain('── Vitals ──');
    expect(sheet).toContain('── Skills ──');
    expect(sheet).toContain('── Trauma Response ──');
    expect(sheet).toContain('── Equipment ──');
  });

  it('shows modifier details in sheet', () => {
    const sheet = formatCharacterSheet(mockCharacter);

    expect(sheet).toContain('CMB 67 (+10)');
    expect(sheet).toContain('FEAR 78 (+20)');
  });

  it('handles unready character', () => {
    const sheet = formatCharacterSheet(mockUnready);

    expect(sheet).toContain('CHARACTER');
    expect(sheet).toContain('STR  0');
  });
});

describe('formatCharacterOneLiner', () => {
  it('generates compact one-liner', () => {
    const oneLiner = formatCharacterOneLiner(mockCharacter);

    expect(oneLiner).toContain('✅');
    expect(oneLiner).toContain('Marine: Void Runner');
    expect(oneLiner).toContain('HP 18/18');
    expect(oneLiner).toContain('Military Training (+10)');
  });

  it('marks deceased characters as RIP', () => {
    const oneLiner = formatCharacterOneLiner(mockDeceased);

    expect(oneLiner).toContain('☠');
    expect(oneLiner).toContain('RIP');
  });

  it('shows creating status for unready characters', () => {
    const oneLiner = formatCharacterOneLiner(mockUnready);

    expect(oneLiner).toContain('⏳');
    expect(oneLiner).toContain('HP 0/0');
  });

  it('truncates long skill lists with ellipsis', () => {
    const longSkills = {
      ...mockCharacter,
      skills: ['military_training', 'athletics', 'firearms', 'command', 'engineering', 'hyperspace'],
    };
    const oneLiner = formatCharacterOneLiner(longSkills);

    expect(oneLiner).toContain('...');
    expect(oneLiner).toContain('Military Training');
    expect(oneLiner).not.toContain('hyperspace');
  });
});

describe('formatPartyOverview', () => {
  it('formats all characters in a party', () => {
    const overview = formatPartyOverview([mockCharacter, mockAndroid, mockDeceased, mockUnready]);

    expect(overview).toContain('PARTY ROSTER');
    expect(overview).toContain('1.');
    expect(overview).toContain('2.');
    expect(overview).toContain('3.');
    expect(overview).toContain('4.');
    expect(overview).toContain('Void Runner');
    expect(overview).toContain('Unit-7');
    expect(overview).toContain('Dr. Chen');
  });

  it('handles empty party', () => {
    const overview = formatPartyOverview([]);

    expect(overview).toContain('PARTY ROSTER');
    expect(overview).not.toContain('1.');
  });

  it('shows HP correctly for each character', () => {
    const overview = formatPartyOverview([mockCharacter, mockDeceased, mockUnready]);

    expect(overview).toContain('HP 18/18');
    expect(overview).toContain('HP 0/14');
    expect(overview).toContain('HP -/-');
  });
});
