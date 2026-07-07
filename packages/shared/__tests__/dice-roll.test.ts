import { rollDie, rollDice, statCheck, rollCheck, shouldTriggerPanic } from '../src/game-logic';

describe('Dice Roll Functions', () => {
  describe('rollDie', () => {
    test('returns a value between 1 and sides (inclusive)', () => {
      for (let sides of [4, 6, 8, 10, 12, 20, 100]) {
        for (let i = 0; i < 50; i++) {
          const result = rollDie(sides);
          expect(result).toBeGreaterThanOrEqual(1);
          expect(result).toBeLessThanOrEqual(sides);
        }
      }
    });

    test('d4 always returns 1-4', () => {
      for (let i = 0; i < 100; i++) {
        const result = rollDie(4);
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(4);
      }
    });

    test('d100 always returns 1-100', () => {
      for (let i = 0; i < 100; i++) {
        const result = rollDie(100);
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('rollDice', () => {
    test('single d6 returns value between 1 and 6', () => {
      for (let i = 0; i < 50; i++) {
        const result = rollDice(6, 1);
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(6);
      }
    });

    test('multiple d6 sum is between count and count*sides', () => {
      for (let count of [2, 3, 5]) {
        for (let i = 0; i < 50; i++) {
          const result = rollDice(6, count);
          expect(result).toBeGreaterThanOrEqual(count);
          expect(result).toBeLessThanOrEqual(count * 6);
        }
      }
    });

    test('default count is 1', () => {
      const result = rollDice(6);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(6);
    });

    test('d100x3 sum is between 3 and 300', () => {
      for (let i = 0; i < 50; i++) {
        const result = rollDice(100, 3);
        expect(result).toBeGreaterThanOrEqual(3);
        expect(result).toBeLessThanOrEqual(300);
      }
    });
  });

  describe('statCheck', () => {
    test('stat 80 succeeds most of the time (runs multiple to avoid flakiness)', () => {
      let successes = 0;
      for (let i = 0; i < 20; i++) {
        if (statCheck(80).success) successes++;
      }
      // stat 80 has 80% success rate; expect at least 12/20 successes
      expect(successes).toBeGreaterThanOrEqual(12);
    });

    test('stat 5 fails most of the time (runs multiple to avoid flakiness)', () => {
      let successes = 0;
      for (let i = 0; i < 20; i++) {
        if (statCheck(5).success) successes++;
      }
      // stat 5 has 5% success rate; expect 0-2 successes in 20 rolls
      expect(successes).toBeLessThanOrEqual(3);
    });

    test('stat 50 has roughly 50% success rate', () => {
      let successes = 0;
      for (let i = 0; i < 100; i++) {
        if (statCheck(50).success) successes++;
      }
      // Should be between 30 and 70 successes (reasonable randomness)
      expect(successes).toBeGreaterThan(25);
      expect(successes).toBeLessThan(75);
    });

    test('stat 100 always succeeds', () => {
      for (let i = 0; i < 20; i++) {
        const result = statCheck(100);
        expect(result.success).toBe(true);
        expect(result.roll).toBeGreaterThanOrEqual(1);
        expect(result.roll).toBeLessThanOrEqual(100);
      }
    });

    test('stat 1 rarely succeeds', () => {
      let successes = 0;
      for (let i = 0; i < 100; i++) {
        if (statCheck(1).success) successes++;
      }
      // 1/100 chance, expect 0 successes in 100 rolls
      expect(successes).toBeLessThanOrEqual(3);
    });

    test('roll value is always between 1 and 100', () => {
      for (let i = 0; i < 100; i++) {
        const result = statCheck(50);
        expect(result.roll).toBeGreaterThanOrEqual(1);
        expect(result.roll).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('rollCheck', () => {
    test('returns success=true when roll <= statValue', () => {
      const { success } = rollCheck(50, 60);
      expect(success).toBe(true);
    });

    test('returns success=false when roll > statValue', () => {
      const { success } = rollCheck(70, 50);
      expect(success).toBe(false);
    });

    test('roll <= 5 is always a critical success', () => {
      for (let stat of [10, 50, 90, 100]) {
        const { critical } = rollCheck(5, stat);
        expect(critical).toBe(true);
      }
    });

    test('roll >= 95 is always a critical (success or failure)', () => {
      // 95 vs 100 - critical success (95 <= 100)
      expect(rollCheck(95, 100).critical).toBe(true);
      // 96 vs 50 - critical failure (96 > 50 but >= 95)
      expect(rollCheck(96, 50).critical).toBe(true);
      // 100 vs 10 - critical failure
      expect(rollCheck(100, 10).critical).toBe(true);
    });

    test('normal rolls (6-94) have no critical', () => {
      for (let roll = 6; roll <= 94; roll++) {
        const { critical } = rollCheck(roll, 50);
        expect(critical).toBe(false);
      }
    });

    test('critical success: roll 3 vs 50', () => {
      const result = rollCheck(3, 50);
      expect(result.success).toBe(true);
      expect(result.critical).toBe(true);
    });

    test('critical failure: roll 98 vs 50', () => {
      const result = rollCheck(98, 50);
      expect(result.success).toBe(false);
      expect(result.critical).toBe(true);
    });
  });

  describe('shouldTriggerPanic', () => {
    test('stress >= threshold triggers panic', () => {
      expect(shouldTriggerPanic(5, 5)).toBe(true);
      expect(shouldTriggerPanic(10, 5)).toBe(true);
      expect(shouldTriggerPanic(50, 5)).toBe(true);
    });

    test('stress < threshold does not trigger panic', () => {
      expect(shouldTriggerPanic(4, 5)).toBe(false);
      expect(shouldTriggerPanic(0, 5)).toBe(false);
      expect(shouldTriggerPanic(3, 5)).toBe(false);
    });

    test('uses default threshold of 5', () => {
      expect(shouldTriggerPanic(5)).toBe(true);
      expect(shouldTriggerPanic(4)).toBe(false);
    });

    test('custom threshold works', () => {
      expect(shouldTriggerPanic(10, 10)).toBe(true);
      expect(shouldTriggerPanic(9, 10)).toBe(false);
      expect(shouldTriggerPanic(100, 20)).toBe(true);
    });

    test('stress equal to threshold triggers panic', () => {
      for (let threshold of [1, 5, 10, 20, 50, 100]) {
        expect(shouldTriggerPanic(threshold, threshold)).toBe(true);
      }
    });
  });
});
