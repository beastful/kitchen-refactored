import { ROTATATABLE } from "@/constants";
import { store } from "@/store";
import { ModuleEntity, toModuleDef } from "@/types";
import { Html, Outlines } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Delete, Move, Rotate3D, Settings, Trash2Icon } from "lucide-react";
import { useCallback, useEffect, useRef, ReactNode, useState } from "react";
import { useSnapshot } from "valtio";

interface ModuleMenuProps {
    entity: ModuleEntity
    children: ReactNode;
}

export function ModuleMenu({ children, entity }: ModuleMenuProps) {
    const snap = useSnapshot(store);
    const isOpen = snap.openMenuId === entity.id;
    const { gl } = useThree();
    const menuRef = useRef<HTMLDivElement>(null);
    const isTogglingRef = useRef(false);
    const [isDraggable, setIsDraggable] = useState(false)
    const rotatable = entity.tags.includes(ROTATATABLE);

    const handleRotate = useCallback((id: string) => {
        const module = store.modules.find(m => m.id === id);
        if (module) module.openAngle += Math.PI / 2;
    }, []);

    const handleGroupClick = (e: any) => {
        e.stopPropagation();
        isTogglingRef.current = true;
        store.openMenuId = isOpen ? null : entity.id;
        setTimeout(() => { isTogglingRef.current = false; }, 100);
    };

    useEffect(() => {
        if (!isOpen) return;
        const canvas = gl.domElement;
        const handleCanvasClick = (e: MouseEvent) => {
            if (isTogglingRef.current) return;
            if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
            store.openMenuId = null;
        };
        canvas.addEventListener('click', handleCanvasClick);
        return () => canvas.removeEventListener('click', handleCanvasClick);
    }, [isOpen, gl]);

    return (
        <group onClick={handleGroupClick}>
            {isOpen && (
                <>
                    <Html>
                        <div
                            ref={menuRef}
                            className="bg-white flex rounded-md translate-x-[-50%] translate-y-[-100px] shadow-xl"
                        >
                            {rotatable && (
                                <div
                                    onClick={() => handleRotate(entity.id)}
                                    className="w-12 min-w-12 h-12 flex items-center justify-center cursor-pointer"
                                >
                                    <Rotate3D />
                                </div>
                            )}
                            <div onClick={() => {
                                store.configurableEntity = entity.id;
                            }} className="w-12 min-w-12 h-12 flex items-center justify-center cursor-pointer">
                                <Settings />
                            </div>
                            <div onClick={() => {
                                store.configurableEntity = null;
                                store.openMenuId = null;
                                setIsDraggable(true);
                            }} className="w-12 min-w-12 h-12 flex items-center justify-center cursor-pointer">
                                <Move />
                            </div>
                            <div onClick={() => {
                                store.modules = [...snap.modules.filter(e => e.id != entity.id)] as ModuleEntity[];
                            }} className="w-12 min-w-12 h-12 flex items-center justify-center cursor-pointer">
                                <Trash2Icon />
                            </div>
                        </div>
                    </Html>
                    {!snap.configurableEntity && (
                        <mesh>
                            <meshStandardMaterial alphaTest={0.3} transparent opacity={0.9} color={"orange"} />
                            <boxGeometry args={[...entity.halfExtents.map(n => n * 2 * 10 + 0.8)] as []} />
                        </mesh>
                    )}

                </>
            )}
            {isDraggable && <Html>
                <div onPointerDown={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    store.modules = [...snap.modules.filter(e => e.id != entity.id)] as ModuleEntity[];
                    store.currentRawModule = toModuleDef(entity)
                }} className="bg-white rounded-md opacity-60 translate-[-50%] cursor-grab border-2 border-dashed px-3 py-6 flex items-center justify-center flex-col gap-5">
                     <Move />
                     <div className="text-xs text-center">Удерживайте и тащите</div>
                </div>
            </Html>}
            {children}
        </group>
    );
}
