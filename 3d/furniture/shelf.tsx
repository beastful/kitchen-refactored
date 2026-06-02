"use client";

import { useEffect, memo } from "react";
import { Mesh, MeshStandardMaterial } from "three";
import { ModuleEntity } from "@/types";
import { animationRegistry } from "@/3d/eviroment/animation-system";

const shelfMaterialCache = new Map<string, MeshStandardMaterial>();

function getShelfMaterial(): MeshStandardMaterial {
    const key = "white";
    if (!shelfMaterialCache.has(key)) {
        const mat = new MeshStandardMaterial({ color: "white" });
        shelfMaterialCache.set(key, mat);
    }
    return shelfMaterialCache.get(key)!;
}

interface ShelfProps {
    entity: ModuleEntity;
    model: Mesh;
}

function ShelfComponent({ model }: ShelfProps) {
    /* ── Material ── */
    useEffect(() => {
        const originalMaterial = model.material;
        model.material = getShelfMaterial();
        return () => {
            model.material = originalMaterial;
        };
    }, [model]);

    /* ── Register for centralized animation (no subscribe) ── */
    useEffect(() => {
        const originalZ = model.position.z;
        animationRegistry.shelves.set(model.uuid, {
            mesh: model,
            originalZ,
        });

        return () => {
            animationRegistry.shelves.delete(model.uuid);
            model.position.z = originalZ;
        };
    }, [model]);

    return null;
}

export const Shelf = memo(ShelfComponent, (prevProps, nextProps) => {
    return prevProps.model === nextProps.model;
});
