<script setup lang="ts">
import { ref, watch } from 'vue'
import { Check } from '@lucide/vue'

const props = defineProps<{
  isOpen: boolean
  currentName: string
  title?: string
  itemType?: string
  onRename: (name: string) => Promise<{ success: boolean; message?: string }>
  validateName?: (name: string) => { valid: boolean; message?: string }
}>()

const emit = defineEmits<{
  close: []
}>()

const newName = ref('')
const validation = ref<{ valid: boolean; message: string }>({ valid: true, message: '' })
const isLoading = ref(false)

// Reset form when modal opens
watch(() => props.isOpen, (open) => {
  if (open) {
    newName.value = props.currentName || ''
    validation.value = { valid: true, message: '' }
  }
})

// Debounced validation with proper cleanup
watch(newName, (_newVal, _oldVal, onCleanup) => {
  if (!props.isOpen) return
  if (newName.value === props.currentName) {
    validation.value = { valid: true, message: '' }
    return
  }
  const timeoutId = setTimeout(() => {
    if (props.validateName) {
      validation.value = props.validateName(newName.value)
    }
  }, 300)
  onCleanup(() => clearTimeout(timeoutId))
})

async function handleSubmit(e: Event) {
  e.preventDefault()
  if (!validation.value.valid) return

  isLoading.value = true
  try {
    const result = await props.onRename(newName.value.trim())
    if (result.success) {
      emit('close')
    } else {
      validation.value = { valid: false, message: result.message || 'Failed to rename' }
    }
  } catch {
    validation.value = { valid: false, message: 'An unexpected error occurred' }
  } finally {
    isLoading.value = false
  }
}

function handleOverlayClick() {
  emit('close')
}

function handleNameChange(e: Event) {
  const target = e.target as HTMLInputElement
  newName.value = target.value
}

const isValid = () =>
  validation.value.valid &&
  newName.value.trim() !== '' &&
  newName.value.trim() !== props.currentName
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content" @click.stop>
      <h3>{{ title || 'Rename' }}</h3>

      <form @submit="handleSubmit">
        <div class="form-group">
          <label :for="`rename-input-${itemType}`">{{ itemType || 'Item' }} Name:</label>
          <input
            :id="`rename-input-${itemType}`"
            type="text"
            :value="newName"
            @input="handleNameChange"
            :placeholder="`Enter new ${(itemType || 'Item').toLowerCase()} name`"
            autofocus
            :disabled="isLoading"
          />

          <div v-if="newName.trim() === currentName && newName.trim() !== ''" class="info-message">
            Name is the same as current
          </div>

          <div v-if="!validation.valid" class="error-message">
            {{ validation.message }}
          </div>

          <div v-if="validation.valid && newName.trim() !== '' && newName.trim() !== currentName" class="success-message">
            <Check :size="14" style="display: inline; vertical-align: middle; margin-right: 2px;" /> Name is available
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-ghost" @click="emit('close')" :disabled="isLoading">
            Cancel
          </button>
          <button type="submit" class="btn-primary" :disabled="!isValid() || isLoading">
            {{ isLoading ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
