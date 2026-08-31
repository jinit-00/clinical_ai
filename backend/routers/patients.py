from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/patients", tags=["Patients"])

class Patient(BaseModel):
    id: str
    name: str
    age: int
    sex: str
    medical_history: str
    primary_condition: str
    last_visit: str

DEMO_PATIENTS: List[Patient] = [
    Patient(
        id="p1",
        name="Eleanor Vance",
        age=68,
        sex="Female",
        medical_history="Mild Cognitive Impairment, Essential Hypertension, Osteoarthritis",
        primary_condition="Memory loss monitoring & MRI review",
        last_visit="2026-08-15"
    ),
    Patient(
        id="p2",
        name="Arthur Pendelton",
        age=54,
        sex="Male",
        medical_history="Annual Wellness Check, Pre-diabetes (HbA1c 5.9%), Hyperlipidemia",
        primary_condition="Metabolic panel & Bloodwork review",
        last_visit="2026-08-20"
    ),
    Patient(
        id="p3",
        name="Maya Lin",
        age=32,
        sex="Female",
        medical_history="Post-op Follow-up, Mild Asthma, Seasonal Allergies",
        primary_condition="Medication reconciliation & Prescription check",
        last_visit="2026-08-28"
    )
]

@router.get("", response_model=List[Patient])
async def get_patients():
    """Retrieve list of demo patients."""
    return DEMO_PATIENTS

@router.get("/{patient_id}", response_model=Patient)
async def get_patient_by_id(patient_id: str):
    """Retrieve specific demo patient details."""
    patient = next((p for p in DEMO_PATIENTS if p.id == patient_id), None)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient
