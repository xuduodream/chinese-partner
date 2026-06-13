<script setup lang="ts">
import { ref, watch } from 'vue'
import { getProfiles, getDecks, saveCard, updateCard } from '../../utils/storage'
import { Pencil, Plus, Save, LoaderCircle } from '@lucide/vue'

const props = defineProps<{
  isOpen: boolean
  card?: any
  profileId?: string
  deckId?: string
  onSaved?: () => void
}>()

const emit = defineEmits<{
  close: []
}>()

// Form state
const original = ref('')
const pinyin = ref('')
const targetLang = ref('en')
const translation = ref('')
const context = ref('')
const grammar = ref('')
const example = ref('')
const difficulty = ref('new')

// Create-mode selectors
const selProfileId = ref(props.profileId || '')
const selDeckId = ref(props.deckId || '')
const availableDecks = ref<any[]>([])

// Validation
const error = ref('')
const saving = ref(false)

const isEditing = () => !!props.card

// Reset form when modal opens
watch(() => props.isOpen, (open) => {
  if (!open) return
  if (props.card) {
    original.value = props.card.original || ''
    pinyin.value = props.card.pinyin || ''
    targetLang.value = props.card.targetLang || 'en'
    translation.value = props.card.translation || ''
    context.value = props.card.context || ''
    grammar.value = props.card.grammar || ''
    example.value = props.card.example || ''
    difficulty.value = props.card.difficulty || 'new'
    selProfileId.value = ''
    selDeckId.value = props.deckId || ''
  } else {
    original.value = ''
    pinyin.value = ''
    targetLang.value = 'en'
    translation.value = ''
    context.value = ''
    grammar.value = ''
    example.value = ''
    difficulty.value = 'new'
    selProfileId.value = props.profileId || ''
    selDeckId.value = props.deckId || ''
  }
  error.value = ''
  saving.value = false
})

// Load decks when profile changes
watch(selProfileId, (pid) => {
  if (pid) {
    availableDecks.value = getDecks(pid)
    const stillValid = getDecks(pid).some(d => d.id === selDeckId.value)
    if (!stillValid && !props.deckId) selDeckId.value = ''
  } else {
    availableDecks.value = []
  }
})

function handleProfileSelect(e: Event) {
  const target = e.target as HTMLSelectElement
  selProfileId.value = target.value
}

async function handleSubmit(e: Event) {
  e.preventDefault()
  error.value = ''

  if (!isEditing() && !selDeckId.value) {
    error.value = 'Please select a profile and deck.'
    return
  }
  if (!original.value.trim()) {
    error.value = 'Original text (Chinese) is required.'
    return
  }
  if (!translation.value.trim()) {
    error.value = 'Translation is required.'
    return
  }

  saving.value = true
  try {
    const fields = {
      original: original.value.trim(),
      pinyin: pinyin.value.trim(),
      targetLang: targetLang.value,
      translation: translation.value.trim(),
      context: context.value.trim(),
      grammar: grammar.value.trim(),
      example: example.value.trim(),
      difficulty: difficulty.value,
    }

    if (isEditing()) {
      updateCard(props.card.id, fields)
    } else {
      saveCard(fields, selDeckId.value)
    }

    if (props.onSaved) props.onSaved()
    emit('close')
  } catch (err: any) {
    error.value = err.message || 'Failed to save card.'
  } finally {
    saving.value = false
  }
}

const allProfiles = getProfiles()
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click="emit('close')">
    <div class="modal-content card-form-modal" @click.stop>
      <h3>
        <Pencil v-if="isEditing()" :size="20" style="display: inline; vertical-align: middle; margin-right: 4px;" />
        <Plus v-else :size="20" style="display: inline; vertical-align: middle; margin-right: 4px;" />
        {{ isEditing() ? 'Edit Card' : 'New Card' }}
      </h3>

      <form @submit="handleSubmit">
        <!-- Create-mode: profile + deck selectors -->
        <template v-if="!isEditing()">
          <div class="form-group">
            <label>Profile</label>
            <select :value="selProfileId" @change="handleProfileSelect" :disabled="saving">
              <option value="">-- Select profile --</option>
              <option v-for="p in allProfiles" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>

          <div v-if="selProfileId" class="form-group">
            <label>Deck</label>
            <select v-model="selDeckId" :disabled="saving">
              <option value="">-- Select deck --</option>
              <option v-for="d in availableDecks" :key="d.id" :value="d.id">
                {{ d.name }}
              </option>
            </select>
          </div>
        </template>

        <!-- Card fields -->
        <div class="form-group">
          <label>Original (Chinese) *</label>
          <input
            type="text"
            v-model="original"
            placeholder="你好世界"
            :disabled="saving"
            autofocus
          />
        </div>

        <div class="form-group">
          <label>Pinyin</label>
          <input
            type="text"
            v-model="pinyin"
            placeholder="nǐ hǎo shì jiè"
            :disabled="saving"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Language</label>
            <select v-model="targetLang" :disabled="saving">
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </div>

          <div class="form-group">
            <label>Difficulty</label>
            <select v-model="difficulty" :disabled="saving">
              <option value="new">New</option>
              <option value="hard">Hard</option>
              <option value="good">Good</option>
              <option value="easy">Easy</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Translation *</label>
          <input
            type="text"
            v-model="translation"
            placeholder="Hello world"
            :disabled="saving"
          />
        </div>

        <div class="form-group">
          <label>Context</label>
          <textarea
            v-model="context"
            placeholder="Usage context..."
            rows="2"
            :disabled="saving"
          />
        </div>

        <div class="form-group">
          <label>Grammar</label>
          <textarea
            v-model="grammar"
            placeholder="Grammar notes..."
            rows="2"
            :disabled="saving"
          />
        </div>

        <div class="form-group">
          <label>Example</label>
          <textarea
            v-model="example"
            placeholder="Another example sentence..."
            rows="2"
            :disabled="saving"
          />
        </div>

        <div v-if="error" class="error-message">{{ error }}</div>

        <div class="modal-actions">
          <button type="button" class="btn-ghost" @click="emit('close')" :disabled="saving">
            Cancel
          </button>
          <button type="submit" class="btn-primary" :disabled="saving">
            <LoaderCircle v-if="saving" :size="16" class="spin" />
            <Save v-else :size="16" />
            {{ saving ? 'Saving...' : 'Save Card' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
