"use client";

import { useRef, useEffect, useState } from "react";
import { Group, Mesh, Object3D } from "three";
import { AssemblerProps } from "@/types";
import { ObjectClassifier } from "@/lib/classifier";
import { Facade } from "./facade";
import { Handle } from "./handle";
import { Shell } from "./shell";
import { Shelf } from "./shelf";

const classifier = new ObjectClassifier();

export function FacadeConfig({ children, entity }: AssemblerProps) {
  const rootRef = useRef<Group>(null);
  const [modules, setModules] = useState<{
    facades: Object3D[];
    shelves: Object3D[];
    handles: Object3D[];
    modules: Object3D[];
  }>({ facades: [], shelves: [], handles: [], modules: [] });

  useEffect(() => {
    if (!rootRef.current) return;

    const tmpFacades: Object3D[] = [];
    const tmpShelves: Object3D[] = [];
    const tmpHandles: Object3D[] = [];
    const tmpModules: Object3D[] = [];

    rootRef.current.traverse((obj) => {
      if (obj.name.includes("_F") && (classifier.isFacade(obj) || obj.userData.wasFacade)) {
        obj.userData.wasFacade = true;
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

    setModules({
      facades: tmpFacades,
      shelves: tmpShelves,
      handles: tmpHandles,
      modules: tmpModules
    });

  }, []);

  return (
    <>
      {modules.handles.map((model) => (
        <Handle key={model.id} entity={entity} model={model as Mesh} />
      ))}
      {modules.facades.map((model) => (
        <Facade key={model.id} entity={entity} model={model as Mesh} />
      ))}
      {modules.shelves.map((model) => (
        <Shelf key={model.id} entity={entity} model={model as Mesh} />
      ))}
      {modules.modules.map((model) => (
        <Shell key={model.id} entity={entity} model={model as Mesh} />
      ))}
      <group ref={rootRef}>{children}</group>
    </>
  );
}
