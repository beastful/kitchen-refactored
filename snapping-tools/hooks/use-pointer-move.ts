import { useState, useEffect, useRef } from 'react';

export function usePointerMove<T>(
  compute: (event: PointerEvent) => T,
  initialValue: T
): T {
  const [value, setValue] = useState<T>(initialValue);
  const computeRef = useRef(compute);

  // Keep the ref fresh so the listener always calls the latest function
  useEffect(() => {
    computeRef.current = compute;
  });

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      setValue(computeRef.current(e));
    };

    window.addEventListener('pointermove', handleMove);
    return () => window.removeEventListener('pointermove', handleMove);
  }, []);

  return value;
}
