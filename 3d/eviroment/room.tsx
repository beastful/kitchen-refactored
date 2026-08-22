'use client';

import {
	ReactNode,
	Suspense,
	useEffect,
	useRef,
	useState,
	useMemo,
	memo,
	useCallback
} from 'react';
import { useSnapshot } from 'valtio';
import { subscribe } from 'valtio';
import { Vector3 } from 'three';
import { SnapCursor } from '@/snapping-tools/snap-cursor';
import { SnapPlacedObject } from '@/snapping-tools/placed-constraint';
import { usePlacementData } from '@/snapping-tools/hooks/use-placement-data';
import { store } from '@/store';
import { ModuleEntity, ModulePlacementSource, toModuleEntity } from '@/types';
import { FacadeConfig } from '@/3d/furniture/assembler';
import { MeasuredModel } from '@/3d/furniture/measured-model';
import {
	ModuleErrorBoundary,
	ModuleLoadingPlaceholder
} from '@/3d/furniture/module-error-boundary';
import { ModuleMenu } from '@/3d/furniture/actions';
import { RoomWalls } from '@/3d/eviroment/room-walls';
import { Tabletop } from '@/3d/furniture/tabletop';
import { Center } from '@react-three/drei';
import { CATEGORY_ROOM, CATEGORY_TECH, EXPLICT_CASE_TUNNEL } from '@/constants';
import { getLock, useLock } from '@/lib/use-lock';
import { CursorRoom } from '@/snapping-tools/cursor-room';
import { SnapPlane } from '@/snapping-tools/types';
import { AnimationSystem } from './animation-system';
import { LocalRuler } from './local-ruler';
import { FLOOR_MODULE_WALL_GAP } from '@/lib/placement-geometry';

function getModuleModelSrc(name: string, modelPath?: string): string {
	if (modelPath) return modelPath;

	const parts = name.split('_');
	const folder = parts.length > 1 ? parts.slice(0, -1).join('_') : parts[0];
	return `modules/${folder}/${name}.glb`;
}

function ZCorrection({
	children,
	halfExtents,
	entity
}: {
	children: ReactNode;
	halfExtents: [number, number, number];
	entity: ModuleEntity;
}) {
	const type = entity.type;
	const z = halfExtents[2] * 2;
	const dontMove =
		entity.tags.includes(CATEGORY_TECH) ||
		entity.tags.includes(CATEGORY_ROOM) ||
		type == 'wall' ||
		type == 'floor';
	// Lower modules are normalized to their placement slot and must not receive
	// the legacy depth correction that used to pull them toward the front.
	const pos_z = dontMove ? 0 : (0.73 - z) * 10 - 0.5;
	const isWindowOrDoor =
		entity.tags.includes(EXPLICT_CASE_TUNNEL) || entity.name == 'Door';

	return (
		<group position={[0, 0, isWindowOrDoor == true ? -1 : pos_z]}>
			{children}
		</group>
	);
}

// ── Stable module IDs + hydration-safe version key ──
function useModuleIds() {
	const [ids, setIds] = useState(() => store.modules.map((m) => m.id));
	const prevRef = useRef({
		ids: store.modules.map((m) => m.id),
		array: store.modules
	});

	useEffect(() => {
		return subscribe(store, () => {
			const currentArray = store.modules;
			const newIds = currentArray.map((m) => m.id);
			const prev = prevRef.current;

			if (currentArray !== prev.array) {
				setIds(newIds);
				prevRef.current = { ids: newIds, array: currentArray };
				return;
			}

			if (
				newIds.length !== prev.ids.length ||
				newIds.some((id, i) => id !== prev.ids[i])
			) {
				setIds(newIds);
				prevRef.current = { ids: newIds, array: currentArray };
			}
		});
	}, []);

	return { ids };
}

