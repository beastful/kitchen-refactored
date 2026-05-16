"use client";

import { store } from "@/store";
import { useEffect, useRef, memo } from "react";
import { Color, MeshStandardMaterial, Mesh } from "three";
import { subscribe } from "valtio";
import { ModuleEntity } from "@/types";

interface ShelfProps {
    entity: ModuleEntity;
    model: Mesh;
}

function ShelfComponent({ entity, model }: ShelfProps) {
    const originalZ = useRef(model.position.z);

    useEffect(() => {
        model.material = new MeshStandardMaterial({
            color: new Color('white'),
        });
    }, [model]);

    /* ── REPLACEMENT FOR useFrame ── */
    useEffect(() => {
        const applyTransform = () => {
            model.position.z = originalZ.current + store.openAngle * 3;
        };

        // Apply initial value
        applyTransform();

        let lastOpenAngle = store.openAngle;
        const unsubscribe = subscribe(store, () => {
            if (store.openAngle !== lastOpenAngle) {
                lastOpenAngle = store.openAngle;
                applyTransform();
            }
        });

        return () => {
            unsubscribe();
            // Restore original position on unmount
            model.position.z = originalZ.current;
        };
    }, [model]);

    return null;
}

export const Shelf = memo(ShelfComponent, (prevProps, nextProps) => {
    return prevProps.model === nextProps.model;
});
