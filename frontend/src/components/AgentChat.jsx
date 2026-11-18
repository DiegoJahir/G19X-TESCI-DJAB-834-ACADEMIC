import React, { useState } from 'react';
import { Upload, Bot, Send } from 'lucide-react';

export default function AgentChat({ onReconcileSuccess }) {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hola, soy el Orquestador Financiero. Inicia sesión en la parte superior e indícame una instrucción o sube un estado de cuenta.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Manejador de subida de archivos hacia FastAPI con Token JWT obligatorio
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const token = localStorage.getItem('token');
    if (!token) {
      alert("Por favor inicia sesión en la parte superior antes de conciliar archivos.");
      return;
    }

    setMessages(prev => [
      ...prev,
      { sender: 'user', text: `Archivo cargado: ${file.name}` },
      { sender: 'bot', text: 'Procesando estado de cuenta con autenticación en FastAPI...' }
    ]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/reconcile", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}` // <-- Token JWT adjunto
        },
        body: formData,
      });

      if (response.status === 401) {
        alert("Sesión expirada o no autorizada. Por favor vuelve a iniciar sesión.");
        return;
      }

      if (!response.ok) {
        setMessages(prev => [
          ...prev,
          { sender: 'bot', text: 'Error al procesar el archivo. Revisa tus permisos o formato.' }
        ]);
        return;
      }

      const data = await response.json();

      if (onReconcileSuccess) {
        onReconcileSuccess(data.summary, data.invoices);
      }

      setMessages(prev => [
        ...prev,
        { sender: 'bot', text: '¡Conciliación completada de forma segura! El tablero se ha actualizado.' }
      ]);
    } catch (error) {
      console.error("Error conectando con la API:", error);
      setMessages(prev => [
        ...prev,
        { sender: 'bot', text: 'Error de conexión con el servidor FastAPI.' }
      ]);
    }
  };

  // Manejador del chat conectado al endpoint protegido /api/chat
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const token = localStorage.getItem('token');
    if (!token) {
      alert("Por favor inicia sesión en la parte superior para usar el chat agéntico.");
      return;
    }

    const userMessage = input;
    setInput('');
    
    setMessages(prev => [
      ...prev,
      { sender: 'user', text: userMessage },
      { sender: 'bot', text: 'Analizando tu petición con los agentes de seguridad y riesgo...' }
    ]);
    setIsLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` // <-- Token JWT adjunto
        },
        body: JSON.stringify({ message: userMessage }),
      });

      if (response.status === 401) {
        throw new Error("No autorizado. Inicia sesión nuevamente.");
      }

      if (!response.ok) {
        throw new Error("Error en la respuesta del servidor");
      }

      const data = await response.json();

      setMessages(prev => {
        const newMessages = [...prev];
        newMessages.pop();
        return [...newMessages, { sender: 'bot', text: data.response }];
      });
    } catch (error) {
      console.error("Error conectando con el agente:", error);
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages.pop();
        return [...newMessages, { sender: 'bot', text: `Error: ${error.message || 'No se pudo conectar con el agente.'}` }];
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
          Modo Demo / Asistente Conectado
        </span>
      </div>
      
      <input
        type="file"
        id="file-input"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
        accept=".csv,.xlsx,.xls"
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
          Arrastra tu Estado de Cuenta (PDF/Excel)
        </p>
        <span style={{ fontSize: '12px', color: '#666' }}>Soporta XLSX, CSV y XLS</span>
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
          placeholder={isLoading ? "El agente está respondiendo..." : "Escribe una instrucción..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={isLoading}
          style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
        />
        <button 
          onClick={handleSend} 
          disabled={isLoading}
          style={{ backgroundColor: '#007bff', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1 }}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}