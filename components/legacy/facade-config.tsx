"use client";

import { Html, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useEffect, useState } from "react";
import { Box3, Color, Group, MeshBasicMaterial, MeshMatcapMaterial, MeshStandardMaterial, Object3D, Vector3 } from "three";
import { useThree } from '@react-three/fiber'
import { createPortal } from '@react-three/fiber'
import { Model as Handle1 } from '@/handles/Handle1'
import { Model as Handle2 } from '@/handles/Handle2'
import { Model as Handle3 } from '@/handles/Handle3'
import { Model as Handle4 } from '@/handles/Handle4'
import { Model as Handle5 } from '@/handles/Handle5'
import { store } from "@/store";
import { CATEGORY_FLOOR, CATEGORY_WALL, EXPLICT_CASE_DOUBLE, EXPLICT_CASE_EXTRA_QPI, EXPLICT_CASE_FOLD, EXPLICT_CASE_STRAIGHT, EXPLICT_CASE_TOP } from "@/constants";
import { useSnapshot } from "valtio";
import { lerp } from "three/src/math/MathUtils.js";
import { Facade } from "./facade";
import { ModuleEntity } from "@/types";
import { MeshStandardNodeMaterial } from "three/webgpu";

class ObjectClassifier {
  constructor(threshold = 0.1) {
    this.threshold = threshold;
  }

  getDepth(obj) {
    const box = new Box3().setFromObject(obj);
    const size = new Vector3();
    box.getSize(size);
    return size.z > size.x ? size.x : size.z;
  }

  isShelf(obj) {
    return this.getDepth(obj) > this.threshold;
  }

  isFacade(obj) {
    return !this.isShelf(obj);
  }
}

interface AccessorProps {
  children: React.ReactNode;
  entity: ModuleEntity;
  onReady?: (objects: {
    facades: Object3D[];
    shelves: Object3D[];
    handles: Object3D[];
  }) => void;
}

function HandleVariant({ entity, worldY, ...props }) {
  const variant = entity.handleVariant + 1;
  const groupRef = useRef();
  const handle4y = (() => {
    if (entity.tags.includes(CATEGORY_WALL)) return (entity.position.y - entity.halfExtents[1]) - worldY
    if (entity.tags.includes(CATEGORY_FLOOR)) return 0.09
  })();

  // Apply the new material to all meshes inside the selected handle
  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.traverse((child) => {
      if (child.isMesh) {
        child.material = new MeshStandardMaterial({
          color: new Color(entity.handleColor)
        });
      }
    });
  }, [entity, variant]); // re-run when material or variant changes

  return (
    <group ref={groupRef}>
      {variant === 1 && <Handle1 scale={0.05} {...props} />}
      {variant === 2 && <Handle2 scale={0.05} {...props} />}
      {variant === 3 && <Handle3 scale={0.05} {...props} />}
      {variant === 4 && <group position={[0, -0.018, -handle4y]} rotation={[0, Math.PI, 0]}>
        <Handle4 scale={0.05} {...props} />
      </group>}
      {variant === 5 && <Handle5 scale={0.05} {...props} />}
    </group>
  );
}

export function Handle({ handle, entity }) {
  const { scene } = useThree()
  const meshRef = useRef()
  const [worldY, setWorldY] = useState(0);

  const includesNoneOfFlags = !handle.name.includes("_H") && !handle.name.includes("_V");
  const includesV = handle.name.includes("_V");
  const includesH = handle.name.includes("_H");

  const isH = includesNoneOfFlags || includesH;
  const isV = includesV;

  const flagH = entity.handles == "H";
  const flagV = entity.handles != "H";

  const UMFAngle = entity.tags.includes(EXPLICT_CASE_EXTRA_QPI) == true ? Math.PI / 4 : 0;

  useFrame(() => {
    if (!handle || !meshRef.current) return
    handle.getWorldPosition(meshRef.current.position)
    handle.getWorldQuaternion(meshRef.current.quaternion)
    setWorldY(meshRef.current.position.y)
  })

  useEffect(() => {
    handle.visible = false
  }, [])

  return createPortal(
    <group ref={meshRef}>
      <group rotation={[0, UMFAngle, 0]}>
        {((includesH && flagH) || (includesNoneOfFlags && flagH)) && (
          <group rotation={[Math.PI / 2, 0, 0]}>
            <HandleVariant worldY={worldY} entity={entity} scale={0.05} rotation={[0, Math.PI / 2, 0]} />
          </group>
        )}
        {(isV && flagV) || (includesNoneOfFlags && flagV) && (
          <group rotation={[Math.PI / 2, 0, 0]}>
            <HandleVariant worldY={worldY} entity={entity} scale={0.05} rotation={[0, 0, 0]} />
          </group>

        )}
      </group>
    </group>,
    scene
  )
}

function Shelve({ entity, shelve }) {
  const snap = useSnapshot(store);
  const originalZ = useRef(shelve.position.z);

  useEffect(() => {

    shelve.material = new MeshStandardMaterial({
      color: new Color('white'),
    })

  }, [shelve, entity])

  useFrame((_, delta) => {
    let targetZ = originalZ.current + snap.openAngle * 3;
    shelve.position.z = lerp(shelve.position.z, targetZ, 0.2);

  });

  return <></>
}

function Module({ entity, module }) {
  const matcapTexture = useTexture('matcaps/mc1.png');

  useEffect(() => {
    module.material = new MeshMatcapMaterial({
      color: new Color('white'),
      matcap: matcapTexture
    })
  }, [module, entity])
  return <></>
}

// Assuming classifier is defined outside the component (stable)
const classifier = new ObjectClassifier();

export function FacadeConfig({ children, entity, onReady }: AccessorProps) {
  const rootRef = useRef<Group>(null);
  const [modules, setModules] = useState<{
    facades: Object3D[];
    shelves: Object3D[];
    handles: Object3D[];
    modules: Object3D[];
  }>({ facades: [], shelves: [], handles: [], modules: [] });
  const snap = useSnapshot(store);

  useEffect(() => {
    if (!rootRef.current) return;


    const tmpFacades: Object3D[] = [];
    const tmpShelves: Object3D[] = [];
    const tmpHandles: Object3D[] = [];
    const tmpModules: Object3D[] = []; // not used in state, but kept for completeness

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

    onReady?.({ facades: tmpFacades, shelves: tmpShelves, handles: tmpHandles });

  }, [children]); // classifier is stable outside, so no need to add to deps

  return (
    <>
      {modules.handles.map((handle) => (
        <Handle key={handle.id} entity={entity} handle={handle} />
      ))}
      {modules.facades.map((facade) => (
        <Facade key={facade.id} entity={entity} facade={facade} />
      ))}
      {modules.shelves.map((shelve) => (
        <Shelve key={shelve.id} entity={entity} shelve={shelve} />
      ))}
      {modules.modules.map((module) => (
        <Module key={module.id} entity={entity} module={module} />
      ))}
      <group ref={rootRef}>{children}</group>
    </>
  );
}