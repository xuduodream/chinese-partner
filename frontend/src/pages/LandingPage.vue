<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <div class="landing-page">
    <div class="landing-content">
      <h1>🧠 MemBoost</h1>
      <h2>Learn Chinese Through Visual Text</h2>

      <div class="features">
        <div class="feature">
          <div class="feature-icon">📸</div>
          <h3>Upload Images</h3>
          <p>Extract Chinese text from any image using advanced OCR technology</p>
        </div>
        <div class="feature">
          <div class="feature-icon">🤖</div>
          <h3>AI Explanations</h3>
          <p>Get detailed explanations, grammar notes, and context for each sentence</p>
        </div>
        <div class="feature">
          <div class="feature-icon">🎯</div>
          <h3>Smart Flashcards</h3>
          <p>Create organized flashcards with pinyin, audio, and examples</p>
        </div>
        <div class="feature">
          <div class="feature-icon">📚</div>
          <h3>Profiles &amp; Decks</h3>
          <p>Organize your learning with profiles and decks like a pro</p>
        </div>
      </div>

      <div class="how-it-works">
        <h3>How It Works</h3>
        <div class="steps">
          <div class="step">
            <div class="step-number">1</div>
            <div class="step-text">Upload a photo of Chinese text</div>
          </div>
          <div class="step">
            <div class="step-number">2</div>
            <div class="step-text">AI extracts and explains each sentence</div>
          </div>
          <div class="step">
            <div class="step-number">3</div>
            <div class="step-text">Save cards to your profile and deck</div>
          </div>
          <div class="step">
            <div class="step-number">4</div>
            <div class="step-text">Review with audio and track progress</div>
          </div>
        </div>
      </div>

      <button class="start-button" @click="router.push('/import')">
        Start Learning 🚀
      </button>
    </div>
  </div>
</template>