// ── Isolated cursor: subscribes to store but only updates React state on real changes ──
const CursorSystem = memo(function CursorSystem({
	lockY,
	lock,
	visibilityRef
}: {
	lockY: boolean;
	lock: Vector3;
	visibilityRef: import('react').MutableRefObject<boolean>;
}) {
	const [cursor, setCursor] = useState<{
		source: ModulePlacementSource | null;
		name: string | null;
		type: string | null;
		model: ModulePlacementSource['model'] | undefined;
		modelPath: string | undefined;
		room: { w: number; h: number; d: number };
	}>(() => ({
		source: store.currentRawModule,
		name: store.currentRawModule?.name ?? null,
		type: store.currentRawModule?.type ?? null,
		model: store.currentRawModule?.model,
		modelPath: store.currentRawModule?.modelPath,
		room: { w: store.room.w, h: store.room.h, d: store.room.d }
	}));

	useEffect(() => {
		return subscribe(store, () => {
			const raw = store.currentRawModule;
			const next = {
				source: raw,
				name: raw?.name ?? null,
				type: raw?.type ?? null,
				model: raw?.model,
				modelPath: raw?.modelPath,
				room: { w: store.room.w, h: store.room.h, d: store.room.d }
			};

			setCursor((prev) => {
				if (
					prev.source === next.source &&
					prev.name === next.name &&
					prev.type === next.type &&
					prev.model === next.model &&
					prev.modelPath === next.modelPath &&
					prev.room.w === next.room.w &&
					prev.room.h === next.room.h &&
					prev.room.d === next.room.d
				) {
					return prev;
				}
				return next;
			});
		});
	}, []);

	const handleVisibility = useCallback(
		(v: boolean) => {
			visibilityRef.current = v;
		},
		[visibilityRef]
	);

	// Use the same classified/normalized model as the placed module. Measuring
	// the raw GLB here makes the cursor and its tabletop hitbox larger whenever
	// a model was exported in a different unit scale.
	const previewEntity = useMemo(
		() => cursor.source ? toModuleEntity(cursor.source, new Vector3()) : null,
		[cursor.source]
	);
	const previewSrc = cursor.source && cursor.model
		? typeof cursor.model === 'string'
			? cursor.model
			: getModuleModelSrc(cursor.name ?? '', cursor.modelPath)
		: null;
	const isMeasuredPreview = Boolean(
		previewEntity &&
		(previewEntity.tags.includes(CATEGORY_TECH) || previewEntity.tags.includes(CATEGORY_ROOM))
	);
	const previewModel = previewEntity && previewSrc ? (
		isMeasuredPreview ? (
			<MeasuredModel src={previewSrc} entity={previewEntity} />
		) : (
			<FacadeConfig src={previewSrc} entity={previewEntity} />
		)
	) : null;

	if (!cursor.name || !previewModel) return null;

	return (
		<CursorRoom
			visibilityChange={handleVisibility}
			width={cursor.room.w}
			height={cursor.room.h}
			depth={cursor.room.d}
			show={true}>
			<SnapCursor
				lockY={lockY}
				lock={lock}
				wallGap={cursor.type === 'floor' ? FLOOR_MODULE_WALL_GAP : 0}
				userData={{ layer: 'modules' }}
				name='cursor'
				scale={0.1}>
				<Center>{previewModel}</Center>
			</SnapCursor>
		</CursorRoom>
	);
});

