import type { FamilyTree, RelationshipOption } from './types'

export const relationshipOptions: RelationshipOption[] = [
  { value: 'biological-parent', label: 'Genitore biologico', description: 'La prima persona è genitore biologico della seconda.', group: 'Genitorialità', directional: true },
  { value: 'adoptive-parent', label: 'Genitore adottivo', description: 'La prima persona è genitore adottivo della seconda.', group: 'Genitorialità', directional: true },
  { value: 'foster-parent', label: 'Genitore affidatario', description: 'La prima persona ha avuto in affido la seconda.', group: 'Genitorialità', directional: true },
  { value: 'guardian', label: 'Tutore', description: 'La prima persona è o è stata tutore della seconda.', group: 'Genitorialità', directional: true },
  { value: 'sibling', label: 'Fratelli o sorelle', description: 'Le due persone sono fratelli, sorelle o fratelli non binari.', group: 'Fratellanza', directional: false },
  { value: 'married', label: 'Coniugi', description: 'Matrimonio attuale o concluso per decesso.', group: 'Coppia', directional: false },
  { value: 'civil-union', label: 'Unione civile', description: 'Unione civile o equivalente.', group: 'Coppia', directional: false },
  { value: 'partner', label: 'Partner', description: 'Relazione di coppia attuale.', group: 'Coppia', directional: false },
  { value: 'separated', label: 'Separati', description: 'Coppia o coniugi attualmente separati.', group: 'Coppia', directional: false },
  { value: 'divorced', label: 'Divorziati', description: 'Matrimonio concluso con divorzio.', group: 'Coppia', directional: false },
  { value: 'former-partner', label: 'Ex partner', description: 'Relazione di coppia conclusa.', group: 'Coppia', directional: false },
]

export const personColors = ['#5657d9', '#ee6a5f', '#0f9b8e', '#e5a12b', '#3385d9', '#d65591', '#7b61d1']

export const emptyTree = (): FamilyTree => ({
  version: 1,
  id: crypto.randomUUID(),
  name: 'Nuovo albero',
  updatedAt: new Date().toISOString(),
  people: [],
  relationships: [],
})
