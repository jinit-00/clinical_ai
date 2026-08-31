import React, { useState, useEffect, useRef } from 'react';
import { ClinicalCard } from '../components/ClinicalCard';
import LabValuesTable from '../components/LabValuesTable';
import SkeletonCard from '../components/SkeletonCard';
import AudioWaveformIndicator from '../components/AudioWaveformIndicator';
import { usePatient } from '../context/PatientContext';
import { UploadCloud, Droplet, Download, FileText, User, Loader2, AlertCircle, Mic, MicOff, Send, Volume2, Play } from 'lucide-react';
import './BloodworkReviewPage.css';

export const BloodworkReviewPage = () => {
  const { selectedPatient } = usePatient();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [activeTab, setActiveTab] = useState('doctor');

  // Voice Q&A Layer States
  const [voiceQuestion, setVoiceQuestion] = useState('');
  const [voiceResponse, setVoiceResponse] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [isMicListening, setIsMicListening] = useState(false);
  const [micStatusText, setMicStatusText] = useState('');

  const recognitionRef = useRef(null);

  const prebuiltVoiceChips = [
    "What's alarming here?",
    "What's the blood pressure?",
    "Is the HbA1c within range?",
    "Summarize out loud"
  ];

  // Pre-load voices on component mount
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('age', selectedPatient.age);
    formData.append('sex', selectedPatient.sex);
    formData.append('patient_name', selectedPatient.name);
    formData.append('patient_id', selectedPatient.id);

    try {
      const response = await fetch('/api/bloodwork/analyze', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysisResult(data);
      } else {
        const err = await response.json();
        alert(`Bloodwork Analysis Error: ${err.detail || 'Failed to process lab report.'}`);
      }
    } catch (error) {
      console.error('Error analyzing blood report:', error);
      alert('Network error while processing lab report.');
    } finally {
      setLoading(false);
    }
  };

  const speakText = (textToSpeak) => {
    if (!textToSpeak) return;
    if (!('speechSynthesis' in window)) {
      alert("Browser speech synthesis not supported in this browser.");
      return;
    }

    try {
      window.speechSynthesis.resume();
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      const voices = window.speechSynthesis.getVoices();

      if (voices && voices.length > 0) {
        const femaleVoice = voices.find(v => 
          v.lang.startsWith('en') && (
            v.name.toLowerCase().includes('female') ||
            v.name.toLowerCase().includes('samantha') ||
            v.name.toLowerCase().includes('victoria') ||
            v.name.toLowerCase().includes('karen') ||
            v.name.toLowerCase().includes('zira') ||
            v.name.toLowerCase().includes('google us english') ||
            v.name.toLowerCase().includes('fiona') ||
            v.name.toLowerCase().includes('siri') ||
            v.name.toLowerCase().includes('jenny') ||
            v.name.toLowerCase().includes('aria')
          )
        );
        if (femaleVoice) {
          utterance.voice = femaleVoice;
        }
      }

      utterance.pitch = 1.15;
      utterance.rate = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Speech synthesis playback error:', err);
    }
  };

  const handleVoiceQuery = async (queryText) => {
    if (!queryText || !analysisResult) return;
    setVoiceLoading(true);

    try {
      const response = await fetch('/api/bloodwork/voice-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: selectedPatient.name,
          patient_age: selectedPatient.age,
          patient_sex: selectedPatient.sex,
          evaluated_labs: analysisResult.evaluated_labs,
          doctor_report: analysisResult.doctor_report,
          question: queryText
        })
      });

      if (response.ok) {
        const data = await response.json();
        const spokenAns = data.spoken_response;
        setVoiceResponse(spokenAns);
        speakText(spokenAns);
      }
    } catch (err) {
      console.error('Voice Q&A Error:', err);
    } finally {
      setVoiceLoading(false);
    }
  };

  const toggleMicListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Browser speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari, or type your question.");
      return;
    }

    if (isMicListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsMicListening(false);
      setMicStatusText('');
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsMicListening(true);
          setMicStatusText('🎙 Listening... Speak your question now...');
        };

        recognition.onresult = (event) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setVoiceQuestion(transcript);
          setMicStatusText(`Heard: "${transcript}"`);
        };

        recognition.onerror = (event) => {
          console.warn('Speech recognition error:', event.error);
          setMicStatusText(`Mic Error: ${event.error}. Click mic to try again.`);
          setIsMicListening(false);
        };

        recognition.onend = () => {
          setIsMicListening(false);
          setMicStatusText('');
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        setIsMicListening(false);
      }
    }
  };

  const handleDownloadPdf = async () => {
    if (!analysisResult) return;
    setDownloadingPdf(true);

    try {
      const response = await fetch('/api/bloodwork/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: selectedPatient.name,
          patient_age: selectedPatient.age,
          patient_sex: selectedPatient.sex,
          evaluated_labs: analysisResult.evaluated_labs,
          clinician_summary: analysisResult.doctor_report
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Clinician_Bloodwork_${selectedPatient.name.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        alert('Failed to generate PDF report.');
      }
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Network error generating PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const flaggedLabs = analysisResult?.evaluated_labs?.filter(l => l.flag !== 'normal') || [];

  return (
    <div className="bloodwork-page">
      {/* Upload & Patient Context Header */}
      <ClinicalCard
        title={`Bloodwork & Biomarker Panel Review — ${selectedPatient.name}`}
        subtitle={`Active Patient Demographic Context: Age ${selectedPatient.age} | Sex ${selectedPatient.sex} | History: ${selectedPatient.medical_history}`}
        status="normal"
      >
        <div className="bloodwork-controls">
          <div className="file-upload-group">
            <label className="control-label">Upload Lab Report (PDF / Image):</label>
            <div className="upload-dropzone">
              <input
                type="file"
                id="bloodwork-file-input"
                accept="application/pdf, image/png, image/jpeg"
                onChange={handleFileChange}
                className="hidden-file-input"
              />
              <label htmlFor="bloodwork-file-input" className="dropzone-label">
                <UploadCloud size={20} className="upload-icon" />
                <span>{file ? file.name : 'Select Lab PDF or scan image...'}</span>
              </label>
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!file || loading}
            className="btn-analyze-bloodwork"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="spin-icon" /> Parsing Lab Report...
              </>
            ) : (
              <>
                <Droplet size={18} /> OCR & Interpret Lab Values
              </>
            )}
          </button>
        </div>
      </ClinicalCard>

      {/* Skeleton Loader Card */}
      {loading && (
        <SkeletonCard count={2} title={`Performing Multimodal OCR & Comparing Against ${selectedPatient.sex} Age ${selectedPatient.age} Reference Ranges...`} />
      )}

      {/* Analysis Results & Voice Q&A */}
      {!loading && analysisResult && (
        <div className="bloodwork-results-section">
          {/* Voice Layer: "Ask the Report" Card */}
          <div className="voice-qa-card">
            <div className="voice-qa-header">
              <div className="voice-title-group">
                <Mic size={20} className="mic-icon" />
                <h4 className="voice-title">🎙 Ask the Report (Female Voice Clinical Assistant)</h4>
              </div>
              <AudioWaveformIndicator isSpeaking={isSpeaking} label="Female Assistant Speaking..." />
            </div>

            <div className="chips-row">
              <span className="chips-label">Quick Question Chips:</span>
              <div className="voice-chips-group">
                {prebuiltVoiceChips.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setVoiceQuestion(chip); handleVoiceQuery(chip); }}
                    disabled={voiceLoading}
                    className="voice-chip-btn"
                  >
                    <Send size={12} /> {chip}
                  </button>
                ))}
              </div>
            </div>

            <div className="voice-input-row">
              <button
                onClick={toggleMicListening}
                className={`btn-mic-listen ${isMicListening ? 'listening' : ''}`}
                title="Click to speak your question into microphone"
              >
                {isMicListening ? <MicOff size={16} /> : <Mic size={16} />}
                <span>{isMicListening ? "Stop Mic" : "Speak Question"}</span>
              </button>

              <input
                type="text"
                placeholder="Click 'Speak Question' or type your question (e.g. 'What's the blood pressure?')..."
                value={voiceQuestion}
                onChange={(e) => setVoiceQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVoiceQuery(voiceQuestion)}
                className="voice-text-input"
              />
              <button
                onClick={() => handleVoiceQuery(voiceQuestion)}
                disabled={!voiceQuestion.trim() || voiceLoading}
                className="btn-ask-voice"
              >
                {voiceLoading ? <Loader2 size={14} className="spin-icon" /> : <Send size={14} />} Ask Voice
              </button>
            </div>

            {micStatusText && (
              <div className="mic-status-banner">
                {micStatusText}
              </div>
            )}

            {voiceResponse && (
              <div className="spoken-response-box">
                <div className="spoken-response-header">
                  <Volume2 size={16} /> <strong>Female Assistant Spoken Response:</strong>
                  <button
                    onClick={() => speakText(voiceResponse)}
                    className="btn-replay-speech"
                    style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                  >
                    <Play size={12} /> Replay Spoken Audio
                  </button>
                </div>
                <p className="spoken-response-text">{voiceResponse}</p>
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="tab-navigation-bar">
            <div className="tab-buttons">
              <button
                className={`tab-btn ${activeTab === 'doctor' ? 'active' : ''}`}
                onClick={() => setActiveTab('doctor')}
              >
                <FileText size={16} /> Doctor Report & Full Panel
              </button>
              <button
                className={`tab-btn ${activeTab === 'patient' ? 'active' : ''}`}
                onClick={() => setActiveTab('patient')}
              >
                <User size={16} /> Patient Summary Cards ({flaggedLabs.length} Flagged)
              </button>
            </div>

            {activeTab === 'doctor' && (
              <button
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="btn-download-pdf"
              >
                {downloadingPdf ? (
                  <>
                    <Loader2 size={14} className="spin-icon" /> Generating PDF...
                  </>
                ) : (
                  <>
                    <Download size={14} /> Download PDF Report
                  </>
                )}
              </button>
            )}
          </div>

          {/* Doctor Report Tab */}
          {activeTab === 'doctor' && (
            <div className="doctor-report-view">
              <ClinicalCard
                title="Clinician Biomarker & Lab Impression"
                subtitle={`Demographic Adjustments Applied for ${selectedPatient.sex}, Age ${selectedPatient.age}`}
                status={flaggedLabs.length > 0 ? 'warning' : 'normal'}
              >
                <div className="doctor-text-box">
                  {analysisResult.doctor_report.split('\n').map((line, idx) => (
                    line.trim() ? <p key={idx} className="doctor-report-line">{line}</p> : null
                  ))}
                </div>
              </ClinicalCard>

              <ClinicalCard
                title="Extracted Biomarker Panel & Age/Sex Adjusted Flagging"
                subtitle={`Total Tests Parsed: ${analysisResult.evaluated_labs.length}`}
                status="normal"
              >
                <LabValuesTable labs={analysisResult.evaluated_labs} />
              </ClinicalCard>
            </div>
          )}

          {/* Patient Summary Tab */}
          {activeTab === 'patient' && (
            <div className="patient-summary-view">
              <ClinicalCard
                title="Patient Plain-Language Overview"
                subtitle="Reassuring explanation of flagged markers without diagnostic statements"
                status="normal"
              >
                <div className="patient-text-box">
                  {analysisResult.patient_summary.split('\n').map((line, idx) => (
                    line.trim() ? <p key={idx} className="patient-summary-line">{line}</p> : null
                  ))}
                </div>
              </ClinicalCard>

              <h4 className="flagged-cards-title">Flagged Parameters Summary Cards</h4>
              {flaggedLabs.length === 0 ? (
                <ClinicalCard title="All Parameters Within Reference Ranges" status="normal">
                  <p>All extracted biomarker values are within normal reference bounds for {selectedPatient.sex}, age {selectedPatient.age}.</p>
                </ClinicalCard>
              ) : (
                flaggedLabs.map((lab, idx) => (
                  <ClinicalCard
                    key={idx}
                    title={`${lab.test_name}: ${lab.value} ${lab.unit}`}
                    subtitle={`Reference Range: ${lab.reference_range}`}
                    status={lab.flag === 'high-alert' ? 'critical' : 'warning'}
                  >
                    <div className="flagged-item-body">
                      <div className="flagged-meta">
                        <AlertCircle size={16} className="alert-icon" />
                        <span>Status: <strong>{lab.flag_label}</strong></span>
                      </div>
                      <p className="flagged-desc">
                        This result ({lab.value} {lab.unit}) falls outside the typical expected reference target range ({lab.reference_range}). Your clinician will evaluate this parameter alongside your complete medical history.
                      </p>
                    </div>
                  </ClinicalCard>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BloodworkReviewPage;
