import { SnapConstraint } from "@/snapping-tools/snap-constraint"
import { store } from "@/store"
import { useTexture } from "@react-three/drei";
import { Suspense, useEffect } from "react";
import { useSnapshot } from "valtio"
import * as THREE from 'three';
import { RaycastRuler } from "./raycast-ruler";

export function RoomWalls() {
    const snap = useSnapshot(store)
    const depth = 0.06;
    const ruler_wal_gap = 0.005
    const ruler_top_factor = 2
    const ruler_bottom_factor = 0.6
    const [colorMap] = useTexture([
        'laminate_floor_02_diff_1k.jpg'
    ])
    const fallOf = 5
    const textureScale = 1.6;

    useEffect(() => {
        if (colorMap) {
            colorMap.wrapS = THREE.RepeatWrapping;
            colorMap.wrapT = THREE.RepeatWrapping;
            const repeatX = snap.room.d / textureScale;
            const repeatY = snap.room.w / textureScale;
            colorMap.repeat.set(repeatX, repeatY);
            colorMap.needsUpdate = true;
        }
    }, [colorMap, snap.room.d, snap.room.w, textureScale]);

    return <>
        {/* z face wall */}

        {snap.ruler && <>
            <RaycastRuler
                from={new THREE.Vector3(snap.room.d / 2 - ruler_wal_gap, -snap.room.h / 2 + ruler_top_factor, -snap.room.w / 2)}
                to={new THREE.Vector3(snap.room.d / 2 - ruler_wal_gap, -snap.room.h / 2 + ruler_top_factor, snap.room.w / 2)}
                textAngle={Math.PI / 2} />
            <RaycastRuler
                from={new THREE.Vector3(snap.room.d / 2 - ruler_wal_gap, -snap.room.h / 2 + ruler_bottom_factor, -snap.room.w / 2)}
                to={new THREE.Vector3(snap.room.d / 2 - ruler_wal_gap, -snap.room.h / 2 + ruler_bottom_factor, snap.room.w / 2)}
                textAngle={Math.PI / 2} />

            {/* +x face wall*/}

            <RaycastRuler
                from={new THREE.Vector3(-snap.room.d / 2, -snap.room.h / 2 + ruler_top_factor, snap.room.w / 2 - ruler_wal_gap)}
                to={new THREE.Vector3(snap.room.d / 2, -snap.room.h / 2 + ruler_top_factor, snap.room.w / 2 - ruler_wal_gap)}
                textAngle={0} />
            <RaycastRuler
                from={new THREE.Vector3(-snap.room.d / 2, -snap.room.h / 2 + ruler_bottom_factor, snap.room.w / 2 - ruler_wal_gap)}
                to={new THREE.Vector3(snap.room.d / 2, -snap.room.h / 2 + ruler_bottom_factor, snap.room.w / 2 - ruler_wal_gap)}
                textAngle={0} />

            {/* -x face wall*/}

            <RaycastRuler
                from={new THREE.Vector3(-snap.room.d / 2, -snap.room.h / 2 + ruler_top_factor, -snap.room.w / 2 + ruler_wal_gap)}
                to={new THREE.Vector3(snap.room.d / 2, -snap.room.h / 2 + ruler_top_factor, -snap.room.w / 2 + ruler_wal_gap)}
                textAngle={Math.PI} />
            <RaycastRuler
                from={new THREE.Vector3(-snap.room.d / 2, -snap.room.h / 2 + ruler_bottom_factor, -snap.room.w / 2 + ruler_wal_gap)}
                to={new THREE.Vector3(snap.room.d / 2, -snap.room.h / 2 + ruler_bottom_factor, -snap.room.w / 2 + ruler_wal_gap)}
                textAngle={Math.PI} />
        </>}

        {/* wall */}

        <SnapConstraint rotation={[0, 0, 0]} userData={{ layer: 'modules' }} name="wall-z" useCursor useDistance position={[0, 0, snap.room.w * 0.5 + depth * 0.5 + fallOf / 2]}>
            <mesh visible={false} name="wall" receiveShadow castShadow>
                <boxGeometry args={[snap.room.d, snap.room.h, depth + fallOf]} />
                <meshBasicMaterial wireframe color={"red"} />
            </mesh>
        </SnapConstraint>
        <mesh position={[0, 0, snap.room.w * 0.5 + depth * 0.5]} name="wall" receiveShadow castShadow>
            <boxGeometry args={[snap.room.d, snap.room.h, depth]} />
            <meshMatcapMaterial color={snap.roomColor} />
        </mesh>

        {/* wall */}

        <SnapConstraint userData={{ layer: 'modules' }} name="wall-x" useCursor useDistance position={[snap.room.d * 0.5 + depth * 0.5 + fallOf / 2, 0, 0]}>
            <mesh visible={false} name="wall" receiveShadow castShadow>
                <boxGeometry args={[depth + fallOf, snap.room.h, snap.room.w + fallOf]} />
                <meshBasicMaterial wireframe color={"red"} />
            </mesh>
        </SnapConstraint>
        <mesh position={[snap.room.d * 0.5 + depth * 0.5, 0, 0]} name="wall" receiveShadow castShadow>
            <boxGeometry args={[depth, snap.room.h, snap.room.w + depth * 2]} />
            <meshMatcapMaterial color={snap.roomColor} />
        </mesh>

        {/* wall */}

        <SnapConstraint userData={{ layer: 'modules' }} name="wall-x" useCursor useDistance position={[0, 0, -snap.room.w * 0.5 - depth * 0.5 - fallOf / 2]}>
            <mesh visible={false} name="wall" receiveShadow castShadow>
                <boxGeometry args={[snap.room.d, snap.room.h, depth + fallOf]} />
                <meshBasicMaterial wireframe color={"red"} />
            </mesh>
        </SnapConstraint>
        <mesh name="wall" position={[0, 0, -snap.room.w * 0.5 - depth * 0.5]} receiveShadow castShadow>
            <boxGeometry args={[snap.room.d, snap.room.h, depth]} />
            <meshMatcapMaterial color={snap.roomColor} />
        </mesh>

        {/* floor */}

        <SnapConstraint useCursor useDistance position={[0, -snap.room.h / 2 - 0.001 - fallOf / 2, 0]}>
            <mesh visible={false} name="wall" receiveShadow castShadow>
                <boxGeometry args={[snap.room.d + fallOf, fallOf, snap.room.w + fallOf]} />
                <meshBasicMaterial wireframe color={"red"} />
            </mesh>
        </SnapConstraint>
        <Suspense fallback={null}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -snap.room.h / 2 - 0.001, 0]} name="floor" receiveShadow>
                <planeGeometry args={[snap.room.d, snap.room.w, 100, 100]} />
                <meshStandardMaterial map={colorMap} roughness={0.35} displacementScale={0.01} transparent />
            </mesh>
        </Suspense>
    </>
}
