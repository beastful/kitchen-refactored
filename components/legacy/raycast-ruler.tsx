import { store } from "@/store";
import { Line } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { useSnapshot } from "valtio";
import { useMemo } from 'react';
import { Text, Billboard } from '@react-three/drei';


export const SegmentRuler = ({
    points,
    thickness = 0.03,
    lineColor = '#000000',
    textColor = '#000000',
    tickColor = '#000000',
}) => {
    const [start, end] = points;

    const { mid, len, dir, up, right, q, tickCount } = useMemo(() => {
        const p1 = new THREE.Vector3(start.x, start.y, start.z);
        const p2 = new THREE.Vector3(end.x, end.y, end.z);
        const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        const dir = new THREE.Vector3().subVectors(p2, p1);
        const len = dir.length();

        if (len === 0) {
            return { mid, len: 0, dir: null, up: null, right: null, q: null, tickCount: 0 };
        }

        const forward = dir.clone().normalize();
        const worldUp = new THREE.Vector3(0, 1, 0);

        let right;
        if (Math.abs(forward.y) > 0.9999) {
            right = new THREE.Vector3(1, 0, 0);
        } else {
            right = new THREE.Vector3().crossVectors(forward, worldUp).normalize();
        }
        const up = new THREE.Vector3().crossVectors(right, forward).normalize();

        // Basis: X=right (line width), Y=up (normal facing up), Z=forward (along line)
        const m = new THREE.Matrix4().makeBasis(right, up, forward);
        const q = new THREE.Quaternion().setFromRotationMatrix(m);

        return { mid, len, dir, up, right, q, tickCount: Math.max(0, Math.floor(len / 0.1)) };
    }, [start, end]);

    if (len === 0) return null;

    const label = `${len.toFixed(2)}m`;
    const tickH = thickness * 2;

    // Safe Line points (flat array for drei Line)
    const linePoints = useMemo(() => [
        new THREE.Vector3(start.x, start.y, start.z),
        new THREE.Vector3(end.x, end.y, end.z),
    ], [start, end]);

    return (
        <group>
            {/* --- Main line using drei Line (safe, no NaN) --- */}
            <Line
                points={linePoints}
                color={lineColor}
                lineWidth={2}
            />

            {/* --- Tick marks every 0.1 units, sticking out from the line --- */}
            {Array.from({ length: tickCount }).map((_, i) => {
                const t = ((i + 1) * 0.1) / len;
                const pos = new THREE.Vector3(start.x, start.y, start.z).add(
                    dir.clone().multiplyScalar(t)
                );
                const tickStart = pos.clone();
                const tickEnd = pos.clone().add(up.clone().multiplyScalar(tickH));
                return (
                    <Line
                        key={i}
                        points={[tickStart, tickEnd]}
                        color={tickColor}
                        lineWidth={1}
                    />
                );
            })}

            {/* --- 3D text lying on the line, facing the same side as 'up' normal --- */}
            <group position={[
                mid.x + up.x * thickness * 4,
                mid.y + up.y * thickness * 4,
                mid.z + up.z * thickness * 4,
            ]} quaternion={q}>
                <Text
                    fontSize={thickness * 6}
                    color={textColor}
                    anchorX="center"
                    anchorY="middle"
                >
                    {label}
                </Text>
            </group>
        </group>
    );
};
/**
 * Cast a ray segment from 'from' to 'to' through an array of AABBs.
 * Returns an array of intersection points (entry and exit) for every box hit,
 * ordered along the ray from 'from' to 'to'.
 *
 * @param {Array} arrayofos - Array of objects with {position: {x,y,z}, halfExtents: {x,y,z}}
 * @param {Object} from - Start point {x, y, z}
 * @param {Object} to   - End point {x, y, z}
 * @returns {Array} Array of points {x, y, z}
 */
