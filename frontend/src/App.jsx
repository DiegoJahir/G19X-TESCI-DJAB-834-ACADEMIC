import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import AgentChat from './components/AgentChat';
import DataViewer from './components/DataViewer';

export default function App() {
  const [summary, setSummary] = useState({
    conciliated_amount: 0,
    risk_amount: 0,
  });

  const [invoices, setInvoices] = useState([]);
  const [reconciliationHistory, setReconciliationHistory] = useState([]);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('token') || '');
  const [resetSignal, setResetSignal] = useState(0);

  const fetchDashboardData = async (tokenToUse) => {
    const token = tokenToUse || localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('http://127.0.0.1:8000/api/invoices', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.summary) setSummary(data.summary);
        if (data.invoices) setInvoices(data.invoices);
      }
    } catch (error) {
      console.error('Error al cargar el tablero desde la BD:', error);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setAuthToken(token);
      fetchDashboardData(token);
    }
  }, []);

  const handleLoginSuccess = (token) => {
    if (token) {
      setAuthToken(token);
    } else {
      setAuthToken(localStorage.getItem('token') || '');
    }
    fetchDashboardData(token);
  };

  const handleReconciliationData = (newSummary, newInvoices, fileName = '') => {
    if (newSummary) setSummary(newSummary);
    if (newInvoices) setInvoices(newInvoices);

    if (newInvoices || newSummary) {
      setReconciliationHistory((prev) => {
        const index = prev.length + 1;
        const entry = {
          id: `${Date.now()}-${index}`,
          fileName: fileName || `Estado de cuenta #${index}`,
          uploadedAt: new Date().toLocaleTimeString(),
          summary: newSummary || { conciliated_amount: 0, risk_amount: 0 },
          invoices: Array.isArray(newInvoices) ? newInvoices : [],
        };
        return [...prev, entry];
      });
    }
  };

  const handleResetSuccess = async () => {
    setReconciliationHistory([]);
    await fetchDashboardData();
    setResetSignal((prev) => prev + 1);
  };

  return (
    <div className="app-container">
      <div className="main-content">
        <Header onLoginSuccess={handleLoginSuccess} />

        <div className="workspace">
          <AgentChat
            onReconcileSuccess={handleReconciliationData}
            resetSignal={resetSignal}
          />
          <DataViewer
            summary={summary}
            invoices={invoices}
            reconciliationHistory={reconciliationHistory}
            authToken={authToken}
            onResetSuccess={handleResetSuccess}
          />
        </div>
      </div>
    </div>
  );
}