import { SnapConstraint } from "@/snapping-tools/snap-constraint"
import { store } from "@/store"
import { Text, useTexture } from "@react-three/drei";
import { Suspense, useEffect, useRef } from "react";
import { useSnapshot } from "valtio"
import * as THREE from 'three';
import { RaycastRuler } from "./raycast-ruler";
import LocalMeasurements from "./local-ruler";

export function RoomWalls() {
    const snap = useSnapshot(store)
    const depth = 0.06;
    const ruler_wal_gap = 0.005
    const ruler_top_factor = 1.7
    const ruler_bottom_factor = 0.6
    const [colorMap] = useTexture([
        'assets/laminate_floor_02_diff_1k.jpg'
    ])
    //   const matcapTexture = useTexture('matcaps/mc3.png');
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
    }, []);
    // if (!matcapTexture) return null;


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
            <group>
                {/* Size display — fine-tune vars */}
                {(() => {
                    // --- CONFIG: adjust these to tweak the look ---
                    const sdThick = 0.02;            // bar thickness (X)
                    const sdDepth = 0.01;            // bar depth    (Z)
                    const sdBaseH = 0.860 + snap.tabletop[0];           // bottom segment height (plinth / leg)
                    const sdModuleH = snap.wallHeight; // middle segment height (module / wall)
                    const sdTopH = 0.76;            // top segment height    (crown / upper)
                    const sdGap = 0.02;            // gap between segments
                    const sdX = -snap.room.d * 0.5 + depth * 0.5;
                    const sdZ = -snap.room.w * 0.5;
                    const floorY = -snap.room.h / 2;
                    // --- positions calculated from the floor up ---

                    const yBase = floorY + sdBaseH / 2;
                    const yModule = floorY + sdBaseH + sdGap + sdModuleH / 2;
                    const yTop = floorY + sdBaseH + sdGap + sdModuleH + sdGap + sdTopH / 2;
                    return (
                        <group>
                            <group position={[sdX, yTop, sdZ]}>
                                <Text
                                    position={[0.1, 0, 0.01]}
                                    fontSize={0.06}
                                    color={"#000"}
                                    anchorX="center"
                                    anchorY="middle"
                                    rotation={[0, 0, Math.PI / 2]}
                                >
                                    {`0.72m`}
                                </Text>
                                <mesh><boxGeometry args={[sdThick, sdTopH, sdDepth]} /><meshMatcapMaterial color={"#000"} /></mesh>
                            </group>
                            <group position={[sdX, yModule, sdZ]}>
                                <Text
                                    position={[0.1, 0, 0.01]}
                                    fontSize={0.06}
                                    color={"#000"}
                                    anchorX="center"
                                    anchorY="middle"
                                    rotation={[0, 0, Math.PI / 2]}
                                >
                                    {String(snap.wallHeight) + "m"}
                                </Text>
                                <mesh><boxGeometry args={[sdThick, sdModuleH, sdDepth]} /><meshMatcapMaterial color={"#000"} /></mesh>
                            </group>
                            <group position={[sdX, yBase, sdZ]}>
                                <Text
                                    position={[0.1, 0, 0.01]}
                                    fontSize={0.06}
                                    color={"#000"}
                                    anchorX="center"
                                    anchorY="middle"
                                    rotation={[0, 0, Math.PI / 2]}
                                >
                                    {Number(82.2) + Number(snap.tabletop[0]) + "m"}
                                </Text>
                                <mesh><boxGeometry args={[sdThick, sdBaseH, sdDepth]} /><meshMatcapMaterial color={"#000"} /></mesh>
                            </group>
                        </group>
                    );
                })()}
            </group>
        </>}
        {/* {"Size display"} */}


        <SnapConstraint userData={{ layer: 'modules' }} name="wall-z" useCursor useDistance position={[0, 0, snap.room.w * 0.5 + depth * 0.5]}>
            <mesh name="wall" receiveShadow castShadow>
                <boxGeometry args={[snap.room.d, snap.room.h, depth]} />
                <meshMatcapMaterial color={snap.roomColor} />
            </mesh>
        </SnapConstraint>

        {/* Right wall — 1m stub from back corner */}
        <SnapConstraint userData={{ layer: 'modules' }} name="wall-x" useCursor useDistance position={[snap.room.d * 0.5 + depth * 0.5, 0, snap.room.w * 0.5 - 0.5]}>
            <mesh name="wall" receiveShadow castShadow>
                <boxGeometry args={[depth, snap.room.h, 1]} />
                <meshMatcapMaterial color={snap.roomColor} />
            </mesh>
        </SnapConstraint>

        {/* Left wall — 1m stub from back corner */}
        <SnapConstraint userData={{ layer: 'modules' }} name="wall-x" useCursor useDistance position={[-snap.room.d * 0.5 - depth * 0.5, 0, snap.room.w * 0.5 - 0.5]}>
            <mesh name="wall" receiveShadow castShadow>
                <boxGeometry args={[depth, snap.room.h, 1]} />
                <meshMatcapMaterial color={snap.roomColor} />
            </mesh>
        </SnapConstraint>

        {/* Front wall — 1m stub at right corner */}
        <SnapConstraint userData={{ layer: 'modules' }} name="wall-z" useCursor useDistance position={[snap.room.d * 0.5 - 0.5, 0, -snap.room.w * 0.5 - depth * 0.5]}>
            <mesh name="wall" receiveShadow castShadow>
                <boxGeometry args={[1, snap.room.h, depth]} />
                <meshMatcapMaterial color={snap.roomColor} />
            </mesh>
        </SnapConstraint>

        <SnapConstraint userData={{ layer: 'modules' }} name="wall-m" useCursor useDistance position={[-snap.room.d * 0.5 + depth * 0.5 - depth, 0, -snap.room.w * 0.5 - depth * 0.5 + 0.1]}>
            <mesh visible={false} name="wall" receiveShadow castShadow>
                <boxGeometry args={[depth, snap.room.h, 0.2]} />
                <meshMatcapMaterial color={snap.roomColor} />
            </mesh>
        </SnapConstraint>

        <SnapConstraint userData={{ layer: 'modules' }} name="wall-m" useCursor useDistance position={[-snap.room.d * 0.5 + depth * 0.5 - depth, 0, snap.room.w * 0.5 - depth * 0.5 - 0.1]}>
            <mesh visible={false} name="wall" receiveShadow castShadow>
                <boxGeometry args={[depth, snap.room.h, 0.2]} />
                <meshMatcapMaterial color={snap.roomColor} />
            </mesh>
        </SnapConstraint>

        <SnapConstraint useCursor useDistance rotation={[0, 0, 0]} position={[0, -snap.room.h / 2 - 0.001 + (depth / 2), 0]}>
            <mesh name="floor" receiveShadow>
                <boxGeometry args={[snap.room.d, depth / 2, snap.room.w]} />
                <meshStandardMaterial map={colorMap} roughness={0.35} displacementScale={0.01} transparent />
            </mesh>
        </SnapConstraint>
    </>
}
