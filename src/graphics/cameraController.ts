// Camera: warm near-isometric view, overview framing, pinch/pan/zoom, follow-the-train mode
// (spec F-005, research R8). Prompt deliverable 4.
import * as THREE from 'three';

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface BoardBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Height of the tallest things to keep in frame (buildings, props). */
  height: number;
}

export type CameraMode = 'overview' | 'follow' | 'free';

const FOV = 30;
const PITCH = THREE.MathUtils.degToRad(60);
const YAW = THREE.MathUtils.degToRad(-8);
const MIN_PITCH = THREE.MathUtils.degToRad(28);
const MAX_PITCH = THREE.MathUtils.degToRad(88);
/** Smoothing time constant (s): ~95% of a transition happens within 0.36 s (≤ 0.6 s, FR-043). */
const TAU = 0.12;

export class CameraController {
  readonly camera: THREE.PerspectiveCamera;
  mode: CameraMode = 'overview';
  private width = 1;
  private height = 1;
  private insets: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
  private bounds: BoardBounds = { minX: -1, maxX: 1, minZ: -1, maxZ: 1, height: 0 };
  private panBounds: BoardBounds | null = null;
  private readonly target = new THREE.Vector3();
  private readonly goalTarget = new THREE.Vector3();
  private distance = 20;
  private goalDistance = 20;
  private overviewTarget = new THREE.Vector3();
  private overviewDistance = 20;
  private readonly dir = new THREE.Vector3();
  private readonly ray = new THREE.Raycaster();
  private readonly ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly tmp = new THREE.Vector3();
  private readonly tmp2 = new THREE.Vector3();
  private readonly ndc = new THREE.Vector2();
  private readonly followGoal = new THREE.Vector3();
  /** Extra distance factor allowed beyond the overview framing. */
  maxZoomOut = 1.15;
  /** Orbit angles (two-finger twist and tilt); the overview uses the base angles. */
  private yaw: number;
  private pitch: number;
  private goalYaw: number;
  private goalPitch: number;

