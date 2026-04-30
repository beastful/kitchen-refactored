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
import { toModuleEntity } from '@/types';
import { Model as M_2YNSD_1 } from "@/modules/2YNSD_JSX/M_2YNSD_1"

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

// ─── Кнопка поворота ───
function RotateButton({ onRotate }: { onRotate: () => void }) {
    return (
        <Html center position={[0, 1.3, 0]} style={{ pointerEvents: 'auto' }}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onRotate();
                }}
                style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: '2px solid white',
                    background: '#2196F3',
                    color: 'white',
                    fontSize: 16,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
            >
                ↻
            </button>
        </Html>
    );
}

// ─── Компонент сцены ───
export default function Room() {
    const snap = useSnapshot(store);
    const getPlacementData = usePlacementData();

    const [debugPlacement, setSebugPlacement] = useState<any>(null);

    // Размещение по pointerup
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

    const handleRotate = useCallback((id: string) => {
        const module = store.modules.find(m => m.id === id);
        if (module) module.openAngle += Math.PI / 2;
    }, []);

    // ─── Динамическая модель для курсора ───
    // Важно: PascalCase переменная для JSX
    const CursorModel = snap.currentRawModule?.model ?? null;

    return (
        <>
           
        
            {/* Курсор — только при drag */}
            {CursorModel && (
                <SnapCursor userData={{ layer: 'modules' }} name="cursor" scale={0.1}>
                    <CursorModel />
                </SnapCursor>
            )}

            {/* Constraints */}
            <SnapConstraint userData={{ layer: 'modules' }} name="wall-back" useCursor useDistance position={[0, 0, -2]}>
                <Wall />
            </SnapConstraint>

            <SnapConstraint userData={{ layer: 'modules' }} name="wall-left" useCursor useDistance rotation={[0, Math.PI / 2, 0]} position={[-2, 0, 0]}>
                <Wall />
            </SnapConstraint>

            <SnapConstraint userData={{ layer: 'modules' }} name="wall-right" useCursor useDistance rotation={[0, Math.PI / 2, 0]} position={[2, 0, 0]}>
                <Wall />
            </SnapConstraint>

            <SnapConstraint useCursor useDistance position={[0, -1.25, 0]}>
                <Floor />
            </SnapConstraint>

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
                            halfExtents={entity.halfExtents}
                            snapPlanes={entity.snapPlanes}
                            useDistance={true}
                        >
                            {EntityModel && <EntityModel />}
                            <RotateButton onRotate={() => handleRotate(entity.id)} />
                        </SnapPlacedObject>
                    </group>
                );
            })}
        </>
    );
}
