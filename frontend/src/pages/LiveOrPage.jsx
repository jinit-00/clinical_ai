import React, { useState, useEffect, useRef } from 'react';
import { ClinicalCard } from '../components/ClinicalCard';
import OrSafetyBanner from '../components/OrSafetyBanner';
import AudioWaveformIndicator from '../components/AudioWaveformIndicator';
import { usePatient } from '../context/PatientContext';
import {
  Video, ArrowRight, Activity, ShieldCheck, BookOpen, Cpu,
  AlertTriangle, Droplet, Pill, Eye, FileText, Share2, Send, Mic, MicOff, Volume2, Loader2, Play
} from 'lucide-react';
import './LiveOrPage.css';

export const LiveOrPage = () => {
  const { selectedPatient } = usePatient();
  const [orState, setOrState] = useState(null);
  const [activeAgent, setActiveAgent] = useState('briefing');
  const [customQuery, setCustomQuery] = useState('');
  const [selectedScriptId, setSelectedScriptId] = useState('lap_cholecystectomy');

  // Hands-Free Voice & Speech States
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [assistantStatus, setAssistantStatus] = useState('IDLE');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [heardSpeechText, setHeardSpeechText] = useState('');

  const logEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const fetchState = async () => {
    try {
      const res = await fetch('/api/live-or/state');
      if (res.ok) {
        const data = await res.json();
        setOrState(data);
      }
    } catch (err) {
      console.warn('Error fetching OR state:', err);
    }
  };

  useEffect(() => {
    fetchState();
  }, [selectedScriptId]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [orState?.event_log]);

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
        const preferredVoice = voices.find(v => v.lang.startsWith('en')) || null;
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
      }

      utterance.pitch = 1.0;
      utterance.rate = 1.0;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setAssistantStatus('SPEAKING (Audio Output)');
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        setAssistantStatus(isVoiceActive ? 'LISTENING (Open Mic Active)' : 'IDLE');
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setAssistantStatus(isVoiceActive ? 'LISTENING (Open Mic Active)' : 'IDLE');
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Speech playback error:', err);
    }
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition && isVoiceActive) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setAssistantStatus('LISTENING (Speak into microphone now...)');
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setHeardSpeechText(`Heard: "${transcript}"`);

        if (event.results[event.results.length - 1].isFinal) {
          const spokenText = transcript.trim();
          if (spokenText.length > 2) {
            if ('speechSynthesis' in window) {
              window.speechSynthesis.cancel();
            }
            handleSendQuery(spokenText, 'auto');
          }
        }
      };

      recognition.onerror = (err) => {
        console.warn('Speech recognition error:', err);
        setHeardSpeechText(`Mic Error: ${err.error}. Click button to restart.`);
      };

      recognition.onend = () => {
        if (isVoiceActive) {
          try {
            recognition.start();
          } catch (e) {
            console.warn('Recognition restart error:', e);
          }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;

      return () => {
        recognition.stop();
      };
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setAssistantStatus('IDLE');
      setHeardSpeechText('');
    }
  }, [isVoiceActive]);

  const toggleVoiceMode = () => {
    if (isVoiceActive) {
      setIsVoiceActive(false);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setAssistantStatus('IDLE');
      setHeardSpeechText('');
    } else {
      setIsVoiceActive(true);
      setAssistantStatus('LISTENING (Open Mic Active)');
    }
  };

  const handleNextPhase = async () => {
    try {
      const res = await fetch('/api/live-or/next-phase', { method: 'POST' });
      if (res.ok) {
        await fetchState();
      }
    } catch (err) {
      console.error('Error advancing phase:', err);
    }
  };

  const handleScriptChange = async (e) => {
    const scriptId = e.target.value;
    setSelectedScriptId(scriptId);
    try {
      await fetch('/api/live-or/select-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script_id: scriptId })
      });
      await fetchState();
    } catch (err) {
      console.error('Error selecting script:', err);
    }
  };

  const handleSendQuery = async (queryText, targetAgent = activeAgent) => {
    if (!queryText) return;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setLoading(true);
    setAssistantStatus(`THINKING (Routing to [${targetAgent.toUpperCase()}] Agent)...`);

    try {
      const res = await fetch('/api/live-or/voice-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText, agent: targetAgent })
      });

      if (res.ok) {
        const data = await res.json();
        await fetchState();
        setCustomQuery('');

        if (data.spoken_text) {
          speakText(data.spoken_text);
        }
      }
    } catch (err) {
      console.error('Error processing voice query:', err);
    } finally {
      setLoading(false);
    }
  };

  const AGENTS_LIST = [
    { id: 'briefing', name: 'Briefing', icon: BookOpen, chips: ["Brief me on this case", "What's the patient's allergy history?", "Any prior surgeries relevant here?"] },
    { id: 'timeout', name: 'WHO Timeout', icon: ShieldCheck, chips: ["Run the timeout", "Confirm surgical site", "Repeat the last checklist item"] },
    { id: 'protocol', name: 'Protocol', icon: Activity, chips: ["What's the protocol for this phase?", "Show vascular dissection checklist"] },
    { id: 'decision', name: 'Decision Support', icon: Cpu, chips: ["What's the recommended next step?", "Any risk factors I should know about?", "What are the current vitals?"] },
    { id: 'complication', name: 'Complication Advisor', icon: AlertTriangle, chips: ["I have bleeding 1000 mL, how do I handle this?", "Sudden drop in blood pressure — what now?", "Suspected bile duct injury, next steps?"] },
    { id: 'ebl', name: 'EBL Tracker', icon: Droplet, chips: ["Blood loss 200 mL", "How much blood have we lost total?", "Are we near a transfusion threshold?"] },
    { id: 'drug', name: 'Drug Checker', icon: Pill, chips: ["Is cefazolin safe for this patient?", "Check this drug against current medications", "Any allergy conflicts with Penicillin?"] },
    { id: 'anatomy', name: 'Anatomy Spotter', icon: Eye, chips: ["What's at risk here?", "What's the danger zone for this phase?", "Show nearby critical structures"] },
    { id: 'op_report', name: 'Op. Report', icon: FileText, chips: ["Generate the operative report", "Add a note: specimen removed", "Log CVS confirmed"] },
    { id: 'handoff', name: 'Handoff (SBAR)', icon: Share2, chips: ["Prepare handoff", "Generate SBAR summary"] },
    { id: 'visual_intel', name: 'Visual Field Intel', icon: Eye, chips: ["What do you see?", "Describe the current field", "Identify visible structures"] },
    { id: 'visual_asst', name: 'Visual Assistant', icon: Eye, chips: ["Is there bleeding in view?", "What structure is this?", "Check field clear"] }
  ];

  const currentEntry = orState?.current_entry || {};
  const timeline = orState?.timeline || [];
  const vitals = currentEntry.vitals || {};

  return (
    <div className="live-or-page">
      {/* Top Prominent Safety Banner */}
      <OrSafetyBanner />

      {/* Primary Voice Assistant Control Card */}
      <ClinicalCard
        title="Live OR Hands-Free Voice Assistant"
        subtitle="Bidirectional Live Audio Session — Speak naturally into your microphone anytime"
        status={isVoiceActive ? 'normal' : 'warning'}
        action={
          <button
            onClick={toggleVoiceMode}
            className={`btn-master-voice ${isVoiceActive ? 'active' : ''}`}
          >
            {isVoiceActive ? (
              <>
                <MicOff size={18} /> Pause Live Voice Session
              </>
            ) : (
              <>
                <Mic size={18} /> Start Live OR Mode (Open Mic)
              </>
            )}
          </button>
        }
      >
        <div className="voice-master-status-row">
          <div className="status-indicator-box">
            <div className={`status-pulse-dot ${isVoiceActive ? 'active' : ''}`}></div>
            <span className="status-text">Live Assistant Status: <strong>{assistantStatus}</strong></span>
          </div>

          <AudioWaveformIndicator isSpeaking={isSpeaking} label="Assistant Speaking..." />
        </div>

        {heardSpeechText && (
          <div className="mic-status-banner" style={{ marginTop: '10px' }}>
            {heardSpeechText}
          </div>
        )}
      </ClinicalCard>

      {/* Script Selector & Decorative Video Box Header */}
      <div className="or-header-grid">
        <div className="script-selector-card">
          <div className="script-header-row">
            <h3 className="or-title">Multi-Agent Case Script Grounding</h3>
            <div className="script-select-wrapper">
              <label htmlFor="script-select" className="script-label">Active Case Script:</label>
              <select
                id="script-select"
                value={selectedScriptId}
                onChange={handleScriptChange}
                className="script-dropdown"
              >
                <option value="lap_cholecystectomy">Laparoscopic Cholecystectomy (General Surgery)</option>
                <option value="knee_arthroplasty">Total Knee Arthroplasty (Orthopedics)</option>
              </select>
            </div>
          </div>

          {/* Active Vitals Banner */}
          <div className="or-vitals-strip">
            <div className="vitals-item">
              <span className="vitals-label">Phase:</span>
              <strong className="vitals-val">{currentEntry.phase || 'Pre-Op'}</strong>
            </div>
            <div className="vitals-item">
              <span className="vitals-label">HR:</span>
              <strong className="vitals-val">{vitals.hr || 75} bpm</strong>
            </div>
            <div className="vitals-item">
              <span className="vitals-label">BP:</span>
              <strong className="vitals-val">{vitals.bp || '120/80'} mmHg</strong>
            </div>
            <div className="vitals-item">
              <span className="vitals-label">SpO2:</span>
              <strong className="vitals-val">{vitals.spo2 || 98}%</strong>
            </div>
            <div className="vitals-item">
              <span className="vitals-label">EBL:</span>
              <strong className="vitals-val">{currentEntry.blood_loss_ml || 0} mL</strong>
            </div>
            <div className="vitals-source-tag">[from case script]</div>
          </div>
        </div>

        {/* Decorative Video Box */}
        <div className="decorative-video-box">
          <div className="video-viewport image-active">
            <img src="/or_feed_demo.jpeg" alt="OR Feed Simulation" className="or-video-image" />
            <div className="video-white-overlay"></div>
            <div className="video-overlay-badge">REC ● OR FEED</div>
          </div>
          <div className="video-disclaimer-tag">
            Video for atmosphere only — not analyzed by the AI
          </div>
        </div>
      </div>

      {/* Case Timeline Stepper Bar */}
      <ClinicalCard title="Case Script Timeline Stepper" status="normal">
        <div className="stepper-container">
          <div className="stepper-items">
            {timeline.map((step, idx) => {
              const isActive = idx === orState?.current_index;
              const isPast = idx < orState?.current_index;
              return (
                <div key={idx} className={`step-node ${isActive ? 'active' : ''} ${isPast ? 'past' : ''}`}>
                  <div className="step-circle">{idx + 1}</div>
                  <div className="step-meta">
                    <span className="step-time">{step.t}</span>
                    <span className="step-name">{step.phase}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleNextPhase}
            disabled={orState?.current_index >= timeline.length - 1}
            className="btn-next-phase"
          >
            Next Phase <ArrowRight size={16} />
          </button>
        </div>
      </ClinicalCard>

      {/* 12 Agent Selector Tabs & Secondary Question Chips */}
      <div className="orchestrator-workspace">
        <div className="orchestrator-status-bar">
          <Cpu size={18} className="orch-icon" />
          <span>Orchestrator Intent Router (Automated Speech & Text Routing)</span>
        </div>

        <div className="agent-tabs-grid">
          {AGENTS_LIST.map((agent) => {
            const Icon = agent.icon;
            const isActive = activeAgent === agent.id;
            return (
              <button
                key={agent.id}
                className={`agent-tab ${isActive ? 'active' : ''}`}
                onClick={() => setActiveAgent(agent.id)}
              >
                <Icon size={16} />
                <span>{agent.name}</span>
              </button>
            );
          })}
        </div>

        {/* Secondary Question Chips Panel */}
        <div className="agent-chips-panel">
          <h4 className="chips-title">
            Secondary Question Chips for [{AGENTS_LIST.find(a => a.id === activeAgent)?.name}] Agent (Fallback for Noisy Environment):
          </h4>
          <div className="chips-btn-group">
            {AGENTS_LIST.find(a => a.id === activeAgent)?.chips.map((chip, cIdx) => (
              <button
                key={cIdx}
                onClick={() => handleSendQuery(chip, activeAgent)}
                disabled={loading}
                className="chip-btn"
              >
                <Send size={12} /> {chip}
              </button>
            ))}
          </div>

          {/* Custom Typed Query Bar */}
          <div className="custom-query-bar">
            <input
              type="text"
              placeholder={`Ask ${AGENTS_LIST.find(a => a.id === activeAgent)?.name} agent a custom question...`}
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendQuery(customQuery, activeAgent)}
              className="query-input"
            />
            <button
              onClick={() => handleSendQuery(customQuery, activeAgent)}
              disabled={!customQuery.trim() || loading}
              className="btn-send-query"
            >
              Ask Agent
            </button>
          </div>
        </div>
      </div>

      {/* Running Session Event Log Transcript */}
      <ClinicalCard title="Session Event Log & Spoken Responses" status="normal">
        <div className="event-log-container">
          {(!orState?.event_log || orState.event_log.length === 0) ? (
            <div className="empty-log-text">No voice or text queries submitted yet. Press 'Start Live OR Mode' to speak naturally, or click a question chip above.</div>
          ) : (
            orState.event_log.map((log, lIdx) => (
              <div key={lIdx} className="log-entry-item">
                <div className="log-meta-row">
                  <span className="log-time">[{log.timestamp}]</span>
                  <span className="log-agent-badge">{log.agent.toUpperCase()} AGENT</span>
                  <span className="log-phase-tag">Phase: {log.phase}</span>
                  <span className="log-source-tag">[from case script]</span>
                </div>
                <div className="log-query-row">
                  <strong>Doctor Spoke:</strong> {log.query}
                </div>
                <div className="log-response-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    <Volume2 size={14} style={{ display: 'inline', marginRight: '6px', color: 'var(--accent-safe)' }} />
                    {log.response}
                  </span>
                  <button
                    onClick={() => speakText(log.response.replace('[from case script]', '').trim())}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-safe)', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                  >
                    <Play size={12} /> Replay Audio
                  </button>
                </div>
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </ClinicalCard>
    </div>
  );
};

export default LiveOrPage;
