// thick-plane-ruler.tsx
"use client";

import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { subscribe } from "valtio";
import { store } from "@/store";

// ---------------------------------------------------------------------
// 1. Geometry builder – single BufferGeometry for all segment quads
// ---------------------------------------------------------------------
function buildThickPlaneGeometry(
  segments: [THREE.Vector3, THREE.Vector3][],
  thickness: number
) {
  const vertices: number[] = [];
  const indices: number[] = [];
  let vertexOffset = 0;

  const addQuad = (a: THREE.Vector3, b: THREE.Vector3) => {
    const dir = b.clone().sub(a).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    let right = new THREE.Vector3().crossVectors(dir, up);
    if (right.length() < 0.1) {
      right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(1, 0, 0));
    }
    right.normalize().multiplyScalar(thickness * 0.5);

    const v0 = a.clone().add(right);
    const v1 = a.clone().sub(right);
    const v2 = b.clone().sub(right);
    const v3 = b.clone().add(right);

    vertices.push(
      v0.x, v0.y, v0.z,
      v1.x, v1.y, v1.z,
      v2.x, v2.y, v2.z,
      v3.x, v3.y, v3.z
    );

    indices.push(
      vertexOffset, vertexOffset + 1, vertexOffset + 2,
      vertexOffset, vertexOffset + 2, vertexOffset + 3
    );

    vertexOffset += 4;
  };

  for (const seg of segments) addQuad(seg[0], seg[1]);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  return geometry;
}

// ---------------------------------------------------------------------
// 2. Raycasting (original logic, unchanged)
// ---------------------------------------------------------------------
const ROT_CACHE: Record<number, { mxx: number; mxz: number; mzx: number; mzz: number }> = {
  0: { mxx: 1, mxz: 0, mzx: 0, mzz: 1 },
  1: { mxx: 0, mxz: 1, mzx: -1, mzz: 0 },
  2: { mxx: -1, mxz: 0, mzx: 0, mzz: -1 },
  3: { mxx: 0, mxz: -1, mzx: 1, mzz: 0 },
};

function getRot(a: number) {
  if (a === 0) return ROT_CACHE[0];
  if (a === Math.PI * 0.5) return ROT_CACHE[1];
  if (a === Math.PI) return ROT_CACHE[2];
  if (a === Math.PI * 1.5) return ROT_CACHE[3];
  if (a === -Math.PI * 0.5) return ROT_CACHE[3];
  if (a === -Math.PI) return ROT_CACHE[2];
  if (a === -Math.PI * 1.5) return ROT_CACHE[1];
  const q = (((a / (Math.PI * 0.5)) % 4) + 4) % 4 | 0;
  return (
    ROT_CACHE[q] || {
      mxx: Math.cos(a),
      mxz: Math.sin(a),
      mzx: -Math.sin(a),
      mzz: Math.cos(a),
    }
  );
}

