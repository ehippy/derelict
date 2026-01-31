// Game logic and mechanics

/**
 * Roll a die with the specified number of sides
 */
export function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Perform a stat check (roll under stat value on d100)
 */
export function statCheck(statValue: number): { success: boolean; roll: number } {
  const roll = rollDie(100);
  return {
    success: roll <= statValue,
    roll,
  };
}

/**
 * Calculate if a panic check is triggered based on current stress
 */
export function shouldTriggerPanic(stress: number, threshold: number = 5): boolean {
  return stress >= threshold;
}
