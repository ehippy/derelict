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
 * Alias for statCheck with critical success/failure
 */
export function rollCheck(roll: number, statValue: number): { success: boolean; critical: boolean } {
  const success = roll <= statValue;
  const critical = roll <= 5 || roll >= 95;
  return { success, critical };
}

/**
 * Roll multiple dice and return sum
 */
export function rollDice(sides: number, count: number = 1): number {
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += rollDie(sides);
  }
  return total;
}

/**
 * Calculate if a panic check is triggered based on current stress
 */
export function shouldTriggerPanic(stress: number, threshold: number = 5): boolean {
  return stress >= threshold;
}
