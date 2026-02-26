-- Migration initiale pour l'application de planning d'établissement supérieur
-- Création des types énumérés et des tables principales

-- ==================== ENUMS ====================

CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student', 'staff');
CREATE TYPE room_type AS ENUM ('classroom', 'lab', 'amphitheater', 'meeting_room', 'computer_lab', 'library', 'gym', 'other');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'in_progress');
CREATE TYPE booking_type AS ENUM ('course', 'exam', 'meeting', 'event', 'maintenance', 'other');
CREATE TYPE attendee_type AS ENUM ('teacher', 'student', 'staff', 'external');
CREATE TYPE recurrence_pattern AS ENUM ('daily', 'weekly', 'monthly', 'yearly');

-- ==================== EXTENSIONS ====================

-- Extension pour les UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Extension pour la gestion des timestamps
CREATE EXTENSION IF NOT EXISTS "moddatetime";

-- ==================== ESTABLISHMENTS ====================

CREATE TABLE establishments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'France',
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== BUILDINGS ====================

CREATE TABLE buildings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
    floors INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== USERS ====================

CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    profile_picture TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== ROOMS ====================

CREATE TABLE rooms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    room_type room_type NOT NULL,
    establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
    building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
    floor INTEGER,
    equipment JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== RECURRING BOOKINGS ====================

CREATE TABLE recurring_bookings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL CHECK (end_time > start_time),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
    pattern recurrence_pattern NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    days_of_week INTEGER[] CHECK (array_length(days_of_week, 1) IS NULL OR (
        array_length(days_of_week, 1) > 0 AND 
        NOT EXISTS (SELECT 1 FROM unnest(days_of_week) AS day WHERE day < 0 OR day > 6)
    )),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date >= start_date)
);

-- ==================== BOOKINGS ====================

CREATE TABLE bookings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date_time TIMESTAMPTZ NOT NULL,
    end_date_time TIMESTAMPTZ NOT NULL CHECK (end_date_time > start_date_time),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
    status booking_status NOT NULL DEFAULT 'pending',
    booking_type booking_type NOT NULL,
    recurring_booking_id UUID REFERENCES recurring_bookings(id) ON DELETE SET NULL,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== BOOKING ATTENDEES ====================

CREATE TABLE booking_attendees (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attendee_type attendee_type NOT NULL,
    is_required BOOLEAN DEFAULT false,
    has_confirmed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(booking_id, user_id)
);

-- ==================== INDEXES ====================

-- Index sur les emails des utilisateurs pour les recherches rapides
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_establishment_role ON users(establishment_id, role);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;

-- Index sur les salles
CREATE INDEX idx_rooms_establishment ON rooms(establishment_id);
CREATE INDEX idx_rooms_building ON rooms(building_id);
CREATE INDEX idx_rooms_type ON rooms(room_type);
CREATE INDEX idx_rooms_active ON rooms(is_active) WHERE is_active = true;
CREATE INDEX idx_rooms_code ON rooms(code);

-- Index sur les réservations pour les requêtes temporelles
CREATE INDEX idx_bookings_date_range ON bookings(start_date_time, end_date_time);
CREATE INDEX idx_bookings_room_date ON bookings(room_id, start_date_time);
CREATE INDEX idx_bookings_user_date ON bookings(user_id, start_date_time);
CREATE INDEX idx_bookings_establishment ON bookings(establishment_id);
CREATE INDEX idx_bookings_status ON bookings(status);

-- Index pour les réservations récurrentes
CREATE INDEX idx_recurring_bookings_room ON recurring_bookings(room_id);
CREATE INDEX idx_recurring_bookings_user ON recurring_bookings(user_id);
CREATE INDEX idx_recurring_bookings_active ON recurring_bookings(is_active) WHERE is_active = true;
CREATE INDEX idx_recurring_bookings_dates ON recurring_bookings(start_date, end_date);

-- Index pour les participants
CREATE INDEX idx_booking_attendees_booking ON booking_attendees(booking_id);
CREATE INDEX idx_booking_attendees_user ON booking_attendees(user_id);

-- ==================== TRIGGERS ====================

-- Trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger à toutes les tables avec updated_at
CREATE TRIGGER set_timestamp_establishments
    BEFORE UPDATE ON establishments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_buildings
    BEFORE UPDATE ON buildings
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_users
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_rooms
    BEFORE UPDATE ON rooms
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_bookings
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_recurring_bookings
    BEFORE UPDATE ON recurring_bookings
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- ==================== FUNCTIONS ====================

-- Fonction pour vérifier les conflits de réservation
CREATE OR REPLACE FUNCTION check_booking_conflict(
    p_room_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Vérifier s'il y a des réservations confirmées qui se chevauchent
    RETURN EXISTS (
        SELECT 1 FROM bookings
        WHERE room_id = p_room_id
        AND status IN ('confirmed', 'in_progress')
        AND (p_booking_id IS NULL OR id != p_booking_id)
        AND (
            (start_date_time < p_end_time AND end_date_time > p_start_time)
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les créneaux disponibles d'une salle
CREATE OR REPLACE FUNCTION get_room_availability(
    p_room_id UUID,
    p_date DATE
)
RETURNS TABLE(
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    is_available BOOLEAN,
    booking_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.start_date_time,
        b.end_date_time,
        false as is_available,
        b.id
    FROM bookings b
    WHERE b.room_id = p_room_id
    AND DATE(b.start_date_time) = p_date
    AND b.status IN ('confirmed', 'in_progress')
    ORDER BY b.start_date_time;
END;
$$ LANGUAGE plpgsql;

-- ==================== RLS (Row Level Security) ====================

-- Activer RLS sur toutes les tables
ALTER TABLE establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_attendees ENABLE ROW LEVEL SECURITY;

-- Politiques pour les utilisateurs (les utilisateurs ne peuvent voir que leur établissement)
CREATE POLICY "Users can view their establishment users" ON users
    FOR SELECT USING (establishment_id = (SELECT establishment_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (id = auth.uid());

-- Politiques pour les salles
CREATE POLICY "Users can view their establishment rooms" ON rooms
    FOR SELECT USING (establishment_id = (SELECT establishment_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins and staff can manage rooms" ON rooms
    FOR ALL USING (
        establishment_id = (SELECT establishment_id FROM users WHERE id = auth.uid())
        AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'staff')
    );

-- Politiques pour les réservations
CREATE POLICY "Users can view bookings in their establishment" ON bookings
    FOR SELECT USING (establishment_id = (SELECT establishment_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create bookings in their establishment" ON bookings
    FOR INSERT WITH CHECK (
        establishment_id = (SELECT establishment_id FROM users WHERE id = auth.uid())
        AND user_id = auth.uid()
    );

CREATE POLICY "Users can update their own bookings" ON bookings
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all bookings in their establishment" ON bookings
    FOR ALL USING (
        establishment_id = (SELECT establishment_id FROM users WHERE id = auth.uid())
        AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    );