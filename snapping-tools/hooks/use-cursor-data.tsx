import { useSnapContext } from "../snap-provider";

export function useCursorData() {
    const { cursorData } = useSnapContext();

    const getCursorData = () => {
        return cursorData;
    }

    return { cursorData, getCursorData };
}
