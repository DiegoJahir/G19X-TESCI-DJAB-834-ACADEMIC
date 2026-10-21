import React from 'react';
import { FileSpreadsheet } from 'lucide-react';

export default function DataViewer({ summary, invoices }) {
  // Datos iniciales de respaldo por si aún no se sube archivo
  const displaySummary = summary || { conciliated_amount: 143000, risk_amount: 12500 };
  const displayInvoices = invoices || [
    { folio: 'FAC-1021', client: 'Tech Solutions Ltd', amount: 45000, status: 'Conciliado' },
    { folio: 'FAC-1022', client: 'Innovación Digital SA', amount: 12500, status: 'Pendiente' },
    { folio: 'FAC-1023', client: 'Consultoría Global', amount: 98000, status: 'Conciliado' },
  ];

  return (
    <div className="panel" style={{ gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Tablero de Conciliación & Riesgo</h2>
        <button style={{ padding: '8px 12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FileSpreadsheet size={16} /> Exportar Reporte
        </button>
      </div>

      {/* Tarjeta de Métricas de Riesgo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        <div style={{ background: '#eef9f1', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #28a745' }}>
          <span style={{ fontSize: '12px', color: '#555' }}>Cuentas Conciliadas</span>
          <h3 style={{ color: '#28a745', marginTop: '4px' }}>
            ${displaySummary.conciliated_amount.toLocaleString('es-MX')} MXN
          </h3>
        </div>
        <div style={{ background: '#fff5f5', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #dc3545' }}>
          <span style={{ fontSize: '12px', color: '#555' }}>Alerta de Riesgo (Faltante)</span>
          <h3 style={{ color: '#dc3545', marginTop: '4px' }}>
            ${displaySummary.risk_amount.toLocaleString('es-MX')} MXN
          </h3>
        </div>
      </div>

      {/* Tabla de Resultados */}
      <div>
        <h3 style={{ marginBottom: '10px', fontSize: '16px' }}>Resultados de Análisis del Estado de Cuenta</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              <th style={{ padding: '10px' }}>Folio</th>
              <th style={{ padding: '10px' }}>Cliente</th>
              <th style={{ padding: '10px' }}>Monto</th>
              <th style={{ padding: '10px' }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {displayInvoices.map((row) => {
              const isConciliated = row.status === 'Conciliado';
              return (
                <tr key={row.folio} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{row.folio}</td>
                  <td style={{ padding: '10px' }}>{row.client || row.cliente}</td>
                  <td style={{ padding: '10px' }}>
                    ${Number(row.amount || 0).toLocaleString('es-MX')} MXN
                  </td>
                  <td style={{ padding: '10px' }}>
                    <span style={{
                      backgroundColor: isConciliated ? '#28a745' : '#dc3545',
                      color: '#fff',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}