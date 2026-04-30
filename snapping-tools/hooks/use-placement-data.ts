import { useCallback } from 'react';
import { useSnapContext } from '../snap-provider';
import { Box3, Vector3 } from 'three';
import { PlacementResult } from '../types';

const _boxA = new Box3();
const _boxB = new Box3();

export function usePlacementData() {
  const { getCursorState, queryConstraints } = useSnapContext();

  return useCallback((): PlacementResult => {
    const state = getCursorState();

    if (!state.isSnapped || !state.snapPosition) {
      return { possible: false, reason: 'not_snapped' };
    }

    // Строим bounding box размещаемого объекта в итоговой позиции
    const placedCenter = state.snapPosition;
    const placedHalf = state.halfExtents.clone();

    // Учитываем rotation yaw для worldHalf
    const cos = Math.cos(state.rotation);
    const sin = Math.sin(state.rotation);
    const placedSize = new Vector3(
      (Math.abs(placedHalf.x * cos) + Math.abs(placedHalf.z * sin)) * 2,
      placedHalf.y * 2,
      (Math.abs(placedHalf.x * sin) + Math.abs(placedHalf.z * cos)) * 2
    );

    _boxA.min.set(
      placedCenter.x - placedSize.x / 2,
      placedCenter.y - placedSize.y / 2,
      placedCenter.z - placedSize.z / 2
    );
    _boxA.max.set(
      placedCenter.x + placedSize.x / 2,
      placedCenter.y + placedSize.y / 2,
      placedCenter.z + placedSize.z / 2
    );

    // Добавляем небольшой зазор (чтобы объекты не были вплотную)
    const GAP = 0.02;
    _boxA.expandByScalar(-GAP); // Уменьшаем slightly для допуска

    // Проверяем пересечение со ВСЕМИ constraints (кроме тех, к которым прилипли)
    let overlap = false;

    queryConstraints(({ ref, userData }) => {
      if (overlap) return; // Уже нашли пересечение

      const obj = ref.current;
      if (!obj || !userData.useDistance) return;

      _boxB.setFromObject(obj);

      // Проверяем пересечение AABB
      if (_boxA.intersectsBox(_boxB)) {
        // Исключаем случай, когда объект просто касается стены (это ок)
        // Проверяем: пересечение значительное (больше допуска)
        const intersection = new Box3().copy(_boxA).intersect(_boxB);
        const size = new Vector3();
        intersection.getSize(size);

        // Если пересечение больше чем просто касание — это overlap
        if (size.x > 0.001 && size.y > 0.001 && size.z > 0.001) {
          overlap = true;
        }
      }
    });

    if (overlap) {
      return { possible: false, reason: 'overlap' };
    }

    // Проверка на "too_narrow" — если свободное пространство меньше объекта
    // (опционально, можно убрать если не нужно)

    return {
      possible: true,
      data: {
        position: [placedCenter.x, placedCenter.y, placedCenter.z] as [number, number, number],
        rotation: [0, state.rotation, 0] as [number, number, number],
        halfExtents: [placedHalf.x, placedHalf.y, placedHalf.z] as [number, number, number],
        snapPlanes: state.snapPlanes,
      },
    };
  }, [getCursorState, queryConstraints]);
}
