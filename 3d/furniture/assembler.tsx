"use client";

import { useMemo } from "react";
import { Box3, Mesh, Object3D, Vector3 } from "three";
import { AssemblerProps, isGolaCapableModule } from "@/types";
import { Facade } from "./facade";
import { Handle } from "./handle";
import { Shell } from "./shell";
import { Shelf } from "./shelf";
import { useGLTF } from "@react-three/drei";

export class ObjectClassifier {
  private threshold: number;

  constructor(threshold = 5) {
    this.threshold = threshold;
  }

  getSize(obj: Object3D): Vector3 {
    const box = new Box3().setFromObject(obj);
    return box.getSize(new Vector3());
  }

  isShelf(obj: Object3D): boolean {
    const size = this.getSize(obj)
    return !(size.x / size.z > this.threshold || size.z / size.x > this.threshold)
  }

  isFacade(obj: Object3D): boolean {
    const size = this.getSize(obj)
    return size.x / size.z > this.threshold || size.z / size.x > this.threshold
  }
}

const classifier = new ObjectClassifier();

export function FacadeConfig({ src, entity }: AssemblerProps) {
  const { scene } = useGLTF(src);
  const model = useMemo(() => scene.clone(), [scene])
  const entityName = entity.name;
  const entityModelPath = entity.modelPath;
  const entityModel = entity.model;
  const entityDisplayName = entity.displayName;
  const { facades, shelves, handles, modules } = useMemo(() => {
    const tmpFacades: Mesh[] = [];
    const tmpShelves: Mesh[] = [];
    const tmpHandles: Mesh[] = [];
    const tmpModules: Object3D[] = [];
    const isCorrect1 = isGolaCapableModule({
      name: entityName,
      modelPath: entityModelPath,
      model: entityModel,
      displayName: entityDisplayName,
    });
    const correct1Facades = new Set([
      "M_SPL_1_F_A",
      "M_SPL_1_F_B",
      "M_SPL_1_F_C",
      "M_SPL_1_F_D",
      "M_SPL_1_F_F",
    ]);

    model.traverse((obj: Object3D) => {
      // Correct1 has a flat list of named meshes. Register only those meshes;
      // registering container nodes or their children twice causes visible
      // facade overlays and makes the selected material appear inconsistent.
      if (isCorrect1) {
        const name = obj.name.replace(/[.]/g, "");

        // In the older Correct1 asset the two carcasses are Object3D
        // containers (the Gola carcass owns F_F.001). Keep those containers in
        // the Shell list so visibility switching works for both asset layouts.
        if (!(obj instanceof Mesh)) {
          if (name === "M_SPL_1001" || name === "M_SPL_1002") {
            tmpModules.push(obj);
          }
          return;
        }

        if (correct1Facades.has(name)) {
          tmpFacades.push(obj);
        } else if (name === "M_SPL_1_F_F001") {
          // Older Correct1 files store the Gola profile as F_F.001.
          tmpHandles.push(obj);
        } else if (name.includes("_PNT_")) {
          // Correct1 contains the built-in Gola profile as a mesh named
          // M_SPL_1_PNT_GOLA. Handle renders it in place and only enables it
          // in Gola mode; the H/V points keep the regular handle behavior.
          tmpHandles.push(obj);
        } else {
          // Keep cabinet bodies and the static Gola front in the scene. The
          // latter was present in the older Correct1 asset as F_F.001.
          tmpModules.push(obj);
        }
        return;
      }

      if (!(obj instanceof Mesh)) return;
      if (obj.name.includes("_F") && classifier.isFacade(obj)) {
        tmpFacades.push(obj);
      } else if (obj.name.includes("_F") && classifier.isShelf(obj) && !obj.name.includes("_IC")) {
        tmpShelves.push(obj);
      } else if (obj.name.includes("_IC")) {
        tmpFacades.push(obj);
      } else if (obj.name.includes("_PNT")) {
        tmpHandles.push(obj);
      } else {
        tmpModules.push(obj);
      }
    });

    return {
      facades: tmpFacades,
      shelves: tmpShelves,
      handles: tmpHandles,
      modules: tmpModules,
    };
  }, [entityDisplayName, entityName, entityModel, entityModelPath, model])

  // Measure actual model dimensions and compute corrective scale SYNCHRONOUSLY.
  // GLTF models may differ from backend positioning expectations in ALL axes.
  // We apply non-uniform scaling so each axis matches entity.size.
  // This ensures modules sit exactly on the floor (Y matches) and fit their slot (X matches).
  const modelScale = useMemo(() => {
    if (!model) return new Vector3(1, 1, 1);
    model.updateMatrixWorld(true);
    const box = new Box3().setFromObject(model);
    const modelSize = new Vector3();
    box.getSize(modelSize);

    // Parent SnapPlacedObject has scale(0.1)
    const parentScale = 0.1;
    
    const scaleFor = (axis: 'x' | 'y' | 'z'): number => {
      const world = modelSize[axis] * parentScale;
      const target = entity.size[axis];
      if (world > 0.001 && Math.abs(world - target) > 0.005 && target > 0) {
        return target / world;
      }
      return 1;
    };

    return new Vector3(scaleFor('x'), scaleFor('y'), scaleFor('z'));
  }, [model, entity.size])

  return (
    <group scale={modelScale}>
      {facades.map(model => <Facade key={model.uuid} entity={entity} model={model as Mesh} />)}
      {shelves.map(model => <Shelf key={model.uuid} entity={entity} model={model as Mesh} />)}
      {handles.map(model => <Handle key={model.uuid} entity={entity} model={model as Mesh} />)}
      {modules.map(model => <Shell key={model.uuid} entity={entity} model={model} />)}
      <primitive object={model} />
    </group>
  );
}
