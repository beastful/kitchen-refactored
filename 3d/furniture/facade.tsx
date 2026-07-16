"use client";

import { useEffect, memo } from "react";
import { EXPLICT_CASE_FOLD, EXPLICT_CASE_STRAIGHT, EXPLICT_CASE_TOP } from "@/constants";
import { Color, Mesh, MeshStandardMaterial } from "three";
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

function FacadeComponent({ entity, model }: FacadeProps) {
    /* ── Material ── */
    useEffect(() => {
        const originalMaterial = model.material;

        let opacity = 0;
        if (model.name.includes(`_${entity.facade}`)) {
            opacity = 1;
        } else if (
            !model.name.includes(`_A`) &&
            !model.name.includes(`_B`) &&
            !model.name.includes(`_C`) &&
            entity.facade === "Flat"
        ) {
            opacity = 1;
        }

        const material = getFacadeMaterial(entity.color, opacity);
        model.material = material;

        return () => {
            model.material = originalMaterial;
        };
    }, [entity.color, entity.facade, model]);

    /* ── Register for centralized animation (no subscribe) ── */
    useEffect(() => {
        const originalZ = model.position.z;
        const originalRotX = model.rotation.x;
        const originalRotY = model.rotation.y;

        animationRegistry.facades.set(model.uuid, {
            mesh: model,
            originalZ,
            originalRotX,
            originalRotY,
            entity,
        });

        return () => {
            animationRegistry.facades.delete(model.uuid);
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
