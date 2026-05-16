"use client";

import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { HandleVariant } from "./handle-variant";
import { useEffect, useMemo, useRef, memo } from "react";
import { EXPLICT_CASE_EXTRA_QPI } from "@/constants";
import { Group, Mesh } from "three";
import { ModuleEntity } from "@/types";

interface HandleProps {
    entity: ModuleEntity;
    model: Mesh;
}

const THROTTLE_MS = 16; // ~60 fps cap

function HandleComponent({ entity, model }: HandleProps) {
    const { scene } = useThree();
    const meshRef = useRef<Group>(null);
    const worldYRef = useRef(0);
    const acc = useRef(0);

    const flags = useMemo(() => {
        const includesNoneOfFlags = !model.name.includes("_H") && !model.name.includes("_V");
        const includesV = model.name.includes("_V");
        const includesH = model.name.includes("_H");
        return {
            includesNoneOfFlags,
            includesV,
            includesH,
            isH: includesNoneOfFlags || includesH,
            isV: includesV,
            flagH: entity.handles === "H",
            flagV: entity.handles !== "H",
            UMFAngle: entity.tags.includes(EXPLICT_CASE_EXTRA_QPI) ? Math.PI / 4 : 0,
        };
    }, [model.name, entity.handles, entity.tags]);

    /* ── 1. Immediate sync so first paint is correct ── */
    useEffect(() => {
        if (!meshRef.current) return;
        model.getWorldPosition(meshRef.current.position);
        model.getWorldQuaternion(meshRef.current.quaternion);
        worldYRef.current = meshRef.current.position.y;
    }, [model]);

    /* ── 2. Throttled frame loop ── */
    useFrame((_, delta) => {
        if (!meshRef.current) return;

        acc.current += delta * 1000;
        if (acc.current < THROTTLE_MS) return;
        acc.current %= THROTTLE_MS; // keep overshoot for smoother pacing

        model.getWorldPosition(meshRef.current.position);
        model.getWorldQuaternion(meshRef.current.quaternion);
        worldYRef.current = meshRef.current.position.y;
    });

    /* ── 3. Visibility cleanup ── */
    useEffect(() => {
        model.visible = false;
        return () => {
            model.visible = true;
        };
    }, [model]);

    return createPortal(
        <group ref={meshRef}>
            <group rotation={[0, flags.UMFAngle, 0]}>
                {((flags.includesH && flags.flagH) || (flags.includesNoneOfFlags && flags.flagH)) && (
                    <group rotation={[Math.PI / 2, 0, 0]}>
                        <HandleVariant
                            entity={entity}
                            worldYRef={worldYRef}
                            scale={0.05}
                            rotation={[0, Math.PI / 2, 0]}
                        />
                    </group>
                )}
                {((flags.isV && flags.flagV) || (flags.includesNoneOfFlags && flags.flagV)) && (
                    <group rotation={[Math.PI / 2, 0, 0]}>
                        <HandleVariant
                            entity={entity}
                            worldYRef={worldYRef}
                            scale={0.05}
                            rotation={[0, 0, 0]}
                        />
                    </group>
                )}
            </group>
        </group>,
        scene
    );
}

export const Handle = memo(HandleComponent);
