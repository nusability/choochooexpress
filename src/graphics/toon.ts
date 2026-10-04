// Comic look (spec FR-115, research R41): cel-shaded materials with a few hard light bands, and
// ink outlines drawn as an inverted hull — the mesh again, its back faces pushed out along smoothed
// normals by a constant number of screen pixels. Saturated colors are kept as they are.
import * as THREE from 'three';

/** Shared by every outline: screen size in CSS pixels and the line width. */
export const outlineUniforms = {
  uResolution: { value: new THREE.Vector2(1, 1) },
  uThickness: { value: 1.7 },
  uInk: { value: new THREE.Color('#2a1d14') },
};

let gradient: THREE.DataTexture | null = null;

/** Light bands for the toon ramp: shadow, mid, lit, highlight. */
function gradientMap(): THREE.DataTexture {
  if (gradient) return gradient;
  const steps = [150, 200, 238, 255];
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((v, i) => data.set([v, v, v, 255], i * 4));
  gradient = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  gradient.minFilter = THREE.NearestFilter;
  gradient.magFilter = THREE.NearestFilter;
  gradient.generateMipmaps = false;
  gradient.needsUpdate = true;
  return gradient;
}

export interface ToonOptions {
  color?: THREE.ColorRepresentation;
  vertexColors?: boolean;
  map?: THREE.Texture | null;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  side?: THREE.Side;
}

export function toonMaterial(o: ToonOptions = {}): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({
    color: o.color ?? '#ffffff',
    vertexColors: o.vertexColors ?? false,
    map: o.map ?? null,
    gradientMap: gradientMap(),
    emissive: o.emissive ?? '#000000',
    emissiveIntensity: o.emissiveIntensity ?? 1,
    transparent: o.transparent ?? false,
    opacity: o.opacity ?? 1,
    side: o.side ?? THREE.FrontSide,
  });
}

const VERT = /* glsl */ `
  #include <common>
  attribute vec3 outlineNormal;
  uniform vec2 uResolution;
  uniform float uThickness;
  void main() {
    vec4 local = vec4(position, 1.0);
    vec3 n = outlineNormal;
    #ifdef USE_INSTANCING
      local = instanceMatrix * local;
      n = mat3(instanceMatrix) * n;
    #endif
    vec4 view = modelViewMatrix * local;
    vec4 clip = projectionMatrix * view;
    vec3 vn = normalize(mat3(modelViewMatrix) * n);
    vec2 dir = (projectionMatrix * vec4(vn, 0.0)).xy;
    float len = length(dir);
    if (len > 1e-5) clip.xy += dir / len * uThickness * 2.0 / uResolution * clip.w;
    gl_Position = clip;
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uInk;
  void main() {
    gl_FragColor = vec4(uInk, 1.0);
    #include <colorspace_fragment>
  }
`;

let outlineMat: THREE.ShaderMaterial | null = null;

/** The one ink material every outline shares. */
export function outlineMaterial(): THREE.ShaderMaterial {
  if (outlineMat) return outlineMat;
  outlineMat = new THREE.ShaderMaterial({ uniforms: outlineUniforms, vertexShader: VERT, fragmentShader: FRAG, side: THREE.BackSide });
  return outlineMat;
}

/**
 * Adds `outlineNormal`: the normal averaged over every vertex at the same position, so the hull
 * stays closed around hard edges (boxes would otherwise crack open at their corners).
 */
export function prepareOutline(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  if (geo.getAttribute('outlineNormal')) return geo;
  const pos = geo.getAttribute('position');
  let nrm = geo.getAttribute('normal');
  if (!nrm) {
    geo.computeVertexNormals();
    nrm = geo.getAttribute('normal');
  }
  const key = (i: number) => `${Math.round(pos.getX(i) * 2000)},${Math.round(pos.getY(i) * 2000)},${Math.round(pos.getZ(i) * 2000)}`;
  const sums = new Map<string, THREE.Vector3>();
  const keys: string[] = [];
  for (let i = 0; i < pos.count; i++) {
    const k = key(i);
    keys.push(k);
    const s = sums.get(k) ?? new THREE.Vector3();
    s.x += nrm.getX(i);
    s.y += nrm.getY(i);
    s.z += nrm.getZ(i);
    sums.set(k, s);
  }
  const out = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const s = (sums.get(keys[i] as string) as THREE.Vector3).clone();
    if (s.lengthSq() < 1e-8) s.set(nrm.getX(i), nrm.getY(i), nrm.getZ(i));
    s.normalize();
    out[i * 3] = s.x;
    out[i * 3 + 1] = s.y;
    out[i * 3 + 2] = s.z;
  }
  geo.setAttribute('outlineNormal', new THREE.BufferAttribute(out, 3));
  return geo;
}

/**
 * An ink outline for `mesh`, added as its child so it follows it. Instanced meshes get an
 * instanced outline sharing their instance matrices; call `syncOutline` after changing `count`.
 */
export function addOutline<T extends THREE.Mesh>(mesh: T): THREE.Mesh {
  prepareOutline(mesh.geometry);
  let outline: THREE.Mesh;
  if (mesh instanceof THREE.InstancedMesh) {
    const inst = new THREE.InstancedMesh(mesh.geometry, outlineMaterial(), mesh.instanceMatrix.count);
    inst.instanceMatrix = mesh.instanceMatrix;
    inst.count = mesh.count;
    inst.frustumCulled = false;
    outline = inst;
  } else {
    outline = new THREE.Mesh(mesh.geometry, outlineMaterial());
  }
  outline.name = 'outline';
  outline.castShadow = false;
  outline.receiveShadow = false;
  outline.renderOrder = -1;
  outline.raycast = () => {};
  mesh.add(outline);
  return outline;
}

/** Keeps an instanced mesh's outline in step with its visible count. */
export function syncOutline(mesh: THREE.InstancedMesh): void {
  const outline = mesh.children.find((c) => c.name === 'outline') as THREE.InstancedMesh | undefined;
  if (!outline) return;
  outline.count = mesh.count;
  outline.visible = mesh.visible && mesh.count > 0;
}
