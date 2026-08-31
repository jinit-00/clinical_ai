import React, { useState } from 'react';
import { ClinicalCard } from '../components/ClinicalCard';
import ImageOverlayCanvas from '../components/ImageOverlayCanvas';
import SkeletonCard from '../components/SkeletonCard';
import { usePatient } from '../context/PatientContext';
import { UploadCloud, Activity, Eye, User, FileText, Loader2 } from 'lucide-react';
import './MriReviewPage.css';

/**
 * NOTE FOR CLINICAL INTEGRATION:
 * Swapping in a real, validated radiology model (e.g. MONAI / TorchVision / Hugging Face)
 * requires replacing the `MriAnalyzer._run_model_inference` method on the backend.
 * The rest of the pipeline, DICOM parser, and dual-summary UI remains unchanged.
 */

export const MriReviewPage = () => {
  const { selectedPatient } = usePatient();
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [joint, setJoint] = useState('knee');
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [viewMode, setViewMode] = useState('clinician'); // 'clinician' | 'patient'

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      if (selected.type.startsWith('image/')) {
        setFilePreview(URL.createObjectURL(selected));
      } else {
        setFilePreview(null);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('joint', joint);

    try {
      const response = await fetch('/api/mri/analyze', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysisResult(data);
      } else {
        const errorData = await response.json();
        alert(`Analysis Error: ${errorData.detail || 'Failed to analyze MRI scan.'}`);
      }
    } catch (err) {
      console.error('Error analyzing MRI scan:', err);
      alert('Network error while analyzing MRI scan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mri-page">
      {/* Upload & Joint Selection Card */}
      <ClinicalCard
        title={`MRI Volumetric Review & Scan Analysis — ${selectedPatient.name}`}
        subtitle={`Patient: ${selectedPatient.name} (${selectedPatient.age}y, ${selectedPatient.sex}) | Indication: ${selectedPatient.primary_condition}`}
        status="normal"
      >
        <div className="mri-controls-grid">
          <div className="joint-selector-group">
            <label className="control-label">Target Joint Scan:</label>
            <div className="joint-btn-group">
              <button
                className={`joint-btn ${joint === 'knee' ? 'active' : ''}`}
                onClick={() => setJoint('knee')}
              >
                Knee MRI
              </button>
              <button
                className={`joint-btn ${joint === 'shoulder' ? 'active' : ''}`}
                onClick={() => setJoint('shoulder')}
              >
                Shoulder MRI
              </button>
            </div>
          </div>

          <div className="file-upload-group">
            <label className="control-label">Upload Scan (JPEG / PNG / DICOM .dcm):</label>
            <div className="upload-dropzone">
              <input
                type="file"
                id="mri-file-input"
                accept="image/png, image/jpeg, .dcm"
                onChange={handleFileChange}
                className="hidden-file-input"
              />
              <label htmlFor="mri-file-input" className="dropzone-label">
                <UploadCloud size={24} className="upload-icon" />
                <span>{file ? file.name : 'Choose MRI Slice or DICOM file...'}</span>
              </label>
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!file || loading}
            className="btn-analyze-mri"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="spin-icon" /> Analyzing Scan...
              </>
            ) : (
              <>
                <Activity size={18} /> Run Pretrained Model Analysis
              </>
            )}
          </button>
        </div>
      </ClinicalCard>

      {/* Part 5: Skeleton Loading State */}
      {loading && (
        <SkeletonCard count={2} title={`Processing ${joint.toUpperCase()} MRI Slice & Detecting Anatomical Regions...`} />
      )}

      {/* Analysis Results Workspace */}
      {!loading && analysisResult && (
        <div className="mri-results-section">
          {/* Top Bar: View Mode Switcher Toggle */}
          <div className="view-mode-bar">
            <div className="view-mode-label">
              <Eye size={18} /> Review Mode:
            </div>
            <div className="toggle-pill-group">
              <button
                className={`toggle-pill ${viewMode === 'clinician' ? 'active' : ''}`}
                onClick={() => setViewMode('clinician')}
              >
                <FileText size={14} /> Clinician Impression (Radiology Terms)
              </button>
              <button
                className={`toggle-pill ${viewMode === 'patient' ? 'active' : ''}`}
                onClick={() => setViewMode('patient')}
              >
                <User size={14} /> Patient Summary (Plain Language)
              </button>
            </div>
          </div>

          {/* Grid Layout: Left Scan Canvas Overlay, Right Findings & Impression */}
          <div className="mri-analysis-grid">
            <div className="scan-viewer-card">
              <h4 className="viewer-title">Scan Slice & ROI Bounding Overlay</h4>
              <ImageOverlayCanvas
                imageUrl={analysisResult.image_data_url}
                findings={analysisResult.findings}
                dimensions={analysisResult.dimensions}
              />
            </div>

            <div className="findings-summary-column">
              {/* Active Impression View Mode */}
              <ClinicalCard
                title={viewMode === 'clinician' ? 'Clinician Radiology Impression' : 'Patient Plain-Language Summary'}
                status="normal"
                subtitle={viewMode === 'clinician' ? 'Technical summary for healthcare providers' : 'Empathetic plain-language explanation'}
              >
                <div className="summary-text-box">
                  {viewMode === 'clinician' ? (
                    <div className="clinician-bullets">
                      {analysisResult.clinician_summary.split('\n').map((line, idx) => (
                        line.trim() ? <div key={idx} className="bullet-line">{line}</div> : null
                      ))}
                    </div>
                  ) : (
                    <p className="patient-text">{analysisResult.patient_summary}</p>
                  )}
                </div>
              </ClinicalCard>

              {/* Individual Finding Cards */}
              <h4 className="findings-list-title">Detected Regional Observations</h4>
              {analysisResult.findings.map((finding, idx) => (
                <ClinicalCard
                  key={idx}
                  title={finding.region}
                  status={finding.severity}
                  subtitle={`Confidence: ${(finding.confidence * 100).toFixed(0)}%`}
                >
                  <p className="finding-obs-text">{finding.observation}</p>
                </ClinicalCard>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MriReviewPage;
