import React, { useState } from 'react';
import { Upload, Bot, Send } from 'lucide-react';

export default function AgentChat({ onReconcileSuccess }) {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hola Diego, soy el Orquestador Financiero. Sube un estado de cuenta en PDF o Excel para comenzar la conciliación o escríbeme una instrucción.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Manejador de subida de archivos hacia FastAPI
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setMessages(prev => [
      ...prev,
      { sender: 'user', text: `Archivo cargado: ${file.name}` },
      { sender: 'bot', text: 'Procesando estado de cuenta con el backend de FastAPI...' }
    ]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/reconcile", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        setMessages(prev => [
          ...prev,
          { sender: 'bot', text: 'Error al procesar el archivo. Revisa que sea un CSV o Excel válido.' }
        ]);
        return;
      }

      const data = await response.json();

      // Notificar a App.jsx para actualizar los componentes en tiempo real
      if (onReconcileSuccess) {
        onReconcileSuccess(data.summary, data.invoices);
      }

      setMessages(prev => [
        ...prev,
        { sender: 'bot', text: '¡Conciliación completada! El tablero se ha actualizado con los resultados dinámicos.' }
      ]);
    } catch (error) {
      console.error("Error conectando con la API:", error);
      setMessages(prev => [
        ...prev,
        { sender: 'bot', text: 'Error de conexión con el servidor FastAPI.' }
      ]);
    }
  };

  // Manejador del chat conectado al endpoint real /api/chat (LangGraph + Azure OpenAI)
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    
    // 1. Mostrar el mensaje del usuario y un indicador de carga del bot
    setMessages(prev => [
      ...prev,
      { sender: 'user', text: userMessage },
      { sender: 'bot', text: 'Analizando tu petición con los agentes de conciliación y riesgo...' }
    ]);
    setIsLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        throw new Error("Error en la respuesta del servidor");
      }

      const data = await response.json();

      // 2. Reemplazar el mensaje temporal de carga por la respuesta real de la IA
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages.pop(); // Quitar el mensaje temporal de "Analizando..."
        return [...newMessages, { sender: 'bot', text: data.response }];
      });
    } catch (error) {
      console.error("Error conectando con el agente:", error);
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages.pop();
        return [...newMessages, { sender: 'bot', text: 'Error: No se pudo conectar con el agente inteligente en el backend.' }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="panel" style={{ gap: '15px' }}>
      <h2>Consola Agéntica IA</h2>
      
      {/* Zona de Carga de Archivos */}
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

      {/* Historial de Mensajes / Consola */}
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

      {/* Campo de Entrada */}
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