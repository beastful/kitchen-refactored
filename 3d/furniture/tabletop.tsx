import { HAS_TABLETOP } from "@/constants";
import { SnapConstraint } from "@/snapping-tools/snap-constraint";
import { store } from "@/store";
import { ModuleEntity } from "@/types";
import { useTexture } from "@react-three/drei";
import { ReactNode } from "react";
import { useSnapshot } from "valtio";

export function Tabletop({ children, entity }: { children: ReactNode, entity: ModuleEntity }) {
    const snap = useSnapshot(store)

    return <>
        <group>
            {entity.tags.includes(HAS_TABLETOP) && <SnapConstraint useCursor useDistance rotation={[0, 0, 0]} position={[0, 4.4, -entity.halfExtents[2] * 10 + 3.3]}>
                <mesh >
                    <meshStandardMaterial color={snap.tabletopColor} />
                    <boxGeometry args={[entity.halfExtents[0] * 2 * 10, 0.03 * 10, 0.7 * 10]} />
                </mesh>
            </SnapConstraint>}
            {children}
        </group>
    </>
}
