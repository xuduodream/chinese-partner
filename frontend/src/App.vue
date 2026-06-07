<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from './stores/app'
import { checkAndMigrateData } from './utils/storage'
import { onMounted, ref } from 'vue'

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()

const showMigrationDialog = ref(false)

onMounted(() => {
  const migrated = checkAndMigrateData()
  if (migrated) {
    showMigrationDialog.value = true
    setTimeout(() => {
      showMigrationDialog.value = false
    }, 3000)
  }
})

const navItems = [
  { path: '/', name: 'landing', icon: '🏠', label: 'Home' },
  { path: '/import', name: 'import', icon: '📤', label: 'Import' },
  { path: '/review', name: 'review', icon: '📚', label: 'Review' },
  { path: '/manager', name: 'manager', icon: '🗂️', label: 'Manager' },
  { path: '/backup', name: 'backup', icon: '💾', label: 'Backup' },
]

function navigate(path: string) {
  router.push(path)
}
</script>

<template>
  <div class="app">
    <div class="app-layout">
      <!-- Left Sidebar Navigation -->
      <nav class="sidebar-nav" :class="{ collapsed: appStore.sidebarCollapsed }">
        <div class="nav-header">
          <h1>{{ appStore.sidebarCollapsed ? 'MB' : 'MemBoost' }}</h1>
        </div>
        <button
          class="sidebar-toggle"
          @click="appStore.toggleSidebar()"
          :title="appStore.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        >
          {{ appStore.sidebarCollapsed ? '→' : '←' }}
        </button>

        <div class="nav-menu">
          <button
            v-for="item in navItems"
            :key="item.name"
            :class="{ active: route.path === item.path }"
            @click="navigate(item.path)"
          >
            <span class="nav-icon">{{ item.icon }}</span>
            <span class="nav-text">{{ item.label }}</span>
          </button>
        </div>
      </nav>

      <!-- Main Content Area -->
      <div class="main-content" :class="{ 'sidebar-collapsed': appStore.sidebarCollapsed }">
        <router-view />
      </div>
    </div>

    <!-- Migration Dialog -->
    <div v-if="showMigrationDialog" class="migration-notification">
      <div class="migration-content">
        <h3>🎉 Welcome to Profiles & Decks!</h3>
        <p>Your existing flashcards have been migrated to a new profile/deck system.</p>
        <p>Create profiles for different study contexts and organize cards into named decks!</p>
      </div>
    </div>
  </div>
</template>
