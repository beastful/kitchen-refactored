"use client"

import { OrbitControls, Html } from "@react-three/drei";
import { ThreeElements } from '@react-three/fiber';
import { useEffect, useCallback, useState } from 'react';
import { useSnapshot } from 'valtio';
import { Vector3 } from 'three';
import { SnapCursor } from "@/snapping-tools/snap-cursor";
import { SnapConstraint } from "@/snapping-tools/snap-constraint";
import { SnapPlacedObject } from "@/snapping-tools/placed-constraint";
import { usePlacementData } from "@/snapping-tools/hooks/use-placement-data";
import { store } from '@/store';
import { ModuleEntity, toModuleEntity } from '@/types';
import { Model as M_2YNSD_1 } from "@/modules/2YNSD_JSX/M_2YNSD_1"
import { FacadeConfig } from "@/components/legacy/facade-config"
import { ModuleMenu } from "@/components/legacy/module-menu";
import { RoomWalls } from "@/components/interior/room-walls";
import { Tabletop } from "@/components/interior/tabletop";

// ─── Модели ───
function Box4(props: ThreeElements["group"]) {
    return (
        <group userData={{ layer: 'modules' }} {...props}>
            <M_2YNSD_1 />
        </group>
    );
}

function Wall(props: ThreeElements["group"]) {
    return (
        <group {...props}>
            <mesh><boxGeometry args={[4, 2.5, 0.1]} /><meshPhongMaterial color="green" /></mesh>
        </group>
    );
}

function Floor(props: ThreeElements["group"]) {
    return (
        <group {...props}>
            <mesh><boxGeometry args={[5, 0.01, 5]} /><meshPhongMaterial color="brown" /></mesh>
        </group>
    );
}

export default function Room() {
    const snap = useSnapshot(store);
    const getPlacementData = usePlacementData();
    const [debugPlacement, setSebugPlacement] = useState<any>(null);

    useEffect(() => {
        const handlePointerUp = () => {
            if (!store.currentRawModule) return;

            const result = getPlacementData();
            if (!result.possible) {
                console.log('Cannot place:', result.reason);
                return;
            }
            setSebugPlacement(result)
            const placement = result.data!;
            const position = new Vector3(...placement.position);
            const normal = new Vector3(0, 0, 1);

            const entity = toModuleEntity(store.currentRawModule, position, normal);
            entity.openAngle = placement.rotation[1];
            const snapPlanes = placement.snapPlanes.map(plane => ({
                point: [...plane.point] as [number, number, number],
                normal: [...plane.normal] as [number, number, number]
            }));

            entity.snapPlanes = snapPlanes;
            entity.halfExtents = placement.halfExtents;

            store.modules.push(entity);
            store.currentRawModule = null;
        };

        window.addEventListener('pointerup', handlePointerUp, true);
        return () => window.removeEventListener('pointerup', handlePointerUp, true);
    }, [getPlacementData]);

    const CursorModel = snap.currentRawModule?.model ?? null;
    return (
        <>


            {/* Курсор — только при drag */}
            {CursorModel && (
                <SnapCursor userData={{ layer: 'modules' }} name="cursor" scale={0.1}>
                    <CursorModel />
                </SnapCursor>
            )}
            <RoomWalls />

            {/* Размещённые модули */}
            {snap.modules.map(entity => {
                // PascalCase для динамического компонента
                const EntityModel = entity.model;

                return (
                    <group key={entity.id} >
                        <SnapPlacedObject
                            position={entity.position.toArray()}
                            scale={0.1}
                            id={`placed-${entity.id}`}
                            rotation={[0, entity.openAngle, 0]}
                            halfExtents={[...entity.halfExtents]}
                            snapPlanes={entity.snapPlanes.map(plane => ({
                                point: [...plane.point],
                                normal: [...plane.normal]
                            }))}
                            useDistance={true}
                        >
                            {EntityModel && <ModuleMenu entity={entity as ModuleEntity}>
                                <Tabletop entity={entity}>
                                    <FacadeConfig entity={entity}>
                                        <EntityModel />
                                    </FacadeConfig>
                                </Tabletop>
                            </ModuleMenu>}
                        </SnapPlacedObject>
                    </group>
                );
            })}
        </>
    );
}
