<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  getDecks,
  createDeck,
  getDeckById,
  deleteDeck,
  getAvailableTargetProfiles,
  moveDeck,
  renameDeck,
  validateDeckName,
} from '../../utils/storage'
import RenameModal from '../modal/RenameModal.vue'
import { Trash2, FolderOpen, Pencil, ChevronDown } from '@lucide/vue'

const props = defineProps<{
  currentProfile: any
  currentDeck: any
  onDeckChange: (deck: any) => void
  onCreateDeck?: (deck: any) => void
}>()

const decks = ref<any[]>([])
const showCreateModal = ref(false)
const showDeckList = ref(false)
const newDeckName = ref('')
const newDeckDescription = ref('')
const showRenameModal = ref(false)
const deckToRename = ref<any>(null)

watch(() => props.currentProfile, (profile) => {
  if (profile) {
    loadDecks()
  } else {
    decks.value = []
  }
}, { immediate: false })

function loadDecks() {
  if (!props.currentProfile) return
  const deckList = getDecks(props.currentProfile.id)
  decks.value = deckList
  if (!props.currentDeck && deckList.length > 0) {
    props.onDeckChange(deckList[0])
  }
}

function handleCreateDeck() {
  if (!newDeckName.value.trim() || !props.currentProfile) return
  const deck = createDeck(
    props.currentProfile.id,
    newDeckName.value.trim(),
    newDeckDescription.value.trim(),
  )
  newDeckName.value = ''
  newDeckDescription.value = ''
  showCreateModal.value = false
  loadDecks()
  props.onDeckChange(deck)
  props.onCreateDeck?.(deck)
}

function handleDeckSelect(deckId: string) {
  const deck = getDeckById(deckId)
  if (deck) {
    props.onDeckChange(deck)
    showDeckList.value = false
  }
}

function handleDeleteDeck(deckId: string, event: Event) {
  event.stopPropagation()
  if (window.confirm('Are you sure you want to delete this deck? All cards in this deck will be permanently deleted.')) {
    deleteDeck(deckId)
    loadDecks()
    if (props.currentDeck && props.currentDeck.id === deckId) {
      const remaining = decks.value.filter(d => d.id !== deckId)
      props.onDeckChange(remaining.length > 0 ? remaining[0] : null)
    }
  }
}

function handleQuickMove(deckId: string) {
  const availableProfiles = getAvailableTargetProfiles(deckId)
  if (availableProfiles.length === 0) {
    alert('No other profiles available to move this deck to.')
    return
  }
  const targetProfile = availableProfiles[0]
  const deck = getDeckById(deckId)
  if (window.confirm(`Move deck "${deck.name}" to profile "${targetProfile.name}"?`)) {
    const result = moveDeck(deckId, targetProfile.id)
    if (result.success) {
      loadDecks()
      if (props.currentDeck && props.currentDeck.id === deckId) {
        props.onDeckChange(null)
      }
    } else {
      alert(`Failed to move deck: ${result.message}`)
    }
  }
}
</script>

<template>
  <div v-if="!currentProfile" class="deck-manager">
    <div class="deck-selector">
      <span class="no-profile-message">Please select a profile first</span>
    </div>
  </div>

  <div v-else class="deck-manager">
    <!-- Deck Selector -->
    <div class="deck-selector">
      <button class="deck-selector-btn" @click="showDeckList = !showDeckList">
        <span class="deck-name">
          {{ currentDeck ? currentDeck.name : 'Select a deck...' }}
        </span>
        <span class="deck-count">
          {{ currentDeck ? `(${currentDeck.cardCount || 0} cards)` : '' }}
        </span>
        <ChevronDown :size="14" style="margin-left: auto; flex-shrink: 0;" />
      </button>

      <button class="create-deck-btn" @click="showCreateModal = true">
        + New Deck
      </button>
    </div>

    <!-- Deck Dropdown -->
    <div v-if="showDeckList" class="deck-dropdown">
      <div v-if="decks.length === 0" class="no-decks-message">
        No decks yet. Create your first deck!
      </div>
      <div v-else class="deck-list">
        <div
          v-for="deck in decks"
          :key="deck.id"
          class="deck-item"
          :class="{ selected: currentDeck && currentDeck.id === deck.id }"
          @click="handleDeckSelect(deck.id)"
        >
          <div class="deck-item-info">
            <span class="deck-item-name">{{ deck.name }}</span>
            <span class="deck-item-count">({{ deck.cardCount || 0 }} cards)</span>
            <span v-if="deck.description" class="deck-item-description">{{ deck.description }}</span>
          </div>
          <button
            class="delete-deck-btn btn-icon"
            @click="handleDeleteDeck(deck.id, $event)"
            title="Delete deck"
          >
            <Trash2 :size="16" />
          </button>
          <button
            class="move-deck-dropdown-btn btn-icon"
            @click.stop="handleQuickMove(deck.id)"
            title="Move deck"
          >
            <FolderOpen :size="16" />
          </button>
          <button
            class="rename-deck-dropdown-btn btn-icon"
            @click.stop="
              deckToRename = deck;
              showRenameModal = true;
            "
            title="Rename deck"
          >
            <Pencil :size="16" />
          </button>
        </div>
      </div>
    </div>

    <!-- Create Deck Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click="showCreateModal = false">
      <div class="modal-content" @click.stop>
        <h3>Create New Deck</h3>
        <p class="profile-context">in profile: {{ currentProfile.name }}</p>

        <div class="form-group">
          <label for="deck-name">Deck Name *</label>
          <input
            id="deck-name"
            type="text"
            v-model="newDeckName"
            placeholder="e.g., Greetings, Food & Dining, HSK 1"
            autofocus
          />
        </div>

        <div class="form-group">
          <label for="deck-description">Description</label>
          <textarea
            id="deck-description"
            v-model="newDeckDescription"
            placeholder="Optional description for this deck"
            rows="3"
          />
        </div>

        <div class="modal-actions">
          <button class="btn-ghost" @click="showCreateModal = false">Cancel</button>
          <button class="btn-primary" @click="handleCreateDeck" :disabled="!newDeckName.trim()">
            Create Deck
          </button>
        </div>
      </div>
    </div>

    <!-- Current Deck Info -->
    <div v-if="currentDeck" class="current-deck-info">
      <h4>{{ currentDeck.name }}</h4>
      <p v-if="currentDeck.description" class="deck-description">{{ currentDeck.description }}</p>
      <small class="deck-meta">
        Created: {{ new Date(currentDeck.createdAt).toLocaleDateString() }}
        <template v-if="currentDeck.cardCount !== undefined">
          • Cards: {{ currentDeck.cardCount }}
        </template>
        <template v-if="currentDeck.lastStudied">
          • Last studied: {{ new Date(currentDeck.lastStudied).toLocaleDateString() }}
        </template>
      </small>
    </div>

    <!-- Rename Deck Modal -->
    <RenameModal
      v-if="deckToRename"
      :isOpen="showRenameModal"
      @close="showRenameModal = false; deckToRename = null"
      :onRename="(newName: string) => renameDeck(deckToRename.id, newName)"
      :currentName="deckToRename.name"
      :validateName="(name: string) => validateDeckName(name, deckToRename.profileId, deckToRename.id)"
      title="Rename Deck"
      itemType="Deck"
    />
  </div>
</template>
