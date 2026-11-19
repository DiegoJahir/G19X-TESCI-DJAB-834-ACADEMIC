import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import AgentChat from './components/AgentChat';
import DataViewer from './components/DataViewer';

export default function App() {
  // Estado inicial dinámico (vacío/ceros hasta consultar PostgreSQL o datos por defecto)
  const [summary, setSummary] = useState({
    conciliated_amount: 0,
    risk_amount: 0
  });

  const [invoices, setInvoices] = useState([]);

  // Función para obtener los datos reales desde la API y PostgreSQL
  const fetchDashboardData = async (tokenToUse) => {
    const token = tokenToUse || localStorage.getItem('token');
    if (!token) return; // Si no hay sesión, no intentamos la petición

    try {
      const response = await fetch("http://127.0.0.1:8000/api/invoices", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.summary) setSummary(data.summary);
        if (data.invoices) setInvoices(data.invoices);
      }
    } catch (error) {
      console.error("Error al cargar el tablero desde la BD:", error);
    }
  };

  // Cargar datos al montar la aplicación si ya existe un token en localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchDashboardData(token);
    }
  }, []);

  // Callback cuando el usuario inicia sesión exitosamente desde el Header
  const handleLoginSuccess = (token) => {
    fetchDashboardData(token);
  };

  // Función que se ejecuta cuando el backend procesa una conciliación
  const handleReconciliationData = (newSummary, newInvoices) => {
    if (newSummary) setSummary(newSummary);
    if (newInvoices) setInvoices(newInvoices);
  };

  return (
    <div className="app-container">
      <div className="main-content">
        {/* Encabezado Superior con el control de Autenticación integrado */}
        <Header onLoginSuccess={handleLoginSuccess} />

        {/* Zona de Trabajo Dividida */}
        <div className="workspace">
          {/* Pasamos la función de actualización al Chat */}
          <AgentChat onReconcileSuccess={handleReconciliationData} />
          
          {/* Pasamos los datos dinámicos al visor del tablero */}
          <DataViewer summary={summary} invoices={invoices} />
        </div>
      </div>
    </div>
  );
}