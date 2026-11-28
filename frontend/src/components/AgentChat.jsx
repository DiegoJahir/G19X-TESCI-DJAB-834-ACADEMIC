import React, { useState, useEffect, useRef } from 'react';
import { Upload, Bot, Send } from 'lucide-react';

const INITIAL_MESSAGES = [
  {
    sender: 'bot',
    text: 'Hola, soy el Orquestador Financiero. Inicia sesión en la parte superior e indícame una instrucción o sube un estado de cuenta en CSV, Excel o PDF.'
  }
];

export default function AgentChat({ onReconcileSuccess, resetSignal = 0 }) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setMessages(INITIAL_MESSAGES);
    setInput('');
  }, [resetSignal]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setMessages(prev => [
        ...prev,
        { sender: 'bot', text: 'Inicia sesión en la parte superior antes de subir un estado de cuenta.' }
      ]);
      return;
    }

    setMessages(prev => [
      ...prev,
      { sender: 'user', text: `Archivo cargado: ${file.name}` },
      { sender: 'bot', text: 'Procesando estado de cuenta con autenticación en FastAPI...' }
    ]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/reconcile', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData,
      });

      if (response.status === 401) {
        setMessages(prev => {
          const updated = [...prev];
          updated.pop();
          return [...updated, { sender: 'bot', text: 'Sesión expirada o no autorizada. Vuelve a iniciar sesión.' }];
        });
        return;
      }

      if (!response.ok) {
        let errorMsg = 'Error al procesar el archivo. Revisa el formato (CSV, XLSX, XLS o PDF).';
        try {
          const errData = await response.json();
          if (errData?.detail) errorMsg = errData.detail;
        } catch (_) {}

        setMessages(prev => {
          const updated = [...prev];
          updated.pop();
          return [...updated, { sender: 'bot', text: errorMsg }];
        });
        return;
      }

      const data = await response.json();

      if (onReconcileSuccess) {
        onReconcileSuccess(data.summary, data.invoices, file.name);
      }

      const unmatchedCount = Array.isArray(data?.summary?.unmatched_abonos)
        ? data.summary.unmatched_abonos.length
        : 0;

      const summaryNote = unmatchedCount > 0
        ? ` Se detectaron ${unmatchedCount} movimiento(s) sin conciliar.`
        : '';

      setMessages(prev => {
        const updated = [...prev];
        updated.pop();
        return [
          ...updated,
          { sender: 'bot', text: `Conciliación completada. El tablero se ha actualizado.${summaryNote}` }
        ];
      });
    } catch (error) {
      console.error('Error conectando con la API:', error);
      setMessages(prev => {
        const updated = [...prev];
        updated.pop();
        return [...updated, { sender: 'bot', text: 'Error de conexión con el servidor FastAPI.' }];
      });
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setMessages(prev => [
        ...prev,
        { sender: 'bot', text: 'Inicia sesión en la parte superior para usar el chat agéntico.' }
      ]);
      return;
    }

    const userMessage = input;
    setInput('');

    setMessages(prev => [
      ...prev,
      { sender: 'user', text: userMessage },
      { sender: 'bot', text: 'Consultando al agente...' }
    ]);
    setIsLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: userMessage }),
      });

      if (response.status === 401) {
        throw new Error('No autorizado. Inicia sesión nuevamente.');
      }

      if (!response.ok) {
        throw new Error('Error en la respuesta del servidor');
      }

      const data = await response.json();

      setMessages(prev => {
        const newMessages = [...prev];
        newMessages.pop();
        return [...newMessages, { sender: 'bot', text: data.response }];
      });
    } catch (error) {
      console.error('Error conectando con el agente:', error);
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages.pop();
        return [...newMessages, { sender: 'bot', text: error.message || 'No se pudo conectar con el agente.' }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="panel" style={{ gap: '15px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Consola Agéntica IA</h2>
        <span style={{
          fontSize: '11px',
          backgroundColor: '#e0f2fe',
          color: '#0369a1',
          padding: '3px 8px',
          borderRadius: '10px',
          fontWeight: '600'
        }}>
          Asistente Conectado
        </span>
      </div>

      <input
        type="file"
        id="file-input"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
        accept=".csv,.xlsx,.xls,.pdf"
      />
      <label
        htmlFor="file-input"
        style={{
          border: '2px dashed #4a90e2',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#f0f7ff',
          cursor: 'pointer',
          display: 'block'
        }}
      >
        <Upload size={32} color="#4a90e2" />
        <p style={{ marginTop: '8px', fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>
          Arrastra tu Estado de Cuenta (CSV / Excel / PDF)
        </p>
        <span style={{ fontSize: '12px', color: '#666' }}>Soporta CSV, XLSX, XLS y PDF</span>
      </label>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '5px' }}>
        {messages.map((msg, index) => (
          <div key={index} style={{
            alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
            backgroundColor: msg.sender === 'user' ? '#007bff' : '#f1f3f5',
            color: msg.sender === 'user' ? '#fff' : '#333',
            padding: '10px 14px',
            borderRadius: '12px',
            maxWidth: '85%',
            fontSize: '14px'
          }}>
            {msg.sender === 'bot' && <Bot size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />}
            {msg.text}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          placeholder={isLoading ? 'El agente está respondiendo...' : 'Escribe una instrucción...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={isLoading}
          style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isLoading}
          style={{
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            padding: '10px 15px',
            borderRadius: '6px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1
          }}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}