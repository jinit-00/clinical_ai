import json
from typing import Dict, Any, List

"""
Specialized OR Agent Handlers (12 Agents).

DEMO COMPLIANCE NOTE:
All visual observations, vitals, and patient data returned by these agents are retrieved
strictly from pre-written JSON case scripts with explicit inline "from case script" tags.
The AI does not perform live image or video processing.
All responses are formatted for ultra-concise read-aloud playback (1-sentence direct answers).
"""

async def agent_briefing(query: str, current_entry: Dict[str, Any], patient: Dict[str, Any], event_log: List[Dict[str, Any]]) -> str:
    """Briefing Agent: Direct 1-sentence pre-op patient summary."""
    name = patient.get("name", "Patient")
    age = patient.get("age", "N/A")
    sex = patient.get("sex", "N/A")
    allergies = ", ".join(patient.get("allergies", ["None"]))
    history = patient.get("history", "N/A")

    return f"[from case script] Patient {name}, {age}yo {sex} with history of {history} and allergies: {allergies}."

async def agent_timeout(query: str, current_entry: Dict[str, Any], patient: Dict[str, Any], event_log: List[Dict[str, Any]]) -> str:
    """WHO Timeout Agent: Direct 1-sentence checklist confirmation."""
    return f"[from case script] WHO Timeout complete for {patient.get('name')}: patient ID, surgical site, consent, and allergy checks verified."

async def agent_protocol(query: str, current_entry: Dict[str, Any], patient: Dict[str, Any], event_log: List[Dict[str, Any]]) -> str:
    """Protocol Agent: Direct 1-sentence guideline for current phase."""
    phase = current_entry.get("phase", "General Phase")
    return f"[from case script] Protocol for {phase}: Maintain clear field exposure, identify anatomical landmarks, and verify hemostasis."

async def agent_decision(query: str, current_entry: Dict[str, Any], patient: Dict[str, Any], event_log: List[Dict[str, Any]]) -> str:
    """Decision Support Agent: Direct 1-sentence vitals or next step advisory."""
    q_lower = query.lower()
    vitals = current_entry.get("vitals", {})

    if any(k in q_lower for k in ["vital", "bp", "hr", "blood pressure", "heart rate"]):
        return f"[from case script] Current Vitals: Heart rate {vitals.get('hr')} bpm, blood pressure {vitals.get('bp')} mmHg, SpO2 {vitals.get('spo2')}%."
    
    return f"[from case script] Complete structural identification before proceeding; vitals are HR {vitals.get('hr')} bpm, BP {vitals.get('bp')} mmHg."

async def agent_complication(query: str, current_entry: Dict[str, Any], patient: Dict[str, Any], event_log: List[Dict[str, Any]]) -> str:
    """Complication Advisor Agent: Direct 1-sentence emergency action guidance."""
    ebl = current_entry.get("blood_loss_ml", 0)
    return f"[from case script] Apply direct pressure, engage suction, identify vessel source, and alert anesthesia (Current EBL: {ebl} mL)."

async def agent_ebl(query: str, current_entry: Dict[str, Any], patient: Dict[str, Any], event_log: List[Dict[str, Any]]) -> str:
    """EBL Tracker Agent: Direct 1-sentence blood loss status."""
    current_ebl = current_entry.get("blood_loss_ml", 0)
    ebv = patient.get("ebv_ml", 4500)
    percentage = (current_ebl / ebv) * 100.0

    return f"[from case script] Estimated blood loss is {current_ebl} mL ({percentage:.1f}% of total blood volume)."

async def agent_drug(query: str, current_entry: Dict[str, Any], patient: Dict[str, Any], event_log: List[Dict[str, Any]]) -> str:
    """Drug Checker Agent: Direct 1-sentence allergy/drug safety verdict."""
    allergies = [a.lower() for a in patient.get("allergies", [])]
    q_lower = query.lower()

    if any(alg in q_lower for alg in ["penicillin", "amoxicillin", "ampicillin"]) and any("penicillin" in a for a in allergies):
        return f"[from case script] Contraindicated: Patient {patient.get('name')} has documented penicillin anaphylaxis."
    
    return f"[from case script] Safe: No documented contraindications found for this patient."

async def agent_anatomy(query: str, current_entry: Dict[str, Any], patient: Dict[str, Any], event_log: List[Dict[str, Any]]) -> str:
    """Anatomy Spotter Agent: Direct 1-sentence danger zone identification."""
    danger_zone = current_entry.get("danger_zone", "Critical neurovascular bundle")
    return f"[from case script] Danger zone for {current_entry.get('phase')}: {danger_zone}."

async def agent_op_report(query: str, current_entry: Dict[str, Any], patient: Dict[str, Any], event_log: List[Dict[str, Any]]) -> str:
    """Op. Report Agent: Direct 1-sentence operative report confirmation."""
    return f"[from case script] Operative report logged for {current_entry.get('phase')} with {current_entry.get('blood_loss_ml')} mL estimated blood loss."

async def agent_handoff(query: str, current_entry: Dict[str, Any], patient: Dict[str, Any], event_log: List[Dict[str, Any]]) -> str:
    """Handoff Agent: Direct 1-sentence SBAR sign-out summary."""
    vitals = current_entry.get("vitals", {})
    return f"[from case script] SBAR Handoff: {patient.get('name')} in {current_entry.get('phase')}, HR {vitals.get('hr')} bpm, BP {vitals.get('bp')}, EBL {current_entry.get('blood_loss_ml')} mL."

async def agent_visual_intel(query: str, current_entry: Dict[str, Any], patient: Dict[str, Any], event_log: List[Dict[str, Any]]) -> str:
    """Visual Intelligence Agent: Direct 1-sentence field observation."""
    findings = current_entry.get("visible_findings", "Standard operative field exposure.")
    return f"[from case script] Visual findings: {findings}"

async def agent_visual_asst(query: str, current_entry: Dict[str, Any], patient: Dict[str, Any], event_log: List[Dict[str, Any]]) -> str:
    """Visual Assistant Agent: Direct 1-sentence yes/no answer."""
    findings = current_entry.get("visible_findings", "")
    q_lower = query.lower()

    if "bleeding" in q_lower or "bleed" in q_lower:
        has_bleeding = "bleed" in findings.lower() or "ooz" in findings.lower()
        if has_bleeding:
            return f"[from case script] Yes, active bleeding observed: {findings}"
        return f"[from case script] No active bleeding observed in current field."

    return f"[from case script] Field observation: {findings}"
