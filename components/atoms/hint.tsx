import { store } from "@/store";
import { useRef } from "react";
import { useSnapshot } from "valtio";

export function Hint({ children, content, className, lineStyle }: any) {
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
