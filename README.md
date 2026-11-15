# Mob Control PWA

High-performance Progressive Web App prototype inspired by crowd-multiplier tower-defense games.

## Features

- **WebGPU-first** rendering with automatic WebGL fallback
- **InstancedMesh** for 1,500+ units in a single draw call
- Object pooling (zero allocations in the hot path)
- Stylized PBR materials, soft shadows, ACES tone mapping, atmospheric fog
- Multiplier gates (×2 / ×3 / ×5) with particle bursts
- Simple player vs enemy unit collisions
- Touch + mouse aiming
- Full PWA (installable, offline-capable, fullscreen landscape)
- 60 fps target on mid-range mobile

## Run

```bash
npm install
npm run dev
```

Open on desktop or mobile. Add to home screen for the native-like experience.

## Build

```bash
npm run build
npm run preview
```

## Testing

```bash
npm run test        # unit + integration (Vitest)
npm run test:e2e    # Playwright E2E
npm run test:all    # both
```

## Architecture

- Single InstancedMesh for all units
- Pre-allocated unit pool
- Spatial-style gate detection
- Particle system for multiplication and hits
- Fixed-style delta capping
- Pixel ratio capped at 1.75×
