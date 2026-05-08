import { useSnapContext } from "../snap-provider";

export function useCursorData() {
    const { cursorData } = useSnapContext();
    return cursorData;
}
