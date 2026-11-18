import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, UserCheck } from 'lucide-react';

export default function Header({ onLoginSuccess }) {
  const [email, setEmail] = useState('admin@plurione.com');
  const [password, setPassword] = useState('PluriOne2026*');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [userEmail, setUserEmail] = useState(localStorage.getItem('userEmail') || '');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch("http://127.0.0.1:8000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Credenciales incorrectas o error en el servidor.");
      }

      const data = await response.json();
      
      // Guardar token y usuario en localStorage
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('userEmail', data.user.email);
      
      setToken(data.access_token);
      setUserEmail(data.user.email);
      if (onLoginSuccess) onLoginSuccess(data.access_token);

    } catch (err) {
      setError("Error al iniciar sesión. Verifica tus credenciales.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    setToken('');
    setUserEmail('');
    window.location.reload();
  };

  return (
    <header style={{
      height: '70px',
      backgroundColor: '#1e293b',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      borderBottom: '1px solid #334155'
    }}>
      <div>
        <h1 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
          PluriOne FinTech | Arquitectura Agéntica Corporativa
        </h1>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
          Sistema de Conciliación y Cumplimiento con IA
        </span>
      </div>

      {/* Control de Autenticación en la Interfaz */}
      {!token ? (
        <form onSubmit={handleLogin} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Correo"
            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '13px' }}
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '13px' }}
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            style={{
              backgroundColor: '#3b82f6',
              color: '#fff',
              border: 'none',
              padding: '7px 14px',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: '600'
            }}
          >
            <LogIn size={15} /> {isLoading ? 'Entrando...' : 'Iniciar Sesión'}
          </button>
          {error && <span style={{ color: '#ef4444', fontSize: '11px' }}>{error}</span>}
        </form>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#cbd5e1' }}>
            <UserCheck size={16} color="#22c55e" />
            <span>{userEmail}</span>
          </div>
          <button
            onClick={handleLogout}
            style={{
              backgroundColor: '#dc2626',
              color: '#fff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '13px'
            }}
          >
            <LogOut size={14} /> Salir
          </button>
        </div>
      )}
    </header>
  );
}