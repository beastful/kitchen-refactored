import { useTexture } from "@react-three/drei";
import { useEffect, useRef } from "react";
import { Color, Material, Mesh, MeshMatcapMaterial, Texture } from "three";
import { ModuleEntity } from "@/types";

function canonicalNodeName(name: string): string {
    return name.replace(/[.]/g, "");
}

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

        // The new GLB stores both cabinet variants in one scene. Hide only
        // the regular cabinet in Gola mode: hiding every non-target object
        // would also hide the parent scene that contains the Gola cabinet.
        const name = canonicalNodeName(model.name);
        if (name === "M_SPL_1001") {
            Object.assign(model, { visible: !isGolaModule });
        } else if (name === "M_SPL_1002") {
            Object.assign(model, { visible: isGolaModule });
        }
        model.material = getMatcapMaterial(matcapTexture);

        return () => {
            model.visible = originalVisible;
            model.material = originalMaterial;
        };
    }, [entity.facade, entity.name, model, matcapTexture]);

    return null;
}