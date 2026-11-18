import React, { useEffect, useState } from 'react';
import { DollarSign, AlertTriangle, CheckCircle, RefreshCw, FileSpreadsheet } from 'lucide-react';

export default function DataViewer({ summary, invoices }) {
  // Datos iniciales de respaldo por si aún no se sube archivo o no hay datos
  const defaultSummary = summary || { conciliated_amount: 143000, risk_amount: 12500 };
  const defaultInvoices = invoices || [
    { folio: 'FAC-1021', client: 'Tech Solutions Ltd', amount: 45000, status: 'Conciliado' },
    { folio: 'FAC-1022', client: 'Innovación Digital SA', amount: 12500, status: 'Pendiente' },
    { folio: 'FAC-1023', client: 'Consultoría Global', amount: 98000, status: 'Conciliado' },
  ];

  // Estados locales sincronizados con las props o cargados por API al montar
  const [currentSummary, setCurrentSummary] = useState(defaultSummary);
  const [currentInvoices, setCurrentInvoices] = useState(defaultInvoices);
  const [loading, setLoading] = useState(false);

  // Sincronizar cuando el componente padre actualice los datos (ej: tras subir un archivo)
  useEffect(() => {
    if (summary) setCurrentSummary(summary);
    if (invoices) setCurrentInvoices(invoices);
  }, [summary, invoices]);

  // Petición automática al montar el componente para traer datos reales de PostgreSQL
  const fetchDashboardData = async () => {
    const token = localStorage.getItem('token');
    if (!token) return; // Si no hay sesión iniciada, esperamos al login

    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/api/invoices", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.summary) setCurrentSummary(data.summary);
        if (data.invoices) setCurrentInvoices(data.invoices);
      }
    } catch (error) {
      console.error("Error al cargar datos del tablero:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Tablero de Conciliación & Riesgo</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={fetchDashboardData}
            title="Actualizar datos desde la Base de Datos"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600' }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Actualizar
          </button>
          <button style={{ padding: '8px 12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <FileSpreadsheet size={16} /> Exportar Reporte
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen Financiero y Riesgo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #28a745' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: '600', fontSize: '14px' }}>
            <CheckCircle size={18} /> Cuentas Conciliadas
          </div>
          <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#15803d', margin: '8px 0 0 0' }}>
            ${Number(currentSummary.conciliated_amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
          </p>
        </div>

        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #dc3545' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', fontWeight: '600', fontSize: '14px' }}>
            <AlertTriangle size={18} /> Alerta de Riesgo (Faltante)
          </div>
          <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#b91c1c', margin: '8px 0 0 0' }}>
            ${Number(currentSummary.risk_amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
          </p>
        </div>
      </div>

      {/* Tabla de Resultados / Facturas */}
      <div>
        <h3 style={{ marginBottom: '10px', fontSize: '16px', color: '#334155' }}>Resultados de Análisis del Estado de Cuenta</h3>
        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
              <tr>
                <th style={{ padding: '12px' }}>Folio</th>
                <th style={{ padding: '12px' }}>Cliente</th>
                <th style={{ padding: '12px' }}>Monto</th>
                <th style={{ padding: '12px' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {currentInvoices.length > 0 ? (
                currentInvoices.map((row, index) => {
                  const statusText = row.status || 'Pendiente';
                  const isConciliated = statusText === 'Conciliado';
                  return (
                    <tr key={row.folio || index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', fontWeight: '600', color: '#1e293b' }}>{row.folio}</td>
                      <td style={{ padding: '12px', color: '#334155' }}>{row.client || row.cliente}</td>
                      <td style={{ padding: '12px', color: '#334155' }}>
                        ${Number(row.amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600',
                          backgroundColor: isConciliated ? '#dcfce7' : '#fef9c3',
                          color: isConciliated ? '#166534' : '#854d0e'
                        }}>
                          {statusText}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                    No hay facturas registradas en la base de datos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}