<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  getProfiles,
  createProfile,
  getProfileById,
  deleteProfile,
  getDecks,
  renameProfile,
  validateProfileName,
} from '../../utils/storage'
import RenameModal from '../modal/RenameModal.vue'
import { Pencil, Trash2 } from '@lucide/vue'

const props = defineProps<{
  currentProfile: any
  onProfileChange: (profile: any) => void
  onCreateProfile?: (profile: any) => void
}>()

const profiles = ref<any[]>([])
const showCreateModal = ref(false)
const newProfileName = ref('')
const newProfileDescription = ref('')
const newProfileLang = ref('en')
const showRenameModal = ref(false)

onMounted(() => {
  loadProfiles()
})

function loadProfiles() {
  const profileList = getProfiles()
  profiles.value = profileList

  if (!props.currentProfile && profileList.length > 0) {
    props.onProfileChange(profileList[0])
  }
}

function handleDeleteProfile() {
  if (!props.currentProfile) return
  const profileDecks = getDecks(props.currentProfile.id)
  if (profileDecks.length > 0) {
    alert('Cannot delete profile that contains decks. Please delete all decks first.')
    return
  }
  if (window.confirm(`Are you sure you want to delete the profile "${props.currentProfile.name}"?`)) {
    deleteProfile(props.currentProfile.id)
    loadProfiles()
    const remainingProfiles = getProfiles()
    props.onProfileChange(remainingProfiles.length > 0 ? remainingProfiles[0] : null)
  }
}

function handleCreateProfile() {
  if (!newProfileName.value.trim()) return
  const profile = createProfile(
    newProfileName.value.trim(),
    newProfileDescription.value.trim(),
    newProfileLang.value,
  )
  newProfileName.value = ''
  newProfileDescription.value = ''
  newProfileLang.value = 'en'
  showCreateModal.value = false
  loadProfiles()
  props.onProfileChange(profile)
  props.onCreateProfile?.(profile)
}

function handleProfileSelect(e: Event) {
  const id = (e.target as HTMLSelectElement).value
  const profile = getProfileById(id)
  if (profile) props.onProfileChange(profile)
}
</script>

<template>
  <div class="profile-manager">
    <div class="profile-selector">
      <label for="profile-select">Study Profile:</label>
      <select
        id="profile-select"
        :value="currentProfile?.id || ''"
        @change="handleProfileSelect"
      >
        <option value="">Select a profile...</option>
        <option v-for="profile in profiles" :key="profile.id" :value="profile.id">
          {{ profile.name }} ({{ getDecks(profile.id).length }} decks)
        </option>
      </select>

      <button class="create-profile-btn" @click="showCreateModal = true">
        + New Profile
      </button>

      <button
        v-if="currentProfile"
        class="rename-profile-btn"
        @click="showRenameModal = true"
        title="Rename profile"
      >
        <Pencil :size="14" style="vertical-align: middle; margin-right: 4px;" /> Rename
      </button>

      <button
        v-if="currentProfile"
        class="delete-profile-btn"
        @click="handleDeleteProfile"
        :disabled="getDecks(currentProfile.id).length > 0"
        :title="getDecks(currentProfile.id).length > 0 ? 'Cannot delete profile with decks' : 'Delete profile'"
      >
        <Trash2 :size="14" style="vertical-align: middle; margin-right: 4px;" /> Delete Profile
      </button>
    </div>

    <!-- Create Profile Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click="showCreateModal = false">
      <div class="modal-content" @click.stop>
        <h3>Create New Profile</h3>

        <div class="form-group">
          <label for="profile-name">Profile Name *</label>
          <input
            id="profile-name"
            type="text"
            v-model="newProfileName"
            placeholder="e.g., HSK Level 1, Business Chinese"
            autofocus
          />
        </div>

        <div class="form-group">
          <label for="profile-description">Description</label>
          <textarea
            id="profile-description"
            v-model="newProfileDescription"
            placeholder="Optional description for this study profile"
            rows="3"
          />
        </div>

        <div class="form-group">
          <label for="profile-lang">Default Language</label>
          <select id="profile-lang" v-model="newProfileLang">
            <option value="en">English</option>
            <option value="fr">Français</option>
          </select>
        </div>

        <div class="modal-actions">
          <button class="btn-ghost" @click="showCreateModal = false">Cancel</button>
          <button
            class="btn-primary"
            @click="handleCreateProfile"
            :disabled="!newProfileName.trim()"
          >
            Create Profile
          </button>
        </div>
      </div>
    </div>

    <!-- Current Profile Info -->
    <div v-if="currentProfile" class="current-profile-info">
      <h4>{{ currentProfile.name }}</h4>
      <p v-if="currentProfile.description" class="profile-description">
        {{ currentProfile.description }}
      </p>
      <small class="profile-meta">
        Created: {{ new Date(currentProfile.createdAt).toLocaleDateString() }}
        <template v-if="currentProfile.decks">
          • Decks: {{ currentProfile.decks.length }}
        </template>
      </small>
    </div>

    <!-- Rename Profile Modal -->
    <RenameModal
      v-if="currentProfile"
      :isOpen="showRenameModal"
      @close="showRenameModal = false"
      :onRename="async (newName: string) => {
        const result = renameProfile(currentProfile.id, newName)
        if (result.success) {
          loadProfiles()
          const updated = getProfileById(currentProfile.id)
          if (updated) props.onProfileChange(updated)
        }
        return result
      }"
      :currentName="currentProfile.name"
      :validateName="(name: string) => validateProfileName(name, currentProfile.id)"
      title="Rename Profile"
      itemType="Profile"
    />
  </div>
</template>
