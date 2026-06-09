import { HAS_TABLETOP } from "@/constants";
import { SnapConstraint } from "@/snapping-tools/snap-constraint";
import { store } from "@/store";
import { ModuleEntity } from "@/types";
import { Html, useTexture } from "@react-three/drei";
import { ReactNode } from "react";
import { useSnapshot } from "valtio";

const DBG = true; // set false to hide debug labels

export function Tabletop({ children, entity }: { children: ReactNode, entity: ModuleEntity }) {
    const snap = useSnapshot(store)
    const yPos = entity.size.y * 5 + snap.tabletop[0] * 5;

    return <>
        <group>
           
            {entity.tags.includes(HAS_TABLETOP) && <SnapConstraint useCursor useDistance rotation={[0, 0, 0]} position={[0, yPos, -entity.halfExtents[2] * 10 + 3.3]}>
                <mesh >
                    <meshStandardMaterial color={snap.tabletopColor} />
                    <boxGeometry args={[entity.halfExtents[0] * 2 * 10, snap.tabletop[0] * 10, 0.7 * 10]} />
                </mesh>
                {DBG && <Html position={[0, yPos + 0.8, 0]}>
                    <div style={{ background: 'rgba(255,0,0,0.85)', color: '#fff', padding: '2px 6px', borderRadius: 3, fontSize: 11, whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                        🔴 Столешница Y={yPos.toFixed(3)} (size.y={entity.size.y}, tt={snap.tabletop[0]})<br/>
                        Мир: posY={entity.position.y.toFixed(3)} → верх={(entity.position.y + entity.size.y/2).toFixed(3)}
                    </div>
                </Html>}
            </SnapConstraint>}
            {children}
        </group>
    </>
}
