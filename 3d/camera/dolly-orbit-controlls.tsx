import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export function ConstantForwardOrbitControls({
  stepSize = 1.0,
  ...props
}: {
  stepSize?: number
  [key: string]: any
}) {
  const { camera, gl } = useThree()
  const controlsRef = useRef<any>(null)

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return

    // --- Disable default zoom ---
    controls.enableZoom = false

    const element = gl.domElement

    // --- Mouse wheel zoom ---
    const onWheel = (e: WheelEvent) => {
      const delta = e.deltaY > 0 ? -1 : 1
      const step = delta * stepSize
      const forward = new THREE.Vector3()
      camera.getWorldDirection(forward)
      camera.position.addScaledVector(forward, step)
      controls.target.addScaledVector(forward, step)
      controls.update()
      e.preventDefault() // prevent page scroll
    }

    // --- Touch pinch zoom ---
    let initialPinchDistance = 0
    let isPinching = false

    const getDistance = (touches: TouchList) => {
      if (touches.length < 2) return 0
      const dx = touches[0].clientX - touches[1].clientX
      const dy = touches[0].clientY - touches[1].clientY
      return Math.sqrt(dx * dx + dy * dy)
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        isPinching = true
        initialPinchDistance = getDistance(e.touches)
        e.preventDefault() // prevent page zoom
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (isPinching && e.touches.length === 2) {
        const currentDistance = getDistance(e.touches)
        const delta = currentDistance - initialPinchDistance
        // Adjust sensitivity: 0.02 means 50px change moves stepSize
        const step = delta * 0.02 * stepSize
        const forward = new THREE.Vector3()
        camera.getWorldDirection(forward)
        camera.position.addScaledVector(forward, step)
        controls.target.addScaledVector(forward, step)
        controls.update()
        initialPinchDistance = currentDistance // reset for continuous zoom
        e.preventDefault()
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        isPinching = false
      }
      // Do not prevent default here – let other touches work
    }

    // --- iOS gesture events (safety) ---
    const onGesture = (e: Event) => e.preventDefault()

    // --- Attach listeners ---
    element.addEventListener('wheel', onWheel, { passive: false })
    element.addEventListener('touchstart', onTouchStart, { passive: false })
    element.addEventListener('touchmove', onTouchMove, { passive: false })
    element.addEventListener('touchend', onTouchEnd)
    element.addEventListener('touchcancel', onTouchEnd)
    element.addEventListener('gesturestart', onGesture)
    element.addEventListener('gesturechange', onGesture)
    element.addEventListener('gestureend', onGesture)

    // --- Cleanup ---
    return () => {
      element.removeEventListener('wheel', onWheel)
      element.removeEventListener('touchstart', onTouchStart)
      element.removeEventListener('touchmove', onTouchMove)
      element.removeEventListener('touchend', onTouchEnd)
      element.removeEventListener('touchcancel', onTouchEnd)
      element.removeEventListener('gesturestart', onGesture)
      element.removeEventListener('gesturechange', onGesture)
      element.removeEventListener('gestureend', onGesture)
      controls.enableZoom = true // restore if needed
    }
  }, [camera, gl.domElement, gl, stepSize])

  return <OrbitControls ref={controlsRef} {...props} enableZoom={false} />
}
