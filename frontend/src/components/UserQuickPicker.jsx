import React, { useEffect, useRef, useState } from 'react';

export default function UserQuickPicker({ onSelectEmail }) {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 200 });

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const loadUsers = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/users/public');
      if (!res.ok) return;
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setUsers([]);
    }
  };

  const updatePosition = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 200),
    });
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleReposition = () => {
      if (open) updatePosition();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [open]);

  if (!Array.isArray(users) || users.length === 0) {
    return null;
  }

  const filteredUsers = users.filter((u) =>
    String(u.name || '').toLowerCase().includes(query.trim().toLowerCase())
  );

  const openMenu = () => {
    loadUsers();
    updatePosition();
    setOpen(true);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <input
        ref={inputRef}
        type="text"
        name="quick_user_lookup"
        autoComplete="off"
        value={query}
        placeholder="Usuarios"
        onFocus={openMenu}
        onClick={openMenu}
        onChange={(e) => {
          setQuery(e.target.value);
          updatePosition();
          setOpen(true);
        }}
        style={{
          maxWidth: '100%',
          minWidth: '0',
          width: '150px',
          padding: '6px 10px',
          borderRadius: '4px',
          border: '1px solid #475569',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          fontSize: '13px',
          outline: 'none',
        }}
      />

      {open && filteredUsers.length > 0 && (
        <div
          style={{
            position: 'fixed',
            top: `${dropdownPos.top}px`,
            left: `${dropdownPos.left}px`,
            minWidth: `${dropdownPos.width}px`,
            maxHeight: '220px',
            overflowY: 'auto',
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            border: '1px solid #475569',
            borderRadius: '6px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.45)',
            zIndex: 99999,
            padding: '4px',
          }}
        >
          {filteredUsers.map((u) => (
            <button
              key={u.id ?? u.email}
              type="button"
              onMouseDown={(e) => {
                // Evita que el blur del input cierre el menú antes del clic
                e.preventDefault();
                setQuery(u.name);
                onSelectEmail(u.email);
                setOpen(false);
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '7px 10px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: 'transparent',
                color: '#f8fafc',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'block',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1e293b';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {u.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}