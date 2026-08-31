import json
import logging
from typing import List, Dict, Any
from core.gemini_client import gemini_client
from core.pharmacy_checker import pharmacy_checker

logger = logging.getLogger(__name__)

"""
Prescription Extraction & Voice Assistant Engine.

HUMAN-IN-THE-LOOP COMPLIANCE GUARANTEE:
Nothing extracted by this engine auto-writes to a real EHR system or submits a prescription order.
All extracted items are returned as recommendations to the doctor for explicit review, editing, and confirmation.
"""

class PrescriptionEngine:
    async def extract_prescriptions(self, transcript_text: str) -> List[Dict[str, Any]]:
        """
        Parses live consultation transcript and extracts structured prescription details.
        Then queries PharmacyInventoryChecker for local stock availability.
        Generates a brief spoken confirmation statement per medication.
        """
        if not transcript_text or len(transcript_text.strip()) < 10:
            return []

        prompt = f"""
You are a specialized clinical assistant monitoring a live doctor-patient consultation transcript.
Extract ALL prescription medication instructions uttered by the doctor.

Transcript:
"{transcript_text}"

Return a STRICT JSON array (no markdown code blocks, no backticks) with this exact schema:
[
  {{
    "drug_name": "Amoxicillin",
    "dosage": "500mg",
    "frequency": "three times daily",
    "duration": "7 days",
    "instructions": "Take with food"
  }}
]

Instructions:
- Extract ONLY explicit or implied medication orders/prescriptions mentioned in the transcript.
- If no prescriptions are detected in the transcript, return an empty array `[]`.
"""
        raw_response = await gemini_client.generate_text(prompt)

        clean_text = raw_response.strip()
        if clean_text.startswith("```"):
            lines = clean_text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            clean_text = "\n".join(lines).strip()

        try:
            prescriptions = json.loads(clean_text)
            if not isinstance(prescriptions, list):
                prescriptions = []
        except Exception as e:
            logger.warning(f"Could not parse prescription JSON from Gemini: {e}")
            prescriptions = []

        enriched = []
        for rx in prescriptions:
            drug = rx.get("drug_name", "")
            dosage = rx.get("dosage", "")
            pharmacies = pharmacy_checker.check_availability(drug_name=drug, dosage=dosage)
            
            in_stock_count = sum(1 for p in pharmacies if p.get("in_stock"))
            total_count = len(pharmacies)
            
            spoken_confirmation = f"{drug} {dosage} — in stock at {in_stock_count} of {total_count} nearby pharmacies."

            enriched.append({
                "drug_name": drug,
                "dosage": dosage,
                "frequency": rx.get("frequency", "as directed"),
                "duration": rx.get("duration", "as directed"),
                "instructions": rx.get("instructions", "Take as directed by physician"),
                "pharmacies": pharmacies,
                "spoken_confirmation": spoken_confirmation
            })

        return enriched

    async def answer_consultation_voice_query(
        self,
        transcript: str,
        prescriptions: List[Dict[str, Any]],
        question: str
    ) -> str:
        """
        Answers direct spoken questions during consultation grounded strictly in session context so far.
        Outputs ONLY 1 short sentence answering what was asked directly.
        """
        prompt = f"""
You are a voice assistant in a clinical consultation session.
Answer ONLY the specific question asked below using the session context.

Transcript & Prescriptions:
"{transcript}"
{json.dumps(prescriptions, indent=2)}

Question:
"{question}"

RULES FOR CONCISE DIRECT RESPONSE:
1. Output ONLY 1 short, direct sentence answering what was asked (maximum 15 words).
2. Do NOT add extraneous context, unasked details, or greetings.
3. If asked "Is that in stock nearby?", name ONLY the in-stock pharmacy.
4. If asked "Repeat the last prescription", state ONLY the drug, dose, and frequency.
"""
        spoken_response = await gemini_client.generate_text(prompt)
        return spoken_response.strip()


prescription_engine = PrescriptionEngine()
