import { HAS_TABLETOP } from "@/constants";
import { SnapConstraint } from "@/snapping-tools/snap-constraint";
import { store } from "@/store";
import { ModuleEntity } from "@/types";
import { useTexture } from "@react-three/drei";
import { ReactNode } from "react";
import { useSnapshot } from "valtio";

const DBG = true;

export function Tabletop({ children, entity }: { children: ReactNode, entity: ModuleEntity }) {
    const snap = useSnapshot(store)
    const yPos = entity.size.y * 5 + snap.tabletop[0] * 5;

    if (DBG && entity.tags.includes(HAS_TABLETOP)) {
        console.log(`[Tabletop] ${entity.displayName || entity.name}:`);
        console.log(`  entity.size.y = ${entity.size.y}`);
        console.log(`  entity.position.y = ${entity.position.y}`);
        console.log(`  snap.tabletop[0] (thickness) = ${snap.tabletop[0]}`);
        console.log(`  yPos (local scaled) = ${yPos}`);
        console.log(`  module top world = ${entity.position.y + entity.size.y / 2}`);
        console.log(`  tabletop center world = ${entity.position.y + (entity.size.y * 5 + snap.tabletop[0] * 5) * 0.1}`);
        console.log(`  tabletop bottom world = ${entity.position.y + (entity.size.y * 5) * 0.1}`);
    }

    return <>
        <group>
            {entity.tags.includes(HAS_TABLETOP) && <SnapConstraint useCursor useDistance rotation={[0, 0, 0]} position={[0, yPos, -entity.halfExtents[2] * 10 + 3.3]}>
                <mesh >
                    <meshStandardMaterial color={snap.tabletopColor} />
                    <boxGeometry args={[entity.halfExtents[0] * 2 * 10, snap.tabletop[0] * 10, 0.7 * 10]} />
                </mesh>
            </SnapConstraint>}
            {children}
        </group>
    </>
}
