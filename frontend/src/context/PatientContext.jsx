import React, { createContext, useContext, useState, useEffect } from 'react';

const PatientContext = createContext();

export const FALLBACK_PATIENTS = [
  {
    id: "p1",
    name: "Eleanor Vance",
    age: 68,
    sex: "Female",
    medical_history: "Mild Cognitive Impairment, Essential Hypertension, Osteoarthritis",
    primary_condition: "Memory loss monitoring & MRI review",
    last_visit: "2026-08-15"
  },
  {
    id: "p2",
    name: "Arthur Pendelton",
    age: 54,
    sex: "Male",
    medical_history: "Annual Wellness Check, Pre-diabetes (HbA1c 5.9%), Hyperlipidemia",
    primary_condition: "Metabolic panel & Bloodwork review",
    last_visit: "2026-08-20"
  },
  {
    id: "p3",
    name: "Maya Lin",
    age: 32,
    sex: "Female",
    medical_history: "Post-op Follow-up, Mild Asthma, Seasonal Allergies",
    primary_condition: "Medication reconciliation & Prescription check",
    last_visit: "2026-08-28"
  }
];

export const PatientProvider = ({ children }) => {
  const [patients, setPatients] = useState(FALLBACK_PATIENTS);
  const [selectedPatientId, setSelectedPatientId] = useState(FALLBACK_PATIENTS[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPatients = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/patients');
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setPatients(data);
          }
        }
      } catch (err) {
        console.warn("Using fallback patients due to network fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  const selectedPatient = patients.find(p => p.id === selectedPatientId) || patients[0];

  return (
    <PatientContext.Provider value={{
      patients,
      selectedPatient,
      selectedPatientId,
      setSelectedPatientId,
      loading,
      error
    }}>
      {children}
    </PatientContext.Provider>
  );
};

export const usePatient = () => {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error("usePatient must be used within a PatientProvider");
  }
  return context;
};
