"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useEffect } from "react";
import { store } from "@/store";
import { EXPLICT_CASE_FOLD, EXPLICT_CASE_STRAIGHT, EXPLICT_CASE_TOP } from "@/constants";
import { useSnapshot } from "valtio";
import { lerp } from "three/src/math/MathUtils.js";
import { Color, MeshMatcapMaterial, MeshStandardMaterial } from "three";
import { useTexture } from "@react-three/drei";

export function Facade({ facade, entity }) {
    const snap = useSnapshot(store);

    const originalZ = useRef(facade.position.z);
    const originalRotX = useRef(facade.rotation.x);
    const originalRotY = useRef(facade.rotation.y);

    useEffect(() => {
        originalZ.current = facade.position.z;
        originalRotX.current = facade.rotation.x;
        originalRotY.current = facade.rotation.y;
    }, [facade]);

    const matcapTexture = useTexture('matcaps/mc1.png');

    useEffect(() => {
        // facade.material = new MeshStandardMaterial({
        //     color: new Color(entity.color)
        // })
        facade.material = new MeshMatcapMaterial({
            color: new Color(entity.color),
            matcap: matcapTexture
        })
        facade.material.transparent = true
        facade.material.needsUpdate = true;
        facade.material.alphaTest = true;
        facade.material.opacity = 0.4


        if (facade.name.includes(`_${entity.facade}`)) {
            facade.material.opacity = 1
        }
        if (!facade.name.includes(`_A`) && !facade.name.includes(`_B`) && !facade.name.includes(`_C`) && entity.facade == "Flat") {
            facade.material.opacity = 1
        }
    }, [facade, entity])

    const SPEED = 8;

    useFrame((_, delta) => {
        if (!facade) return;

        const sideSign = Math.sign(facade.position.x);
        const signY = Math.sign(facade.position.y);
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
        facade.position.z = lerp(facade.position.z, targetZ, factor);
        facade.rotation.x = lerp(facade.rotation.x, targetRotX, factor);
        facade.rotation.y = lerp(facade.rotation.y, targetRotY, factor);
    });

    return <></>;
}
