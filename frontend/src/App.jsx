import React, { useState } from 'react';
import AgentChat from './components/AgentChat';
import DataViewer from './components/DataViewer';

export default function App() {
  // Estado global para los totales del tablero de riesgo
  const [summary, setSummary] = useState({
    conciliated_amount: 143000,
    risk_amount: 12500
  });

  // Estado global para la lista de facturas que muestra el visor de datos
  const [invoices, setInvoices] = useState([
    { folio: "FAC-1021", client: "Tech Solutions Ltd", amount: 45000, status: "Conciliado" },
    { folio: "FAC-1022", client: "Innovación Digital SA", amount: 12500, status: "Pendiente" },
    { folio: "FAC-1023", client: "Consultoría Global", amount: 98000, status: "Conciliado" }
  ]);

  // Función que se ejecuta cuando el backend /api/reconcile procesa un estado de cuenta
  const handleReconciliationData = (newSummary, newInvoices) => {
    setSummary(newSummary);
    setInvoices(newInvoices);
  };

  return (
    <div className="app-container">
      <div className="main-content">
        {/* Encabezado Superior */}
        <header style={{
          height: '60px',
          backgroundColor: '#1e293b',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px'
        }}>
          <h1 style={{ fontSize: '18px', fontWeight: '600' }}>
            PluriOne FinTech | Arquitectura Agéntica Corporativa
          </h1>
          <span style={{ fontSize: '14px', color: '#94a3b8' }}>Usuario: Diego Jahir Almazán</span>
        </header>

        {/* Zona de Trabajo Dividida */}
        <div className="workspace">
          {/* Pasamos la función de actualización al Chat donde se suben los archivos */}
          <AgentChat onReconcileSuccess={handleReconciliationData} />
          
          {/* Pasamos los datos calculados al visor del tablero */}
          <DataViewer summary={summary} invoices={invoices} />
        </div>
      </div>
    </div>
  );
}