<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  getDecks,
  getCards,
  deleteDeck,
  getDeckDueStats,
  deleteCard,
  renameDeck,
  validateDeckName,
  getProfiles,
  getProfileById,
  createProfile,
  createDeck,
  deleteProfile,
  renameProfile,
  validateProfileName,
} from '../utils/storage'
import { useAppStore } from '../stores/app'
import DeckReviewPage from '../components/deck/DeckReviewPage.vue'
import StudySession from '../components/deck/StudySession.vue'
import DeckMoveModal from '../components/modal/DeckMoveModal.vue'
import RenameModal from '../components/modal/RenameModal.vue'

const appStore = useAppStore()

const view = ref<'deck-list' | 'deck-review' | 'study-session'>('deck-list')
const selectedDeck = ref<any>(null)
const decks = ref<any[]>([])
const showMoveModal = ref(false)
const deckToMove = ref<any>(null)
const showRenameModal = ref(false)
const deckToRename = ref<any>(null)

// Load decks when profile changes
watch(() => appStore.currentProfile, () => loadDecks(), { immediate: true })
watch(() => appStore.deckListVersion, () => loadDecks())

function loadDecks() {
  if (!appStore.currentProfile) return
  decks.value = getDecks(appStore.currentProfile.id)
}

function handleDeckSelect(deck: any) {
  selectedDeck.value = deck
  view.value = 'deck-review'
}

function handleStudySession(deck: any) {
  selectedDeck.value = deck
  view.value = 'study-session'
}

function handleBackToDeckList() {
  view.value = 'deck-list'
  selectedDeck.value = null
}

function handleStudyComplete() {
  view.value = 'deck-list'
  selectedDeck.value = null
  loadDecks()
}

function handleMoveDeck(deck: any) {
  deckToMove.value = deck
  showMoveModal.value = true
}

function handleMoveComplete(result: any) {
  if (result.success) loadDecks()
}

function handleDeleteDeck(deck: any) {
  const deckCards = getCards(deck.id)
  if (deckCards.length > 0) {
    if (!window.confirm(`Are you sure you want to delete the deck "${deck.name}"? This will also delete ${deckCards.length} cards in this deck.`)) return
  } else {
    if (!window.confirm(`Are you sure you want to delete the deck "${deck.name}"?`)) return
  }
  deleteDeck(deck.id)
  loadDecks()
}

function handleRenameDeck(deck: any) {
  deckToRename.value = deck
  showRenameModal.value = true
}

function handleRenameComplete(result: any) {
  if (result.success) loadDecks()
}

function studyLabel(deck: any): string {
  const dueStats = getDeckDueStats(deck.id)
  const canStudy = dueStats.due > 0 || dueStats.new > 0
  if (!canStudy) return 'Study Now'
  const parts: string[] = []
  if (dueStats.due > 0) parts.push(`${dueStats.due} due`)
  if (dueStats.new > 0) parts.push(`${dueStats.new} new`)
  return `Study (${parts.join(' + ')})`
}

function canStudy(deck: any): boolean {
  const dueStats = getDeckDueStats(deck.id)
  return dueStats.due > 0 || dueStats.new > 0
}

// Inline profile management (study-context bar)
function handleProfileSelect(e: Event) {
  const id = (e.target as HTMLSelectElement).value
  const profile = getProfileById(id)
  if (profile) appStore.setCurrentProfile(profile)
}

function handleNewProfile() {
  const name = prompt('New profile name:')
  if (name && name.trim()) {
    const profile = createProfile(name.trim(), '', 'en')
    appStore.setCurrentProfile(profile)
    loadDecks()
  }
}

function handleRenameProfile() {
  if (!appStore.currentProfile) return
  const newName = prompt('Rename profile:', appStore.currentProfile.name)
  if (newName && newName.trim() && newName.trim() !== appStore.currentProfile.name) {
    renameProfile(appStore.currentProfile.id, newName.trim())
    const updated = getProfileById(appStore.currentProfile.id)
    if (updated) appStore.setCurrentProfile(updated)
  }
}

function handleDeleteProfileAction() {
  if (!appStore.currentProfile) return
  if (window.confirm(`Delete profile "${appStore.currentProfile.name}"?`)) {
    deleteProfile(appStore.currentProfile.id)
    const remaining = getProfiles()
    appStore.setCurrentProfile(remaining.length > 0 ? remaining[0] : null)
    loadDecks()
  }
}

function handleNewDeck() {
  if (!appStore.currentProfile) {
    alert('Please select a profile first')
    return
  }
  const name = prompt('New deck name:')
  if (name && name.trim()) {
    const deck = createDeck(appStore.currentProfile.id, name.trim(), '')
    appStore.setCurrentDeck(deck)
    appStore.refreshDeckList()
  }
}
</script>

