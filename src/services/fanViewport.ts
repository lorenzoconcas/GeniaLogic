export type FanCamera = { x: number; y: number; zoom: number }
export type FanPoint = { x: number; y: number }
export const maxFanZoom = 32

export function fanNavigationModifier(platform: string): { key: 'metaKey' | 'ctrlKey'; label: string } {
  return /Mac|iPhone|iPad|iPod/i.test(platform)
    ? { key: 'metaKey', label: '⌘ Cmd' }
    : { key: 'ctrlKey', label: 'Ctrl' }
}

export function zoomFanCamera(camera: FanCamera, width: number, height: number, factor: number, anchor?: FanPoint): FanCamera {
  if (!Number.isFinite(factor) || factor <= 0) return camera
  const zoom = Math.min(maxFanZoom, Math.max(1, camera.zoom * factor))
  const point = anchor ?? { x: camera.x + width / camera.zoom / 2, y: camera.y + height / camera.zoom / 2 }
  const ratio = camera.zoom / zoom
  return { x: point.x - (point.x - camera.x) * ratio, y: point.y - (point.y - camera.y) * ratio, zoom }
}

export function panFanCamera(camera: FanCamera, start: FanPoint, end: FanPoint): FanCamera {
  return { ...camera, x: camera.x + start.x - end.x, y: camera.y + start.y - end.y }
}

export function fanWheelFactor(deltaY: number, deltaMode: number, pageHeight: number): number {
  const pixels = deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? pageHeight : 1)
  return Math.exp(-Math.max(-240, Math.min(240, pixels)) * .003)
}
