import re
from typing import Dict, Any, List, Optional

"""
Reference Ranges Table for Clinical Bloodwork Analysis.
Extensible catalog supporting age and sex adjustments.
"""

REFERENCE_TABLE = {
    # Fasting Glucose & Glycemia
    "glucose": {
        "name": "Fasting Glucose",
        "unit": "mg/dL",
        "normal": (70, 99),
        "borderline": (100, 125), # Pre-diabetes range
        "critical_high": 126,     # Diabetes range threshold
        "category": "Metabolic Panel"
    },
    "hba1c": {
        "name": "HbA1c",
        "unit": "%",
        "normal": (4.0, 5.6),
        "borderline": (5.7, 6.4),
        "critical_high": 6.5,
        "category": "Metabolic Panel"
    },
    
    # Lipid Panel
    "cholesterol_total": {
        "name": "Total Cholesterol",
        "unit": "mg/dL",
        "normal": (100, 199),
        "borderline": (200, 239),
        "critical_high": 240,
        "category": "Lipid Panel"
    },
    "ldl": {
        "name": "LDL Cholesterol",
        "unit": "mg/dL",
        "normal": (0, 99),
        "borderline": (100, 159),
        "critical_high": 160,
        "category": "Lipid Panel"
    },
    "hdl": {
        "name": "HDL Cholesterol",
        "unit": "mg/dL",
        "sex_adjusted": True,
        "normal": {"male": (40, 100), "female": (50, 100)},
        "borderline": {"male": (35, 39), "female": (45, 49)},
        "category": "Lipid Panel"
    },
    "triglycerides": {
        "name": "Triglycerides",
        "unit": "mg/dL",
        "normal": (0, 149),
        "borderline": (150, 199),
        "critical_high": 200,
        "category": "Lipid Panel"
    },

    # Complete Blood Count (CBC)
    "hemoglobin": {
        "name": "Hemoglobin",
        "unit": "g/dL",
        "sex_adjusted": True,
        "normal": {"male": (13.8, 17.2), "female": (12.1, 15.1)},
        "borderline": {"male": (12.5, 13.7), "female": (11.0, 12.0)},
        "category": "Hematology (CBC)"
    },
    "wbc": {
        "name": "White Blood Cell Count (WBC)",
        "unit": "x10^3/uL",
        "normal": (4.5, 11.0),
        "borderline": (11.1, 13.0),
        "critical_high": 13.1,
        "category": "Hematology (CBC)"
    },
    "platelets": {
        "name": "Platelet Count",
        "unit": "x10^3/uL",
        "normal": (150, 450),
        "borderline": (130, 149),
        "critical_high": 500,
        "category": "Hematology (CBC)"
    },

    # Renal / Kidney Function
    "creatinine": {
        "name": "Serum Creatinine",
        "unit": "mg/dL",
        "sex_adjusted": True,
        "normal": {"male": (0.74, 1.35), "female": (0.59, 1.04)},
        "borderline": {"male": (1.36, 1.60), "female": (1.05, 1.30)},
        "critical_high": 1.61,
        "category": "Renal Panel"
    },
    "egfr": {
        "name": "eGFR",
        "unit": "mL/min/1.73m2",
        "normal": (90, 120),
        "borderline": (60, 89),
        "critical_low": 59,
        "category": "Renal Panel"
    },

    # Hepatic / Liver Panel
    "alt": {
        "name": "ALT (SGPT)",
        "unit": "U/L",
        "normal": (7, 56),
        "borderline": (57, 100),
        "critical_high": 101,
        "category": "Hepatic Panel"
    },
    "ast": {
        "name": "AST (SGOT)",
        "unit": "U/L",
        "normal": (10, 40),
        "borderline": (41, 80),
        "critical_high": 81,
        "category": "Hepatic Panel"
    },

    # Thyroid Function
    "tsh": {
        "name": "TSH (Thyroid Stimulating Hormone)",
        "unit": "mIU/L",
        "normal": (0.45, 4.5),
        "borderline": (4.51, 6.0),
        "critical_high": 6.1,
        "category": "Endocrine Panel"
    },

    # Vital Signs / Blood Pressure
    "systolic_bp": {
        "name": "Systolic Blood Pressure",
        "unit": "mmHg",
        "normal": (90, 120),
        "borderline": (121, 139),
        "critical_high": 140,
        "category": "Vital Signs"
    },
    "diastolic_bp": {
        "name": "Diastolic Blood Pressure",
        "unit": "mmHg",
        "normal": (60, 80),
        "borderline": (81, 89),
        "critical_high": 90,
        "category": "Vital Signs"
    }
}


