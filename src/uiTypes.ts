import type { Person } from './types'

export type ViewName = 'tree' | 'people' | 'relationships' | 'archive'
export type LayoutMode = 'generational' | 'focus' | 'fan' | 'radial' | 'ancestors'
export type PersonForm = Omit<Person, 'id'>
export type RelativeKind =
  | 'father'
  | 'mother'
  | 'son'
  | 'daughter'
  | 'brother'
  | 'sister'
  | 'spouse'
  | 'partner'
export type ParentLinkType = 'biological-parent' | 'adoptive-parent' | 'foster-parent'

export type ShowToast = (message: string, tone?: 'success' | 'error') => void
