import { HAS_TABLETOP } from '@/constants';
import { SnapConstraint } from '@/snapping-tools/snap-constraint';
import { store } from '@/store';
import { ModuleEntity } from '@/types';
import { useTexture } from '@react-three/drei';
import { ReactNode, useMemo } from 'react';
import { useSnapshot } from 'valtio';
import * as THREE from 'three';
import { TABLETOP_DEPTH, TABLETOP_FRONT_OVERHANG } from '@/lib/placement-geometry';

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
		texture.wrapS = THREE.RepeatWrapping;
		texture.wrapT = THREE.RepeatWrapping;
		texture.repeat.set(Math.max(1, width / 40), 1);
		texture.colorSpace = THREE.SRGBColorSpace;
		texture.needsUpdate = true;
		return texture;
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
	entity
}: {
	children: ReactNode;
	entity: ModuleEntity;
}) {
	const snap = useSnapshot(store);
	const tabletopWidth = entity.halfExtents[0] * 2 * 10;
	const cabinetDepth = entity.halfExtents[2] * 2;
	const tabletopDepth = TABLETOP_DEPTH;
	const tabletopLocalY = entity.size.y * 5 + snap.tabletop[0] * 5;
	// The room wall is behind the cabinet (+z), so its front edge is -z.
	// Solve from that front edge to leave exactly 30 mm of overhang.
	const tabletopLocalZ = (tabletopDepth - cabinetDepth) * 5 - TABLETOP_FRONT_OVERHANG * 10;

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
							args={[tabletopWidth, snap.tabletop[0] * 10, tabletopDepth * 10]}
						/>
						<TabletopMaterial
							value={snap.tabletopColor}
							width={tabletopWidth}
						/>
					</mesh>
				</SnapConstraint>
			)}

			{children}
		</group>
	);
}
