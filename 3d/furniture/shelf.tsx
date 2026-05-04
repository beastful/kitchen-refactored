import { store } from "@/store";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Color, MeshStandardMaterial, Mesh } from "three";
import { lerp } from "three/src/math/MathUtils.js";
import { useSnapshot } from "valtio";
import { ModuleEntity } from "@/types";

interface ShelfProps {
    entity: ModuleEntity;
    model: Mesh;
}

export function Shelf({ entity, model }: ShelfProps) {
    const snap = useSnapshot(store);
    const originalZ = useRef(model.position.z);

    useEffect(() => {
        model.material = new MeshStandardMaterial({
            color: new Color('white'),
        })
    }, [model, entity])

    useFrame((_, delta) => {
        let targetZ = originalZ.current + snap.openAngle * 3;
        model.position.z = lerp(model.position.z, targetZ, 0.2);

    });

    return null
}
