import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../api.js";
import BrowseClinicalHome from "../components/browse/BrowseClinicalHome.jsx";
import { useAuth } from "@/context/AuthContext.jsx";

export default function PatientBrowser() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [rows, setRows] = useState([]);
  const [crit, setCrit] = useState(null);

  useEffect(() => {
    apiGet("/patients")
      .then(setRows)
      .catch(console.error);
    apiGet("/featured-patients")
      .then((d) => {
        setCrit(d.critical_encounter_id);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (auth.role === "patient" && auth.patientEncounterId) {
      navigate(`/patient/${encodeURIComponent(auth.patientEncounterId)}`, { replace: true });
    }
  }, [auth.role, auth.patientEncounterId, navigate]);

  const loadCritical = () => {
    if (crit) navigate(`/patient/${encodeURIComponent(crit)}`);
  };

  return <BrowseClinicalHome rows={rows} criticalEncounterId={crit} onLoadCritical={loadCritical} />;
}
