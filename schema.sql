-- Eliminar tablas si ya existen (orden correcto por dependencias de llaves foráneas)
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS bank_statements;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS users;

-- 1. Tabla de Usuarios (Alineada con backend/models.py)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'analyst',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Facturas (Alineada con backend/models.py usando folio, client, amount, status)
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    folio VARCHAR(100) UNIQUE NOT NULL,
    client VARCHAR(255) NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    status VARCHAR(50) DEFAULT 'Pendiente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla opcional para registros de auditoría de los agentes
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    action_type VARCHAR(100) NOT NULL,
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Datos de prueba iniciales para validar la base de datos al levantar Docker
INSERT INTO users (full_name, email, hashed_password, role, is_active) 
VALUES ('Administrador PluriOne', 'admin@plurione.com', '$2b$12$E...hash_ejemplo...', 'admin', TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO invoices (folio, client, amount, status) 
VALUES 
    ('FAC-1021', 'Tech Solutions Ltd', 45000.0, 'Pendiente'),
    ('FAC-1022', 'Innovación Digital SA', 12500.0, 'Pendiente'),
    ('FAC-1023', 'Consultoría Global', 98000.0, 'Pendiente')
ON CONFLICT (folio) DO NOTHING;