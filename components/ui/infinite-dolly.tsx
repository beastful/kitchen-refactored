// ConstantForwardOrbitControls.tsx
import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export function ConstantForwardOrbitControls({ 
  stepSize = 1.0,    // world units per scroll tick (positive = forward)
  ...props 
}) {
  const { camera, gl, domElement } = useThree()
  const controlsRef = useRef<any>(null)

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return

    // 1. Disable the original zoom (so it doesn't interfere)
    controls.enableZoom = false

    // 2. Handle wheel manually
    const onWheel = (e: WheelEvent) => {
      // Determine direction: forward on scroll down (or up, depending on preference)
      const delta = e.deltaY > 0 ? -1 : 1   // scroll down = move forward
      const step = delta * stepSize

      // Get camera's forward direction (local -Z in Three.js camera space)
      const forward = new THREE.Vector3()
      camera.getWorldDirection(forward)

      // Move camera
      camera.position.addScaledVector(forward, step)
      // Move target by the same amount so the relative offset stays
      controls.target.addScaledVector(forward, step)

      controls.update()
    }

    // Use the canvas DOM element (or window)
    const element = domElement || gl.domElement
    element.addEventListener('wheel', onWheel)

    return () => {
      element.removeEventListener('wheel', onWheel)
      // Restore zoom if needed (optional)
      controls.enableZoom = true
    }
  }, [camera, domElement, gl, stepSize])

  return <OrbitControls ref={controlsRef} {...props} enableZoom={false} />
}