# Clinical AI Copilot 🩺🤖

A portfolio-grade, clinical decision-support web application featuring multi-modal AI intelligence across radiology scan analysis, blood report biomarker interpretation, live consultation audio processing, and a scripted multi-agent operating room (OR) copilot.

> [!NOTE]
> **Clinical Disclaimer**: This application is a portfolio demo designed for informational and decision-support demonstration purposes only. It is not a certified diagnostic device. All AI-generated content requires review by a licensed healthcare clinician.

---

## 🌟 Key Modules

### 1. 🧠 MRI Review Module
- **DICOM & Image Support**: Decodes uint16 `.dcm` files via `pydicom` and converts images to normalized PNG format.
- **ROI Visual Findings**: Pretrained/Gemini Vision ROI detection highlighting anatomical landmarks (Knee & Shoulder) with bounding boxes (`[ymin, xmin, ymax, xmax]`).
- **Swappable Architecture (`MriAnalyzer`)**: Clean modular interface allowing seamless substitution of local pretrained MONAI or TorchVision models.
- **Dual Summaries**: Generates technical Clinician Radiology Impressions (radiology terminology) alongside empathetic Patient Plain-Language Summaries.

### 2. 🩸 Blood Report Interpretation Module
- **Multimodal OCR Extraction**: Parses lab reports from PDF documents or scan images into structured lab items.
- **Age/Sex-Adjusted Reference Ranges**: Evaluates extracted values against a configurable clinical reference catalog (`reference_ranges.py`) covering CBC, Metabolic, Lipid, Renal, Hepatic, Endocrine, and Vital panels.
- **Color-Coded Flagging**: Categorizes parameters as `NORMAL` (sage), `BORDERLINE` (terracotta warning), or `HIGH ALERT` (terracotta critical).
- **ReportLab PDF Exporter**: Generates downloadable PDF clinician reports with demographic headers, categorized lab tables, and clinical disclaimers.

### 3. 🎙️ Consultation Mode (Live Audio & Prescription Capture)
- **Patient Consent Gate**: Enforces explicit HIPAA/DPDP patient consent (`ConsentGateModal`) before microphone streaming starts.
- **Real-Time Prescription Engine**: Parses live doctor-patient consultation text to extract structured medication orders (`drug_name`, `dosage`, `frequency`, `duration`).
- **Pharmacy Inventory Checker**: Queries a local mock pharmacy dataset across 4 local pharmacies, checking stock and suggesting generic alternatives when out of stock.
- **Physician Confirmation Gate**: "Stop Consultation" button presents a final confirmation modal for attending doctors to review and edit orders before saving.

### 4. 🏥 Live OR Mode (Scripted Multi-Agent Copilot Demo)
- **Multi-Agent Orchestration**: Features 12 specialized OR agents (Briefing, WHO Timeout, Protocol, Decision Support, Complication Advisor, EBL Tracker, Drug Checker, Anatomy Spotter, Op. Report, Handoff/SBAR, Visual Field Intel, Visual Assistant).
- **Case Script Timeline Stepper**: Driven strictly by pre-written JSON case scripts (`/backend/data/case_scripts/`) with a "Next Phase →" stepper button.
- **Pre-Built Question Chips**: 3–5 interactive question chips per agent tab for quick demo execution.
- **Honest Safety Framing**: Decorative video playback box plainly labeled *"Video for atmosphere only — not analyzed by the AI"*. All visual observations carry explicit `"from case script"` source tags.

---

## 🎨 Design System & Theme

- **Warm Beige Background**: `#F1EAD9`
- **Charcoal Text**: `#2E2B28`
- **Muted Terracotta Accent (Warning/Critical)**: `#B5654A`
- **Muted Sage Accent (Safe/Normal)**: `#6E7F5C`
- **Typography**: Editorial **Lora** (Serif font for titles) + **Inter** (Sans-serif font for body text).
- **Loading States**: Warm beige pulsing skeleton loader cards (`<SkeletonCard>`).
- **Responsive Layout**: Sidebar automatically collapses to icon-only mode below 900px viewport width.

---

## 🛠️ Tech Stack & Auditable Models

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Lucide Icons, CSS Variables |
| **Backend** | Python 3.11, FastAPI, Uvicorn, Pydantic |
| **LLM & Vision API** | Google Gemini API (`gemini-2.5-flash`) |
| **Radiology / DICOM** | `pydicom`, `Pillow`, `numpy` |
| **Lab PDF / Document** | `pypdf`, `reportlab` (PDF exporter) |

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- Python >= 3.10
- Node.js >= 18
- Gemini API Key ([Get GEMINI_API_KEY from Google AI Studio](https://aistudio.google.com/))

### 1. Environment Setup
Create a `.env` file inside `/backend` (or set `GEMINI_API_KEY` in environment):
```bash
cp backend/.env.example backend/.env
# Edit backend/.env and add your key:
GEMINI_API_KEY="your_gemini_api_key_here"
```

### 2. Run Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
python3 main.py
```
*Backend runs on `http://localhost:8000` (API Docs at `http://localhost:8000/docs`)*

### 3. Run Frontend (Vite + React)
```bash
cd frontend
npm install
npm run dev
```
*Frontend app runs on `http://localhost:5173`*

---

## 🔒 Safety Statement
Please review [SAFETY.md](file:///Users/jinitsoneji/Documents/health_hackathon/SAFETY.md) for full compliance details.
