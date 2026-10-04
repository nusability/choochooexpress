// Things drifting through the air on a holiday (F-015): snow, confetti, petals, leaves, sparkles,
// sky lanterns or bubbles over the board. One instanced mesh; holds still under reduced motion.
import * as THREE from 'three';
import { Pcg32, hashSeed } from '../engine/prng';
import type { FxKind } from './holiday';

interface Mote {
  x: number;
  y: number;
  z: number;
  speed: number;
  phase: number;
  spin: number;
  size: number;
}

/** Rising things go up, sparkles hang and twinkle, everything else falls. */
const RISES: Partial<Record<FxKind, boolean>> = { lanterns: true, bubbles: true };

function moteGeometry(kind: FxKind): THREE.BufferGeometry {
  switch (kind) {
    case 'snow':
      return new THREE.IcosahedronGeometry(0.035, 0);
    case 'confetti':
      return new THREE.BoxGeometry(0.07, 0.006, 0.04);
    case 'petals':
      return new THREE.SphereGeometry(0.045, 8, 4).scale(1, 0.25, 0.7);
    case 'leaves':
      return new THREE.ConeGeometry(0.05, 0.1, 4).scale(1, 1, 0.2).rotateX(Math.PI / 2);
    case 'sparkles':
      return new THREE.OctahedronGeometry(0.04, 0);
    case 'lanterns':
      return new THREE.CylinderGeometry(0.06, 0.045, 0.12, 8);
    case 'bubbles':
      return new THREE.SphereGeometry(0.06, 12, 8);
  }
}

export class HolidayFx {
  readonly mesh: THREE.InstancedMesh;
  private readonly motes: Mote[] = [];
  private readonly kind: FxKind;
  private readonly top = 4.5;
  private time = 0;

  constructor(kind: FxKind, colors: readonly string[], count: number, width: number, depth: number, seed: number) {
    this.kind = kind;
    const rng = new Pcg32(hashSeed(seed, 'holidayFx'));
    const glowing = kind === 'lanterns' || kind === 'sparkles';
    const material = glowing
      ? new THREE.MeshBasicMaterial({ toneMapped: false })
      : new THREE.MeshStandardMaterial({ roughness: 0.6, transparent: kind === 'bubbles', opacity: kind === 'bubbles' ? 0.55 : 1 });
    this.mesh = new THREE.InstancedMesh(moteGeometry(kind), material, count);
    this.mesh.frustumCulled = false;
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      this.motes.push({
        x: rng.float(-width / 2, width / 2),
        y: rng.float(0.3, this.top),
        z: rng.float(-depth / 2, depth / 2),
        speed: rng.float(0.25, 0.55),
        phase: rng.float(0, Math.PI * 2),
        spin: rng.float(-2, 2),
        size: rng.float(0.75, 1.3),
      });
      this.mesh.setColorAt(i, color.set(colors[i % colors.length] as string));
    }
    this.pose(0);
  }

  update(dt: number, motion: boolean): void {
    if (!motion) return;
    this.time += dt;
    const rise = RISES[this.kind] ? 1 : this.kind === 'sparkles' ? 0 : -1;
    for (const m of this.motes) {
      m.y += rise * m.speed * dt * (this.kind === 'lanterns' ? 0.5 : 1);
      if (m.y < 0.05) m.y += this.top;
      if (m.y > this.top) m.y -= this.top - 0.3;
    }
    this.pose(this.time);
  }

  private pose(t: number): void {
    const mat = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    this.motes.forEach((m, i) => {
      const sway = this.kind === 'lanterns' ? 0.05 : 0.25;
      p.set(m.x + Math.sin(t * 0.8 + m.phase) * sway, m.y, m.z + Math.cos(t * 0.6 + m.phase) * sway * 0.6);
      e.set(t * m.spin + m.phase, t * m.spin * 0.7, m.phase);
      if (this.kind === 'lanterns' || this.kind === 'bubbles') e.set(0, m.phase, 0);
      const twinkle = this.kind === 'sparkles' ? 0.4 + 0.6 * Math.abs(Math.sin(t * 2.5 + m.phase)) : 1;
      this.mesh.setMatrixAt(i, mat.compose(p, q.setFromEuler(e), s.setScalar(m.size * twinkle)));
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.dispose();
  }
}
