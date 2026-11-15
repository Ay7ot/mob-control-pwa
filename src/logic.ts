// Pure game logic (unit-testable, no Three.js dependency)

export function calculateMultiplier(base: number, gate: number): number {
  return base * gate;
}

export function clampToLane(x: number, halfWidth: number): number {
  if (Math.abs(x) > halfWidth) {
    return Math.sign(x) * halfWidth;
  }
  return x;
}

export function shouldTriggerGate(z: number, gateZ: number, threshold = 0.6): boolean {
  return Math.abs(z - gateZ) < threshold;
}

export function computeScore(destroyed: number, reachedBase: number): number {
  return destroyed * 10 + reachedBase * 50;
}
