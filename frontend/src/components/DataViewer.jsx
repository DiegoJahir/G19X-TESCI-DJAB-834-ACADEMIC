import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, FileSpreadsheet } from 'lucide-react';

const EMPTY_SUMMARY = {
  conciliated_amount: 0,
  risk_amount: 0,
};

export default function DataViewer({ summary, invoices, authToken }) {
  const [currentSummary, setCurrentSummary] = useState(summary || EMPTY_SUMMARY);
  const [currentInvoices, setCurrentInvoices] = useState(Array.isArray(invoices) ? invoices : []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (summary) {
      setCurrentSummary({
        conciliated_amount: Number(summary.conciliated_amount ?? 0),
        risk_amount: Number(summary.risk_amount ?? 0),
      });
    }
  }, [summary]);

  useEffect(() => {
    if (Array.isArray(invoices)) {
      setCurrentInvoices(invoices);
    }
  }, [invoices]);

  const fetchDashboardData = async () => {
    const token = authToken || localStorage.getItem('token');
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/invoices', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.summary) {
          setCurrentSummary({
            conciliated_amount: Number(data.summary.conciliated_amount ?? 0),
            risk_amount: Number(data.summary.risk_amount ?? 0),
          });
        }
        if (Array.isArray(data.invoices)) {
          setCurrentInvoices(data.invoices);
        }
      }
    } catch (error) {
      console.error('Error al cargar datos del tablero:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [authToken]);

  const escapeCsvValue = (value) => {
    const str = String(value ?? '');
    return `"${str.replace(/"/g, '""')}"`;
  };

  const handleExportReport = () => {
    if (!Array.isArray(currentInvoices) || currentInvoices.length === 0) {
      alert('No hay facturas registradas para exportar.');
      return;
    }

    const headers = ['Folio', 'Cliente', 'Monto', 'Monto Abonado', 'Estado'];
    const rows = currentInvoices.map((row) => [
      escapeCsvValue(row.folio),
      escapeCsvValue(row.client || row.cliente || ''),
      escapeCsvValue(Number(row.amount || 0).toFixed(2)),
      escapeCsvValue(Number(row.paid_amount ?? 0).toFixed(2)),
      escapeCsvValue(row.status || 'Pendiente'),
    ]);

    const summaryRows = [
      [],
      [escapeCsvValue('Resumen'), '', '', '', ''],
      [
        escapeCsvValue('Cuentas Conciliadas (MXN)'),
        escapeCsvValue(Number(currentSummary.conciliated_amount || 0).toFixed(2)),
        '',
        '',
        '',
      ],
      [
        escapeCsvValue('Alerta de Riesgo / Faltante (MXN)'),
        escapeCsvValue(Number(currentSummary.risk_amount || 0).toFixed(2)),
        '',
        '',
        '',
      ],
    ];

    const csvContent =
      '\uFEFF' +
      [headers.map(escapeCsvValue).join(','), ...rows.map((r) => r.join(',')), ...summaryRows.map((r) => r.join(','))].join(
        '\r\n'
      );

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `reporte_conciliacion_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getBadgeStyle = (statusText) => {
    if (statusText === 'Conciliado') {
      return { backgroundColor: '#dcfce7', color: '#166534' };
    }
    if (statusText === 'Parcial') {
      return { backgroundColor: '#dbeafe', color: '#1e40af' };
    }
    return { backgroundColor: '#fef9c3', color: '#854d0e' };
  };

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Tablero de Conciliación & Riesgo</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={fetchDashboardData}
            title="Actualizar datos desde la Base de Datos"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Actualizar
          </button>
          <button
            type="button"
            onClick={handleExportReport}
            title="Descargar reporte CSV del tablero actual"
            style={{
              padding: '8px 12px',
              background: '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
            }}
          >
            <FileSpreadsheet size={16} /> Exportar Reporte
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen Financiero y Riesgo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        <div
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            padding: '15px',
            borderRadius: '8px',
            borderLeft: '4px solid #28a745',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#166534',
              fontWeight: '600',
              fontSize: '14px',
            }}
          >
            <CheckCircle size={18} /> Cuentas Conciliadas
          </div>
          <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#15803d', margin: '8px 0 0 0' }}>
            ${Number(currentSummary.conciliated_amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
          </p>
        </div>

        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            padding: '15px',
            borderRadius: '8px',
            borderLeft: '4px solid #dc3545',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#991b1b',
              fontWeight: '600',
              fontSize: '14px',
            }}
          >
            <AlertTriangle size={18} /> Alerta de Riesgo (Faltante)
          </div>
          <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#b91c1c', margin: '8px 0 0 0' }}>
            ${Number(currentSummary.risk_amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
          </p>
        </div>
      </div>

      {/* Tabla de Resultados / Facturas */}
      <div>
        <h3 style={{ marginBottom: '10px', fontSize: '16px', color: '#334155' }}>
          Resultados de Análisis del Estado de Cuenta
        </h3>
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
                  const badgeStyle = getBadgeStyle(statusText);
                  const paidAmt = Number(row.paid_amount ?? 0);
                  return (
                    <tr key={row.folio || index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', fontWeight: '600', color: '#1e293b' }}>{row.folio}</td>
                      <td style={{ padding: '12px', color: '#334155' }}>{row.client || row.cliente}</td>
                      <td style={{ padding: '12px', color: '#334155' }}>
                        ${Number(row.amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                        {statusText === 'Parcial' && paidAmt > 0 && (
                          <div style={{ fontSize: '11px', color: '#1e40af' }}>
                            Abonado: ${paidAmt.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600',
                            ...badgeStyle,
                          }}
                        >
                          {statusText}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                    {loading
                      ? 'Cargando facturas desde PostgreSQL...'
                      : 'No hay facturas registradas en la base de datos.'}
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