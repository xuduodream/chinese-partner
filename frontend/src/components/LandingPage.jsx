import React from 'react';

function LandingPage({ onStart }) {
  return (
    <div className="landing-page">
      <div className="landing-content">
        <h1>🧠 MemBoost</h1>
        <h2>Learn Chinese Through Visual Text</h2>

        <div className="features">
          <div className="feature">
            <div className="feature-icon">📸</div>
            <h3>Upload Images</h3>
            <p>Extract Chinese text from any image using advanced OCR technology</p>
          </div>

          <div className="feature">
            <div className="feature-icon">🤖</div>
            <h3>AI Explanations</h3>
            <p>Get detailed explanations, grammar notes, and context for each sentence</p>
          </div>

          <div className="feature">
            <div className="feature-icon">🎯</div>
            <h3>Smart Flashcards</h3>
            <p>Create organized flashcards with pinyin, audio, and examples</p>
          </div>

          <div className="feature">
            <div className="feature-icon">📚</div>
            <h3>Profiles & Decks</h3>
            <p>Organize your learning with profiles and decks like a pro</p>
          </div>
        </div>

        <div className="how-it-works">
          <h3>How It Works</h3>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-text">Upload a photo of Chinese text</div>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-text">AI extracts and explains each sentence</div>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-text">Save cards to your profile and deck</div>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <div className="step-text">Review with audio and track progress</div>
            </div>
          </div>
        </div>

        <button className="start-button" onClick={onStart}>
          Start Learning 🚀
        </button>
      </div>
    </div>
  );
}

export default LandingPage;