function pointToSegmentDistance(
  px: number, py: number, pz: number,
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number
) {
  const abx = bx - ax, aby = by - ay, abz = bz - az;
  const apx = px - ax, apy = py - ay, apz = pz - az;
  const ab2 = abx * abx + aby * aby + abz * abz;
  if (ab2 === 0) {
    const dx = px - ax, dy = py - ay, dz = pz - az;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  let t = (apx * abx + apy * aby + apz * abz) / ab2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * abx, cy = ay + t * aby, cz = az + t * abz;
  const dx = px - cx, dy = py - cy, dz = pz - cz;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function rayHitsBox(
  box: {
    halfExtents: number[];
    position: { x: number; y: number; z: number };
    openAngle: number;
  },
  fx: number, fy: number, fz: number,
  dx: number, dy: number, dz: number
) {
  const { halfExtents: he, position: pos, openAngle: a } = box;
  const { mxx, mxz, mzx, mzz } = getRot(a);
  const hx = he[0], hy = he[1], hz = he[2];
  const px = pos.x, py = pos.y, pz = pos.z;

  const rx = fx - px, rz = fz - pz;
  const lox = mxx * rx + mzx * rz;
  const loy = fy - py;
  const loz = mxz * rx + mzz * rz;

  const ldx = mxx * dx + mzx * dz;
  const ldy = dy;
  const ldz = mxz * dx + mzz * dz;

  let tmin = -Infinity, tmax = Infinity;

  if (ldx !== 0) {
    const inv = 1.0 / ldx;
    const t1 = (-hx - lox) * inv, t2 = (hx - lox) * inv;
    tmin = Math.min(t1, t2);
    tmax = Math.max(t1, t2);
  } else if (lox < -hx || lox > hx) return false;

  if (ldy !== 0) {
    const inv = 1.0 / ldy;
    const t1 = (-hy - loy) * inv, t2 = (hy - loy) * inv;
    const n = Math.min(t1, t2), f = Math.max(t1, t2);
    if (n > tmax || f < tmin) return false;
    if (n > tmin) tmin = n;
    if (f < tmax) tmax = f;
  } else if (loy < -hy || loy > hy) return false;

  if (ldz !== 0) {
    const inv = 1.0 / ldz;
    const t1 = (-hz - loz) * inv, t2 = (hz - loz) * inv;
    const n = Math.min(t1, t2), f = Math.max(t1, t2);
    if (n > tmax || f < tmin) return false;
    if (n > tmin) tmin = n;
    if (f < tmax) tmax = f;
  } else if (loz < -hz || loz > hz) return false;

  return tmax >= 0 && tmin <= 1;
}

function throw_ray(
  arrayofos: Array<{
    halfExtents: number[];
    position: { x: number; y: number; z: number };
    openAngle: number;
    id?: string | number;
  }>,
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
  threshold = 1
): [THREE.Vector3[], [THREE.Vector3, THREE.Vector3][]] {
  const positions: THREE.Vector3[] = [];
  const segments: [THREE.Vector3, THREE.Vector3][] = [];

  const fx = from.x, fy = from.y, fz = from.z;
  const dx = to.x - fx, dy = to.y - fy, dz = to.z - fz;

  if (!(Number.isFinite(dx) && Number.isFinite(dy) && Number.isFinite(dz)))
    return [positions, segments];
  if (dx === 0 && dy === 0 && dz === 0) return [positions, segments];

  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len === 0) return [positions, segments];

  const hits: { t: number; idx: number; isEnter: boolean }[] = [];
  const n = arrayofos.length;

  for (let i = 0; i < n; i++) {
    const o = arrayofos[i];
    if (!o) continue;
    const he = o.halfExtents, pos = o.position;
    if (!he || !pos) continue;

    const hx = he[0], hy = he[1], hz = he[2];
    const px = pos.x, py = pos.y, pz = pos.z;
    if (
      !(
        Number.isFinite(hx) &&
        Number.isFinite(hy) &&
        Number.isFinite(hz) &&
        Number.isFinite(px) &&
        Number.isFinite(py) &&
        Number.isFinite(pz)
      )
    )
      continue;

    const r = Math.sqrt(hx * hx + hy * hy + hz * hz);
    const dist = pointToSegmentDistance(px, py, pz, fx, fy, fz, to.x, to.y, to.z);
    if (dist > threshold + r) continue;

    if (!rayHitsBox(o, fx, fy, fz, dx, dy, dz)) continue;

    const { mxx, mxz, mzx, mzz } = getRot(o.openAngle);
    const rx = fx - px, rz = fz - pz;
    const lox = mxx * rx + mzx * rz;
    const loy = fy - py;
    const loz = mxz * rx + mzz * rz;
    const ldx = mxx * dx + mzx * dz;
    const ldy = dy;
    const ldz = mxz * dx + mzz * dz;

    let tmin = -Infinity, tmax = Infinity;

    if (ldx !== 0) {
      const inv = 1.0 / ldx;
      const t1 = (-hx - lox) * inv, t2 = (hx - lox) * inv;
      tmin = Math.min(t1, t2);
      tmax = Math.max(t1, t2);
    } else if (lox < -hx || lox > hx) continue;

    if (ldy !== 0) {
      const inv = 1.0 / ldy;
      const t1 = (-hy - loy) * inv, t2 = (hy - loy) * inv;
      const n = Math.min(t1, t2), f = Math.max(t1, t2);
      if (n > tmax || f < tmin) continue;
      if (n > tmin) tmin = n;
      if (f < tmax) tmax = f;
    } else if (loy < -hy || loy > hy) continue;

    if (ldz !== 0) {
      const inv = 1.0 / ldz;
      const t1 = (-hz - loz) * inv, t2 = (hz - loz) * inv;
      const n = Math.min(t1, t2), f = Math.max(t1, t2);
      if (n > tmax || f < tmin) continue;
      if (n > tmin) tmin = n;
      if (f < tmax) tmax = f;
    } else if (loz < -hz || loz > hz) continue;

    if (tmax < 0 || tmin > 1) continue;

    const t0 = tmin > 0 ? tmin : 0;
    const t1 = tmax < 1 ? tmax : 1;

    if (!(Number.isFinite(t0) && Number.isFinite(t1))) continue;

    hits.push({ t: t0, idx: i, isEnter: true });
    hits.push({ t: t1, idx: i, isEnter: false });
  }

  if (hits.length === 0) {
    segments.push([new THREE.Vector3(fx, fy, fz), new THREE.Vector3(to.x, to.y, to.z)]);
    return [positions, segments];
  }

  hits.sort((a, b) => {
    const d = a.t - b.t;
    return d !== 0 ? d : a.isEnter ? 1 : -1;
  });

  let prevT = 0;
  let insideCount = 0;
  const prevPos = new THREE.Vector3(fx, fy, fz);

  for (let i = 0; i < hits.length; i++) {
    const h = hits[i];
    const p = new THREE.Vector3(fx + h.t * dx, fy + h.t * dy, fz + h.t * dz);
    positions.push(p);
    if (h.t > prevT && insideCount === 0) {
      segments.push([prevPos.clone(), p.clone()]);
    }
    prevPos.copy(p);
    prevT = h.t;
    insideCount += h.isEnter ? 1 : -1;
  }

  if (prevT < 1 && insideCount === 0) {
    segments.push([prevPos.clone(), new THREE.Vector3(to.x, to.y, to.z)]);
  }

  return [positions, segments];
}

// ---------------------------------------------------------------------
// 3. Main component – batched mesh + per‑segment texts
// ---------------------------------------------------------------------
export const RaycastRuler = ({
  from,
  to,
  textAngle = 0,
  threshold = 1,
  thickness = 0.05,
  color = "#000000",
}: {
  from: { x: number; y: number; z: number };
  to: { x: number; y: number; z: number };
  textAngle?: number;
  threshold?: number;
  thickness?: number;
  color?: string;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const fromRef = useRef(from);
  const toRef = useRef(to);
  const dirtyRef = useRef(true);
  const frameCountRef = useRef(0);
  const materialRef = useRef(
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.5,
      side: THREE.DoubleSide,
    })
  );

  // Each segment: { pos, quat, length }
  const [textSegments, setTextSegments] = useState<
    Array<{ pos: THREE.Vector3; quat: THREE.Quaternion; length: number }>
  >([]);

  useEffect(() => {
    fromRef.current = from;
  }, [from]);
  useEffect(() => {
    toRef.current = to;
  }, [to]);

  useEffect(() => {
    const unsub = subscribe(store, () => {
      dirtyRef.current = true;
    });
    return unsub;
  }, []);

  useFrame(() => {
    frameCountRef.current++;
    if (!dirtyRef.current) return;
    if (frameCountRef.current % 6 !== 0) return;

    dirtyRef.current = false;

    const modules = store.modules.map((m) => ({
      id: m.id,
      halfExtents: m.halfExtents,
      position: m.position,
      openAngle: m.openAngle,
    }));

    const f = fromRef.current;
    const t = toRef.current;
    const [, segments] = throw_ray(modules, f, t, threshold);

    // Build geometry (main segments only)
    const geo = buildThickPlaneGeometry(segments, thickness);
    if (meshRef.current) {
      meshRef.current.geometry.dispose();
      meshRef.current.geometry = geo;
    }

    // Build per‑segment text data with quaternion orientation
    if (segments.length > 0) {
      const newTextSegments = segments.map((seg) => {
        const [a, b] = seg;
        const mid = a.clone().add(b).multiplyScalar(0.5);
        const dirVec = b.clone().sub(a).normalize();

        // Basis vectors: right = segment normal, up = world up, forward = segment direction
        const up = new THREE.Vector3(0, 1, 0);
        let right = new THREE.Vector3().crossVectors(dirVec, up);
        if (right.length() < 0.1) {
          right = new THREE.Vector3().crossVectors(dirVec, new THREE.Vector3(1, 0, 0));
        }
        right.normalize();
        const mat = new THREE.Matrix4().makeBasis(right, up, dirVec);
        const quat = new THREE.Quaternion().setFromRotationMatrix(mat);

        // Position directly above the segment
        const textPos = mid.clone().add(new THREE.Vector3(0, thickness * 4, 0));
        const length = a.distanceTo(b);

        return { pos: textPos, quat, length };
      });
      setTextSegments(newTextSegments);
    } else {
      setTextSegments([]);
    }
  });

  return (
    <group>
      <mesh ref={meshRef} material={materialRef.current} />
      {textSegments.map((seg, idx) => (
        <group key={idx} position={[seg.pos.x, seg.pos.y - 0.1, seg.pos.z]} quaternion={seg.quat}>
          <Text
            fontSize={0.06}
            color={color}
            anchorX="center"
            anchorY="middle"
            rotation={[0, textAngle + Math.PI, 0]}
          >
            {`${seg.length.toFixed(2)}m`}
          </Text>
        </group>
      ))}
    </group>
  );
};
