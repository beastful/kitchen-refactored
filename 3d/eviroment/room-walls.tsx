import { SnapConstraint } from '@/snapping-tools/snap-constraint'
import { store } from '@/store'
import { Text, useTexture } from '@react-three/drei'
import { memo, useEffect } from 'react'
import { useSnapshot } from 'valtio'
import * as THREE from 'three'
import { RaycastRuler } from './raycast-ruler'

const DEFAULT_FLOOR_TEXTURE = 'assets/laminate_floor_02_diff_1k.jpg'

const FLOOR_TEXTURES: Record<string, string> = {
  'floor-laminate-default': DEFAULT_FLOOR_TEXTURE,
  'floor-laminate-gray-v1': '/floor/floor-gray-v1.jpg',
  'floor-laminate-gray-v2': '/floor/floor-gray-v2.jpg',
}

const isTexturePath = (value?: string | null) => {
  if (!value) return false

  return (
    value.startsWith('/') ||
    value.startsWith('./') ||
    value.startsWith('../') ||
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    /\.(png|jpe?g|webp|avif|gif)$/i.test(value)
  )
}

const resolveFloorTexture = (value?: string | null) => {
  if (!value) return DEFAULT_FLOOR_TEXTURE
  if (FLOOR_TEXTURES[value]) return FLOOR_TEXTURES[value]
  if (isTexturePath(value)) return value
  return DEFAULT_FLOOR_TEXTURE
}

const FloorMaterial = memo(function FloorMaterial({
  value,
  roomD,
  roomW,
}: {
  value: string
  roomD: number
  roomW: number
}) {
  const textureScale = 1.6
  const texturePath = resolveFloorTexture(value)
  const texture = useTexture(texturePath)

  useEffect(() => {
    if (!texture) return

    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(roomD / textureScale, roomW / textureScale)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.needsUpdate = true
  }, [texture, roomD, roomW])

  return (
    <meshStandardMaterial
      map={texture}
      color="#ffffff"
      roughness={0.35}
    />
  )
})

