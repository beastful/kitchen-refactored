"use client";

import { useFrame } from "@react-three/fiber";
import { store } from "@/store";
import { EXPLICT_CASE_FOLD, EXPLICT_CASE_STRAIGHT, EXPLICT_CASE_TOP } from "@/constants";
import { Mesh } from "three";
import { ModuleEntity } from "@/types";

export interface FacadeAnimData {
  mesh: Mesh;
  originalZ: number;
  originalRotX: number;
  originalRotY: number;
  entity: ModuleEntity;
}

export interface ShelfAnimData {
  mesh: Mesh;
  originalZ: number;
}

export const animationRegistry = {
  facades: new Map<string, FacadeAnimData>(),
  shelves: new Map<string, ShelfAnimData>(),
};

export function AnimationSystem() {
  useFrame(() => {
    const open = store.openAngle;

    // ── Facades ──
    for (const data of animationRegistry.facades.values()) {
      const { mesh, originalZ, originalRotX, originalRotY, entity } = data;
      const sideSign = Math.sign(mesh.position.x);
      const signY = Math.sign(mesh.position.y);

      let targetZ = originalZ;
      let targetRotX = originalRotX;
      let targetRotY = originalRotY;

      if (entity.tags.includes(EXPLICT_CASE_STRAIGHT)) {
        targetZ = originalZ + open * 3;
      } else if (entity.tags.includes(EXPLICT_CASE_TOP)) {
        targetRotX = originalRotX + (-sideSign * open);
      } else if (entity.tags.includes(EXPLICT_CASE_FOLD)) {
        const offset = signY > 0 ? -signY * open : -signY * open * 2;
        targetRotX = originalRotX + offset;
      } else {
        targetRotY = originalRotY + (sideSign * open);
      }

      mesh.position.z = targetZ;
      mesh.rotation.x = targetRotX;
      mesh.rotation.y = targetRotY;
    }

    // ── Shelves ──
    for (const data of animationRegistry.shelves.values()) {
      data.mesh.position.z = data.originalZ + open * 3;
    }
  });

  return null;
}
