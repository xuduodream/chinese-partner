<script setup lang="ts">
import { ref } from 'vue'
import ImageUpload from '../components/shared/ImageUpload.vue'
import { useAppStore } from '../stores/app'
import { useSavedStore } from '../stores/saved'
import { getProfiles, getDecks, getCards } from '../utils/storage'
import { getDeckById } from '../utils/storage'
import { saveCard } from '../utils/storage'

const appStore = useAppStore()
const savedStore = useSavedStore()

const results = ref<any[]>([])

function handleResults(sentences: any[]) {
  results.value = sentences
  savedStore.reset()
}

function speak(text: string, langCode: string) {
  if (!window.speechSynthesis) return
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = langCode
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

function toggleDetails(e: Event) {
  const btn = e.currentTarget as HTMLElement
  const row = btn.closest('tr') as HTMLTableRowElement
  const explanationRow = row?.nextElementSibling as HTMLTableRowElement
  if (explanationRow) {
    explanationRow.style.display = explanationRow.style.display === 'none' ? 'table-row' : 'none'
  }
}

function handleSaveCardWithFeedback(sentence: any, idx: number) {
  appStore.openDeckSelector(sentence)
}

function handleSaveToDeck(deckId: string) {
  const card = appStore.pendingCard
  if (!card) return

  const targetDeck = getDeckById(deckId)
  if (!targetDeck) return

  const savedCard = saveCard(
    {
      original: card.original,
      pinyin: card.pinyin,
      targetLang: appStore.targetLang,
      translation: card.translation,
      context: card.context,
      grammar: card.grammar,
      example: card.example,
    },
    deckId,
  )

  savedStore.markSaved(results.value.indexOf(card))
  appStore.closeDeckSelector()
}

function handleProfileSelect(profileId: string) {
  appStore.selectedProfileId = profileId
  appStore.step = 'deck'
}

function handleStepBack() {
  appStore.step = 'profile'
}
</script>

<template>
  <div class="import-page">
    <!-- Language Selector -->
    <div class="lang-selector">
      <select v-model="appStore.targetLang">
        <option value="en">English</option>
        <option value="fr">Français</option>
      </select>
    </div>

    <ImageUpload :onResults="handleResults" :targetLang="appStore.targetLang" />

    <!-- Results Table -->
    <div v-if="results.length > 0" class="results">
      <h2>Extracted Sentences</h2>
      <div class="flashcards-table-container">
        <table class="flashcards-table">
          <thead>
            <tr>
              <th>Chinese</th>
              <th>Pinyin</th>
              <th>Translation</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="(sentence, idx) in results" :key="idx">
              <tr>
                <td class="chinese-text">{{ sentence.original }}</td>
                <td class="pinyin-text">{{ sentence.pinyin }}</td>
                <td class="translation-text">{{ sentence.translation }}</td>
                <td class="actions-cell">
                  <div class="flashcard-actions">
                    <button class="action-pill" @click="speak(sentence.original, 'zh-CN')" title="Listen to Chinese">
                      🔊 Chinese
                    </button>
                    <button
                      class="action-pill"
                      @click="speak(sentence.translation, appStore.targetLang === 'fr' ? 'fr-FR' : 'en-US')"
                      title="Listen to Translation"
                    >
                      🔊 Translation
                    </button>
                    <button class="action-pill show-details" @click="toggleDetails">
                      💡 Details
                    </button>
                    <button
                      v-if="savedStore.isSaved(idx)"
                      class="action-pill save"
                      disabled
                    >
                      ✅ Saved
                    </button>
                    <button
                      v-else
                      class="action-pill save"
                      @click="handleSaveCardWithFeedback(sentence, idx)"
                    >
                      💾 Save
                    </button>
                  </div>
                </td>
              </tr>
              <tr class="explanation-row" style="display: none">
                <td colspan="4" class="explanation-expanded">
                  <div class="explanation-content">
                    <div class="explanation-details">
                      <div><strong>Context:</strong> {{ sentence.context }}</div>
                      <div><strong>Grammar:</strong> {{ sentence.grammar }}</div>
                      <div><strong>Example:</strong> {{ sentence.example }}</div>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Save to Deck Modal -->
    <div v-if="appStore.showDeckSelector" class="modal-overlay" @click="appStore.closeDeckSelector()">
      <div class="modal-content" @click.stop>
        <h3>Save to Deck</h3>

        <template v-if="appStore.step === 'profile'">
          <p>Select a profile:</p>
          <div class="deck-selection-list">
            <button
              v-for="profile in getProfiles()"
              :key="profile.id"
              class="deck-selection-item"
              @click="handleProfileSelect(profile.id)"
            >
              <span class="deck-selection-name">{{ profile.name }}</span>
            </button>
          </div>
        </template>

        <template v-else>
          <p>Choose a deck in profile "{{ getProfiles().find((p: any) => p.id === appStore.selectedProfileId)?.name }}":</p>
          <button class="back-btn" @click="handleStepBack">← Back to profiles</button>
          <div v-if="appStore.availableDecks.length === 0" class="no-decks-message">
            No decks available. Please create a deck first.
          </div>
          <div v-else class="deck-selection-list">
            <button
              v-for="deck in appStore.availableDecks"
              :key="deck.id"
              class="deck-selection-item"
              @click="handleSaveToDeck(deck.id)"
            >
              <span class="deck-selection-name">{{ deck.name }}</span>
              <span class="deck-selection-count">({{ getCards(deck.id).length }} cards)</span>
            </button>
          </div>
        </template>

        <div class="modal-actions">
          <button class="cancel-btn" @click="appStore.closeDeckSelector()">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>
