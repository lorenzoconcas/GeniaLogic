import type { FamilyTree } from '../types'

const DB_NAME = 'genia-local'
const STORE_NAME = 'trees'
const META_STORE_NAME = 'metadata'
const ACTIVE_KEY = 'active'
const FILE_HANDLE_KEY = 'active-file-handle'
const MAGIC = new Uint8Array([0x47, 0x45, 0x4e, 0x49, 0x41, 0x01, 0x0d, 0x0a])

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME)
      if (!request.result.objectStoreNames.contains(META_STORE_NAME)) request.result.createObjectStore(META_STORE_NAME)
    }
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
  let bytes: Uint8Array
  try {
    bytes = new Uint8Array(await file.arrayBuffer())
  } catch {
    throw new Error('Non riesco a leggere il file. Se è nel cloud, scaricalo sul dispositivo e riprova.')
  }
  const validMagic = MAGIC.every((byte, index) => bytes[index] === byte)
  if (!validMagic) throw new Error('Questo non sembra un file GeniaLogic valido.')

  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Questo browser non supporta l’apertura degli archivi compressi. Aggiorna il browser o il sistema operativo e riprova.')
  }

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

export interface GeniaFileHandle {
  name: string
  getFile: () => Promise<File>
  createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }>
  queryPermission?: (options: { mode: 'readwrite' }) => Promise<PermissionState>
  requestPermission?: (options: { mode: 'readwrite' }) => Promise<PermissionState>
}

export interface OpenedTreeFile {
  tree: FamilyTree
  lastModified: number
  name: string
}

async function metadataRequest<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase()
  const result = await new Promise<T>((resolve, reject) => {
    const request = action(db.transaction(META_STORE_NAME, mode).objectStore(META_STORE_NAME))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  db.close()
  return result
}

export async function rememberFileHandle(handle: GeniaFileHandle): Promise<void> {
  await metadataRequest('readwrite', (store) => store.put(handle, FILE_HANDLE_KEY))
}

export async function getRememberedFileHandle(): Promise<GeniaFileHandle | null> {
  return (await metadataRequest('readonly', (store) => store.get(FILE_HANDLE_KEY))) ?? null
}

export async function forgetFileHandle(): Promise<void> {
  await metadataRequest('readwrite', (store) => store.delete(FILE_HANDLE_KEY))
}

export async function ensureFilePermission(handle: GeniaFileHandle): Promise<boolean> {
  if (!handle.queryPermission) return true
  if (await handle.queryPermission({ mode: 'readwrite' }) === 'granted') return true
  return handle.requestPermission ? await handle.requestPermission({ mode: 'readwrite' }) === 'granted' : false
}

export async function readTreeHandle(handle: GeniaFileHandle): Promise<OpenedTreeFile> {
  const file = await handle.getFile()
  return { tree: await decodeTree(file), lastModified: file.lastModified, name: file.name }
}

export async function writeTreeHandle(handle: GeniaFileHandle, tree: FamilyTree): Promise<void> {
  const writable = await handle.createWritable()
  await writable.write(await encodeTree(tree))
  await writable.close()
}

export async function pickTreeHandle(): Promise<GeniaFileHandle | null> {
  const picker = (window as Window & { showOpenFilePicker?: (options: unknown) => Promise<GeniaFileHandle[]> }).showOpenFilePicker?.bind(window)
  if (!picker) return null
  const [handle] = await picker({ multiple: false, types: [{ description: 'Archivio GeniaLogic', accept: { 'application/x-genia-family-tree': ['.genia'] } }] })
  return handle ?? null
}

export async function createTreeHandle(tree: FamilyTree): Promise<GeniaFileHandle | null> {
  const suggestedName = `${safeFileName(tree.name)}.genia`
  const picker = (window as Window & { showSaveFilePicker?: (options: unknown) => Promise<GeniaFileHandle> }).showSaveFilePicker?.bind(window)
  if (!picker) return null
  const handle = await picker({ suggestedName, types: [{ description: 'Archivio GeniaLogic', accept: { 'application/x-genia-family-tree': ['.genia'] } }] })
  await writeTreeHandle(handle, tree)
  return handle
}
