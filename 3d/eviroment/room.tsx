"use client"

import { useEffect, useState } from 'react';
import { useSnapshot } from 'valtio';
import { Vector3 } from 'three';
import { SnapCursor } from "@/snapping-tools/snap-cursor";
import { SnapPlacedObject } from "@/snapping-tools/placed-constraint";
import { usePlacementData } from "@/snapping-tools/hooks/use-placement-data";
import { store } from '@/store';
import { ModuleEntity, toModuleEntity } from '@/types';
import { FacadeConfig } from "@/3d/furniture/assembler"
import { ModuleMenu } from "@/3d/furniture/actions";
import { RoomWalls } from "@/3d/eviroment/room-walls";
import { Tabletop } from "@/3d/furniture/tabletop";
import { Gltf, Html } from '@react-three/drei';
import { useSnapContext } from '@/snapping-tools/snap-provider';
import { CATEGORY_TECH, EXPLICT_CASE_WINDOW } from '@/constants';
import { getLock, useLock } from '@/lib/use-lock';

export default function Room() {
    const snap = useSnapshot(store);
    const getPlacementData = usePlacementData();
    const { lockY, lock } = useLock()

    useEffect(() => {
        const handlePointerUp = () => {
            if (!store.currentRawModule) return;
            const result = getPlacementData();

            if (!result.possible) {
                console.log('Cannot place:', result.reason);
                return;
            }
            const placement = result.data!;
            const position = new Vector3(...placement.position);
            const normal = new Vector3(0, 0, 1);

            const entity = toModuleEntity(store.currentRawModule, position, normal);
            entity.openAngle = placement.rotation[1];
            const snapPlanes = placement.snapPlanes.map(plane => ({
                point: [...plane.point] as [number, number, number],
                normal: [...plane.normal] as [number, number, number]
            }));

            entity.lockY = lockY;
            entity.lock = lock;
            entity.snapPlanes = snapPlanes;
            entity.halfExtents = placement.halfExtents;
            entity.id = crypto.randomUUID();
            store.modules.push(entity);
            store.currentRawModule = null;
        };

        window.addEventListener('pointerup', handlePointerUp, true);
        return () => window.removeEventListener('pointerup', handlePointerUp, true);
    }, [getPlacementData]);

     useEffect(() => {
        const mods = snap.modules;
        for (let i = 0; i < mods.length; i++) {
            if (mods[i].type == 'wall') {
                const pos = mods[i].position.clone();
                const ld = getLock(mods[i], snap);
                store.modules[i].lock = ld.lock
            }
        }
    }, [snap.wallHeight]);

    const CursorModel = snap.currentRawModule?.model ?? null;
    return (
        <>
            <Html>
                {JSON.stringify(lockY) + ` ` + JSON.stringify(lock)}
            </Html>
            {CursorModel && (
                <SnapCursor lockY={lockY} lock={lock} userData={{ layer: 'modules' }} name="cursor" scale={0.1}>
                    <CursorModel />
                </SnapCursor>
            )}
            <RoomWalls />

            {snap.modules.map(entity => {
                const EntityModel = entity.model;

                return (
                    <group key={`placed-${entity.id}`} >
                        <SnapPlacedObject
                            position={entity.position.toArray()}
                            scale={0.1}
                            lockY={entity.lockY}
                            lock={entity.lock}
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
                                <Tabletop entity={entity as ModuleEntity}>
                                    <FacadeConfig entity={entity as ModuleEntity}>
                                        <Gltf src={`/${entity.name}.glb`} />
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
