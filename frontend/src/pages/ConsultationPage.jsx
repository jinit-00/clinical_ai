import React, { useState, useEffect, useRef } from 'react';
import { ClinicalCard } from '../components/ClinicalCard';
import ConsentGateModal from '../components/ConsentGateModal';
import SkeletonCard from '../components/SkeletonCard';
import AudioWaveformIndicator from '../components/AudioWaveformIndicator';
import { usePatient } from '../context/PatientContext';
import { Mic, MicOff, Stethoscope, Pill, CheckCircle2, XCircle, AlertTriangle, Edit3, Send, Volume2, MessageSquare, Play } from 'lucide-react';
import './ConsultationPage.css';

/**
 * HUMAN-IN-THE-LOOP COMPLIANCE GUARANTEE:
 * Nothing here auto-writes to a real EHR or auto-sends a prescription —
 * this consultation workspace always terminates in an explicit doctor confirmation step.
 */

export const ConsultationPage = () => {
  const { selectedPatient } = usePatient();
  const [hasConsent, setHasConsent] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDoctorConfirmation, setShowDoctorConfirmation] = useState(false);
  const [confirmedPrescriptions, setConfirmedPrescriptions] = useState(null);

  // Voice Assistant Layer States
  const [voiceQuery, setVoiceQuery] = useState('');
  const [voiceAssistantLog, setVoiceAssistantLog] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMicListening, setIsMicListening] = useState(false);
  const [micStatusText, setMicStatusText] = useState('');

  const transcriptEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const prebuiltConsultationChips = [
    "Is that in stock nearby?",
    "Repeat the last prescription",
    "Any cheaper alternative?"
  ];

  const sampleClinicalPhrases = [
    "Patient presents with acute sinus infection symptoms. I am prescribing Amoxicillin 500mg three times daily for 7 days. Take with food.",
    "Blood pressure remains elevated at 142 over 88. Let us start Lisinopril 10mg once daily for hypertension.",
    "For glycemic control, we will add Metformin 500mg twice daily with meals. Take consistently."
  ];

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, voiceAssistantLog]);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const speakText = (textToSpeak) => {
    if (!textToSpeak) return;
    if (!('speechSynthesis' in window)) return;

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
      console.error('Speech playback error:', err);
    }
  };

  const handleSimulateUtterance = async (text) => {
    const newTranscript = transcript ? `${transcript}\n[Doctor]: ${text}` : `[Doctor]: ${text}`;
    setTranscript(newTranscript);
    setLoading(true);

    try {
      const response = await fetch('/api/prescription/analyze-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: newTranscript }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.prescriptions && data.prescriptions.length > 0) {
          setPrescriptions(data.prescriptions);
          
          const lastRx = data.prescriptions[data.prescriptions.length - 1];
          if (lastRx && lastRx.spoken_confirmation) {
            speakText(lastRx.spoken_confirmation);
          }
        }
      }
    } catch (err) {
      console.error('Error analyzing transcript:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceQuery = async (queryText) => {
    if (!queryText) return;
    setLoading(true);

    try {
      const response = await fetch('/api/prescription/voice-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcript,
          prescriptions: prescriptions,
          question: queryText
        })
      });

      if (response.ok) {
        const data = await response.json();
        const spokenAns = data.spoken_response;
        
        setVoiceAssistantLog(prev => [...prev, { query: queryText, response: spokenAns }]);
        speakText(spokenAns);
        setVoiceQuery('');
      }
    } catch (err) {
      console.error('Error answering voice query:', err);
    } finally {
      setLoading(false);
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
          setMicStatusText('🎙 Listening... Speak your question into microphone...');
        };

        recognition.onresult = (event) => {
          let transcriptText = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcriptText += event.results[i][0].transcript;
          }
          setVoiceQuery(transcriptText);
          setMicStatusText(`Heard: "${transcriptText}"`);
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

  const handleStartRecording = () => {
    setIsRecording(true);
    setTranscript(`[Consultation Session Started for ${selectedPatient.name}]\n[Doctor]: Good afternoon ${selectedPatient.name}, let's review your symptoms today.`);
  };

  const handleStopConsultation = () => {
    setIsRecording(false);
    setShowDoctorConfirmation(true);
  };

  const handleFinalConfirm = () => {
    setConfirmedPrescriptions(prescriptions);
    setShowDoctorConfirmation(false);
  };

  if (!hasConsent) {
    return <ConsentGateModal onConsentGiven={() => { setHasConsent(true); handleStartRecording(); }} />;
  }

  return (
    <div className="consultation-page">
      {/* Consultation Header */}
      <ClinicalCard
        title={`Live Consultation & Prescription Capture — ${selectedPatient.name}`}
        subtitle={`Patient ID: ${selectedPatient.id} (${selectedPatient.age}y, ${selectedPatient.sex}) | Medical History: ${selectedPatient.medical_history}`}
        status="normal"
        action={
          isRecording ? (
            <button onClick={handleStopConsultation} className="btn-stop-recording">
              <MicOff size={16} /> Stop Consultation & Review
            </button>
          ) : (
            <button onClick={handleStartRecording} className="btn-resume-recording">
              <Mic size={16} /> Resume Audio Session
            </button>
          )
        }
      >
        <div className="session-status-row">
          <div className="session-status-banner">
            <div className="live-indicator-dot"></div>
            <span>{isRecording ? "Live Audio Session Active (Female Voice Clinical Assistant)" : "Session Paused / Ended"}</span>
          </div>

          <AudioWaveformIndicator isSpeaking={isSpeaking} label="Female Assistant Speaking..." />
        </div>
      </ClinicalCard>

      {/* Spoken Voice Assistant Interaction Bar */}
      <div className="voice-assistant-bar">
        <div className="assistant-bar-header">
          <MessageSquare size={18} className="assistant-icon" />
          <span className="assistant-bar-title">🎙 Interactive Spoken Assistant (Female Voice Response)</span>
        </div>

        <div className="chips-btn-group">
          {prebuiltConsultationChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleVoiceQuery(chip)}
              disabled={loading}
              className="consultation-chip-btn"
            >
              <Send size={12} /> {chip}
            </button>
          ))}
        </div>

        <div className="voice-input-group">
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
            placeholder="Click 'Speak Question' or type your question (e.g. 'Is that in stock nearby?')..."
            value={voiceQuery}
            onChange={(e) => setVoiceQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleVoiceQuery(voiceQuery)}
            className="voice-input"
          />
          <button
            onClick={() => handleVoiceQuery(voiceQuery)}
            disabled={!voiceQuery.trim() || loading}
            className="btn-ask-consultation"
          >
            <Volume2 size={14} /> Ask Female Voice
          </button>
        </div>

        {micStatusText && (
          <div className="mic-status-banner">
            {micStatusText}
          </div>
        )}

        {voiceAssistantLog.length > 0 && (
          <div className="assistant-log-box">
            {voiceAssistantLog.map((log, idx) => (
              <div key={idx} className="log-item">
                <span className="log-q">Q: {log.query}</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="log-a">👩‍⚕️ {log.response}</span>
                  <button
                    onClick={() => speakText(log.response)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-safe)', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem' }}
                  >
                    <Play size={12} /> Replay
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Dual Column Layout */}
      <div className="consultation-grid">
        {/* Left Column: Live Audio Transcript */}
        <div className="transcript-column">
          <div className="section-header">
            <Stethoscope size={18} />
            <h3>Real-Time Consultation Audio Transcript</h3>
          </div>

          <div className="transcript-box">
            <pre className="transcript-content">{transcript || "Listening for doctor-patient conversation..."}</pre>
            <div ref={transcriptEndRef} />
          </div>

          {/* Interactive Quick Utterance Trigger Buttons for Demo */}
          <div className="demo-triggers-box">
            <span className="triggers-label">Simulate Doctor Prescription Instructions:</span>
            <div className="triggers-btn-group">
              {sampleClinicalPhrases.map((phrase, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSimulateUtterance(phrase)}
                  disabled={loading}
                  className="trigger-btn"
                >
                  <Send size={12} /> Utterance #{idx + 1}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Detected Prescriptions & Pharmacy Stock */}
        <div className="prescriptions-column">
          <div className="section-header">
            <Pill size={18} />
            <h3>Detected Prescriptions & Local Pharmacy Inventory</h3>
          </div>

          {loading ? (
            <SkeletonCard count={2} title="Extracting Medication Orders & Checking Stock..." />
          ) : prescriptions.length === 0 ? (
            <ClinicalCard title="No Prescriptions Detected Yet" status="normal">
              <p className="empty-text">
                Speak prescription instructions during the visit (e.g. <em>"Prescribing Amoxicillin 500mg three times daily"</em>). The Gemini Live engine will automatically capture medication details and verify local pharmacy stock.
              </p>
            </ClinicalCard>
          ) : (
            prescriptions.map((rx, idx) => (
              <ClinicalCard
                key={idx}
                title={`${rx.drug_name} ${rx.dosage}`}
                subtitle={`${rx.frequency} for ${rx.duration} | Instructions: ${rx.instructions}`}
                status="normal"
              >
                <div className="spoken-confirmation-tag">
                  <Volume2 size={14} /> Spoken Confirmation: <em>"{rx.spoken_confirmation}"</em>
                  <button
                    onClick={() => speakText(rx.spoken_confirmation)}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-safe)', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem' }}
                  >
                    <Play size={12} /> Replay
                  </button>
                </div>

                <div className="pharmacy-list-title" style={{ marginTop: '10px' }}>Local Pharmacy Inventory Availability:</div>
                <div className="pharmacy-grid">
                  {rx.pharmacies.map((pharm, pIdx) => (
                    <div
                      key={pIdx}
                      className={`pharmacy-status-card ${pharm.in_stock ? 'in-stock' : 'out-of-stock'}`}
                    >
                      <div className="pharmacy-header">
                        <span className="pharmacy-name">{pharm.name} ({pharm.distance_km} km)</span>
                        {pharm.in_stock ? (
                          <span className="stock-tag in-stock"><CheckCircle2 size={12} /> IN STOCK</span>
                        ) : (
                          <span className="stock-tag out-of-stock"><XCircle size={12} /> OUT OF STOCK</span>
                        )}
                      </div>

                      {!pharm.in_stock && pharm.alt_suggested_if_out_of_stock && (
                        <div className="alt-suggestion-box">
                          <AlertTriangle size={12} className="alt-icon" />
                          <span>Suggested Alternative: <strong>{pharm.alt_suggested_if_out_of_stock}</strong></span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ClinicalCard>
            ))
          )}
        </div>
      </div>

      {/* Doctor Final Confirmation Modal */}
      {showDoctorConfirmation && (
        <div className="doctor-confirm-modal-overlay">
          <div className="doctor-confirm-modal">
            <div className="modal-header">
              <Edit3 size={24} className="edit-icon" />
              <div>
                <h3>Physician Final Prescription Confirmation</h3>
                <p>Review and edit captured medication orders before saving to EHR record.</p>
              </div>
            </div>

            <div className="confirm-list">
              {prescriptions.length === 0 ? (
                <p>No prescriptions were captured during this consultation session.</p>
              ) : (
                prescriptions.map((rx, idx) => (
                  <div key={idx} className="confirm-item">
                    <div className="confirm-rx-title">{rx.drug_name} {rx.dosage}</div>
                    <div className="confirm-rx-details">{rx.frequency} for {rx.duration} — {rx.instructions}</div>
                  </div>
                ))
              )}
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowDoctorConfirmation(false)} className="btn-cancel-modal">
                Return to Editing
              </button>
              <button onClick={handleFinalConfirm} className="btn-confirm-save">
                <CheckCircle2 size={16} /> Confirm & Save Orders
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmed Prescriptions Banner */}
      {confirmedPrescriptions && (
        <ClinicalCard
          title="Physician Confirmed Prescription Orders"
          subtitle="Final orders confirmed by attending physician"
          status="normal"
        >
          <div className="confirmed-orders-box">
            {confirmedPrescriptions.map((rx, idx) => (
              <div key={idx} className="confirmed-order-item">
                <CheckCircle2 size={16} style={{ color: 'var(--accent-safe)' }} />
                <span><strong>{rx.drug_name} {rx.dosage}</strong> — {rx.frequency} for {rx.duration} ({rx.instructions})</span>
              </div>
            ))}
          </div>
        </ClinicalCard>
      )}
    </div>
  );
};

export default ConsultationPage;
