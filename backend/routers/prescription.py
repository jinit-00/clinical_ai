from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from core.prescription_engine import prescription_engine
from core.pharmacy_checker import pharmacy_checker

router = APIRouter(prefix="/prescription", tags=["Prescription & Consultation"])

class TranscriptRequest(BaseModel):
    transcript: str

class InventoryCheckRequest(BaseModel):
    drug_name: str
    dosage: Optional[str] = ""

class ConsultationVoiceQueryRequest(BaseModel):
    transcript: str
    prescriptions: List[Dict[str, Any]] = []
    question: str

@router.post("/analyze-transcript")
async def analyze_transcript(payload: TranscriptRequest):
    """
    Analyze consultation transcript for prescriptions and check local pharmacy inventory.
    Generates spoken confirmation statements for each detected medication.
    """
    if not payload.transcript:
        return {"prescriptions": []}

    try:
        prescriptions = await prescription_engine.extract_prescriptions(payload.transcript)
        return {
            "success": True,
            "prescriptions": prescriptions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcript analysis failed: {str(e)}")

@router.post("/voice-query")
async def consultation_voice_query(payload: ConsultationVoiceQueryRequest):
    """
    Bidirectional voice Q&A endpoint for Live Consultation Mode.
    Answers direct spoken questions (e.g., 'Is that in stock nearby?', 'Repeat the last prescription', 'Any cheaper alternative?').
    """
    if not payload.question:
        raise HTTPException(status_code=400, detail="No question provided.")

    try:
        spoken_response = await prescription_engine.answer_consultation_voice_query(
            transcript=payload.transcript,
            prescriptions=payload.prescriptions,
            question=payload.question
        )
        return {
            "question": payload.question,
            "spoken_response": spoken_response
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice Q&A failed: {str(e)}")

@router.post("/check-inventory")
async def check_inventory(payload: InventoryCheckRequest):
    """
    Check stock availability for a specific drug and dosage across local pharmacies.
    """
    pharmacies = pharmacy_checker.check_availability(
        drug_name=payload.drug_name,
        dosage=payload.dosage or ""
    )
    return {
        "drug_name": payload.drug_name,
        "dosage": payload.dosage,
        "pharmacies": pharmacies
    }

@router.websocket("/ws")
async def websocket_prescription_stream(websocket: WebSocket):
    """
    WebSocket endpoint for streaming live consultation transcripts and real-time prescription detection.
    """
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            prescriptions = await prescription_engine.extract_prescriptions(data)
            await websocket.send_json({
                "type": "prescription_update",
                "transcript_chunk": data,
                "prescriptions": prescriptions
            })
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.close()
