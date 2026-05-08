"use client"

import { useEffect, useState } from 'react';
import { useSnapshot } from 'valtio';
import { Vector3 } from 'three';
import { SnapCursor } from "@/snapping-tools/snap-cursor";
import { SnapPlacedObject } from "@/snapping-tools/placed-constraint";
import { store } from '@/store';
import { ModuleEntity, toModuleEntity } from '@/types';
import { FacadeConfig } from "@/3d/furniture/assembler"
import { ModuleMenu } from "@/3d/furniture/actions";
import { RoomWalls } from "@/3d/eviroment/room-walls";
import { Tabletop } from "@/3d/furniture/tabletop";
import { Gltf, Html } from '@react-three/drei';
import { CursorRoom } from '@/snapping-tools/cursor-room';
import { useCursorData } from '@/snapping-tools/hooks/use-cursor-data';

export default function Room() {
    const snap = useSnapshot(store);
    const CursorModel = snap.currentRawModule?.model ?? null;
    const cursorData = useCursorData()

    // const { cursorData } = useCursorData()
    // cursorData.intersectsBounds SnapBoxes[]
    // cursorData.intersections SnapBoxes[]
    // cursorData.intersections.length number
    // cursorData.position
    // cursorData.rotation
    // cursorData.halfExtent

    useEffect(() => {
        const handlePointerUp = () => {

        };

        window.addEventListener('pointerup', handlePointerUp, true);
        return () => window.removeEventListener('pointerup', handlePointerUp, true);
    }, []);

    return (
        <>
            <Html>
                {JSON.stringify(cursorData)}
            </Html>
            <CursorRoom width={snap.room.w} height={snap.room.h} depth={snap.room.d}>
                {CursorModel &&
                    <SnapCursor userData={{ layer: 'modules' }} name="cursor" scale={0.1}>
                        <CursorModel />
                    </SnapCursor>}
            </CursorRoom>

            <RoomWalls />

            {snap.modules.map(entity => {
                const EntityModel = entity.model;

                return (
                    <group key={entity.name} >
                        <SnapPlacedObject
                            position={entity.position.toArray()}
                            scale={0.1}
                            id={`placed-${entity.name}`}
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
