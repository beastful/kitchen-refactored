"use client";

import { memo, useEffect, useLayoutEffect } from "react";
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

function getColorHex(color: Color): string {
    return new Color(color).getHexString();
}

function FacadeComponent({ entity, model }: FacadeProps) {
    /* ── Material ── */
    useLayoutEffect(() => {
        const originalMaterial = model.material;
        const name = canonicalNodeName(model.name);
        const isCorrect1 = entity.name === "M_SPL_1_CORRECT1";
        const correct1FacadeNodes: Record<string, string> = {
            A: "M_SPL_1_F_A",
            B: "M_SPL_1_F_B",
            C: "M_SPL_1_F_C",
            // D is the ribbed fourth facade. F is reserved for the shortened
            // Gola facade and must never be shown in the regular modes.
            Flat: "M_SPL_1_F_D",
            Gola: "M_SPL_1_F_F",
        };

        let shouldShow = false;
        if (isCorrect1) {
            shouldShow = name === correct1FacadeNodes[entity.facade];
        } else if (name.includes(`_${entity.facade}`)) {
            shouldShow = true;
        } else if (
            !name.includes(`_A`) &&
            !name.includes(`_B`) &&
            !name.includes(`_C`) &&
            entity.facade === "Flat"
        ) {
            shouldShow = true;
        }

        // Use visibility so hidden facades cannot occlude the selected one
        // through depth writing. Assign the material to the selected mesh as
        // well, so a GLB's baked white material cannot win over the picker.
        const colorHex = getColorHex(entity.color);
        Object.assign(model, {
            visible: shouldShow,
            material: getFacadeMaterial(`#${colorHex}`, 1),
        });

        return () => {
            Object.assign(model, {
                visible: false,
                material: originalMaterial,
            });
        };
    }, [entity.color, entity.facade, entity.name, model]);

    /* ── Register for centralized animation (no subscribe) ── */
    useEffect(() => {
        const originalX = model.position.x;
        const originalZ = model.position.z;
        const originalRotX = model.rotation.x;
        const originalRotY = model.rotation.y;
        const bounds = new Box3();
        model.geometry.computeBoundingBox();
        if (model.geometry.boundingBox) bounds.copy(model.geometry.boundingBox);

        const name = canonicalNodeName(model.name);
        // F_F is the stationary shortened front of the Gola cabinet. It is
        // never a moving door, even though the module has a straight-case tag.
        if (name === "M_SPL_1_F_F") return;

        // Correct1 has a real hinged door mesh but no pivot node. Keep the
        // left side edge fixed while rotating the mesh around Y toward the
        // viewer instead of translating the whole facade along Z.
        const hingeLocalX = bounds.min.x;
        const hingeLocalZ = (bounds.min.z + bounds.max.z) / 2;

        animationRegistry.facades.set(model.uuid, {
            mesh: model,
            originalX,
            originalZ,
            originalRotX,
            hingeSign: 1,

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
        getColorHex(prevProps.entity.color) === getColorHex(nextProps.entity.color) &&
        prevProps.entity.facade === nextProps.entity.facade &&
        prevProps.entity.name === nextProps.entity.name &&
        prevProps.entity.tags?.join(",") === nextProps.entity.tags?.join(",")
    );
});