// ── Per-module shell ──
const ModuleShell = memo(function ModuleShell({
	id
}: {
	id: string;
}) {
	const snap = useSnapshot(store);
	const entity = snap.modules.find((module) => module.id === id);
	const [renderedHeight, setRenderedHeight] = useState<number | null>(null);
	const handleCentered = useCallback(({ height }: { height: number }) => {
		setRenderedHeight((previous) => previous === height ? previous : height);
	}, []);

	if (!entity) return null;

	const storedHalfExtents = entity.halfExtents;
	const hasValidHalfExtents = storedHalfExtents.every((value) => value > 0);
	const halfExtents = (hasValidHalfExtents
		? [...storedHalfExtents]
		: [entity.size.x / 2, entity.size.y / 2, entity.size.z / 2]) as [
		number,
		number,
		number
	];

	return (
		<group>
			{snap.ruler && <LocalRuler entity={entity as ModuleEntity} />}
			<SnapPlacedObject
				position={entity.position.toArray()}
				scale={0.1}
				lockY={entity.lockY}
				lock={entity.lock}
				id={`placed-${entity.id}`}
				rotation={[0, entity.openAngle, 0]}
				halfExtents={halfExtents}
				snapPlanes={entity.snapPlanes as SnapPlane[]}
				useDistance={true}>
				<Suspense fallback={<ModuleLoadingPlaceholder />}>
					<ModuleMenu entity={entity as ModuleEntity}>
						<Tabletop
							entity={entity as ModuleEntity}
							renderedHeight={renderedHeight}>
							<ZCorrection
								entity={entity as ModuleEntity}
								halfExtents={halfExtents}>
								<Center onCentered={handleCentered}>
									{entity.tags.includes(CATEGORY_TECH) ||
									entity.tags.includes(CATEGORY_ROOM) == true ? (
										<ModuleErrorBoundary
											moduleName={entity.displayName || entity.name}>
											{typeof entity.model != 'string' && (
												<MeasuredModel
														src={getModuleModelSrc(entity.name, entity.modelPath)}
													entity={entity as ModuleEntity}
												/>
											)}
											{typeof entity.model == 'string' && (
												<MeasuredModel
													src={entity.model}
													entity={entity as ModuleEntity}
												/>
											)}
										</ModuleErrorBoundary>
									) : (
										<ModuleErrorBoundary
											moduleName={entity.displayName || entity.name}>
											{typeof entity.model != 'string' && (
												<FacadeConfig
														src={getModuleModelSrc(entity.name, entity.modelPath)}
													entity={entity as ModuleEntity}
												/>
											)}
											{typeof entity.model == 'string' && (
												<FacadeConfig
													src={entity.model}
													entity={entity as ModuleEntity}
												/>
											)}
										</ModuleErrorBoundary>
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
	const { ids } = useModuleIds();

	const getPlacementDataRef = useRef(getPlacementData);
	const lockYRef = useRef(lockY);
	const lockRef = useRef(lock);

	getPlacementDataRef.current = getPlacementData;
	lockYRef.current = lockY;
	lockRef.current = lock;

	// ── Placement: single source via currentRawModule ──
	useEffect(() => {
		const handlePointerUp = () => {
			const source = store.currentRawModule;
			if (!source) return;

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

			// currentRawModule can contain either a catalog definition or a copied
			// entity; toModuleEntity performs the runtime discrimination.
			const entity = toModuleEntity(source, position, normal);
			entity.openAngle = placement.rotation[1];

			const snapPlanes = placement.snapPlanes.map((plane) => ({
				point: [...plane.point] as [number, number, number],
				normal: [...plane.normal] as [number, number, number],
				offset: plane.offset,
			}));

			entity.lockY = lockYRef.current;
			entity.lock = lockRef.current.clone();
			entity.snapPlanes = snapPlanes;
			entity.halfExtents = [...placement.halfExtents] as [
				number,
				number,
				number
			];

			store.modules.push(entity);
			store.currentRawModule = null;
		};

		window.addEventListener('pointerup', handlePointerUp, true);
		return () => window.removeEventListener('pointerup', handlePointerUp, true);
	}, []);

	// ── Wall locking ──
	useEffect(() => {
		const recalc = () => {
			const modules = store.modules;
			for (let i = 0; i < modules.length; i++) {
				const mod = modules[i];
				if (mod.type === 'wall' && mod.name !== 'Window') {
					const ld = getLock(mod as ModuleEntity, store);
					if (mod.lock !== ld.lock) {
						mod.lock = ld.lock;
					}
				}
			}
		};

		recalc();

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

			{ids.map((id) => (
				<ModuleShell key={`placed-${id}`} id={id} />
			))}
		</>
	);
}
