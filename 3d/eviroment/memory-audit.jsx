import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'

export function MemoryAudit() {
  const gl = useThree((s) => s.gl)
  
  useEffect(() => {
    const interval = setInterval(() => {
      const { memory, programs } = gl.info
      console.table({
        geometries: memory.geometries,
        textures: memory.textures,
        programs: programs?.length || 0,
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        points: gl.info.render.points,
        lines: gl.info.render.lines,
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [gl])
  
  return null
}
