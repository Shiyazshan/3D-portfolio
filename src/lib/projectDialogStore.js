/**
 * Which project's details window is open. Shared by the 3D screens (inside the Canvas) and
 * the Selected Work list (DOM) — a tiny external store, read with useSyncExternalStore,
 * because the two live in different React trees.
 */
const listeners = new Set()
let openId = null

export const projectDialogStore = {
  get: () => openId,
  open(id) {
    openId = id
    listeners.forEach((l) => l())
  },
  close() {
    openId = null
    listeners.forEach((l) => l())
  },
  subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
