
"use client";

import { useEffect, memo } from "react";
import { EXPLICT_CASE_FOLD, EXPLICT_CASE_STRAIGHT, EXPLICT_CASE_TOP } from "@/constants";
import { Color, Mesh, MeshBasicMaterial, MeshStandardMaterial } from "three";
import { ModuleEntity } from "@/types";
import { animationRegistry } from "@/3d/eviroment/animation-system";
import { Text } from "@react-three/drei";

export function LocalRuler({ entity }: { entity: ModuleEntity }) {
    const normal_y = Math.sin(entity.openAngle)
    const normal_x = Math.cos(entity.openAngle)
    const gap_from_wall = 0.005
    const gap_from_module = 0.05
    const shift_left = (entity.halfExtents[0] + gap_from_module) * normal_x - (entity.halfExtents[2] - gap_from_wall) * normal_y
    const shift_forward = (entity.halfExtents[0] + gap_from_module) * normal_y - (entity.halfExtents[2] - gap_from_wall) * normal_x

    const gap_from_wall_text = 0.005
    const gap_from_module_text = 0.1
    const shift_left_text = (entity.halfExtents[0] + gap_from_module_text) * normal_x - (entity.halfExtents[2] - gap_from_wall_text) * normal_y
    const shift_forward_text = (entity.halfExtents[0] + gap_from_module_text) * normal_y - (entity.halfExtents[2] - gap_from_wall_text) * normal_x

    return <>
        <group position={[entity.position.x + shift_left, entity.lock.y, entity.position.z + shift_forward]}>
            <mesh>
                <meshBasicMaterial color={"black"} />
                <boxGeometry args={[0.005, entity.halfExtents[1] * 2, 0.005]} />
            </mesh>

        </group>
        <group
            position={[entity.position.x + shift_left_text, entity.lock.y, entity.position.z + shift_forward_text]}
            rotation={[0, entity.openAngle, 0]}>
            <Text rotation={[0, 0, Math.PI / 2]} color={"black"} fontSize={0.06}>{entity.halfExtents[1].toFixed(2)}</Text>
        </group>
        {/* <Text position={entity.position}>{JSON.stringify(entity.position)}</Text> */}
    </>
}
