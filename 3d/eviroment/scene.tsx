'use client'

import { Canvas, useThree } from '@react-three/fiber'
import { Stats } from '@react-three/drei'
import React, { useState, useCallback, useRef, Suspense, useEffect } from 'react'
import * as THREE from 'three'
import { ConstantForwardOrbitControls } from '@/3d/camera/dolly-orbit-controlls' // adjust path
import Room from '@/3d/eviroment/room'
import { registerCamera } from '@/lib/camera-helper'

/**
 * Компонент, который регистрирует камеру и OrbitControls в глобальном helper.
 * Нужно, чтобы captureScenePreview() мог временно сбрасывать ракурс для скриншота.
 */
function CameraRegistrar() {
  const camera = useThree((s) => s.camera as THREE.PerspectiveCamera);
  const controls = useThree((s) => s.controls as any);

  useEffect(() => {
    if (camera && controls && typeof controls.update === 'function') {
      registerCamera(camera, controls);
    }
  }, [camera, controls]);

  return null;
}

function R3FSceneInner({ onContextLost }: { onContextLost: any }) {
  const { gl } = useThree()

  useEffect(() => {
    const canvas = gl.domElement

    const handleLost = (event: any) => {
      event.preventDefault()
      console.warn('WebGL context lost')
      onContextLost()
    }

    const handleRestored = () => {
      console.log('WebGL context restored')
      const size = gl.getSize(new THREE.Vector2())
      gl.setSize(size.width - 1, size.height - 1)
      requestAnimationFrame(() => gl.setSize(size.width, size.height))
    }

    canvas.addEventListener('contextlost', handleLost)
    canvas.addEventListener('contextrestored', handleRestored)

    return () => {
      canvas.removeEventListener('contextlost', handleLost)
      canvas.removeEventListener('contextrestored', handleRestored)
    }
  }, [gl, onContextLost])

  return (
    <>
      <CameraRegistrar />
      <Room />
      <ambientLight intensity={0.6} color="#fff8f0" />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.2}
        color="#ffffff"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-3, 4, -3]} intensity={0.4} color="#e8e4ff" />
      <pointLight position={[0, -1, 2]} intensity={0.3} color="#ffeedd" />
      <hemisphereLight args={['#ddeeff', '#332211', 0.5]} />
      <ConstantForwardOrbitControls
        stepSize={0.4}
        enableRotate
        enablePan
        minDistance={2}
        maxDistance={10}
        maxPolarAngle={Math.PI / 2}
      />
    </>
  )
}

const R3FSceneInnerMemo = React.memo(R3FSceneInner)

export default function Scene() {
  const [canvasKey, setCanvasKey] = useState(0)
  const [isRecovering, setIsRecovering] = useState(false)

  const handleContextLost = useCallback(() => {
    setIsRecovering(true)
    setTimeout(() => {
      setCanvasKey((k) => k + 1)
      setIsRecovering(false)
    }, 600)
  }, [])

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        touchAction: 'none', // <-- PREVENTS PAGE ZOOM
      }}
    >
      {isRecovering && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.85)',
            color: '#fff',
            fontFamily: 'sans-serif',
          }}
        >
          Restoring 3D view…
        </div>
      )}

      <Canvas
        key={canvasKey}
        camera={{ position: [-6, 6, 6], fov: 45, near: 0.1, far: 1000 }}
        dpr={[1, 2]}
        frameloop="always"
        className="config-scene"
        gl={{ preserveDrawingBuffer: true }}
        onCreated={({ gl }) => {
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        }}
      >
        <Suspense fallback={null}>
          <R3FSceneInnerMemo onContextLost={handleContextLost} />
        </Suspense>
      </Canvas>
    </div>
  )
}