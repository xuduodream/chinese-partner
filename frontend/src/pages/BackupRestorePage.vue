<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import {
  getProfiles,
  getDecks,
  getCards,
} from '../utils/storage'
import {
  exportProfile,
  exportAll,
  importBackup,
  readUploadedFile,
  downloadFile,
  getBackupPreview,
} from '../utils/backup'

const profiles = ref<any[]>([])
const selectedProfileId = ref<string | null>(null)
const deckBreakdown = ref<{ id: string; name: string; cardCount: number }[]>([])
const message = ref<{ type: string; text: string } | null>(null)
const importing = ref(false)
const preview = ref<any>(null)
const previewData = ref<any>(null)
const showPreview = ref(false)
const dragOver = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

onMounted(() => refresh())

function refresh() {
  const allProfiles = getProfiles()
  profiles.value = allProfiles
  if (allProfiles.length > 0 && !selectedProfileId.value) {
    selectedProfileId.value = allProfiles[0].id
  }
}

watch(selectedProfileId, (pid) => {
  if (!pid) {
    deckBreakdown.value = []
    return
  }
  const decks = getDecks(pid)
  deckBreakdown.value = decks.map((deck: any) => ({
    id: deck.id,
    name: deck.name,
    cardCount: getCards(deck.id).length,
  }))
})

function handleExportProfile() {
  if (!selectedProfileId.value) {
    message.value = { type: 'error', text: 'Please select a profile first.' }
    return
  }
  try {
    const data = exportProfile(selectedProfileId.value)
    const profile = getProfiles().find((p: any) => p.id === selectedProfileId.value)
    const safeName = (profile?.name || 'profile').replace(/[^a-zA-Z0-9_-]/g, '_')
    const date = new Date().toISOString().split('T')[0]
    downloadFile(data, `MemBoost_Backup_${safeName}_${date}.json`)
    message.value = { type: 'success', text: '✅ Profile backup created!' }
  } catch (err: any) {
    message.value = { type: 'error', text: err.message }
  }
}

function handleExportAll() {
  try {
    const data = exportAll()
    const date = new Date().toISOString().split('T')[0]
    downloadFile(data, `MemBoost_FullBackup_${date}.json`)
    message.value = { type: 'success', text: '✅ Full backup created!' }
  } catch (err: any) {
    message.value = { type: 'error', text: err.message }
  }
}

async function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  await processFile(file)
  input.value = ''
}

async function handleDrop(e: DragEvent) {
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  await processFile(file)
}

async function processFile(file: File) {
  try {
    const data = await readUploadedFile(file)
    const previewInfo = getBackupPreview(data)
    if (previewInfo.error) {
      message.value = { type: 'error', text: previewInfo.error }
      return
    }
    previewData.value = data
    preview.value = previewInfo
    showPreview.value = true
  } catch (err: any) {
    message.value = { type: 'error', text: err.message }
  }
}

function handleRestore() {
  if (!previewData.value) return
  importing.value = true
  try {
    const result = importBackup(previewData.value)
    showPreview.value = false
    preview.value = null
    previewData.value = null
    const names = result.names.join(', ')
    message.value = {
      type: 'success',
      text: `✅ Restored: ${result.profilesImported} profile(s), ${result.decksImported} deck(s), ${result.cardsImported} card(s) as "${names}"`,
    }
    refresh()
  } catch (err: any) {
    message.value = { type: 'error', text: err.message }
  } finally {
    importing.value = false
  }
}

function dismissMessage() {
  message.value = null
}

const totalDecks = () => selectedProfileId.value ? getDecks(selectedProfileId.value).length : 0
const totalCards = () => deckBreakdown.value.reduce((sum, d) => sum + d.cardCount, 0)
</script>

