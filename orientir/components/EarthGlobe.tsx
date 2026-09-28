'use client';

// Photoreal 3D Earth with day/night terminator and university markers.
// - Rotates by itself; the user can rotate it ONLY while pressing and dragging.
// - Size/position are computed from the container so the globe (with its
//   atmosphere) never leaves the visible area.
// - Textures live in /public/textures/.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export type University = { name: string; lat: number; lon: number; label?: boolean };

export const UNIVERSITIES: University[] = [
  { name: 'Harvard', lat: 42.377, lon: -71.117, label: true },
  { name: 'MIT', lat: 42.36, lon: -71.094 },
  { name: 'Yale', lat: 41.316, lon: -72.922 },
  { name: 'Princeton', lat: 40.343, lon: -74.651 },
  { name: 'Stanford', lat: 37.427, lon: -122.17, label: true },
  { name: 'UC Berkeley', lat: 37.872, lon: -122.259 },
  { name: 'Caltech', lat: 34.138, lon: -118.125 },
  { name: 'U of Toronto', lat: 43.663, lon: -79.396, label: true },
  { name: 'Oxford', lat: 51.755, lon: -1.254, label: true },
  { name: 'Cambridge', lat: 52.204, lon: 0.115 },
  { name: 'Imperial College', lat: 51.499, lon: -0.175 },
  { name: 'Sorbonne', lat: 48.846, lon: 2.344 },
  { name: 'ETH Zürich', lat: 47.376, lon: 8.548, label: true },
  { name: 'Tsinghua', lat: 40.0, lon: 116.326, label: true },
  { name: 'Seoul National', lat: 37.46, lon: 126.952 },
  { name: 'U of Tokyo', lat: 35.713, lon: 139.762, label: true },
  { name: 'NUS Singapore', lat: 1.297, lon: 103.776, label: true },
  { name: 'U of Melbourne', lat: -37.796, lon: 144.961, label: true },
];

type Props = {
  universities?: University[];
  className?: string;
};

const R = 1.0;
const ATMO = 1.045;
const FOV = 30;

function latLon(lat: number, lon: number, r: number) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

const EARTH_VERT = `
varying vec2 vUv; varying vec3 vN; varying vec3 vPos;
void main(){
  vUv = uv;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const EARTH_FRAG = `
