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
