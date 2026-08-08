import { Model as Handle1 } from "@/handles/Handle1";
import { Model as Handle2 } from "@/handles/Handle2";
import { Model as Handle3 } from "@/handles/Handle3";
import { Model as Handle4 } from "@/handles/Handle4";
import { Model as Handle5 } from "@/handles/Handle5";
import { Color, Group, Material, Mesh, MeshStandardMaterial } from "three";
import { ThreeElements } from "@react-three/fiber";
import { useEffect, useRef, memo } from "react";
import { ModuleEntity } from "@/types";

const handleMaterialCache = new Map<string, MeshStandardMaterial>();

function getHandleMaterial(color: string | Color): MeshStandardMaterial {
    const hex = typeof color === "string" ? color : `#${color.getHexString()}`;
    if (!handleMaterialCache.has(hex)) {
        const mat = new MeshStandardMaterial({ color: new Color(color) });
        handleMaterialCache.set(hex, mat);
    }
    return handleMaterialCache.get(hex)!;
}

type HandleVariantProps = ThreeElements["group"] & {
    entity: ModuleEntity;
};

function HandleVariantComponent({ entity, ...props }: HandleVariantProps) {
    const variant = entity.handleVariant + 1;
    const groupRef = useRef<Group>(null);
    const originalMaterialsRef = useRef<Map<Mesh, Material | Material[]>>(new Map());

    /* ── Apply cached material once per color ── */
    useEffect(() => {
        const group = groupRef.current;
        if (!group) return;

        const material = getHandleMaterial(entity.handleColor);

        group.traverse((child) => {
            if (child instanceof Mesh) {
                if (!originalMaterialsRef.current.has(child)) {
                    originalMaterialsRef.current.set(child, child.material);
                }
                child.material = material;
            }
        });

        const originalMaterials = originalMaterialsRef.current;
        return () => {
            originalMaterials.forEach((originalMat, mesh) => {
                mesh.material = originalMat;
            });
            originalMaterials.clear();
        };
    }, [entity.handleColor, variant]);

    return (
        <group ref={groupRef}>
            {variant === 1 && <Handle1 scale={0.05} {...props} />}
            {variant === 2 && <Handle2 scale={0.05} {...props} />}
            {variant === 3 && <Handle3 scale={0.05} {...props} />}
            {variant === 4 && (
                <group position={[0, -0.018, 0]} rotation={[0, Math.PI, 0]}>
                    <Handle4 scale={0.05} {...props} />
                </group>
            )}
            {variant === 5 && <Handle5 scale={0.05} {...props} />}
        </group>
    );
}

export const HandleVariant = memo(HandleVariantComponent);