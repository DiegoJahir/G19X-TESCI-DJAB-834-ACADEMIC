import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  RotateCcw,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';

const EMPTY_SUMMARY = {
  conciliated_amount: 0,
  risk_amount: 0,
  unmatched_abonos: [],
  unmatched_details: [],
};

function decodeRoleFromToken(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    return parsed?.role || null;
  } catch {
    return null;
  }
}

export default function DataViewer({
  summary,
  invoices,
  reconciliationHistory = [],
  authToken,
  currentUser,
  onResetSuccess,
  onResetComplete,
}) {
  const [currentSummary, setCurrentSummary] = useState(summary || EMPTY_SUMMARY);
  const [currentInvoices, setCurrentInvoices] = useState(Array.isArray(invoices) ? invoices : []);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  const token = authToken || localStorage.getItem('token');
  const effectiveRole = currentUser?.role || decodeRoleFromToken(token);
  const canReset = effectiveRole === 'admin' || effectiveRole === 'analyst';

  useEffect(() => {
    if (summary) {
      setCurrentSummary({
        conciliated_amount: Number(summary.conciliated_amount ?? 0),
        risk_amount: Number(summary.risk_amount ?? 0),
        unmatched_abonos: Array.isArray(summary.unmatched_abonos) ? summary.unmatched_abonos : [],
        unmatched_details: Array.isArray(summary.unmatched_details) ? summary.unmatched_details : [],
      });
    }
  }, [summary]);

  useEffect(() => {
    if (Array.isArray(invoices)) {
      setCurrentInvoices(invoices);
    }
  }, [invoices]);

  const fetchDashboardData = async () => {
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
            unmatched_abonos: Array.isArray(data.summary.unmatched_abonos)
              ? data.summary.unmatched_abonos
              : [],
            unmatched_details: Array.isArray(data.summary.unmatched_details)
              ? data.summary.unmatched_details
              : [],
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

  const handleResetInvoices = async () => {
    if (!token || resetting) return;

    setResetting(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/invoices/reset', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchDashboardData();
        if (typeof onResetSuccess === 'function') {
          onResetSuccess();
        }
        if (typeof onResetComplete === 'function') {
          onResetComplete();
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        alert(errData.detail || 'No fue posible resetear las facturas.');
      }
    } catch (error) {
      console.error('Error al resetear facturas:', error);
      alert('Error de conexión al intentar resetear las facturas.');
    } finally {
      setResetting(false);
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

    const headers = ['Folio', 'Cliente', 'Monto', 'Monto Abonado', 'Saldo Pendiente', 'Estado'];
    const rows = currentInvoices.map((row) => {
      const amt = Number(row.amount || 0);
      const paid = Number(row.paid_amount ?? 0);
      const pending =
        row.pending_balance !== undefined
          ? Number(row.pending_balance)
          : Math.max(0, amt - paid);

      return [
        escapeCsvValue(row.folio),
        escapeCsvValue(row.client || row.cliente || ''),
        escapeCsvValue(amt.toFixed(2)),
        escapeCsvValue(paid.toFixed(2)),
        escapeCsvValue(pending.toFixed(2)),
        escapeCsvValue(row.status || 'Pendiente'),
      ];
    });

    const summaryRows = [
      [],
      [escapeCsvValue('Resumen'), '', '', '', '', ''],
      [
        escapeCsvValue('Cuentas Conciliadas (MXN)'),
        escapeCsvValue(Number(currentSummary.conciliated_amount || 0).toFixed(2)),
        '',
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
        '',
      ],
    ];

    const csvContent =
      '\uFEFF' +
      [
        headers.map(escapeCsvValue).join(','),
        ...rows.map((r) => r.join(',')),
        ...summaryRows.map((r) => r.join(',')),
      ].join('\r\n');

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

  const renderInvoicesTable = (rows) => (
    <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
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
          {Array.isArray(rows) && rows.length > 0 ? (
            rows.map((row, index) => {
              const statusText = row.status || 'Pendiente';
              const badgeStyle = getBadgeStyle(statusText);
              const paidAmt = Number(row.paid_amount ?? 0);
              return (
                <tr key={`${row.folio || 'row'}-${index}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
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
  );

  return (
    <div
      className="panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        overflowY: 'auto',
      }}
    >
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

          {canReset && (
            <button
              type="button"
              onClick={handleResetInvoices}
              disabled={resetting}
              title="Resetear saldos y estados de facturas a Pendiente (solo admin)"
              style={{
                background: '#fffbeb',
                border: '1px solid #fcd34d',
                cursor: resetting ? 'not-allowed' : 'pointer',
                color: '#92400e',
                padding: '6px 10px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                fontWeight: '600',
                opacity: resetting ? 0.7 : 1,
              }}
            >
              <RotateCcw size={14} /> {resetting ? 'Reseteando...' : 'Resetear pruebas'}
            </button>
          )}

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

      {/* Tabla Vigente */}
      <div>
        <h3 style={{ marginBottom: '10px', fontSize: '16px', color: '#334155' }}>
          Estado Actual de Facturas (PostgreSQL)
        </h3>
        {renderInvoicesTable(currentInvoices)}
      </div>

      {/* Historial por Estado de Cuenta Subido */}
      {Array.isArray(reconciliationHistory) && reconciliationHistory.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '4px' }}>
          <h3 style={{ fontSize: '16px', color: '#334155', margin: 0 }}>
            Historial de Estados de Cuenta Analizados
          </h3>

          {reconciliationHistory.map((item) => {
            const unmatchedList = Array.isArray(item?.summary?.unmatched_details)
              ? item.summary.unmatched_details
              : [];

            return (
              <div
                key={item.id}
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '14px',
                  backgroundColor: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>
                    <FileText size={16} color="#2563eb" />
                    <span>{item.fileName}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569' }}>
                    Conciliado:{' '}
                    <strong>
                      ${Number(item?.summary?.conciliated_amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                    </strong>{' '}
                    | Riesgo:{' '}
                    <strong>
                      ${Number(item?.summary?.risk_amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                    </strong>
                    {item.uploadedAt ? ` · ${item.uploadedAt}` : ''}
                  </div>
                </div>

                {renderInvoicesTable(item.invoices)}

                {unmatchedList.length > 0 && (
                  <div
                    style={{
                      backgroundColor: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      color: '#92400e',
                    }}
                  >
                    <strong>Movimientos sin conciliar en este archivo ({unmatchedList.length}):</strong>
                    <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
                      {unmatchedList.map((u, idx) => (
                        <li key={idx}>
                          ${Number(u.amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN —{' '}
                          {u.detail || 'Sin detalle'}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}