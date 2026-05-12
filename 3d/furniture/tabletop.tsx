import { HAS_TABLETOP } from "@/constants";
import { store } from "@/store";
import { ModuleEntity } from "@/types";
import { useTexture } from "@react-three/drei";
import { ReactNode } from "react";
import { useSnapshot } from "valtio";

export function Tabletop({ children, entity }: { children: ReactNode, entity: ModuleEntity }) {
    const snap = useSnapshot(store)
 const matcapTexture = useTexture('matcaps/mc1.png');

    return <>
        <group>
            {entity.tags.includes(HAS_TABLETOP) && <mesh position={[0, 4.4, -entity.halfExtents[2] * 10 + 3.3]}>
                <meshMatcapMaterial matcap={matcapTexture} color={snap.tabletopColor} />
                <boxGeometry args={[entity.halfExtents[0] * 2 * 10, 0.03 * 10, 0.7 * 10]} />
            </mesh>}
            {children}
        </group>
    </>
}
