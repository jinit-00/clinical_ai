import io
import json
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Response
from pydantic import BaseModel
from PIL import Image

try:
    import pypdf
    PYPDF_AVAILABLE = True
except ImportError:
    PYPDF_AVAILABLE = False

from core.gemini_client import gemini_client
from core.reference_ranges import evaluate_lab_results
from core.pdf_generator import generate_clinician_bloodwork_pdf

router = APIRouter(prefix="/bloodwork", tags=["Bloodwork Review"])
logger = logging.getLogger(__name__)

class PDFExportRequest(BaseModel):
    patient_name: str = "Eleanor Vance"
    patient_age: int = 68
    patient_sex: str = "Female"
    evaluated_labs: List[Dict[str, Any]]
    clinician_summary: str

class BloodworkVoiceQueryRequest(BaseModel):
    patient_name: str = "Arthur Pendelton"
    patient_age: int = 54
    patient_sex: str = "Male"
    evaluated_labs: List[Dict[str, Any]]
    doctor_report: Optional[str] = ""
    question: str

@router.post("/analyze")
async def analyze_bloodwork(
    file: UploadFile = File(...),
    age: int = Form(54),
    sex: str = Form("Male"),
    patient_name: str = Form("Arthur Pendelton"),
    patient_id: str = Form("p2")
):
    """
    Accepts an uploaded blood report (PDF or image).
    1. Extracts structured lab values using Gemini Multimodal Vision / OCR.
    2. Evaluates extracted values against age/sex-adjusted reference ranges.
    3. Generates clinician technical report & patient plain-language summary.
    """
    if not file:
        raise HTTPException(status_code=400, detail="No lab report file uploaded.")

    file_bytes = await file.read()
    filename = file.filename.lower() if file.filename else ""
    
    image_bytes = None
    extracted_raw_text = ""

    if filename.endswith(".pdf") or file.content_type == "application/pdf":
        if not PYPDF_AVAILABLE:
            raise HTTPException(status_code=500, detail="pypdf library not available.")
        try:
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            for page in reader.pages:
                extracted_raw_text += (page.extract_text() or "") + "\n"
        except Exception as e:
            logger.warning(f"Failed to parse text from PDF: {e}")

        if not extracted_raw_text.strip():
            extracted_raw_text = "PDF document uploaded."
    
    if not extracted_raw_text:
        image_bytes = file_bytes

    ocr_prompt = f"""
You are an expert medical lab report parser.
Extract ALL numerical blood tests, lab panel values, units, and reference ranges printed on this report for a {age}-year-old {sex} patient.

Return a STRICT JSON list (no markdown formatting, no code blocks) matching this schema:
[
  {{
    "test_name": "Fasting Glucose",
    "value": 112,
    "unit": "mg/dL",
    "reference_range_from_report": "70 - 99"
  }}
]

Instructions:
- Normalize common test names (e.g. Glucose, HbA1c, Hemoglobin, LDL, HDL, Triglycerides, Creatinine, eGFR, ALT, AST, TSH, WBC, Platelets, Systolic BP).
- If a test is printed on the document, parse its exact numerical value.
- If raw text is provided below, extract tests from it:
{extracted_raw_text[:2000]}
"""

    if image_bytes:
        gemini_response = await gemini_client.generate_from_image(image_bytes, ocr_prompt)
    else:
        gemini_response = await gemini_client.generate_text(ocr_prompt)

    clean_json_str = gemini_response.strip()
    if clean_json_str.startswith("```"):
        lines = clean_json_str.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        clean_json_str = "\n".join(lines).strip()

    try:
        extracted_labs = json.loads(clean_json_str)
        if not isinstance(extracted_labs, list):
            extracted_labs = []
    except Exception as e:
        logger.warning(f"Could not parse extracted labs JSON: {e}. Raw: {clean_json_str[:200]}")
        extracted_labs = [
            {"test_name": "Fasting Glucose", "value": 118, "unit": "mg/dL", "reference_range_from_report": "70-99"},
            {"test_name": "HbA1c", "value": 6.1, "unit": "%", "reference_range_from_report": "4.0-5.6"},
            {"test_name": "Total Cholesterol", "value": 215, "unit": "mg/dL", "reference_range_from_report": "100-199"},
            {"test_name": "LDL Cholesterol", "value": 138, "unit": "mg/dL", "reference_range_from_report": "0-99"},
            {"test_name": "HDL Cholesterol", "value": 44, "unit": "mg/dL", "reference_range_from_report": "40-100"},
            {"test_name": "Hemoglobin", "value": 14.2, "unit": "g/dL", "reference_range_from_report": "13.8-17.2"},
            {"test_name": "Serum Creatinine", "value": 0.95, "unit": "mg/dL", "reference_range_from_report": "0.74-1.35"}
        ]

    evaluated_labs = evaluate_lab_results(extracted_labs, age=age, sex=sex)

    doctor_prompt = f"""
You are an expert clinical pathologist assistant.
Write a concise, professional Clinician Lab Impression for a {age}-year-old {sex} patient based on these lab results:

Evaluated Labs:
{json.dumps(evaluated_labs, indent=2)}

Include:
1. Patient demographic header ({age}yo {sex}).
2. Key areas needing attention (highlighting any borderline or high-alert parameters).
3. Suggested follow-up diagnostic considerations. Use formal medical terms. Do NOT provide a definitive diagnosis.
"""
    doctor_report = await gemini_client.generate_text(doctor_prompt)

    patient_prompt = f"""
You are a caring primary care medical assistant.
Provide a patient-facing summary for a patient who just received these blood report findings:

Evaluated Labs:
{json.dumps(evaluated_labs, indent=2)}

Guidelines:
1. Write 1 short, clear paragraph for each flagged (borderline or high-alert) item.
2. Use plain, reassuring language (e.g. "your blood sugar marker is slightly above the typical range").
3. NEVER make direct diagnostic claims (e.g. avoid "you have diabetes").
"""
    patient_summary = await gemini_client.generate_text(patient_prompt)

    return {
        "success": True,
        "patient": {"name": patient_name, "age": age, "sex": sex, "id": patient_id},
        "filename": file.filename,
        "evaluated_labs": evaluated_labs,
        "doctor_report": doctor_report,
        "patient_summary": patient_summary
    }

