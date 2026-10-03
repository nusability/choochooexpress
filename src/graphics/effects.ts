// Pooled particles: steam puffs, spill dust, derailment sparkles, delivery confetti (one draw call).
import * as THREE from 'three';
import { TOY_COLORS } from './palette';

const MAX = 700;

const VERT = /* glsl */ `
  attribute float size;
  attribute float alpha;
  attribute vec3 tint;
  varying vec3 vTint;
  varying float vAlpha;
  uniform float scale;
  void main() {
    vTint = tint;
    vAlpha = alpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * scale / max(0.001, -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vTint;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    gl_FragColor = vec4(vTint, vAlpha * smoothstep(0.5, 0.25, d));
    #include <colorspace_fragment>
  }
`;

const CONFETTI = [TOY_COLORS.block, TOY_COLORS.duck, TOY_COLORS.car, TOY_COLORS.ball, TOY_COLORS.star, '#ffffff'];

export class Effects {
  readonly group = new THREE.Group();
  private readonly geometry = new THREE.BufferGeometry();
  private readonly material: THREE.ShaderMaterial;
  private readonly pos = new Float32Array(MAX * 3);
  private readonly vel = new Float32Array(MAX * 3);
  private readonly tint = new Float32Array(MAX * 3);
  private readonly size = new Float32Array(MAX);
  private readonly baseSize = new Float32Array(MAX);
  private readonly growth = new Float32Array(MAX);
  private readonly alpha = new Float32Array(MAX);
  private readonly life = new Float32Array(MAX);
  private readonly maxLife = new Float32Array(MAX);
  private readonly gravity = new Float32Array(MAX);
  private next = 0;
  private readonly color = new THREE.Color();

  constructor() {
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('tint', new THREE.BufferAttribute(this.tint, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1000);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { scale: { value: 600 } },
      transparent: true,
      depthWrite: false,
    });
    const points = new THREE.Points(this.geometry, this.material);
    points.frustumCulled = false;
    points.renderOrder = 3;
    this.group.add(points);
  }

  /** Point size scale from the framebuffer height in device pixels (FOV 30°: h / (2·tan 15°)). */
  setScale(framebufferHeight: number): void {
    (this.material.uniforms.scale as { value: number }).value = framebufferHeight / (2 * Math.tan(Math.PI / 12));
  }

  private emit(x: number, y: number, z: number, vx: number, vy: number, vz: number, color: string, size: number, life: number, gravity: number, growth = 0): void {
    const i = this.next;
    this.next = (this.next + 1) % MAX;
    this.pos.set([x, y, z], i * 3);
    this.vel.set([vx, vy, vz], i * 3);
    this.color.set(color);
    this.tint.set([this.color.r, this.color.g, this.color.b], i * 3);
    this.baseSize[i] = size;
    this.size[i] = size;
    this.growth[i] = growth;
    this.life[i] = life;
    this.maxLife[i] = life;
    this.gravity[i] = gravity;
    this.alpha[i] = 1;
  }

  puff(x: number, y: number, z: number, color = '#f4efe6', scale = 1): void {
    for (let k = 0; k < 2; k++) {
      this.emit(x + (Math.random() - 0.5) * 0.06, y, z + (Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.15, 0.45 + Math.random() * 0.2, (Math.random() - 0.5) * 0.15, color, 0.09 * scale, 1.2, -0.05, 0.12 * scale);
    }
  }

  burst(x: number, y: number, z: number): void {
    for (let k = 0; k < 90; k++) {
      const a = Math.random() * Math.PI * 2;
      const s = 0.8 + Math.random() * 1.8;
      this.emit(x, y, z, Math.cos(a) * s, 1.2 + Math.random() * 2.2, Math.sin(a) * s, CONFETTI[k % CONFETTI.length] as string, 0.06 + Math.random() * 0.05, 1.4 + Math.random() * 0.6, 4.5);
    }
    for (let k = 0; k < 12; k++) this.puff(x + (Math.random() - 0.5) * 0.5, y, z + (Math.random() - 0.5) * 0.5, '#fff6e6', 2.2);
  }

  confetti(x: number, y: number, z: number): void {
    for (let k = 0; k < 120; k++) {
      const a = Math.random() * Math.PI * 2;
      const s = 0.3 + Math.random() * 1.1;
      this.emit(x, y, z, Math.cos(a) * s, 2 + Math.random() * 2, Math.sin(a) * s, CONFETTI[k % CONFETTI.length] as string, 0.05 + Math.random() * 0.04, 2.2 + Math.random(), 3.2);
    }
  }

  update(dt: number): void {
    let any = false;
    for (let i = 0; i < MAX; i++) {
      if ((this.life[i] as number) <= 0) {
        if ((this.alpha[i] as number) !== 0) {
          this.alpha[i] = 0;
          any = true;
        }
        continue;
      }
      any = true;
      const life = (this.life[i] as number) - dt;
      this.life[i] = life;
      const j = i * 3;
      this.vel[j + 1] = (this.vel[j + 1] as number) - (this.gravity[i] as number) * dt;
      this.pos[j] = (this.pos[j] as number) + (this.vel[j] as number) * dt;
      this.pos[j + 1] = Math.max(0.01, (this.pos[j + 1] as number) + (this.vel[j + 1] as number) * dt);
      this.pos[j + 2] = (this.pos[j + 2] as number) + (this.vel[j + 2] as number) * dt;
      const t = Math.max(0, life / (this.maxLife[i] as number));
      this.alpha[i] = Math.min(1, t * 1.6);
      this.size[i] = (this.baseSize[i] as number) + (this.growth[i] as number) * (1 - t);
    }
    if (!any) return;
    for (const name of ['position', 'tint', 'size', 'alpha']) (this.geometry.getAttribute(name) as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
