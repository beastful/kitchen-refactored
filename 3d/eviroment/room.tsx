"use client"

import { Suspense, useEffect, useState } from 'react';
import { useSnapshot } from 'valtio';
import { Vector3 } from 'three';
import { SnapCursor } from "@/snapping-tools/snap-cursor";
import { SnapPlacedObject } from "@/snapping-tools/placed-constraint";
import { store } from '@/store';
import { ModuleDef, ModuleEntity, toModuleEntity } from '@/types';
import { FacadeConfig } from "@/3d/furniture/assembler"
import { ModuleMenu } from "@/3d/furniture/actions";
import { RoomWalls } from "@/3d/eviroment/room-walls";
import { Tabletop } from "@/3d/furniture/tabletop";
import { CursorRoom } from '@/snapping-tools/cursor-room';
import { useCursorData } from '@/snapping-tools/hooks/use-cursor-data';
import { getLock, getLockByType } from '@/lib/get-lock';
import { Html } from '@react-three/drei';
import { EXPLICT_CASE_TUNNEL } from '@/constants';

function ZCorrection({ halfExtents, position, entity, children }) {
    const e = 0.328
    const isFloor = entity.type == 'floor'
    const isTunnel = entity.tags.includes(EXPLICT_CASE_TUNNEL)

    return <group position={[0, 0, isTunnel == true ? -1.5 : (isFloor == true ? (-2 * halfExtents[2] * 10) + 6.9 : 0)]}>
        {children}
    </group>
}

export default function Room() {
    const snap = useSnapshot(store);
    const CursorModel = snap.currentRawModule?.model ?? null;
    const { cursorData } = useCursorData()
    const lockData = getLockByType()

    useEffect(() => {
        const handlePointerUp = () => {
            if (!store.currentRawModule) return;
            const position = cursorData.snapbox.position;
            const normal = new Vector3(0, 0, 1);
            const [hex, hey, hez] = cursorData.snapbox.halfExtents;
            const entity = toModuleEntity(store.currentRawModule, position, normal);
            entity.openAngle = cursorData.snapbox.rotation.y;
            entity.halfExtents = [hex, hey, hez];
            store.modules.push(entity);
            store.currentRawModule = null;
            entity.intersections = [...cursorData.intersections];
            entity.id = crypto.randomUUID();
            entity.lock = lockData.lock;
            entity.lockY = lockData.lockY;
        };

        window.addEventListener('pointerup', handlePointerUp, true);
        return () => window.removeEventListener('pointerup', handlePointerUp, true);
    }, [cursorData]);

    useEffect(() => {
        const mods = snap.modules;
        for (let i = 0; i < mods.length; i++) {
            if (mods[i].type == 'wall') {
                const pos = mods[i].position.clone();
                const ld = getLock(mods[i], snap);
                store.modules[i].lock = ld.lock
            }
            // -(snap.room.h / 2 - cursorData.snapbox.halfExtents.y) + snap.wallHeight + 0.9
        }
    }, [snap.wallHeight]);

    return (
        <>
            <CursorRoom width={snap.room.w} height={snap.room.h} depth={snap.room.d} show={!!store.currentRawModule}>
                {CursorModel &&
                    <SnapCursor
                        lockX={false}
                        lockY={lockData.lockY}
                        lockZ={false}
                        lock={lockData.lock}
                        userData={{ layer: 'modules' }}
                        name="cursor"
                        scale={0.1}>
                        <CursorModel />
                    </SnapCursor>}
            </CursorRoom>

            <RoomWalls />

            {snap.modules.map(entity => {
                const EntityModel = entity.model;

                return (
                    <group key={`placed-${entity.id}`} >

                        <SnapPlacedObject
                            id={`snapplaced-${entity.id}`}
                            scale={0.1}
                            position={entity.position.toArray()}
                            rotation={[0, entity.openAngle, 0]}
                            halfExtents={[...entity.halfExtents]}
                            intersections={[...entity.intersections]}
                            lockX={entity.lockX}
                            lockY={entity.lockY}
                            lockZ={entity.lockZ}
                            lock={entity.lock}
                            useDistance={true}
                        >
                            {EntityModel && <ModuleMenu entity={entity as ModuleEntity}>
                                <Suspense fallback={null}>
                                    <Tabletop entity={entity as ModuleEntity}>
                                        <ZCorrection entity={entity} position={entity.position} halfExtents={entity.halfExtents}>
                                            <FacadeConfig src={`/${entity.name}.glb`} entity={entity as ModuleEntity} />
                                        </ZCorrection>
                                    </Tabletop>
                                </Suspense>
                            </ModuleMenu>}
                        </SnapPlacedObject>
                    </group >
                );
            })}
        </>
    );
}
