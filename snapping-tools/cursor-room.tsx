import { ReactNode, useEffect, useMemo, useRef } from "react"
import { useSnapContext } from "./snap-provider"
import { Html } from "@react-three/drei";
import { ScreenShare } from "lucide-react";
import { useThree } from "@react-three/fiber";

interface CursorRoomProps {
    children: ReactNode,
    width: number,
    height: number,
    depth: number
}

export function CursorRoom({ children, width: depth, height, depth: width }: CursorRoomProps) {
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

    if (!point) return false;
    const treshold = 0.01
    const outX = point?.x > width * 0.5 + treshold || point?.x < -width * 0.5 - treshold;
    const outY = point?.y > height * 0.5 + treshold || point?.y < -height * 0.5 - treshold;
    const outZ = point?.z > depth * 0.5 + treshold || point?.z < -depth * 0.5 - treshold;

    const visible = outX || outY || outZ || !cursorVisible;

    return <>
        <Html>
            {visible && isHovering.current && <div className="translate-x-[-50%] translate-y-[-50%] bg-white flex items-center p-3 pr-10 gap-2 rounded-md pointer-events-none">
                <div className="w-10 h-10 min-w-10 flex justify-center items-center">
                    <ScreenShare />
                </div>
                <div className="text-sm w-56">
                    Наведите курсор на помещение для редактирования
                </div>
            </div>}
        </Html>
        <group visible={!visible}>
            {children}
        </group>
    </>
}
