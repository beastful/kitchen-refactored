import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { HandleVariant } from "./handle-variant";
import { useEffect, useRef, useState } from "react";
import { EXPLICT_CASE_EXTRA_QPI } from "@/constants";
import { Group, Mesh } from "three";
import { ModuleEntity } from "@/types";

interface HandleProps {
    entity: ModuleEntity;
    model: Mesh;
}

export function Handle({ entity, model }: HandleProps) {
    const { scene } = useThree()
    const meshRef = useRef<Group>(null)
    const [worldY, setWorldY] = useState(0);
    const includesNoneOfFlags = !model.name.includes("_H") && !model.name.includes("_V");
    const includesV = model.name.includes("_V");
    const includesH = model.name.includes("_H");
    const isH = includesNoneOfFlags || includesH;
    const isV = includesV;
    const flagH = entity.handles == "H";
    const flagV = entity.handles != "H";
    const UMFAngle = entity.tags.includes(EXPLICT_CASE_EXTRA_QPI) == true ? Math.PI / 4 : 0;

    useFrame(() => {
        if (!model || !meshRef.current) return
        model.getWorldPosition(meshRef.current.position)
        model.getWorldQuaternion(meshRef.current.quaternion)
        setWorldY(meshRef.current.position.y)
    })

    useEffect(() => {
        model.visible = false
    }, [])

    return createPortal(
        <group ref={meshRef}>
            <group rotation={[0, UMFAngle, 0]}>
                {((includesH && flagH) || (includesNoneOfFlags && flagH)) && (
                    <group rotation={[Math.PI / 2, 0, 0]}>
                        <HandleVariant worldY={worldY} entity={entity} scale={0.05} rotation={[0, Math.PI / 2, 0]} />
                    </group>
                )}
                {(isV && flagV) || (includesNoneOfFlags && flagV) && (
                    <group rotation={[Math.PI / 2, 0, 0]}>
                        <HandleVariant worldY={worldY} entity={entity} scale={0.05} rotation={[0, 0, 0]} />
                    </group>
                )}
            </group>
        </group>,
        scene
    )
}
