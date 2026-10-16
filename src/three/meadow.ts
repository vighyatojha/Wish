// ─────────────────────────────────────────────────────────────
//  The meadow around the stump
//
//  • Ground: a gently rolling hillside that curves away behind the
//    stump and fades into the soft-focus valley, so there is no
//    edge and nothing floats.
//  • Grass: thousands of fine blades in clumps, drawn with one
//    custom shader: dark at the root, lighter at the tip, some dry
//    and yellowish, swaying in the wind, glowing when the sun is
//    behind them, darker in the stump's shadow, and fading into
//    the haze with distance.
//  • Small white wildflowers (like the ones in the valley photo)
//    and a few half-buried stones.
//  Everything is disposed of in dispose().
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { STUMP } from './stumpAssets';

function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

export const GROUND_Y = -STUMP.height / 2 - 0.02;
const FADE_NEAR = -2.4; // grass and ground start fading behind this z…
const FADE_FAR = -4.4;  // …and are gone here

// Height of the ground at (x, z): gentle bumps, flat around the stump,
// curving away behind it like the crest of a hill.
export function groundHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const flat = Math.min(1, Math.max(0, (r - 0.7) / 1.0));
  let h = (Math.sin(x * 0.9 + 0.3) * Math.cos(z * 0.7) * 0.05 + Math.sin(x * 2.1 - z * 1.3) * 0.025) * flat;
  // the hill falls away towards the valley along a wavy crest
  const crest = -1.25 + Math.sin(x * 0.8 + 0.5) * 0.35 + Math.sin(x * 1.9 + 2.0) * 0.18;
  if (z < crest) h -= (crest - z) * (crest - z) * 0.11;
  return GROUND_Y + h;
}

// ── Grass shader ─────────────────────────────────────────────
const GRASS_VERT = /* glsl */ `
  attribute vec3 aOffset;  // base of the blade on the ground
  attribute vec4 aShape;   // height, width, facing, lean
  attribute vec2 aTone;    // colour variation, dryness
  uniform float uTime;
  uniform float uWind;
  varying float vT;
  varying vec2 vTone;
  varying vec3 vWorld;
  varying vec3 vNormal;

  void main() {
    float t = position.y;                 // 0 root → 1 tip
    float h = aShape.x, w = aShape.y, yaw = aShape.z, lean = aShape.w;

    // wind: a slow swell plus a quicker flutter, stronger at the tip
    float gust = sin(uTime * 1.3 + aOffset.x * 0.9 + aOffset.z * 0.6) * 0.6
               + sin(uTime * 2.9 + aOffset.x * 3.1 - aOffset.z * 2.2) * 0.25;
    float bend = (lean + gust * 0.22 * uWind) * t * t;

    vec3 p = vec3(position.x * w * (1.0 - t * 0.88), t * h, 0.0);
    p.z += bend * h;
    p.y -= bend * bend * h * 0.35;

    float c = cos(yaw), s = sin(yaw);
    p = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
    vec3 world = aOffset + p;

    vT = t;
    vTone = aTone;
    vWorld = (modelMatrix * vec4(world, 1.0)).xyz;
    // mostly-up normals give grass its soft, rounded light
    vNormal = normalize(vec3(s, 1.4, c));
    gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
  }
`;

