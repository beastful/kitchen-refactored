"use client";

import { useEffect, useRef, memo } from "react";
import { store } from "@/store";
import { EXPLICT_CASE_FOLD, EXPLICT_CASE_STRAIGHT, EXPLICT_CASE_TOP } from "@/constants";
import { subscribe } from "valtio";
import { Color, Mesh, MeshMatcapMaterial } from "three";
import { useTexture } from "@react-three/drei";
import { ModuleEntity } from "@/types";

interface FacadeProps {
    entity: ModuleEntity;
    model: Mesh;
}

function FacadeComponent({ entity, model }: FacadeProps) {
    const originalZ = useRef(model.position.z);
    const originalRotX = useRef(model.rotation.x);
    const originalRotY = useRef(model.rotation.y);

    useEffect(() => {
        originalZ.current = model.position.z;
        originalRotX.current = model.rotation.x;
        originalRotY.current = model.rotation.y;
    }, [model]);

    const matcapTexture = useTexture('matcaps/mc1.png');

    const lastColor = useRef<Color | undefined>(undefined);
    const lastFacade = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (lastColor.current === entity.color && lastFacade.current === entity.facade) {
            return;
        }
        lastColor.current = entity.color;
        lastFacade.current = entity.facade;

        const material = new MeshMatcapMaterial({
            color: new Color(entity.color),
            matcap: matcapTexture,
            transparent: true,
            alphaTest: 1,
            opacity: 0.4,
        });

        if (model.name.includes(`_${entity.facade}`)) {
            material.opacity = 1;
        }
        if (!model.name.includes(`_A`) && !model.name.includes(`_B`) && !model.name.includes(`_C`) && entity.facade === "Flat") {
            material.opacity = 1;
        }

        model.material = material;
    }, [entity.color, entity.facade, matcapTexture, model]);

    /* ── REPLACEMENT FOR useFrame ── */
    useEffect(() => {
        const sideSign = Math.sign(model.position.x);
        const signY = Math.sign(model.position.y);

        const applyTransform = () => {
            const open = store.openAngle;

            let targetZ = originalZ.current;
            let targetRotX = originalRotX.current;
            let targetRotY = originalRotY.current;

            if (entity.tags.includes(EXPLICT_CASE_STRAIGHT)) {
                targetZ = originalZ.current + open * 3;
            } else if (entity.tags.includes(EXPLICT_CASE_TOP)) {
                targetRotX = originalRotX.current + (-sideSign * open);
            } else if (entity.tags.includes(EXPLICT_CASE_FOLD)) {
                const offset = signY > 0 ? -signY * open : -signY * open * 2;
                targetRotX = originalRotX.current + offset;
            } else {
                targetRotY = originalRotY.current + (sideSign * open);
            }

            // Ready value — applied immediately, no lerp
            model.position.z = targetZ;
            model.rotation.x = targetRotX;
            model.rotation.y = targetRotY;
        };

        // Apply once on mount so the initial store value is respected
        applyTransform();

        // Subscribe to Valtio store and update ONLY when openAngle changes
        let lastOpenAngle = store.openAngle;
        const unsubscribe = subscribe(store, () => {
            if (store.openAngle !== lastOpenAngle) {
                lastOpenAngle = store.openAngle;
                applyTransform();
            }
        });

        return () => {
            unsubscribe();
            // Restore original transform on unmount
            model.position.z = originalZ.current;
            model.rotation.x = originalRotX.current;
            model.rotation.y = originalRotY.current;
        };
    }, [entity.tags, model]);

    return null;
}

export const Facade = memo(FacadeComponent, (prevProps, nextProps) => {
    return (
        prevProps.model === nextProps.model &&
        prevProps.entity.color === nextProps.entity.color &&
        prevProps.entity.facade === nextProps.entity.facade &&
        prevProps.entity.tags?.join(',') === nextProps.entity.tags?.join(',')
    );
});
