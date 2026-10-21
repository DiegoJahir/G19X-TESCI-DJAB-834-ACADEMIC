import React, { useState } from 'react';
import { Upload, Bot, Send } from 'lucide-react';

export default function AgentChat({ onReconcileSuccess }) {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hola Diego, soy el Orquestador Financiero. Subes un estado de cuenta en PDF o Excel para comenzar la conciliación.' }
  ]);
  const [input, setInput] = useState('');

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

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { sender: 'user', text: input }]);
    setInput('');
    
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        { sender: 'bot', text: 'Analizando tu petición con los agentes de conciliación y riesgo...' }
      ]);
    }, 1000);
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
          placeholder="Escribe una instrucción..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
        />
        <button onClick={handleSend} style={{ backgroundColor: '#007bff', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer' }}>
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}