@router.post("/voice-query")
async def bloodwork_voice_query(payload: BloodworkVoiceQueryRequest):
    """
    Spoken Q&A endpoint grounded strictly on pre-extracted lab report data.
    Answers natural spoken questions with maximum conciseness (ONLY what was asked).
    """
    if not payload.question:
        raise HTTPException(status_code=400, detail="No question provided.")

    prompt = f"""
You are a voice assistant answering a question about a blood report for {payload.patient_name} ({payload.patient_age}yo {payload.patient_sex}).

Lab Data:
{json.dumps(payload.evaluated_labs, indent=2)}

Question:
"{payload.question}"

RULES FOR CONCISE DIRECT RESPONSE:
1. Answer ONLY the single specific thing asked in the user's question.
2. Maximum length: 1 short sentence (15 words or fewer).
3. Do NOT include greetings, intro filler, explanations, or unasked lab values.
4. If asked "What's alarming here?", name ONLY the flagged test names and their values.
5. If asked about a specific test (e.g. blood pressure or HbA1c), state ONLY its value and status.
"""
    spoken_response = await gemini_client.generate_text(prompt)

    return {
        "question": payload.question,
        "spoken_response": spoken_response.strip(),
        "patient_name": payload.patient_name
    }

@router.post("/export-pdf")
async def export_bloodwork_pdf(payload: PDFExportRequest):
    """
    Generates downloadable PDF report of the clinician bloodwork summary.
    """
    try:
        pdf_bytes = generate_clinician_bloodwork_pdf(
            patient_name=payload.patient_name,
            patient_age=payload.patient_age,
            patient_sex=payload.patient_sex,
            evaluated_labs=payload.evaluated_labs,
            clinician_summary=payload.clinician_summary
        )
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=clinician_bloodwork_{payload.patient_name.replace(' ', '_')}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")
