<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MarkerType, VueFlow, useVueFlow, type Edge, type Node } from '@vue-flow/core'
import {
  Archive, CalendarDays, Check, ChevronRight, Download, Edit3, FilePlus2, FolderOpen,
  CircleDot, Focus, GitFork, Heart, Info, Link2, ListFilter, MapPin, Maximize2, Menu, MoreHorizontal,
  ArrowLeftRight, PanelLeftClose, PanelLeftOpen, Plus, Save, Search, ShieldCheck, Trash2, Upload, UserRoundPlus, Users, X,
} from '@lucide/vue'
import ModalShell from './components/ModalShell.vue'
import PersonNode from './components/PersonNode.vue'
import RadialTree from './components/RadialTree.vue'
import PersonPicker from './components/PersonPicker.vue'
import PersonSelectionCard from './components/PersonSelectionCard.vue'
import GraphPersonSearch from './components/GraphPersonSearch.vue'
import AncestorTree from './components/AncestorTree.vue'
import { emptyTree, personColors, relationshipOptions } from './data'
import {
  createTreeHandle, ensureFilePermission, exportTree, forgetFileHandle, getRememberedFileHandle,
  importTree, loadLocal, pickTreeHandle, readTreeHandle, rememberFileHandle, saveLocal, writeTreeHandle,
  type GeniaFileHandle, type OpenedTreeFile,
} from './services/storage'
import { mergeTrees } from './services/treeMerge'
import { generationLayout } from './services/generationLayout'
import { quickChildRelationships, singleSpouse } from './services/quickChild'
import type { FamilyTree, Gender, Person, Relationship, RelationshipType } from './types'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'

type ViewName = 'tree' | 'people' | 'relationships' | 'archive'
type LayoutMode = 'generational' | 'focus' | 'fan' | 'radial' | 'ancestors'
type PersonForm = Omit<Person, 'id'>
type RelativeKind = 'father' | 'mother' | 'son' | 'daughter' | 'brother' | 'sister' | 'spouse' | 'partner'
type ParentLinkType = 'biological-parent' | 'adoptive-parent' | 'foster-parent'

const tree = ref<FamilyTree>(emptyTree())
const activeView = ref<ViewName>('tree')
const layoutMode = ref<LayoutMode>('generational')
const selectedPersonId = ref<string | null>(null)
const highlightedPersonId = ref<string | null>(null)
let viewportRequest = 0
const search = ref('')
const mobileNavOpen = ref(false)
const sidebarCollapsed = ref(false)
const appIconUrl = `${import.meta.env.BASE_URL}genialogic.svg`
const appBuildCode = __APP_BUILD_CODE__
const appBuildMoment = new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(__APP_BUILD_TIMESTAMP__))
const appCommitHash = __APP_COMMIT_HASH__
const buildInfoMode = ref<'version' | 'date' | 'commit'>('version')
const buildInfoLabel = computed(() => buildInfoMode.value === 'version'
  ? `Versione ${appBuildCode}`
  : buildInfoMode.value === 'date' ? `Build del ${appBuildMoment}` : `Commit ${appCommitHash}`)
const buildInfoAction = computed(() => buildInfoMode.value === 'version'
  ? 'Mostra data e ora della build'
  : buildInfoMode.value === 'date' ? 'Mostra hash del commit' : 'Mostra versione')
function cycleBuildInfo() {
  buildInfoMode.value = buildInfoMode.value === 'version' ? 'date' : buildInfoMode.value === 'date' ? 'commit' : 'version'
}
const sidebarPreferenceKey = 'genialogic.sidebar-collapsed'
const modal = ref<'person' | 'relative' | 'couple-child' | 'relationship' | 'delete-person' | 'delete-relationship' | 'new-tree' | null>(null)
const editingPersonId = ref<string | null>(null)
const pendingRelationshipId = ref<string | null>(null)
const pendingCoupleId = ref<string | null>(null)
const relativeReturnPersonId = ref<string | null>(null)
const relationshipError = ref('')
const relationshipPickerTarget = ref<'source' | 'target' | null>(null)
const saveState = ref<'saved' | 'saving' | 'error'>('saved')
const saveStatusLabel = computed(() => saveState.value === 'saving' ? 'Salvataggio…' : saveState.value === 'error' ? 'Errore salvataggio' : 'Salvato in locale')
const toast = ref<{ message: string; tone: 'success' | 'error' } | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const hydrated = ref(false)
const startupPrompt = ref<{ kind: 'file' | 'local'; name: string } | null>(null)
const startupBusy = ref(false)
const conflictBusy = ref(false)
const linkedFileName = ref<string | null>(null)
const pendingFileConflict = ref<OpenedTreeFile | null>(null)
let startupHandle: GeniaFileHandle | null = null
let startupLocal: FamilyTree | null = null
let linkedHandle: GeniaFileHandle | null = null
let fileBaseline: FamilyTree | null = null
let fileInputPurpose: 'open' | 'verify-save' = 'open'
let saveTimer: number | undefined
let toastTimer: number | undefined

const blankPerson = (): PersonForm => ({
  firstName: '', lastName: '', birthName: '', nickname: '', gender: 'unspecified', birthDate: '',
  deathDate: '', birthPlace: '', occupation: '', notes: '', color: personColors[tree.value.people.length % personColors.length],
})
const personForm = reactive<PersonForm>(blankPerson())
const relationshipForm = reactive<{ sourceId: string; targetId: string; type: RelationshipType; startDate: string; endDate: string; notes: string }>({
  sourceId: '', targetId: '', type: 'biological-parent', startDate: '', endDate: '', notes: '',
})
const relativeKind = ref<RelativeKind>('father')
const relativeForm = reactive<{ firstName: string; lastName: string; gender: Gender; birthDate: string; deathDate: string; birthPlace: string; color: string }>({
  firstName: '', lastName: '', gender: 'male', birthDate: '', deathDate: '', birthPlace: '', color: personColors[0],
})
const childForm = reactive<{ firstName: string; lastName: string; gender: Gender; birthDate: string; birthPlace: string; color: string; firstParentType: ParentLinkType; secondParentType: ParentLinkType }>({
  firstName: '', lastName: '', gender: 'unspecified', birthDate: '', birthPlace: '', color: personColors[0], firstParentType: 'biological-parent', secondParentType: 'biological-parent',
})

const { fitView } = useVueFlow()

const navItems = [
  { id: 'tree' as const, label: 'Albero', icon: GitFork },
  { id: 'people' as const, label: 'Persone', icon: Users },
  { id: 'relationships' as const, label: 'Legami', icon: Link2 },
  { id: 'archive' as const, label: 'Archivio', icon: Archive },
]

const relativeChoices: Array<{ value: RelativeKind; label: string; description: string; gender: Gender; copySurname: boolean }> = [
  { value: 'father', label: 'Padre', description: 'Genitore biologico', gender: 'male', copySurname: true },
  { value: 'mother', label: 'Madre', description: 'Genitore biologico', gender: 'female', copySurname: true },
  { value: 'son', label: 'Figlio', description: 'Figlio biologico', gender: 'male', copySurname: true },
  { value: 'daughter', label: 'Figlia', description: 'Figlia biologica', gender: 'female', copySurname: true },
  { value: 'brother', label: 'Fratello', description: 'Condivide i genitori noti', gender: 'male', copySurname: true },
  { value: 'sister', label: 'Sorella', description: 'Condivide i genitori noti', gender: 'female', copySurname: true },
  { value: 'spouse', label: 'Coniuge', description: 'Legame matrimoniale', gender: 'unspecified', copySurname: false },
  { value: 'partner', label: 'Partner', description: 'Relazione di coppia', gender: 'unspecified', copySurname: false },
]

const selectedPerson = computed(() => tree.value.people.find((person) => person.id === selectedPersonId.value) ?? null)
const pendingRelationship = computed(() => tree.value.relationships.find((relationship) => relationship.id === pendingRelationshipId.value) ?? null)
const pendingCouple = computed(() => tree.value.relationships.find((relationship) => relationship.id === pendingCoupleId.value) ?? null)
const relationshipSourcePerson = computed(() => tree.value.people.find((person) => person.id === relationshipForm.sourceId))
const relationshipTargetPerson = computed(() => tree.value.people.find((person) => person.id === relationshipForm.targetId))
const relationshipPickerPeople = computed(() => tree.value.people.filter((person) => person.id !== (relationshipPickerTarget.value === 'source' ? relationshipForm.targetId : relationshipForm.sourceId)))
const selectedRelativeChoice = computed(() => relativeChoices.find((choice) => choice.value === relativeKind.value)!)
const automaticChildSpouse = computed(() => {
  if (!selectedPersonId.value || (relativeKind.value !== 'son' && relativeKind.value !== 'daughter')) return undefined
  return singleSpouse(selectedPersonId.value, tree.value.people, tree.value.relationships)
})
const filteredPeople = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('it')
  if (!term) return tree.value.people
  return tree.value.people.filter((person) => `${person.firstName} ${person.lastName} ${person.birthName ?? ''} ${person.birthPlace ?? ''}`.toLocaleLowerCase('it').includes(term))
})
const parentTypeValues = new Set<RelationshipType>(['biological-parent', 'adoptive-parent', 'foster-parent', 'guardian'])
const sharedParentTypeValues = new Set<RelationshipType>(['biological-parent', 'adoptive-parent', 'foster-parent'])
const coupleTypeValues = new Set<RelationshipType>(['married', 'civil-union', 'partner', 'separated', 'divorced', 'former-partner'])
const nodeWidth = 192
const nodeHeight = 82

