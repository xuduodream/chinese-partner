<script setup lang="ts">
import { ref } from 'vue'
import { getDecks } from '../../utils/storage'

const props = defineProps<{
  card: {
    original: string
    pinyin: string
    translation: string
    context?: string
    grammar?: string
    example?: string
    targetLang?: string
  }
  currentDeck?: any
  onSave?: (card: any, deckId: string) => void
  onDeckSelect?: (deck: any) => void
}>()

const showBack = ref(false)
const saved = ref(false)
const showDeckSelector = ref(false)
const availableDecks = ref<any[]>([])

function speak(text: string, langCode: string) {
  if (!window.speechSynthesis) return
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = langCode
  const voices = window.speechSynthesis.getVoices()
  const preferredVoice = voices.find(voice => voice.lang.startsWith(langCode.split('-')[0]))
  if (preferredVoice) utterance.voice = preferredVoice
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

function handleSave() {
  if (props.currentDeck) {
    props.onSave?.(props.card, props.currentDeck.id)
    saved.value = true
    setTimeout(() => { saved.value = false }, 2000)
  } else {
    availableDecks.value = getDecks()
    showDeckSelector.value = true
  }
}

function handleSaveToDeck(deckId: string) {
  props.onSave?.(props.card, deckId)
  showDeckSelector.value = false
  saved.value = true
  setTimeout(() => { saved.value = false }, 2000)
}

function toggleBack(e: MouseEvent) {
  showBack.value = !showBack.value
}
</script>

<template>
  <div class="flashcard" @click="toggleBack">
    <div class="front">
      <h3>{{ card.original }}</h3>
      <p class="pinyin">{{ card.pinyin }}</p>
      <button
        v-if="!showBack"
        class="action-pill show-details"
        @click.stop="showBack = true"
      >
        👁️ Show Explanation
      </button>
    </div>

    <div v-if="showBack" class="back">
      <p><strong>Translation:</strong> {{ card.translation }}</p>
      <br />
      <p><strong>Context:</strong> {{ card.context }}</p>
      <br />
      <p><strong>Grammar:</strong> {{ card.grammar }}</p>
      <br />
      <p><strong>Example:</strong> {{ card.example }}</p>

      <div class="audio-buttons">
        <button class="audio-btn" @click.stop="speak(card.original, 'zh-CN')">
          🔊 Chinese
        </button>
        <button
          class="audio-btn"
          @click.stop="speak(card.translation, card.targetLang === 'fr' ? 'fr-FR' : 'en-US')"
        >
          🔊 Translation
        </button>
      </div>

      <button
        class="action-pill save"
        @click.stop="handleSave"
        :disabled="saved"
      >
        {{ saved ? '✅ Saved!' : `💾 Save to ${currentDeck ? currentDeck.name : 'Deck'}` }}
      </button>

      <!-- Deck Selection Modal -->
      <div v-if="showDeckSelector" class="modal-overlay" @click="showDeckSelector = false">
        <div class="modal-content" @click.stop>
          <h3>Save to Deck</h3>
          <p>Choose a deck to save this flashcard:</p>

          <div v-if="availableDecks.length === 0" class="no-decks-message">
            No decks available. Please create a deck first.
          </div>
          <div v-else class="deck-selection-list">
            <button
              v-for="deck in availableDecks"
              :key="deck.id"
              class="deck-selection-item"
              @click="handleSaveToDeck(deck.id)"
            >
              <span class="deck-selection-name">{{ deck.name }}</span>
              <span class="deck-selection-count">({{ deck.cardCount || 0 }} cards)</span>
            </button>
          </div>

          <div class="modal-actions">
            <button class="cancel-btn" @click="showDeckSelector = false">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
