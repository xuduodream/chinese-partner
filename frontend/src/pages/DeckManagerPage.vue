<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  getProfiles,
  getDecks,
  getCards,
  deleteProfile,
  deleteDeck,
  deleteCard,
  renameProfile,
  renameDeck,
  validateProfileName,
  validateDeckName,
} from '../utils/storage'
import RenameModal from '../components/modal/RenameModal.vue'
import CardFormModal from '../components/card/CardFormModal.vue'
import {
  FolderTree,
  Trash2,
  Pencil,
  Plus,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Calendar,
} from '@lucide/vue'

const PREFIX_PROFILE = 'p:'
const PREFIX_DECK = 'd:'
const PREFIX_CARD = 'c:'

const profiles = ref<any[]>([])
const decks = ref<any[]>([])
const cards = ref<any[]>([])
const expandedProfiles = ref(new Set<string>())
const expandedDecks = ref(new Set<string>())
const selected = ref(new Set<string>())
const renameState = ref<{ show: boolean; type: string; id: string; name: string; profileId: string }>({
  show: false, type: '', id: '', name: '', profileId: '',
})
const cardForm = ref<{ show: boolean; card: any; deckId: string | null }>({
  show: false, card: null, deckId: null,
})

onMounted(() => loadData())

function loadData() {
  profiles.value = getProfiles()
  decks.value = getDecks()
  cards.value = getCards()
}

function toggleProfile(id: string) {
  const next = new Set(expandedProfiles.value)
  next.has(id) ? next.delete(id) : next.add(id)
  expandedProfiles.value = next
}

function toggleDeck(id: string) {
  const next = new Set(expandedDecks.value)
  next.has(id) ? next.delete(id) : next.add(id)
  expandedDecks.value = next
}

function toggleSelect(prefixedId: string) {
  const next = new Set(selected.value)
  next.has(prefixedId) ? next.delete(prefixedId) : next.add(prefixedId)
  selected.value = next
}

function handleDelete(type: string, id: string) {
  const label = { profile: 'profile', deck: 'deck', card: 'card' }[type]
  if (!window.confirm(`Delete this ${label} and all its contents?`)) return
  if (type === 'profile') deleteProfile(id)
  else if (type === 'deck') deleteDeck(id)
  else if (type === 'card') deleteCard(id)
  loadData()
}

function handleBatchDelete() {
  if (selected.value.size === 0) return
  if (!window.confirm(`Delete ${selected.value.size} selected item(s)?`)) return
  selected.value.forEach((prefixed) => {
    if (prefixed.startsWith(PREFIX_PROFILE)) deleteProfile(prefixed.slice(2))
    else if (prefixed.startsWith(PREFIX_DECK)) deleteDeck(prefixed.slice(2))
    else if (prefixed.startsWith(PREFIX_CARD)) deleteCard(prefixed.slice(2))
  })
  selected.value = new Set()
  loadData()
}

function selectAllVisible() {
  const visible = visiblePrefixed()
  if (visible.every((id) => selected.value.has(id))) {
    selected.value = new Set()
  } else {
    selected.value = new Set(visible)
  }
}

function visiblePrefixed(): string[] {
  const result: string[] = []
  for (const p of profiles.value) {
    result.push(`${PREFIX_PROFILE}${p.id}`)
    if (expandedProfiles.value.has(p.id)) {
      const profileDecks = decks.value.filter((d) => d.profileId === p.id)
      for (const d of profileDecks) {
        result.push(`${PREFIX_DECK}${d.id}`)
        if (expandedDecks.value.has(d.id)) {
          const deckCards = cards.value.filter((c) => c.deckId === d.id)
          deckCards.forEach((c) => result.push(`${PREFIX_CARD}${c.id}`))
        }
      }
    }
  }
  return result
}