function flowNode(person: Person, x: number, y: number): Node {
  return {
    id: person.id,
    type: 'person',
    position: { x: x - nodeWidth / 2, y: y - nodeHeight / 2 },
    data: { person, selected: selectedPersonId.value === person.id, highlighted: highlightedPersonId.value === person.id },
    zIndex: highlightedPersonId.value === person.id ? 100 : 0,
  }
}

function relationshipNeighbours(personId: string) {
  return tree.value.relationships.flatMap((relationship) => {
    if (relationship.sourceId !== personId && relationship.targetId !== personId) return []
    const fromSource = relationship.sourceId === personId
    const otherId = fromSource ? relationship.targetId : relationship.sourceId
    const generationDelta = parentTypeValues.has(relationship.type) ? (fromSource ? 1 : -1) : 0
    return [{ id: otherId, generationDelta }]
  })
}

function centredPositions(rootId: string) {
  const generations = new Map<string, number>([[rootId, 0]])
  const distances = new Map<string, number>([[rootId, 0]])
  const queue = [rootId]
  while (queue.length) {
    const currentId = queue.shift()!
    for (const neighbour of relationshipNeighbours(currentId)) {
      if (generations.has(neighbour.id)) continue
      generations.set(neighbour.id, generations.get(currentId)! + neighbour.generationDelta)
      distances.set(neighbour.id, distances.get(currentId)! + 1)
      queue.push(neighbour.id)
    }
  }

  const highestGeneration = Math.max(0, ...generations.values())
  for (const person of tree.value.people) {
    if (!generations.has(person.id)) {
      generations.set(person.id, highestGeneration + 2)
      distances.set(person.id, Number.MAX_SAFE_INTEGER)
    }
  }

  const rows = new Map<number, Person[]>()
  for (const person of tree.value.people) {
    const generation = generations.get(person.id)!
    rows.set(generation, [...(rows.get(generation) ?? []), person])
  }

  const positions = new Map<string, { x: number; y: number }>()
  const horizontalGap = 238
  const verticalGap = 168
  for (const [generation, people] of [...rows.entries()].sort(([a], [b]) => a - b)) {
    const sorted = [...people].sort((a, b) => {
      if (a.id === rootId) return -1
      if (b.id === rootId) return 1
      return (distances.get(a.id)! - distances.get(b.id)!) || fullName(a).localeCompare(fullName(b), 'it')
    })
    if (generation === 0 && sorted.some((person) => person.id === rootId)) {
      positions.set(rootId, { x: 0, y: 0 })
      sorted.filter((person) => person.id !== rootId).forEach((person, index) => {
        const side = index % 2 === 0 ? -1 : 1
        positions.set(person.id, { x: side * (Math.floor(index / 2) + 1) * horizontalGap, y: 0 })
      })
    } else {
      sorted.forEach((person, index) => positions.set(person.id, {
        x: (index - (sorted.length - 1) / 2) * horizontalGap,
        y: generation * verticalGap,
      }))
    }
  }
  return positions
}

const generationPositions = computed(() => generationLayout(tree.value.people, tree.value.relationships))

function makeFlowNodes(): Node[] {
  const rootId = selectedPersonId.value ?? tree.value.people[0]?.id
  if (rootId && layoutMode.value === 'focus') {
    const positions = centredPositions(rootId)
    return tree.value.people.map((person) => {
      const point = positions.get(person.id) ?? { x: 0, y: 0 }
      return flowNode(person, point.x, point.y)
    })
  }
  return tree.value.people.map((person) => {
    const point = generationPositions.value.get(person.id) ?? { x: 0, y: 0 }
    return flowNode(person, point.x, point.y)
  })
}

const flowNodes = computed(() => makeFlowNodes())
const flowEdges = computed<Edge[]>(() => tree.value.relationships.map((relationship) => {
  const option = relationshipOptions.find((item) => item.value === relationship.type)!
  const parent = option.group === 'Genitorialità'
  const sibling = relationship.type === 'sibling'
  const sourcePosition = generationPositions.value.get(relationship.sourceId)
  const targetPosition = generationPositions.value.get(relationship.targetId)
  const lateral = !parent && layoutMode.value === 'generational' && sourcePosition?.y === targetPosition?.y
  const sourceOnLeft = (sourcePosition?.x ?? 0) < (targetPosition?.x ?? 0)
  const color = parent ? '#6e7588' : sibling ? '#5657d9' : relationship.type === 'divorced' || relationship.type === 'separated' || relationship.type === 'former-partner' ? '#e85d75' : '#0f9b8e'
  return {
    id: relationship.id,
    source: relationship.sourceId,
    target: relationship.targetId,
    sourceHandle: lateral ? (sourceOnLeft ? 'source-right' : 'source-left') : 'source-bottom',
    targetHandle: lateral ? (sourceOnLeft ? 'target-left' : 'target-right') : 'target-top',
    label: option.label,
    type: parent && layoutMode.value === 'focus' ? 'smoothstep' : 'default',
    markerEnd: parent ? { type: MarkerType.ArrowClosed, color } : undefined,
    style: { stroke: color, strokeWidth: parent ? 1.7 : 2.2, strokeDasharray: relationship.type === 'divorced' || relationship.type === 'separated' || relationship.type === 'former-partner' ? '6 5' : undefined },
    labelStyle: { fill: color, fontSize: 9, fontWeight: 700 },
    labelBgStyle: { fill: '#faf8f2', fillOpacity: 0.94 },
    labelBgPadding: [5, 3] as [number, number],
    labelBgBorderRadius: 5,
  }
}))

const relationshipGroups = computed(() => ['Genitorialità', 'Fratellanza', 'Coppia'].map((group) => ({
  name: group,
  options: relationshipOptions.filter((option) => option.group === group),
})))