const throw_ray = (arrayofos, from, to) => {
    const positions = [];
    const segments = [];

    const fx = from.x, fy = from.y, fz = from.z;
    const dx = to.x - fx, dy = to.y - fy, dz = to.z - fz;

    if (!(Number.isFinite(dx) && Number.isFinite(dy) && Number.isFinite(dz))) {
        return [positions, segments];
    }
    if (dx === 0 && dy === 0 && dz === 0) return [positions, segments];

    const mxx = [1, 0, -1, 0];
    const mxz = [0, 1, 0, -1];
    const mzx = [0, -1, 0, 1];
    const mzz = [1, 0, -1, 0];

    const hits = [];
    const len = arrayofos.length;

    for (let i = 0; i < len; i++) {
        const o = arrayofos[i];
        if (!o) continue;

        const he = o.halfExtents;
        const pos = o.position;
        if (!he || !pos) continue;

        const hx = he[0], hy = he[1], hz = he[2];
        const px = pos.x, py = pos.y, pz = pos.z;

        if (!(Number.isFinite(hx) && Number.isFinite(hy) && Number.isFinite(hz) &&
            Number.isFinite(px) && Number.isFinite(py) && Number.isFinite(pz))) {
            continue;
        }

        const a = o.openAngle;
        let q;
        if (a === 0) q = 0;
        else if (a === Math.PI * 0.5) q = 1;
        else if (a === Math.PI) q = 2;
        else if (a === Math.PI * 1.5) q = 3;
        else if (a === -Math.PI * 0.5) q = 3;
        else if (a === -Math.PI) q = 2;
        else if (a === -Math.PI * 1.5) q = 1;
        else q = (((a / (Math.PI * 0.5)) % 4) + 4) % 4 | 0;

        const rx = fx - px, rz = fz - pz;
        const lox = mxx[q] * rx + mzx[q] * rz;
        const loy = fy - py;
        const loz = mxz[q] * rx + mzz[q] * rz;

        const ldx = mxx[q] * dx + mzx[q] * dz;
        const ldy = dy;
        const ldz = mxz[q] * dx + mzz[q] * dz;

        let tmin = -Infinity, tmax = Infinity;

        if (ldx !== 0) {
            const inv = 1.0 / ldx;
            const t1 = (-hx - lox) * inv;
            const t2 = (hx - lox) * inv;
            tmin = t1 < t2 ? t1 : t2;
            tmax = t1 > t2 ? t1 : t2;
        } else if (lox < -hx || lox > hx) {
            continue;
        }

        if (ldy !== 0) {
            const inv = 1.0 / ldy;
            const t1 = (-hy - loy) * inv;
            const t2 = (hy - loy) * inv;
            const n = t1 < t2 ? t1 : t2;
            const f = t1 > t2 ? t1 : t2;
            if (n > tmax || f < tmin) continue;
            if (n > tmin) tmin = n;
            if (f < tmax) tmax = f;
        } else if (loy < -hy || loy > hy) {
            continue;
        }

        if (ldz !== 0) {
            const inv = 1.0 / ldz;
            const t1 = (-hz - loz) * inv;
            const t2 = (hz - loz) * inv;
            const n = t1 < t2 ? t1 : t2;
            const f = t1 > t2 ? t1 : t2;
            if (n > tmax || f < tmin) continue;
            if (n > tmin) tmin = n;
            if (f < tmax) tmax = f;
        } else if (loz < -hz || loz > hz) {
            continue;
        }

        if (tmax < 0 || tmin > 1) continue;

        const t0 = tmin > 0 ? tmin : 0;
        const t1 = tmax < 1 ? tmax : 1;

        if (!(Number.isFinite(t0) && Number.isFinite(t1))) continue;

        hits.push({ t: t0, idx: i, isEnter: true });
        hits.push({ t: t1, idx: i, isEnter: false });
    }

    // ---- no intersections → single segment through free space ----
    if (hits.length === 0) {
        segments.push([
            { x: fx, y: fy, z: fz },
            { x: to.x, y: to.y, z: to.z }
        ]);
        return [positions, segments];
    }

    hits.sort((a, b) => {
        const d = a.t - b.t;
        return d !== 0 ? d : (a.isEnter ? 1 : -1);
    });

    // ---- walk the sorted events ----
    let prevT = 0;
    let insideCount = 0;
    let prevPos = { x: fx, y: fy, z: fz };   // ← ray origin, not null

    for (let i = 0; i < hits.length; i++) {
        const h = hits[i];
        const t = h.t;
        const p = { x: fx + t * dx, y: fy + t * dy, z: fz + t * dz };

        positions.push(p);

        // emit free-flight only when outside and actually moving forward
        if (t > prevT && insideCount === 0) {
            segments.push([prevPos, p]);
        }

        prevPos = p;
        prevT = t;
        insideCount += h.isEnter ? 1 : -1;
    }

    // tail: last event → ray end
    if (prevT < 1 && insideCount === 0) {
        segments.push([prevPos, { x: to.x, y: to.y, z: to.z }]);
    }

    return [positions, segments];
};

export function RaycastRuler({ from, to }) {
    const snap = useSnapshot(store)
    const [intersections, setIntersections] = useState([]);
    const [segments, setSegments] = useState([]);
    // const from = new THREE.Vector3(1.9, -1, 2);
    // const to = new THREE.Vector3(1.9, -1, -2);

    useFrame(() => {

    })

    useEffect(() => {
        const arrayofmodules = snap.modules.map((o) => {
            return {
                halfExtents: o.halfExtents,
                position: o.position,
                openAngle: o.openAngle
            }
        })
        const [intersections, segments] = throw_ray(arrayofmodules, from, to)
        setIntersections(intersections)
        setSegments(segments)
    }, [snap])

    return (
        <>
            <mesh position={from}>
                <boxGeometry args={[0.1, 0.1, 0.1]} />
                <meshBasicMaterial color="red" />
            </mesh>
            <mesh position={to}>
                <boxGeometry args={[0.1, 0.1, 0.1]} />
                <meshBasicMaterial color="green" />
            </mesh>
            {intersections.map(o => {
                return <mesh position={[o.x, o.y, o.z]}>
                    <boxGeometry args={[0.1, 0.1, 0.1]} />
                    <meshBasicMaterial color="blue" />
                </mesh>
            })}
            {segments.map((seg, i) => (
                <SegmentRuler
                    key={i}
                    points={seg}
                    thickness={0.04}
                />
            ))}
        </>
    )
}