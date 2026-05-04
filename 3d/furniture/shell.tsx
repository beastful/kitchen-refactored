import { useTexture } from "@react-three/drei";
import { useEffect } from "react";
import { Color, MeshMatcapMaterial } from "three";
import { Mesh } from "three";
import { ModuleEntity } from "@/types";

interface ShellProps {
    entity: ModuleEntity;
    model: Mesh;
}

export function Shell({ entity, model }: ShellProps) {
    const matcapTexture = useTexture('matcaps/mc1.png');

    useEffect(() => {
        model.material = new MeshMatcapMaterial({
            color: new Color('white'),
            matcap: matcapTexture
        })
    }, [model, entity])
    return null
}
