import { Model as Handle1 } from "@/handles/Handle1";
import { Model as Handle2 } from "@/handles/Handle2";
import { Model as Handle3 } from "@/handles/Handle3";
import { Model as Handle4 } from "@/handles/Handle4";
import { Model as Handle5 } from "@/handles/Handle5";
import { Color, Group, Mesh, MeshStandardMaterial } from "three";
import { CATEGORY_FLOOR, CATEGORY_WALL } from "@/constants";
import { ThreeElements } from '@react-three/fiber';
import { useEffect, useRef } from "react";
import { ModuleEntity } from "@/types";

type HandleVariantProps = ThreeElements['group'] & {
    entity: ModuleEntity;
    worldY: number;
}

export function HandleVariant({ entity, worldY, ...props }: HandleVariantProps) {
    const variant = entity.handleVariant + 1;
    const groupRef = useRef<Group>(null);

    const handle4y = ((): number => {
        if (entity.tags.includes(CATEGORY_WALL)) {
            return (entity.position.y - entity.halfExtents[1]) - worldY;
        }
        if (entity.tags.includes(CATEGORY_FLOOR)) {
            return 0.09;
        }
        return 0;
    })();

    useEffect(() => {
        const group = groupRef.current;
        if (!group) return;

        group.traverse((child) => {
            if (child instanceof Mesh) {
                child.material = new MeshStandardMaterial({
                    color: new Color(entity.handleColor),
                });
            }
        });
    }, [entity.handleColor, variant]);

    return (
        <group ref={groupRef}>
            {variant === 1 && <Handle1 scale={0.05} {...props} />}
            {variant === 2 && <Handle2 scale={0.05} {...props} />}
            {variant === 3 && <Handle3 scale={0.05} {...props} />}
            {variant === 4 && (
                <group position={[0, -0.018, -handle4y]} rotation={[0, Math.PI, 0]}>
                    <Handle4 scale={0.05} {...props} />
                </group>
            )}
            {variant === 5 && <Handle5 scale={0.05} {...props} />}
        </group>
    );
}
