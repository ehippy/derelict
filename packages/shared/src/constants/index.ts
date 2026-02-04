// Game constants

export * from './class-modifiers';

// Class starting skills and bonus selections
export const CLASS_STARTING_SKILLS = {
  marine: {
    starting: ['military_training', 'athletics'],
    bonusChoice: 'either', // Can choose either option
    bonusOptions: [
      { expert: 1 },
      { trained: 2 }
    ]
  },
  android: {
    starting: ['linguistics', 'computers', 'mathematics'],
    bonusChoice: 'either',
    bonusOptions: [
      { expert: 1 },
      { trained: 2 }
    ]
  },
  scientist: {
    starting: [], // Must select 1 Master + its prerequisite chain during creation
    requiresMasterSelection: true,
    bonusSlots: { trained: 1 }
  },
  teamster: {
    starting: ['industrial_equipment', 'zero_g'],
    bonusSlots: { trained: 1, expert: 1 }
  }
} as const;

// Discord permission constants (bitfield values)
export const DISCORD_PERMISSIONS = {
  ADMINISTRATOR: 0x8,
  MANAGE_GUILD: 0x20,
  MANAGE_CHANNELS: 0x40,
} as const;

export const GAME_CONSTANTS = {
  MAX_STRESS: 100,
  MAX_INVENTORY_SLOTS: 10,
  PANIC_THRESHOLD: 5,
  GRID_SIZE: 32, // pixels per tile
} as const;

export const DICE = {
  D100: 100,
  D20: 20,
  D10: 10,
} as const;