uniform sampler2D dayMap, nightMap, normMap, specMap; uniform vec3 sunDir;
varying vec2 vUv; varying vec3 vN; varying vec3 vPos;
vec3 toLin(vec3 c){ return pow(c, vec3(2.2)); }
vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
void main(){
  vec3 N = normalize(vN); vec3 S = normalize(sunDir); vec3 V = normalize(cameraPosition - vPos);
  vec3 T = normalize(cross(vec3(0.0,1.0,0.0), N)); vec3 B = normalize(cross(N, T));
  vec3 tn = texture2D(normMap, vUv).xyz * 2.0 - 1.0;
  vec3 Np = normalize(T*tn.x*0.45 + B*tn.y*0.45 + N*tn.z);
  float c = dot(N, S);
  float dayF = smoothstep(-0.06, 0.18, c);
  float diff = max(dot(Np, S), 0.0);
  vec3 albedo = toLin(texture2D(dayMap, vUv).rgb);
  vec3 day = albedo * diff * 2.3;
  float ocean = texture2D(specMap, vUv).r;
  vec3 H = normalize(S + V);
  day += vec3(1.0,0.97,0.92) * pow(max(dot(Np,H),0.0), 90.0) * ocean * 0.9 * dayF;
  float limb = pow(1.0 - max(dot(N,V),0.0), 2.5);
  day = mix(day, vec3(0.20,0.36,0.62) * (diff + 0.08), limb * 0.55 * dayF);
  vec3 lights = toLin(texture2D(nightMap, vUv).rgb) * vec3(1.0,0.78,0.48) * 1.6;
  float nightF = 1.0 - smoothstep(-0.25, 0.05, c);
  vec3 col = day*dayF + lights*nightF + albedo*0.006;
  col = aces(col * 1.05);
  gl_FragColor = vec4(pow(col, vec3(1.0/2.2)), 1.0);
}`;

const ATMO_VERT = `
varying vec3 vN; varying vec3 vPos;
void main(){
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const ATMO_FRAG = `
uniform vec3 sunDir; uniform float limbMu; varying vec3 vN; varying vec3 vPos;
void main(){
  vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vPos);
  float mu = max(dot(N, V), 0.0);
  float outer = smoothstep(0.0, limbMu, mu);
  float inner = 1.0 - smoothstep(limbMu, limbMu + 0.28, mu);
  float lit = clamp(dot(N, normalize(sunDir))*0.9 + 0.25, 0.0, 1.0);
  gl_FragColor = vec4(vec3(0.32,0.56,1.0) * outer*inner*lit * 0.85, 1.0);
}`;

export default function EarthGlobe({ universities = UNIVERSITIES, className }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current!;
    const canvas = canvasRef.current!;
    const labelsLayer = labelsRef.current!;
    const tip = tipRef.current!;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);

    const globe = new THREE.Group();
    const drag = new THREE.Group();
    const tilt = new THREE.Group();
    const spin = new THREE.Group();
    tilt.rotation.z = 0.36;
    spin.rotation.y = -1.2;
    scene.add(globe);
    globe.add(drag);
    drag.add(tilt);
    tilt.add(spin);

    const loader = new THREE.TextureLoader();
    const maxA = renderer.capabilities.getMaxAnisotropy();
    const load = (url: string) => {
      const t = loader.load(url);
      t.anisotropy = maxA;
      return t;
    };
    const textures = [
      load('/textures/earth_day.jpg'),
      load('/textures/earth_night.jpg'),
      load('/textures/earth_normal.jpg'),
      load('/textures/earth_specular.jpg'),
    ];

    const sunDir = new THREE.Vector3(0.85, 0.25, 0.45).normalize();

    const earthGeo = new THREE.SphereGeometry(R, 160, 160);
    const earthMat = new THREE.ShaderMaterial({
      uniforms: {
        dayMap: { value: textures[0] },
        nightMap: { value: textures[1] },
        normMap: { value: textures[2] },
        specMap: { value: textures[3] },
        sunDir: { value: sunDir },
      },
      vertexShader: EARTH_VERT,
      fragmentShader: EARTH_FRAG,
    });
    spin.add(new THREE.Mesh(earthGeo, earthMat));

    const atmoGeo = new THREE.SphereGeometry(ATMO, 128, 128);
    const atmoMat = new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: { sunDir: { value: sunDir }, limbMu: { value: Math.sqrt(1 - (R / ATMO) ** 2) } },
      vertexShader: ATMO_VERT,
      fragmentShader: ATMO_FRAG,
    });
    globe.add(new THREE.Mesh(atmoGeo, atmoMat));

    // ---- university markers ----
    const disposables: { dispose: () => void }[] = [earthGeo, earthMat, atmoGeo, atmoMat, ...textures];
    const dotGeo = new THREE.CircleGeometry(0.011, 20);
    const ringGeo = new THREE.RingGeometry(0.018, 0.022, 40);
    const hitGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    disposables.push(dotGeo, ringGeo, hitGeo, dotMat, ringMat, hitMat);

    const pickables: THREE.Object3D[] = [];
    const labeled: { anchor: THREE.Object3D; el: HTMLDivElement }[] = [];
    const Z = new THREE.Vector3(0, 0, 1);

    universities.forEach((u) => {
      const v = latLon(u.lat, u.lon, R * 1.002);
      const q = new THREE.Quaternion().setFromUnitVectors(Z, v.clone().normalize());
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.copy(v);
      dot.quaternion.copy(q);
      spin.add(dot);
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(v.clone().multiplyScalar(1.0005));
      ring.quaternion.copy(q);
      spin.add(ring);
      const hit = new THREE.Mesh(hitGeo, hitMat);
      hit.position.copy(v);
      hit.userData.name = u.name;
      spin.add(hit);
      pickables.push(hit);

      if (u.label) {
        const el = document.createElement('div');
        el.textContent = u.name;
        el.style.cssText =
          'position:absolute;left:0;top:0;pointer-events:none;white-space:nowrap;' +
          'font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.85);' +
          'padding-left:14px;transform:translate(0,-50%);transition:opacity .25s;opacity:0;' +
          'text-shadow:0 1px 6px rgba(0,0,0,.9);';
        const tick = document.createElement('span');
        tick.style.cssText =
          'position:absolute;left:2px;top:50%;width:9px;height:1px;background:rgba(255,255,255,.6);';
        el.appendChild(tick);
        labelsLayer.appendChild(el);
        labeled.push({ anchor: dot, el });
      }
    });

    // ---- stars ----
    const starCount = 900;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 40 + Math.random() * 40;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(p) * Math.cos(t);
      starPos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
      starPos[i * 3 + 2] = r * Math.cos(p);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xcfd6e0, size: 0.9, sizeAttenuation: false, transparent: true, opacity: 0.45 });
    scene.add(new THREE.Points(starGeo, starMat));
    disposables.push(starGeo, starMat, renderer);

    // ---- exact fit inside the container ----
    let W = 1, H = 1;
    const layout = () => {
      W = wrap.clientWidth || 1;
      H = wrap.clientHeight || 1;
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      const m = Math.max(14, Math.min(W, H) * 0.03);
      let P: number, cx: number, cy: number;
      if (W > 900) {
        P = Math.min(H * 0.47, W * 0.27, H / 2 - m);
        cx = W - m - P;
        cy = H / 2 + Math.min(H * 0.03, H / 2 - m - P);
      } else {
        P = Math.min(W / 2 - m, H * 0.3);
        cx = W / 2;
        cy = H - m - P;
      }
      const k = (P / (H / 2)) * Math.tan((FOV * Math.PI) / 360);
      const d = ATMO / Math.sin(Math.atan(k));
      camera.position.set(0, 0, d);
      camera.lookAt(0, 0, 0);
      camera.setViewOffset(W, H, W / 2 - cx, H / 2 - cy, W, H);
      camera.updateProjectionMatrix();
    };
    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(wrap);

    // ---- interaction only while pressed ----
    let dragging = false, moved = 0, lx = 0, ly = 0, vx = 0, vy = 0;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    const pick = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left, y = clientY - rect.top;
      ndc.set((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects(pickables);
      if (hits.length) {
        tip.textContent = String(hits[0].object.userData.name);
        tip.style.left = `${x}px`;
        tip.style.top = `${y}px`;
        tip.style.display = 'block';
      } else {
        tip.style.display = 'none';
      }
    };

    const onDown = (e: PointerEvent) => {
      dragging = true; moved = 0; lx = e.clientX; ly = e.clientY; vx = vy = 0;
      wrap.style.cursor = 'grabbing';
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return; // plain cursor movement does nothing
      const dx = e.clientX - lx, dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      vy = dx * 0.005; vx = dy * 0.0035;
      drag.rotation.y += vy;
      drag.rotation.x = Math.max(-0.6, Math.min(0.6, drag.rotation.x + vx));
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      const wasClick = moved < 5;
      dragging = false;
      wrap.style.cursor = '';
      if (wasClick) pick(e.clientX, e.clientY);
    };
    const onCancel = () => { dragging = false; wrap.style.cursor = ''; };
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);

    // ---- loop ----
    const clock = new THREE.Clock();
    const tmp = new THREE.Vector3();
    const nrm = new THREE.Vector3();
    const camDir = new THREE.Vector3();
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      if (!dragging) {
        spin.rotation.y += 0.0007;
        drag.rotation.y += vy; vy *= 0.94;
        drag.rotation.x += vx; vx *= 0.9; drag.rotation.x *= 0.985;
      }
      ringMat.opacity = 0.4 + 0.25 * Math.sin(t * 1.6);
      renderer.render(scene, camera);

      // project labels; hide those on the far side
      for (const { anchor, el } of labeled) {
        anchor.getWorldPosition(tmp);
        nrm.copy(tmp).normalize();
        camDir.copy(camera.position).sub(tmp).normalize();
        const facing = nrm.dot(camDir);
        tmp.project(camera);
        el.style.transform = `translate(${((tmp.x + 1) / 2) * W}px, ${((1 - tmp.y) / 2) * H}px) translate(0,-50%)`;
        el.style.opacity = facing > 0.25 ? String(Math.min(1, (facing - 0.25) * 4)) : '0';
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      labelsLayer.innerHTML = '';
      disposables.forEach((d) => d.dispose());
    };
  }, [universities]);

  return (
    <div ref={wrapRef} className={className} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', touchAction: 'pan-y', cursor: 'grab' }}
      />
      <div ref={labelsRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
      <div
        ref={tipRef}
        style={{
          position: 'absolute', display: 'none', pointerEvents: 'none', transform: 'translate(14px,-50%)',
          background: 'rgba(6,10,18,.9)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8,
          padding: '7px 11px', fontSize: 12, color: '#eef2f6', whiteSpace: 'nowrap',
        }}
      />
    </div>
  );
}
