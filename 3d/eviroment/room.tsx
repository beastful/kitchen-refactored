"use client"

import { ReactNode, Suspense, useEffect, useRef, useState, useMemo, memo, useCallback } from 'react';
import { useSnapshot } from 'valtio';
import { subscribe } from 'valtio';
import { Vector3 } from 'three';
import { SnapCursor } from "@/snapping-tools/snap-cursor";
import { SnapPlacedObject } from "@/snapping-tools/placed-constraint";
import { usePlacementData } from "@/snapping-tools/hooks/use-placement-data";
import { store } from '@/store';
import { ModuleEntity, toModuleEntity } from '@/types';
import { FacadeConfig } from "@/3d/furniture/assembler"
import { MeasuredModel } from "@/3d/furniture/measured-model"
import { ModuleMenu } from "@/3d/furniture/actions";
import { RoomWalls } from "@/3d/eviroment/room-walls";
import { Tabletop } from "@/3d/furniture/tabletop";
import { Center, Gltf } from '@react-three/drei';
import { CATEGORY_ROOM, CATEGORY_TECH, EXPLICT_CASE_TUNNEL } from '@/constants';
import { getLock, useLock } from '@/lib/use-lock';
import { CursorRoom } from '@/snapping-tools/cursor-room';
import { SnapPlane } from '@/snapping-tools/types';
import { AnimationSystem } from './animation-system';
import { MemoryAudit } from './memory-audit';

function ZCorrection({ children, halfExtents, entity }: { children: ReactNode, halfExtents: [number, number, number], entity: ModuleEntity }) {
    const largest_z = 0.73;
    const z = halfExtents[2] * 2;
    const type = entity.type;
    const dontMove = entity.tags.includes(CATEGORY_TECH) || entity.tags.includes(CATEGORY_ROOM) || type == "wall";
    const pos_z = dontMove == true ? 0 : ((largest_z - z) * 10) - 0.5;
    const isWindowOrDoor = entity.tags.includes(EXPLICT_CASE_TUNNEL) || entity.name == "Door";

    return <group position={[0, 0, isWindowOrDoor == true ? -1 : pos_z]}>
        {children}
    </group>
}

// ── Stable module IDs + hydration-safe version key ──
// Detects both array mutation (push/pop) and array replacement (localStorage hydration)
function useModuleIds() {
    const [ids, setIds] = useState(() => store.modules.map(m => m.id));
    const [version, setVersion] = useState(0);
    const prevRef = useRef({ ids: store.modules.map(m => m.id), array: store.modules });

    useEffect(() => {
        return subscribe(store, () => {
            const currentArray = store.modules;
            const newIds = currentArray.map(m => m.id);
            const prev = prevRef.current;

            // Array was replaced (e.g. localStorage hydration) → remount everything
            if (currentArray !== prev.array) {
                setVersion(v => v + 1);
                setIds(newIds);
                prevRef.current = { ids: newIds, array: currentArray };
                return;
            }

            // Array mutated (push/pop) → update IDs, React handles add/remove
            if (newIds.length !== prev.ids.length || newIds.some((id, i) => id !== prev.ids[i])) {
                setIds(newIds);
                prevRef.current = { ids: newIds, array: currentArray };
            }
        });
    }, []);

    return { ids, version };
}

// ── Isolated cursor: subscribes to store but only updates React state on real changes ──
const CursorSystem = memo(function CursorSystem({
    lockY,
    lock,
    visibilityRef,
}: {
    lockY: any;
    lock: any;
    visibilityRef: React.MutableRefObject<boolean>;
}) {
    const [cursor, setCursor] = useState(() => ({
        name: store.currentRawModule?.name ?? null as string | null,
        model: store.currentRawModule?.model,
        room: { w: store.room.w, h: store.room.h, d: store.room.d }
    }));

    useEffect(() => {
        return subscribe(store, () => {
            const raw = store.currentRawModule;
            const next = {
                name: raw?.name ?? null,
                model: raw?.model,
                room: { w: store.room.w, h: store.room.h, d: store.room.d }
            };

            setCursor(prev => {
                if (prev.name === next.name && prev.model === next.model &&
                    prev.room.w === next.room.w && prev.room.h === next.room.h && prev.room.d === next.room.d) {
                    return prev; // bail out — no React re-render
                }
                return next;
            });
        });
    }, []);

    const handleVisibility = useCallback((v: boolean) => {
        visibilityRef.current = v;
    }, [visibilityRef]);

    if (!cursor.name) return null;

    const c_parts = cursor.name.split("_");
    const c_folder = c_parts.length > 1
        ? c_parts.slice(0, -1).join("_")
        : c_parts[0];

    return (
        <CursorRoom
            visibilityChange={handleVisibility}
            width={cursor.room.w}
            height={cursor.room.h}
            depth={cursor.room.d}
            show={true}
        >
            <SnapCursor lockY={lockY} lock={lock} userData={{ layer: 'modules' }} name="cursor" scale={0.1}>
                {typeof cursor.model != "string" && cursor.model && (
                    <Center>
                        <Gltf src={`modules/${c_folder}/${cursor.name}.glb`} />
                    </Center>
                )}
                {typeof cursor.model == "string" && (
                    <Center>
                        <Gltf src={cursor.model} />
                    </Center>
                )}
            </SnapCursor>
        </CursorRoom>
    );
});

