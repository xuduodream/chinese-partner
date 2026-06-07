import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getDecks } from '../utils/storage'

export const useAppStore = defineStore('app', () => {
  const targetLang = ref('en')
  const currentProfile = ref(null)
  const currentDeck = ref(null)
  const sidebarCollapsed = ref(false)
  const deckListVersion = ref(0)
  const showProfileBar = ref(false)

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
  }
})
