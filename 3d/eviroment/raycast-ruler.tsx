import { store } from "@/store";
import { Line, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useSnapshot } from "valtio";
// ─────────────────────────────────────────────────────────────
// Константы вращения (вынесены за пределы компонентов)
// ─────────────────────────────────────────────────────────────
const ROT = {
    0: { mxx: 1, mxz: 0, mzx: 0, mzz: 1 },
    1: { mxx: 0, mxz: 1, mzx: -1, mzz: 0 },
    2: { mxx: -1, mxz: 0, mzx: 0, mzz: -1 },
    3: { mxx: 0, mxz: -1, mzx: 1, mzz: 0 },
};

const getRot = (a) => {
    if (a === 0) return ROT[0];
    if (a === Math.PI * 0.5) return ROT[1];
    if (a === Math.PI) return ROT[2];
    if (a === Math.PI * 1.5) return ROT[3];
    if (a === -Math.PI * 0.5) return ROT[3];
    if (a === -Math.PI) return ROT[2];
    if (a === -Math.PI * 1.5) return ROT[1];
    const q = (((a / (Math.PI * 0.5)) % 4) + 4) % 4 | 0;
    return ROT[q] || {
        mxx: Math.cos(a), mxz: Math.sin(a),
        mzx: -Math.sin(a), mzz: Math.cos(a)
    };
};

// ─────────────────────────────────────────────────────────────
// Расстояние от точки до отрезка (для отсечения по threshold)
// ─────────────────────────────────────────────────────────────
const _tmpV1 = new THREE.Vector3();
const _tmpV2 = new THREE.Vector3();
const _tmpV3 = new THREE.Vector3();

