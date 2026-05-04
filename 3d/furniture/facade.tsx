"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useEffect } from "react";
import { store } from "@/store";
import { EXPLICT_CASE_FOLD, EXPLICT_CASE_STRAIGHT, EXPLICT_CASE_TOP } from "@/constants";
import { useSnapshot } from "valtio";
import { lerp } from "three/src/math/MathUtils.js";
import { Color, Mesh, MeshMatcapMaterial } from "three";
import { useTexture } from "@react-three/drei";
import { ModuleEntity } from "@/types";

interface FacadeProps {
    entity: ModuleEntity;
    model: Mesh;
}

export function Facade({ entity, model }: FacadeProps) {
    const snap = useSnapshot(store);
    const originalZ = useRef(model.position.z);
    const originalRotX = useRef(model.rotation.x);
    const originalRotY = useRef(model.rotation.y);

    useEffect(() => {
        originalZ.current = model.position.z;
        originalRotX.current = model.rotation.x;
        originalRotY.current = model.rotation.y;
    }, [model]);

    const matcapTexture = useTexture('matcaps/mc1.png');

    useEffect(() => {
        model.material = new MeshMatcapMaterial({
            color: new Color(entity.color),
            matcap: matcapTexture
        })
        model.material.transparent = true
        model.material.needsUpdate = true;
        model.material.alphaTest = 1;
        model.material.opacity = 0.4
        if (model.name.includes(`_${entity.facade}`)) {
            model.material.opacity = 1
        }
        if (!model.name.includes(`_A`) && !model.name.includes(`_B`) && !model.name.includes(`_C`) && entity.facade == "Flat") {
            model.material.opacity = 1
        }
    }, [model, entity])

    const SPEED = 8;

    useFrame((_, delta) => {
        if (!model) return;

        const sideSign = Math.sign(model.position.x);
        const signY = Math.sign(model.position.y);
        const open = snap.openAngle;
        let targetZ = originalZ.current;
        let targetRotX = originalRotX.current;
        let targetRotY = originalRotY.current;

        if (entity.tags.includes(EXPLICT_CASE_STRAIGHT)) {
            targetZ = originalZ.current + open * 3;
        }
        else if (entity.tags.includes(EXPLICT_CASE_TOP)) {
            targetRotX = originalRotX.current + (-sideSign * open);
        }
        else if (entity.tags.includes(EXPLICT_CASE_FOLD)) {
            const offset = signY > 0 ? -signY * open : -signY * open * 2;
            targetRotX = originalRotX.current + offset;
        }
        else {
            targetRotY = originalRotY.current + (sideSign * open);
        }

        const factor = Math.min(1, SPEED * delta);
        model.position.z = lerp(model.position.z, targetZ, factor);
        model.rotation.x = lerp(model.rotation.x, targetRotX, factor);
        model.rotation.y = lerp(model.rotation.y, targetRotY, factor);
    });

    return null;
}
