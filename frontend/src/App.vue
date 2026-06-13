<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from './stores/app'
import { checkAndMigrateData } from './utils/storage'
import { onMounted, ref } from 'vue'
import {
  House,
  Upload,
  BookOpen,
  FolderTree,
  Save,
  Sun,
  Moon,
  Monitor,
  ChevronLeft,
  ChevronRight,
  PartyPopper,
} from '@lucide/vue'

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
  { path: '/', name: 'landing', icon: 'House', label: 'Home' },
  { path: '/import', name: 'import', icon: 'Upload', label: 'Import' },
  { path: '/review', name: 'review', icon: 'BookOpen', label: 'Review' },
  { path: '/manager', name: 'manager', icon: 'FolderTree', label: 'Manager' },
  { path: '/backup', name: 'backup', icon: 'Save', label: 'Backup' },
]

const themeIcons: Record<string, string> = {
  light: 'Sun',
  dark: 'Moon',
  system: 'Monitor',
}

const themeLabels: Record<string, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

const iconMap: Record<string, any> = {
  House, Upload, BookOpen, FolderTree, Save,
  Sun, Moon, Monitor,
}

const themeModes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system']

function cycleTheme() {
  const modes = themeModes
  const idx = modes.indexOf(appStore.themeMode)
  const next = modes[(idx + 1) % modes.length]
  appStore.setThemeMode(next)
}

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
          <h1>MemBoost</h1>
        </div>

        <div class="nav-menu">
          <button
            v-for="item in navItems"
            :key="item.name"
            :class="{ active: route.path === item.path }"
            @click="navigate(item.path)"
          >
            <span class="nav-icon"><component :is="iconMap[item.icon]" :size="20" /></span>
            <span class="nav-text">{{ item.label }}</span>
          </button>
        </div>

        <!-- Theme Toggle -->
        <button class="theme-toggle" @click="cycleTheme" :title="'Theme: ' + themeLabels[appStore.themeMode]">
          <span class="nav-icon"><component :is="iconMap[themeIcons[appStore.themeMode]]" :size="20" /></span>
          <span class="nav-text">{{ themeLabels[appStore.themeMode] }}</span>
        </button>
      </nav>

      <button
        class="sidebar-toggle"
        :class="{ collapsed: appStore.sidebarCollapsed }"
        @click="appStore.toggleSidebar()"
        :title="appStore.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      >
        <ChevronRight v-if="appStore.sidebarCollapsed" :size="12" />
        <ChevronLeft v-else :size="12" />
      </button>

      <!-- Main Content Area -->
      <div class="main-content" :class="{ 'sidebar-collapsed': appStore.sidebarCollapsed }">
        <router-view />
      </div>

      <!-- Mobile Bottom Tab Bar -->
      <nav class="mobile-tab-bar">
        <router-link
          v-for="item in navItems"
          :key="item.name"
          :to="item.path"
          class="tab-btn"
        >
          <span class="tab-icon"><component :is="iconMap[item.icon]" :size="20" /></span>
          <span class="tab-label">{{ item.label }}</span>
        </router-link>
        <button class="tab-btn theme-tab-btn" @click="cycleTheme" title="Toggle theme">
          <span class="tab-icon"><component :is="iconMap[themeIcons[appStore.themeMode]]" :size="20" /></span>
          <span class="tab-label">{{ themeLabels[appStore.themeMode] }}</span>
        </button>
      </nav>
    </div>

    <!-- Migration Dialog -->
    <div v-if="showMigrationDialog" class="migration-notification">
      <div class="migration-content">
        <h3><PartyPopper :size="20" style="display: inline; vertical-align: middle; margin-right: 4px;" /> Welcome to Profiles &amp; Decks!</h3>
        <p>Your existing flashcards have been migrated to a new profile/deck system.</p>
        <p>Create profiles for different study contexts and organize cards into named decks!</p>
      </div>
    </div>
  </div>
</template>
