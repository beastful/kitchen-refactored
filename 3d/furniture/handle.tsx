"use client";

import { createPortal, useFrame } from "@react-three/fiber";
import { HandleVariant } from "./handle-variant";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, memo } from "react";
import { EXPLICT_CASE_EXTRA_QPI } from "@/constants";
import { Box3, Color, Group, Material, Mesh, MeshStandardMaterial, Object3D, Quaternion, Vector3 } from "three";
import { ModuleEntity } from "@/types";

interface HandleProps {
    entity: ModuleEntity;
    model: Mesh;
}

const THROTTLE_MS = 16; // ~60 fps cap

const golaProfileMaterialCache = new Map<string, MeshStandardMaterial>();

function getGolaProfileMaterial(color: Color): MeshStandardMaterial {
    const hex = color.getHexString();
    if (!golaProfileMaterialCache.has(hex)) {
        golaProfileMaterialCache.set(hex, new MeshStandardMaterial({ color: new Color(color) }));
    }
    return golaProfileMaterialCache.get(hex)!;
}

function canonicalNodeName(name: string): string {
    return name.replace(/[.]/g, "");
}

function HandleComponent({ entity, model }: HandleProps) {
    const meshRef = useRef<Group>(null);
    const canonicalName = canonicalNodeName(model.name);
    const isGolaProfile = canonicalName === "M_SPL_1_PNT_GOLA" || canonicalName === "M_SPL_1_F_F001";
    const acc = useRef(0);
    const [portalTarget, setPortalTarget] = useState<Object3D | null>(null);

    // Mount the rendered handle into a stable, always-visible ancestor of the
    // _PNT anchor. Attaching directly to the anchor's parent (the door mesh)
    // made handles vanish for A/B/C facades: the base door is hidden when a
    // variant facade is shown, and three.js skips invisible subtrees. Climb
    // past the facade meshes to the module root instead and position the
    // handle from the anchor's world transform every frame, so it stays flush
    // with the door surface and still follows door animations.
    useLayoutEffect(() => {
        if (isGolaProfile) return;

        let frame = 0;

        const attachToVisibleRoot = () => {
            const parent = model.parent;
            if (!parent) {
                frame = requestAnimationFrame(attachToVisibleRoot);
                return;
            }

            let node: Object3D = model;
            while (node.parent && isFacadeMesh(node.parent)) {
                node = node.parent;
            }
            setPortalTarget(node.parent || parent);
        };

        attachToVisibleRoot();

        return () => cancelAnimationFrame(frame);
    }, [isGolaProfile, model]);

    useLayoutEffect(() => {
        if (!isGolaProfile) return;

        const originalMaterial: Material | Material[] = model.material;
        const originalVisible = model.visible;
        Object.assign(model, {
            visible: entity.facade === "Gola",
            material: getGolaProfileMaterial(entity.handleColor),
        });

        return () => {
            Object.assign(model, {
                visible: originalVisible,
                material: originalMaterial,
            });
        };
    }, [entity.facade, entity.handleColor, isGolaProfile, model]);

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
            isGola: entity.facade === "Gola",
            UMFAngle: entity.tags.includes(EXPLICT_CASE_EXTRA_QPI) ? Math.PI / 4 : 0,
        };
    }, [model.name, entity.facade, entity.handles, entity.tags]);

    const syncHandleTransform = useCallback(() => {
        const mesh = meshRef.current;
        const root = portalTarget;
        const facade = model.parent;
        if (!mesh || !root || !facade) return;

        facade.updateWorldMatrix(true, false);
        root.updateWorldMatrix(true, false);

        // `_PNT` is a technical point placed slightly in front of the facade.
        // Use the actual facade surface as the handle anchor; otherwise the
        // handle keeps the GLTF's built-in gap and visibly floats in front.
        // The portal lives on the module root, so convert the surface point
        // from facade space into the root's local space.
        _worldPoint.copy(getFacadeSurfacePosition(model)).applyMatrix4(facade.matrixWorld);
        mesh.position.copy(root.worldToLocal(_worldPoint));

        // Same for orientation: express the anchor's world rotation in the
        // root's local frame so the handle swings together with the door.
        model.getWorldQuaternion(_worldQuat);
        root.getWorldQuaternion(_rootQuat);
        mesh.quaternion.copy(_rootQuat.invert().multiply(_worldQuat));

        // The portal parent inherits the module's scale (SnapPlaced 0.1 x
        // corrective modelScale). Compensate it so the handle geometry is
        // rendered at its authored world size, not shrunk ~10x.
        _parentScale.set(1, 1, 1);
        root.getWorldScale(_parentScale);
        mesh.scale.set(
            1 / _parentScale.x,
            1 / _parentScale.y,
            1 / _parentScale.z
        );
    }, [model, portalTarget]);

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
        if (isGolaProfile) return;

        // The anchor is intentionally hidden; the actual handle is rendered
        // through the portal above.
        const anchor = model as Mesh;
        setObjectVisibility(anchor, false);
        return () => {
            setObjectVisibility(anchor, true);
        };
    }, [isGolaProfile, model]);

    if (isGolaProfile || !portalTarget) return null;

    return createPortal(
        <group ref={meshRef}>
            <group rotation={[0, flags.UMFAngle, 0]}>
                {!flags.isGola && ((flags.includesH && flags.flagH) || (flags.includesNoneOfFlags && flags.flagH)) && (
                    <group rotation={[Math.PI / 2, 0, 0]}>
                        <HandleVariant
                            key={`handle-${entity.id}-${entity.handleVariant}-H`}
                            entity={entity}
                            scale={0.05}
                            rotation={[0, Math.PI / 2, 0]}
                        />
                    </group>
                )}
                {!flags.isGola && ((flags.isV && flags.flagV) || (flags.includesNoneOfFlags && flags.flagV)) && (
                    <group rotation={[Math.PI / 2, 0, 0]}>
                        <HandleVariant
                            key={`handle-${entity.id}-${entity.handleVariant}-V`}
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
const _worldPoint = new Vector3();
const _worldQuat = new Quaternion();
const _rootQuat = new Quaternion();
const HANDLE_SURFACE_CLEARANCE = 0.002;

function isFacadeMesh(object: Object3D): boolean {
    return object instanceof Mesh && object.name.includes("_F");
}

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
