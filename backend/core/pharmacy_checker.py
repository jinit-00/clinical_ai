import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

"""
Mock Pharmacy Inventory Checker Interface.

NOTE FOR EHR INTEGRATION:
To swap in a real pharmacy API integration (e.g., Surescripts, NCPDP script standard, or hospital inventory):
Replace or subclass `PharmacyInventoryChecker` and override `check_availability()`.
The consultation mode UI and audio prescription extraction pipeline remain unchanged.
"""

MOCK_PHARMACIES = [
  {"name": "Apex Care Pharmacy", "distance_km": 0.8, "address": "142 Medical Center Blvd"},
  {"name": "Metro Central Health", "distance_km": 1.4, "address": "500 Main Street, Suite 102"},
  {"name": "Sunlight Community Pharmacy", "distance_km": 2.2, "address": "88 Park Avenue"},
  {"name": "Wellness Point Pharmacy", "distance_km": 3.5, "address": "1200 Oak Ridge Road"}
]

# Drug inventory database (drug_key -> stock availability per pharmacy)
MOCK_INVENTORY_DB = {
    "amoxicillin": {
        "Apex Care Pharmacy": {"in_stock": True, "alt": None},
        "Metro Central Health": {"in_stock": True, "alt": None},
        "Sunlight Community Pharmacy": {"in_stock": False, "alt": "Amoxicillin-Clavulanate 500mg or Cephalexin 500mg"},
        "Wellness Point Pharmacy": {"in_stock": True, "alt": None}
    },
    "metformin": {
        "Apex Care Pharmacy": {"in_stock": True, "alt": None},
        "Metro Central Health": {"in_stock": False, "alt": "Metformin ER 500mg extended release"},
        "Sunlight Community Pharmacy": {"in_stock": True, "alt": None},
        "Wellness Point Pharmacy": {"in_stock": True, "alt": None}
    },
    "lisinopril": {
        "Apex Care Pharmacy": {"in_stock": True, "alt": None},
        "Metro Central Health": {"in_stock": True, "alt": None},
        "Sunlight Community Pharmacy": {"in_stock": True, "alt": None},
        "Wellness Point Pharmacy": {"in_stock": False, "alt": "Enalapril 10mg or Losartan 25mg"}
    },
    "atorvastatin": {
        "Apex Care Pharmacy": {"in_stock": True, "alt": None},
        "Metro Central Health": {"in_stock": True, "alt": None},
        "Sunlight Community Pharmacy": {"in_stock": False, "alt": "Rosuvastatin 10mg"},
        "Wellness Point Pharmacy": {"in_stock": True, "alt": None}
    },
    "albuterol": {
        "Apex Care Pharmacy": {"in_stock": True, "alt": None},
        "Metro Central Health": {"in_stock": True, "alt": None},
        "Sunlight Community Pharmacy": {"in_stock": True, "alt": None},
        "Wellness Point Pharmacy": {"in_stock": True, "alt": None}
    }
}


class PharmacyInventoryChecker:
    def check_availability(self, drug_name: str, dosage: str = "", location: str = "default") -> List[Dict[str, Any]]:
        """
        Check pharmacy stock availability for a given drug and dosage.
        Returns a list of local pharmacies with stock status and generic alternatives if out of stock.
        """
        drug_key = drug_name.lower().strip()
        # Find matching key in mock inventory
        matched_key = next((k for k in MOCK_INVENTORY_DB if k in drug_key), None)

        results = []
        for p in MOCK_PHARMACIES:
            p_name = p["name"]
            if matched_key and p_name in MOCK_INVENTORY_DB[matched_key]:
                stock_info = MOCK_INVENTORY_DB[matched_key][p_name]
                in_stock = stock_info["in_stock"]
                alt = stock_info["alt"]
            else:
                # Default mock logic for unlisted medications
                in_stock = True
                alt = None

            results.append({
                "name": p_name,
                "distance_km": p["distance_km"],
                "address": p["address"],
                "in_stock": in_stock,
                "alt_suggested_if_out_of_stock": alt
            })

        return results


pharmacy_checker = PharmacyInventoryChecker()
