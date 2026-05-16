'use client'

import { Canvas } from '@react-three/fiber'
import { ConstantForwardOrbitControls } from '@/3d/camera/dolly-orbit-controlls'
import Room from '@/3d/eviroment/room'
import { Suspense } from 'react'
import { Stats } from '@react-three/drei';

export default function Scene() {
    return (
        <Canvas camera={{ position: [-6, 6, 6], fov: 45, near: 0.1, far: 1000 }}>
            <Stats />
            <Suspense fallback={null}>
                <Room />
            </Suspense>
            <ambientLight intensity={0.6} color="#fff8f0" />
            <directionalLight position={[5, 8, 5]} intensity={1.2} color="#ffffff" castShadow shadow-mapSize={[1024, 1024]} />
            <directionalLight position={[-3, 4, -3]} intensity={0.4} color="#e8e4ff" />
            <pointLight position={[0, -1, 2]} intensity={0.3} color="#ffeedd" />
            <hemisphereLight args={["#ddeeff", "#332211", 0.5]} />
            <ConstantForwardOrbitControls
                stepSize={0.4}
                enableRotate={true}
                enablePan={true}
                minDistance={2}
                maxDistance={10}
                maxPolarAngle={Math.PI / 2}
            />
        </Canvas>
    )
}
