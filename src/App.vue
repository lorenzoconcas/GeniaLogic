<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { VueFlow } from '@vue-flow/core'
import {
  Archive,
  Check,
  ChevronRight,
  FilePlus2,
  FolderOpen,
  CircleDot,
  Focus,
  GitFork,
  Info,
  Link2,
  Maximize2,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  UserRoundPlus,
  Users,
  X,
} from '@lucide/vue'
import PersonFormDialog from './components/PersonFormDialog.vue'
import RelativeFormDialog from './components/RelativeFormDialog.vue'
import CoupleChildDialog from './components/CoupleChildDialog.vue'
import RelationshipFormDialog from './components/RelationshipFormDialog.vue'
import PeopleView from './components/PeopleView.vue'
import RelationshipsView from './components/RelationshipsView.vue'
import ArchiveView from './components/ArchiveView.vue'
import PersonInspector from './components/PersonInspector.vue'
import ModalShell from './components/ModalShell.vue'
import PersonNode from './components/PersonNode.vue'
import RadialTree from './components/RadialTree.vue'
import GraphPersonSearch from './components/GraphPersonSearch.vue'
import AncestorTree from './components/AncestorTree.vue'
import { emptyTree } from './data'
import type { FamilyTree } from './types'
import type { ViewName, LayoutMode } from './uiTypes'
import { parentTypeValues } from './editorOptions'
import { fullName, relationshipLabel, initials } from './services/personPresentation'
import { useTreeGraph } from './composables/useTreeGraph'
import { useTreeArchive } from './composables/useTreeArchive'
import { useTreeEditor } from './composables/useTreeEditor'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'

const tree = ref<FamilyTree>(emptyTree())
const activeView = ref<ViewName>('tree')
const layoutMode = ref<LayoutMode>('generational')
const selectedPersonId = ref<string | null>(null)
const search = ref('')
const mobileNavOpen = ref(false)
const sidebarCollapsed = ref(false)
const appIconUrl = `${import.meta.env.BASE_URL}genialogic.svg`
const appBuildCode = __APP_BUILD_CODE__
const appBuildMoment = new Intl.DateTimeFormat('it-IT', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(__APP_BUILD_TIMESTAMP__))
const appCommitHash = __APP_COMMIT_HASH__
const buildInfoMode = ref<'version' | 'date' | 'commit'>('version')
const buildInfoLabel = computed(() =>
  buildInfoMode.value === 'version'
    ? `Versione ${appBuildCode}`
    : buildInfoMode.value === 'date'
      ? `Build del ${appBuildMoment}`
      : `Commit ${appCommitHash}`,
)
const buildInfoAction = computed(() =>
  buildInfoMode.value === 'version'
    ? 'Mostra data e ora della build'
    : buildInfoMode.value === 'date'
      ? 'Mostra hash del commit'
      : 'Mostra versione',
)
function cycleBuildInfo() {
  buildInfoMode.value =
    buildInfoMode.value === 'version'
      ? 'date'
      : buildInfoMode.value === 'date'
        ? 'commit'
        : 'version'
}
const toast = ref<{ message: string; tone: 'success' | 'error' } | null>(null)
let toastTimer: number | undefined
const sidebarPreferenceKey = 'genialogic.sidebar-collapsed'
const navItems = [
  { id: 'tree' as const, label: 'Albero', icon: GitFork },
  { id: 'people' as const, label: 'Persone', icon: Users },
  { id: 'relationships' as const, label: 'Legami', icon: Link2 },
  { id: 'archive' as const, label: 'Archivio', icon: Archive },
]

const selectedPerson = computed(
  () => tree.value.people.find((person) => person.id === selectedPersonId.value) ?? null,
)
function findPerson(id: string) {
  return tree.value.people.find((person) => person.id === id)
}
function showToast(message: string, tone: 'success' | 'error' = 'success') {
  toast.value = { message, tone }
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toast.value = null
  }, 3400)
}
function showPerson(personId: string) {
  selectedPersonId.value = personId
  activeView.value = 'tree'
}
function goTo(view: ViewName) {
  activeView.value = view
  mobileNavOpen.value = false
}
function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
  try {
    localStorage.setItem(sidebarPreferenceKey, String(sidebarCollapsed.value))
  } catch {
    /* Storage may be unavailable in private browsing. */
  }
  refit()
}

// I composable condividono gli stessi ref: cambiare archivio aggiorna anche editor e grafico.
const { flowNodes, flowEdges, selectNode, setLayoutMode, refit, graphVisible, revealPerson } =
  useTreeGraph(tree, selectedPersonId, activeView, layoutMode, showToast)
