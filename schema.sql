-- DDL para el Sistema de Arquitectura Agéntica de Finanzas Corporativas (PluriOne)

CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    client_name VARCHAR(150) NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    paid_amount NUMERIC(12, 2) DEFAULT 0.00,
    status VARCHAR(30) DEFAULT 'PENDIENTE', -- PENDIENTE, CONCILIADO, PARCIAL
    created_TIMESTAMP TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bank_statements (
    id SERIAL PRIMARY KEY,
    transaction_date DATE NOT NULL,
    reference VARCHAR(100),
    concept TEXT,
    charge_amount NUMERIC(12, 2) DEFAULT 0.00,
    deposit_amount NUMERIC(12, 2) DEFAULT 0.00,
    balance NUMERIC(12, 2) NOT NULL,
    is_reconciled BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    agent_name VARCHAR(100) NOT NULL,
    action_performed TEXT NOT NULL,
    risk_level VARCHAR(20) DEFAULT 'BAJO',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Datos de prueba iniciales (Facturas corporativas PluriOne)
INSERT INTO invoices (invoice_number, client_name, total_amount, paid_amount, status) 
VALUES 
('FAC-1021', 'Corporativo Alpha S.A.', 45000.00, 0.00, 'PENDIENTE'),
('FAC-1022', 'Logística del Bajío', 98000.00, 0.00, 'PENDIENTE'),
('FAC-1023', 'Servicios Industriales Zeta', 12500.00, 0.00, 'PENDIENTE')
ON CONFLICT (invoice_number) DO NOTHING;