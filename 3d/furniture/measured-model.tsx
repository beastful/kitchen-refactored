"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Box3, Vector3 } from "three";
import { ModuleEntity } from "@/types";

/**
 * Loads a GLTF model, measures its bounding box, and applies non-uniform scale
 * so each axis matches entity.size. This is a simpler alternative to FacadeConfig
 * for models without classified parts (tech modules like Refrigirator, Stove, etc.).
 */
export function MeasuredModel({ src, entity }: { src: string; entity: ModuleEntity }) {
  const { scene } = useGLTF(src);
  const model = useMemo(() => scene.clone(), [scene]);

  const scale = useMemo(() => {
    if (!model) return new Vector3(1, 1, 1);
    model.updateMatrixWorld(true);
    const box = new Box3().setFromObject(model);
    const modelSize = new Vector3();
    box.getSize(modelSize);

    const parentScale = 0.1;

    const targetSize = {
      x: entity.size.x,
      y: entity.size.y,
      z: entity.size.z,
    };
    const scaleFor = (axis: 'x' | 'y' | 'z'): number => {
      const world = modelSize[axis] * parentScale;
      const target = targetSize[axis];
      if (world > 0.001 && Math.abs(world - target) > 0.005 && target > 0) {
        return target / world;
      }
      return 1;
    };

    return new Vector3(scaleFor('x'), scaleFor('y'), scaleFor('z'));
  }, [model, entity.size.x, entity.size.y, entity.size.z]);

  return (
    <group scale={scale}>
      <primitive object={model} />
    </group>
  );
}
