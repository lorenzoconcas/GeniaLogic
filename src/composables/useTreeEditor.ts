import { computed, reactive, ref, type Ref } from 'vue'
import { personColors, relationshipOptions } from '../data'
import { parentTypeValues, sharedParentTypeValues, relativeChoices } from '../editorOptions'
import { quickChildRelationships, singleSpouse } from '../services/quickChild'
import type { FamilyTree, Gender, Person, Relationship, RelationshipType } from '../types'
import type { PersonForm, RelativeKind, ParentLinkType, ShowToast, ViewName } from '../uiTypes'

/** Mantiene le bozze dei moduli e applica le modifiche all'albero condiviso. */
export function useTreeEditor(
  tree: Ref<FamilyTree>,
  selectedPersonId: Ref<string | null>,
  activeView: Ref<ViewName>,
  refit: () => void,
  showToast: ShowToast,
) {
  const selectedPerson = computed(
    () => tree.value.people.find((person) => person.id === selectedPersonId.value) ?? null,
  )
  function findPerson(id: string) {
    return tree.value.people.find((person) => person.id === id)
  }
  const modal = ref<
    | 'person'
    | 'relative'
    | 'couple-child'
    | 'relationship'
    | 'delete-person'
    | 'delete-relationship'
    | 'new-tree'
    | null
  >(null)
  const editingPersonId = ref<string | null>(null)
  const pendingRelationshipId = ref<string | null>(null)
  const pendingCoupleId = ref<string | null>(null)
  const relativeReturnPersonId = ref<string | null>(null)
  const relationshipError = ref('')
  const relationshipPickerTarget = ref<'source' | 'target' | null>(null)
  const blankPerson = (): PersonForm => ({
    firstName: '',
    lastName: '',
    birthName: '',
    nickname: '',
    gender: 'unspecified',
    birthDate: '',
    deathDate: '',
    birthPlace: '',
    occupation: '',
    notes: '',
    color: personColors[tree.value.people.length % personColors.length],
  })
  const personForm = reactive<PersonForm>(blankPerson())
  const relationshipForm = reactive<{
    sourceId: string
    targetId: string
    type: RelationshipType
    startDate: string
    endDate: string
    notes: string
  }>({
    sourceId: '',
    targetId: '',
    type: 'biological-parent',
    startDate: '',
    endDate: '',
    notes: '',
  })
  const relativeKind = ref<RelativeKind>('father')
  const relativeForm = reactive<{
    firstName: string
    lastName: string
    gender: Gender
    birthDate: string
    deathDate: string
    birthPlace: string
    color: string
  }>({
    firstName: '',
    lastName: '',
    gender: 'male',
    birthDate: '',
    deathDate: '',
    birthPlace: '',
    color: personColors[0],
  })
  const childForm = reactive<{
    firstName: string
    lastName: string
    gender: Gender
    birthDate: string
    birthPlace: string
    color: string
    firstParentType: ParentLinkType
    secondParentType: ParentLinkType
  }>({
    firstName: '',
    lastName: '',
    gender: 'unspecified',
    birthDate: '',
    birthPlace: '',
    color: personColors[0],
    firstParentType: 'biological-parent',
    secondParentType: 'biological-parent',
  })

  const pendingRelationship = computed(
    () =>
      tree.value.relationships.find(
        (relationship) => relationship.id === pendingRelationshipId.value,
      ) ?? null,
  )
  const pendingCouple = computed(
    () =>
      tree.value.relationships.find((relationship) => relationship.id === pendingCoupleId.value) ??
      null,
  )
  const relationshipSourcePerson = computed(() =>
    tree.value.people.find((person) => person.id === relationshipForm.sourceId),
  )
  const relationshipTargetPerson = computed(() =>
    tree.value.people.find((person) => person.id === relationshipForm.targetId),
  )
  const relationshipPickerPeople = computed(() =>
    tree.value.people.filter(
      (person) =>
        person.id !==
        (relationshipPickerTarget.value === 'source'
          ? relationshipForm.targetId
          : relationshipForm.sourceId),
    ),
  )
  const selectedRelativeChoice = computed(
    () => relativeChoices.find((choice) => choice.value === relativeKind.value)!,
  )
  const automaticChildSpouse = computed(() => {
    if (
      !selectedPersonId.value ||
      (relativeKind.value !== 'son' && relativeKind.value !== 'daughter')
    )
      return undefined
    return singleSpouse(selectedPersonId.value, tree.value.people, tree.value.relationships)
  })
  const relationshipGroups = computed(() =>
    ['Genitorialità', 'Fratellanza', 'Coppia'].map((group) => ({
      name: group,
      options: relationshipOptions.filter((option) => option.group === group),
    })),
  )

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
  function openParentFromRadial(payload: {
    childId: string
    gender: Extract<Gender, 'male' | 'female'>
  }) {
    selectedPersonId.value = payload.childId
    openRelative()
    relativeReturnPersonId.value = payload.childId
    chooseRelative(payload.gender === 'male' ? 'father' : 'mother')
  }
  function chooseRelative(kind: RelativeKind) {
    const previousChoice = selectedRelativeChoice.value
    // Rispetta il cognome digitato: cambia solo quello ancora proposto automaticamente.
    const surnameWasAutomatic =
      !relativeForm.lastName ||
      (previousChoice.copySurname && relativeForm.lastName === selectedPerson.value?.lastName)
    relativeKind.value = kind
    const choice = selectedRelativeChoice.value
    relativeForm.gender = choice.gender
    if (choice.copySurname && surnameWasAutomatic)
      relativeForm.lastName = selectedPerson.value?.lastName ?? ''
    if (!choice.copySurname && surnameWasAutomatic) relativeForm.lastName = ''
  }
  function submitRelative() {
    const reference = selectedPerson.value
    if (!reference || !relativeForm.firstName.trim() || !relativeForm.lastName.trim()) return
    const newPerson: Person = {
      id: crypto.randomUUID(),
      firstName: relativeForm.firstName.trim(),
      lastName: relativeForm.lastName.trim(),
      gender: relativeForm.gender,
      birthDate: relativeForm.birthDate,
      deathDate: relativeForm.deathDate,
      birthPlace: relativeForm.birthPlace.trim(),
      color: relativeForm.color,
    }
    const makeRelationship = (
      sourceId: string,
      targetId: string,
      type: RelationshipType,
    ): Relationship => ({
      id: crypto.randomUUID(),
      sourceId,
      targetId,
      type,
    })
    const links: Relationship[] = []
    if (relativeKind.value === 'father' || relativeKind.value === 'mother') {
      links.push(makeRelationship(newPerson.id, reference.id, 'biological-parent'))
    } else if (relativeKind.value === 'son' || relativeKind.value === 'daughter') {
      links.push(
        ...quickChildRelationships(
          reference.id,
          newPerson.id,
          tree.value.people,
          tree.value.relationships,
        ),
      )
    } else if (relativeKind.value === 'brother' || relativeKind.value === 'sister') {
      // Se i genitori sono noti, la fratellanza deriva dai legami condivisi.
      const knownParents = tree.value.relationships.filter(
        (relationship) =>
          sharedParentTypeValues.has(relationship.type) && relationship.targetId === reference.id,
      )
      if (knownParents.length) {
        knownParents.forEach((relationship) =>
          links.push(makeRelationship(relationship.sourceId, newPerson.id, relationship.type)),
        )
      } else {
        links.push(makeRelationship(reference.id, newPerson.id, 'sibling'))
      }
    } else {
      links.push(
        makeRelationship(
          reference.id,
          newPerson.id,
          relativeKind.value === 'spouse' ? 'married' : 'partner',
        ),
      )
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
    const people = [findPerson(relationship.sourceId), findPerson(relationship.targetId)].filter(
      (person): person is Person => Boolean(person),
    )
    return (
      people.find((person) => person.gender === 'male')?.lastName ??
      people.find((person) => person.gender === 'female')?.lastName ??
      people[0]?.lastName ??
      ''
    )
  }
  function openCoupleChild(relationship: Relationship) {
    pendingCoupleId.value = relationship.id
    Object.assign(childForm, {
      firstName: '',
      lastName: suggestedChildSurname(relationship),
      gender: 'unspecified' as Gender,
      birthDate: '',
      birthPlace: '',
      color: personColors[tree.value.people.length % personColors.length],
      firstParentType: 'biological-parent' as ParentLinkType,
      secondParentType: 'biological-parent' as ParentLinkType,
    })
    modal.value = 'couple-child'
  }
  function submitCoupleChild() {
    const relationship = pendingCouple.value
    if (!relationship || !childForm.firstName.trim() || !childForm.lastName.trim()) return
    const child: Person = {
      id: crypto.randomUUID(),
      firstName: childForm.firstName.trim(),
      lastName: childForm.lastName.trim(),
      gender: childForm.gender,
      birthDate: childForm.birthDate,
      birthPlace: childForm.birthPlace.trim(),
      color: childForm.color,
    }
    tree.value.people.push(child)
    tree.value.relationships.push(
      {
        id: crypto.randomUUID(),
        sourceId: relationship.sourceId,
        targetId: child.id,
        type: childForm.firstParentType,
      },
      {
        id: crypto.randomUUID(),
        sourceId: relationship.targetId,
        targetId: child.id,
        type: childForm.secondParentType,
      },
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
    const clean = Object.fromEntries(
      Object.entries(personForm).map(([key, value]) => [
        key,
        typeof value === 'string' ? value.trim() : value,
      ]),
    ) as unknown as PersonForm
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
  function askDeletePerson(person: Person) {
    selectedPersonId.value = person.id
    modal.value = 'delete-person'
  }
  function deleteSelectedPerson() {
    if (!selectedPersonId.value) return
    const id = selectedPersonId.value
    tree.value.people = tree.value.people.filter((person) => person.id !== id)
    tree.value.relationships = tree.value.relationships.filter(
      (relationship) => relationship.sourceId !== id && relationship.targetId !== id,
    )
    selectedPersonId.value = tree.value.people[0]?.id ?? null
    modal.value = null
    showToast('Persona e relativi legami rimossi')
    refit()
  }

  function openRelationship(prefillId?: string) {
    relationshipPickerTarget.value = null
    relationshipError.value = ''
    relationshipForm.sourceId =
      prefillId ?? selectedPersonId.value ?? tree.value.people[0]?.id ?? ''
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
  // Percorre soltanto i legami direzionali per impedire cicli di ascendenza.
  function hasParentPath(fromId: string, toId: string, visited = new Set<string>()): boolean {
    if (fromId === toId) return true
    if (visited.has(fromId)) return false
    visited.add(fromId)
    return tree.value.relationships
      .filter((rel) => parentTypeValues.has(rel.type) && rel.sourceId === fromId)
      .some((rel) => hasParentPath(rel.targetId, toId, visited))
  }
  function validateRelationship(): string | null {
    const { sourceId, targetId, type } = relationshipForm
    if (!sourceId || !targetId) return 'Scegli entrambe le persone.'
    if (sourceId === targetId) return 'Una persona non può avere un legame con sé stessa.'
    const option = relationshipOptions.find((item) => item.value === type)!
    const duplicate = tree.value.relationships.some(
      (rel) =>
        rel.type === type &&
        (option.directional
          ? rel.sourceId === sourceId && rel.targetId === targetId
          : (rel.sourceId === sourceId && rel.targetId === targetId) ||
            (rel.sourceId === targetId && rel.targetId === sourceId)),
    )
    if (duplicate) return 'Questo legame è già presente.'
    if (parentTypeValues.has(type)) {
      if (hasParentPath(targetId, sourceId))
        return 'Questo legame creerebbe un ciclo tra genitori e figli.'
      if (
        type === 'biological-parent' &&
        tree.value.relationships.filter((rel) => rel.type === type && rel.targetId === targetId)
          .length >= 2
      )
        return 'Questa persona ha già due genitori biologici.'
      const parent = findPerson(sourceId)
      const child = findPerson(targetId)
      if (parent?.birthDate && child?.birthDate && parent.birthDate >= child.birthDate)
        return 'La data di nascita del genitore deve precedere quella del figlio.'
    } else {
      const pairExists = tree.value.relationships.some(
        (rel) =>
          !parentTypeValues.has(rel.type) &&
          ((rel.sourceId === sourceId && rel.targetId === targetId) ||
            (rel.sourceId === targetId && rel.targetId === sourceId)),
      )
      if (pairExists)
        return 'Esiste già un legame non genitoriale tra queste persone. Rimuovilo prima di cambiarne il tipo.'
    }
    if (
      relationshipForm.startDate &&
      relationshipForm.endDate &&
      relationshipForm.startDate > relationshipForm.endDate
    )
      return 'La data di fine deve essere successiva alla data di inizio.'
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
    tree.value.relationships = tree.value.relationships.filter(
      (relationship) => relationship.id !== pendingRelationshipId.value,
    )
    pendingRelationshipId.value = null
    modal.value = null
    showToast('Legame rimosso')
    refit()
  }

  return {
    pendingRelationshipId,
    modal,
    editingPersonId,
    pendingCoupleId,
    personForm,
    relationshipForm,
    relativeForm,
    childForm,
    relativeKind,
    relationshipError,
    relationshipPickerTarget,
    pendingRelationship,
    pendingCouple,
    relationshipSourcePerson,
    relationshipTargetPerson,
    relationshipPickerPeople,
    selectedRelativeChoice,
    automaticChildSpouse,
    relationshipGroups,
    openNewPerson,
    openEditPerson,
    openRelative,
    openRelativeFor,
    openParentFromRadial,
    chooseRelative,
    submitRelative,
    openCoupleChild,
    submitCoupleChild,
    submitPerson,
    askDeletePerson,
    deleteSelectedPerson,
    openRelationship,
    selectRelationshipPerson,
    swapRelationshipPeople,
    submitRelationship,
    askDeleteRelationship,
    confirmDeleteRelationship,
  }
}

export type TreeEditor = ReturnType<typeof useTreeEditor>