  constructor(
    private readonly basePitch = PITCH,
    private readonly baseYaw = YAW,
  ) {
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 400);
    this.yaw = this.goalYaw = baseYaw;
    this.pitch = this.goalPitch = basePitch;
    this.setDir(baseYaw, basePitch);
  }

  private setDir(yaw: number, pitch: number): void {
    this.dir.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).normalize();
  }

  /** How far the view is turned from its base heading (radians), e.g. for signs to face it. */
  get turn(): number {
    return this.yaw - this.baseYaw;
  }

  /** True when the player has turned or tilted the view away from the base angles. */
  get orbited(): boolean {
    return Math.abs(this.goalYaw - this.baseYaw) > 0.02 || Math.abs(this.goalPitch - this.basePitch) > 0.02;
  }

  /** Turn the view around the ground point under (x, y) (two-finger twist). */
  rotateAt(dAngle: number, xPx: number, yPx: number): void {
    const before = this.groundAt(xPx, yPx, this.tmp)?.clone();
    this.mode = 'free';
    this.goalYaw += dAngle;
    this.yaw = this.goalYaw;
    this.target.copy(this.goalTarget);
    this.distance = this.goalDistance;
    this.apply();
    const after = this.groundAt(xPx, yPx, this.tmp2);
    if (before && after) this.goalTarget.add(before.sub(after));
    this.clampGoals();
    this.target.copy(this.goalTarget);
    this.apply();
  }

  /** Tilt the view (two fingers sliding up or down together); positive looks flatter. */
  tilt(dPitch: number): void {
    this.mode = 'free';
    this.goalPitch = THREE.MathUtils.clamp(this.goalPitch - dPitch, MIN_PITCH, MAX_PITCH);
    this.pitch = this.goalPitch;
    this.apply();
  }

  /** Back to the base angles and the overview (the reset-view button, double tap). */
  resetView(): void {
    this.goalYaw = this.baseYaw + Math.round((this.yaw - this.baseYaw) / (Math.PI * 2)) * Math.PI * 2;
    this.goalPitch = this.basePitch;
    this.showOverview();
  }

  setViewport(width: number, height: number, insets: Insets): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.insets = insets;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.computeOverview();
    if (this.mode === 'overview') {
      this.goalTarget.copy(this.overviewTarget);
      this.goalDistance = this.overviewDistance;
    }
    this.clampGoals();
  }

  /** Bounds framed by the overview (and used for panning unless setPanBounds is called). */
  setBounds(bounds: BoardBounds): void {
    this.bounds = bounds;
    this.computeOverview();
  }

  /** Separate limits for panning (e.g. the whole meta map while one biome is framed). */
  setPanBounds(bounds: BoardBounds | null): void {
    this.panBounds = bounds;
  }

  /** Jump straight to the overview (no transition). */
  snapToOverview(): void {
    this.mode = 'overview';
    this.goalTarget.copy(this.overviewTarget);
    this.goalDistance = this.overviewDistance;
    this.target.copy(this.goalTarget);
    this.distance = this.goalDistance;
    this.yaw = this.goalYaw = this.baseYaw;
    this.pitch = this.goalPitch = this.basePitch;
    this.apply();
  }

  showOverview(): void {
    this.mode = 'overview';
    this.goalTarget.copy(this.overviewTarget);
    this.goalDistance = this.overviewDistance;
  }

  follow(): void {
    this.mode = 'follow';
    this.goalDistance = Math.max(this.minDistance() * 1.7, Math.min(this.overviewDistance * 0.45, this.minDistance() * 3));
  }

  /** World point the follow camera should look at (e.g. the middle of the train). */
  setFollowPoint(x: number, z: number): void {
    this.followGoal.set(x, 0, z);
  }

  get zoomRange(): [number, number] {
    return [this.minDistance(), this.overviewDistance * this.maxZoomOut];
  }

  /** Pan so the ground point under the finger follows it. */
  pan(dxPx: number, dyPx: number, xPx: number, yPx: number): void {
    const before = this.groundAt(xPx - dxPx, yPx - dyPx, this.tmp);
    const after = this.groundAt(xPx, yPx, this.tmp2);
    if (!before || !after) return;
    this.mode = 'free';
    this.goalTarget.add(before.sub(after));
    this.clampGoals();
    this.target.copy(this.goalTarget);
    this.apply();
  }

  /** Zoom by `scale` (> 1 = closer) keeping the ground point under (x, y) in place. */
  zoomAt(scale: number, xPx: number, yPx: number): void {
    const before = this.groundAt(xPx, yPx, this.tmp)?.clone();
    this.mode = 'free';
    const [lo, hi] = this.zoomRange;
    this.goalDistance = THREE.MathUtils.clamp(this.goalDistance / scale, lo, hi);
    this.distance = this.goalDistance;
    this.target.copy(this.goalTarget);
    this.apply();
    const after = this.groundAt(xPx, yPx, this.tmp2);
    if (before && after) this.goalTarget.add(before.sub(after));
    this.clampGoals();
    this.target.copy(this.goalTarget);
    this.apply();
  }

  update(dt: number): void {
    if (this.mode === 'follow') {
      this.goalTarget.copy(this.followGoal);
      this.clampGoals();
    }
    const k = 1 - Math.exp(-dt / TAU);
    this.target.lerp(this.goalTarget, k);
    this.distance += (this.goalDistance - this.distance) * k;
    this.yaw += (this.goalYaw - this.yaw) * k;
    this.pitch += (this.goalPitch - this.pitch) * k;
    this.apply();
  }

  /** Project a world point to CSS pixels (null when behind the camera). */
  project(x: number, y: number, z: number, out = { x: 0, y: 0 }): { x: number; y: number } | null {
    this.tmp.set(x, y, z).project(this.camera);
    if (this.tmp.z > 1) return null;
    out.x = (this.tmp.x * 0.5 + 0.5) * this.width;
    out.y = (-this.tmp.y * 0.5 + 0.5) * this.height;
    return out;
  }

  /** Ground-plane point under a CSS pixel position. */
  groundAt(xPx: number, yPx: number, out: THREE.Vector3): THREE.Vector3 | null {
    this.ndc.set((xPx / this.width) * 2 - 1, -(yPx / this.height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.camera);
    return this.ray.ray.intersectPlane(this.ground, out);
  }

  /** Pixels per world unit at the target (for scale-aware UI decisions). */
  pixelsPerUnit(): number {
    const h = 2 * this.distance * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    return this.height / h;
  }

  private minDistance(): number {
    // A wagon (0.5 units) fills about a third of the screen width (FR-039).
    const visibleWidth = 1.5;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    return Math.max(2.5, visibleWidth / (2 * tanHalf * this.camera.aspect));
  }

  private apply(): void {
    this.setDir(this.yaw, this.pitch);
    this.camera.position.copy(this.dir).multiplyScalar(this.distance).add(this.target);
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld();
  }

  private clampGoals(): void {
    const b = this.panBounds ?? this.bounds;
    this.goalTarget.x = THREE.MathUtils.clamp(this.goalTarget.x, b.minX, b.maxX);
    this.goalTarget.z = THREE.MathUtils.clamp(this.goalTarget.z, b.minZ, b.maxZ + 1.5);
    this.goalTarget.y = 0;
    const [lo, hi] = this.zoomRange;
    this.goalDistance = THREE.MathUtils.clamp(this.goalDistance, lo, hi);
  }

  /** Distance and target that fit the board inside the viewport minus the HUD insets. */
  private computeOverview(): void {
    const b = this.bounds;
    const corners: THREE.Vector3[] = [];
    for (const x of [b.minX, b.maxX]) for (const z of [b.minZ, b.maxZ]) for (const y of [0, b.height]) corners.push(new THREE.Vector3(x, y, z));
    const availW = Math.max(40, this.width - this.insets.left - this.insets.right);
    const availH = Math.max(40, this.height - this.insets.top - this.insets.bottom);
    const rectCx = this.insets.left + availW / 2;
    const rectCy = this.insets.top + availH / 2;
    const target = new THREE.Vector3((b.minX + b.maxX) / 2, 0, (b.minZ + b.maxZ) / 2);
    const saveT = this.target.clone();
    const saveD = this.distance;
    const saveYaw = this.yaw;
    const savePitch = this.pitch;
    this.yaw = this.baseYaw;
    this.pitch = this.basePitch;
    let distance = 20;
    const measure = (d: number) => {
      this.target.copy(target);
      this.distance = d;
      this.apply();
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const c of corners) {
        const p = this.project(c.x, c.y, c.z);
        if (!p) return { fits: false, cx: 0, cy: 0 };
        x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
      }
      return { fits: x1 - x0 <= availW && y1 - y0 <= availH, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
    };
    for (let iter = 0; iter < 3; iter++) {
      let lo = 2;
      let hi = 400;
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2;
        if (measure(mid).fits) hi = mid;
        else lo = mid;
      }
      distance = hi;
      const m = measure(distance);
      const from = this.groundAt(m.cx, m.cy, new THREE.Vector3());
      const to = this.groundAt(rectCx, rectCy, new THREE.Vector3());
      if (from && to) target.add(from.sub(to));
    }
    this.overviewTarget.copy(target);
    this.overviewDistance = distance;
    this.target.copy(saveT);
    this.distance = saveD;
    this.yaw = saveYaw;
    this.pitch = savePitch;
    this.apply();
  }
}
