import { useTexture } from "@react-three/drei";
import { useLayoutEffect } from "react";
import { Color, Mesh, MeshMatcapMaterial, Object3D, Texture } from "three";
import { isGolaCapableModule, ModuleEntity } from "@/types";

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
    model: Object3D;
}

export function Shell({ entity, model }: ShellProps) {
    const matcapTexture = useTexture("matcaps/mc1.png");
    const entityName = entity.name;
    const entityModelPath = entity.modelPath;
    const entityModel = entity.model;
    const entityDisplayName = entity.displayName;
    const entityFacade = entity.facade;

    useLayoutEffect(() => {
        const originalMaterial = model instanceof Mesh ? model.material : null;
        const originalVisible = model.visible;
        const name = canonicalNodeName(model.name);
        const isGolaModule = entityFacade === "Gola" && (
            isGolaCapableModule({
                name: entityName,
                modelPath: entityModelPath,
                model: entityModel,
                displayName: entityDisplayName,
            }) || name === "M_SPL_1001" || name === "M_SPL_1002"
        );

        // The corrected GLB stores regular and Gola carcasses in one scene.
        // Toggle only the two variant meshes/containers; the shared scene root
        // must stay visible or both carcasses disappear together.
        if (name === "M_SPL_1001" || name === "M_SPL_1002") {
            model.visible = isGolaModule
                ? name === "M_SPL_1002"
                : name === "M_SPL_1001";
        }
        if (model instanceof Mesh) {
            model.material = getMatcapMaterial(matcapTexture);
        }

        return () => {
            model.visible = originalVisible;
            if (model instanceof Mesh && originalMaterial) {
                model.material = originalMaterial;
            }
        };
    }, [entityDisplayName, entityFacade, entityModel, entityModelPath, entityName, model, matcapTexture]);

    return null;
}