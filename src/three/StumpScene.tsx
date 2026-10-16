// ─────────────────────────────────────────────────────────────
//  The tree stump in its meadow (Three.js via React Three Fiber)
//
//  • A transparent canvas over the valley: the meadow fades into
//    the soft-focus picture behind it.
//  • The camera sweeps down a curved path (a Catmull-Rom spline)
//    as she scrolls, so the stump rises into the foreground.
//  • Light comes from wherever the sun is in the sky, so as it
//    moves the shadows turn and the backlit grass glows.
//  • Every geometry and texture is disposed of when it unmounts.
//  • It reports where the stump's top is on screen, so the map can
//    sit exactly on it.
// ─────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { createStumpAssets, disposeStumpAssets, STUMP } from './stumpAssets';
import { createMeadow, GROUND_Y } from './meadow';

export interface StumpState {
  arrive: number; // 0 → 1 camera sweep down to the stump
  day: number;    // 1 late morning · 2 afternoon · 3 golden hour
  sunX: number;   // where the sun is on screen (0–1)
  sunY: number;
  // written back every frame, in CSS pixels:
  topX: number;
  topY: number;
  topWidth: number;
}

const FOV = 30;
const TILT = THREE.MathUtils.degToRad(15); // looking slightly down onto the sawn top

// Light colours, blended by time of day.
const MORNING = { sun: new THREE.Color('#fff3df'), sunI: 3.0, sky: new THREE.Color('#c3d6ea'), ground: new THREE.Color('#5d6e3a'), hemiI: 1.45, haze: new THREE.Color('#7f9878') };
const GOLDEN = { sun: new THREE.Color('#ffad5f'), sunI: 2.6, sky: new THREE.Color('#e9c29b'), ground: new THREE.Color('#4a3e26'), hemiI: 1.0, haze: new THREE.Color('#a39070') };