// ── Per-module shell: reactive via useSnapshot on the module proxy ──
// version is passed so useMemo recalculates the proxy after hydration
const ModuleShell = memo(function ModuleShell({ id, version }: { id: string; version: number }) {
    const moduleProxy = useMemo(() => store.modules.find(m => m.id === id), [id, version]);
    if (!moduleProxy) return null;

    const entity = useSnapshot(moduleProxy);
    const e_parts = entity.name.split("_");
    const e_folder = e_parts.length > 1
        ? e_parts.slice(0, -1).join("_")
        : e_parts[0];

    return (
        <group>
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
                <Suspense fallback={null}>
                    <ModuleMenu entity={entity as ModuleEntity}>
                        <Tabletop entity={entity as ModuleEntity}>
                            <ZCorrection entity={entity as ModuleEntity} halfExtents={entity.halfExtents as [number, number, number]}>
                                <Center>
                                    {entity.tags.includes(CATEGORY_TECH) || entity.tags.includes(CATEGORY_ROOM) == true ? (
                                        <>
                                            {typeof entity.model != "string" && (
                                                <MeasuredModel src={`modules/${e_folder}/${entity.name}.glb`} entity={entity as ModuleEntity} />
                                            )}
                                            {typeof entity.model == "string" && (
                                                <MeasuredModel src={entity.model} entity={entity as ModuleEntity} />
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
                </Suspense>
            </SnapPlacedObject>
        </group>
    );
});

export default function Room() {
    const getPlacementData = usePlacementData();
    const { lockY, lock } = useLock();
    const visibilityRef = useRef<boolean>(true);
    const { ids, version } = useModuleIds();

    // Mutable refs for stable event listener
    const getPlacementDataRef = useRef(getPlacementData);
    const lockYRef = useRef(lockY);
    const lockRef = useRef(lock);
    getPlacementDataRef.current = getPlacementData;
    lockYRef.current = lockY;
    lockRef.current = lock;

    // ── Placement: stable listener, reads mutable refs directly ──
    useEffect(() => {
        const handlePointerUp = () => {
            if (!store.currentRawModule) return;
            const result = getPlacementDataRef.current();

            if (!result.possible) {
                console.log('Cannot place:', result.reason);
                return;
            }
            if (visibilityRef.current) {
                console.log('Cannot place: visibility blocked');
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

            entity.lockY = lockYRef.current;
            entity.lock = lockRef.current;
            entity.snapPlanes = snapPlanes;
            entity.halfExtents = placement.halfExtents;
            entity.id = crypto.randomUUID();
            store.modules.push(entity);
            store.currentRawModule = null;
        };

        window.addEventListener('pointerup', handlePointerUp, true);
        return () => window.removeEventListener('pointerup', handlePointerUp, true);
    }, []); // ← empty: no stale closures

    // ── Wall locking: recalculates on wallHeight change (via subscription) and lock change (via effect) ──
    useEffect(() => {
        const recalc = () => {
            const modules = store.modules;
            for (let i = 0; i < modules.length; i++) {
                const mod = modules[i];
                if (mod.type === 'wall' && mod.name !== "Window") {
                    const ld = getLock(mod as ModuleEntity, store);
                    if (mod.lock !== ld.lock) {
                        mod.lock = ld.lock;
                    }
                }
            }
        };

        recalc(); // initial + when lock changes

        let lastWallHeight = store.wallHeight;
        return subscribe(store, () => {
            if (store.wallHeight !== lastWallHeight) {
                lastWallHeight = store.wallHeight;
                recalc();
            }
        });
    }, [lock]);

    return (
        <>
            <AnimationSystem />
            <Suspense>
                {/* <MemoryAudit /> */}
                <CursorSystem lockY={lockY} lock={lock} visibilityRef={visibilityRef} />
            </Suspense>
            <RoomWalls />

            {ids.map(id => (
                <ModuleShell key={`placed-${id}-${version}`} id={id} version={version} />
            ))}
        </>
    );
}