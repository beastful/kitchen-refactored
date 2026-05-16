"use client"

import { ReactNode, Suspense, useEffect, useRef, useState } from 'react';
import { useSnapshot } from 'valtio';
import { Vector3 } from 'three';
import { SnapCursor } from "@/snapping-tools/snap-cursor";
import { SnapPlacedObject } from "@/snapping-tools/placed-constraint";
import { usePlacementData } from "@/snapping-tools/hooks/use-placement-data";
import { Store, store } from '@/store';
import { ModuleEntity, toModuleEntity } from '@/types';
import { FacadeConfig } from "@/3d/furniture/assembler"
import { ModuleMenu } from "@/3d/furniture/actions";
import { RoomWalls } from "@/3d/eviroment/room-walls";
import { Tabletop } from "@/3d/furniture/tabletop";
import { Center, Gltf, Html } from '@react-three/drei';
import { useSnapContext } from '@/snapping-tools/snap-provider';
import { CATEGORY_ROOM, CATEGORY_TECH, EXPLICT_CASE_WINDOW } from '@/constants';
import { getLock, useLock } from '@/lib/use-lock';
import { CursorRoom } from '@/snapping-tools/cursor-room';
import { SnapPlane } from '@/snapping-tools/types';

function ZCorrection({ children, halfExtents, entity }: { children: ReactNode, halfExtents: [number, number, number], entity: ModuleEntity }) {
    const largest_z = 0.73;
    const z = halfExtents[2] * 2;
    const type = entity.type;
    const dontMove = entity.tags.includes(CATEGORY_TECH) || entity.tags.includes(CATEGORY_ROOM) || type == "wall";
    const pos_z = dontMove == true ? 0 : ((largest_z - z) * 10) - 0.5;

    return <group position={[0, 0, pos_z]}>
        {children}
    </group>
}

export default function Room() {
    const snap = useSnapshot(store);
    const getPlacementData = usePlacementData();
    const { lockY, lock } = useLock()
    const visibilityRef = useRef<boolean>(true);

    useEffect(() => {
        const handlePointerUp = () => {
            if (!store.currentRawModule) return;
            const result = getPlacementData();

            if (!result.possible) {
                console.log('Cannot place:', result.reason);
                return;
            }

            if (visibilityRef.current) {
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
    }, [lock, snap.wallHeight]);

    useEffect(() => {
        const mods = snap.modules;
        for (let i = 0; i < mods.length; i++) {
            if (mods[i].type == 'wall') {
                const ld = getLock(mods[i] as ModuleEntity, snap as Store);
                store.modules[i].lock = ld.lock
            }
        }
    }, [snap.wallHeight, lock]);

    const c_name = snap.currentRawModule?.name.split("_");
    const c_folder = `${c_name?.[0]}_${c_name?.[1]}`;

    return (
        <>
            <CursorRoom
                visibilityChange={(v) => {
                    visibilityRef.current = v;
                }}
                width={snap.room.w}
                height={snap.room.h}
                depth={snap.room.d}
                show={!!store.currentRawModule}>
                {snap.currentRawModule?.name && (
                    <SnapCursor lockY={lockY} lock={lock} userData={{ layer: 'modules' }} name="cursor" scale={0.1}>
                        {typeof snap.currentRawModule?.model != "string" && (
                            <Gltf src={`modules/${c_folder}/${snap.currentRawModule?.name}.glb`} />
                        )}
                        {typeof snap.currentRawModule?.model == "string" && (
                            <Gltf src={snap.currentRawModule.model} />
                        )}
                    </SnapCursor>
                )}
            </CursorRoom>
            <RoomWalls />

            {snap.modules.map(entity => {
                const EntityModel = entity.model;
                const e_name = entity.name.split("_");
                const e_folder = `${e_name[0]}_${e_name[1]}`

                return (
                    <group key={`placed-${entity.id}`} >
                        <SnapPlacedObject
                            position={entity.position.toArray()}
                            scale={0.1}
                            lockY={entity.lockY}
                            lock={entity.lock}
                            id={`placed-${entity.id}`}
                            rotation={[0, entity.openAngle, 0]}
                            halfExtents={entity.halfExtents as [number, number, number]}
                            snapPlanes={entity.snapPlanes as SnapPlane[]}
                            useDistance={true}
                        >

                            {EntityModel && <Suspense fallback={null}> <ModuleMenu entity={entity as ModuleEntity}>

                                <Tabletop entity={entity as ModuleEntity}>
                                    <ZCorrection entity={entity as ModuleEntity} halfExtents={entity.halfExtents as [number, number, number]}>
                                        <Center>
                                            {entity.tags.includes(CATEGORY_TECH) || entity.tags.includes(CATEGORY_ROOM) == true ? (
                                                 <>
                                                    {typeof entity.model != "string" && (
                                                        <Gltf src={`modules/${e_folder}/${entity.name}.glb`} />
                                                    )}

                                                    {typeof entity.model == "string" && (
                                                        <Gltf src={entity.model} />
                                                    )}
                                                </>
                                            ) : (
                                                 <>
                                                    {typeof entity.model != "string" && (
                                                        <FacadeConfig src={`modules/${e_folder}/${entity.name}.glb`} entity={entity as ModuleEntity} />
                                                    )}

                                                    {typeof entity.model == "string" && (
                                                        <FacadeConfig src={entity.model} entity={entity as ModuleEntity} />
                                                    )}
                                                </>
                                            )}
                                        </Center>
                                    </ZCorrection>
                                </Tabletop>
                            </ModuleMenu>
                            </Suspense>}
                        </SnapPlacedObject>
                    </group>
                );
            })}
        </>
    );
}
