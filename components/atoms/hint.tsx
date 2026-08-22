import { store } from "@/store";
import { ReactNode, useRef } from "react";
import { useSnapshot } from "valtio";

interface HintProps {
    children: ReactNode;
    content: ReactNode;
    className?: string;
    lineStyle?: string;
}

export function Hint({ children, content, className = '', lineStyle = '' }: HintProps) {
    const snap = useSnapshot(store)
    const ref = useRef<HTMLDivElement>(null);
    let bbox;
    if (ref.current) {
        bbox = ref.current.getBoundingClientRect();
    }
    return <div className='relative z-100' ref={ref}>
        {snap.hints && <>
            <div className={`fixed top-[${bbox?.y}px] left-[${bbox?.x}px] bg-white ${lineStyle}`}></div>
            <div className={`fixed top-[${bbox?.y}px] left-[${bbox?.x}px] bg-white p-4 rounded-xl shadow ${className}`}>
                {content}
            </div>
        </>}
        {children}
    </div>
}
