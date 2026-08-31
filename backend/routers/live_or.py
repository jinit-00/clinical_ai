import os
import json
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from core.or_agents.orchestrator import orchestrator

router = APIRouter(prefix="/live-or", tags=["Live OR Mode"])
logger = logging.getLogger(__name__)

CASE_SCRIPTS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "case_scripts")

class SelectScriptRequest(BaseModel):
    script_id: str

class QueryRequest(BaseModel):
    query: str
    agent: Optional[str] = "auto"

session_state = {
    "active_script": None,
    "current_index": 0
}

def load_case_script(script_id: str) -> Dict[str, Any]:
    file_path = os.path.join(CASE_SCRIPTS_DIR, f"{script_id}.json")
    if not os.path.exists(file_path):
        file_path = os.path.join(CASE_SCRIPTS_DIR, "lap_cholecystectomy.json")
    with open(file_path, "r") as f:
        return json.load(f)

try:
    session_state["active_script"] = load_case_script("lap_cholecystectomy")
except Exception as e:
    logger.error(f"Error loading initial case script: {e}")

@router.get("/scripts")
async def list_scripts():
    """Returns available pre-written demo case scripts."""
    return [
        {"id": "lap_cholecystectomy", "title": "Laparoscopic Cholecystectomy", "specialty": "General Surgery"},
        {"id": "knee_arthroplasty", "title": "Total Knee Arthroplasty (TKA)", "specialty": "Orthopedic Surgery"}
    ]

@router.post("/select-script")
async def select_script(payload: SelectScriptRequest):
    """Selects active demo case script and resets timeline index to 0."""
    try:
        script = load_case_script(payload.script_id)
        session_state["active_script"] = script
        session_state["current_index"] = 0
        orchestrator.clear_log()
        return {"success": True, "script_title": script["title"]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not load case script: {str(e)}")

@router.get("/state")
async def get_or_state():
    """Returns current active OR timeline phase, vitals, findings, and event log."""
    script = session_state["active_script"] or load_case_script("lap_cholecystectomy")
    timeline = script.get("timeline", [])
    idx = min(session_state["current_index"], len(timeline) - 1)
    current_entry = timeline[idx] if timeline else {}

    return {
        "script_id": script.get("id"),
        "script_title": script.get("title"),
        "specialty": script.get("specialty"),
        "patient": script.get("patient"),
        "current_index": idx,
        "total_phases": len(timeline),
        "timeline": timeline,
        "current_entry": current_entry,
        "event_log": orchestrator.event_log
    }

@router.post("/next-phase")
async def next_phase():
    """Advances current timeline index to next phase."""
    script = session_state["active_script"] or load_case_script("lap_cholecystectomy")
    timeline = script.get("timeline", [])
    if session_state["current_index"] < len(timeline) - 1:
        session_state["current_index"] += 1

    idx = session_state["current_index"]
    current_entry = timeline[idx] if timeline else {}

    return {
        "success": True,
        "current_index": idx,
        "current_entry": current_entry
    }

@router.post("/query")
async def process_or_query(payload: QueryRequest):
    """
    Processes incoming doctor question, routes via Orchestrator to target agent,
    and appends interaction to session event log.
    """
    if not payload.query:
        raise HTTPException(status_code=400, detail="No query provided.")

    script = session_state["active_script"] or load_case_script("lap_cholecystectomy")
    timeline = script.get("timeline", [])
    idx = session_state["current_index"]
    current_entry = timeline[idx] if timeline else {}
    patient_data = script.get("patient", {})

    result = await orchestrator.route_and_execute(
        query=payload.query,
        target_agent=payload.agent or "auto",
        current_entry=current_entry,
        patient_data=patient_data
    )

    # Clean text for read-aloud spoken playback (strip markdown formatting/brackets)
    spoken_text = result["response_text"].replace("[from case script]", "").replace("*", "").replace("#", "").strip()

    result["spoken_text"] = spoken_text
    return result

@router.post("/voice-query")
async def process_or_voice_query(payload: QueryRequest):
    """
    Bidirectional Voice Query Endpoint for Live OR Mode.
    Routes spoken question to 12 Orchestrator agents and returns formatted spoken text for instant playback.
    """
    return await process_or_query(payload)

@router.websocket("/ws")
async def websocket_live_or_stream(websocket: WebSocket):
    """
    WebSocket endpoint for bidirectional streaming live OR audio session.
    """
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            script = session_state["active_script"] or load_case_script("lap_cholecystectomy")
            timeline = script.get("timeline", [])
            idx = session_state["current_index"]
            current_entry = timeline[idx] if timeline else {}
            patient_data = script.get("patient", {})

            result = await orchestrator.route_and_execute(
                query=data,
                target_agent="auto",
                current_entry=current_entry,
                patient_data=patient_data
            )
            spoken_text = result["response_text"].replace("[from case script]", "").replace("*", "").replace("#", "").strip()
            result["spoken_text"] = spoken_text

            await websocket.send_json(result)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.close()
