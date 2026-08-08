"use client";

import { createPortal, useFrame } from "@react-three/fiber";
import { HandleVariant } from "./handle-variant";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, memo } from "react";
import { EXPLICT_CASE_EXTRA_QPI } from "@/constants";
import { Group, Mesh, Object3D, Vector3 } from "three";
import { ModuleEntity } from "@/types";

interface HandleProps {
    entity: ModuleEntity;
    model: Mesh;
}

const THROTTLE_MS = 16; // ~60 fps cap
const worldPosition = new Vector3();

function HandleComponent({ entity, model }: HandleProps) {
    const meshRef = useRef<Group>(null);
    const worldYRef = useRef(0);
    const acc = useRef(0);
    const [portalTarget, setPortalTarget] = useState<Object3D | null>(null);

    // Keep the handle in the same scaled GLTF parent as its anchor point.
    // Portaling directly to the scene loses the module's corrective scale.
    useLayoutEffect(() => {
        let frame = 0;

        const attachToModelParent = () => {
            if (model.parent) {
                setPortalTarget(model.parent);
                return;
            }

            frame = requestAnimationFrame(attachToModelParent);
        };

        attachToModelParent();

        return () => cancelAnimationFrame(frame);
    }, [model]);

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

    const syncHandleTransform = useCallback(() => {
        if (!meshRef.current || !model.parent) return;

        model.updateWorldMatrix(true, false);

        // The portal is attached to model.parent, so copy the anchor's local
        // transform. This preserves the exact corrective scale and orientation.
        meshRef.current.position.copy(model.position);
        meshRef.current.quaternion.copy(model.quaternion);
        meshRef.current.scale.copy(model.scale);

        model.getWorldPosition(worldPosition);
        worldYRef.current = worldPosition.y;
    }, [model]);

    /* ── 1. Immediate sync so first paint is correct ── */
    useEffect(() => {
        syncHandleTransform();
    }, [syncHandleTransform, portalTarget]);

    /* ── 2. Throttled frame loop ── */
    useFrame((_, delta) => {
        if (!meshRef.current) return;

        acc.current += delta * 1000;
        if (acc.current < THROTTLE_MS) return;
        acc.current %= THROTTLE_MS; // keep overshoot for smoother pacing
        syncHandleTransform();
    });

    /* ── 3. Visibility cleanup ── */
    useEffect(() => {
        model.visible = false;
        return () => {
            model.visible = true;
        };
    }, [model]);

    if (!portalTarget) return null;

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
        portalTarget
    );
}

export const Handle = memo(HandleComponent);
