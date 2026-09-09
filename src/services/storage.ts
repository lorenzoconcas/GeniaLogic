import type { FamilyTree } from '../types'

const DB_NAME = 'genia-local'
const STORE_NAME = 'trees'
const ACTIVE_KEY = 'active'
const MAGIC = new Uint8Array([0x47, 0x45, 0x4e, 0x49, 0x41, 0x01, 0x0d, 0x0a])

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveLocal(tree: FamilyTree): Promise<void> {
  // Vue rende profondamente reattivo l'albero tramite Proxy. IndexedDB non può
  // clonare i Proxy, quindi serializziamo prima una copia composta da soli dati.
  const persistableTree = JSON.parse(JSON.stringify(tree)) as FamilyTree
  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(persistableTree, ACTIVE_KEY)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error ?? new Error('Salvataggio locale interrotto.'))
  })
  db.close()
}

export async function loadLocal(): Promise<FamilyTree | null> {
  const db = await openDatabase()
  const result = await new Promise<FamilyTree | undefined>((resolve, reject) => {
    const request = db.transaction(STORE_NAME).objectStore(STORE_NAME).get(ACTIVE_KEY)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  db.close()
  return result ?? null
}

async function encodeTree(tree: FamilyTree): Promise<Blob> {
  const json = new TextEncoder().encode(JSON.stringify(tree))
  const compressed = await new Response(
    new Blob([json]).stream().pipeThrough(new CompressionStream('gzip')),
  ).arrayBuffer()
  return new Blob([MAGIC, compressed], { type: 'application/x-genia-family-tree' })
}

async function decodeTree(file: File): Promise<FamilyTree> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const validMagic = MAGIC.every((byte, index) => bytes[index] === byte)
  if (!validMagic) throw new Error('Questo non sembra un file GeniaLogic valido.')

  let raw: ArrayBuffer
  try {
    raw = await new Response(
      new Blob([bytes.slice(MAGIC.length)]).stream().pipeThrough(new DecompressionStream('gzip')),
    ).arrayBuffer()
  } catch {
    throw new Error('Il file è danneggiato o incompleto.')
  }

  let parsed: unknown
  try { parsed = JSON.parse(new TextDecoder().decode(raw)) } catch { throw new Error('Impossibile leggere i dati del file.') }
  if (!isFamilyTree(parsed)) throw new Error('La struttura del file non è compatibile con GeniaLogic.')
  return parsed
}

function isFamilyTree(value: unknown): value is FamilyTree {
  if (!value || typeof value !== 'object') return false
  const tree = value as Partial<FamilyTree>
  const relationshipTypes = new Set(['biological-parent', 'adoptive-parent', 'foster-parent', 'guardian', 'married', 'civil-union', 'partner', 'separated', 'divorced', 'former-partner', 'sibling'])
  if (!(tree.version === 1 && typeof tree.name === 'string' && Array.isArray(tree.people) && Array.isArray(tree.relationships)
    && tree.people.every((p) => p && typeof p.id === 'string' && typeof p.firstName === 'string' && typeof p.lastName === 'string')
    && tree.relationships.every((r) => r && typeof r.id === 'string' && typeof r.sourceId === 'string' && typeof r.targetId === 'string' && relationshipTypes.has(r.type)))) return false
  const personIds = new Set(tree.people.map((person) => person.id))
  return personIds.size === tree.people.length && tree.relationships.every((relationship) => personIds.has(relationship.sourceId) && personIds.has(relationship.targetId))
}

function safeFileName(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9àèéìòù]+/gi, '-').replace(/^-|-$/g, '') || 'albero-genealogico'
}

export async function exportTree(tree: FamilyTree): Promise<'picker' | 'download'> {
  const blob = await encodeTree(tree)
  const suggestedName = `${safeFileName(tree.name)}.genia`
  const picker = (window as Window & { showSaveFilePicker?: (options: unknown) => Promise<{ createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }> }> }).showSaveFilePicker?.bind(window)
  if (picker) {
    const handle = await picker({ suggestedName, types: [{ description: 'Archivio GeniaLogic', accept: { 'application/x-genia-family-tree': ['.genia'] } }] })
    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()
    return 'picker'
  }
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = suggestedName
  anchor.click()
  URL.revokeObjectURL(url)
  return 'download'
}

export async function importTree(file: File): Promise<FamilyTree> {
  return decodeTree(file)
}
