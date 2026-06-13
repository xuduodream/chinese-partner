<script setup lang="ts">
import { ref, watch } from 'vue'
import { getAvailableTargetProfiles, getProfileById, moveDeck } from '../../utils/storage'
import { AlertTriangle } from '@lucide/vue'

const props = defineProps<{
  deck: any
  currentProfile: any
  onMoveComplete?: (result: any) => void
}>()

const emit = defineEmits<{
  close: []
}>()

const availableProfiles = ref<any[]>([])
const selectedProfileId = ref('')
const isMoving = ref(false)
const error = ref('')

watch(() => props.deck, (deck) => {
  if (deck) {
    availableProfiles.value = getAvailableTargetProfiles(deck.id)
    selectedProfileId.value = ''
    error.value = ''
  }
}, { immediate: true })

async function handleMove() {
  if (!selectedProfileId.value) {
    error.value = 'Please select a target profile'
    return
  }

  isMoving.value = true
  error.value = ''

  try {
    const result = moveDeck(props.deck.id, selectedProfileId.value)
    if (result.success) {
      if (props.onMoveComplete) {
        props.onMoveComplete(result)
      }
      emit('close')
    } else {
      error.value = result.message
    }
  } catch (err) {
    error.value = 'An unexpected error occurred while moving the deck'
    console.error('Move error:', err)
  } finally {
    isMoving.value = false
  }
}

const selectedProfile = () => selectedProfileId.value ? getProfileById(selectedProfileId.value) : null
</script>

<template>
  <div v-if="deck" class="modal-overlay" @click="emit('close')">
    <div class="modal-content" @click.stop>
      <h3>Move Deck</h3>

      <div class="move-deck-info">
        <div class="deck-details">
          <h4>{{ deck.name }}</h4>
          <p v-if="deck.description" class="deck-desc">{{ deck.description }}</p>
          <p class="current-location">
            Currently in: <strong>{{ currentProfile?.name }}</strong>
          </p>
        </div>
      </div>

      <div class="form-group">
        <label for="target-profile">Move to Profile:</label>
        <select
          id="target-profile"
          v-model="selectedProfileId"
          :disabled="isMoving"
        >
          <option value="">Select a profile...</option>
          <option v-for="profile in availableProfiles" :key="profile.id" :value="profile.id">
            {{ profile.name }} ({{ profile.decks?.length || 0 }} decks)
          </option>
        </select>
      </div>

      <div v-if="selectedProfile()" class="target-profile-info">
        <h5>Target Profile:</h5>
        <p><strong>{{ selectedProfile().name }}</strong></p>
        <p v-if="selectedProfile().description" class="profile-desc">{{ selectedProfile().description }}</p>
        <small class="profile-meta">
          {{ selectedProfile().decks?.length || 0 }} decks • Default language: {{ selectedProfile().defaultTargetLang }}
        </small>
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <div class="move-confirmation">
        <p class="warning-text">
          <AlertTriangle :size="16" style="display: inline; vertical-align: middle; margin-right: 4px;" /> This will move the deck "{{ deck.name }}" and all its flashcards to the selected profile.
        </p>
      </div>

      <div class="modal-actions">
        <button class="btn-ghost" @click="emit('close')" :disabled="isMoving">
          Cancel
        </button>
        <button
          class="btn-primary"
          @click="handleMove"
          :disabled="!selectedProfileId || isMoving || availableProfiles.length === 0"
        >
          {{ isMoving ? 'Moving...' : 'Move Deck' }}
        </button>
      </div>

      <div v-if="availableProfiles.length === 0" class="no-profiles-message">
        <p>No other profiles available to move this deck to.</p>
        <p>Create another profile first to enable deck moving.</p>
      </div>
    </div>
  </div>
</template>
