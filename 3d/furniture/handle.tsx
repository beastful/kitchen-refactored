"use client";

import { createPortal, useFrame } from "@react-three/fiber";
import { HandleVariant } from "./handle-variant";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, memo } from "react";
import { EXPLICT_CASE_EXTRA_QPI } from "@/constants";
import { Box3, Group, Mesh, Object3D, Vector3 } from "three";
import { ModuleEntity } from "@/types";

interface HandleProps {
    entity: ModuleEntity;
    model: Mesh;
}

const THROTTLE_MS = 16; // ~60 fps cap

function HandleComponent({ entity, model }: HandleProps) {
    const meshRef = useRef<Group>(null);
    const acc = useRef(0);
    const [portalTarget, setPortalTarget] = useState<Object3D | null>(null);

    // Mount the rendered handle into the same GLTF parent as its _PNT anchor.
    // This keeps the handle in the facade's local coordinate system and makes
    // it follow the facade when a door is animated.
    useLayoutEffect(() => {
        let frame = 0;

        const attachToAnchorParent = () => {
            if (model.parent) {
                setPortalTarget(model.parent);
                return;
            }

            frame = requestAnimationFrame(attachToAnchorParent);
        };

        attachToAnchorParent();

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

        model.parent.updateWorldMatrix(true, false);
        model.updateWorldMatrix(true, false);

        // `_PNT` is a technical point placed slightly in front of the facade.
        // Use the actual facade surface as the handle anchor; otherwise the
        // handle keeps the GLTF's built-in gap and visibly floats in front.
        meshRef.current.position.copy(getFacadeSurfacePosition(model));
        meshRef.current.quaternion.copy(model.quaternion);

        // The portal parent inherits the module's scale (SnapPlaced 0.1 x
        // corrective modelScale). Compensate it so the handle geometry is
        // rendered at its authored world size, not shrunk ~10x.
        _parentScale.set(1, 1, 1);
        model.parent.getWorldScale(_parentScale);
        meshRef.current.scale.set(
            1 / _parentScale.x,
            1 / _parentScale.y,
            1 / _parentScale.z
        );
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
        acc.current %= THROTTLE_MS;
        syncHandleTransform();
    });

    /* ── 3. Hide only the invisible anchor mesh, not its facade parent. */
    useEffect(() => {
        // The anchor is intentionally hidden; the actual handle is rendered
        // through the portal above.
        const anchor = model as Mesh;
        setObjectVisibility(anchor, false);
        return () => {
            setObjectVisibility(anchor, true);
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
                            scale={0.05}
                            rotation={[0, Math.PI / 2, 0]}
                        />
                    </group>
                )}
                {((flags.isV && flags.flagV) || (flags.includesNoneOfFlags && flags.flagV)) && (
                    <group rotation={[Math.PI / 2, 0, 0]}>
                        <HandleVariant
                            entity={entity}
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

const _parentScale = new Vector3();
const _surfaceBounds = new Box3();
const HANDLE_SURFACE_CLEARANCE = 0.002;

function setObjectVisibility(object: Object3D, visible: boolean) {
    object.visible = visible;
}

function getFacadeSurfacePosition(anchor: Mesh): Vector3 {
    const facade = anchor.parent;
    const position = getGeometryCenterInParent(anchor);

    if (!(facade instanceof Mesh) || !facade.geometry) {
        return position;
    }

    // Some GLBs store the `_PNT` position in the node transform, while
    // others bake it into the point mesh geometry. Reading only
    // `anchor.position` therefore breaks one of the two model families.
    // The geometry center handles both representations.
    facade.geometry.computeBoundingBox();
    const bounds = facade.geometry.boundingBox;
    if (!bounds) return position;

    _surfaceBounds.copy(bounds);
    const centerZ = (_surfaceBounds.min.z + _surfaceBounds.max.z) / 2;
    const outward = position.z >= centerZ ? 1 : -1;
    const surfaceZ = outward > 0 ? _surfaceBounds.max.z : _surfaceBounds.min.z;

    position.z = surfaceZ + outward * HANDLE_SURFACE_CLEARANCE;
    return position;
}

function getGeometryCenterInParent(object: Mesh): Vector3 {
    object.geometry.computeBoundingBox();
    const bounds = object.geometry.boundingBox;
    if (!bounds) return object.position.clone();

    const center = bounds.getCenter(new Vector3());
    object.updateMatrix();
    return center.applyMatrix4(object.matrix);
}

export const Handle = memo(HandleComponent);
