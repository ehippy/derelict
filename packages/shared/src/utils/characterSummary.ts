// Character summary and sheet formatting utilities for @derelict/shared

import type { Character } from '../types';
import { getTraumaResponse, CLASS_MODIFIERS, getStatModifier, getSaveModifier } from '../constants';
import { getSkillTree } from '../game-logic';

/**
 * Format a character class name for display (capitalize first letter)
 */
export function formatClassName(classId: string): string {
  return classId.charAt(0).toUpperCase() + classId.slice(1);
}

/**
 * Get emoji for a character class
 */
export function getClassEmoji(classId: string): string {
  const emojis: Record<string, string> = {
    marine: '\u{1F9EA}',  // \u{1F9EA} = Marine helmet emoji
    android: '\u{1F916}', // Android
    scientist: '\u{1F52C}', // Microscope
    teamster: '\u{1F69A}', // Truck
  };
  return emojis[classId] || '\u{1F680}';
}

/**
 * Format a stat label (e.g., "strength" -> "STR")
 */
export function formatStatLabel(stat: string): string {
  const labels: Record<string, string> = {
    strength: 'STR',
    speed: 'SPD',
    intellect: 'INT',
    combat: 'CMB',
    social: 'SOC',
  };
  return labels[stat] || stat.toUpperCase();
}

/**
 * Format a save label (e.g., "sanity" -> "SAN")
 */
export function formatSaveLabel(save: string): string {
  const labels: Record<string, string> = {
    sanity: 'SAN',
    fear: 'FEAR',
    body: 'BODY',
  };
  return labels[save] || save.toUpperCase();
}

/**
 * Get the modifier display for a stat (e.g., "+10", "-5", or "")
 */
export function getStatModifierDisplay(character: Character, stat: string): string {
  if (!character.characterClass) return '';
  const mod = getStatModifier(character.characterClass, stat, character.chosenStatModifier);
  return mod > 0 ? `+${mod}` : mod < 0 ? `${mod}` : '';
}

/**
 * Get the modifier display for a save (e.g., "+20", "-5", or "")
 */
export function getSaveModifierDisplay(character: Character, save: string): string {
  if (!character.characterClass) return '';
  const mod = getSaveModifier(character.characterClass, save);
  return mod > 0 ? `+${mod}` : mod < 0 ? `${mod}` : '';
}

/**
 * Format a single skill with its bonus value
 */
export function formatSkill(skillId: string): string {
  const tree = getSkillTree();
  const skill = tree.skills.find(s => s.id === skillId);
  if (!skill) return skillId;
  const tierBonuses = { trained: 10, expert: 15, master: 20 };
  return `${skill.name} (+${tierBonuses[skill.tier]})`;
}

/**
 * Format a list of skill IDs as a comma-separated string
 */
export function formatSkillsList(skillIds: string[]): string {
  return skillIds.map(formatSkill).join(', ');
}

/**
 * Generate a compact character summary suitable for Discord embedding.
 * Returns a string with all key character information formatted concisely.
 *
 * Example output:
 * ```
 * 🪖 Marine: Void Runner
 * STR 57 (+0)  SPD 52 (+0)  INT 47 (+0)  CMB 67 (+10)  SOC 42 (+0)
 * SAN 38  FEAR 78 (+20)  BODY 47 (+10)
 * Health: 18/18  Wounds: 0/1  Stress: 2/10
 * Skills: Military Training, Athletics, Firearms
 * ```
 */
