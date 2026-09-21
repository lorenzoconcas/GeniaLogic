import { computed, nextTick, ref, watch, type Ref } from 'vue'
import { MarkerType, useVueFlow, type Edge, type Node } from '@vue-flow/core'
import { relationshipOptions } from '../data'
import { parentTypeValues } from '../editorOptions'
import { generationLayout } from '../services/generationLayout'
import { fullName } from '../services/personPresentation'
import type { FamilyTree, Person } from '../types'
import type { LayoutMode, ViewName, ShowToast } from '../uiTypes'

/** Traduce l'albero in nodi e archi e coordina le richieste di centratura. */
export function useTreeGraph(
  tree: Ref<FamilyTree>,
  selectedPersonId: Ref<string | null>,
  activeView: Ref<ViewName>,
  layoutMode: Ref<LayoutMode>,
  showToast: ShowToast,
) {
  const highlightedPersonId = ref<string | null>(null)
  // Una selezione più recente invalida le centrature ancora in attesa del rendering.
  let viewportRequest = 0
  const { fitView } = useVueFlow()
  function findPerson(id: string) {
    return tree.value.people.find((person) => person.id === id)
  }
  const nodeWidth = 192
  const nodeHeight = 82

  function flowNode(person: Person, x: number, y: number): Node {
    return {
      id: person.id,
      type: 'person',
      position: { x: x - nodeWidth / 2, y: y - nodeHeight / 2 },
      data: {
        person,
        selected: selectedPersonId.value === person.id,
        highlighted: highlightedPersonId.value === person.id,
      },
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
    // La visita in ampiezza assegna ogni persona al primo percorso dalla radice.
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

    // Le persone scollegate restano visibili in una riga separata sotto il gruppo.
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
        return (
          distances.get(a.id)! - distances.get(b.id)! ||
          fullName(a).localeCompare(fullName(b), 'it')
        )
      })
      if (generation === 0 && sorted.some((person) => person.id === rootId)) {
        positions.set(rootId, { x: 0, y: 0 })
        sorted
          .filter((person) => person.id !== rootId)
          .forEach((person, index) => {
            const side = index % 2 === 0 ? -1 : 1
            positions.set(person.id, {
              x: side * (Math.floor(index / 2) + 1) * horizontalGap,
              y: 0,
            })
          })
      } else {
        sorted.forEach((person, index) =>
          positions.set(person.id, {
            x: (index - (sorted.length - 1) / 2) * horizontalGap,
            y: generation * verticalGap,
          }),
        )
      }
    }
    return positions
  }

  const generationPositions = computed(() =>
    generationLayout(tree.value.people, tree.value.relationships),
  )

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
  const flowEdges = computed<Edge[]>(() =>
    tree.value.relationships.map((relationship) => {
      const option = relationshipOptions.find((item) => item.value === relationship.type)!
      const parent = option.group === 'Genitorialità'
      const sibling = relationship.type === 'sibling'
      const sourcePosition = generationPositions.value.get(relationship.sourceId)
      const targetPosition = generationPositions.value.get(relationship.targetId)
      const lateral =
        !parent && layoutMode.value === 'generational' && sourcePosition?.y === targetPosition?.y
      const sourceOnLeft = (sourcePosition?.x ?? 0) < (targetPosition?.x ?? 0)
      const color = parent
        ? '#6e7588'
        : sibling
          ? '#5657d9'
          : relationship.type === 'divorced' ||
              relationship.type === 'separated' ||
              relationship.type === 'former-partner'
            ? '#e85d75'
            : '#0f9b8e'
      return {
        id: relationship.id,
        source: relationship.sourceId,
        target: relationship.targetId,
        sourceHandle: lateral ? (sourceOnLeft ? 'source-right' : 'source-left') : 'source-bottom',
        targetHandle: lateral ? (sourceOnLeft ? 'target-left' : 'target-right') : 'target-top',
        label: option.label,
        type: parent && layoutMode.value === 'focus' ? 'smoothstep' : 'default',
        markerEnd: parent ? { type: MarkerType.ArrowClosed, color } : undefined,
        style: {
          stroke: color,
          strokeWidth: parent ? 1.7 : 2.2,
          strokeDasharray:
            relationship.type === 'divorced' ||
            relationship.type === 'separated' ||
            relationship.type === 'former-partner'
              ? '6 5'
              : undefined,
        },
        labelStyle: { fill: color, fontSize: 9, fontWeight: 700 },
        labelBgStyle: { fill: '#faf8f2', fillOpacity: 0.94 },
        labelBgPadding: [5, 3] as [number, number],
        labelBgBorderRadius: 5,
      }
    }),
  )

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
    nextTick(() =>
      window.setTimeout(() => {
        if (request === viewportRequest) void fitView({ padding: 0.18, duration: 500 })
      }, 80),
    )
  }

  function graphVisible() {
    return (
      activeView.value === 'tree' &&
      (layoutMode.value === 'generational' || layoutMode.value === 'focus')
    )
  }

  async function revealPerson(personId: string) {
    if (!findPerson(personId) || !graphVisible()) return
    const request = ++viewportRequest
    selectedPersonId.value = personId
    highlightedPersonId.value = personId
    // Allow the focus layout, inspector and Vue Flow's ResizeObserver to settle.
    await nextTick()
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    )
    await nextTick()
    if (request !== viewportRequest || !graphVisible() || selectedPersonId.value !== personId)
      return
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450
    const centered = await fitView({ nodes: [personId], padding: 0.5, maxZoom: 1.15, duration })
    if (!centered && request === viewportRequest)
      showToast('Persona selezionata. Usa “Centra albero” per ritrovarla.', 'error')
  }

  watch(selectedPersonId, (id) => {
    if (highlightedPersonId.value !== id) highlightedPersonId.value = null
  })

  return { flowNodes, flowEdges, selectNode, setLayoutMode, refit, graphVisible, revealPerson }
}