function formatNextReview(card: any): { text: string; urgent: boolean } | null {
  if (!card.nextReview) return null
  const now = new Date()
  const next = new Date(card.nextReview)
  const diffMs = next.getTime() - now.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  if (diffMs <= 0) return { text: 'due', urgent: true }
  if (diffDays === 0) return { text: 'due today', urgent: true }
  if (diffDays === 1) return { text: 'tomorrow', urgent: false }
  if (diffDays < 30) return { text: `${diffDays}d`, urgent: false }
  return { text: next.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), urgent: false }
}
</script>

<template>
  <div class="manager-page">
    <div class="manager-header">
      <h2><FolderTree :size="24" style="display: inline; vertical-align: middle; margin-right: 4px;" /> Deck Manager</h2>
      <p class="manager-subtitle">Browse, rename, edit, and delete all your profiles, decks, and cards.</p>
    </div>

    <!-- Toolbar -->
    <div class="manager-toolbar">
      <label class="manager-select-all">
        <input
          type="checkbox"
          :checked="visiblePrefixed().length > 0 && visiblePrefixed().every((id) => selected.has(id))"
          @change="selectAllVisible"
        />
        <span>Select all visible</span>
      </label>
      <div class="manager-toolbar-right">
        <span v-if="selected.size > 0" class="manager-selected-count">{{ selected.size }} selected</span>
        <button
          class="manager-batch-delete"
          :class="{ hidden: selected.size === 0 }"
          @click="handleBatchDelete"
          :disabled="selected.size === 0"
        >
          <Trash2 :size="14" style="vertical-align: middle; margin-right: 4px;" /> Delete ({{ selected.size }})
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="manager-table-container">
      <div v-if="profiles.length === 0" class="manager-empty">
        <p>No profiles yet. Create one from the Review page to get started.</p>
      </div>

      <table v-else class="manager-table">
        <thead>
          <tr>
            <th class="checkbox-col"></th>
            <th class="entity-col">Name / Content</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="p in profiles" :key="p.id">
            <!-- Profile row -->
            <tr class="depth-0">
              <td class="checkbox-col">
                <input
                  type="checkbox"
                  :checked="selected.has(PREFIX_PROFILE + p.id)"
                  @change="toggleSelect(PREFIX_PROFILE + p.id)"
                />
              </td>
              <td class="entity-col">
                <div class="entity-row">
                  <button class="toggle-icon" @click="toggleProfile(p.id)">
                    <ChevronDown v-if="expandedProfiles.has(p.id)" :size="16" />
                    <ChevronRight v-else :size="16" />
                  </button>
                  <span class="entity-name">{{ p.name }}</span>
                  <span class="entity-meta">
                    {{ decks.filter(d => d.profileId === p.id).length }} deck(s) ·
                    {{ cards.filter(c => decks.filter(d => d.profileId === p.id).some(d => d.id === c.deckId)).length }} card(s)
                  </span>
                  <span class="entity-date">{{ new Date(p.createdAt).toLocaleDateString() }}</span>
                  <span class="actions-col">
                    <button class="action-icon-btn" title="Rename" @click="renameState = { show: true, type: 'profile', id: p.id, name: p.name, profileId: '' }">
                      <Pencil :size="16" />
                    </button>
                    <button class="action-icon-btn danger" title="Delete" @click="handleDelete('profile', p.id)">
                      <Trash2 :size="16" />
                    </button>
                  </span>
                </div>
              </td>
            </tr>

            <!-- Decks under this profile -->
            <template v-if="expandedProfiles.has(p.id)">
              <template v-for="d in decks.filter(d => d.profileId === p.id)" :key="d.id">
                <tr class="depth-1">
                  <td class="checkbox-col">
                    <input
                      type="checkbox"
                      :checked="selected.has(PREFIX_DECK + d.id)"
                      @change="toggleSelect(PREFIX_DECK + d.id)"
                    />
                  </td>
                  <td class="entity-col">
                    <div class="entity-row">
                      <button class="toggle-icon" @click="toggleDeck(d.id)">
                        <ChevronDown v-if="expandedDecks.has(d.id)" :size="16" />
                        <ChevronRight v-else :size="16" />
                      </button>
                      <span class="entity-name">{{ d.name }}</span>
                      <span class="entity-meta">{{ cards.filter(c => c.deckId === d.id).length }} card(s)</span>
                      <span class="entity-date">{{ new Date(d.createdAt).toLocaleDateString() }}</span>
                      <span class="actions-col">
                        <button class="action-icon-btn" title="Rename" @click="renameState = { show: true, type: 'deck', id: d.id, name: d.name, profileId: d.profileId }">
                          <Pencil :size="16" />
                        </button>
                        <button class="action-icon-btn" title="Add card" @click="cardForm = { show: true, card: null, deckId: d.id }">
                          <Plus :size="16" />
                        </button>
                        <button class="action-icon-btn danger" title="Delete" @click="handleDelete('deck', d.id)">
                          <Trash2 :size="16" />
                        </button>
                      </span>
                    </div>
                  </td>
                </tr>

                <!-- Cards under this deck -->
                <template v-if="expandedDecks.has(d.id)">
                  <tr v-for="c in cards.filter(c => c.deckId === d.id)" :key="c.id" class="depth-2">
                    <td class="checkbox-col">
                      <input
                        type="checkbox"
                        :checked="selected.has(PREFIX_CARD + c.id)"
                        @change="toggleSelect(PREFIX_CARD + c.id)"
                      />
                    </td>
                    <td class="entity-col">
                      <div class="entity-row">
                        <span class="entity-card-text">
                          <span class="card-original">{{ c.original }}</span>
                          <span class="card-pinyin">{{ c.pinyin }}</span>
                          <span class="card-translation">{{ c.translation }}</span>
                        </span>
                        <span class="difficulty-badge" :class="`difficulty-${c.difficulty || 'new'}`">
                          {{ c.difficulty || 'new' }}
                        </span>
                        <span v-if="formatNextReview(c)" class="next-review-badge" :class="{ due: formatNextReview(c)?.urgent }">
                          <AlertCircle v-if="formatNextReview(c)?.urgent" :size="14" style="vertical-align: middle; margin-right: 2px;" />
                          <Calendar v-else :size="14" style="vertical-align: middle; margin-right: 2px;" />
                          {{ formatNextReview(c)?.text }}
                        </span>
                        <span class="actions-col">
                          <button class="action-icon-btn" title="Edit" @click="cardForm = { show: true, card: c, deckId: c.deckId }">
                            <Pencil :size="16" />
                          </button>
                          <button class="action-icon-btn danger" title="Delete" @click="handleDelete('card', c.id)">
                            <Trash2 :size="16" />
                          </button>
                        </span>
                      </div>
                    </td>
                  </tr>
                </template>
              </template>
            </template>
          </template>
        </tbody>
      </table>
    </div>

    <!-- Rename Modal -->
    <RenameModal
      v-if="renameState.show"
      :isOpen="renameState.show"
      @close="renameState.show = false; loadData()"
      :currentName="renameState.name"
      :title="renameState.type === 'profile' ? 'Rename Profile' : 'Rename Deck'"
      :itemType="renameState.type === 'profile' ? 'Profile' : 'Deck'"
      :onRename="async (newName: string) => {
        if (renameState.type === 'profile') return renameProfile(renameState.id, newName)
        return renameDeck(renameState.id, newName)
      }"
      :validateName="(name: string) => {
        if (renameState.type === 'profile') return validateProfileName(name, renameState.id)
        return validateDeckName(name, renameState.profileId || undefined, renameState.id)
      }"
    />

    <!-- Card Form Modal -->
    <CardFormModal
      :isOpen="cardForm.show"
      @close="cardForm.show = false; loadData()"
      :card="cardForm.card"
      :deckId="cardForm.deckId || undefined"
      :onSaved="loadData"
    />
  </div>
</template>
