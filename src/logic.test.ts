import { describe, it, expect } from 'vitest';
import { calculateMultiplier, clampToLane, shouldTriggerGate, computeScore } from './logic';

describe('Game Logic - Unit Tests', () => {
  describe('calculateMultiplier', () => {
    it('multiplies base by gate value', () => {
      expect(calculateMultiplier(1, 2)).toBe(2);
      expect(calculateMultiplier(5, 3)).toBe(15);
      expect(calculateMultiplier(10, 5)).toBe(50);
    });

    it('handles edge cases', () => {
      expect(calculateMultiplier(0, 2)).toBe(0);
      expect(calculateMultiplier(1, 1)).toBe(1);
    });
  });

  describe('clampToLane', () => {
    it('clamps values outside lane', () => {
      expect(clampToLane(6, 5)).toBe(5);
      expect(clampToLane(-7, 5)).toBe(-5);
    });

    it('leaves values inside lane unchanged', () => {
      expect(clampToLane(3, 5)).toBe(3);
      expect(clampToLane(-2.5, 5)).toBe(-2.5);
      expect(clampToLane(0, 5)).toBe(0);
    });
  });

  describe('shouldTriggerGate', () => {
    it('triggers when within threshold', () => {
      expect(shouldTriggerGate(9.2, 9)).toBe(true);
      expect(shouldTriggerGate(8.5, 9)).toBe(true);
    });

    it('does not trigger outside threshold', () => {
      expect(shouldTriggerGate(10, 9)).toBe(false);
      expect(shouldTriggerGate(7, 9)).toBe(false);
    });
  });

  describe('computeScore', () => {
    it('calculates score correctly', () => {
      expect(computeScore(3, 1)).toBe(80);
      expect(computeScore(0, 0)).toBe(0);
      expect(computeScore(5, 2)).toBe(150);
    });
  });
});
