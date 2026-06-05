import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const ImageUpload = ({ onResults, targetLang }) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const pollIntervalRef = useRef(null);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Create preview URL
    const imageUrl = URL.createObjectURL(file);
    setSelectedImage(imageUrl);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('lang', targetLang);

    setLoading(true);
    setProgress('Starting image processing...');
    setProgressPercent(0);
    setCurrentStep('uploading');
    setError(null);

    try {
      // Phase 1: Upload image and get job ID
      setProgress('Uploading image...');
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/start-processing`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const uploadPercent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          const overallProgress = Math.round(uploadPercent * 0.15); // Upload is 15% of total process
          setProgressPercent(overallProgress);
          setProgress(`Uploading image... ${uploadPercent}%`);
        }
      });

      const jobId = response.data.job_id;
      setProgress('Upload complete! Starting processing...');
      setProgressPercent(15);
      setCurrentStep('processing');

      // Phase 2: Start polling for progress
      startProgressPolling(jobId);

    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start processing');
      setLoading(false);
    }
  };

  const startProgressPolling = (jobId) => {
    // Clear any existing polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    // Poll every 500ms
    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/job-status/${jobId}`);
        const jobStatus = response.data;

        // Update progress UI
        setProgressPercent(jobStatus.progress);
        setProgress(jobStatus.message);
        setCurrentStep(jobStatus.step);

        // Check if job is complete
        if (jobStatus.complete) {
          clearInterval(pollIntervalRef.current);

          if (jobStatus.error) {
            setError(jobStatus.error);
          } else if (jobStatus.results) {
            // Show completion message briefly
            setProgress('Processing complete!');
            setProgressPercent(100);
            setCurrentStep('complete');

            // Clear progress display after delay
            setTimeout(() => {
              setProgress('');
              setProgressPercent(0);
              setCurrentStep('');
            }, 2000);

            // Pass results to parent
            onResults(jobStatus.results);
          }

          setLoading(false);
        }

      } catch (err) {
        console.error('Error polling job status:', err);
        setError('Failed to get processing status');
        clearInterval(pollIntervalRef.current);
        setLoading(false);
      }
    }, 500);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (selectedImage) {
        URL.revokeObjectURL(selectedImage);
      }
    };
  }, [selectedImage]);

  return (
    <div className="image-upload">
      <h2>Upload Chinese Text Image</h2>
      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        disabled={loading}
      />

      {selectedImage && !loading && (
        <div className="image-preview">
          <img
            src={selectedImage}
            alt="Uploaded preview"
            className="image-thumbnail"
            onClick={() => window.open(selectedImage, '_blank')}
          />
        </div>
      )}

      {loading && (
        <div className="progress-container">
          <div className="progress-steps">
            <div className={`step ${['upload', 'ocr', 'ocr_complete', 'segment', 'segment_complete', 'ai_processing', 'pinyin', 'complete'].some(step => progressPercent >= 15 || currentStep === 'upload') ? 'completed' : ''} ${currentStep === 'upload' ? 'active' : ''}`}>
              <span className="step-icon">📤</span>
              <span className="step-text">Upload</span>
            </div>
            <div className={`step ${['ocr', 'ocr_complete', 'segment', 'segment_complete', 'ai_processing', 'pinyin', 'complete'].some(step => progressPercent >= 30 || ['ocr', 'ocr_complete'].includes(currentStep)) ? 'completed' : ''} ${['ocr', 'ocr_complete'].includes(currentStep) ? 'active' : ''}`}>
              <span className="step-icon">🔍</span>
              <span className="step-text">OCR</span>
            </div>
            <div className={`step ${['segment_complete', 'ai_processing', 'pinyin', 'complete'].some(step => progressPercent >= 50 || ['segment', 'segment_complete'].includes(currentStep)) ? 'completed' : ''} ${['segment', 'segment_complete'].includes(currentStep) ? 'active' : ''}`}>
              <span className="step-icon">📝</span>
              <span className="step-text">Segment</span>
            </div>
            <div className={`step ${['ai_processing', 'pinyin', 'complete'].some(step => progressPercent >= 70 || currentStep === 'ai_processing') ? 'completed' : ''} ${currentStep === 'ai_processing' ? 'active' : ''}`}>
              <span className="step-icon">🤖</span>
              <span className="step-text">AI Explain</span>
            </div>
            <div className={`step ${['pinyin', 'complete'].some(step => progressPercent >= 90 || currentStep === 'pinyin') ? 'completed' : ''} ${currentStep === 'pinyin' ? 'active' : ''}`}>
              <span className="step-icon">🔤</span>
              <span className="step-text">Pinyin</span>
            </div>
            <div className={`step ${progressPercent >= 100 || currentStep === 'complete' ? 'completed' : ''} ${currentStep === 'complete' ? 'active' : ''}`}>
              <span className="step-icon">✅</span>
              <span className="step-text">Complete</span>
            </div>
          </div>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          <p className="progress-text">{progress}</p>
          <p className="progress-percent">{progressPercent}%</p>
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
};

export default ImageUpload;