export function formatCharacterSummary(character: Character): string {
  const className = character.characterClass ? formatClassName(character.characterClass) : 'Character';
  const classEmoji = character.characterClass ? getClassEmoji(character.characterClass) : '\u{1F680}';
  const statusIcon = character.isRIP ? '\u2620\uFE0F' : character.status === 'ready' ? '\u2705' : '\u23F3';

  // Stats line
  const stats = ['strength', 'speed', 'intellect', 'combat', 'social'] as const;
  const statsLine = stats
    .map(stat => `${formatStatLabel(stat)} ${character.stats[stat]}`)
    .join('  ');

  // Saves line
  const saves = ['sanity', 'fear', 'body'] as const;
  const savesLine = saves
    .map(save => `${formatSaveLabel(save)} ${character.saves[save]}`)
    .join('  ');

  // Health/wounds/stress line
  const healthLine = `Health: ${character.health}/${character.maxHealth}  Wounds: ${character.wounds}/${character.maxWounds}  Stress: ${character.stress}/${character.maxStress}`;

  // Skills line
  const skillsLine = character.skills.length > 0 ? `Skills: ${formatSkillsList(character.skills)}` : 'No skills selected';

  // Class trauma response (if ready)
  const traumaLine = character.characterClass && character.status === 'ready'
    ? `\n${getTraumaResponse(character.characterClass)}`
    : '';

  // Loadout
  const loadoutLine = character.loadout.length > 0
    ? `\nLoadout: ${character.loadout.join(', ')}`
    : '';

  // Trinket/Patch (if set)
  const trinketLine = character.trinket ? `\nTrinket: ${character.trinket}` : '';
  const patchLine = character.patch ? `Patch: ${character.patch}` : '';

  // Assemble
  const lines = [
    `${statusIcon} ${classEmoji} ${className}: ${character.name}`,
    statsLine,
    savesLine,
    healthLine,
    skillsLine,
    traumaLine,
    loadoutLine,
    trinketLine,
    patchLine,
  ];

  // Filter out empty lines and join
  return lines.filter(Boolean).join('\n');
}

/**
 * Generate a detailed character sheet (full breakdown with modifiers visible).
 * Useful for the frontend character preview or a "show sheet" command.
 *
 * Example output:
 * ```
 * ╔══════════════════════════╗
 * ║  🪖 MARINE: VOID RUNNER  ║
 * ╚══════════════════════════╝
 *
 * ── Stats ──
 * STR  57 (+0)  SPD  52 (+0)  INT  47 (+0)  CMB  67 (+10)  SOC  42 (+0)
 *
 * ── Saves ──
 * SAN  38  FEAR  78 (+20)  BODY  47 (+10)
 *
 * ── Vitals ──
 * Health: 18/18 | Wounds: 0/1 | Stress: 2/10
 *
 * ── Skills ──
 * • Military Training (+10)
 * • Athletics (+10)
 * • Firearms (+15)
 *
 * ── Trauma Response ──
 * Aggressive - When you Panic, you may cause problems for the rest of the crew
 *
 * ── Equipment ──
 * Loadout: Flares, Grappling Hook
 * Trinket: Locket
 * Patch:
 * ```
 */