<template>
  <!-- Deck Review Page -->
  <DeckReviewPage
    v-if="view === 'deck-review' && selectedDeck"
    :deck="selectedDeck"
    :onBack="handleBackToDeckList"
  />

  <!-- Study Session -->
  <StudySession
    v-else-if="view === 'study-session' && selectedDeck"
    :deck="selectedDeck"
    :onComplete="handleStudyComplete"
  />

  <!-- Deck List -->
  <div v-else class="revision-page">
    <div class="deck-list-view">
      <!-- Study context bar (profile + deck management) -->
      <div class="study-context">
        <div class="profile-deck-bar">
          <div class="profile-section">
            <label>Study Profile:</label>
            <select
              :value="appStore.currentProfile?.id || ''"
              @change="handleProfileSelect"
            >
              <option value="">Select profile...</option>
              <option v-for="profile in getProfiles()" :key="profile.id" :value="profile.id">
                {{ profile.name }}
              </option>
            </select>

            <div class="profile-actions-dropdown">
              <button class="action-btn new-profile-btn" @click="handleNewProfile">
                + New Profile
              </button>

              <div v-if="appStore.currentProfile" class="profile-actions-menu">
                <button class="dropdown-toggle" title="Profile actions" @click="($event.currentTarget as HTMLElement).nextElementSibling!.classList.toggle('visible')">
                  ⋮
                </button>
                <div class="dropdown-content">
                  <button @click="handleRenameProfile">✏️ Rename Profile</button>
                  <button class="delete-action" @click="handleDeleteProfileAction">🗑️ Delete Profile</button>
                </div>
              </div>
            </div>
          </div>

          <div class="deck-section">
            <button class="action-btn" @click="handleNewDeck">
              + New Deck
            </button>
          </div>
        </div>
      </div>

      <div class="revision-header">
        <h2>
          📚 Study Decks
          <span v-if="appStore.currentProfile" class="profile-info">
            • Profile: <strong>{{ appStore.currentProfile.name }}</strong>
          </span>
        </h2>
      </div>

      <div v-if="!appStore.currentProfile" class="no-profile-state">
        <p>Please select a profile first to view your decks.</p>
      </div>

      <div v-else-if="decks.length === 0" class="empty-state">
        <p>No decks in this profile yet.</p>
        <p>Create your first deck to start organizing your flashcards!</p>
      </div>

      <div v-else class="decks-table-container">
        <table class="decks-table">
          <thead>
            <tr>
              <th>Deck Name</th>
              <th>Cards</th>
              <th>Created</th>
              <th>Last Studied</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="deck in decks" :key="deck.id">
              <td class="deck-name-cell">
                <div>
                  <div class="deck-name">{{ deck.name }}</div>
                  <div v-if="deck.description" class="deck-description">{{ deck.description }}</div>
                </div>
              </td>
              <td class="deck-cards">
                <span class="card-count" @click="handleDeckSelect(deck)">
                  {{ getCards(deck.id).length }}
                </span>
                <span v-if="getDeckDueStats(deck.id).due > 0" class="due-badge">
                  {{ getDeckDueStats(deck.id).due }} due
                </span>
                <span v-if="getDeckDueStats(deck.id).due === 0 && getDeckDueStats(deck.id).new > 0" class="new-badge">
                  {{ getDeckDueStats(deck.id).new }} new
                </span>
              </td>
              <td class="deck-date">{{ new Date(deck.createdAt).toLocaleDateString() }}</td>
              <td class="deck-date">
                {{ deck.lastStudied ? new Date(deck.lastStudied).toLocaleDateString() : '-' }}
              </td>
              <td class="deck-actions-cell">
                <div class="deck-row-actions">
                  <button
                    class="study-btn-table"
                    @click="handleStudySession(deck)"
                    :disabled="!canStudy(deck)"
                  >
                    {{ studyLabel(deck) }}
                  </button>
                  <div class="actions-dropdown">
                    <button
                      class="actions-btn"
                      @click="($event.currentTarget as HTMLElement).nextElementSibling!.classList.toggle('visible')"
                      title="Deck actions"
                    >
                      ⋮
                    </button>
                    <div class="actions-menu">
                      <button class="action-item" @click="handleRenameDeck(deck)">✏️ Rename</button>
                      <button class="action-item" @click="handleMoveDeck(deck)">📁 Move</button>
                      <button class="action-item delete-action" @click="handleDeleteDeck(deck)">🗑️ Delete</button>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Move Deck Modal -->
    <DeckMoveModal
      v-if="showMoveModal && deckToMove"
      :deck="deckToMove"
      :currentProfile="appStore.currentProfile"
      @close="showMoveModal = false; deckToMove = null"
      :onMoveComplete="handleMoveComplete"
    />

    <!-- Rename Deck Modal -->
    <RenameModal
      v-if="showRenameModal && deckToRename"
      :isOpen="showRenameModal"
      @close="showRenameModal = false; deckToRename = null"
      :onRename="async (newName: string) => {
        const result = renameDeck(deckToRename.id, newName)
        if (result.success) loadDecks()
        return result
      }"
      :currentName="deckToRename.name"
      :validateName="(name: string) => validateDeckName(name, deckToRename.profileId, deckToRename.id)"
      title="Rename Deck"
      itemType="Deck"
    />
  </div>
</template>
