import { useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useSnapshot } from 'valtio';
import { store } from '@/store';

// ---------------------------------------------------------------------
// Fine-tune vars – tweak these to adjust look & feel
// ---------------------------------------------------------------------
const MEASURE = {
    lineThickness: 0.005,   // thickness of orange lines
    lineColor: '#F06900',   // orange accent
    fontSize: 0.05,         // label text size

    widthOffset: 0.1,       // how far above module top the width line sits
    heightOffset: 0.1,      // how far sideways from module edge the height line sits
    textLift: 0.05,         // how far above the width line the label floats
    textDrop: 0.15,         // how far below module center the height label sits

    normalNudgeX: 0.01,     // fine text nudge along the module normal
    normalNudgeZ: 0.05,     // fine text nudge perpendicular to the normal
};

function LocalMeasurements() {
    const snap = useSnapshot(store);

    const measurementElements = useMemo(() => {
        if (!snap.modules?.length) return null;

        return snap.modules.map((m) => {
            if (!m.halfExtents || !m.position) return null;

            const he = m.halfExtents;
            const pos = m.position;
            const angle = m.openAngle ?? 0;

            // Module size (halfExtents → full size)
            const size = new THREE.Vector3(he[0] * 2, he[1] * 2, he[2] * 2);
            const center = new THREE.Vector3(pos.x, pos.y, pos.z);

            // World axes derived from openAngle (same math as RaycastRuler)
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);
            const worldX = new THREE.Vector3(cosA, 0, sinA);   // module local +X
            const worldZ = new THREE.Vector3(-sinA, 0, cosA);  // module local +Z (facing / normal)

            // ---------------------------------------------------------
            // Width measurement – line runs along module local X
            // ---------------------------------------------------------
            const topY = center.y + size.y / 2 + MEASURE.widthOffset;
            const halfW = size.x / 2;

            const wStart = center.clone().sub(worldX.clone().multiplyScalar(halfW));
            const wEnd   = center.clone().add(worldX.clone().multiplyScalar(halfW));
            wStart.y = topY;
            wEnd.y   = topY;

            const wMid = new THREE.Vector3().addVectors(wStart, wEnd).multiplyScalar(0.5);

            // Rotation for width line & text (same logic as original)
            const rotY = Math.abs(worldZ.z) < 0.01
                ? -Math.PI / 2
                : (worldZ.z < 0 ? Math.PI : 0);

            // ---------------------------------------------------------
            // Height measurement – line runs vertically, offset to the
            // "left" of the module (-worldX direction)
            // ---------------------------------------------------------
            const hOffset = worldX.clone().multiplyScalar(-(size.x / 2 + MEASURE.heightOffset));
            const hPos = center.clone().add(hOffset);

            // Small text nudge to avoid z-fighting / improve readability
            const nudgeX = worldZ.x * MEASURE.normalNudgeX - worldZ.z * MEASURE.normalNudgeZ;
            const nudgeZ = worldZ.z * MEASURE.normalNudgeX + worldZ.x * MEASURE.normalNudgeZ;

            return (
                <group key={m.id}>
                    {/* Width line */}
                    <mesh rotation={[0, rotY, 0]} position={[wMid.x, topY, wMid.z]}>
                        <boxGeometry args={[size.x, MEASURE.lineThickness, MEASURE.lineThickness]} />
                        <meshBasicMaterial color={MEASURE.lineColor} />
                    </mesh>

                    {/* Width label */}
                    <Text
                        rotation={[0, rotY, 0]}
                        position={[
                            wMid.x + worldZ.x * 0.01,
                            topY + MEASURE.textLift,
                            wMid.z + worldZ.z * 0.01,
                        ]}
                        fontSize={MEASURE.fontSize}
                        color={MEASURE.lineColor}
                        anchorX="center"
                        anchorY="middle"
                    >
                        {`${size.x.toFixed(2)}m`}
                    </Text>

                    {/* Height line */}
                    <mesh position={[hPos.x, center.y, hPos.z]}>
                        <boxGeometry args={[MEASURE.lineThickness, size.y, MEASURE.lineThickness]} />
                        <meshBasicMaterial color={MEASURE.lineColor} />
                    </mesh>

                    {/* Height label */}
                    <Text
                        rotation={[0, rotY, Math.PI / 2]}
                        position={[
                            hPos.x + nudgeX,
                            center.y - MEASURE.textDrop,
                            hPos.z + nudgeZ,
                        ]}
                        fontSize={MEASURE.fontSize}
                        color={MEASURE.lineColor}
                        anchorX="center"
                        anchorY="middle"
                    >
                        {`${size.y.toFixed(2)}m`}
                    </Text>
                </group>
            );
        });
    }, [snap.modules]);

    return <>{measurementElements}</>;
}

export default LocalMeasurements;
