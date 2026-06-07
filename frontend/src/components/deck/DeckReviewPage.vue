<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  getCards,
  deleteCard,
  moveCard,
  getAvailableTargetDecks,
} from '../../utils/storage'

const props = defineProps<{
  deck: any
  onBack: () => void
}>()

const cards = ref<any[]>([])
const selectedCard = ref<any>(null)
const showMoveModal = ref(false)
const cardToMove = ref<any>(null)
const availableDecks = ref<any[]>([])
const selectedTargetDeck = ref('')

watch(() => props.deck, (deck) => {
  if (deck) loadCards()
}, { immediate: false })

function loadCards() {
  if (!props.deck) return
  cards.value = getCards(props.deck.id)
}

function speak(text: string, langCode: string) {
  if (!window.speechSynthesis) return
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = langCode
  const voices = window.speechSynthesis.getVoices()
  const preferredVoice = voices.find(v => v.lang.startsWith(langCode.split('-')[0]))
  if (preferredVoice) utterance.voice = preferredVoice
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

function handleDelete(id: string) {
  deleteCard(id)
  loadCards()
  selectedCard.value = null
}

function handleMoveCard(card: any) {
  cardToMove.value = card
  availableDecks.value = getAvailableTargetDecks(card.id)
  showMoveModal.value = true
}

function handleMoveToDeck(targetDeckId: string) {
  if (!cardToMove.value) return
  const result = moveCard(cardToMove.value.id, targetDeckId)
  if (result.success) {
    showMoveModal.value = false
    cardToMove.value = null
    selectedTargetDeck.value = ''
    loadCards()
    selectedCard.value = null
  } else {
    alert(result.message)
  }
}

function toggleCard(card: any) {
  selectedCard.value = selectedCard.value?.id === card.id ? null : card
}
</script>

<template>
  <div class="deck-review-page">
    <div class="deck-review-header">
      <button class="back-btn" @click="props.onBack">
        ← Back to Decks
      </button>
      <h2>{{ deck.name }}</h2>
      <div class="deck-info">
        <span>{{ cards.length }} cards</span>
        <span v-if="deck.description"> • {{ deck.description }}</span>
      </div>
    </div>

    <div class="deck-cards-list">
      <div v-if="cards.length === 0" class="empty-deck">
        <p>No flashcards in this deck yet.</p>
        <p>Import some images to add cards to this deck!</p>
      </div>

      <div v-else class="card-grid">
        <div v-for="card in cards" :key="card.id" class="review-card">
          <div class="review-front">
            <h3>{{ card.original }}</h3>
            <p class="pinyin">{{ card.pinyin }}</p>
            <button class="action-pill show-details" @click="toggleCard(card)">
              {{ selectedCard?.id === card.id ? '👁️ Hide' : '👁️ Show Explanation' }}
            </button>
          </div>

          <div v-if="selectedCard?.id === card.id" class="review-back">
            <p><strong>Translation:</strong> {{ card.translation }}</p>
            <br />
            <p><strong>Context:</strong> {{ card.context }}</p>
            <br />
            <p><strong>Grammar:</strong> {{ card.grammar }}</p>
            <br />
            <p><strong>Example:</strong> {{ card.example }}</p>

            <div class="card-bottom-actions">
              <div class="audio-section">
                <button class="audio-btn" @click.stop="speak(card.original, 'zh-CN')" title="Listen to Chinese">
                  🔊 Chinese
                </button>
                <button
                  class="audio-btn"
                  @click.stop="speak(card.translation, card.targetLang === 'fr' ? 'fr-FR' : 'en-US')"
                  title="Listen to Translation"
                >
                  🔊 Translation
                </button>
              </div>
              <div class="actions-col">
                <button class="action-pill" @click.stop="handleMoveCard(card)" title="Move to another deck">
                  📁 Move
                </button>
                <button class="action-pill danger" @click.stop="handleDelete(card.id)" title="Delete card">
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Move Card Modal -->
    <div v-if="showMoveModal && cardToMove" class="modal-overlay" @click="showMoveModal = false">
      <div class="modal-content" @click.stop>
        <h3>Move Card to Another Deck</h3>
        <p>Choose a deck to move this card to:</p>

        <div v-if="availableDecks.length === 0" class="no-decks-message">
          No other decks available in this profile.
        </div>
        <div v-else class="move-card-form">
          <div class="form-group">
            <label for="target-deck">Select Target Deck:</label>
            <select id="target-deck" v-model="selectedTargetDeck">
              <option value="">Select a deck...</option>
              <option v-for="d in availableDecks" :key="d.id" :value="d.id">
                {{ d.name }} ({{ d.cardCount || 0 }} cards)
              </option>
            </select>
          </div>

          <div class="modal-actions">
            <button class="cancel-btn" @click="showMoveModal = false; selectedTargetDeck = ''">
              Cancel
            </button>
            <button
              class="save-btn"
              @click="selectedTargetDeck && handleMoveToDeck(selectedTargetDeck)"
              :disabled="!selectedTargetDeck"
            >
              Move Card
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
