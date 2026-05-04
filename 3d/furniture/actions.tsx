import { store } from "@/store";
import { ModuleEntity } from "@/types";
import { Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Rotate3D, Settings } from "lucide-react";
import { useCallback, useEffect, useRef, ReactNode } from "react";
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
                <Html>
                    <div
                        ref={menuRef}
                        className="bg-white flex rounded-md translate-x-[-50%] translate-y-[-180px] shadow-xl"
                    >
                        <div
                            onClick={() => handleRotate(entity.id)}
                            className="w-12 min-w-12 h-12 flex items-center justify-center cursor-pointer"
                        >
                            <Rotate3D />
                        </div>
                        <div onClick={() => {
                            store.configurableEntity = entity.id;
                        }} className="w-12 min-w-12 h-12 flex items-center justify-center cursor-pointer">
                            <Settings />
                        </div>
                    </div>
                </Html>
            )}
            {children}
        </group>
    );
}