const GRASS_FRAG = /* glsl */ `
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uSkyColor;
  uniform vec3 uHaze;
  uniform vec2 uShadowC;   // centre of the stump's shadow on the ground
  uniform float uShadowR;
  uniform vec2 uFade;      // z where fading starts / ends
  varying float vT;
  varying vec2 vTone;
  varying vec3 vWorld;
  varying vec3 vNormal;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  void main() {
    // fade into the distance with a fine dither (no sorting problems)
    float fade = 1.0 - smoothstep(uFade.x, uFade.y, -vWorld.z + (vTone.x - 0.5) * 0.9);
    if (fade < hash(gl_FragCoord.xy)) discard;

    // colour: deep root, fresh green body, some dry straw-coloured tips
    vec3 root = mix(vec3(0.012, 0.022, 0.006), vec3(0.03, 0.045, 0.012), vTone.x);
    vec3 green = mix(vec3(0.07, 0.13, 0.025), vec3(0.16, 0.24, 0.05), vTone.x);
    vec3 dry = vec3(0.24, 0.21, 0.08);
    vec3 tip = mix(green, dry, vTone.y);
    vec3 albedo = mix(root, tip, smoothstep(0.0, 0.85, vT));

    vec3 n = normalize(gl_FrontFacing ? vNormal : vec3(-vNormal.x, vNormal.y, -vNormal.z));
    float wrap = clamp(dot(n, uSunDir) * 0.5 + 0.5, 0.0, 1.0);
    float ao = mix(0.25, 1.0, vT);                       // the bottom of the sward is dark

    // the stump's shadow and the darker ground right around its base
    float shade = 1.0 - (1.0 - smoothstep(uShadowR * 0.75, uShadowR * 1.35, distance(vWorld.xz, uShadowC))) * 0.6;
    shade *= mix(0.55, 1.0, smoothstep(0.7, 1.25, length(vWorld.xz)));

    // sunlight shining through the blades when the sun is behind them
    vec3 viewDir = normalize(cameraPosition - vWorld);
    float through = pow(clamp(dot(-viewDir, uSunDir), 0.0, 1.0), 3.0) * smoothstep(0.2, 1.0, vT);

    vec3 col = albedo * (uSkyColor * 0.9 * ao + uSunColor * wrap * 1.1 * ao * shade)
             + albedo * uSunColor * through * 1.3 * shade;

    // distance haze, matching the soft-focus valley behind
    float haze = smoothstep(0.4, uFade.y, -vWorld.z) * 0.7;
    col = mix(col, uHaze, haze);

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function bladeGeometry(segments = 4): THREE.InstancedBufferGeometry {
  // a strip of quads tapering to a single tip vertex; x = side (-0.5/0.5), y = t (0..1)
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    pos.push(-0.5, t, 0, 0.5, t, 0);
  }
  pos.push(0, 1, 0);
  for (let i = 0; i < segments - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const last = (segments - 1) * 2;
  idx.push(last, last + 1, segments * 2);
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

// ── Textures ─────────────────────────────────────────────────
function groundTextures() {
  const S = 256;
  const rand = rng(77);
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  g.fillStyle = '#3c5220';
  g.fillRect(0, 0, S, S);
  // a mat of tiny strokes: old grass, soil showing through, a little moss
  for (let i = 0; i < 9000; i++) {
    const x = rand() * S, y = rand() * S;
    const len = 2 + rand() * 7;
    const a = -Math.PI / 2 + (rand() - 0.5) * 1.6;
    const tone = rand();
    g.strokeStyle = tone < 0.12
      ? `rgba(${70 + rand() * 30},${55 + rand() * 20},${30 + rand() * 15},0.8)`   // soil
      : tone < 0.25
        ? `rgba(${110 + rand() * 40},${100 + rand() * 30},${50 + rand() * 20},0.55)` // dry straw
        : `rgba(${40 + rand() * 40},${70 + rand() * 50},${18 + rand() * 20},0.7)`;  // green
    g.lineWidth = 0.6 + rand() * 0.9;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      g.beginPath();
      g.moveTo(x + ox, y + oy);
      g.lineTo(x + ox + Math.cos(a) * len, y + oy + Math.sin(a) * len);
      g.stroke();
    }
  }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(9, 6);
  map.anisotropy = 4;

  // alpha: solid in front, softly gone towards the valley and at the sides
  const a = document.createElement('canvas');
  a.width = a.height = 128;
  const ag = a.getContext('2d')!;
  const img = ag.createImageData(128, 128);
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const u = x / 127, v = 1 - y / 127; // v = 1 is the far edge
      const wob = (Math.sin(u * 23) + Math.sin(u * 51 + 1.3)) * 0.015;
      const far = 1 - smoothstep(0.62 + wob, 0.86 + wob, v);
      const side = smoothstep(0.0, 0.08, u) * smoothstep(1.0, 0.92, u);
      const k = (y * 128 + x) * 4;
      img.data[k] = img.data[k + 1] = img.data[k + 2] = Math.round(far * side * 255);
      img.data[k + 3] = 255;
    }
  }
  ag.putImageData(img, 0, 0);
  const alpha = new THREE.CanvasTexture(a);
  return { map, alpha };
}

function flowerTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.translate(32, 32);
  for (let i = 0; i < 5; i++) {
    g.rotate((Math.PI * 2) / 5);
    const grad = g.createRadialGradient(0, -12, 1, 0, -12, 12);
    grad.addColorStop(0, 'rgba(255,255,250,1)');
    grad.addColorStop(1, 'rgba(232,236,226,0.9)');
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(0, -12, 7, 12, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#e9c13a';
  g.beginPath();
  g.arc(0, 0, 5.5, 0, Math.PI * 2);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// ── Building it ──────────────────────────────────────────────
export interface Meadow {
  group: THREE.Group;
  update(f: { time: number; sunDir: THREE.Vector3; sunColor: THREE.Color; skyColor: THREE.Color; haze: THREE.Color }): void;
  dispose(): void;
}

export function createMeadow(aspect: number): Meadow {
  const rand = rng(2024);
  const group = new THREE.Group();
  const wide = aspect > 1;
  const halfX = wide ? 5.6 : 2.4;
  const zNear = wide ? 2.2 : 2.9;
  const disposables: { dispose(): void }[] = [];

  // ground
  const tex = groundTextures();
  const groundGeo = new THREE.PlaneGeometry(halfX * 2 + 2, 9, 90, 60);
  groundGeo.rotateX(-Math.PI / 2);
  groundGeo.translate(0, 0, -1.4);
  const gp = groundGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < gp.count; i++) gp.setY(i, groundHeight(gp.getX(i), gp.getZ(i)));
  groundGeo.computeVertexNormals();
  const groundMat = new THREE.MeshStandardMaterial({
    map: tex.map, alphaMap: tex.alpha, transparent: true, depthWrite: false, roughness: 1, metalness: 0,
    color: new THREE.Color('#c4d3a4'),
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.receiveShadow = true;
  ground.renderOrder = 2;
  group.add(ground);
  disposables.push(groundGeo, groundMat, tex.map, tex.alpha);

  // grass: clumps plus scattered single blades
  const count = wide ? 28000 : 15000;
  const blade = bladeGeometry(4);
  const offsets = new Float32Array(count * 3);
  const shapes = new Float32Array(count * 4);
  const tones = new Float32Array(count * 2);
  const place = (i: number, x: number, z: number, clumpTone: number, clumpDry: number) => {
    const y = groundHeight(x, z);
    offsets.set([x, y - 0.01, z], i * 3);
    const near = Math.hypot(x, z) < 1.6 ? 1 : 0.85;
    shapes.set([
      (0.09 + rand() * 0.17) * near,      // height
      0.01 + rand() * 0.012,              // width at the root
      rand() * Math.PI * 2,               // facing
      (rand() - 0.3) * 0.9,               // lean
    ], i * 4);
    tones.set([Math.min(1, Math.max(0, clumpTone + (rand() - 0.5) * 0.4)), rand() < clumpDry ? 0.5 + rand() * 0.5 : rand() * 0.15], i * 2);
  };
  let i = 0;
  const inside = (x: number, z: number) => Math.hypot(x, z) < STUMP.radius * 1.02;
  while (i < count * 0.65) {
    const cx = (rand() * 2 - 1) * halfX, cz = zNear - rand() * (zNear - FADE_FAR);
    const n = 10 + Math.floor(rand() * 22);
    const tone = rand(), dry = rand() < 0.2 ? 0.35 : 0.05;
    for (let k = 0; k < n && i < count * 0.65; k++) {
      const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * 0.09;
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      if (inside(x, z)) continue;
      place(i++, x, z, tone, dry);
    }
  }
  while (i < count) {
    const x = (rand() * 2 - 1) * halfX, z = zNear - rand() * (zNear - FADE_FAR);
    if (inside(x, z)) continue;
    place(i++, x, z, rand(), 0.12);
  }
  blade.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));
  blade.setAttribute('aShape', new THREE.InstancedBufferAttribute(shapes, 4));
  blade.setAttribute('aTone', new THREE.InstancedBufferAttribute(tones, 2));
  blade.instanceCount = count;

  const grassUniforms = {
    uTime: { value: 0 },
    uWind: { value: 1 },
    uSunDir: { value: new THREE.Vector3(0, 1, -1).normalize() },
    uSunColor: { value: new THREE.Color('#fff4e2') },
    uSkyColor: { value: new THREE.Color('#9fb8d8') },
    uHaze: { value: new THREE.Color('#6f8a62') },
    uShadowC: { value: new THREE.Vector2(0, 0.5) },
    uShadowR: { value: STUMP.radius * 1.2 },
    uFade: { value: new THREE.Vector2(-FADE_NEAR, -FADE_FAR) },
  };
  const grassMat = new THREE.ShaderMaterial({ vertexShader: GRASS_VERT, fragmentShader: GRASS_FRAG, uniforms: grassUniforms, side: THREE.DoubleSide });
  const grass = new THREE.Mesh(blade, grassMat);
  grass.frustumCulled = false;
  group.add(grass);
  disposables.push(blade, grassMat);

  // wildflowers: small white daisies scattered in loose drifts
  const fCount = wide ? 340 : 170;
  const fPos = new Float32Array(fCount * 3);
  for (let f = 0; f < fCount; f++) {
    let x = 0, z = 0;
    do {
      x = (rand() * 2 - 1) * halfX;
      z = zNear - 0.2 - rand() * (zNear - FADE_NEAR + 0.6);
    } while (inside(x, z) || Math.hypot(x, z) < STUMP.radius * 1.3);
    fPos.set([x, groundHeight(x, z) + 0.1 + rand() * 0.12, z], f * 3);
  }
  const fGeo = new THREE.BufferGeometry();
  fGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3));
  const fTex = flowerTexture();
  const fMat = new THREE.PointsMaterial({ map: fTex, size: 0.085, sizeAttenuation: true, alphaTest: 0.45, color: new THREE.Color('#ffffff') });
  group.add(new THREE.Points(fGeo, fMat));
  disposables.push(fGeo, fMat, fTex);

  // stones, half sunk into the ground
  // smooth (merged) vertices so the stones are rounded, not faceted
  const ico = new THREE.IcosahedronGeometry(1, 4);
  ico.deleteAttribute('normal');
  ico.deleteAttribute('uv');
  const stoneGeo = mergeVertices(ico);
  ico.dispose();
  const sp = stoneGeo.attributes.position as THREE.BufferAttribute;
  const colors: number[] = [];
  const v = new THREE.Vector3();
  for (let k = 0; k < sp.count; k++) {
    v.fromBufferAttribute(sp, k);
    const n = Math.sin(v.x * 3.1 + v.y * 1.7) * 0.08 + Math.sin(v.y * 5.3 - v.z * 4.1) * 0.05 + Math.sin(v.z * 9 + v.x * 7) * 0.025;
    v.multiplyScalar(1 + n);
    sp.setXYZ(k, v.x, v.y, v.z);
    const lichen = Math.max(0, Math.sin(v.x * 7 + v.z * 5) * Math.sin(v.y * 6)) * 0.5;
    const grey = 0.42 + n * 1.5;
    colors.push(grey + lichen * 0.15, grey + lichen * 0.12, grey * 0.92 - lichen * 0.05);
  }
  stoneGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  stoneGeo.computeVertexNormals();
  const stoneMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#9a9488'), vertexColors: true, roughness: 0.93, metalness: 0 });
  const stones: [number, number, number, number][] = wide
    ? [[1.2, 0.55, 0.16, 0.4], [-1.45, 0.9, 0.12, 1.3], [2.6, -0.4, 0.2, 2.2], [-2.9, 1.4, 0.14, 0.8], [0.9, -1.4, 0.1, 1.9]]
    : [[0.95, 0.75, 0.13, 0.4], [-1.05, 1.25, 0.1, 1.3], [0.5, -1.35, 0.09, 1.9]];
  for (const [x, z, r, rot] of stones) {
    const m = new THREE.Mesh(stoneGeo, stoneMat);
    m.scale.set(r * 1.3, r * 0.75, r);
    m.rotation.y = rot;
    m.position.set(x, groundHeight(x, z) + r * 0.15, z);
    m.castShadow = m.receiveShadow = true;
    group.add(m);
  }
  disposables.push(stoneGeo, stoneMat);

  return {
    group,
    update({ time, sunDir, sunColor, skyColor, haze }) {
      grassUniforms.uTime.value = time;
      grassUniforms.uSunDir.value.copy(sunDir);
      grassUniforms.uSunColor.value.copy(sunColor);
      grassUniforms.uSkyColor.value.copy(skyColor);
      grassUniforms.uHaze.value.copy(haze);
      // the stump's shadow falls away from the sun
      const len = (STUMP.height * 0.9) / Math.max(0.25, sunDir.y);
      const flat = Math.hypot(sunDir.x, sunDir.z) || 1;
      grassUniforms.uShadowC.value.set((-sunDir.x / flat) * len * 0.55, (-sunDir.z / flat) * len * 0.55);
      grassUniforms.uShadowR.value = STUMP.radius * (1.05 + Math.min(1.2, len * 0.25));
      fMat.color.copy(sunColor).lerp(new THREE.Color('#ffffff'), 0.5);
    },
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
}