<template>
  <div class="backup-page">
    <div class="backup-header">
      <h2>💾 Backup &amp; Restore</h2>
      <p class="backup-subtitle">Safeguard your flashcards or move them between devices.</p>
    </div>

    <!-- Transient message -->
    <div v-if="message" class="backup-message" :class="message.type" @click="dismissMessage">
      <span>{{ message.text }}</span>
      <button class="backup-message-dismiss" @click="dismissMessage">×</button>
    </div>

    <div class="backup-grid">
      <!-- Export Card -->
      <div class="backup-card">
        <div class="backup-card-header">
          <span class="backup-card-icon">📥</span>
          <h3>Export</h3>
        </div>
        <div class="backup-card-body">
          <label class="backup-label">Select profile to export:</label>
          <select class="backup-select" v-model="selectedProfileId">
            <option value="" disabled>-- Select profile --</option>
            <option v-for="p in profiles" :key="p.id" :value="p.id">
              {{ p.name }}
            </option>
          </select>

          <div v-if="selectedProfileId" class="backup-deck-list">
            <div class="backup-deck-list-header">
              <span>Decks in this profile:</span>
              <span class="backup-summary-totals">
                {{ totalDecks() }} deck(s) · {{ totalCards() }} card(s)
              </span>
            </div>
            <p v-if="deckBreakdown.length === 0" class="backup-empty-text">No decks yet.</p>
            <ul v-else>
              <li v-for="d in deckBreakdown" :key="d.id">
                <span class="backup-deck-name">{{ d.name }}</span>
                <span class="backup-deck-count">{{ d.cardCount }} card(s)</span>
              </li>
            </ul>
          </div>

          <button
            class="backup-btn backup-btn-primary"
            @click="handleExportProfile"
            :disabled="!selectedProfileId"
          >
            📥 Export Profile
          </button>

          <div class="backup-divider"><span>or</span></div>

          <button class="backup-btn backup-btn-secondary" @click="handleExportAll">
            📦 Backup All
          </button>
          <p class="backup-hint">Exports every profile, deck, and card into one file.</p>
        </div>
      </div>

      <!-- Import Card -->
      <div class="backup-card">
        <div class="backup-card-header">
          <span class="backup-card-icon">📤</span>
          <h3>Import</h3>
        </div>
        <div class="backup-card-body">
          <div
            class="backup-file-upload"
            :class="{ 'drag-over': dragOver }"
            @dragover.prevent="dragOver = true"
            @dragleave="dragOver = false"
            @drop="handleDrop"
            @click="fileInputRef?.click()"
          >
            <input
              ref="fileInputRef"
              type="file"
              accept=".json"
              @change="handleFileChange"
              style="display: none"
            />
            <div class="backup-upload-icon">📂</div>
            <p class="backup-upload-text">
              Click or drag a <strong>.json</strong> backup file here
            </p>
          </div>
          <p class="backup-hint">Supports single-profile and full backups exported from MemBoost.</p>
        </div>
      </div>
    </div>

    <!-- Import Preview Modal -->
    <div v-if="showPreview && preview" class="modal-overlay" @click="showPreview = false">
      <div class="modal-content backup-preview-modal" @click.stop>
        <h3>🔍 Preview Backup</h3>

        <div v-if="preview.type === 'profile'" class="preview-summary">
          <div class="preview-row">
            <span class="preview-label">Profile:</span>
            <span class="preview-value">{{ preview.profileName }}</span>
          </div>
          <div class="preview-row">
            <span class="preview-label">Decks:</span>
            <span class="preview-value">{{ preview.deckCount }}</span>
          </div>
          <div class="preview-row">
            <span class="preview-label">Total cards:</span>
            <span class="preview-value">{{ preview.cardCount }}</span>
          </div>
          <div class="preview-decks">
            <strong>Decks:</strong>
            <ul>
              <li v-for="(d, i) in preview.decks" :key="i">
                {{ d.name }} — {{ d.cardCount }} card(s)
              </li>
            </ul>
          </div>
        </div>

        <div v-else class="preview-summary">
          <div class="preview-row">
            <span class="preview-label">Type:</span>
            <span class="preview-value">Full Backup</span>
          </div>
          <div class="preview-row">
            <span class="preview-label">Profiles:</span>
            <span class="preview-value">{{ preview.profileCount }}</span>
          </div>
          <div class="preview-row">
            <span class="preview-label">Decks:</span>
            <span class="preview-value">{{ preview.deckCount }}</span>
          </div>
          <div class="preview-row">
            <span class="preview-label">Total cards:</span>
            <span class="preview-value">{{ preview.cardCount }}</span>
          </div>
          <div class="preview-decks">
            <strong>Profiles:</strong>
            <ul>
              <li v-for="(name, i) in preview.profileNames" :key="i">{{ name }}</li>
            </ul>
          </div>
        </div>

        <div class="backup-warning">
          ⚠️ If a profile with the same name already exists, it will be overwritten (decks and cards replaced).
        </div>

        <div class="backup-preview-actions">
          <button class="cancel-btn" @click="showPreview = false; preview = null; previewData = null">
            Cancel
          </button>
          <button class="backup-btn backup-btn-success" @click="handleRestore" :disabled="importing">
            {{ importing ? '⏳ Restoring...' : '📤 Restore' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
