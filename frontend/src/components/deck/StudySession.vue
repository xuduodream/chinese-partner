<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  getStudyQueue,
  getCardsDueForReview,
  updateCardDifficulty,
  updateDeckLastStudied,
} from '../../utils/storage'
import ProgressBar from '../shared/ProgressBar.vue'

const props = defineProps<{
  deck: any
  onComplete: () => void
}>()

const cards = ref<any[]>([])
const currentIndex = ref(0)
const showAnswer = ref(false)
const completed = ref(false)
const dueCount = ref(0)
const newCount = ref(0)
const sessionStats = ref({
  total: 0,
  studied: 0,
  again: 0,
  hard: 0,
  good: 0,
  easy: 0,
})
const lastRating = ref<{
  rating: string
  nextReview: string
  interval: number
  easeFactor: number
  state: string
  lapseCount: number
} | null>(null)

const currentCard = computed(() => cards.value[currentIndex.value])
const remaining = computed(() => cards.value.length - currentIndex.value)
const studiedSoFar = computed(() => sessionStats.value.studied)

// Load study queue
watch(() => props.deck?.id, (id) => {
  if (!id) return
  const { queue, due, newCards } = getStudyQueue(id, 20)
  cards.value = queue
  dueCount.value = due.length
  newCount.value = newCards.length
  sessionStats.value = { ...sessionStats.value, total: queue.length }
  currentIndex.value = 0
  showAnswer.value = false
  completed.value = false
  lastRating.value = null
}, { immediate: true })

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

function handleRating(rating: string) {
  if (completed.value || !currentCard.value) return

  const result = updateCardDifficulty(currentCard.value.id, rating)

  if (result.success) {
    lastRating.value = {
      rating,
      nextReview: result.nextReview,
      interval: result.interval,
      easeFactor: result.easeFactor,
      state: result.state,
      lapseCount: result.lapseCount,
    }
  }

  sessionStats.value = {
    ...sessionStats.value,
    studied: sessionStats.value.studied + 1,
    [rating]: (sessionStats.value[rating as keyof typeof sessionStats.value] as number) + 1,
  }

  if (currentIndex.value < cards.value.length - 1) {
    currentIndex.value++
    showAnswer.value = false
  } else {
    const freshDue = getCardsDueForReview(props.deck.id)
    if (freshDue.length > 0) {
      cards.value = freshDue
      currentIndex.value = 0
      showAnswer.value = false
      lastRating.value = null
      sessionStats.value = { ...sessionStats.value, total: sessionStats.value.total + freshDue.length }
      return
    }
    completed.value = true
    updateDeckLastStudied(props.deck.id)
  }
}

// Keyboard shortcuts
function handleKeyPress(event: KeyboardEvent) {
  switch (event.key) {
    case '1':
    case 'a':
      handleRating('again')
      break
    case '2':
    case 'h':
      handleRating('hard')
      break
    case '3':
    case 'g':
      handleRating('good')
      break
    case '4':
    case 'e':
      handleRating('easy')
      break
    case ' ':
      event.preventDefault()
      showAnswer.value = true
      break
  }
}

onMounted(() => window.addEventListener('keydown', handleKeyPress))
onUnmounted(() => window.removeEventListener('keydown', handleKeyPress))

function formatNextReviewLabel(nextReviewIso: string): string {
  if (!nextReviewIso) return 'not scheduled'
  const now = new Date()
  const next = new Date(nextReviewIso)
  const diffMs = next.getTime() - now.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  if (diffMs <= 0) return 'due now'
  if (diffDays === 0) return 'later today'
  if (diffDays === 1) return 'tomorrow'
  if (diffDays < 30) return `in ${diffDays} days`
  return `on ${next.toLocaleDateString()}`
}

// Completion screen stats
const completionAccuracy = computed(() => {
  const total = sessionStats.value.studied || 1
  const correct = sessionStats.value.good + sessionStats.value.easy
  return Math.round((correct / total) * 100)
})
</script>

