import { useTexture } from "@react-three/drei";
import { useEffect, useRef } from "react";
import { Color, Material, Mesh, MeshMatcapMaterial, Texture } from "three";
import { ModuleEntity } from "@/types";

const matcapMaterialCache = new Map<string, MeshMatcapMaterial>();

function getMatcapMaterial(texture: Texture): MeshMatcapMaterial {
    if (!matcapMaterialCache.has(texture.uuid)) {
        const mat = new MeshMatcapMaterial({
            color: new Color("white"),
            matcap: texture,
        });
        matcapMaterialCache.set(texture.uuid, mat);
    }
    return matcapMaterialCache.get(texture.uuid)!;
}

interface ShellProps {
    entity: ModuleEntity;
    model: Mesh;
}

export function Shell({ entity, model }: ShellProps) {
    const matcapTexture = useTexture("matcaps/mc1.png");

    useEffect(() => {
        const originalMaterial = model.material;
        model.material = getMatcapMaterial(matcapTexture);

        return () => {
            model.material = originalMaterial;
        };
    }, [model, matcapTexture]);

    return null;
}