function pointToSegmentDistance(px, py, pz, ax, ay, az, bx, by, bz) {
    const abx = bx - ax, aby = by - ay, abz = bz - az;
    const apx = px - ax, apy = py - ay, apz = pz - az;
    const ab2 = abx * abx + aby * aby + abz * abz;
    if (ab2 === 0) {
        const dx = px - ax, dy = py - ay, dz = pz - az;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    let t = (apx * abx + apy * aby + apz * abz) / ab2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const cx = ax + t * abx;
    const cy = ay + t * aby;
    const cz = az + t * abz;
    const dx = px - cx, dy = py - cy, dz = pz - cz;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// ─────────────────────────────────────────────────────────────
// Быстрая проверка: пересекает ли луч AABB (boolean, без сортировки)
// ─────────────────────────────────────────────────────────────
function rayHitsBox(box, fx, fy, fz, dx, dy, dz) {
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
        const t1 = (-hx - lox) * inv;
        const t2 = (hx - lox) * inv;
        tmin = t1 < t2 ? t1 : t2;
        tmax = t1 > t2 ? t1 : t2;
    } else if (lox < -hx || lox > hx) {
        return false;
    }

    if (ldy !== 0) {
        const inv = 1.0 / ldy;
        const t1 = (-hy - loy) * inv;
        const t2 = (hy - loy) * inv;
        const n = t1 < t2 ? t1 : t2;
        const f = t1 > t2 ? t1 : t2;
        if (n > tmax || f < tmin) return false;
        if (n > tmin) tmin = n;
        if (f < tmax) tmax = f;
    } else if (loy < -hy || loy > hy) {
        return false;
    }

    if (ldz !== 0) {
        const inv = 1.0 / ldz;
        const t1 = (-hz - loz) * inv;
        const t2 = (hz - loz) * inv;
        const n = t1 < t2 ? t1 : t2;
        const f = t1 > t2 ? t1 : t2;
        if (n > tmax || f < tmin) return false;
        if (n > tmin) tmin = n;
        if (f < tmax) tmax = f;
    } else if (loz < -hz || loz > hz) {
        return false;
    }

    return tmax >= 0 && tmin <= 1;
}

// ─────────────────────────────────────────────────────────────
// Полный raycast с отсечением по threshold
// ─────────────────────────────────────────────────────────────
const throw_ray = (arrayofos, from, to, threshold = 1) => {
    const positions = [];
    const segments = [];

    const fx = from.x, fy = from.y, fz = from.z;
    const dx = to.x - fx, dy = to.y - fy, dz = to.z - fz;

    if (!(Number.isFinite(dx) && Number.isFinite(dy) && Number.isFinite(dz))) {
        return [positions, segments];
    }
    if (dx === 0 && dy === 0 && dz === 0) return [positions, segments];

    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len === 0) return [positions, segments];

    const ndx = dx / len, ndy = dy / len, ndz = dz / len;

    const hits = [];
    const n = arrayofos.length;

    for (let i = 0; i < n; i++) {
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

        // ── Отсечение по threshold ──
        // Радиус AABB в мировом пространстве (грубая оценка)
        const r = Math.sqrt(hx * hx + hy * hy + hz * hz);
        const dist = pointToSegmentDistance(px, py, pz, fx, fy, fz, to.x, to.y, to.z);
        if (dist > threshold + r) continue; // слишком далеко от луча

        // Полный тест пересечения
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

    let prevT = 0;
    let insideCount = 0;
    let prevPos = { x: fx, y: fy, z: fz };

    for (let i = 0; i < hits.length; i++) {
        const h = hits[i];
        const t = h.t;
        const p = { x: fx + t * dx, y: fy + t * dy, z: fz + t * dz };

        positions.push(p);

        if (t > prevT && insideCount === 0) {
            segments.push([prevPos, p]);
        }

        prevPos = p;
        prevT = t;
        insideCount += h.isEnter ? 1 : -1;
    }

    if (prevT < 1 && insideCount === 0) {
        segments.push([prevPos, { x: to.x, y: to.y, z: to.z }]);
    }

    return [positions, segments];
};

// ─────────────────────────────────────────────────────────────
// SegmentRuler — мемоизированный, без лишних клонирований
// ─────────────────────────────────────────────────────────────
export const SegmentRuler = memo(({
    points,
    thickness = 0.03,
    lineColor = '#000000',
    textColor = '#000000',
    tickColor = '#000000',
    yaw = 0
}) => {
    const [start, end] = points;

    const {
        linePoints,
        tickPairs,
        label,
        textPos,
        textQuat,
        len
    } = useMemo(() => {
        const p1 = new THREE.Vector3(start.x, start.y, start.z);
        const p2 = new THREE.Vector3(end.x, end.y, end.z);
        const mid = _tmpV1.addVectors(p1, p2).multiplyScalar(0.5);
        const dir = _tmpV2.subVectors(p2, p1);
        const len = dir.length();

        if (len === 0) return null;

        const forward = dir.normalize();
        const worldUp = new THREE.Vector3(0, 1, 0);

        let right;
        if (Math.abs(forward.y) > 0.9999) {
            right = new THREE.Vector3(1, 0, 0);
        } else {
            right = new THREE.Vector3().crossVectors(forward, worldUp).normalize();
        }
        const up = new THREE.Vector3().crossVectors(right, forward).normalize();

        const m = new THREE.Matrix4().makeBasis(right, up, forward);
        const q = new THREE.Quaternion().setFromRotationMatrix(m);

        const tickCount = Math.max(0, Math.floor(len / 0.1));
        const tickH = thickness;

        // Предвычисляем точки засечек: [[start, end], [start, end], ...]
        const tickPairs = [];
        const sx = start.x, sy = start.y, sz = start.z;
        const ex = end.x, ey = end.y, ez = end.z;
        const ddx = ex - sx, ddy = ey - sy, ddz = ez - sz;

        for (let i = 0; i < tickCount; i++) {
            const t = ((i + 1) * 0.1) / len;
            const tx = sx + t * ddx;
            const ty = sy + t * ddy;
            const tz = sz + t * ddz;
            tickPairs.push([
                new THREE.Vector3(tx, ty, tz),
                new THREE.Vector3(tx + up.x * tickH, ty + up.y * tickH, tz + up.z * tickH)
            ]);
        }

        return {
            linePoints: [p1, p2],
            tickPairs,
            label: `${len.toFixed(2)}m`,
            textPos: [
                mid.x + up.x * thickness * 4,
                mid.y + up.y * thickness * 4,
                mid.z + up.z * thickness * 4
            ],
            textQuat: q,
            len
        };
    }, [start.x, start.y, start.z, end.x, end.y, end.z, thickness]);

    if (!linePoints) return null;

    return (
        <group>
            <Line points={linePoints} color={lineColor} lineWidth={2} />

            {tickPairs.map((pair, i) => (
                <Line
                    key={i}
                    points={pair}
                    color={tickColor}
                    lineWidth={1}
                />
            ))}

            <group position={textPos} quaternion={textQuat}>
                <Text
                    fontSize={thickness * 3}
                    color={textColor}
                    anchorX="center"
                    anchorY="middle"
                    rotation={[0, yaw, 0]}
                >
                    {label}
                </Text>
            </group>
        </group>
    );
});

SegmentRuler.displayName = 'SegmentRuler';

// ─────────────────────────────────────────────────────────────
// RaycastRuler — инкрементальный пересчёт с прореживанием
// ─────────────────────────────────────────────────────────────
export function RaycastRuler({ from, to, textAngle, threshold = 1 }) {
    const snap = useSnapshot(store, { sync: true });
    const [segments, setSegments] = useState([]);

    const prevModulesRef = useRef([]);
    const segmentsRef = useRef([]);
    const dirtyRef = useRef(true);
    const frameCountRef = useRef(0);

    // Прореженный пересчёт в useFrame (не чаще 10 раз в секунду)
    useFrame(() => {
        frameCountRef.current++;
        if (!dirtyRef.current) return;
        if (frameCountRef.current % 6 !== 0) return; // ~10fps при 60fps

        const current = snap.modules.map(m => ({
            id: m.id,
            halfExtents: m.halfExtents,
            position: m.position,
            openAngle: m.openAngle
        }));

        const prev = prevModulesRef.current;

        // Первый запуск или изменение количества
        if (prev.length === 0 || prev.length !== current.length) {
            const [, segs] = throw_ray(current, from, to, threshold);
            segmentsRef.current = segs;
            setSegments(segs);
            prevModulesRef.current = current;
            dirtyRef.current = false;
            return;
        }

        // Найти изменившиеся модули
        const changedIndices = [];
        for (let i = 0; i < current.length; i++) {
            const p = prev[i], c = current[i];
            if (!p || p.id !== c.id ||
                p.position.x !== c.position.x ||
                p.position.y !== c.position.y ||
                p.position.z !== c.position.z ||
                p.openAngle !== c.openAngle) {
                changedIndices.push(i);
            }
        }

        if (changedIndices.length === 0) {
            dirtyRef.current = false;
            return;
        }

        // Оптимизация: если 1 модуль изменился и не пересекает луч
        if (changedIndices.length === 1) {
            const idx = changedIndices[0];
            const prevHit = rayHitsBox(prev[idx], from.x, from.y, from.z, to.x - from.x, to.y - from.y, to.z - from.z);
            const currHit = rayHitsBox(current[idx], from.x, from.y, from.z, to.x - from.x, to.y - from.y, to.z - from.z);

            if (!prevHit && !currHit) {
                prevModulesRef.current = current;
                dirtyRef.current = false;
                return;
            }
        }

        const [, segs] = throw_ray(current, from, to, threshold);
        segmentsRef.current = segs;
        setSegments(segs);
        prevModulesRef.current = current;
        dirtyRef.current = false;
    });

    // Отмечаем dirty при изменении modules
    useEffect(() => {
        dirtyRef.current = true;
    }, [snap.modules]);

    return (
        <>
            {segments.map((seg, i) => (
                <SegmentRuler
                    key={`${i}-${seg[0].x}-${seg[0].y}-${seg[0].z}`}
                    points={seg}
                    thickness={0.03}
                    yaw={textAngle - Math.PI}
                />
            ))}
        </>
    );
}
