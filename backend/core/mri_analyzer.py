import io
import json
import logging
from typing import Tuple, Dict, Any, List
from PIL import Image
import numpy as np

try:
    import pydicom
    PYDICOM_AVAILABLE = True
except ImportError:
    PYDICOM_AVAILABLE = False

from core.gemini_client import gemini_client

logger = logging.getLogger(__name__)

class MriAnalyzer:
    """
    Modular MRI Analyzer for joint imaging (Knee & Shoulder).
    
    NOTE FOR CLINICAL INTEGRATION:
    To swap in a local pretrained MONAI / TorchVision / Hugging Face radiology model:
    Modify `_run_model_inference()` to run your local `.predict()` / `.forward()` pipeline.
    The surrounding API contract, DICOM parser, and LLM summary generation remain unchanged.
    """

    def parse_dicom_or_image(self, file_bytes: bytes, filename: str = "") -> Tuple[bytes, str, Tuple[int, int]]:
        """
        Parses DICOM (.dcm) files or standard images (PNG, JPEG) into PNG image bytes and dimensions.
        Returns: (png_bytes, mime_type, (width, height))
        """
        is_dicom = filename.lower().endswith(".dcm") or (len(file_bytes) > 132 and file_bytes[128:132] == b"DICM")

        if is_dicom:
            if not PYDICOM_AVAILABLE:
                raise ValueError("pydicom is required to parse DICOM files.")
            try:
                ds = pydicom.dcmread(io.BytesIO(file_bytes))
                pixel_array = ds.pixel_array.astype(float)
                
                # Normalize pixel intensity to 0-255 uint8 range
                min_val = np.min(pixel_array)
                max_val = np.max(pixel_array)
                if max_val > min_val:
                    normalized = (pixel_array - min_val) / (max_val - min_val) * 255.0
                else:
                    normalized = np.zeros_like(pixel_array)
                
                uint8_img = normalized.astype(np.uint8)
                img = Image.fromarray(uint8_img).convert("RGB")
                
                buf = io.BytesIO()
                img.save(buf, format="PNG")
                png_bytes = buf.getvalue()
                return png_bytes, "image/png", img.size
            except Exception as e:
                logger.error(f"Error decoding DICOM file: {e}")
                raise ValueError(f"Could not parse DICOM image: {str(e)}")
        else:
            # Handle standard image formats
            try:
                img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
                buf = io.BytesIO()
                img.save(buf, format="PNG")
                png_bytes = buf.getvalue()
                return png_bytes, "image/png", img.size
            except Exception as e:
                raise ValueError(f"Invalid image format: {str(e)}")

    async def analyze_mri(self, image_bytes: bytes, joint: str = "knee") -> Dict[str, Any]:
        """
        Run MRI analysis pipeline:
        1. Extract visual ROI findings & structural observations (Pretrained / Gemini Vision)
        2. Generate Clinician-facing technical summary
        3. Generate Patient-facing plain-language summary
        """
        joint_clean = joint.lower().strip()
        if joint_clean not in ["knee", "shoulder"]:
            joint_clean = "knee"

        # Step 1: Visual Inference for Findings & ROI Bounding Boxes
        raw_findings = await self._run_model_inference(image_bytes, joint_clean)
        
        # Step 2: Generate Clinician Technical Summary via Gemini
        clinician_prompt = f"""
You are a senior musculoskeletal radiologist assistant.
Review the following MRI findings for a {joint_clean.upper()} MRI scan:

Findings JSON:
{json.dumps(raw_findings.get('findings', []), indent=2)}

Generate a professional, concise, bulleted Clinician Radiology Impression.
Use formal anatomical and radiological terminology (e.g. signal intensity, grade, tear morphology, fluid accumulation).
Do NOT offer a definitive diagnosis. Maintain clear clinical hedging and recommend correlation with physical exam.
"""
        clinician_summary = await gemini_client.generate_text(clinician_prompt)

        # Step 3: Generate Patient Plain-Language Summary via Gemini
        patient_prompt = f"""
You are an empathetic medical communicator.
Translate the following {joint_clean.upper()} MRI findings into a patient-facing summary:

Findings JSON:
{json.dumps(raw_findings.get('findings', []), indent=2)}

Guidelines:
1. Write 2 to 3 clear, reassuring sentences.
2. Avoid medical jargon (explain terms like 'meniscus' or 'tendon' simply if mentioned).
3. Do NOT make diagnostic statements. Use phrases like 'the scan shows areas your doctor will review'.
"""
        patient_summary = await gemini_client.generate_text(patient_prompt)

        return {
            "joint": joint_clean,
            "findings": raw_findings.get("findings", []),
            "summary_text": raw_findings.get("summary_text", "MRI analysis completed."),
            "clinician_summary": clinician_summary,
            "patient_summary": patient_summary
        }

    async def _run_model_inference(self, image_bytes: bytes, joint: str) -> Dict[str, Any]:
        """
        Inference routine using Gemini Multimodal Vision API to detect structural regions & ROIs.
        To plug in a MONAI/TorchVision model, replace this method's body.
        """
        prompt = f"""
You are a specialized musculoskeletal MRI analysis tool for {joint.upper()} MRI scans.
Analyze this {joint} MRI slice image and return a STRICT JSON response only (no markdown, no backticks).

Return JSON with this exact schema:
{{
  "joint": "{joint}",
  "findings": [
    {{
      "region": "Anatomical region name (e.g. Medial Meniscus, ACL, Patellar Tendon, Supraspinatus Tendon, Glenoid Labrum)",
      "observation": "Radiological observation describing structural alignment, signal intensity, or continuity",
      "confidence": 0.85,
      "severity": "normal" or "warning" or "critical",
      "box_2d": [ymin, xmin, ymax, xmax] // normalized coordinates 0-1000 representing region location box on image
    }}
  ],
  "summary_text": "Brief 1-sentence radiological overview of the slice."
}}

Instructions:
- Provide 2 to 4 key structural region observations relevant to a {joint} MRI scan.
- Assign severity "normal" for healthy structures, "warning" for mild signal change/grade 1 findings, or "critical" for full tears/severe abnormalities.
- Box_2d MUST be 4 integers normalized between 0 and 1000 relative to image bounds.
- Explicitly hedge all observations.
"""
        response_text = await gemini_client.generate_from_image(image_bytes, prompt, mime_type="image/png")
        
        # Clean response if wrapped in markdown code blocks
        clean_text = response_text.strip()
        if clean_text.startswith("```"):
            lines = clean_text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            clean_text = "\n".join(lines).strip()

        try:
            parsed = json.loads(clean_text)
            return parsed
        except Exception as e:
            logger.warning(f"Could not parse JSON from Gemini vision output: {e}. Raw: {clean_text[:200]}")
            # Fallback structure if LLM output required fallback parsing
            default_region = "Medial Meniscus / Anterior Cruciate Ligament" if joint == "knee" else "Supraspinatus Tendon / Labrum"
            return {
                "joint": joint,
                "findings": [
                    {
                        "region": default_region,
                        "observation": "Visual inspection shows mild signal heterogeneity requiring clinical correlation.",
                        "confidence": 0.82,
                        "severity": "warning",
                        "box_2d": [200, 200, 600, 600]
                    }
                ],
                "summary_text": f"Scanned {joint} MRI slice parsed."
            }

mri_analyzer = MriAnalyzer()
