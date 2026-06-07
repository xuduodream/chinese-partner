import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getDecks } from '../utils/storage'

const STORAGE_KEY = 'memboost-theme'

export type ThemeMode = 'light' | 'dark' | 'system'

export const useAppStore = defineStore('app', () => {
  const targetLang = ref('en')
  const currentProfile = ref(null)
  const currentDeck = ref(null)
  const sidebarCollapsed = ref(false)
  const deckListVersion = ref(0)
  const showProfileBar = ref(false)

  // ── Theme state ────────────────────────────────────────
  const themeMode = ref<ThemeMode>('system')
  const systemPrefersDark = ref(false)

  const effectiveTheme = computed<'light' | 'dark'>(() => {
    if (themeMode.value === 'light') return 'light'
    if (themeMode.value === 'dark') return 'dark'
    return systemPrefersDark.value ? 'dark' : 'light'
  })

  let mediaQuery: MediaQueryList | null = null
  let mediaHandler: ((e: MediaQueryListEvent) => void) | null = null

  function applyTheme() {
    const theme = effectiveTheme.value
    document.documentElement.setAttribute('data-theme', theme)
  }

  function setThemeMode(mode: ThemeMode) {
    themeMode.value = mode
    localStorage.setItem(STORAGE_KEY, mode)
    // Re-attach system listener if mode is 'system'
    if (mode === 'system') {
      attachSystemListener()
    } else {
      detachSystemListener()
    }
    applyTheme()
  }

  function attachSystemListener() {
    detachSystemListener()
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    systemPrefersDark.value = mediaQuery.matches
    mediaHandler = (e: MediaQueryListEvent) => {
      systemPrefersDark.value = e.matches
      applyTheme()
    }
    mediaQuery.addEventListener('change', mediaHandler)
  }

  function detachSystemListener() {
    if (mediaQuery && mediaHandler) {
      mediaQuery.removeEventListener('change', mediaHandler)
    }
    mediaQuery = null
    mediaHandler = null
  }

  function initTheme() {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
    if (saved && ['light', 'dark', 'system'].includes(saved)) {
      themeMode.value = saved
    } else {
      themeMode.value = 'system'
    }
    if (themeMode.value === 'system') {
      attachSystemListener()
    } else {
      systemPrefersDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    applyTheme()
  }

  // ── End theme state ────────────────────────────────────

  // Save-to-deck modal state
  const showDeckSelector = ref(false)
  const pendingCard = ref(null)
  const selectedProfileId = ref<string | null>(null)
  const step = ref<'profile' | 'deck'>('profile')
  const availableDecks = computed(() =>
    selectedProfileId.value ? getDecks(selectedProfileId.value) : []
  )

  function setTargetLang(lang: string) {
    targetLang.value = lang
  }

  function setCurrentProfile(profile: any) {
    currentProfile.value = profile
    currentDeck.value = null
  }

  function setCurrentDeck(deck: any) {
    currentDeck.value = deck
  }

  function refreshDeckList() {
    deckListVersion.value++
  }

  function openDeckSelector(card: any) {
    showDeckSelector.value = true
    pendingCard.value = card
    step.value = 'profile'
    selectedProfileId.value = currentProfile.value?.id || null
  }

  function closeDeckSelector() {
    showDeckSelector.value = false
    pendingCard.value = null
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  return {
    targetLang,
    currentProfile,
    currentDeck,
    sidebarCollapsed,
    deckListVersion,
    showProfileBar,
    showDeckSelector,
    pendingCard,
    selectedProfileId,
    step,
    availableDecks,
    setTargetLang,
    setCurrentProfile,
    setCurrentDeck,
    refreshDeckList,
    openDeckSelector,
    closeDeckSelector,
    toggleSidebar,
    // Theme
    themeMode,
    effectiveTheme,
    setThemeMode,
    initTheme,
  }
})
