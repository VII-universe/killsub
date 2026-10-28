// Thin wrapper so the physics engine can be swapped (Rapier today; see docs/content-audit.md for the size note).
import type RAPIER_NS from '@dimforge/rapier3d-compat'

export type Rapier = typeof RAPIER_NS
export type RigidBody = RAPIER_NS.RigidBody
export type World = RAPIER_NS.World

let rapierPromise: Promise<Rapier> | null = null

export function loadRapier(): Promise<Rapier> {
  if (!rapierPromise) {
    rapierPromise = import('@dimforge/rapier3d-compat').then(async (R) => {
      await R.init()
      return R as unknown as Rapier
    })
  }
  return rapierPromise
}
