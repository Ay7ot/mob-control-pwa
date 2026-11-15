import './style.css';
import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';

const MAX_UNITS = 1500;

interface Unit {
  active: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  type: 'player' | 'enemy';
  id: number;
}

class Game {
  private renderer!: THREE.WebGPURenderer | THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera!: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private units: Unit[] = [];
  private nextId = 0;
  private instancedMesh!: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();
  private cannon!: THREE.Group;
  private aimAngle = 0;
  private isAiming = false;
  private pointer = new THREE.Vector2();
  private gates: { mesh: THREE.Mesh; multiplier: number; z: number; passed: Set<number> }[] = [];
  private particles: { mesh: THREE.Points; life: number }[] = [];
  private particleMat = new THREE.PointsMaterial({ color: 0x00ffff, size: 0.15, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  private hudCount!: HTMLElement;
  private hudStatus!: HTMLElement;
  private playerUnits = 0;
  private enemyUnits = 0;
  private score = 0;

  async init() {
    await this.setupRenderer();
    this.setupScene();
    this.setupLights();
    this.createEnvironment();
    this.createCannon();
    this.createGates();
    this.createInstancedUnits();
    this.setupInput();
    this.setupHUD();
    this.spawnInitialWave();
    window.addEventListener('resize', () => this.onResize());
    this.onResize();
    this.animate();
  }

  private async setupRenderer() {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    try {
      this.renderer = new WebGPURenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
      await this.renderer.init();
    } catch {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
  }

  private setupScene() {
    this.scene.background = new THREE.Color(0x07070f);
    this.scene.fog = new THREE.Fog(0x07070f, 35, 90);
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);
    this.camera.position.set(0, 10.5, -12);
    this.camera.lookAt(0, 0.5, 14);
  }

  private setupLights() {
    this.scene.add(new THREE.HemisphereLight(0x9ab4ff, 0x1a1a2e, 0.55));
    const dir = new THREE.DirectionalLight(0xffffff, 1.6);
    dir.position.set(6, 18, 4);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.near = 0.5;
    dir.shadow.camera.far = 60;
    dir.shadow.camera.left = -18;
    dir.shadow.camera.right = 18;
    dir.shadow.camera.top = 22;
    dir.shadow.camera.bottom = -18;
    this.scene.add(dir);
    this.scene.add(new THREE.DirectionalLight(0x88ccff, 0.4).translateX(-8).translateY(6).translateZ(-4));
  }

  private createEnvironment() {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(36, 90), new THREE.MeshStandardMaterial({ color: 0x12121f, roughness: 0.9, metalness: 0.05 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1e1e32, roughness: 0.75 });
    const wallGeo = new THREE.BoxGeometry(0.6, 2.4, 70);
    const left = new THREE.Mesh(wallGeo, wallMat);
    left.position.set(-5.8, 1.2, 22);
    left.castShadow = true;
    left.receiveShadow = true;
    this.scene.add(left);
    const right = left.clone();
    right.position.x = 5.8;
    this.scene.add(right);
    const base = new THREE.Mesh(new THREE.BoxGeometry(7.5, 3.5, 1.8), new THREE.MeshStandardMaterial({ color: 0xff3355, roughness: 0.35, metalness: 0.4, emissive: 0x440011, emissiveIntensity: 0.55 }));
    base.position.set(0, 1.75, 40);
    base.castShadow = true;
    base.receiveShadow = true;
    this.scene.add(base);
  }

  private createCannon() {
    this.cannon = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 1.1, 20), new THREE.MeshStandardMaterial({ color: 0x3a7bff, roughness: 0.35, metalness: 0.65 }));
    body.rotation.z = Math.PI / 2;
    body.castShadow = true;
    this.cannon.add(body);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 2.4, 16), new THREE.MeshStandardMaterial({ color: 0x5a9aff, roughness: 0.25, metalness: 0.75 }));
    barrel.rotation.z = Math.PI / 2;
    barrel.position.x = 1.5;
    barrel.castShadow = true;
    this.cannon.add(barrel);
    this.cannon.position.set(0, 1.1, -3.5);
    this.scene.add(this.cannon);
  }

  private createGates() {
    const data = [
      { z: 9, mult: 2, color: 0x00ffff, emissive: 0x003333 },
      { z: 19, mult: 3, color: 0xff44ff, emissive: 0x330033 },
      { z: 29, mult: 5, color: 0xffaa00, emissive: 0x332200 },
    ];
    data.forEach(({ z, mult, color, emissive }) => {
      const gate = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 3.2), new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.7, transparent: true, opacity: 0.82, side: THREE.DoubleSide, roughness: 0.15 }));
      gate.position.set(0, 1.6, z);
      this.scene.add(gate);
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 78px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`×${mult}`, 128, 64);
      const text = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false }));
      text.position.set(0, 1.6, z + 0.08);
      this.scene.add(text);
      this.gates.push({ mesh: gate, multiplier: mult, z, passed: new Set() });
    });
  }

  private createInstancedUnits() {
    const geo = new THREE.CapsuleGeometry(0.26, 0.55, 8, 16);
    const mat = new THREE.MeshStandardMaterial({ color: 0x4da6ff, roughness: 0.42, metalness: 0.12, emissive: 0x0a1a33, emissiveIntensity: 0.2 });
    this.instancedMesh = new THREE.InstancedMesh(geo, mat, MAX_UNITS);
    this.instancedMesh.castShadow = true;
    this.instancedMesh.receiveShadow = true;
    this.instancedMesh.count = 0;
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.instancedMesh);
    for (let i = 0; i < MAX_UNITS; i++) {
      this.units.push({ active: false, position: new THREE.Vector3(), velocity: new THREE.Vector3(), type: 'player', id: i });
    }
  }

  private spawnUnit(pos: THREE.Vector3, vel: THREE.Vector3, type: 'player' | 'enemy') {
    const unit = this.units.find((u) => !u.active);
    if (!unit) return;
    unit.active = true;
    unit.position.copy(pos);
    unit.velocity.copy(vel);
    unit.type = type;
    unit.id = this.nextId++;
    if (type === 'player') this.playerUnits++;
    else this.enemyUnits++;
    this.updateHUD();
  }

  private spawnInitialWave() {
    this.spawnUnit(new THREE.Vector3(0, 0.5, -1.5), new THREE.Vector3(0, 0, 7.5), 'player');
    for (let i = 0; i < 12; i++) {
      const x = (Math.random() - 0.5) * 4.2;
      this.spawnUnit(new THREE.Vector3(x, 0.5, 34 + Math.random() * 3), new THREE.Vector3(0, 0, -4.5), 'enemy');
    }
  }

  private spawnParticles(pos: THREE.Vector3, color: number) {
    const count = 18;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 1.4;
      positions[i * 3 + 1] = Math.random() * 1.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1.4;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = this.particleMat.clone();
    mat.color.setHex(color);
    const points = new THREE.Points(geo, mat);
    points.position.copy(pos);
    this.scene.add(points);
    this.particles.push({ mesh: points, life: 0.45 });
  }

  private setupInput() {
    const canvas = this.renderer.domElement;
    const down = (e: PointerEvent) => { this.isAiming = true; this.updatePointer(e); };
    const move = (e: PointerEvent) => {
      if (!this.isAiming) return;
      this.updatePointer(e);
      this.aimAngle = this.pointer.x * 0.55;
      this.cannon.rotation.y = this.aimAngle;
    };
    const up = () => { if (!this.isAiming) return; this.isAiming = false; this.fire(); };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
  }

  private updatePointer(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private fire() {
    const dir = new THREE.Vector3(Math.sin(this.aimAngle), 0, Math.cos(this.aimAngle)).normalize().multiplyScalar(13);
    this.spawnUnit(new THREE.Vector3(0, 0.55, -2.2), dir, 'player');
  }

  private setupHUD() {
    this.hudCount = document.getElementById('count')!;
    this.hudStatus = document.getElementById('status')!;
    this.updateHUD();
  }

  private updateHUD() {
    this.hudCount.textContent = `Mobs: ${this.playerUnits}`;
    this.hudStatus.textContent = `Score: ${this.score}  •  Enemies: ${this.enemyUnits}`;
  }

  private update(dt: number) {
    let active = 0;
    for (const u of this.units) {
      if (!u.active) continue;
      u.position.addScaledVector(u.velocity, dt);
      if (Math.abs(u.position.x) > 5.0) {
        u.velocity.x *= -0.75;
        u.position.x = Math.sign(u.position.x) * 5.0;
      }
      if (u.type === 'player') {
        for (const g of this.gates) {
          if (u.position.z > g.z - 0.6 && u.position.z < g.z + 0.6 && !g.passed.has(u.id)) {
            g.passed.add(u.id);
            for (let m = 1; m < g.multiplier; m++) {
              const offset = new THREE.Vector3((Math.random() - 0.5) * 1.0, 0, (Math.random() - 0.5) * 0.3);
              this.spawnUnit(u.position.clone().add(offset), u.velocity.clone(), 'player');
            }
            this.spawnParticles(u.position, (g.mesh.material as THREE.MeshStandardMaterial).color.getHex());
            (g.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.4;
            setTimeout(() => { (g.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.7; }, 120);
          }
        }
      }
      if (u.type === 'player') {
        for (const other of this.units) {
          if (!other.active || other.type !== 'enemy') continue;
          if (u.position.distanceToSquared(other.position) < 0.45) {
            u.active = false;
            other.active = false;
            this.playerUnits--;
            this.enemyUnits--;
            this.score += 10;
            this.spawnParticles(u.position, 0xff4466);
            this.updateHUD();
            break;
          }
        }
      }
      if (u.type === 'player' && u.position.z > 38.5) {
        u.active = false;
        this.playerUnits--;
        this.score += 50;
        this.updateHUD();
        continue;
      }
      if (u.position.z < -6 || u.position.z > 42) {
        u.active = false;
        if (u.type === 'player') this.playerUnits--;
        else this.enemyUnits--;
        continue;
      }
      this.dummy.position.copy(u.position);
      this.dummy.lookAt(u.position.clone().add(u.velocity));
      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(active, this.dummy.matrix);
      active++;
    }
    this.instancedMesh.count = active;
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.mesh.position.y += dt * 1.2;
      (p.mesh.material as THREE.PointsMaterial).opacity = Math.max(0, p.life * 2);
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  private onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private animate = () => {
    requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.032);
    this.update(dt);
    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, this.aimAngle * 1.6, 0.04);
    this.renderer.render(this.scene, this.camera);
  };
}

const game = new Game();
game.init().catch(console.error);
