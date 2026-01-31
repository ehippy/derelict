// Game constants

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