<template>
  <div class="study-session">
    <!-- Completion Screen -->
    <template v-if="completed">
      <div class="study-header">
        <h2>Study Complete: {{ deck.name }}</h2>
        <button @click="onComplete" class="exit-btn">Exit</button>
      </div>
      <div class="completion-summary">
        <h3>🎉 Session Complete!</h3>
        <div class="completion-stats">
          <div class="completion-stat">
            <span class="completion-stat-value">{{ sessionStats.studied }}</span>
            <span class="completion-stat-label">Studied</span>
          </div>
          <div class="completion-stat">
            <span class="completion-stat-value">{{ sessionStats.good + sessionStats.easy }}</span>
            <span class="completion-stat-label">Correct</span>
          </div>
          <div class="completion-stat">
            <span class="completion-stat-value">{{ completionAccuracy }}%</span>
            <span class="completion-stat-label">Accuracy</span>
          </div>
        </div>
        <div class="completion-breakdown">
          <span class="breakdown-item breakdown-again">🔴 {{ sessionStats.again }} Again</span>
          <span class="breakdown-item breakdown-hard">🟠 {{ sessionStats.hard }} Hard</span>
          <span class="breakdown-item breakdown-good">🟢 {{ sessionStats.good }} Good</span>
          <span class="breakdown-item breakdown-easy">🔵 {{ sessionStats.easy }} Easy</span>
        </div>
      </div>
    </template>

    <!-- All Caught Up -->
    <template v-else-if="!currentCard">
      <div class="study-header">
        <h2>{{ deck.name }}</h2>
        <button @click="onComplete" class="exit-btn">Exit</button>
      </div>
      <div class="completion-summary">
        <h3>✅ All caught up!</h3>
        <p>No cards due for review. Come back later!</p>
        <div class="completion-stats">
          <div class="completion-stat">
            <span class="completion-stat-value">{{ dueCount }}</span>
            <span class="completion-stat-label">Due Now</span>
          </div>
          <div class="completion-stat">
            <span class="completion-stat-value">{{ newCount }}</span>
            <span class="completion-stat-label">New Cards</span>
          </div>
        </div>
      </div>
    </template>

    <!-- Active Study -->
    <template v-else>
      <div class="study-header">
        <h2>{{ deck.name }}</h2>
        <div class="study-progress-info">
          <span class="progress-text">
            {{ remaining }} remaining
            <template v-if="dueCount > 0"> · {{ dueCount }} due</template>
            <template v-if="newCount > 0 && currentCard?.state === 'learning'"> · {{ newCount }} new</template>
          </span>
          <span v-if="currentCard?.state === 'learning'" class="state-badge learning-badge">🔵 Learning</span>
          <span v-else-if="currentCard?.state === 'relearning'" class="state-badge relearning-badge">🔄 Relearning</span>
          <span v-else-if="currentCard?.state === 'review'" class="state-badge review-badge">✅ Review</span>
        </div>
        <button @click="onComplete" class="exit-btn">Exit Study</button>
      </div>

      <!-- Rating feedback banner -->
      <div v-if="lastRating" class="rating-feedback" :class="lastRating.rating">
        <span class="rating-feedback-text">
          <template v-if="lastRating.rating === 'again'">🔴 Again</template>
          <template v-else-if="lastRating.rating === 'hard'">🟠 Hard</template>
          <template v-else-if="lastRating.rating === 'good'">🟢 Good</template>
          <template v-else-if="lastRating.rating === 'easy'">🔵 Easy</template>
          ·
          <template v-if="(lastRating.rating === 'good' || lastRating.rating === 'easy') && lastRating.state === 'review'">Graduated! → Review</template>
          <template v-else-if="lastRating.rating === 'again' && lastRating.state === 'relearning'">Lapsed → Relearning</template>
          <template v-else-if="lastRating.rating === 'again'">repeats this step</template>
          <template v-else-if="lastRating.rating === 'hard'">1.5× current step delay</template>
          <template v-else>{{ formatNextReviewLabel(lastRating.nextReview) }}</template>
        </span>
        <span class="rating-feedback-ease">
          Ease: {{ lastRating.easeFactor?.toFixed(2) }}
          <span v-if="lastRating.lapseCount > 0" class="lapse-count"> · {{ lastRating.lapseCount }} lapses</span>
        </span>
      </div>

      <div class="study-card" @click="showAnswer || (showAnswer = true)">
        <div class="card-content">
          <h3>{{ currentCard.original }}</h3>
          <p class="pinyin">{{ currentCard.pinyin }}</p>

          <div v-if="!showAnswer" class="click-hint">
            <button class="show-answer-btn">Click to show answer</button>
          </div>

          <div v-if="showAnswer" class="answer-section">
            <div class="answer-content">
              <p><strong>Translation:</strong> {{ currentCard.translation }}</p>
              <br />
              <p><strong>Context:</strong> {{ currentCard.context }}</p>
              <br />
              <p><strong>Grammar:</strong> {{ currentCard.grammar }}</p>
              <br />
              <p><strong>Example:</strong> {{ currentCard.example }}</p>
            </div>

            <div class="audio-section">
              <button class="audio-btn" @click.stop="speak(currentCard.original, 'zh-CN')">
                🔊 Listen Chinese
              </button>
              <button
                class="audio-btn"
                @click.stop="speak(currentCard.translation, currentCard.targetLang === 'fr' ? 'fr-FR' : 'en-US')"
              >
                🔊 Listen Translation
              </button>
            </div>
          </div>

          <!-- Rating buttons (always visible) -->
          <div class="rating-section" @click.stop>
            <h4>How well did you know this?</h4>
            <div class="rating-buttons">
              <button class="rate-btn again" @click="handleRating('again')" title="1 or A - Again">
                🔴 Again
              </button>
              <button class="rate-btn hard" @click="handleRating('hard')" title="2 or H - Hard">
                🟠 Hard
              </button>
              <button class="rate-btn good" @click="handleRating('good')" title="3 or G - Good">
                🟢 Good
              </button>
              <button class="rate-btn easy" @click="handleRating('easy')" title="4 or E - Easy">
                🔵 Easy
              </button>
            </div>
            <div class="keyboard-hint">
              <small>Keyboard: 1=Again, 2=Hard, 3=Good, 4=Easy, Space=Show Answer</small>
            </div>

            <details class="sm2-explainer">
              <summary>ℹ️ How ratings work (Anki)</summary>
              <table class="sm2-table">
                <thead>
                  <tr>
                    <th>Rating</th>
                    <th>Learning (new card)</th>
                    <th>Review (graduated)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>🔴 Again</td>
                    <td>Restart at step 1. Ease −0.20</td>
                    <td>Lapses → relearning. Interval × 0.5. Ease −0.20</td>
                  </tr>
                  <tr>
                    <td>🟠 Hard</td>
                    <td>1.5× current step delay. Ease −0.15</td>
                    <td>Interval × 1.2. Ease −0.15</td>
                  </tr>
                  <tr>
                    <td>🟢 Good</td>
                    <td>Advance to next step. Last step → graduates (1d). Ease +0.15</td>
                    <td>Interval × ease. Ease +0.15</td>
                  </tr>
                  <tr>
                    <td>🔵 Easy</td>
                    <td>Skip all steps → graduates (4d). Ease +0.30</td>
                    <td>Interval × ease × 1.3. Ease +0.30</td>
                  </tr>
                </tbody>
              </table>
              <p class="sm2-footnote">🔄 Relearning cards (lapsed) follow the same steps as Learning but with their own step timings.</p>
            </details>
          </div>
        </div>
      </div>

      <ProgressBar :current="studiedSoFar" :total="cards.length" />
    </template>
  </div>
</template>
