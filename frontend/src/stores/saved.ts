import { defineStore } from 'pinia'
import { reactive } from 'vue'

export const useSavedStore = defineStore('saved', () => {
  const savedIndices = reactive(new Set<number>())

  function markSaved(idx: number) {
    savedIndices.add(idx)
  }

  function isSaved(idx: number): boolean {
    return savedIndices.has(idx)
  }

  function reset() {
    savedIndices.clear()
  }

  return { markSaved, isSaved, reset }
})
