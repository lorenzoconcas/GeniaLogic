import { computed, onMounted, ref, useTemplateRef, watch, type Ref } from 'vue'
import { emptyTree } from '../data'
import type { FamilyTree } from '../types'
import type { ShowToast, ViewName } from '../uiTypes'
import {
  createTreeHandle,
  ensureFilePermission,
  exportTree,
  forgetFileHandle,
  getRememberedFileHandle,
  importTree,
  loadLocal,
  pickTreeHandle,
  readTreeHandle,
  rememberFileHandle,
  saveLocal,
  writeTreeHandle,
  type GeniaFileHandle,
  type OpenedTreeFile,
} from '../services/storage'
import { mergeTrees } from '../services/treeMerge'

/** Gestisce ripristino, copia locale e sincronizzazione esplicita del file .genia. */
export function useTreeArchive(
  tree: Ref<FamilyTree>,
  selectedPersonId: Ref<string | null>,
  activeView: Ref<ViewName>,
  refit: () => void,
  showToast: ShowToast,
  closeEditor: () => void,
) {
  const saveState = ref<'saved' | 'saving' | 'error'>('saved')
  const saveStatusLabel = computed(() =>
    saveState.value === 'saving'
      ? 'Salvataggio…'
      : saveState.value === 'error'
        ? 'Errore salvataggio'
        : 'Salvato in locale',
  )
  const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
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

  function cloneTree(value: FamilyTree): FamilyTree {
    return JSON.parse(JSON.stringify(value)) as FamilyTree
  }

  // Un archivio appena creato può essere stato scritto automaticamente dal browser,
  // ma non richiede una decisione di ripristino finché non contiene dati genealogici.
  function hasSavedContent(value: FamilyTree | null): value is FamilyTree {
    return Boolean(value && (value.people.length > 0 || value.relationships.length > 0))
  }

  // La baseline rappresenta l’ultima copia letta o scritta: serve a rilevare modifiche esterne.
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
    if (!(await ensureFilePermission(handle)))
      throw new Error('Permesso di accesso al file non concesso.')
    const fresh = opened ?? (await readTreeHandle(handle))
    linkedHandle = handle
    linkedFileName.value = fresh.name || handle.name
    fileBaseline = cloneTree(fresh.tree)
    try {
      await rememberFileHandle(handle)
    } catch {
      /* Il collegamento resta valido per la sessione corrente. */
    }
    activateTree(fresh.tree)
  }
  async function saveFile() {
    try {
      if (linkedHandle && fileBaseline) {
        if (!(await ensureFilePermission(linkedHandle)))
          throw new Error('Permesso di accesso al file non concesso.')
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
        try {
          await rememberFileHandle(handle)
        } catch {
          /* Il file è comunque stato salvato. */
        }
        showToast(`“${handle.name}” salvato e collegato`)
      } else {
        await exportTree(tree.value)
        showToast('Archivio .genia scaricato')
      }
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError')
        showToast(
          error instanceof Error ? error.message : 'Non è stato possibile salvare il file',
          'error',
        )
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
      if ((error as DOMException)?.name !== 'AbortError')
        showToast(
          error instanceof Error ? error.message : 'Non è stato possibile aprire il file',
          'error',
        )
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
        if (linkedFileName.value && file.name !== linkedFileName.value)
          throw new Error(
            `Seleziona “${linkedFileName.value}” per verificare le modifiche prima del salvataggio.`,
          )
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
      try {
        await forgetFileHandle()
      } catch {
        /* L'apertura manuale resta valida. */
      }
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
      showToast(
        error instanceof Error ? error.message : 'Non è stato possibile riaprire il file',
        'error',
      )
    } finally {
      startupBusy.value = false
    }
  }
  async function declinePrevious() {
    startupBusy.value = true
    try {
      await forgetFileHandle()
    } catch {
      /* Il nuovo archivio può essere creato comunque. */
    }
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
      showToast(
        action === 'merge'
          ? mergeConflicts
            ? `Modifiche unite; ${mergeConflicts} conflitti risolti con i valori locali (${destination})`
            : `Modifiche unite; ${destination}`
          : linkedHandle
            ? 'File esterno sovrascritto'
            : 'Copia locale salvata in un nuovo file',
      )
      pendingFileConflict.value = null
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Non è stato possibile risolvere il conflitto',
        'error',
      )
    } finally {
      conflictBusy.value = false
    }
  }
  async function createNewTree() {
    linkedHandle = null
    linkedFileName.value = null
    fileBaseline = null
    try {
      await forgetFileHandle()
    } catch {
      /* La sessione è già scollegata. */
    }
    tree.value = emptyTree()
    selectedPersonId.value = null
    activeView.value = 'tree'
    closeEditor()
    showToast('Nuovo albero creato')
  }
  // Il ripristino iniziale deve terminare prima di attivare il salvataggio automatico.
  watch(
    () => [tree.value.name, tree.value.people, tree.value.relationships],
    () => {
      if (!hydrated.value) return
      tree.value.updatedAt = new Date().toISOString()
      saveState.value = 'saving'
      window.clearTimeout(saveTimer)
      saveTimer = window.setTimeout(async () => {
        try {
          await saveLocal(tree.value)
          saveState.value = 'saved'
        } catch {
          saveState.value = 'error'
        }
      }, 550)
    },
    { deep: true },
  )

  onMounted(async () => {
    try {
      const [handle, local] = await Promise.all([getRememberedFileHandle(), loadLocal()])
      // Le vecchie installazioni potevano contenere un archivio dimostrativo.
      // Non lo ripristiniamo: gli alberi reali hanno identificativi differenti.
      startupLocal = local?.id !== 'tree-moretti' && hasSavedContent(local) ? local : null
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
  return {
    saveState,
    saveStatusLabel,
    hydrated,
    startupPrompt,
    startupBusy,
    conflictBusy,
    linkedFileName,
    pendingFileConflict,
    saveFile,
    chooseFile,
    openFile,
    reopenPrevious,
    declinePrevious,
    resolveFileConflict,
    createNewTree,
  }
}
