import base64
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from core.mri_analyzer import mri_analyzer

router = APIRouter(prefix="/mri", tags=["MRI Review"])

@router.post("/analyze")
async def analyze_mri_endpoint(
    file: UploadFile = File(...),
    joint: str = Form("knee")
):
    """
    Upload an MRI slice image (JPEG/PNG or DICOM .dcm) + joint selector (knee/shoulder).
    Parses DICOM, executes pretrained/vision ROI detection, and generates dual summaries.
    """
    if not file:
        raise HTTPException(status_code=400, detail="No image file provided.")

    try:
        file_bytes = await file.read()
        png_bytes, mime_type, dimensions = mri_analyzer.parse_dicom_or_image(
            file_bytes=file_bytes,
            filename=file.filename or ""
        )

        analysis = await mri_analyzer.analyze_mri(
            image_bytes=png_bytes,
            joint=joint
        )

        base64_image = base64.b64encode(png_bytes).decode('utf-8')
        image_data_url = f"data:{mime_type};base64,{base64_image}"

        return {
            "success": True,
            "filename": file.filename,
            "dimensions": {"width": dimensions[0], "height": dimensions[1]},
            "image_data_url": image_data_url,
            "joint": analysis["joint"],
            "findings": analysis["findings"],
            "summary_text": analysis["summary_text"],
            "clinician_summary": analysis["clinician_summary"],
            "patient_summary": analysis["patient_summary"]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MRI Analysis failed: {str(e)}")
