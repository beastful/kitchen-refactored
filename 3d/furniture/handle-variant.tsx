import { Model as Handle1 } from "@/handles/Handle1";
import { Model as Handle2 } from "@/handles/Handle2";
import { Model as Handle3 } from "@/handles/Handle3";
import { Model as Handle4 } from "@/handles/Handle4";
import { Model as Handle5 } from "@/handles/Handle5";
import { Color, Group, Material, Mesh, MeshStandardMaterial } from "three";
import { CATEGORY_FLOOR, CATEGORY_WALL } from "@/constants";
import { ThreeElements, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, memo } from "react";
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
    worldYRef: React.RefObject<number | null>;
};

function HandleVariantComponent({ entity, worldYRef, ...props }: HandleVariantProps) {
    const variant = entity.handleVariant + 1;
    const groupRef = useRef<Group>(null);
    const handle4Ref = useRef<Group>(null);
    const originalMaterialsRef = useRef<Map<Mesh, Material | Material[]>>(new Map());

    const handle4BaseOffset = useMemo(() => {
        if (entity.tags.includes(CATEGORY_WALL)) {
            return entity.position.y - entity.halfExtents[1];
        }
        if (entity.tags.includes(CATEGORY_FLOOR)) {
            return 0.09;
        }
        return 0;
    }, [entity.tags, entity.position.y, entity.halfExtents]);

    const isWall = entity.tags.includes(CATEGORY_WALL);

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

        return () => {
            originalMaterialsRef.current.forEach((originalMat, mesh) => {
                mesh.material = originalMat;
            });
            originalMaterialsRef.current.clear();
        };
    }, [entity.handleColor, variant]);

    /* ── Imperative Handle4 offset ── */
    useFrame(() => {
        if (!handle4Ref.current) return;

        // entity.name.includes("3YNSD")
        
        const z = isWall
            ? -(handle4BaseOffset - (worldYRef.current ?? 0))
            : -handle4BaseOffset;

        handle4Ref.current.position.set(0, -0.018, z);
    });

    return (
        <group ref={groupRef}>
            {variant === 1 && <Handle1 scale={0.05} {...props} />}
            {variant === 2 && <Handle2 scale={0.05} {...props} />}
            {variant === 3 && <Handle3 scale={0.05} {...props} />}
            {variant === 4 && (
                <group ref={handle4Ref} rotation={[0, Math.PI, 0]}>
                    <Handle4 scale={0.05} {...props} />
                </group>
            )}
            {variant === 5 && <Handle5 scale={0.05} {...props} />}
        </group>
    );
}

export const HandleVariant = memo(HandleVariantComponent);