export function RoomWalls() {
  const snap = useSnapshot(store)
  const depth = 0.06
  const ruler_wal_gap = 0.005
  const ruler_top_factor = 1.7
  const ruler_bottom_factor = 0.6

  return (
    <>
      {snap.ruler && (
        <>
          <RaycastRuler
            from={new THREE.Vector3(
              snap.room.d / 2 - ruler_wal_gap,
              -snap.room.h / 2 + ruler_top_factor,
              -snap.room.w / 2
            )}
            to={new THREE.Vector3(
              snap.room.d / 2 - ruler_wal_gap,
              -snap.room.h / 2 + ruler_top_factor,
              snap.room.w / 2
            )}
            textAngle={Math.PI / 2}
          />

          <RaycastRuler
            from={new THREE.Vector3(
              snap.room.d / 2 - ruler_wal_gap,
              -snap.room.h / 2 + ruler_bottom_factor,
              -snap.room.w / 2
            )}
            to={new THREE.Vector3(
              snap.room.d / 2 - ruler_wal_gap,
              -snap.room.h / 2 + ruler_bottom_factor,
              snap.room.w / 2
            )}
            textAngle={Math.PI / 2}
          />

          <RaycastRuler
            from={new THREE.Vector3(
              -snap.room.d / 2,
              -snap.room.h / 2 + ruler_top_factor,
              snap.room.w / 2 - ruler_wal_gap
            )}
            to={new THREE.Vector3(
              snap.room.d / 2,
              -snap.room.h / 2 + ruler_top_factor,
              snap.room.w / 2 - ruler_wal_gap
            )}
            textAngle={0}
          />

          <RaycastRuler
            from={new THREE.Vector3(
              -snap.room.d / 2,
              -snap.room.h / 2 + ruler_bottom_factor,
              snap.room.w / 2 - ruler_wal_gap
            )}
            to={new THREE.Vector3(
              snap.room.d / 2,
              -snap.room.h / 2 + ruler_bottom_factor,
              snap.room.w / 2 - ruler_wal_gap
            )}
            textAngle={0}
          />

          <RaycastRuler
            from={new THREE.Vector3(
              -snap.room.d / 2,
              -snap.room.h / 2 + ruler_top_factor,
              -snap.room.w / 2 + ruler_wal_gap
            )}
            to={new THREE.Vector3(
              snap.room.d / 2,
              -snap.room.h / 2 + ruler_top_factor,
              -snap.room.w / 2 + ruler_wal_gap
            )}
            textAngle={Math.PI}
          />

          <RaycastRuler
            from={new THREE.Vector3(
              -snap.room.d / 2,
              -snap.room.h / 2 + ruler_bottom_factor,
              -snap.room.w / 2 + ruler_wal_gap
            )}
            to={new THREE.Vector3(
              snap.room.d / 2,
              -snap.room.h / 2 + ruler_bottom_factor,
              -snap.room.w / 2 + ruler_wal_gap
            )}
            textAngle={Math.PI}
          />
{/* 
          <group>
            {(() => {
              const sdThick = 0.02
              const sdDepth = 0.01
              const sdBaseH = 0.86 + snap.tabletop[0]
              const sdModuleH = snap.wallHeight
              const sdTopH = 0.76
              const sdGap = 0.02
              const sdX = -snap.room.d * 0.5 + depth * 0.5
              const sdZ = -snap.room.w * 0.5
              const floorY = -snap.room.h / 2

              const yBase = floorY + sdBaseH / 2
              const yModule = floorY + sdBaseH + sdGap + sdModuleH / 2
              const yTop =
                floorY + sdBaseH + sdGap + sdModuleH + sdGap + sdTopH / 2

              return (
                <group>
                  <group position={[sdX, yTop, sdZ]}>
                    <Text
                      position={[0.1, 0, 0.01]}
                      fontSize={0.06}
                      color="#000"
                      anchorX="center"
                      anchorY="middle"
                      rotation={[0, 0, Math.PI / 2]}
                    >
                      {`0.72m`}
                    </Text>
                    <mesh>
                      <boxGeometry args={[sdThick, sdTopH, sdDepth]} />
                      <meshMatcapMaterial color="#000" />
                    </mesh>
                  </group>

                  <group position={[sdX, yModule, sdZ]}>
                    <Text
                      position={[0.1, 0, 0.01]}
                      fontSize={0.06}
                      color="#000"
                      anchorX="center"
                      anchorY="middle"
                      rotation={[0, 0, Math.PI / 2]}
                    >
                      {`${snap.wallHeight}m`}
                    </Text>
                    <mesh>
                      <boxGeometry args={[sdThick, sdModuleH, sdDepth]} />
                      <meshMatcapMaterial color="#000" />
                    </mesh>
                  </group>

                  <group position={[sdX, yBase, sdZ]}>
                    <Text
                      position={[0.1, 0, 0.01]}
                      fontSize={0.06}
                      color="#000"
                      anchorX="center"
                      anchorY="middle"
                      rotation={[0, 0, Math.PI / 2]}
                    >
                      {`${0.822 + snap.tabletop[0]}m`}
                    </Text>
                    <mesh>
                      <boxGeometry args={[sdThick, sdBaseH, sdDepth]} />
                      <meshMatcapMaterial color="#000" />
                    </mesh>
                  </group>
                </group>
              )
            })()}
          </group> */}
        </>
      )}

      <SnapConstraint
        userData={{ layer: 'modules' }}
        name="wall-z"
        useCursor
        useDistance
        position={[0, 0, snap.room.w * 0.5 + depth * 0.5]}
      >
        <mesh name="wall" receiveShadow castShadow>
          <boxGeometry args={[snap.room.d, snap.room.h, depth]} />
          <meshMatcapMaterial color={snap.roomColor} />
        </mesh>
      </SnapConstraint>

      <SnapConstraint
        userData={{ layer: 'modules' }}
        name="wall-x"
        useCursor
        useDistance
        position={[snap.room.d * 0.5 + depth * 0.5, 0, 0]}
      >
        <mesh name="wall" receiveShadow castShadow>
          <boxGeometry args={[depth, snap.room.h, snap.room.w + depth * 2]} />
          <meshMatcapMaterial color={snap.roomColor} />
        </mesh>
      </SnapConstraint>

      <SnapConstraint
        userData={{ layer: 'modules' }}
        name="wall-x"
        useCursor
        useDistance
        position={[0, 0, -snap.room.w * 0.5 - depth * 0.5]}
      >
        <mesh name="wall" receiveShadow castShadow>
          <boxGeometry args={[snap.room.d, snap.room.h, depth]} />
          <meshMatcapMaterial color={snap.roomColor} />
        </mesh>
      </SnapConstraint>

      <SnapConstraint
        userData={{ layer: 'modules' }}
        name="wall-m"
        useCursor
        useDistance
        position={[
          -snap.room.d * 0.5 + depth * 0.5 - depth,
          0,
          -snap.room.w * 0.5 - depth * 0.5 + 0.1,
        ]}
      >
        <mesh visible={false} name="wall" receiveShadow castShadow>
          <boxGeometry args={[depth, snap.room.h, 0.2]} />
          <meshMatcapMaterial color={snap.roomColor} />
        </mesh>
      </SnapConstraint>

      <SnapConstraint
        userData={{ layer: 'modules' }}
        name="wall-m"
        useCursor
        useDistance
        position={[
          -snap.room.d * 0.5 + depth * 0.5 - depth,
          0,
          snap.room.w * 0.5 - depth * 0.5 - 0.1,
        ]}
      >
        <mesh visible={false} name="wall" receiveShadow castShadow>
          <boxGeometry args={[depth, snap.room.h, 0.2]} />
          <meshMatcapMaterial color={snap.roomColor} />
        </mesh>
      </SnapConstraint>

      <SnapConstraint
        useCursor
        useDistance
        rotation={[0, 0, 0]}
        position={[0, -snap.room.h / 2 - 0.001 + depth / 2, 0]}
      >
        <mesh name="floor" receiveShadow>
          <boxGeometry args={[snap.room.d, depth / 2, snap.room.w]} />
          <FloorMaterial
            value={snap.floorColor}
            roomD={snap.room.d}
            roomW={snap.room.w}
          />
        </mesh>
      </SnapConstraint>
    </>
  )
}
