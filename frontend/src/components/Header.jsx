import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, UserCheck } from 'lucide-react';

export default function Header({ onLoginSuccess }) {
  const [email, setEmail] = useState('admin@plurione.com');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [userEmail, setUserEmail] = useState(localStorage.getItem('userEmail') || '');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Recuperar usuario guardado si ya existe token y datos de sesión
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    if (savedUser && savedToken) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setToken(savedToken);
        if (parsedUser?.email) setUserEmail(parsedUser.email);
      } catch (_) {}
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.detail || 'Credenciales incorrectas o error en el servidor.');
        return;
      }

      localStorage.setItem('token', data.access_token);
      setToken(data.access_token);

      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('userEmail', data.user.email || email);
        setUser(data.user);
        setUserEmail(data.user.email || email);
      } else {
        localStorage.setItem('userEmail', email);
        setUserEmail(email);
      }

      setPassword('');
      if (onLoginSuccess) {
        onLoginSuccess(data.access_token);
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor de autenticación.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userEmail');
    setUser(null);
    setToken('');
    setUserEmail('');
    window.location.reload();
  };

  const isAuthenticated = Boolean(user || token);

  return (
    <header
      style={{
        minHeight: '70px',
        backgroundColor: '#1e293b',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px',
        borderBottom: '1px solid #334155',
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      <div>
        <h1 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
          PluriOne FinTech | Arquitectura Agéntica Corporativa
        </h1>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
          Sistema de Conciliación y Cumplimiento con IA
        </span>
      </div>

      {/* Control de Autenticación en la Interfaz */}
      {!isAuthenticated ? (
        <form onSubmit={handleLogin} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Correo"
            style={{
              padding: '6px 10px',
              borderRadius: '4px',
              border: '1px solid #475569',
              backgroundColor: '#0f172a',
              color: '#fff',
              fontSize: '13px',
            }}
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            style={{
              padding: '6px 10px',
              borderRadius: '4px',
              border: '1px solid #475569',
              backgroundColor: '#0f172a',
              color: '#fff',
              fontSize: '13px',
            }}
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
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: '600',
            }}
          >
            <LogIn size={15} /> {isLoading ? 'Entrando...' : 'Iniciar Sesión'}
          </button>
          {error && <span style={{ color: '#fca5a5', fontSize: '12px' }}>{error}</span>}
        </form>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#cbd5e1' }}>
            <UserCheck size={16} color="#22c55e" />
            <span>
              {user?.full_name || user?.email || userEmail}
              {user?.role ? ` (${user.role})` : ''}
            </span>
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
              fontSize: '13px',
            }}
          >
            <LogOut size={14} /> Salir
          </button>
        </div>
      )}
    </header>
  );
}