function fullName(person?: Person | null) { return person ? `${person.firstName} ${person.lastName}` : 'Persona sconosciuta' }
function findPerson(id: string) { return tree.value.people.find((person) => person.id === id) }
function relationshipLabel(type: RelationshipType) { return relationshipOptions.find((option) => option.value === type)?.label ?? type }
function initials(person: Person) { return `${person.firstName[0] || ''}${person.lastName[0] || ''}`.toUpperCase() }
function dateLabel(value?: string) { return value ? new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`)) : '' }
function lifeLabel(person: Person) {
  if (!person.birthDate && !person.deathDate) return 'Date non inserite'
  const birth = person.birthDate?.slice(0, 4) ?? '?'
  return person.deathDate ? `${birth} – ${person.deathDate.slice(0, 4)}` : `n. ${birth}`
}
function showToast(message: string, tone: 'success' | 'error' = 'success') {
  toast.value = { message, tone }
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toast.value = null }, 3400)
}
function goTo(view: ViewName) { activeView.value = view; mobileNavOpen.value = false }
function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
  try { localStorage.setItem(sidebarPreferenceKey, String(sidebarCollapsed.value)) } catch { /* Storage may be unavailable in private browsing. */ }
  refit()
}

function openNewPerson() {
  editingPersonId.value = null
  Object.assign(personForm, blankPerson())
  modal.value = 'person'
}
function openEditPerson(person: Person) {
  editingPersonId.value = person.id
  Object.assign(personForm, { ...blankPerson(), ...person })
  modal.value = 'person'
}
function openRelative() {
  if (!selectedPerson.value) return
  relativeReturnPersonId.value = null
  relativeKind.value = 'father'
  Object.assign(relativeForm, {
    firstName: '',
    lastName: selectedPerson.value.lastName,
    gender: 'male' as Gender,
    birthDate: '',
    deathDate: '',
    birthPlace: '',
    color: personColors[tree.value.people.length % personColors.length],
  })
  modal.value = 'relative'
}
function openRelativeFor(personId: string) {
  selectedPersonId.value = personId
  openRelative()
}
function openParentFromRadial(payload: { childId: string; gender: Extract<Gender, 'male' | 'female'> }) {
  selectedPersonId.value = payload.childId
  openRelative()
  relativeReturnPersonId.value = payload.childId
  chooseRelative(payload.gender === 'male' ? 'father' : 'mother')
}
function chooseRelative(kind: RelativeKind) {
  const previousChoice = selectedRelativeChoice.value
  const surnameWasAutomatic = !relativeForm.lastName || (previousChoice.copySurname && relativeForm.lastName === selectedPerson.value?.lastName)
  relativeKind.value = kind
  const choice = selectedRelativeChoice.value
  relativeForm.gender = choice.gender
  if (choice.copySurname && surnameWasAutomatic) relativeForm.lastName = selectedPerson.value?.lastName ?? ''
  if (!choice.copySurname && surnameWasAutomatic) relativeForm.lastName = ''
}
function submitRelative() {
  const reference = selectedPerson.value
  if (!reference || !relativeForm.firstName.trim() || !relativeForm.lastName.trim()) return
  const newPerson: Person = {
    id: crypto.randomUUID(), firstName: relativeForm.firstName.trim(), lastName: relativeForm.lastName.trim(),
    gender: relativeForm.gender, birthDate: relativeForm.birthDate, deathDate: relativeForm.deathDate, birthPlace: relativeForm.birthPlace.trim(),
    color: relativeForm.color,
  }
  const makeRelationship = (sourceId: string, targetId: string, type: RelationshipType): Relationship => ({
    id: crypto.randomUUID(), sourceId, targetId, type,
  })
  const links: Relationship[] = []
  if (relativeKind.value === 'father' || relativeKind.value === 'mother') {
    links.push(makeRelationship(newPerson.id, reference.id, 'biological-parent'))
  } else if (relativeKind.value === 'son' || relativeKind.value === 'daughter') {
    links.push(...quickChildRelationships(reference.id, newPerson.id, tree.value.people, tree.value.relationships))
  } else if (relativeKind.value === 'brother' || relativeKind.value === 'sister') {
    const knownParents = tree.value.relationships.filter((relationship) => sharedParentTypeValues.has(relationship.type) && relationship.targetId === reference.id)
    if (knownParents.length) {
      knownParents.forEach((relationship) => links.push(makeRelationship(relationship.sourceId, newPerson.id, relationship.type)))
    } else {
      links.push(makeRelationship(reference.id, newPerson.id, 'sibling'))
    }
  } else {
    links.push(makeRelationship(reference.id, newPerson.id, relativeKind.value === 'spouse' ? 'married' : 'partner'))
  }
  tree.value.people.push(newPerson)
  tree.value.relationships.push(...links)
  selectedPersonId.value = relativeReturnPersonId.value ?? newPerson.id
  relativeReturnPersonId.value = null
  modal.value = null
  showToast('Persona e legame aggiunti')
  refit()
}
function suggestedChildSurname(relationship: Relationship) {
  const people = [findPerson(relationship.sourceId), findPerson(relationship.targetId)].filter((person): person is Person => Boolean(person))
  return people.find((person) => person.gender === 'male')?.lastName
    ?? people.find((person) => person.gender === 'female')?.lastName
    ?? people[0]?.lastName
    ?? ''
}
function openCoupleChild(relationship: Relationship) {
  pendingCoupleId.value = relationship.id
  Object.assign(childForm, {
    firstName: '', lastName: suggestedChildSurname(relationship), gender: 'unspecified' as Gender,
    birthDate: '', birthPlace: '', color: personColors[tree.value.people.length % personColors.length],
    firstParentType: 'biological-parent' as ParentLinkType, secondParentType: 'biological-parent' as ParentLinkType,
  })
  modal.value = 'couple-child'
}
function submitCoupleChild() {
  const relationship = pendingCouple.value
  if (!relationship || !childForm.firstName.trim() || !childForm.lastName.trim()) return
  const child: Person = {
    id: crypto.randomUUID(), firstName: childForm.firstName.trim(), lastName: childForm.lastName.trim(),
    gender: childForm.gender, birthDate: childForm.birthDate, birthPlace: childForm.birthPlace.trim(), color: childForm.color,
  }
  tree.value.people.push(child)
  tree.value.relationships.push(
    { id: crypto.randomUUID(), sourceId: relationship.sourceId, targetId: child.id, type: childForm.firstParentType },
    { id: crypto.randomUUID(), sourceId: relationship.targetId, targetId: child.id, type: childForm.secondParentType },
  )
  selectedPersonId.value = child.id
  pendingCoupleId.value = null
  activeView.value = 'tree'
  modal.value = null
  showToast('Figlio o figlia aggiunto alla coppia')
  refit()
}
function submitPerson() {
  if (!personForm.firstName.trim() || !personForm.lastName.trim()) return
  const clean = Object.fromEntries(Object.entries(personForm).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])) as unknown as PersonForm
  if (editingPersonId.value) {
    const index = tree.value.people.findIndex((person) => person.id === editingPersonId.value)
    if (index >= 0) tree.value.people[index] = { id: editingPersonId.value, ...clean }
    showToast('Persona aggiornata')
  } else {
    const person = { id: crypto.randomUUID(), ...clean }
    tree.value.people.push(person)
    selectedPersonId.value = person.id
    showToast('Persona aggiunta all’albero')
  }
  modal.value = null
  refit()
}
function askDeletePerson(person: Person) { selectedPersonId.value = person.id; modal.value = 'delete-person' }
function deleteSelectedPerson() {
  if (!selectedPersonId.value) return
  const id = selectedPersonId.value
  tree.value.people = tree.value.people.filter((person) => person.id !== id)
  tree.value.relationships = tree.value.relationships.filter((relationship) => relationship.sourceId !== id && relationship.targetId !== id)
  selectedPersonId.value = tree.value.people[0]?.id ?? null
  modal.value = null
  showToast('Persona e relativi legami rimossi')
  refit()
}

function openRelationship(prefillId?: string) {
  relationshipPickerTarget.value = null
  relationshipError.value = ''
  relationshipForm.sourceId = prefillId ?? selectedPersonId.value ?? tree.value.people[0]?.id ?? ''
  relationshipForm.targetId = ''
  relationshipForm.type = 'biological-parent'
  relationshipForm.startDate = ''
  relationshipForm.endDate = ''
  relationshipForm.notes = ''
  modal.value = 'relationship'
}
function selectRelationshipPerson(personId: string) {
  if (relationshipPickerTarget.value === 'source') relationshipForm.sourceId = personId
  else if (relationshipPickerTarget.value === 'target') relationshipForm.targetId = personId
  relationshipPickerTarget.value = null
  relationshipError.value = ''
}
function swapRelationshipPeople() {
  const first = relationshipForm.sourceId
  relationshipForm.sourceId = relationshipForm.targetId
  relationshipForm.targetId = first
  relationshipError.value = ''
}
function hasParentPath(fromId: string, toId: string, visited = new Set<string>()): boolean {
  if (fromId === toId) return true
  if (visited.has(fromId)) return false
  visited.add(fromId)
  return tree.value.relationships.filter((rel) => parentTypeValues.has(rel.type) && rel.sourceId === fromId).some((rel) => hasParentPath(rel.targetId, toId, visited))
}
function validateRelationship(): string | null {
  const { sourceId, targetId, type } = relationshipForm
  if (!sourceId || !targetId) return 'Scegli entrambe le persone.'
  if (sourceId === targetId) return 'Una persona non può avere un legame con sé stessa.'
  const option = relationshipOptions.find((item) => item.value === type)!
  const duplicate = tree.value.relationships.some((rel) => rel.type === type && (option.directional
    ? rel.sourceId === sourceId && rel.targetId === targetId
    : (rel.sourceId === sourceId && rel.targetId === targetId) || (rel.sourceId === targetId && rel.targetId === sourceId)))
  if (duplicate) return 'Questo legame è già presente.'
  if (parentTypeValues.has(type)) {
    if (hasParentPath(targetId, sourceId)) return 'Questo legame creerebbe un ciclo tra genitori e figli.'
    if (type === 'biological-parent' && tree.value.relationships.filter((rel) => rel.type === type && rel.targetId === targetId).length >= 2) return 'Questa persona ha già due genitori biologici.'
    const parent = findPerson(sourceId); const child = findPerson(targetId)
    if (parent?.birthDate && child?.birthDate && parent.birthDate >= child.birthDate) return 'La data di nascita del genitore deve precedere quella del figlio.'
  } else {
    const pairExists = tree.value.relationships.some((rel) => !parentTypeValues.has(rel.type) && ((rel.sourceId === sourceId && rel.targetId === targetId) || (rel.sourceId === targetId && rel.targetId === sourceId)))
    if (pairExists) return 'Esiste già un legame non genitoriale tra queste persone. Rimuovilo prima di cambiarne il tipo.'
  }
  if (relationshipForm.startDate && relationshipForm.endDate && relationshipForm.startDate > relationshipForm.endDate) return 'La data di fine deve essere successiva alla data di inizio.'
  return null
}
function submitRelationship() {
  relationshipError.value = validateRelationship() ?? ''
  if (relationshipError.value) return
  tree.value.relationships.push({ id: crypto.randomUUID(), ...relationshipForm })
  relationshipPickerTarget.value = null
  modal.value = null
  showToast('Legame aggiunto')
  refit()
}
function askDeleteRelationship(id: string) {
  pendingRelationshipId.value = id
  modal.value = 'delete-relationship'
}
function confirmDeleteRelationship() {
  if (!pendingRelationshipId.value) return
  tree.value.relationships = tree.value.relationships.filter((relationship) => relationship.id !== pendingRelationshipId.value)
  pendingRelationshipId.value = null
  modal.value = null
  showToast('Legame rimosso')
  refit()
}

function selectNode(event: { node: Node }) {
  viewportRequest++
  selectedPersonId.value = event.node.id
  if (layoutMode.value !== 'generational') refit()
}
function setLayoutMode(mode: LayoutMode) {
  layoutMode.value = mode
  if (!selectedPersonId.value) selectedPersonId.value = tree.value.people[0]?.id ?? null
  refit()
}
function refit() {
  const request = ++viewportRequest
  if (!tree.value.people.length || !graphVisible()) return
  nextTick(() => window.setTimeout(() => {
    if (request === viewportRequest) void fitView({ padding: 0.18, duration: 500 })
  }, 80))
}

function graphVisible() { return activeView.value === 'tree' && (layoutMode.value === 'generational' || layoutMode.value === 'focus') }

async function revealPerson(personId: string) {
  if (!findPerson(personId) || !graphVisible()) return
  const request = ++viewportRequest
  selectedPersonId.value = personId
  highlightedPersonId.value = personId
  // Allow the focus layout, inspector and Vue Flow's ResizeObserver to settle.
  await nextTick()
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  await nextTick()
  if (request !== viewportRequest || !graphVisible() || selectedPersonId.value !== personId) return
  const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450
  const centered = await fitView({ nodes: [personId], padding: .5, maxZoom: 1.15, duration })
  if (!centered && request === viewportRequest) showToast('Persona selezionata. Usa “Centra albero” per ritrovarla.', 'error')
}

watch(selectedPersonId, (id) => {
  if (highlightedPersonId.value !== id) highlightedPersonId.value = null
})

function cloneTree(value: FamilyTree): FamilyTree {
  return JSON.parse(JSON.stringify(value)) as FamilyTree
}
function sameTree(left: FamilyTree, right: FamilyTree) {
  return JSON.stringify(left) === JSON.stringify(right)
}
function activateTree(imported: FamilyTree) {
  tree.value = imported
  selectedPersonId.value = imported.people[0]?.id ?? null
  activeView.value = 'tree'
  refit()
}
async function connectHandle(handle: GeniaFileHandle, opened?: OpenedTreeFile) {
  if (!await ensureFilePermission(handle)) throw new Error('Permesso di accesso al file non concesso.')
  const fresh = opened ?? await readTreeHandle(handle)
  linkedHandle = handle
  linkedFileName.value = fresh.name || handle.name
  fileBaseline = cloneTree(fresh.tree)
  try { await rememberFileHandle(handle) } catch { /* Il collegamento resta valido per la sessione corrente. */ }
  activateTree(fresh.tree)
}
async function saveFile() {
  try {
    if (linkedHandle && fileBaseline) {
      if (!await ensureFilePermission(linkedHandle)) throw new Error('Permesso di accesso al file non concesso.')
      const currentFile = await readTreeHandle(linkedHandle)
      if (!sameTree(currentFile.tree, fileBaseline)) {
        pendingFileConflict.value = currentFile
        return
      }
      await writeTreeHandle(linkedHandle, tree.value)
      fileBaseline = cloneTree(tree.value)
      showToast(`“${linkedFileName.value}” aggiornato`)
      return
    }
    if (fileBaseline && linkedFileName.value && !('showOpenFilePicker' in window)) {
      const input = fileInput.value
      if (!input) return
      fileInputPurpose = 'verify-save'
      input.value = ''
      input.click()
      return
    }
    const handle = await createTreeHandle(tree.value)
    if (handle) {
      linkedHandle = handle
      linkedFileName.value = handle.name
      fileBaseline = cloneTree(tree.value)
      try { await rememberFileHandle(handle) } catch { /* Il file è comunque stato salvato. */ }
      showToast(`“${handle.name}” salvato e collegato`)
    } else {
      await exportTree(tree.value)
      showToast('Archivio .genia scaricato')
    }
  } catch (error) {
    if ((error as DOMException)?.name !== 'AbortError') showToast(error instanceof Error ? error.message : 'Non è stato possibile salvare il file', 'error')
  }
}
async function chooseFile() {
  try {
    const handle = await pickTreeHandle()
    if (handle) {
      await connectHandle(handle)
      showToast(`“${handle.name}” aperto e collegato`)
      return
    }
  } catch (error) {
    if ((error as DOMException)?.name !== 'AbortError') showToast(error instanceof Error ? error.message : 'Non è stato possibile aprire il file', 'error')
    return
  }
  const input = fileInput.value
  if (!input) return
  fileInputPurpose = 'open'
  input.value = ''
  input.click()
}
async function openFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const imported = await importTree(file)
    if (fileInputPurpose === 'verify-save') {
      if (linkedFileName.value && file.name !== linkedFileName.value) throw new Error(`Seleziona “${linkedFileName.value}” per verificare le modifiche prima del salvataggio.`)
      const currentFile = { tree: imported, lastModified: file.lastModified, name: file.name }
      if (fileBaseline && !sameTree(imported, fileBaseline)) {
        pendingFileConflict.value = currentFile
      } else {
        await exportTree(tree.value)
        fileBaseline = cloneTree(tree.value)
        showToast('Archivio verificato e scaricato')
      }
      return
    }
    linkedHandle = null
    linkedFileName.value = file.name
    fileBaseline = cloneTree(imported)
    try { await forgetFileHandle() } catch { /* L'apertura manuale resta valida. */ }
    activateTree(imported)
    showToast(`“${imported.name}” aperto`)
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'File non valido', 'error')
  } finally {
    fileInputPurpose = 'open'
    input.value = ''
  }
}
async function reopenPrevious() {
  startupBusy.value = true
  try {
    if (startupPrompt.value?.kind === 'file' && startupHandle) {
      await connectHandle(startupHandle)
      showToast(`“${linkedFileName.value}” ricaricato dal disco`)
    } else if (startupLocal) {
      activateTree(cloneTree(startupLocal))
    }
    startupPrompt.value = null
    hydrated.value = true
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Non è stato possibile riaprire il file', 'error')
  } finally { startupBusy.value = false }
}
async function declinePrevious() {
  startupBusy.value = true
  try { await forgetFileHandle() } catch { /* Il nuovo archivio può essere creato comunque. */ }
  startupPrompt.value = null
  startupHandle = null
  startupLocal = null
  linkedHandle = null
  linkedFileName.value = null
  fileBaseline = null
  activateTree(emptyTree())
  hydrated.value = true
  startupBusy.value = false
}
async function resolveFileConflict(action: 'merge' | 'overwrite') {
  if (!fileBaseline || !pendingFileConflict.value) return
  conflictBusy.value = true
  try {
    let latest = pendingFileConflict.value
    if (linkedHandle) {
      latest = await readTreeHandle(linkedHandle)
      if (!sameTree(latest.tree, pendingFileConflict.value.tree)) {
        pendingFileConflict.value = latest
        showToast('Il file è cambiato di nuovo: controlla il conflitto aggiornato.', 'error')
        return
      }
    }
    let output = tree.value
    let mergeConflicts = 0
    if (action === 'merge') {
      const merged = mergeTrees(fileBaseline, tree.value, latest.tree)
      tree.value = merged.tree
      output = merged.tree
      mergeConflicts = merged.conflicts
    }
    if (linkedHandle) await writeTreeHandle(linkedHandle, output)
    else await exportTree(output)
    fileBaseline = cloneTree(output)
    const destination = linkedHandle ? 'file aggiornato' : 'nuovo file scaricato'
    showToast(action === 'merge'
      ? mergeConflicts ? `Modifiche unite; ${mergeConflicts} conflitti risolti con i valori locali (${destination})` : `Modifiche unite; ${destination}`
      : linkedHandle ? 'File esterno sovrascritto' : 'Copia locale salvata in un nuovo file')
    pendingFileConflict.value = null
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Non è stato possibile risolvere il conflitto', 'error')
  } finally { conflictBusy.value = false }
}
async function createNewTree() {
  linkedHandle = null
  linkedFileName.value = null
  fileBaseline = null
  try { await forgetFileHandle() } catch { /* La sessione è già scollegata. */ }
  tree.value = emptyTree()
  selectedPersonId.value = null
  activeView.value = 'tree'
  modal.value = null
  showToast('Nuovo albero creato')
}
watch(() => [tree.value.name, tree.value.people, tree.value.relationships], () => {
  if (!hydrated.value) return
  tree.value.updatedAt = new Date().toISOString()
  saveState.value = 'saving'
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(async () => {
    try { await saveLocal(tree.value); saveState.value = 'saved' } catch { saveState.value = 'error' }
  }, 550)
}, { deep: true })

onMounted(async () => {
  try { sidebarCollapsed.value = localStorage.getItem(sidebarPreferenceKey) === 'true' } catch { /* Use the default layout if storage is unavailable. */ }
  try {
    const [handle, local] = await Promise.all([getRememberedFileHandle(), loadLocal()])
    // Le vecchie installazioni potevano contenere un archivio dimostrativo.
    // Non lo ripristiniamo: gli alberi reali hanno identificativi differenti.
    startupLocal = local && local.id !== 'tree-moretti' ? local : null
    startupHandle = handle
    if (handle) startupPrompt.value = { kind: 'file', name: handle.name }
    else if (startupLocal) startupPrompt.value = { kind: 'local', name: startupLocal.name }
    else hydrated.value = true
  } catch {
    hydrated.value = true
    showToast('Salvataggio locale non disponibile', 'error')
  }
  if (!startupPrompt.value) {
    selectedPersonId.value = tree.value.people[0]?.id ?? null
    refit()
  }
})
</script>

<template>
  <div class="app-shell" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <!-- No accept filter: iOS can otherwise disable .genia files in Files. -->
    <input ref="fileInput" class="sr-only" type="file" aria-label="Apri archivio GeniaLogic (.genia)" @change="openFile" />
    <aside id="main-sidebar" class="sidebar" :class="{ open: mobileNavOpen }" aria-label="Navigazione e comandi" @keydown.esc="mobileNavOpen = false">
      <div class="sidebar-brand-row">
        <div class="brand">
          <button class="brand-home" aria-label="GeniaLogic — Vai all’albero" title="Vai all’albero" @click="goTo('tree')"><img class="brand-mark" :src="appIconUrl" alt="" width="32" height="32" /></button>
          <div class="brand-copy"><button class="brand-name" @click="goTo('tree')">GeniaLogic</button><button class="brand-build-meta" :aria-label="`${buildInfoLabel}; ${buildInfoAction}`" :title="buildInfoAction" @click="cycleBuildInfo">{{ buildInfoLabel }}</button></div>
        </div>
        <button class="icon-button sidebar-toggle" :aria-label="sidebarCollapsed ? 'Espandi sidebar' : 'Comprimi sidebar'" :title="sidebarCollapsed ? 'Espandi sidebar' : 'Comprimi sidebar'" :aria-expanded="!sidebarCollapsed" aria-controls="main-sidebar" @click="toggleSidebar"><PanelLeftOpen v-if="sidebarCollapsed" :size="20" /><PanelLeftClose v-else :size="20" /></button>
        <button class="icon-button mobile-menu" aria-label="Chiudi navigazione" aria-controls="main-sidebar" @click="mobileNavOpen = false"><X :size="20" /></button>
      </div>
      <div class="tree-heading">
        <p class="eyebrow">Albero attivo</p>
        <p class="tree-name">{{ tree.name }}</p>
        <p>{{ tree.people.length }} persone · {{ tree.relationships.length }} legami</p>
      </div>
      <button class="button primary sidebar-add-person" aria-label="Aggiungi persona" title="Aggiungi persona" @click="mobileNavOpen = false; openNewPerson()"><Plus :size="18" /><span>Aggiungi persona</span></button>
      <nav aria-label="Navigazione principale">
        <button v-for="item in navItems" :key="item.id" :class="{ active: activeView === item.id }" :aria-label="item.label" :title="item.label" :aria-current="activeView === item.id ? 'page' : undefined" @click="goTo(item.id)"><component :is="item.icon" :size="18" /><span>{{ item.label }}</span><ChevronRight :size="14" /></button>
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-file-actions">
          <button aria-label="Apri archivio" title="Apri archivio" @click="mobileNavOpen = false; chooseFile()"><FolderOpen :size="18" /><span>Apri archivio</span></button>
          <button aria-label="Salva file .genia" title="Salva file .genia" @click="mobileNavOpen = false; saveFile()"><Save :size="18" /><span>Salva file .genia</span></button>
        </div>
        <div class="save-state" :class="saveState" role="status" :aria-label="linkedFileName ? `${saveStatusLabel}; file collegato ${linkedFileName}` : saveStatusLabel" :title="linkedFileName ? `File collegato: ${linkedFileName}` : saveStatusLabel"><Check v-if="saveState === 'saved'" :size="16" /><Info v-else-if="saveState === 'error'" :size="16" /><Save v-else :size="16" /><span>{{ linkedFileName ? `Collegato: ${linkedFileName}` : saveStatusLabel }}</span></div>
        <div class="sidebar-note"><ShieldCheck :size="18" /><div><strong>Privato per natura</strong><p>I dati non lasciano mai questo dispositivo.</p></div></div>
      </div>
    </aside>
    <button v-if="mobileNavOpen" class="nav-scrim" aria-label="Chiudi navigazione" @click="mobileNavOpen = false" />

    <main class="main-area" :class="{ 'tree-main': activeView === 'tree' }">
      <button class="icon-button mobile-menu mobile-nav-launcher" aria-label="Apri navigazione" :aria-expanded="mobileNavOpen" aria-controls="main-sidebar" @click="mobileNavOpen = true"><Menu :size="22" /></button>
      <template v-if="activeView === 'tree'">
        <section class="view-toolbar tree-view-toolbar">
          <h1 class="sr-only">Albero</h1>
          <div class="tree-view-actions">
            <div class="layout-switch" role="group" aria-label="Disposizione dell’albero">
              <button type="button" :class="{ active: layoutMode === 'generational' }" title="Disponi per generazioni" @click="setLayoutMode('generational')"><GitFork :size="15" /><span>Generazioni</span></button>
              <button type="button" :class="{ active: layoutMode === 'focus' }" title="Metti la persona selezionata al centro" @click="setLayoutMode('focus')"><Focus :size="15" /><span>Al centro</span></button>
              <button type="button" :class="{ active: layoutMode === 'fan' }" :aria-pressed="layoutMode === 'fan'" title="Mostra il ventaglio degli antenati a 180°" @click="setLayoutMode('fan')"><CircleDot :size="15" /><span>Ventaglio</span></button>
              <button type="button" :class="{ active: layoutMode === 'radial' }" :aria-pressed="layoutMode === 'radial'" title="Mostra gli antenati nel cerchio completo a 360°" @click="setLayoutMode('radial')"><CircleDot :size="15" /><span>Radiale</span></button>
              <button type="button" :class="{ active: layoutMode === 'ancestors' }" title="Mostra solo gli antenati" @click="setLayoutMode('ancestors')"><GitFork :size="15" /><span>Antenati</span></button>
            </div>
            <button class="button secondary" :disabled="tree.people.length < 2" @click="openRelationship()"><Link2 :size="16" />Aggiungi legame</button>
          </div>
        </section>
        <section class="tree-workspace">
          <div v-if="tree.people.length" class="flow-wrap" :class="{ 'radial-mode': layoutMode === 'fan' || layoutMode === 'radial' || layoutMode === 'ancestors' }">
            <div v-if="graphVisible()" class="graph-search-toolbar">
              <GraphPersonSearch :key="tree.id" :people="tree.people" :selected-id="selectedPersonId" @select-person="revealPerson" />
              <button class="fit-button" title="Centra albero" aria-label="Centra albero" @click="refit"><Maximize2 :size="17" /></button>
            </div>
            <RadialTree v-if="layoutMode === 'fan' || layoutMode === 'radial'" :shape="layoutMode === 'radial' ? 'circle' : 'fan'" :people="tree.people" :relationships="tree.relationships" :root-id="selectedPersonId ?? tree.people[0].id" @select-person="selectedPersonId = $event" @add-parent="openParentFromRadial" />
            <AncestorTree v-else-if="layoutMode === 'ancestors'" :key="tree.id" :people="tree.people" :relationships="tree.relationships" :root-id="selectedPersonId ?? tree.people[0].id" @select-person="selectedPersonId = $event" />
            <VueFlow v-else :nodes="flowNodes" :edges="flowEdges" :min-zoom="0.18" :max-zoom="1.7" fit-view-on-init nodes-draggable :nodes-connectable="false" :elements-selectable="true" @node-click="selectNode">
              <template #node-person="props"><PersonNode v-bind="props" @add-relative="openRelativeFor" /></template>
              <Background pattern-color="#d7d2c7" :gap="20" :size="1" />
              <Controls position="bottom-left" :show-interactive="false" />
            </VueFlow>
            <div v-if="graphVisible()" class="legend"><span><i class="parent-line" />Genitorialità</span><span><i class="sibling-line" />Fratelli</span><span><i class="couple-line" />Coppia</span><span><i class="ended-line" />Concluso</span></div>
          </div>
          <div v-else class="empty-state"><div class="empty-icon"><GitFork :size="28" /></div><p class="eyebrow">Un nuovo inizio</p><h2>Il tuo albero è ancora vuoto</h2><p>Aggiungi la prima persona. Potrai poi collegarla a genitori, figli e partner.</p><button class="button primary" @click="openNewPerson"><UserRoundPlus :size="17" />Aggiungi la prima persona</button></div>

          <aside v-if="selectedPerson" class="inspector">
            <div class="inspector-top"><p class="eyebrow">Scheda persona</p><button class="icon-button" aria-label="Chiudi scheda" @click="selectedPersonId = null"><X :size="17" /></button></div>
            <div class="profile-head"><div class="profile-avatar" :style="{ background: selectedPerson.color }">{{ initials(selectedPerson) }}</div><div><h2>{{ fullName(selectedPerson) }}</h2><p>{{ lifeLabel(selectedPerson) }}</p></div></div>
            <div class="profile-actions"><button @click="openEditPerson(selectedPerson)"><Edit3 :size="15" />Modifica</button><button @click="openRelationship(selectedPerson.id)"><Link2 :size="15" />Collega</button><button class="danger-icon" title="Elimina persona" aria-label="Elimina persona" @click="askDeletePerson(selectedPerson)"><Trash2 :size="15" /></button></div>
            <button class="quick-relative-button" @click="openRelative"><UserRoundPlus :size="17" /><span><small>Nuova persona collegata</small>Aggiungi parente</span><ChevronRight :size="16" /></button>
            <dl class="facts">
              <div v-if="selectedPerson.birthDate"><dt><CalendarDays :size="14" />Nascita</dt><dd>{{ dateLabel(selectedPerson.birthDate) }}</dd></div>
              <div v-if="selectedPerson.birthPlace"><dt><MapPin :size="14" />Luogo</dt><dd>{{ selectedPerson.birthPlace }}</dd></div>
              <div v-if="selectedPerson.occupation"><dt>Professione</dt><dd>{{ selectedPerson.occupation }}</dd></div>
              <div v-if="selectedPerson.birthName"><dt>Cognome alla nascita</dt><dd>{{ selectedPerson.birthName }}</dd></div>
            </dl>
            <div v-if="selectedPerson.notes" class="story"><p class="eyebrow">Memoria</p><p>“{{ selectedPerson.notes }}”</p></div>
            <div class="person-links">
              <p class="section-label">Legami</p>
              <div v-for="rel in tree.relationships.filter(r => r.sourceId === selectedPerson!.id || r.targetId === selectedPerson!.id)" :key="rel.id" class="person-link-row">
                <button class="person-link-main" @click="selectedPersonId = rel.sourceId === selectedPerson!.id ? rel.targetId : rel.sourceId"><span>{{ relationshipLabel(rel.type) }}</span><strong>{{ fullName(findPerson(rel.sourceId === selectedPerson!.id ? rel.targetId : rel.sourceId)) }}</strong><ChevronRight :size="13" /></button>
                <button v-if="coupleTypeValues.has(rel.type)" class="person-link-add-child" :aria-label="`Aggiungi un discendente con ${fullName(findPerson(rel.sourceId === selectedPerson!.id ? rel.targetId : rel.sourceId))}`" title="Aggiungi figlio/a" @click="openCoupleChild(rel)"><UserRoundPlus :size="14" /></button>
                <button class="person-link-delete" :aria-label="`Rimuovi legame con ${fullName(findPerson(rel.sourceId === selectedPerson!.id ? rel.targetId : rel.sourceId))}`" title="Rimuovi legame" @click="askDeleteRelationship(rel.id)"><Trash2 :size="14" /></button>
              </div>
              <p v-if="!tree.relationships.some(r => r.sourceId === selectedPerson!.id || r.targetId === selectedPerson!.id)" class="muted-empty">Nessun legame ancora.</p>
            </div>
          </aside>
        </section>
      </template>

      <template v-else-if="activeView === 'people'">
        <section class="view-toolbar"><div><p class="eyebrow">Indice</p><h1>Persone</h1><p>Tutte le persone custodite in questo archivio.</p></div><button class="button primary" @click="openNewPerson"><Plus :size="17" />Aggiungi persona</button></section>
        <section class="content-panel">
          <div class="list-toolbar"><label class="search-box"><Search :size="17" /><input v-model="search" type="search" placeholder="Cerca nome, cognome o luogo…" /></label><span><ListFilter :size="15" />{{ filteredPeople.length }} risultati</span></div>
          <div v-if="filteredPeople.length" class="people-grid">
            <article v-for="person in filteredPeople" :key="person.id" class="person-tile" @click="selectedPersonId = person.id; activeView = 'tree'">
              <div class="tile-avatar" :style="{ background: person.color }">{{ initials(person) }}</div><div class="min-w-0"><h2>{{ fullName(person) }}</h2><p>{{ lifeLabel(person) }}<template v-if="person.birthPlace"> · {{ person.birthPlace }}</template></p><span v-if="person.occupation">{{ person.occupation }}</span></div>
              <button class="icon-button" aria-label="Modifica persona" @click.stop="openEditPerson(person)"><MoreHorizontal :size="17" /></button>
            </article>
          </div>
          <div v-else class="empty-small"><Users :size="28" /><h2>Nessuna persona trovata</h2><p>Prova a cambiare la ricerca oppure aggiungi una nuova persona.</p></div>
        </section>
      </template>

      <template v-else-if="activeView === 'relationships'">
        <section class="view-toolbar"><div><p class="eyebrow">Connessioni</p><h1>Legami</h1><p>Genitorialità e relazioni di coppia, anche nel tempo.</p></div><button class="button secondary" :disabled="tree.people.length < 2" @click="openRelationship()"><Plus :size="17" />Aggiungi legame</button></section>
        <section class="content-panel relationship-list">
          <article v-for="relationship in tree.relationships" :key="relationship.id" class="relationship-row">
            <div class="relation-icon" :class="parentTypeValues.has(relationship.type) ? 'parent' : relationship.type === 'sibling' ? 'sibling' : 'couple'"><GitFork v-if="parentTypeValues.has(relationship.type)" :size="18" /><Users v-else-if="relationship.type === 'sibling'" :size="18" /><Heart v-else :size="18" /></div>
            <div class="relation-people"><strong>{{ fullName(findPerson(relationship.sourceId)) }}</strong><span>{{ relationshipLabel(relationship.type) }}</span><strong>{{ fullName(findPerson(relationship.targetId)) }}</strong></div>
            <div class="relation-dates"><span v-if="relationship.startDate">dal {{ dateLabel(relationship.startDate) }}</span><span v-if="relationship.endDate">al {{ dateLabel(relationship.endDate) }}</span></div>
            <button v-if="coupleTypeValues.has(relationship.type)" class="add-child-button" type="button" :aria-label="`Aggiungi un discendente a ${fullName(findPerson(relationship.sourceId))} e ${fullName(findPerson(relationship.targetId))}`" @click="openCoupleChild(relationship)"><UserRoundPlus :size="16" /><span>Aggiungi figlio/a</span></button>
            <button class="icon-button danger-icon" :aria-label="`Rimuovi legame ${relationshipLabel(relationship.type)} tra ${fullName(findPerson(relationship.sourceId))} e ${fullName(findPerson(relationship.targetId))}`" title="Rimuovi legame" @click="askDeleteRelationship(relationship.id)"><Trash2 :size="16" /></button>
          </article>
          <div v-if="!tree.relationships.length" class="empty-small"><Link2 :size="28" /><h2>Nessun legame</h2><p>Aggiungi almeno due persone, poi descrivi la loro relazione.</p></div>
        </section>
      </template>

      <template v-else>
        <section class="view-toolbar"><div><p class="eyebrow">Dati e sicurezza</p><h1>Archivio</h1><p>Gestisci il file esterno e la copia automatica su questo dispositivo.</p></div></section>
        <section class="archive-grid">
          <article class="archive-card featured"><div class="archive-card-icon"><Save :size="24" /></div><p class="eyebrow">Copia portatile</p><h2>Salva il tuo archivio</h2><p>Il formato <strong>.genia</strong> è compresso e non è leggibile direttamente in un editor di testo. Non è cifrato: conservalo in un luogo sicuro.</p><button class="button primary" @click="saveFile"><Download :size="16" />Salva file .genia</button></article>
          <article class="archive-card"><div class="archive-card-icon"><FolderOpen :size="24" /></div><p class="eyebrow">Importazione</p><h2>Apri un archivio</h2><p>Carica un file .genia creato in precedenza. L’albero aperto sostituirà quello attualmente visibile.</p><button class="button secondary" @click="chooseFile"><Upload :size="16" />Scegli un file</button></article>
          <article class="archive-card"><div class="archive-card-icon"><Edit3 :size="24" /></div><p class="eyebrow">Identità</p><h2>Nome dell’albero</h2><label class="field"><span>Nome archivio</span><input v-model.trim="tree.name" maxlength="80" /></label><p class="microcopy">Ultimo aggiornamento: {{ new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(tree.updatedAt)) }}</p></article>
          <article class="archive-card danger-card"><div class="archive-card-icon"><FilePlus2 :size="24" /></div><p class="eyebrow">Riparti</p><h2>Nuovo albero</h2><p>Crea un archivio vuoto. Prima esporta quello attuale se vuoi conservarne una copia.</p><button class="button danger" @click="modal = 'new-tree'"><FilePlus2 :size="16" />Nuovo albero</button></article>
        </section>
      </template>
    </main>

    <ModalShell v-if="modal === 'person'" :title="editingPersonId ? 'Modifica persona' : 'Aggiungi una persona'" subtitle="Inserisci ciò che conosci: potrai completare la scheda in seguito." wide @close="modal = null">
      <form class="form-grid" @submit.prevent="submitPerson">
        <label class="field"><span>Nome *</span><input v-model="personForm.firstName" required autofocus maxlength="60" placeholder="es. Elena" /></label>
        <label class="field"><span>Cognome *</span><input v-model="personForm.lastName" required maxlength="60" placeholder="es. Moretti" /></label>
        <label class="field"><span>Cognome alla nascita</span><input v-model="personForm.birthName" maxlength="60" placeholder="Se diverso" /></label>
        <label class="field"><span>Soprannome</span><input v-model="personForm.nickname" maxlength="60" /></label>
        <label class="field"><span>Genere</span><select v-model="personForm.gender"><option value="unspecified">Non specificato</option><option value="female">Donna</option><option value="male">Uomo</option><option value="nonbinary">Non binario</option></select></label>
        <label class="field"><span>Luogo di nascita</span><input v-model="personForm.birthPlace" maxlength="100" placeholder="Città o località" /></label>
        <label class="field"><span>Data di nascita</span><input v-model="personForm.birthDate" type="date" /></label>
        <label class="field"><span>Data di morte</span><input v-model="personForm.deathDate" type="date" :min="personForm.birthDate" /></label>
        <label class="field full"><span>Professione o ruolo</span><input v-model="personForm.occupation" maxlength="100" /></label>
        <label class="field full"><span>Ricordo o nota biografica</span><textarea v-model="personForm.notes" rows="3" maxlength="700" placeholder="Una storia, un dettaglio, qualcosa da ricordare…" /></label>
        <fieldset class="color-field full"><legend>Colore della scheda</legend><button v-for="color in personColors" :key="color" type="button" :style="{ background: color }" :class="{ active: personForm.color === color }" :aria-label="`Scegli colore ${color}`" @click="personForm.color = color"><Check v-if="personForm.color === color" :size="15" /></button></fieldset>
        <div class="form-actions full"><button type="button" class="button subtle" @click="modal = null">Annulla</button><button class="button primary" type="submit"><Check :size="16" />{{ editingPersonId ? 'Salva modifiche' : 'Aggiungi persona' }}</button></div>
      </form>
    </ModalShell>

    <ModalShell v-if="modal === 'relative' && selectedPerson" :title="`Aggiungi un parente a ${selectedPerson.firstName}`" subtitle="Crea la persona e il legame in un solo passaggio." wide @close="modal = null">
      <form class="relative-form" @submit.prevent="submitRelative">
        <fieldset class="relative-types">
          <legend>Chi vuoi aggiungere?</legend>
          <button v-for="choice in relativeChoices" :key="choice.value" type="button" :class="{ active: relativeKind === choice.value }" @click="chooseRelative(choice.value)">
            <span>{{ choice.label }}</span><small>{{ choice.description }}</small><Check v-if="relativeKind === choice.value" :size="16" />
          </button>
        </fieldset>
        <div class="relative-summary"><UserRoundPlus :size="18" /><span>Stai aggiungendo <strong>{{ selectedRelativeChoice.label.toLowerCase() }}</strong> a <strong>{{ fullName(selectedPerson) }}</strong>.</span></div>
        <div v-if="automaticChildSpouse" class="relative-summary" role="status"><Users :size="18" /><span>Il coniuge <strong>{{ fullName(automaticChildSpouse) }}</strong> verrà collegato automaticamente come secondo genitore biologico.</span></div>
        <div class="form-grid">
          <label class="field"><span>Nome *</span><input v-model="relativeForm.firstName" required autofocus maxlength="60" placeholder="Nome" /></label>
          <label class="field"><span>Cognome *</span><input v-model="relativeForm.lastName" required maxlength="60" placeholder="Cognome" /><small v-if="selectedRelativeChoice.copySurname" class="field-hint">Proposto da {{ selectedPerson.lastName }}: puoi cambiarlo.</small></label>
          <label v-if="relativeKind === 'spouse' || relativeKind === 'partner'" class="field full"><span>Genere</span><select v-model="relativeForm.gender"><option value="unspecified">Non specificato</option><option value="female">Donna</option><option value="male">Uomo</option><option value="nonbinary">Non binario</option></select></label>
          <label class="field"><span>Data di nascita</span><input v-model="relativeForm.birthDate" type="date" /></label>
          <label class="field"><span>Data di decesso</span><input v-model="relativeForm.deathDate" type="date" /></label>
          <label class="field full"><span>Luogo di nascita</span><input v-model="relativeForm.birthPlace" maxlength="100" placeholder="Città o località" /></label>
          <fieldset class="color-field full"><legend>Colore della scheda</legend><button v-for="color in personColors" :key="color" type="button" :style="{ background: color }" :class="{ active: relativeForm.color === color }" :aria-label="`Scegli colore ${color}`" @click="relativeForm.color = color"><Check v-if="relativeForm.color === color" :size="15" /></button></fieldset>
        </div>
        <div class="form-actions"><button type="button" class="button subtle" @click="modal = null">Annulla</button><button class="button primary" type="submit"><UserRoundPlus :size="17" />Aggiungi {{ selectedRelativeChoice.label.toLowerCase() }}</button></div>
      </form>
    </ModalShell>

    <ModalShell v-if="modal === 'couple-child' && pendingCouple" title="Aggiungi un discendente" subtitle="Crea la persona e collegala a entrambi i componenti della coppia." wide @close="modal = null; pendingCoupleId = null">
      <form class="child-form" @submit.prevent="submitCoupleChild">
        <div class="couple-summary">
          <div class="couple-summary-icon"><Heart :size="18" /></div>
          <div><span>Genitori</span><strong>{{ fullName(findPerson(pendingCouple.sourceId)) }} <small>e</small> {{ fullName(findPerson(pendingCouple.targetId)) }}</strong></div>
        </div>
        <div class="form-grid">
          <label class="field"><span>Nome *</span><input v-model="childForm.firstName" required autofocus maxlength="60" placeholder="Nome" /></label>
          <label class="field"><span>Cognome *</span><input v-model="childForm.lastName" required maxlength="60" placeholder="Cognome" /><small class="field-hint">Suggerito in base ai genitori; puoi specificarne uno diverso.</small></label>
          <label class="field"><span>Genere</span><select v-model="childForm.gender"><option value="unspecified">Non specificato</option><option value="female">Donna</option><option value="male">Uomo</option><option value="nonbinary">Non binario</option></select></label>
          <label class="field"><span>Data di nascita</span><input v-model="childForm.birthDate" type="date" /></label>
          <label class="field full"><span>Luogo di nascita</span><input v-model="childForm.birthPlace" maxlength="100" placeholder="Città o località" /></label>
        </div>
        <fieldset class="parentage-types">
          <legend>Tipo di legame con ciascun genitore</legend>
          <label class="field"><span>{{ fullName(findPerson(pendingCouple.sourceId)) }}</span><select v-model="childForm.firstParentType"><option value="biological-parent">Genitore biologico</option><option value="adoptive-parent">Genitore adottivo</option><option value="foster-parent">Genitore affidatario</option></select></label>
          <label class="field"><span>{{ fullName(findPerson(pendingCouple.targetId)) }}</span><select v-model="childForm.secondParentType"><option value="biological-parent">Genitore biologico</option><option value="adoptive-parent">Genitore adottivo</option><option value="foster-parent">Genitore affidatario</option></select></label>
        </fieldset>
        <fieldset class="color-field"><legend>Colore della scheda</legend><button v-for="color in personColors" :key="color" type="button" :style="{ background: color }" :class="{ active: childForm.color === color }" :aria-label="`Scegli colore ${color}`" @click="childForm.color = color"><Check v-if="childForm.color === color" :size="15" /></button></fieldset>
        <div class="form-actions"><button type="button" class="button subtle" @click="modal = null; pendingCoupleId = null">Annulla</button><button class="button primary" type="submit"><UserRoundPlus :size="17" />Aggiungi alla coppia</button></div>
      </form>
    </ModalShell>

    <ModalShell v-if="modal === 'relationship'" title="Aggiungi un legame" subtitle="Scegli le due persone e descrivi il loro legame. L’ordine conta per la genitorialità." fullscreen :inactive="!!relationshipPickerTarget" @close="modal = null">
      <form class="relationship-form relationship-fullscreen-form" @submit.prevent="submitRelationship">
        <div class="relationship-content-grid">
          <section class="relationship-details">
            <div class="relationship-pair-compact">
              <PersonSelectionCard label="Prima persona" :person="relationshipSourcePerson" @choose="relationshipPickerTarget = 'source'" />
              <button type="button" class="icon-button relationship-swap" :disabled="!relationshipForm.sourceId || !relationshipForm.targetId" aria-label="Inverti prima e seconda persona" title="Inverti persone" @click="swapRelationshipPeople"><ArrowLeftRight :size="19" /></button>
              <PersonSelectionCard label="Seconda persona" :person="relationshipTargetPerson" @choose="relationshipPickerTarget = 'target'" />
            </div>
            <p v-if="parentTypeValues.has(relationshipForm.type) && relationshipForm.sourceId && relationshipForm.targetId" class="relationship-direction" aria-live="polite"><span>{{ relationshipForm.type === 'guardian' ? 'Tutore' : 'Genitore' }}: <strong>{{ fullName(findPerson(relationshipForm.sourceId)) }}</strong></span><ChevronRight :size="18" /><span>{{ relationshipForm.type === 'guardian' ? 'Persona tutelata' : 'Figlio/a' }}: <strong>{{ fullName(findPerson(relationshipForm.targetId)) }}</strong></span></p>
            <div class="form-grid compact"><label class="field"><span>Data di inizio</span><input v-model="relationshipForm.startDate" type="date" /></label><label class="field"><span>Data di fine</span><input v-model="relationshipForm.endDate" type="date" /></label><label class="field full"><span>Nota sul legame</span><textarea v-model="relationshipForm.notes" rows="5" maxlength="300" placeholder="Facoltativa" /></label></div>
          </section>
          <aside class="relationship-settings">
            <fieldset class="relationship-types"><legend>Tipo di legame</legend><div v-for="group in relationshipGroups" :key="group.name"><p>{{ group.name }}</p><label v-for="option in group.options" :key="option.value" :class="{ active: relationshipForm.type === option.value }"><input v-model="relationshipForm.type" type="radio" :value="option.value" /><span><strong>{{ option.label }}</strong><small>{{ option.description }}</small></span><Check v-if="relationshipForm.type === option.value" :size="17" /></label></div></fieldset>
          </aside>
        </div>
        <footer class="relationship-footer"><p v-if="relationshipError" class="form-error"><Info :size="16" />{{ relationshipError }}</p><div class="form-actions"><button type="button" class="button subtle" @click="modal = null">Annulla</button><button class="button primary" type="submit"><Link2 :size="16" />Aggiungi legame</button></div></footer>
      </form>
    </ModalShell>

    <ModalShell v-if="modal === 'relationship' && relationshipPickerTarget" :title="relationshipPickerTarget === 'source' ? 'Scegli la prima persona' : 'Scegli la seconda persona'" subtitle="Cerca per nome, cognome, anno, luogo o riferimento." wide @close="relationshipPickerTarget = null">
      <PersonPicker :model-value="relationshipPickerTarget === 'source' ? relationshipForm.sourceId : relationshipForm.targetId" :people="relationshipPickerPeople" :label="relationshipPickerTarget === 'source' ? 'Prima persona' : 'Seconda persona'" autofocus-search @update:model-value="selectRelationshipPerson" />
    </ModalShell>

    <ModalShell v-if="modal === 'delete-person' && selectedPerson" title="Eliminare questa persona?" subtitle="Verranno rimossi anche tutti i suoi legami." @close="modal = null"><div class="confirm-box"><div class="profile-avatar" :style="{ background: selectedPerson.color }">{{ initials(selectedPerson) }}</div><div><strong>{{ fullName(selectedPerson) }}</strong><p>{{ tree.relationships.filter(r => r.sourceId === selectedPerson!.id || r.targetId === selectedPerson!.id).length }} legami associati</p></div></div><div class="form-actions"><button class="button subtle" @click="modal = null">Annulla</button><button class="button danger" @click="deleteSelectedPerson"><Trash2 :size="16" />Elimina definitivamente</button></div></ModalShell>
    <ModalShell v-if="modal === 'delete-relationship' && pendingRelationship" title="Rimuovere questo legame?" subtitle="Le persone resteranno nell’albero; verrà eliminata soltanto la relazione." @close="modal = null; pendingRelationshipId = null">
      <div class="relationship-confirm">
        <div class="relation-icon" :class="parentTypeValues.has(pendingRelationship.type) ? 'parent' : pendingRelationship.type === 'sibling' ? 'sibling' : 'couple'"><Link2 :size="18" /></div>
        <div><span>{{ relationshipLabel(pendingRelationship.type) }}</span><strong>{{ fullName(findPerson(pendingRelationship.sourceId)) }} · {{ fullName(findPerson(pendingRelationship.targetId)) }}</strong></div>
      </div>
      <div class="form-actions"><button class="button subtle" @click="modal = null; pendingRelationshipId = null">Annulla</button><button class="button danger" @click="confirmDeleteRelationship"><Trash2 :size="16" />Rimuovi legame</button></div>
    </ModalShell>
    <ModalShell v-if="modal === 'new-tree'" title="Creare un nuovo albero?" subtitle="La copia locale attuale verrà sostituita." @close="modal = null"><div class="warning-note"><Info :size="19" /><p>Esporta prima un file .genia se vuoi conservare l’albero “{{ tree.name }}”.</p></div><div class="form-actions"><button class="button subtle" @click="modal = null">Torna indietro</button><button class="button danger" @click="createNewTree"><FilePlus2 :size="16" />Crea albero vuoto</button></div></ModalShell>

    <ModalShell v-if="!hydrated && !startupPrompt" title="Controllo dell’archivio" subtitle="Verifico se esiste un file usato in precedenza prima di abilitare le modifiche." :closable="false">
      <div class="warning-note"><Save :size="19" /><p>Attendi un momento…</p></div>
    </ModalShell>
    <ModalShell v-if="startupPrompt" title="Riaprire l’archivio precedente?" :subtitle="startupPrompt.kind === 'file' ? `Rileggerò “${startupPrompt.name}” direttamente dal disco, così non lavorerai su una copia superata.` : `È disponibile la copia locale “${startupPrompt.name}”.`" :closable="false">
      <div class="warning-note"><ShieldCheck :size="19" /><p>Finché non scegli, la modifica dei dati resta bloccata. Se riapri un file collegato, viene sempre ricaricato prima di consentire qualsiasi azione.</p></div>
      <div class="form-actions"><button class="button subtle" :disabled="startupBusy" @click="declinePrevious">No, crea nuovo</button><button class="button primary" :disabled="startupBusy" @click="reopenPrevious"><FolderOpen :size="16" />{{ startupBusy ? 'Ricaricamento…' : 'Sì, riapri' }}</button></div>
    </ModalShell>
    <ModalShell v-if="pendingFileConflict" title="Il file contiene modifiche più recenti" :subtitle="`“${pendingFileConflict.name}” è cambiato dopo che lo hai aperto. Scegli come salvare senza perdere dati.`" :closable="!conflictBusy" @close="pendingFileConflict = null">
      <div class="warning-note"><Info :size="19" /><p><strong>Unisci modifiche</strong> conserva persone e legami aggiunti su entrambe le copie e combina le modifiche fatte a campi diversi. Se lo stesso campo è stato cambiato da entrambe le parti, mantiene il valore di questo dispositivo.</p></div>
      <div class="form-actions conflict-actions"><button class="button subtle" :disabled="conflictBusy" @click="pendingFileConflict = null">Annulla</button><button class="button danger" :disabled="conflictBusy" @click="resolveFileConflict('overwrite')">Sovrascrivi</button><button class="button primary" :disabled="conflictBusy" @click="resolveFileConflict('merge')"><GitFork :size="16" />{{ conflictBusy ? 'Verifica…' : 'Unisci modifiche' }}</button></div>
    </ModalShell>

    <Transition name="toast"><div v-if="toast" class="toast" :class="toast.tone"><Check v-if="toast.tone === 'success'" :size="17" /><Info v-else :size="17" />{{ toast.message }}</div></Transition>
  </div>
</template>
