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
        const originalVisible = model.visible;
        const isGolaModule = entity.name === "M_SPL_1_CORRECT1" && entity.facade === "Gola";

        // The new GLB stores both cabinet variants in one scene.
        // Gola uses the dedicated .002 cabinet; the regular cabinet is hidden.
        // GLTFLoader removes dots from Blender duplicate suffixes.
        model.visible = !isGolaModule || model.name === "M_SPL_1002";
        model.material = getMatcapMaterial(matcapTexture);

        return () => {
            model.visible = originalVisible;
            model.material = originalMaterial;
        };
    }, [entity.facade, entity.name, model, matcapTexture]);

    return null;
}