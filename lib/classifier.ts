import { Box3, Object3D, Vector3 } from "three";

export class ObjectClassifier {
    private threshold: number;

    constructor(threshold = 0.1) {
        this.threshold = threshold;
    }

    getDepth(obj: Object3D): number {
        const box = new Box3().setFromObject(obj);
        const size = new Vector3();
        box.getSize(size);
        return size.z > size.x ? size.x : size.z;
    }

    isShelf(obj: Object3D): boolean {
        return this.getDepth(obj) > this.threshold;
    }

    isFacade(obj: Object3D): boolean {
        return !this.isShelf(obj);
    }
}
