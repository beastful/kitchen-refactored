import { ReactNode, useEffect, useMemo, useRef } from "react"
import { useSnapContext } from "./snap-provider"
import { Html } from "@react-three/drei";
import { ScreenShare, MousePointerClick } from "lucide-react";
import { useThree } from "@react-three/fiber";
import { motion, AnimatePresence } from "framer-motion";
import { CursorClickIcon } from "./animated-icons/cursor-click";
import { StoredPointerEvent } from "./types";
import { Vector3 } from "three";

interface CursorRoomProps {
    children: ReactNode,
    width: number,
    height: number,
    depth: number,
    show: boolean,
    visibilityChange: (v: boolean) => void
}

function isVisible(point: Vector3 | undefined, width: number, height: number, depth: number, cursorVisible: boolean, show: boolean): boolean {
    if (!point) return false;
    const treshold = 0.01
    const outX = point?.x > width * 0.5 + treshold || point?.x < -width * 0.5 - treshold;
    const outY = point?.y > height * 0.5 + treshold || point?.y < -height * 0.5 - treshold;
    const outZ = point?.z > depth * 0.5 + treshold || point?.z < -depth * 0.5 - treshold;

    const visible = (outX || outY || outZ || !cursorVisible) && show;
    return visible;
}

export function CursorRoom({ children, width: depth, height, depth: width, show, visibilityChange }: CursorRoomProps) {
    const { pointerEvent, cursorVisible } = useSnapContext()
    const point = pointerEvent?.point;
    const isHovering = useRef(true)

    const gl = useThree((state) => state.gl)

    useEffect(() => {
        const enter = () => (isHovering.current = true)
        const leave = () => (isHovering.current = false)
        gl.domElement.addEventListener('pointerenter', enter)
        gl.domElement.addEventListener('pointerleave', leave)
        return () => {
            gl.domElement.removeEventListener('pointerenter', enter)
            gl.domElement.removeEventListener('pointerleave', leave)
        }
    }, [gl])

    useEffect(() => {
        visibilityChange(isVisible(point, width, height, depth, cursorVisible, show))
    }, [point]);
    const visible = useMemo(() => isVisible(point, width, height, depth, cursorVisible, show), [point]);

    return <>
        <Html
            center
            position={[0, 0, 0]}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
            <AnimatePresence>
                {visible && isHovering.current && (
                    <motion.div
                        key="hint"
                        initial={{ opacity: 0, y: 12, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ type: "spring", stiffness: 400, damping: 26 }}
                        className="flex flex-col items-center"
                    >
                        <div>
                            <CursorClickIcon className="text-black opacity-20" size={100} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Html>
        <group visible={!visible}>
            {children}
        </group>
    </>
}