export function formatCharacterSheet(character: Character): string {
  const className = character.characterClass ? formatClassName(character.characterClass).toUpperCase() : 'CHARACTER';
  const classEmoji = character.characterClass ? getClassEmoji(character.characterClass) : '\u{1F680}';
  const name = character.name || 'Unnamed';

  // Title bar
  const titleBar = `╔════════════════════════════════╗`;
  const titleContent = `${classEmoji} ${className}: ${name}`;
  const titleBarBottom = `╚════════════════════════════════╝`;
  const titleSpacer = ' '.repeat(Math.max(0, 30 - titleContent.length));

  // Stats with modifiers
  const stats = ['strength', 'speed', 'intellect', 'combat', 'social'] as const;
  const statsLine = stats
    .map(stat => {
      const mod = getStatModifierDisplay(character, stat);
      const modDisplay = mod ? ` (${mod})` : '';
      return `${formatStatLabel(stat)} ${character.stats[stat].toString().padStart(2)}${modDisplay}`;
    })
    .join('  ');

  // Saves with modifiers
  const saves = ['sanity', 'fear', 'body'] as const;
  const savesLine = saves
    .map(save => {
      const mod = getSaveModifierDisplay(character, save);
      const modDisplay = mod ? ` (${mod})` : '';
      return `${formatSaveLabel(save)} ${character.saves[save].toString().padStart(2)}${modDisplay}`;
    })
    .join('  ');

  // Vitals
  const vitals = `Health: ${character.health}/${character.maxHealth} | Wounds: ${character.wounds}/${character.maxWounds} | Stress: ${character.stress}/${character.maxStress}`;

  // Skills
  const skillsHeader = character.skills.length > 0
    ? character.skills.map(s => `• ${formatSkill(s)}`).join('\n')
    : '  (no skills)';

  // Trauma response
  const traumaLine = character.characterClass ? getTraumaResponse(character.characterClass) : '(no class)';

  // Equipment
  const loadout = character.loadout.length > 0 ? character.loadout.join(', ') : '(none)';
  const trinket = character.trinket || '(none)';
  const patch = character.patch || '(none)';

  return [
    titleBar,
    `║${titleContent}${titleSpacer}║`,
    titleBarBottom,
    '',
    '── Stats ──',
    statsLine,
    '',
    '── Saves ──',
    savesLine,
    '',
    '── Vitals ──',
    vitals,
    '',
    '── Skills ──',
    skillsHeader,
    '',
    '── Trauma Response ──',
    traumaLine,
    '',
    '── Equipment ──',
    `Loadout: ${loadout}`,
    `Trinket: ${trinket}`,
    `Patch: ${patch}`,
  ].join('\n');
}

/**
 * Generate a short one-liner status for quick checks.
 * Useful for Discord status updates or party overview.
 *
 * Example: "✅ 🪖 Marine: Void Runner | HP 18/18 | Skills: Military Training, Athletics"
 */
export function formatCharacterOneLiner(character: Character): string {
  const className = character.characterClass ? formatClassName(character.characterClass) : 'Character';
  const classEmoji = character.characterClass ? getClassEmoji(character.characterClass) : '\u{1F680}';
  const statusIcon = character.isRIP ? '\u2620\uFE0F RIP' : character.status === 'ready' ? '\u2705' : '\u23F3';
  const skills = character.skills.length > 0 ? `Skills: ${character.skills.slice(0, 3).map(formatSkill).join(', ')}${character.skills.length > 3 ? '...' : ''}` : '';

  return `${statusIcon} ${classEmoji} ${className}: ${character.name} | HP ${character.health}/${character.maxHealth} | ${skills}`;
}

/**
 * Generate a party overview summarizing all characters in a game.
 *
 * Example:
 * ```
 * ╔═══════════════════════════════╗
 * ║  PARTY ROSTER                 ║
 * ╚═══════════════════════════════╝
 *
 * 1. ✅ 🪖 Marine: Void Runner | HP 18/18
 * 2. ✅ 🤖 Android: Unit-7 | HP 12/12
 * 3. ⏳ Scientist: Dr. Chen | HP -/-
 * 4. ⏳ Teamster: Big Ma | HP -/-
 * ```
 */
export function formatPartyOverview(characters: Character[]): string {
  const titleBar = '╔═══════════════════════════════════════╗';
  const titleContent = '  PARTY ROSTER';
  const titleSpacer = ' '.repeat(30 - titleContent.length + 1);
  const titleBarBottom = '╚═══════════════════════════════════════╝';

  const entries = characters.map((char, i) => {
    const className = char.characterClass ? formatClassName(char.characterClass) : 'Character';
    const classEmoji = char.characterClass ? getClassEmoji(char.characterClass) : '\u{1F680}';
    const statusIcon = char.isRIP ? '\u2620\uFE0F' : char.status === 'ready' ? '\u2705' : '\u23F3';
    const hp = char.status === 'ready' ? `HP ${char.health}/${char.maxHealth}` : 'HP -/-';
    const name = char.name || 'Unnamed';

    return `${i + 1}. ${statusIcon} ${classEmoji} ${className}: ${name} | ${hp}`;
  });

  return [titleBar, `║${titleContent}${titleSpacer}║`, titleBarBottom, '', entries.join('\n')].join('\n');
}
