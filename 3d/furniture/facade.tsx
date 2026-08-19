"use client";

import { useEffect, memo } from "react";
import { EXPLICT_CASE_FOLD, EXPLICT_CASE_STRAIGHT, EXPLICT_CASE_TOP } from "@/constants";
import { Box3, Color, Mesh, MeshStandardMaterial } from "three";
import { ModuleEntity } from "@/types";
import { animationRegistry } from "@/3d/eviroment/animation-system";

/* ── Material cache ── */
const facadeMaterialCache = new Map<string, MeshStandardMaterial>();

function getFacadeMaterial(color: string | Color, opacity: number): MeshStandardMaterial {
    const hex = typeof color === "string" ? color : `#${color.getHexString()}`;
    const key = `${hex}-${opacity}`;
    if (!facadeMaterialCache.has(key)) {
        const mat = new MeshStandardMaterial({
            color: new Color(color),
            transparent: opacity < 1,
            opacity,
        });
        facadeMaterialCache.set(key, mat);
    }
    return facadeMaterialCache.get(key)!;
}

interface FacadeProps {
    entity: ModuleEntity;
    model: Mesh;
}

function canonicalNodeName(name: string): string {
    return name.replace(/[.]/g, "");
}

function FacadeComponent({ entity, model }: FacadeProps) {
    /* ── Material ── */
    useEffect(() => {
        const originalMaterial = model.material;
        const originalVisible = model.visible;
        const name = canonicalNodeName(model.name);
        // The shortened Gola door is the top-level F_F node. The similarly
        // named F_F.001 node belongs to the static Gola cabinet and is kept
        // out of the facade registry by FacadeConfig.
        const isGolaFacade = name === "M_SPL_1_F_F";

        let shouldShow = false;
        if (entity.facade === "Gola") {
            // The test GLB contains a dedicated shortened Gola facade. Match
            // both Blender names (with dots) and GLTFLoader names (without).
            shouldShow = isGolaFacade;
        } else if (model.name.includes(`_${entity.facade}`)) {
            shouldShow = true;
        } else if (
            !model.name.includes(`_A`) &&
            !model.name.includes(`_B`) &&
            !model.name.includes(`_C`) &&
            entity.facade === "Flat"
        ) {
            shouldShow = true;
        }

        // Use visibility so hidden facades cannot occlude the selected one
        // through depth writing.
        Object.assign(model, { visible: shouldShow });
        const material = getFacadeMaterial(entity.color, shouldShow ? 1 : 0);
        model.material = material;

        return () => {
            model.visible = originalVisible;
            model.material = originalMaterial;
        };
    }, [entity.color, entity.facade, model]);

    /* ── Register for centralized animation (no subscribe) ── */
    useEffect(() => {
        const originalX = model.position.x;
        const originalZ = model.position.z;
        const originalRotX = model.rotation.x;
        const originalRotY = model.rotation.y;
        const bounds = new Box3();
        model.geometry.computeBoundingBox();
        if (model.geometry.boundingBox) bounds.copy(model.geometry.boundingBox);

        // Correct1 has a real hinged door mesh but no pivot node. Keep the
        // selected side edge fixed while rotating the mesh around Y.
        const sideSign = Math.sign(originalX) || 1;
        const hingeLocalX = sideSign >= 0 ? bounds.min.x : bounds.max.x;
        const hingeLocalZ = (bounds.min.z + bounds.max.z) / 2;

        animationRegistry.facades.set(model.uuid, {
            mesh: model,
            originalX,
            originalZ,
            originalRotX,
            hingeSign: sideSign,

            originalRotY,
            hingeLocalX,
            hingeLocalZ,
            hingePivotX: originalX + hingeLocalX,
            hingePivotZ: originalZ + hingeLocalZ,
            entity,
        });

        return () => {
            animationRegistry.facades.delete(model.uuid);
            model.position.x = originalX;
            model.position.z = originalZ;
            model.rotation.x = originalRotX;
            model.rotation.y = originalRotY;
        };
    }, [model, entity]);

    return null;
}

export const Facade = memo(FacadeComponent, (prevProps, nextProps) => {
    return (
        prevProps.model === nextProps.model &&
        prevProps.entity.color === nextProps.entity.color &&
        prevProps.entity.facade === nextProps.entity.facade &&
        prevProps.entity.tags?.join(",") === nextProps.entity.tags?.join(",")
    );
});
