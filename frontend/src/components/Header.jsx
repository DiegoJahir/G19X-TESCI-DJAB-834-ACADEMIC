import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, UserCheck, UserPlus } from 'lucide-react';
import UserQuickPicker from './UserQuickPicker';

export default function Header({ onLoginSuccess }) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('admin@plurione.com');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [userEmail, setUserEmail] = useState(localStorage.getItem('userEmail') || '');
  const [message, setMessage] = useState({ type: '', text: '' });
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

  const persistSession = (accessToken, userData, fallbackEmail) => {
    localStorage.setItem('token', accessToken);
    setToken(accessToken);

    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('userEmail', userData.email || fallbackEmail);
      setUser(userData);
      setUserEmail(userData.email || fallbackEmail);
    } else {
      localStorage.setItem('userEmail', fallbackEmail);
      setUserEmail(fallbackEmail);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setIsLoading(true);

    const trimmedEmail = email.trim();

    try {
      if (isRegisterMode) {
        // 1. Registrar nuevo usuario (rol 'analyst' asignado en backend)
        const regResponse = await fetch('http://127.0.0.1:8000/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: fullName.trim(),
            email: trimmedEmail,
            password,
          }),
        });

        const regData = await regResponse.json();
        if (!regResponse.ok) {
          setMessage({
            type: 'error',
            text: regData?.detail || 'No se pudo completar el registro.',
          });
          return;
        }

        // 2. Iniciar sesión automáticamente tras registrarse para obtener el JWT
        const loginResponse = await fetch('http://127.0.0.1:8000/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: trimmedEmail,
            password,
          }),
        });

        const loginData = await loginResponse.json();
        if (loginResponse.ok && loginData.access_token) {
          persistSession(loginData.access_token, loginData.user, trimmedEmail);
          setPassword('');
          setFullName('');
          setIsRegisterMode(false);
          if (onLoginSuccess) {
            onLoginSuccess(loginData.access_token);
          }
        } else {
          setIsRegisterMode(false);
          setPassword('');
          setMessage({
            type: 'success',
            text: 'Usuario registrado. Ahora inicia sesión con tus credenciales.',
          });
        }
      } else {
        // Flujo normal de inicio de sesión
        const response = await fetch('http://127.0.0.1:8000/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: trimmedEmail,
            password,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          setMessage({
            type: 'error',
            text: data?.detail || 'Credenciales incorrectas o error en el servidor.',
          });
          return;
        }

        persistSession(data.access_token, data.user, trimmedEmail);
        setPassword('');
        if (onLoginSuccess) {
          onLoginSuccess(data.access_token);
        }
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'No se pudo conectar con el servidor de autenticación.',
      });
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
    setMessage({ type: '', text: '' });
    window.location.reload();
  };

  const toggleMode = () => {
    setMessage({ type: '', text: '' });
    setIsRegisterMode((prev) => {
      const next = !prev;
      if (next) {
        setEmail('');
        setFullName('');
      } else {
        setEmail('admin@plurione.com');
      }
      return next;
    });
  };

  const isAuthenticated = Boolean(user || token);

  return (
    <header
      style={{
        minHeight: '70px',
        maxWidth: '100%',
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
      
    {/* Titulo Del Proyecto Y Empresa */}
    <div style={{ minWidth: 0, flex: '1 1 240px' }}>
      <h1 style={{ fontSize: '18px', fontWeight: '600', margin: 0, overflowWrap: 'anywhere' }}>
        PluriOne FinTech | Arquitectura Agéntica Corporativa
      </h1>
      <span style={{ fontSize: '12px', color: '#94a3b8' }}>
        Sistema de Conciliación y Cumplimiento con IA
      </span>
    </div>

    {/* Control de Autenticación en la Interfaz */}
      {!isAuthenticated ? (
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}
        >
          {isRegisterMode && (
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nombre completo"
              style={{
                maxWidth: '100%',
                minWidth: '0',
                padding: '6px 10px',
                borderRadius: '4px',
                border: '1px solid #475569',
                backgroundColor: '#0f172a',
                color: '#fff',
                fontSize: '13px',
              }}
              required
            />
          )}

          {!isRegisterMode && (
            <UserQuickPicker
              onSelectEmail={(selectedEmail) => {
                setEmail(selectedEmail);
              }}
            />
          )}

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Correo"
            style={{
              maxWidth: '100%',
              minWidth: '0',
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
              maxWidth: '100%',
              minWidth: '0',
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
              backgroundColor: isRegisterMode ? '#16a34a' : '#3b82f6',
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
            {isRegisterMode ? <UserPlus size={15} /> : <LogIn size={15} />}
            {isLoading
              ? 'Procesando...'
              : isRegisterMode
              ? 'Crear Cuenta'
              : 'Iniciar Sesión'}
          </button>

          <button
            type="button"
            onClick={toggleMode}
            disabled={isLoading}
            style={{
              backgroundColor: 'transparent',
              color: '#e2e8f0',
              border: '1px solid #475569',
              padding: '7px 12px',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '13px',
            }}
          >
            {isRegisterMode ? 'Volver a Login' : 'Registrarse'}
          </button>

          {message.text && (
            <span
              style={{
                color: message.type === 'error' ? '#fca5a5' : '#86efac',
                fontSize: '12px',
              }}
            >
              {message.text}
            </span>
          )}
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