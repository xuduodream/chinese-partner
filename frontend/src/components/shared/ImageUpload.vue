<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import axios from 'axios'

const props = defineProps<{
  onResults: (results: any[]) => void
  targetLang: string
}>()

const loading = ref(false)
const progress = ref('')
const progressPercent = ref(0)
const currentStep = ref('')
const error = ref<string | null>(null)
const selectedImage = ref<string | null>(null)

let pollInterval: ReturnType<typeof setInterval> | null = null

async function handleImageUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const imageUrl = URL.createObjectURL(file)
  selectedImage.value = imageUrl

  const formData = new FormData()
  formData.append('file', file)
  formData.append('lang', props.targetLang)

  loading.value = true
  progress.value = 'Starting image processing...'
  progressPercent.value = 0
  currentStep.value = 'uploading'
  error.value = null

  try {
    progress.value = 'Uploading image...'
    const response = await axios.post(
      `${import.meta.env.VITE_API_BASE_URL}/api/start-processing`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent: any) => {
          const uploadPercent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          const overallProgress = Math.round(uploadPercent * 0.15)
          progressPercent.value = overallProgress
          progress.value = `Uploading image... ${uploadPercent}%`
        },
      },
    )

    const jobId = response.data.job_id
    progress.value = 'Upload complete! Starting processing...'
    progressPercent.value = 15
    currentStep.value = 'processing'
    startProgressPolling(jobId)
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to start processing'
    loading.value = false
  }
}

function startProgressPolling(jobId: string) {
  if (pollInterval) clearInterval(pollInterval)

  pollInterval = setInterval(async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/api/job-status/${jobId}`,
      )
      const jobStatus = response.data

      progressPercent.value = jobStatus.progress
      progress.value = jobStatus.message
      currentStep.value = jobStatus.step

      if (jobStatus.complete) {
        if (pollInterval) clearInterval(pollInterval)
        pollInterval = null

        if (jobStatus.error) {
          error.value = jobStatus.error
        } else if (jobStatus.results) {
          progress.value = 'Processing complete!'
          progressPercent.value = 100
          currentStep.value = 'complete'

          setTimeout(() => {
            progress.value = ''
            progressPercent.value = 0
            currentStep.value = ''
          }, 2000)

          props.onResults(jobStatus.results)
        }
        loading.value = false
      }
    } catch (err) {
      console.error('Error polling job status:', err)
      error.value = 'Failed to get processing status'
      if (pollInterval) clearInterval(pollInterval)
      pollInterval = null
      loading.value = false
    }
  }, 500)
}

function isStepActive(step: string): boolean {
  return currentStep.value === step
}

function isStepCompleted(threshold: number, steps: string[]): boolean {
  return progressPercent.value >= threshold || steps.includes(currentStep.value)
}

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
  if (selectedImage.value) URL.revokeObjectURL(selectedImage.value)
})
</script>

<template>
  <div class="image-upload">
    <h2>Upload Chinese Text Image</h2>
    <input
      type="file"
      accept="image/*"
      @change="handleImageUpload"
      :disabled="loading"
    />

    <div v-if="selectedImage && !loading" class="image-preview">
      <img
        :src="selectedImage"
        alt="Uploaded preview"
        class="image-thumbnail"
        @click="window.open(selectedImage, '_blank')"
      />
    </div>

    <div v-if="loading" class="progress-container">
      <div class="progress-steps">
        <div
          class="step"
          :class="{
            completed: isStepCompleted(15, ['upload']),
            active: isStepActive('upload'),
          }"
        >
          <span class="step-icon">📤</span>
          <span class="step-text">Upload</span>
        </div>
        <div
          class="step"
          :class="{
            completed: isStepCompleted(30, ['ocr', 'ocr_complete']),
            active: currentStep === 'ocr' || currentStep === 'ocr_complete',
          }"
        >
          <span class="step-icon">🔍</span>
          <span class="step-text">OCR</span>
        </div>
        <div
          class="step"
          :class="{
            completed: isStepCompleted(50, ['segment', 'segment_complete']),
            active: currentStep === 'segment' || currentStep === 'segment_complete',
          }"
        >
          <span class="step-icon">📝</span>
          <span class="step-text">Segment</span>
        </div>
        <div
          class="step"
          :class="{
            completed: isStepCompleted(70, ['ai_processing']),
            active: currentStep === 'ai_processing',
          }"
        >
          <span class="step-icon">🤖</span>
          <span class="step-text">AI Explain</span>
        </div>
        <div
          class="step"
          :class="{
            completed: isStepCompleted(90, ['pinyin']),
            active: currentStep === 'pinyin',
          }"
        >
          <span class="step-icon">🔤</span>
          <span class="step-text">Pinyin</span>
        </div>
        <div
          class="step"
          :class="{
            completed: progressPercent >= 100 || currentStep === 'complete',
            active: currentStep === 'complete',
          }"
        >
          <span class="step-icon">✅</span>
          <span class="step-text">Complete</span>
        </div>
      </div>

      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${progressPercent}%` }"></div>
      </div>

      <p class="progress-text">{{ progress }}</p>
      <p class="progress-percent">{{ progressPercent }}%</p>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>