function Scene({ state }: { state: StumpState }) {
  const { camera, size, gl } = useThree();
  const stumpAssets = useMemo(createStumpAssets, []);
  const meadow = useMemo(() => createMeadow(size.width / size.height), []); // eslint-disable-line react-hooks/exhaustive-deps
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);

  const mats = useMemo(() => ({
    bark: new THREE.MeshStandardMaterial({ map: stumpAssets.barkMap, bumpMap: stumpAssets.barkBump, bumpScale: 3.2, roughness: 0.96, metalness: 0 }),
    top: new THREE.MeshStandardMaterial({ map: stumpAssets.ringMap, bumpMap: stumpAssets.ringBump, bumpScale: 1.4, roughness: 0.88, metalness: 0 }),
    contact: new THREE.MeshBasicMaterial({ map: stumpAssets.shadowMap, transparent: true, depthWrite: false, opacity: 0.45 }),
  }), [stumpAssets]);

  // soft shadows from the sun
  useEffect(() => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    const light = sun.current!;
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.camera.left = -3;
    light.shadow.camera.right = 3;
    light.shadow.camera.top = 3;
    light.shadow.camera.bottom = -3;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 20;
    light.shadow.radius = 4;
    light.shadow.bias = -0.0005;
    light.shadow.normalBias = 0.02;
  }, [gl]);

  // free GPU memory when the scene goes away
  useEffect(
    () => () => {
      disposeStumpAssets(stumpAssets);
      Object.values(mats).forEach((m) => m.dispose());
      meadow.dispose();
      sun.current?.shadow.map?.dispose();
    },
    [stumpAssets, mats, meadow],
  );

  const tmp = useMemo(() => ({
    v: new THREE.Vector3(), edge: new THREE.Vector3(), look: new THREE.Vector3(), dir: new THREE.Vector3(),
    sunC: new THREE.Color(), sky: new THREE.Color(), haze: new THREE.Color(),
  }), []);

  useFrame((frame) => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / size.height;

    // distance so the stump fills ~60% of a phone's width, ~28% of a laptop's
    const hTan = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * aspect;
    const share = THREE.MathUtils.clamp(0.62 - (aspect - 0.45) * 0.26, 0.26, 0.62);
    const dist = (STUMP.radius * 2.2) / (share * 2 * hTan);

    // aim so the stump's top sits ~72% down the screen
    const vTan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const lookY = STUMP.height / 2 + (0.72 - 0.5) * 2 * dist * vTan;
    const final = new THREE.Vector3(0, lookY + Math.sin(TILT) * dist, Math.cos(TILT) * dist);

    // a curved sweep: from high and further back, gliding down to the final view
    const t = THREE.MathUtils.clamp(state.arrive, 0, 1);
    const path = new THREE.CatmullRomCurve3([
      final.clone().add(new THREE.Vector3(0.6, dist * 0.55, dist * 0.7)),
      final.clone().add(new THREE.Vector3(0.25, dist * 0.18, dist * 0.25)),
      final,
    ]);
    cam.position.copy(path.getPoint(t));
    tmp.look.set(0, lookY + (1 - t) * dist * 0.5, 0);
    cam.fov = FOV;
    cam.near = 0.1;
    cam.far = 60;
    cam.updateProjectionMatrix();
    cam.lookAt(tmp.look);

    // the sun: from its place on screen to a direction in the world.
    // It is in front of us in the sky, so the scene is lit from behind.
    const g = THREE.MathUtils.clamp((state.day - 1) / 2, 0, 1);
    const elevation = THREE.MathUtils.lerp(1.5, 0.28, THREE.MathUtils.clamp(state.sunY / 0.3, 0, 1) * 0.5 + g * 0.5);
    tmp.dir.set((state.sunX - 0.5) * 2.4, elevation, -0.45).normalize();
    tmp.sunC.copy(MORNING.sun).lerp(GOLDEN.sun, g);
    tmp.sky.copy(MORNING.sky).lerp(GOLDEN.sky, g);
    tmp.haze.copy(MORNING.haze).lerp(GOLDEN.haze, g);
    if (sun.current && hemi.current) {
      sun.current.position.copy(tmp.dir).multiplyScalar(8);
      sun.current.color.copy(tmp.sunC);
      sun.current.intensity = THREE.MathUtils.lerp(MORNING.sunI, GOLDEN.sunI, g);
      hemi.current.color.copy(tmp.sky);
      hemi.current.groundColor.copy(MORNING.ground).lerp(GOLDEN.ground, g);
      hemi.current.intensity = THREE.MathUtils.lerp(MORNING.hemiI, GOLDEN.hemiI, g);
    }
    meadow.update({ time: frame.clock.elapsedTime, sunDir: tmp.dir, sunColor: tmp.sunC, skyColor: tmp.sky, haze: tmp.haze });

    // report where the top of the stump is on screen
    tmp.v.set(0, STUMP.height / 2, 0).project(cam);
    tmp.edge.set(STUMP.radius, STUMP.height / 2, 0).project(cam);
    state.topX = (tmp.v.x * 0.5 + 0.5) * size.width;
    state.topY = (-tmp.v.y * 0.5 + 0.5) * size.height;
    state.topWidth = Math.abs(tmp.edge.x - tmp.v.x) * size.width;
  });

  return (
    <>
      <hemisphereLight ref={hemi} />
      <directionalLight ref={sun} />
      <mesh geometry={stumpAssets.side} material={mats.bark} castShadow receiveShadow />
      <mesh geometry={stumpAssets.top} material={mats.top} castShadow receiveShadow />
      <mesh material={mats.contact} rotation-x={-Math.PI / 2} position={[0.05, GROUND_Y + 0.012, 0.05]} renderOrder={3}>
        <planeGeometry args={[STUMP.radius * 3.6, STUMP.radius * 2.8]} />
      </mesh>
      <primitive object={meadow.group} />
    </>
  );
}

// running = false: draw once (to build everything and compile the shaders
// while it's hidden), then wait. true: draw every frame.
export default function StumpScene({ state, running }: { state: StumpState; running: boolean }) {
  return (
    <Canvas
      frameloop={running ? 'always' : 'demand'}
      className="layer"
      style={{ pointerEvents: 'none' }}
      dpr={[1, 1.75]}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: FOV, near: 0.1, far: 60, position: [0, 2, 8] }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <Scene state={state} />
    </Canvas>
  );
}
