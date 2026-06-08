"use client";

import { useEffect, useState, useMemo } from "react";
import { Mesh, Object3D } from "three";
import { AssemblerProps } from "@/types";
import { Facade } from "./facade";
import { Handle } from "./handle";
import { Shell } from "./shell";
import { Shelf } from "./shelf";
import { useGLTF } from "@react-three/drei";
import { Box3, Vector3 } from "three";
import { OBB } from "three/examples/jsm/Addons.js";

export class ObjectClassifier {
  private threshold: number;

  constructor(threshold = 5) {
    this.threshold = threshold;
  }

  getSize(obj: Object3D): Vector3 {
    const box = new Box3().setFromObject(obj);
    const obb = new OBB();
    obb.fromBox3(box)
    obb.applyMatrix4(obj.matrixWorld)
    const size = new Vector3();
    obb.getSize(size);
    return size;
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
  const [facades, setFacades] = useState<Object3D[]>([]);
  const [shelves, setShelves] = useState<Object3D[]>([]);
  const [handles, setHandles] = useState<Object3D[]>([]);
  const [modules, setModules] = useState<Object3D[]>([]);

  useEffect(() => {
    const tmpFacades: Object3D[] = [];
    const tmpShelves: Object3D[] = [];
    const tmpHandles: Object3D[] = [];
    const tmpModules: Object3D[] = [];

    model.traverse((obj: Object3D) => {
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

    setFacades(tmpFacades)
    setShelves(tmpShelves)
    setHandles(tmpHandles)
    setModules(tmpModules)
  }, [model])

  // Measure actual model dimensions and compute corrective scale SYNCHRONOUSLY
  // to avoid visual pop-in. GLTF models may differ from backend positioning expectations.
  // e.g., M_SPL_9.glb is ~0.8m wide at scale(0.1) but backend positions at 0.6m intervals.
  // We scale uniformly so model WIDTH (local X) matches entity.size.x.
  const modelScale = useMemo(() => {
    if (!model) return 1;
    model.updateMatrixWorld(true);
    const box = new Box3().setFromObject(model);
    const modelSize = new Vector3();
    box.getSize(modelSize);

    // Parent SnapPlacedObject has scale(0.1), so world width = modelSize.x * 0.1
    const worldWidth = modelSize.x * 0.1;
    const targetWidth = entity.size.x;
    const needsScale = worldWidth > 0.001 && Math.abs(worldWidth - targetWidth) > 0.01;
    const scale = needsScale ? targetWidth / worldWidth : 1;
    
    console.log(`[DEBUG_FIX2] ${entity.name}: modelSize=${modelSize.x.toFixed(4)}×${modelSize.y.toFixed(4)}×${modelSize.z.toFixed(4)}, worldWidth=${worldWidth.toFixed(4)}, target=${targetWidth}, scale=${scale.toFixed(4)}`);
    
    return scale;
  }, [model, entity.size.x])

  return (
    <>
      {facades.map(model => <Facade key={model.uuid} entity={entity} model={model as Mesh} />)}
      {shelves.map(model => <Shelf key={model.uuid} entity={entity} model={model as Mesh} />)}
      {handles.map(model => <Handle key={model.uuid} entity={entity} model={model as Mesh} />)}
      {modules.map(model => <Shell key={model.uuid} entity={entity} model={model as Mesh} />)}
      <primitive object={model} />
    </>
  );
}
