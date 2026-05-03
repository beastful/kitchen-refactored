import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export function ConstantForwardOrbitControls({
    stepSize = 1.0,
    ...props
}) {
    const { camera, gl } = useThree()
    const controlsRef = useRef<any>(null)

    useEffect(() => {
        const controls = controlsRef.current
        if (!controls) return

        controls.enableZoom = false
        const onWheel = (e: WheelEvent) => {
            const delta = e.deltaY > 0 ? -1 : 1
            const step = delta * stepSize
            const forward = new THREE.Vector3()
            camera.getWorldDirection(forward)
            camera.position.addScaledVector(forward, step)
            controls.target.addScaledVector(forward, step)
            controls.update()
        }

        const element = gl.domElement
        element.addEventListener('wheel', onWheel)

        return () => {
            element.removeEventListener('wheel', onWheel)
            controls.enableZoom = true
        }
    }, [camera, gl.domElement, gl, stepSize])

    return <OrbitControls ref={controlsRef} {...props} enableZoom={false} />
}