const editor = useTreeEditor(tree, selectedPersonId, activeView, refit, showToast)
const {
  pendingRelationshipId,
  modal,
  pendingRelationship,
  openNewPerson,
  openEditPerson,
  openRelative,
  openRelativeFor,
  openParentFromRadial,
  openCoupleChild,
  askDeletePerson,
  deleteSelectedPerson,
  openRelationship,
  askDeleteRelationship,
  confirmDeleteRelationship,
} = editor
const {
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
} = useTreeArchive(tree, selectedPersonId, activeView, refit, showToast, () => {
  modal.value = null
})

onMounted(() => {
  try {
    sidebarCollapsed.value = localStorage.getItem(sidebarPreferenceKey) === 'true'
  } catch {
    /* Mantiene il layout predefinito se lo storage non è disponibile. */
  }
})
</script>

<template>
  <div
    class="app-shell"
    :class="{ 'sidebar-collapsed': sidebarCollapsed }"
  >
    <!-- No accept filter: iOS can otherwise disable .genia files in Files. -->
    <input
      ref="fileInput"
      class="sr-only"
      type="file"
      aria-label="Apri archivio GeniaLogic (.genia)"
      @change="openFile"
    />
    <aside
      id="main-sidebar"
      class="sidebar"
      :class="{ open: mobileNavOpen }"
      aria-label="Navigazione e comandi"
      @keydown.esc="mobileNavOpen = false"
    >
      <div class="sidebar-brand-row">
        <div class="brand">
          <button
            class="brand-home"
            aria-label="GeniaLogic — Vai all’albero"
            title="Vai all’albero"
            @click="goTo('tree')"
          >
            <img
              class="brand-mark"
              :src="appIconUrl"
              alt=""
              width="32"
              height="32"
            />
          </button>
          <div class="brand-copy">
            <button
              class="brand-name"
              @click="goTo('tree')"
            >
              GeniaLogic
            </button>
            <button
              class="brand-build-meta"
              :aria-label="`${buildInfoLabel}; ${buildInfoAction}`"
              :title="buildInfoAction"
              @click="cycleBuildInfo"
            >
              {{ buildInfoLabel }}
            </button>
          </div>
        </div>
        <button
          class="icon-button sidebar-toggle"
          :aria-label="sidebarCollapsed ? 'Espandi sidebar' : 'Comprimi sidebar'"
          :title="sidebarCollapsed ? 'Espandi sidebar' : 'Comprimi sidebar'"
          :aria-expanded="!sidebarCollapsed"
          aria-controls="main-sidebar"
          @click="toggleSidebar"
        >
          <PanelLeftOpen
            v-if="sidebarCollapsed"
            :size="20"
          />
          <PanelLeftClose
            v-else
            :size="20"
          />
        </button>
        <button
          class="icon-button mobile-menu"
          aria-label="Chiudi navigazione"
          aria-controls="main-sidebar"
          @click="mobileNavOpen = false"
        >
          <X :size="20" />
        </button>
      </div>
      <div class="tree-heading">
        <p class="eyebrow">Albero attivo</p>
        <p class="tree-name">{{ tree.name }}</p>
        <p>{{ tree.people.length }} persone · {{ tree.relationships.length }} legami</p>
      </div>
      <button
        class="button primary sidebar-add-person"
        aria-label="Aggiungi persona"
        title="Aggiungi persona"
        @click="
          () => {
            mobileNavOpen = false
            openNewPerson()
          }
        "
      >
        <Plus :size="18" />
        <span>Aggiungi persona</span>
      </button>
      <nav aria-label="Navigazione principale">
        <button
          v-for="item in navItems"
          :key="item.id"
          :class="{ active: activeView === item.id }"
          :aria-label="item.label"
          :title="item.label"
          :aria-current="activeView === item.id ? 'page' : undefined"
          @click="goTo(item.id)"
        >
          <component
            :is="item.icon"
            :size="18"
          />
          <span>{{ item.label }}</span>
          <ChevronRight :size="14" />
        </button>
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-file-actions">
          <button
            type="button"
            aria-label="Nuovo albero"
            title="Nuovo albero"
            @click="
              () => {
                mobileNavOpen = false
                modal = 'new-tree'
              }
            "
          >
            <FilePlus2 :size="18" />
            <span>Nuovo albero</span>
          </button>
          <button
            aria-label="Apri archivio"
            title="Apri archivio"
            @click="
              () => {
                mobileNavOpen = false
                chooseFile()
              }
            "
          >
            <FolderOpen :size="18" />
            <span>Apri archivio</span>
          </button>
          <button
            aria-label="Salva file .genia"
            title="Salva file .genia"
            @click="
              () => {
                mobileNavOpen = false
                saveFile()
              }
            "
          >
            <Save :size="18" />
            <span>Salva file .genia</span>
          </button>
        </div>
        <div
          class="save-state"
          :class="saveState"
          role="status"
          :aria-label="
            linkedFileName
              ? `${saveStatusLabel}; file collegato ${linkedFileName}`
              : saveStatusLabel
          "
          :title="linkedFileName ? `File collegato: ${linkedFileName}` : saveStatusLabel"
        >
          <Check
            v-if="saveState === 'saved'"
            :size="16"
          />
          <Info
            v-else-if="saveState === 'error'"
            :size="16"
          />
          <Save
            v-else
            :size="16"
          />
          <span>{{ linkedFileName ? `Collegato: ${linkedFileName}` : saveStatusLabel }}</span>
        </div>
        <div class="sidebar-note">
          <ShieldCheck :size="18" />
          <div>
            <strong>Privato per natura</strong>
            <p>I dati non lasciano mai questo dispositivo.</p>
          </div>
        </div>
      </div>
    </aside>
    <button
      v-if="mobileNavOpen"
      class="nav-scrim"
      aria-label="Chiudi navigazione"
      @click="mobileNavOpen = false"
    />

    <main
      class="main-area"
      :class="{ 'tree-main': activeView === 'tree' }"
    >
      <button
        class="icon-button mobile-menu mobile-nav-launcher"
        aria-label="Apri navigazione"
        :aria-expanded="mobileNavOpen"
        aria-controls="main-sidebar"
        @click="mobileNavOpen = true"
      >
        <Menu :size="22" />
      </button>
      <template v-if="activeView === 'tree'">
        <section class="view-toolbar tree-view-toolbar">
          <h1 class="sr-only">Albero</h1>
          <div class="tree-view-actions">
            <div
              class="layout-switch"
              role="group"
              aria-label="Disposizione dell’albero"
            >
              <button
                type="button"
                :class="{ active: layoutMode === 'generational' }"
                title="Disponi per generazioni"
                @click="setLayoutMode('generational')"
              >
                <GitFork :size="15" />
                <span>Generazioni</span>
              </button>
              <button
                type="button"
                :class="{ active: layoutMode === 'focus' }"
                title="Metti la persona selezionata al centro"
                @click="setLayoutMode('focus')"
              >
                <Focus :size="15" />
                <span>Al centro</span>
              </button>
              <button
                type="button"
                :class="{ active: layoutMode === 'fan' }"
                :aria-pressed="layoutMode === 'fan'"
                title="Mostra il ventaglio degli antenati a 180°"
                @click="setLayoutMode('fan')"
              >
                <CircleDot :size="15" />
                <span>Ventaglio</span>
              </button>
              <button
                type="button"
                :class="{ active: layoutMode === 'radial' }"
                :aria-pressed="layoutMode === 'radial'"
                title="Mostra gli antenati nel cerchio completo a 360°"
                @click="setLayoutMode('radial')"
              >
                <CircleDot :size="15" />
                <span>Radiale</span>
              </button>
              <button
                type="button"
                :class="{ active: layoutMode === 'ancestors' }"
                title="Mostra solo gli antenati"
                @click="setLayoutMode('ancestors')"
              >
                <GitFork :size="15" />
                <span>Antenati</span>
              </button>
            </div>
            <button
              class="button secondary"
              :disabled="tree.people.length < 2"
              @click="openRelationship()"
            >
              <Link2 :size="16" />
              Aggiungi legame
            </button>
          </div>
        </section>
        <section class="tree-workspace">
          <div
            v-if="tree.people.length"
            class="flow-wrap"
            :class="{
              'radial-mode':
                layoutMode === 'fan' || layoutMode === 'radial' || layoutMode === 'ancestors',
            }"
          >
            <div
              v-if="graphVisible()"
              class="graph-search-toolbar"
            >
              <GraphPersonSearch
                :key="tree.id"
                :people="tree.people"
                :selected-id="selectedPersonId"
                @select-person="revealPerson"
              />
              <button
                class="fit-button"
                title="Centra albero"
                aria-label="Centra albero"
                @click="refit"
              >
                <Maximize2 :size="17" />
              </button>
            </div>
            <RadialTree
              v-if="layoutMode === 'fan' || layoutMode === 'radial'"
              :shape="layoutMode === 'radial' ? 'circle' : 'fan'"
              :people="tree.people"
              :relationships="tree.relationships"
              :root-id="selectedPersonId ?? tree.people[0].id"
              @select-person="selectedPersonId = $event"
              @add-parent="openParentFromRadial"
            />
            <AncestorTree
              v-else-if="layoutMode === 'ancestors'"
              :key="tree.id"
              :people="tree.people"
              :relationships="tree.relationships"
              :root-id="selectedPersonId ?? tree.people[0].id"
              @select-person="selectedPersonId = $event"
            />
            <VueFlow
              v-else
              :nodes="flowNodes"
              :edges="flowEdges"
              :min-zoom="0.18"
              :max-zoom="1.7"
              fit-view-on-init
              nodes-draggable
              :nodes-connectable="false"
              :elements-selectable="true"
              @node-click="selectNode"
            >
              <template #node-person="props">
                <PersonNode
                  v-bind="props"
                  @add-relative="openRelativeFor"
                />
              </template>
              <Background
                pattern-color="#d7d2c7"
                :gap="20"
                :size="1"
              />
              <Controls
                position="bottom-left"
                :show-interactive="false"
              />
            </VueFlow>
            <div
              v-if="graphVisible()"
              class="legend"
            >
              <span>
                <i class="parent-line" />
                Genitorialità
              </span>
              <span>
                <i class="sibling-line" />
                Fratelli
              </span>
              <span>
                <i class="couple-line" />
                Coppia
              </span>
              <span>
                <i class="ended-line" />
                Concluso
              </span>
            </div>
          </div>
          <div
            v-else
            class="empty-state"
          >
            <div class="empty-icon"><GitFork :size="28" /></div>
            <p class="eyebrow">Un nuovo inizio</p>
            <h2>Il tuo albero è ancora vuoto</h2>
            <p>Aggiungi la prima persona. Potrai poi collegarla a genitori, figli e partner.</p>
            <button
              class="button primary"
              @click="openNewPerson"
            >
              <UserRoundPlus :size="17" />
              Aggiungi la prima persona
            </button>
          </div>

          <PersonInspector
            v-if="selectedPerson"
            :person="selectedPerson"
            :tree="tree"
            @close="selectedPersonId = null"
            @edit="openEditPerson"
            @connect="openRelationship"
            @remove="askDeletePerson"
            @add-relative="openRelative"
            @add-child="openCoupleChild"
            @remove-relationship="askDeleteRelationship"
            @select="selectedPersonId = $event"
          />
        </section>
      </template>

      <PeopleView
        v-else-if="activeView === 'people'"
        v-model:search="search"
        :people="tree.people"
        @add="openNewPerson"
        @edit="openEditPerson"
        @select="showPerson"
      />
      <RelationshipsView
        v-else-if="activeView === 'relationships'"
        :tree="tree"
        @add="openRelationship()"
        @add-child="openCoupleChild"
        @remove="askDeleteRelationship"
      />
      <ArchiveView
        v-else
        v-model:name="tree.name"
        :updated-at="tree.updatedAt"
        @save="saveFile"
        @open="chooseFile"
        @create="modal = 'new-tree'"
      />
    </main>

    <PersonFormDialog :editor="editor" />

    <RelativeFormDialog
      :editor="editor"
      :selected-person="selectedPerson"
    />

    <CoupleChildDialog
      :editor="editor"
      :tree="tree"
    />

    <RelationshipFormDialog
      :editor="editor"
      :tree="tree"
    />

    <ModalShell
      v-if="modal === 'delete-person' && selectedPerson"
      title="Eliminare questa persona?"
      subtitle="Verranno rimossi anche tutti i suoi legami."
      @close="modal = null"
    >
      <div class="confirm-box">
        <div
          class="profile-avatar"
          :style="{ background: selectedPerson.color }"
        >
          {{ initials(selectedPerson) }}
        </div>
        <div>
          <strong>{{ fullName(selectedPerson) }}</strong>
          <p>
            {{
              tree.relationships.filter(
                (r) => r.sourceId === selectedPerson!.id || r.targetId === selectedPerson!.id,
              ).length
            }}
            legami associati
          </p>
        </div>
      </div>
      <div class="form-actions">
        <button
          class="button subtle"
          @click="modal = null"
        >
          Annulla
        </button>
        <button
          class="button danger"
          @click="deleteSelectedPerson"
        >
          <Trash2 :size="16" />
          Elimina definitivamente
        </button>
      </div>
    </ModalShell>
    <ModalShell
      v-if="modal === 'delete-relationship' && pendingRelationship"
      title="Rimuovere questo legame?"
      subtitle="Le persone resteranno nell’albero; verrà eliminata soltanto la relazione."
      @close="
        () => {
          modal = null
          pendingRelationshipId = null
        }
      "
    >
      <div class="relationship-confirm">
        <div
          class="relation-icon"
          :class="
            parentTypeValues.has(pendingRelationship.type)
              ? 'parent'
              : pendingRelationship.type === 'sibling'
                ? 'sibling'
                : 'couple'
          "
        >
          <Link2 :size="18" />
        </div>
        <div>
          <span>{{ relationshipLabel(pendingRelationship.type) }}</span>
          <strong>
            {{ fullName(findPerson(pendingRelationship.sourceId)) }} ·
            {{ fullName(findPerson(pendingRelationship.targetId)) }}
          </strong>
        </div>
      </div>
      <div class="form-actions">
        <button
          class="button subtle"
          @click="
            () => {
              modal = null
              pendingRelationshipId = null
            }
          "
        >
          Annulla
        </button>
        <button
          class="button danger"
          @click="confirmDeleteRelationship"
        >
          <Trash2 :size="16" />
          Rimuovi legame
        </button>
      </div>
    </ModalShell>
    <ModalShell
      v-if="modal === 'new-tree'"
      title="Creare un nuovo albero?"
      subtitle="La copia locale attuale verrà sostituita."
      @close="modal = null"
    >
      <div class="warning-note">
        <Info :size="19" />
        <p>Esporta prima un file .genia se vuoi conservare l’albero “{{ tree.name }}”.</p>
      </div>
      <div class="form-actions">
        <button
          class="button subtle"
          @click="modal = null"
        >
          Torna indietro
        </button>
        <button
          class="button danger"
          @click="createNewTree"
        >
          <FilePlus2 :size="16" />
          Crea albero vuoto
        </button>
      </div>
    </ModalShell>

    <ModalShell
      v-if="!hydrated && !startupPrompt"
      title="Controllo dell’archivio"
      subtitle="Verifico se esiste un file usato in precedenza prima di abilitare le modifiche."
      :closable="false"
    >
      <div class="warning-note">
        <Save :size="19" />
        <p>Attendi un momento…</p>
      </div>
    </ModalShell>
    <ModalShell
      v-if="startupPrompt"
      title="Riaprire l’archivio precedente?"
      :subtitle="
        startupPrompt.kind === 'file'
          ? `Rileggerò “${startupPrompt.name}” direttamente dal disco, così non lavorerai su una copia superata.`
          : `È disponibile la copia locale “${startupPrompt.name}”.`
      "
      :closable="false"
    >
      <div class="warning-note">
        <ShieldCheck :size="19" />
        <p>
          Finché non scegli, la modifica dei dati resta bloccata. Se riapri un file collegato, viene
          sempre ricaricato prima di consentire qualsiasi azione.
        </p>
      </div>
      <div class="form-actions">
        <button
          class="button subtle"
          :disabled="startupBusy"
          @click="declinePrevious"
        >
          No, crea nuovo
        </button>
        <button
          class="button primary"
          :disabled="startupBusy"
          @click="reopenPrevious"
        >
          <FolderOpen :size="16" />
          {{ startupBusy ? 'Ricaricamento…' : 'Sì, riapri' }}
        </button>
      </div>
    </ModalShell>
    <ModalShell
      v-if="pendingFileConflict"
      title="Il file contiene modifiche più recenti"
      :subtitle="`“${pendingFileConflict.name}” è cambiato dopo che lo hai aperto. Scegli come salvare senza perdere dati.`"
      :closable="!conflictBusy"
      @close="pendingFileConflict = null"
    >
      <div class="warning-note">
        <Info :size="19" />
        <p>
          <strong>Unisci modifiche</strong>
          conserva persone e legami aggiunti su entrambe le copie e combina le modifiche fatte a
          campi diversi. Se lo stesso campo è stato cambiato da entrambe le parti, mantiene il
          valore di questo dispositivo.
        </p>
      </div>
      <div class="form-actions conflict-actions">
        <button
          class="button subtle"
          :disabled="conflictBusy"
          @click="pendingFileConflict = null"
        >
          Annulla
        </button>
        <button
          class="button danger"
          :disabled="conflictBusy"
          @click="resolveFileConflict('overwrite')"
        >
          Sovrascrivi
        </button>
        <button
          class="button primary"
          :disabled="conflictBusy"
          @click="resolveFileConflict('merge')"
        >
          <GitFork :size="16" />
          {{ conflictBusy ? 'Verifica…' : 'Unisci modifiche' }}
        </button>
      </div>
    </ModalShell>

    <Transition name="toast">
      <div
        v-if="toast"
        class="toast"
        :class="toast.tone"
      >
        <Check
          v-if="toast.tone === 'success'"
          :size="17"
        />
        <Info
          v-else
          :size="17"
        />
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>
