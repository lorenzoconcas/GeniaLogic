<script setup lang="ts">
import AppButton from './components/AppButton.vue'
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
    class="group/app-shell grid grid-rows-[minmax(0,_1fr)] grid-cols-[16.5rem_minmax(0,_1fr)] h-dvh bg-canvas bg-none min-[761px]:data-sidebar-collapsed:grid-cols-[4.5rem_minmax(0,_1fr)] max-[1050px]:grid-cols-[13.5rem_minmax(0,_1fr)] max-[760px]:block max-[760px]:min-h-dvh max-[760px]:h-auto"
    :data-sidebar-collapsed="sidebarCollapsed || undefined"
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
      class="px-[0.85rem] py-4 relative z-20 flex min-h-0 overflow-y-auto flex-col [grid-column:1] [grid-row:1] border-r-0 border-r-transparent bg-navy bg-none text-[#f5f6ff] min-[761px]:group-data-sidebar-collapsed/app-shell:px-[0.65rem] min-[761px]:group-data-sidebar-collapsed/app-shell:py-4 max-[760px]:fixed max-[760px]:top-0 max-[760px]:bottom-0 max-[760px]:left-0 max-[760px]:z-60 max-[760px]:w-68 max-[760px]:pt-[calc(1rem_+_env(safe-area-inset-top))] max-[760px]:pb-[calc(1rem_+_env(safe-area-inset-bottom))] max-[760px]:[transform:translateX(-102%)] max-[760px]:[transition:transform_0.2s_ease] max-[760px]:shadow-[12px_0_40px_rgba(30,_30,_28,_0.18)] max-[760px]:data-open:[transform:translateX(0)]"
      :data-open="mobileNavOpen || undefined"
      aria-label="Navigazione e comandi"
      @keydown.esc="mobileNavOpen = false"
    >
      <div
        class="shrink-0 flex items-center justify-between gap-[0.35rem] mb-[1.1rem] min-[761px]:group-data-sidebar-collapsed/app-shell:flex-col min-[761px]:group-data-sidebar-collapsed/app-shell:gap-[0.65rem]"
      >
        <div class="flex items-center gap-2 min-w-0 text-white">
          <button
            class="p-0 border-0 border-transparent bg-transparent bg-none text-left cursor-pointer block [flex:0_0_2rem]"
            aria-label="GeniaLogic — Vai all’albero"
            title="Vai all’albero"
            @click="goTo('tree')"
          >
            <img
              class="block [flex:0_0_2rem] w-8 h-8 rounded-[0.6rem] shadow-[0_7px_18px_rgba(86,_87,_217,_0.28)]"
              :src="appIconUrl"
              alt=""
              width="32"
              height="32"
            />
          </button>
          <div class="min-w-0 min-[761px]:group-data-sidebar-collapsed/app-shell:hidden">
            <button
              class="p-0 border-0 border-transparent bg-transparent bg-none text-left cursor-pointer block text-[inherit] font-display text-[1rem] font-[850] tracking-[-0.035em] leading-[1]"
              @click="goTo('tree')"
            >
              GeniaLogic
            </button>
            <button
              class="p-0 border-0 border-transparent bg-transparent bg-none text-left cursor-pointer block max-w-36 mt-1 overflow-hidden text-[#9299b0] text-[0.58rem] font-bold leading-[1.2] text-ellipsis whitespace-nowrap hover:text-[#b7bed8]"
              :aria-label="`${buildInfoLabel}; ${buildInfoAction}`"
              :title="buildInfoAction"
              @click="cycleBuildInfo"
            >
              {{ buildInfoLabel }}
            </button>
          </div>
        </div>
        <button
          class="border border-transparent w-8 h-8 inline-grid place-items-center flex-none rounded-[0.6rem] bg-transparent bg-none text-[#b7bed8] cursor-pointer hover:border-[#343a58] hover:bg-[#262c47] hover:bg-none hover:text-white max-[760px]:hidden"
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
          class="hidden! border border-transparent place-items-center w-8 h-8 flex-none rounded-[0.6rem] bg-transparent bg-none text-[#b7bed8] cursor-pointer hover:border-[#343a58] hover:bg-[#262c47] hover:bg-none hover:text-white max-[760px]:inline-grid!"
          aria-label="Chiudi navigazione"
          aria-controls="main-sidebar"
          @click="mobileNavOpen = false"
        >
          <X :size="20" />
        </button>
      </div>
      <div
        class="px-[0.65rem] shrink-0 pt-[0.35rem] pb-4 min-[761px]:group-data-sidebar-collapsed/app-shell:hidden"
      >
        <p
          class="m-0 text-[#9495ff] text-[0.61rem] font-[850] tracking-[0.16em] uppercase last:m-0 last:text-[#969db5] last:text-[0.7rem]"
        >
          Albero attivo
        </p>
        <p
          class="mx-0 mt-[0.4rem] mb-1 overflow-hidden text-ellipsis whitespace-nowrap text-white font-display text-[1.16rem] font-extrabold tracking-[-0.025em] last:m-0 last:text-[#969db5] last:text-[0.7rem]"
        >
          {{ tree.name }}
        </p>
        <p class="last:m-0 last:text-[#969db5] last:text-[0.7rem]">
          {{ tree.people.length }} persone · {{ tree.relationships.length }} legami
        </p>
      </div>
      <AppButton
        size="sidebar"
        tone="primary"
        class="shrink-0 w-full mb-[0.85rem] min-[761px]:group-data-sidebar-collapsed/app-shell:p-[0.6rem]"
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
        <span class="min-[761px]:group-data-sidebar-collapsed/app-shell:hidden">
          Aggiungi persona
        </span>
      </AppButton>
      <nav
        class="shrink-0 grid gap-[0.28rem] mt-1"
        aria-label="Navigazione principale"
      >
        <button
          class="group/button border-0 border-transparent px-[0.78rem] py-[0.72rem] grid grid-cols-[1.25rem_1fr_auto] items-center gap-[0.65rem] w-full rounded-[0.55rem] bg-transparent bg-none text-[#aab0c5] text-[0.875rem] font-bold text-left cursor-pointer hover:bg-[#222740] hover:bg-none hover:text-white data-active:bg-[linear-gradient(90deg,_#5657d9,_#6263e4)] data-active:bg-transparent data-active:text-white data-active:shadow-[0_8px_20px_rgba(0,_0,_0,_0.18)] min-[761px]:group-data-sidebar-collapsed/app-shell:p-[0.7rem] min-[761px]:group-data-sidebar-collapsed/app-shell:flex min-[761px]:group-data-sidebar-collapsed/app-shell:justify-center min-[761px]:group-data-sidebar-collapsed/app-shell:min-h-[2.8rem]"
          v-for="item in navItems"
          :key="item.id"
          :data-active="activeView === item.id || undefined"
          :aria-label="item.label"
          :title="item.label"
          :aria-current="activeView === item.id ? 'page' : undefined"
          @click="goTo(item.id)"
        >
          <component
            :is="item.icon"
            :size="18"
          />
          <span class="min-[761px]:group-data-sidebar-collapsed/app-shell:hidden">
            {{ item.label }}
          </span>
          <ChevronRight
            class="last:opacity-0 group-data-active/button:last:opacity-100 min-[761px]:group-data-sidebar-collapsed/app-shell:last:hidden"
            :size="14"
          />
        </button>
      </nav>
      <div class="shrink-0 grid gap-2 mt-auto pt-5">
        <div class="grid grid-cols-[1fr] gap-[0.4rem]">
          <button
            class="border border-[#343a58] px-3 py-[0.6rem] flex items-center justify-start gap-[0.65rem] min-h-11 rounded-lg bg-transparent bg-none text-[#c0c6dc] text-[0.875rem] font-bold cursor-pointer hover:bg-[#262c47] hover:bg-none hover:text-white min-[761px]:group-data-sidebar-collapsed/app-shell:p-[0.6rem] min-[761px]:group-data-sidebar-collapsed/app-shell:justify-center min-[761px]:group-data-sidebar-collapsed/app-shell:min-h-[2.8rem]"
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
            <span class="min-[761px]:group-data-sidebar-collapsed/app-shell:hidden">
              Nuovo albero
            </span>
          </button>
          <button
            class="border border-[#343a58] px-3 py-[0.6rem] flex items-center justify-start gap-[0.65rem] min-h-11 rounded-lg bg-transparent bg-none text-[#c0c6dc] text-[0.875rem] font-bold cursor-pointer hover:bg-[#262c47] hover:bg-none hover:text-white min-[761px]:group-data-sidebar-collapsed/app-shell:p-[0.6rem] min-[761px]:group-data-sidebar-collapsed/app-shell:justify-center min-[761px]:group-data-sidebar-collapsed/app-shell:min-h-[2.8rem]"
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
            <span class="min-[761px]:group-data-sidebar-collapsed/app-shell:hidden">
              Apri archivio
            </span>
          </button>
          <button
            class="border border-[#343a58] px-3 py-[0.6rem] flex items-center justify-start gap-[0.65rem] min-h-11 rounded-lg bg-transparent bg-none text-[#c0c6dc] text-[0.875rem] font-bold cursor-pointer hover:bg-[#262c47] hover:bg-none hover:text-white min-[761px]:group-data-sidebar-collapsed/app-shell:p-[0.6rem] min-[761px]:group-data-sidebar-collapsed/app-shell:justify-center min-[761px]:group-data-sidebar-collapsed/app-shell:min-h-[2.8rem]"
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
            <span class="min-[761px]:group-data-sidebar-collapsed/app-shell:hidden">
              Salva file .genia
            </span>
          </button>
        </div>
        <div
          class="px-[0.65rem] py-[0.45rem] flex items-center gap-[0.45rem] text-[#b9c4d9] text-[0.8125rem] font-bold data-[state~=saving]:text-[#eac27a] data-[state~=error]:text-[#ff9eac] min-[761px]:group-data-sidebar-collapsed/app-shell:px-0 min-[761px]:group-data-sidebar-collapsed/app-shell:py-[0.45rem] min-[761px]:group-data-sidebar-collapsed/app-shell:justify-center max-[760px]:hidden"
          :data-state="saveState"
          role="status"
          :aria-label="
            linkedFileName
              ? `${saveStatusLabel}; file collegato ${linkedFileName}`
              : saveStatusLabel
          "
          :title="linkedFileName ? `File collegato: ${linkedFileName}` : saveStatusLabel"
        >
          <Check
            class="shrink-0"
            v-if="saveState === 'saved'"
            :size="16"
          />
          <Info
            class="shrink-0"
            v-else-if="saveState === 'error'"
            :size="16"
          />
          <Save
            class="shrink-0"
            v-else
            :size="16"
          />
          <span class="min-[761px]:group-data-sidebar-collapsed/app-shell:hidden">
            {{ linkedFileName ? `Collegato: ${linkedFileName}` : saveStatusLabel }}
          </span>
        </div>
        <div
          class="p-[0.8rem] border border-[#343a58] flex gap-[0.65rem] rounded-[0.65rem] bg-[#20253d] bg-none text-[#b9baff] min-[761px]:group-data-sidebar-collapsed/app-shell:hidden"
        >
          <ShieldCheck
            class="flex-none"
            :size="18"
          />
          <div>
            <strong class="block text-[0.7rem]">Privato per natura</strong>
            <p class="mx-0 mt-[0.18rem] mb-0 text-[#9299b0] text-[0.62rem] leading-[1.45]">
              I dati non lasciano mai questo dispositivo.
            </p>
          </div>
        </div>
      </div>
    </aside>
    <button
      v-if="mobileNavOpen"
      class="hidden max-[760px]:border-0 max-[760px]:border-transparent max-[760px]:fixed max-[760px]:inset-0 max-[760px]:z-50 max-[760px]:block max-[760px]:w-full max-[760px]:bg-[rgba(30,_30,_28,_0.32)] max-[760px]:bg-none"
      aria-label="Chiudi navigazione"
      @click="mobileNavOpen = false"
    />

    <main
      class="px-[1.2rem] relative min-w-0 min-h-0 [grid-column:2] [grid-row:1] overflow-auto pt-4 pb-[1.2rem] data-tree-main:flex data-tree-main:flex-col max-[760px]:p-4 max-[760px]:min-h-dvh max-[760px]:overflow-visible"
      :data-tree-main="activeView === 'tree' || undefined"
    >
      <button
        class="hidden! border border-transparent place-items-center w-8 h-8 flex-none rounded-[0.6rem] bg-transparent bg-none text-muted cursor-pointer hover:border-line hover:bg-soft hover:bg-none hover:text-ink max-[760px]:inline-grid!"
        aria-label="Apri navigazione"
        :aria-expanded="mobileNavOpen"
        aria-controls="main-sidebar"
        @click="mobileNavOpen = true"
      >
        <Menu :size="22" />
      </button>
      <template v-if="activeView === 'tree'">
        <section
          class="shrink-0 flex items-end justify-between gap-4 mb-4 max-[1050px]:items-start max-[1050px]:flex-col max-[760px]:items-start max-[500px]:gap-2"
        >
          <h1
            class="sr-only mx-0 mt-[0.15rem] mb-0 font-display text-[clamp(1.75rem,_2.5vw,_2.25rem)] font-[850] tracking-[-0.055em] leading-[1.05] max-[760px]:text-[1.65rem]"
          >
            Albero
          </h1>
          <div
            class="flex flex-wrap items-center justify-between gap-[0.55rem] w-full max-[1050px]:w-full max-[1050px]:justify-between max-[500px]:items-stretch max-[500px]:flex-col"
          >
            <div
              class="p-[0.2rem] border border-[#d8dbea] flex flex-wrap items-center gap-[0.18rem] rounded-[0.65rem] bg-[#e9ebf3] bg-none max-[500px]:w-full"
              role="group"
              aria-label="Disposizione dell’albero"
            >
              <button
                class="border-0 border-transparent px-[0.55rem] py-[0.38rem] inline-flex items-center justify-center gap-[0.32rem] min-h-[1.95rem] rounded-[0.45rem] bg-transparent bg-none text-[#73798c] text-[0.63rem] font-[780] whitespace-nowrap cursor-pointer [transition:background_0.15s,_color_0.15s,_box-shadow_0.15s] hover:text-[#4546bc] data-active:bg-paper data-active:bg-none data-active:text-[#4f50c5] data-active:shadow-[0_2px_7px_rgba(38,_42,_74,_0.12)] max-[500px]:px-[0.28rem] max-[500px]:py-[0.38rem] max-[500px]:min-w-0 max-[500px]:flex-1"
                type="button"
                :data-active="layoutMode === 'generational' || undefined"
                title="Disponi per generazioni"
                @click="setLayoutMode('generational')"
              >
                <GitFork :size="15" />
                <span>Generazioni</span>
              </button>
              <button
                class="border-0 border-transparent px-[0.55rem] py-[0.38rem] inline-flex items-center justify-center gap-[0.32rem] min-h-[1.95rem] rounded-[0.45rem] bg-transparent bg-none text-[#73798c] text-[0.63rem] font-[780] whitespace-nowrap cursor-pointer [transition:background_0.15s,_color_0.15s,_box-shadow_0.15s] hover:text-[#4546bc] data-active:bg-paper data-active:bg-none data-active:text-[#4f50c5] data-active:shadow-[0_2px_7px_rgba(38,_42,_74,_0.12)] max-[500px]:px-[0.28rem] max-[500px]:py-[0.38rem] max-[500px]:min-w-0 max-[500px]:flex-1"
                type="button"
                :data-active="layoutMode === 'focus' || undefined"
                title="Metti la persona selezionata al centro"
                @click="setLayoutMode('focus')"
              >
                <Focus :size="15" />
                <span>Al centro</span>
              </button>
              <button
                class="border-0 border-transparent px-[0.55rem] py-[0.38rem] inline-flex items-center justify-center gap-[0.32rem] min-h-[1.95rem] rounded-[0.45rem] bg-transparent bg-none text-[#73798c] text-[0.63rem] font-[780] whitespace-nowrap cursor-pointer [transition:background_0.15s,_color_0.15s,_box-shadow_0.15s] hover:text-[#4546bc] data-active:bg-paper data-active:bg-none data-active:text-[#4f50c5] data-active:shadow-[0_2px_7px_rgba(38,_42,_74,_0.12)] max-[500px]:px-[0.28rem] max-[500px]:py-[0.38rem] max-[500px]:min-w-0 max-[500px]:flex-1"
                type="button"
                :data-active="layoutMode === 'fan' || undefined"
                :aria-pressed="layoutMode === 'fan'"
                title="Mostra il ventaglio degli antenati a 180°"
                @click="setLayoutMode('fan')"
              >
                <CircleDot :size="15" />
                <span>Ventaglio</span>
              </button>
              <button
                class="border-0 border-transparent px-[0.55rem] py-[0.38rem] inline-flex items-center justify-center gap-[0.32rem] min-h-[1.95rem] rounded-[0.45rem] bg-transparent bg-none text-[#73798c] text-[0.63rem] font-[780] whitespace-nowrap cursor-pointer [transition:background_0.15s,_color_0.15s,_box-shadow_0.15s] hover:text-[#4546bc] data-active:bg-paper data-active:bg-none data-active:text-[#4f50c5] data-active:shadow-[0_2px_7px_rgba(38,_42,_74,_0.12)] max-[500px]:px-[0.28rem] max-[500px]:py-[0.38rem] max-[500px]:min-w-0 max-[500px]:flex-1"
                type="button"
                :data-active="layoutMode === 'radial' || undefined"
                :aria-pressed="layoutMode === 'radial'"
                title="Mostra gli antenati nel cerchio completo a 360°"
                @click="setLayoutMode('radial')"
              >
                <CircleDot :size="15" />
                <span>Radiale</span>
              </button>
              <button
                class="border-0 border-transparent px-[0.55rem] py-[0.38rem] inline-flex items-center justify-center gap-[0.32rem] min-h-[1.95rem] rounded-[0.45rem] bg-transparent bg-none text-[#73798c] text-[0.63rem] font-[780] whitespace-nowrap cursor-pointer [transition:background_0.15s,_color_0.15s,_box-shadow_0.15s] hover:text-[#4546bc] data-active:bg-paper data-active:bg-none data-active:text-[#4f50c5] data-active:shadow-[0_2px_7px_rgba(38,_42,_74,_0.12)] max-[500px]:px-[0.28rem] max-[500px]:py-[0.38rem] max-[500px]:min-w-0 max-[500px]:flex-1"
                type="button"
                :data-active="layoutMode === 'ancestors' || undefined"
                title="Mostra solo gli antenati"
                @click="setLayoutMode('ancestors')"
              >
                <GitFork :size="15" />
                <span>Antenati</span>
              </button>
            </div>
            <AppButton
              tone="secondary"
              class="max-[500px]:px-[0.6rem] max-[500px]:py-2 max-[500px]:text-[0.66rem]"
              :disabled="tree.people.length < 2"
              @click="openRelationship()"
            >
              <Link2 :size="16" />
              Aggiungi legame
            </AppButton>
          </div>
        </section>
        <section
          class="flex flex-1 gap-[0.9rem] min-h-116 max-[760px]:block max-[760px]:h-auto max-[760px]:min-h-0"
        >
          <div
            v-if="tree.people.length"
            class="border border-line relative min-w-0 flex-1 overflow-hidden rounded-[0.8rem] bg-[#fbfcff] bg-none shadow-panel not-data-radial-mode:flex not-data-radial-mode:flex-col max-[760px]:h-128"
            :data-radial-mode="
              layoutMode === 'fan' ||
              layoutMode === 'radial' ||
              layoutMode === 'ancestors' ||
              undefined
            "
          >
            <div
              v-if="graphVisible()"
              class="p-[0.65rem] relative z-10 flex items-center justify-between gap-[0.65rem] shrink-0 border-b border-b-line bg-[#f8f9fd] bg-none"
            >
              <GraphPersonSearch
                :key="tree.id"
                :people="tree.people"
                :selected-id="selectedPersonId"
                @select-person="revealPerson"
              />
              <button
                class="border border-line static shrink-0 w-11 h-11 right-3 top-3 z-5 grid place-items-center rounded-[0.65rem] bg-paper bg-none text-muted shadow-[0_4px_12px_rgba(40,_38,_33,_0.08)] cursor-pointer"
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
              class="h-auto min-h-0 w-full flex-1 [&_.vue-flow\_\_node]:border-0 [&_.vue-flow\_\_node]:bg-transparent [&_.vue-flow\_\_node]:p-0 [&_.vue-flow\_\_node]:shadow-none [&_.vue-flow\_\_edge-path]:transition-[stroke-width] [&_.vue-flow\_\_edge-path]:duration-150 [&_.vue-flow\_\_edge:hover_.vue-flow\_\_edge-path]:stroke-[3] [&_.vue-flow\_\_controls]:overflow-hidden [&_.vue-flow\_\_controls]:rounded-[0.65rem] [&_.vue-flow\_\_controls]:border [&_.vue-flow\_\_controls]:border-line [&_.vue-flow\_\_controls]:shadow-[0_5px_14px_rgba(40,38,33,0.1)] [&_.vue-flow\_\_controls-button]:size-[1.9rem] [&_.vue-flow\_\_controls-button]:border-line [&_.vue-flow\_\_controls-button]:bg-paper [&_.vue-flow\_\_controls-button]:fill-ink"
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
              class="border border-line px-[0.65rem] py-[0.45rem] absolute right-3 bottom-3 z-4 flex gap-[0.8rem] rounded-lg bg-[rgba(255,_255,_255,_0.94)] bg-none text-muted text-[0.56rem] font-bold backdrop-blur-[8px] max-[760px]:hidden"
            >
              <span class="flex items-center gap-[0.3rem]">
                <i class="block w-[1.2rem] border-t-[2px] border-t-[#7c7165]" />
                Genitorialità
              </span>
              <span class="flex items-center gap-[0.3rem]">
                <i class="border-[#5657d9] block w-[1.2rem] border-t-[2px]" />
                Fratelli
              </span>
              <span class="flex items-center gap-[0.3rem]">
                <i class="border-ochre block w-[1.2rem] border-t-[2px]" />
                Coppia
              </span>
              <span class="flex items-center gap-[0.3rem]">
                <i
                  class="border-terracotta block w-[1.2rem] border-t-[2px] [border-top-style:dashed]"
                />
                Concluso
              </span>
            </div>
          </div>
          <div
            v-else
            class="p-8 border border-[#cfc9bd] flex min-h-88 flex-1 flex-col items-center justify-center [border-top-style:dashed] [border-right-style:dashed] [border-bottom-style:dashed] [border-left-style:dashed] rounded-[1.1rem] bg-[rgba(253,_252,_248,_0.6)] bg-none text-center"
          >
            <div
              class="grid place-items-center w-[3.6rem] h-[3.6rem] mb-4 rounded-full bg-[#e4ebe7] bg-none text-forest"
            >
              <GitFork :size="28" />
            </div>
            <p class="m-0 text-[#6667df] text-[0.61rem] font-[850] tracking-[0.16em] uppercase">
              Un nuovo inizio
            </p>
            <h2 class="mx-0 my-[0.4rem] font-display text-[1.45rem]">
              Il tuo albero è ancora vuoto
            </h2>
            <p class="mx-0 max-w-108 mt-0 mb-[1.2rem] text-muted text-[0.72rem] leading-[1.6]">
              Aggiungi la prima persona. Potrai poi collegarla a genitori, figli e partner.
            </p>
            <AppButton
              tone="primary"
              @click="openNewPerson"
            >
              <UserRoundPlus :size="17" />
              Aggiungi la prima persona
            </AppButton>
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
      class="text-[0.95rem]"
      v-if="modal === 'delete-person' && selectedPerson"
      title="Eliminare questa persona?"
      subtitle="Verranno rimossi anche tutti i suoi legami."
      @close="modal = null"
    >
      <div
        class="p-[0.8rem] border border-line flex items-center gap-3 rounded-[0.8rem] bg-[#f8f6f0] bg-none"
      >
        <div
          class="grid place-items-center w-[3.1rem] h-[3.1rem] flex-none rounded-[0.9rem] text-white text-[0.78rem] font-[850] tracking-[0.05em]"
          :style="{ background: selectedPerson.color }"
        >
          {{ initials(selectedPerson) }}
        </div>
        <div>
          <strong class="font-display text-[1rem]">{{ fullName(selectedPerson) }}</strong>
          <p class="mx-0 mt-1 mb-0 text-muted text-[0.8rem]">
            {{
              tree.relationships.filter(
                (r) => r.sourceId === selectedPerson!.id || r.targetId === selectedPerson!.id,
              ).length
            }}
            legami associati
          </p>
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-[1.1rem]">
        <AppButton
          size="dialog"
          tone="subtle"
          @click="modal = null"
        >
          Annulla
        </AppButton>
        <AppButton
          size="dialog"
          tone="danger"
          @click="deleteSelectedPerson"
        >
          <Trash2 :size="16" />
          Elimina definitivamente
        </AppButton>
      </div>
    </ModalShell>
    <ModalShell
      class="text-[0.95rem]"
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
      <div
        class="p-[0.85rem] border border-line flex items-center gap-[0.8rem] rounded-[0.7rem] bg-[#f8f9fc] bg-none"
      >
        <div
          class="grid place-items-center w-[2.3rem] h-[2.3rem] rounded-[0.7rem] data-[state~=parent]:bg-[#e6ede9] data-[state~=parent]:bg-none data-[state~=parent]:text-forest data-[state~=couple]:bg-[#f4ead9] data-[state~=couple]:bg-none data-[state~=couple]:text-[#8d672e] data-[state~=sibling]:bg-[#eeeeff] data-[state~=sibling]:bg-none data-[state~=sibling]:text-[#5657d9] last:grid last:gap-1 last:min-w-0"
          :data-state="
            parentTypeValues.has(pendingRelationship.type)
              ? 'parent'
              : pendingRelationship.type === 'sibling'
                ? 'sibling'
                : 'couple'
          "
        >
          <Link2 :size="18" />
        </div>
        <div class="last:grid last:gap-1 last:min-w-0">
          <span class="text-[#6667cf] text-[0.72rem] font-[850] tracking-[0.08em] uppercase">
            {{ relationshipLabel(pendingRelationship.type) }}
          </span>
          <strong class="overflow-hidden text-ellipsis text-ink text-[0.92rem]">
            {{ fullName(findPerson(pendingRelationship.sourceId)) }} ·
            {{ fullName(findPerson(pendingRelationship.targetId)) }}
          </strong>
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-[1.1rem]">
        <AppButton
          size="dialog"
          tone="subtle"
          @click="
            () => {
              modal = null
              pendingRelationshipId = null
            }
          "
        >
          Annulla
        </AppButton>
        <AppButton
          size="dialog"
          tone="danger"
          @click="confirmDeleteRelationship"
        >
          <Trash2 :size="16" />
          Rimuovi legame
        </AppButton>
      </div>
    </ModalShell>
    <ModalShell
      class="text-[0.95rem]"
      v-if="modal === 'new-tree'"
      title="Creare un nuovo albero?"
      subtitle="La copia locale attuale verrà sostituita."
      @close="modal = null"
    >
      <div
        class="p-[0.8rem] border border-[#e5beb2] flex items-start gap-[0.55rem] rounded-[0.7rem] bg-[#fbefeb] bg-none text-[#8f4938] text-[0.8rem] leading-[1.5]"
      >
        <Info
          class="flex-none"
          :size="19"
        />
        <p class="m-0">
          Esporta prima un file .genia se vuoi conservare l’albero “{{ tree.name }}”.
        </p>
      </div>
      <div class="flex justify-end gap-2 mt-[1.1rem]">
        <AppButton
          size="dialog"
          tone="subtle"
          @click="modal = null"
        >
          Torna indietro
        </AppButton>
        <AppButton
          size="dialog"
          tone="danger"
          @click="createNewTree"
        >
          <FilePlus2 :size="16" />
          Crea albero vuoto
        </AppButton>
      </div>
    </ModalShell>

    <ModalShell
      class="text-[0.95rem]"
      v-if="!hydrated && !startupPrompt"
      title="Controllo dell’archivio"
      subtitle="Verifico se esiste un file usato in precedenza prima di abilitare le modifiche."
      :closable="false"
    >
      <div
        class="p-[0.8rem] border border-[#e5beb2] flex items-start gap-[0.55rem] rounded-[0.7rem] bg-[#fbefeb] bg-none text-[#8f4938] text-[0.8rem] leading-[1.5]"
      >
        <Save
          class="flex-none"
          :size="19"
        />
        <p class="m-0">Attendi un momento…</p>
      </div>
    </ModalShell>
    <ModalShell
      class="text-[0.95rem]"
      v-if="startupPrompt"
      title="Riaprire l’archivio precedente?"
      :subtitle="
        startupPrompt.kind === 'file'
          ? `Rileggerò “${startupPrompt.name}” direttamente dal disco, così non lavorerai su una copia superata.`
          : `È disponibile la copia locale “${startupPrompt.name}”.`
      "
      :closable="false"
    >
      <div
        class="p-[0.8rem] border border-[#e5beb2] flex items-start gap-[0.55rem] rounded-[0.7rem] bg-[#fbefeb] bg-none text-[#8f4938] text-[0.8rem] leading-[1.5]"
      >
        <ShieldCheck
          class="flex-none"
          :size="19"
        />
        <p class="m-0">
          Finché non scegli, la modifica dei dati resta bloccata. Se riapri un file collegato, viene
          sempre ricaricato prima di consentire qualsiasi azione.
        </p>
      </div>
      <div class="flex justify-end gap-2 mt-[1.1rem]">
        <AppButton
          size="dialog"
          tone="subtle"
          :disabled="startupBusy"
          @click="declinePrevious"
        >
          No, crea nuovo
        </AppButton>
        <AppButton
          size="dialog"
          tone="primary"
          :disabled="startupBusy"
          @click="reopenPrevious"
        >
          <FolderOpen :size="16" />
          {{ startupBusy ? 'Ricaricamento…' : 'Sì, riapri' }}
        </AppButton>
      </div>
    </ModalShell>
    <ModalShell
      class="text-[0.95rem]"
      v-if="pendingFileConflict"
      title="Il file contiene modifiche più recenti"
      :subtitle="`“${pendingFileConflict.name}” è cambiato dopo che lo hai aperto. Scegli come salvare senza perdere dati.`"
      :closable="!conflictBusy"
      @close="pendingFileConflict = null"
    >
      <div
        class="p-[0.8rem] border border-[#e5beb2] flex items-start gap-[0.55rem] rounded-[0.7rem] bg-[#fbefeb] bg-none text-[#8f4938] text-[0.8rem] leading-[1.5]"
      >
        <Info
          class="flex-none"
          :size="19"
        />
        <p class="m-0">
          <strong>Unisci modifiche</strong>
          conserva persone e legami aggiunti su entrambe le copie e combina le modifiche fatte a
          campi diversi. Se lo stesso campo è stato cambiato da entrambe le parti, mantiene il
          valore di questo dispositivo.
        </p>
      </div>
      <div class="flex justify-end gap-2 mt-[1.1rem] flex-wrap">
        <AppButton
          size="dialog"
          tone="subtle"
          :disabled="conflictBusy"
          @click="pendingFileConflict = null"
        >
          Annulla
        </AppButton>
        <AppButton
          size="dialog"
          tone="danger"
          :disabled="conflictBusy"
          @click="resolveFileConflict('overwrite')"
        >
          Sovrascrivi
        </AppButton>
        <AppButton
          size="dialog"
          tone="primary"
          :disabled="conflictBusy"
          @click="resolveFileConflict('merge')"
        >
          <GitFork :size="16" />
          {{ conflictBusy ? 'Verifica…' : 'Unisci modifiche' }}
        </AppButton>
      </div>
    </ModalShell>

    <Transition
      enter-active-class="transition-[opacity,transform] duration-200"
      leave-active-class="transition-[opacity,transform] duration-200"
      enter-from-class="opacity-0 translate-y-2"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-if="toast"
        class="px-[0.9rem] py-[0.72rem] fixed right-4 bottom-4 z-150 flex items-center gap-[0.45rem] rounded-[0.7rem] bg-[#263f36] bg-none text-white text-[0.7rem] font-[750] shadow-[0_12px_32px_rgba(20,_30,_26,_0.24)] data-[state~=error]:bg-[#934c3a] data-[state~=error]:bg-none"
        :data-state="toast.tone"
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
