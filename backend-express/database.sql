-- PostgreSQL Schema & Seed Data for Smart Farming Platform
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tenants Table
CREATE TABLE IF NOT EXISTS public.tenants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name character varying(255) NOT NULL,
    tenant_code character varying(100) UNIQUE,
    contact_person character varying(255),
    phone character varying(50),
    address text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    username character varying(255),
    email character varying(255) UNIQUE NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(50) NOT NULL DEFAULT 'user',
    is_active boolean DEFAULT true,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- 3. Boxes Table
CREATE TABLE IF NOT EXISTS public.boxes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    name character varying(255) NOT NULL,
    box_number integer DEFAULT 1,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- 4. Box Locations Table
CREATE TABLE IF NOT EXISTS public.box_locations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    box_id uuid REFERENCES public.boxes(id) ON DELETE CASCADE,
    floor_level integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- 5. Automation Thresholds
CREATE TABLE IF NOT EXISTS public.automation_thresholds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    floor_level integer DEFAULT 1,
    temp_min numeric(5,2) DEFAULT 25.00,
    temp_max numeric(5,2) DEFAULT 35.00,
    air_hum_min numeric(5,2) DEFAULT 60.00,
    air_hum_max numeric(5,2) DEFAULT 85.00,
    media_hum_min numeric(5,2) DEFAULT 40.00,
    media_hum_max numeric(5,2) DEFAULT 70.00
);

-- 6. Sensor Data Table
CREATE TABLE IF NOT EXISTS public.sensor_data (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    box_id uuid REFERENCES public.boxes(id) ON DELETE CASCADE,
    air_temp numeric(5,2),
    air_humidity numeric(5,2),
    media_humidity numeric(5,2),
    raw_soil_adc integer,
    source character varying(50) DEFAULT 'real',
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- 7. Actuator Logs Table
CREATE TABLE IF NOT EXISTS public.actuator_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    box_id uuid REFERENCES public.boxes(id) ON DELETE CASCADE,
    type character varying(50),
    status character varying(20),
    source character varying(50) DEFAULT 'real',
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- 8. CV Results Table
CREATE TABLE IF NOT EXISTS public.cv_results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    box_id uuid REFERENCES public.boxes(id) ON DELETE CASCADE,
    image_url character varying(255),
    dominant_phase character varying(100),
    confidence_score numeric(5,2),
    detection_counts jsonb,
    proportions jsonb,
    source character varying(50) DEFAULT 'real',
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- 9. Harvest Predictions Table
CREATE TABLE IF NOT EXISTS public.harvest_predictions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    box_id uuid REFERENCES public.boxes(id) ON DELETE CASCADE,
    estimated_days numeric(5,1),
    urgency_level character varying(50),
    confidence numeric(5,2),
    source character varying(50) DEFAULT 'real',
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- 10. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    message text,
    is_read boolean DEFAULT false,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- SEED INITIAL DEFAULT DATA
-- Default Tenant
INSERT INTO public.tenants (id, name, tenant_code, contact_person, phone, address, is_active)
VALUES 
('00000000-0000-0000-0000-000000000001', 'MagSense Smart Farm', 'MAG-01', 'Farros', '08123456789', 'Brebes', true)
ON CONFLICT (id) DO NOTHING;

-- Default User (Password: admin123 -> $2b$10$8K1p/a0dL1LXMc.0zK4w9.z7q3yZ9v5Z5Z5z5z5z5z5z5z5z5z5z)
INSERT INTO public.users (id, tenant_id, username, email, password, role, is_active)
VALUES 
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Admin Maggot', 'admin@maggott.com', '$2a$10$wE8wY0Yj1B4W1QhXlH3cO.gXbM6h9oR9fT6Yp6i6Wp2tW3qU7vAum', 'admin', true)
ON CONFLICT (id) DO NOTHING;

-- Default Boxes (Box 1: Chamber Larva, Box 2: Chamber Lalat, Box 3: Chamber Cadangan)
INSERT INTO public.boxes (id, tenant_id, name, box_number, is_active)
VALUES 
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Chamber Larva (Box 1)', 1, true),
('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Chamber Lalat (Box 2)', 2, true),
('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Chamber Cadangan (Box 3)', 3, true)
ON CONFLICT (id) DO NOTHING;

-- Default Automation Thresholds
INSERT INTO public.automation_thresholds (id, tenant_id, floor_level, temp_min, temp_max, air_hum_min, air_hum_max, media_hum_min, media_hum_max)
VALUES
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 1, 26.00, 32.00, 60.00, 80.00, 45.00, 70.00)
ON CONFLICT (id) DO NOTHING;
