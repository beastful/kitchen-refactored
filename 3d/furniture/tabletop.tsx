import { HAS_TABLETOP } from '@/constants';
import { SnapConstraint } from '@/snapping-tools/snap-constraint';
import { store } from '@/store';
import { ModuleEntity } from '@/types';
import { useTexture } from '@react-three/drei';
import { ReactNode, useMemo } from 'react';
import { useSnapshot } from 'valtio';
import * as THREE from 'three';
import {
	FLOOR_MODULE_HEIGHT,
	TABLETOP_DEPTH,
	TABLETOP_FRONT_OVERHANG
} from '@/lib/placement-geometry';

const isTextureValue = (value?: string | null) => {
	if (!value) return false;

	return (
		value.startsWith('/') ||
		value.startsWith('./') ||
		value.startsWith('../') ||
		value.startsWith('http://') ||
		value.startsWith('https://') ||
		/\.(png|jpe?g|webp|avif|gif)$/i.test(value)
	);
};

function TabletopMaterial({ value, width }: { value: string; width: number }) {
	if (!isTextureValue(value)) {
		return <meshStandardMaterial color={value} />;
	}

	return <TexturedTabletopMaterial src={value} width={width} />;
}

function TexturedTabletopMaterial({
	src,
	width
}: {
	src: string;
	width: number;
}) {
	const texture = useTexture(src);

	const preparedTexture = useMemo(() => {
		const prepared = texture.clone();
		prepared.wrapS = THREE.RepeatWrapping;
		prepared.wrapT = THREE.RepeatWrapping;
		prepared.repeat.set(Math.max(1, width / 40), 1);
		prepared.colorSpace = THREE.SRGBColorSpace;
		prepared.needsUpdate = true;
		return prepared;
	}, [texture, width]);

	return (
		<meshStandardMaterial
			map={preparedTexture}
			color='#ffffff'
			roughness={0.35}
			metalness={0.05}
		/>
	);
}

export function Tabletop({
	children,
	entity,
	renderedHeight
}: {
	children: ReactNode;
	entity: ModuleEntity;
	/** Measured height of the normalized GLB inside the sibling Center group. */
	renderedHeight?: number | null;
}) {
	const snap = useSnapshot(store);
	if (!entity) return <group>{children}</group>;

	const storedHalfExtents = entity.halfExtents;
	const hasValidHalfExtents = storedHalfExtents.every((value) => value > 0);
	const halfExtents = hasValidHalfExtents
		? [...storedHalfExtents]
		: [entity.size.x / 2, entity.size.y / 2, entity.size.z / 2];
	const tabletop = (snap.tabletop ?? [0.026, 'Скиф 26', 600]) as [number, string, number];
	const tabletopWidth = halfExtents[0] * 2 * 10;
	const tabletopDepth = TABLETOP_DEPTH;
	// Position the countertop by its real front overhang instead of a fixed
	// offset. The cabinet is centered at zero and the local scene is scaled by
	// 0.1, so convert the world dimensions to the module's local units.
	const cabinetHeightLocal =
		renderedHeight ??
		(entity.type === 'floor'
			? FLOOR_MODULE_HEIGHT * 10
			: halfExtents[1] * 2 * 10);
	const tabletopLocalY =
		cabinetHeightLocal / 2 +			(tabletop[0] * 10) / 2 +
		0.001 * 10;
	// The GLB facade is on the +Z side of the cabinet. Keep the tabletop's
	// front edge 30 mm in front of that side; the remaining depth stays behind
	// the cabinet, providing the expected clearance at the wall.
	const tabletopLocalZ =
		halfExtents[2] * 10 +
		TABLETOP_FRONT_OVERHANG * 10 -
		(tabletopDepth * 10) / 2;

	return (
		<group>
			{entity.tags.includes(HAS_TABLETOP) && (
				<SnapConstraint
					useCursor
					useDistance
					rotation={[0, 0, 0]}
					position={[0, tabletopLocalY, tabletopLocalZ]}>
					<mesh>
						<boxGeometry
							args={[tabletopWidth, tabletop[0] * 10, tabletopDepth * 10]}
						/>
						<TabletopMaterial
							value={snap.tabletopColor ?? '#8E8478'}
							width={tabletopWidth}
						/>
					</mesh>
				</SnapConstraint>
			)}

			{children}
		</group>
	);
}
