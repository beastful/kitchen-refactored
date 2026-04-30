"use client"

import { OrbitControls, useBounds } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { ThreeElements } from '@react-three/fiber';
import { ReactNode, useEffect, useState } from 'react';
import { Vector3 } from "three";
import { SnapProvider, useSnapContext } from "@/snapping-tools/snap-provider";
import { SnapConstraint } from "@/snapping-tools/snap-constraint";
import { SnapCursor } from "@/snapping-tools/snap-cursor";
import Room from "./room";
import Configurator from "./connfigurator";


export default function Home() {
  const [rotation, setRotation] = useState(0)

  return (
    <SnapProvider debug={true}>
      <div className="h-[100vh]">
        <Configurator />
      </div>
    </SnapProvider>
  );
}
