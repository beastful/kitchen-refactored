"use client";

import { useFrame } from "@react-three/fiber";
import { store } from "@/store";
import { EXPLICT_CASE_FOLD, EXPLICT_CASE_STRAIGHT, EXPLICT_CASE_TOP } from "@/constants";
import { Mesh } from "three";
import { isGolaCapableModule, ModuleEntity } from "@/types";

export interface FacadeAnimData {
  mesh: Mesh;
  originalX: number;
  originalZ: number;
  originalRotX: number;
  hingeSign: number;
  hingeLocalX: number;
  hingeLocalZ: number;
  hingePivotX: number;
  hingePivotZ: number;
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
      const {
        mesh,
        originalZ,
        originalRotX,
        originalRotY,
        hingeSign,
        hingeLocalX,
        hingeLocalZ,
        hingePivotX,
        hingePivotZ,
        entity,
      } = data;
      const sideSign = Math.sign(mesh.position.x);
      const signY = Math.sign(mesh.position.y);

      let targetZ = originalZ;
      let targetRotX = originalRotX;
      let targetRotY = originalRotY;

      if (entity.tags.includes(EXPLICT_CASE_STRAIGHT)) {
        if (isGolaCapableModule(entity)) {
          // Correct1 is a hinged door. Its old straight-case rule translated
          // the whole facade by open * 3 instead of rotating it around a side.
          const delta = hingeSign * open;
          const cos = Math.cos(delta);
          const sin = Math.sin(delta);
          targetRotY = originalRotY + delta;
          targetZ = hingePivotZ - (-sin * hingeLocalX + cos * hingeLocalZ);
          mesh.position.x = hingePivotX - (cos * hingeLocalX + sin * hingeLocalZ);
        } else {
          targetZ = originalZ + open * 3;
        }
      } else if (entity.tags.includes(EXPLICT_CASE_TOP)) {
        targetRotX = originalRotX + (-sideSign * open);
      } else if (entity.tags.includes(EXPLICT_CASE_FOLD)) {
        const offset = signY > 0 ? -signY * open : -signY * open * 2;
        targetRotX = originalRotX + offset;
      } else {
        targetRotY = originalRotY + (sideSign * open);
      }

      mesh.position.z = targetZ;
      if (!(entity.tags.includes(EXPLICT_CASE_STRAIGHT) && isGolaCapableModule(entity)) || open === 0) {
        mesh.position.x = data.originalX;
      }
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