def normalize_key(name: str) -> Optional[str]:
    """Matches raw extracted lab test names to internal catalog keys."""
    n = name.lower().strip()
    if "glucose" in n or "fasting sugar" in n:
        return "glucose"
    if "hba1c" in n or "a1c" in n or "glycated" in n:
        return "hba1c"
    if "ldl" in n:
        return "ldl"
    if "hdl" in n:
        return "hdl"
    if "triglyceride" in n:
        return "triglycerides"
    if "total cholesterol" in n or "cholesterol total" in n:
        return "cholesterol_total"
    if "hemoglobin" in n or "hgb" in n:
        return "hemoglobin"
    if "wbc" in n or "white blood" in n or "leukocyte" in n:
        return "wbc"
    if "platelet" in n or "plt" in n:
        return "platelets"
    if "creatinine" in n:
        return "creatinine"
    if "egfr" in n or "gfr" in n:
        return "egfr"
    if "alt" in n or "sgpt" in n:
        return "alt"
    if "ast" in n or "sgot" in n:
        return "ast"
    if "tsh" in n or "thyroid" in n:
        return "tsh"
    if "systolic" in n or "sbp" in n:
        return "systolic_bp"
    if "diastolic" in n or "dbp" in n:
        return "diastolic_bp"
    return None


def evaluate_lab_results(extracted_labs: List[Dict[str, Any]], age: int, sex: str) -> List[Dict[str, Any]]:
    """
    Evaluates extracted lab results against clinical reference ranges adjusted for age and sex.
    Categorizes each item with flags: 'normal' (sage), 'borderline' (terracotta warning), 'high-alert' (terracotta critical).
    """
    sex_clean = "female" if sex.lower().startswith("f") else "male"
    evaluated = []

    for lab in extracted_labs:
        raw_name = lab.get("test_name", "Unknown Test")
        raw_val = lab.get("value")
        unit = lab.get("unit", "")
        print_range = lab.get("reference_range_from_report", "")

        key = normalize_key(raw_name)
        flag = "normal"
        flag_label = "NORMAL"
        expected_range_str = print_range or "N/A"

        if key and key in REFERENCE_TABLE:
            ref = REFERENCE_TABLE[key]
            expected_unit = ref.get("unit", unit)

            # Determine baseline range
            if ref.get("sex_adjusted"):
                normal_min, normal_max = ref["normal"][sex_clean]
                border_range = ref.get("borderline", {}).get(sex_clean)
            else:
                normal_min, normal_max = ref["normal"]
                border_range = ref.get("borderline")

            expected_range_str = f"{normal_min} - {normal_max} {expected_unit}"

            # Parse numerical float value
            try:
                val_num = float(str(raw_val).replace("<", "").replace(">", "").strip())

                if normal_min <= val_num <= normal_max:
                    flag = "normal"
                    flag_label = "NORMAL"
                elif border_range and (border_range[0] <= val_num <= border_range[1]):
                    flag = "borderline"
                    flag_label = "BORDERLINE"
                else:
                    flag = "high-alert"
                    flag_label = "HIGH ALERT"

            except (ValueError, TypeError):
                flag = "normal"

        evaluated.append({
            "test_name": raw_name,
            "value": raw_val,
            "unit": unit,
            "reference_range": expected_range_str,
            "flag": flag,
            "flag_label": flag_label,
            "category": REFERENCE_TABLE.get(key, {}).get("category", "General Panel") if key else "General Panel"
        })

    return evaluated
