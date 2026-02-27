-- Migration 003 : Données de démonstration
-- Insère un établissement complet avec bâtiments, salles, utilisateurs et réservations
-- À exécuter dans Supabase SQL Editor après 001 et 002

-- Désactiver temporairement RLS pour le seeding
ALTER TABLE establishments DISABLE ROW LEVEL SECURITY;
ALTER TABLE buildings DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE booking_attendees DISABLE ROW LEVEL SECURITY;

-- ==================== ESTABLISHMENT ====================

INSERT INTO establishments (id, name, address, city, postal_code, country, email)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Université Demo',
  '1 Rue de la Démonstration',
  'Paris',
  '75001',
  'France',
  'contact@universite-demo.fr'
);

-- ==================== BUILDINGS (6) ====================

INSERT INTO buildings (id, name, address, establishment_id, floors) VALUES
  ('00000000-0000-0000-0001-000000000001', 'Bâtiment A', '1 Rue de la Démonstration', '00000000-0000-0000-0000-000000000001', 3),
  ('00000000-0000-0000-0001-000000000002', 'Bâtiment B', '1 Rue de la Démonstration', '00000000-0000-0000-0000-000000000001', 3),
  ('00000000-0000-0000-0001-000000000003', 'Bâtiment C', '1 Rue de la Démonstration', '00000000-0000-0000-0000-000000000001', 3),
  ('00000000-0000-0000-0001-000000000004', 'Bâtiment D', '1 Rue de la Démonstration', '00000000-0000-0000-0000-000000000001', 4),
  ('00000000-0000-0000-0001-000000000005', 'Amphithéâtres', '1 Rue de la Démonstration', '00000000-0000-0000-0000-000000000001', 1),
  ('00000000-0000-0000-0001-000000000006', 'Équipements spéciaux', '1 Rue de la Démonstration', '00000000-0000-0000-0000-000000000001', 1);

-- ==================== ROOMS (22) ====================

INSERT INTO rooms (id, name, code, capacity, room_type, establishment_id, building_id, floor) VALUES
  -- Bâtiment A (6 salles)
  ('00000000-0000-0000-0002-000000000001', 'A101', 'A101', 35, 'classroom', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000001', 1),
  ('00000000-0000-0000-0002-000000000002', 'A102', 'A102', 35, 'classroom', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000001', 1),
  ('00000000-0000-0000-0002-000000000003', 'A103', 'A103', 30, 'classroom', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000001', 1),
  ('00000000-0000-0000-0002-000000000004', 'A104', 'A104', 30, 'classroom', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000001', 1),
  ('00000000-0000-0000-0002-000000000005', 'A201', 'A201', 40, 'classroom', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000001', 2),
  ('00000000-0000-0000-0002-000000000006', 'A202', 'A202', 40, 'classroom', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000001', 2),
  -- Bâtiment B (4 salles)
  ('00000000-0000-0000-0002-000000000007', 'B101', 'B101', 35, 'classroom', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000002', 1),
  ('00000000-0000-0000-0002-000000000008', 'B102', 'B102', 35, 'classroom', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000002', 1),
  ('00000000-0000-0000-0002-000000000009', 'B201', 'B201', 40, 'classroom', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000002', 2),
  ('00000000-0000-0000-0002-000000000010', 'B203', 'B203', 30, 'classroom', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000002', 2),
  -- Bâtiment C (3 salles)
  ('00000000-0000-0000-0002-000000000011', 'C105', 'C105', 20, 'classroom', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000003', 1),
  ('00000000-0000-0000-0002-000000000012', 'C201', 'C201', 35, 'classroom', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000003', 2),
  ('00000000-0000-0000-0002-000000000013', 'C202', 'C202', 35, 'classroom', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000003', 2),
  -- Bâtiment D (3 salles)
  ('00000000-0000-0000-0002-000000000014', 'D301', 'D301', 30, 'classroom', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000004', 3),
  ('00000000-0000-0000-0002-000000000015', 'D302', 'D302', 30, 'classroom', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000004', 3),
  ('00000000-0000-0000-0002-000000000016', 'D303', 'D303', 30, 'classroom', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000004', 3),
  -- Amphithéâtres (2 salles)
  ('00000000-0000-0000-0002-000000000017', 'Amphi A', 'AMPHI-A', 200, 'amphitheater', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000005', 0),
  ('00000000-0000-0000-0002-000000000018', 'Amphi B', 'AMPHI-B', 150, 'amphitheater', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000005', 0),
  -- Équipements spéciaux (4 salles)
  ('00000000-0000-0000-0002-000000000019', 'Labo 1', 'LABO-1', 25, 'lab', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000006', 0),
  ('00000000-0000-0000-0002-000000000020', 'Labo 2', 'LABO-2', 25, 'lab', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000006', 0),
  ('00000000-0000-0000-0002-000000000021', 'Gymnase', 'GYMNASE', 100, 'gym', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000006', 0),
  ('00000000-0000-0000-0002-000000000022', 'Atelier', 'ATELIER', 20, 'other', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000006', 0);

-- ==================== USERS (7 : 1 admin + 6 profs) ====================

INSERT INTO users (id, email, first_name, last_name, role, establishment_id) VALUES
  ('00000000-0000-0000-0003-000000000001', 'admin@universite-demo.fr', 'Jean', 'Admin', 'admin', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0003-000000000002', 'dupont@universite-demo.fr', 'Marie', 'Dupont', 'teacher', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0003-000000000003', 'martin@universite-demo.fr', 'Pierre', 'Martin', 'teacher', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0003-000000000004', 'bernard@universite-demo.fr', 'Sophie', 'Bernard', 'teacher', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0003-000000000005', 'lefebvre@universite-demo.fr', 'Thomas', 'Lefebvre', 'teacher', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0003-000000000006', 'moreau@universite-demo.fr', 'Claire', 'Moreau', 'teacher', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0003-000000000007', 'laurent@universite-demo.fr', 'François', 'Laurent', 'teacher', '00000000-0000-0000-0000-000000000001');

-- ==================== BOOKINGS (~30 réservations sur la semaine courante) ====================
-- Utilise CURRENT_DATE pour générer des dates dynamiques (semaine courante)

-- Helper : début de la semaine courante (lundi)
-- PostgreSQL: date_trunc('week', CURRENT_DATE) donne le lundi

-- LUNDI
INSERT INTO bookings (title, description, start_date_time, end_date_time, room_id, user_id, establishment_id, status, booking_type, matiere, diplome, niveau) VALUES
  ('Mathématiques L1', 'Cours de mathématiques pour L1', date_trunc('week', CURRENT_DATE) + INTERVAL '8 hours', date_trunc('week', CURRENT_DATE) + INTERVAL '10 hours', '00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0000-000000000001', 'confirmed', 'course', 'mathematiques', 'licence', '1ere_annee'),
  ('Physique-Chimie L2', 'TP Physique-Chimie', date_trunc('week', CURRENT_DATE) + INTERVAL '8 hours', date_trunc('week', CURRENT_DATE) + INTERVAL '10 hours', '00000000-0000-0000-0002-000000000019', '00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0000-000000000001', 'confirmed', 'course', 'physique_chimie', 'licence', '2eme_annee'),
  ('Français L1', 'Cours de littérature', date_trunc('week', CURRENT_DATE) + INTERVAL '10 hours', date_trunc('week', CURRENT_DATE) + INTERVAL '12 hours', '00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0003-000000000004', '00000000-0000-0000-0000-000000000001', 'confirmed', 'course', 'francais', 'licence', '1ere_annee'),
  ('Informatique L3', 'Programmation avancée', date_trunc('week', CURRENT_DATE) + INTERVAL '10 hours', date_trunc('week', CURRENT_DATE) + INTERVAL '12 hours', '00000000-0000-0000-0002-000000000007', '00000000-0000-0000-0003-000000000005', '00000000-0000-0000-0000-000000000001', 'confirmed', 'course', 'informatique', 'licence', '3eme_annee'),
  ('Réunion pédagogique', 'Réunion de département', date_trunc('week', CURRENT_DATE) + INTERVAL '14 hours', date_trunc('week', CURRENT_DATE) + INTERVAL '16 hours', '00000000-0000-0000-0002-000000000011', '00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0000-000000000001', 'confirmed', 'meeting', NULL, NULL, NULL),
  ('Conférence Amphi A', 'Conférence inaugurale', date_trunc('week', CURRENT_DATE) + INTERVAL '14 hours', date_trunc('week', CURRENT_DATE) + INTERVAL '16 hours', '00000000-0000-0000-0002-000000000017', '00000000-0000-0000-0003-000000000006', '00000000-0000-0000-0000-000000000001', 'confirmed', 'event', NULL, NULL, NULL),

-- MARDI
  ('Anglais M1', 'Cours d''anglais académique', date_trunc('week', CURRENT_DATE) + INTERVAL '1 day 8 hours', date_trunc('week', CURRENT_DATE) + INTERVAL '1 day 10 hours', '00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0003-000000000006', '00000000-0000-0000-0000-000000000001', 'confirmed', 'course', 'anglais', 'master', '1ere_annee'),
  ('Histoire-Géo L1', 'Histoire contemporaine', date_trunc('week', CURRENT_DATE) + INTERVAL '1 day 8 hours', date_trunc('week', CURRENT_DATE) + INTERVAL '1 day 10 hours', '00000000-0000-0000-0002-000000000005', '00000000-0000-0000-0003-000000000007', '00000000-0000-0000-0000-000000000001', 'confirmed', 'course', 'histoire_geo', 'licence', '1ere_annee'),
  ('Mathématiques L2', 'Algèbre linéaire', date_trunc('week', CURRENT_DATE) + INTERVAL '1 day 10 hours', date_trunc('week', CURRENT_DATE) + INTERVAL '1 day 12 hours', '00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0000-000000000001', 'confirmed', 'course', 'mathematiques', 'licence', '2eme_annee'),
  ('SVT L1', 'Biologie cellulaire', date_trunc('week', CURRENT_DATE) + INTERVAL '1 day 10 hours', date_trunc('week', CURRENT_DATE) + INTERVAL '1 day 12 hours', '00000000-0000-0000-0002-000000000020', '00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0000-000000000001', 'confirmed', 'course', 'svt', 'licence', '1ere_annee'),
  ('Examen Informatique', 'Partiel mi-semestre', date_trunc('week', CURRENT_DATE) + INTERVAL '1 day 14 hours', date_trunc('week', CURRENT_DATE) + INTERVAL '1 day 17 hours', '00000000-0000-0000-0002-000000000017', '00000000-0000-0000-0003-000000000005', '00000000-0000-0000-0000-000000000001', 'confirmed', 'exam', 'informatique', 'licence', '3eme_annee'),

-- MERCREDI
  ('EPS', 'Cours de sport', date_trunc('week', CURRENT_DATE) + INTERVAL '2 days 8 hours', date_trunc('week', CURRENT_DATE) + INTERVAL '2 days 10 hours', '00000000-0000-0000-0002-000000000021', '00000000-0000-0000-0003-000000000007', '00000000-0000-0000-0000-000000000001', 'confirmed', 'course', 'eps', 'licence', '1ere_annee'),
  ('Philosophie L3', 'Éthique et morale', date_trunc('week', CURRENT_DATE) + INTERVAL '2 days 8 hours', date_trunc('week', CURRENT_DATE) + INTERVAL '2 days 10 hours', '00000000-0000-0000-0002-000000000012', '00000000-0000-0000-0003-000000000004', '00000000-0000-0000-0000-000000000001', 'confirmed', 'course', 'philosophie', 'licence', '3eme_annee'),
  ('Économie M1', 'Macroéconomie', date_trunc('week', CURRENT_DATE) + INTERVAL '2 days 10 hours', date_trunc('week', CURRENT_DATE) + INTERVAL '2 days 12 hours', '00000000-0000-0000-0002-000000000009', '00000000-0000-0000-0003-000000000006', '00000000-0000-0000-0000-000000000001', 'confirmed', 'course', 'economie', 'master', '1ere_annee'),
  ('Droit M2', 'Droit des contrats', date_trunc('week', CURRENT_DATE) + INTERVAL '2 days 10 hours', date_trunc('week', CURRENT_DATE) + INTERVAL '2 days 12 hours', '00000000-0000-0000-0002-000000000014', '00000000-0000-0000-0003-000000000007', '00000000-0000-0000-0000-000000000001', 'confirmed', 'course', 'droit', 'master', '2eme_annee'),
  ('Maintenance Amphi B', 'Vérification sonorisation', date_trunc('week', CURRENT_DATE) + INTERVAL '2 days 14 hours', date_trunc('week', CURRENT_DATE) + INTERVAL '2 days 16 hours', '00000000-0000-0000-0002-000000000018', '00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0000-000000000001', 'confirmed', 'maintenance', NULL, NULL, NULL),

-- JEUDI
  ('Physique-Chimie L1', 'Mécanique classique', date_trunc('week', CURRENT_DATE) + INTERVAL '3 days 8 hours', date_trunc('week', CURRENT_DATE) + INTERVAL '3 days 10 hours', '00000000-0000-0000-0002-000000000004', '00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0000-000000000001', 'confirmed', 'course', 'physique_chimie', 'licence', '1ere_annee'),
  ('Informatique M1', 'Intelligence artificielle', date_trunc('week', CURRENT_DATE) + INTERVAL '3 days 8 hours', date_trunc('week', CURRENT_DATE) + INTERVAL '3 days 10 hours', '00000000-0000-0000-0002-000000000008', '00000000-0000-0000-0003-000000000005', '00000000-0000-0000-0000-000000000001', 'confirmed', 'course', 'informatique', 'master', '1ere_annee'),
  ('Arts L2', 'Atelier sculpture', date_trunc('week', CURRENT_DATE) + INTERVAL '3 days 10 hours', date_trunc('week', CURRENT_DATE) + INTERVAL '3 days 12 hours', '00000000-0000-0000-0002-000000000022', '00000000-0000-0000-0003-000000000004', '00000000-0000-0000-0000-000000000001', 'confirmed', 'course', 'arts', 'licence', '2eme_annee'),
  ('Mathématiques L3', 'Analyse complexe', date_trunc('week', CURRENT_DATE) + INTERVAL '3 days 10 hours', date_trunc('week', CURRENT_DATE) + INTERVAL '3 days 12 hours', '00000000-0000-0000-0002-000000000006', '00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0000-000000000001', 'confirmed', 'course', 'mathematiques', 'licence', '3eme_annee'),
  ('Conférence Amphi A', 'Table ronde recherche', date_trunc('week', CURRENT_DATE) + INTERVAL '3 days 14 hours', date_trunc('week', CURRENT_DATE) + INTERVAL '3 days 17 hours', '00000000-0000-0000-0002-000000000017', '00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0000-000000000001', 'confirmed', 'event', NULL, NULL, NULL),

-- VENDREDI
  ('Français L2', 'Dissertation et argumentation', date_trunc('week', CURRENT_DATE) + INTERVAL '4 days 8 hours', date_trunc('week', CURRENT_DATE) + INTERVAL '4 days 10 hours', '00000000-0000-0000-0002-000000000013', '00000000-0000-0000-0003-000000000004', '00000000-0000-0000-0000-000000000001', 'confirmed', 'course', 'francais', 'licence', '2eme_annee'),
  ('Anglais L1', 'Grammar and vocabulary', date_trunc('week', CURRENT_DATE) + INTERVAL '4 days 8 hours', date_trunc('week', CURRENT_DATE) + INTERVAL '4 days 10 hours', '00000000-0000-0000-0002-000000000010', '00000000-0000-0000-0003-000000000006', '00000000-0000-0000-0000-000000000001', 'confirmed', 'course', 'anglais', 'licence', '1ere_annee'),
  ('Examen Mathématiques', 'Examen final L1', date_trunc('week', CURRENT_DATE) + INTERVAL '4 days 10 hours', date_trunc('week', CURRENT_DATE) + INTERVAL '4 days 13 hours', '00000000-0000-0000-0002-000000000018', '00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0000-000000000001', 'confirmed', 'exam', 'mathematiques', 'licence', '1ere_annee'),
  ('Informatique L2', 'Bases de données', date_trunc('week', CURRENT_DATE) + INTERVAL '4 days 10 hours', date_trunc('week', CURRENT_DATE) + INTERVAL '4 days 12 hours', '00000000-0000-0000-0002-000000000015', '00000000-0000-0000-0003-000000000005', '00000000-0000-0000-0000-000000000001', 'confirmed', 'course', 'informatique', 'licence', '2eme_annee'),
  ('SVT L2', 'TP Génétique', date_trunc('week', CURRENT_DATE) + INTERVAL '4 days 14 hours', date_trunc('week', CURRENT_DATE) + INTERVAL '4 days 16 hours', '00000000-0000-0000-0002-000000000019', '00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0000-000000000001', 'confirmed', 'course', 'svt', 'licence', '2eme_annee'),
  ('EPS', 'Activités sportives', date_trunc('week', CURRENT_DATE) + INTERVAL '4 days 14 hours', date_trunc('week', CURRENT_DATE) + INTERVAL '4 days 16 hours', '00000000-0000-0000-0002-000000000021', '00000000-0000-0000-0003-000000000007', '00000000-0000-0000-0000-000000000001', 'confirmed', 'course', 'eps', 'licence', '2eme_annee'),
  ('Réunion fin de semaine', 'Bilan hebdomadaire', date_trunc('week', CURRENT_DATE) + INTERVAL '4 days 16 hours', date_trunc('week', CURRENT_DATE) + INTERVAL '4 days 17 hours', '00000000-0000-0000-0002-000000000011', '00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0000-000000000001', 'confirmed', 'meeting', NULL, NULL, NULL);

-- Réactiver RLS
ALTER TABLE establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_attendees ENABLE ROW LEVEL SECURITY;

-- Ajouter des politiques SELECT ouvertes pour buildings (manquantes dans 001)
-- Nécessaire pour que les joins fonctionnent
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their establishment buildings') THEN
    CREATE POLICY "Users can view their establishment buildings" ON buildings
      FOR SELECT USING (establishment_id = (SELECT establishment_id FROM users WHERE id = auth.uid()));
  END IF;
END $$;

-- Politique SELECT pour booking_attendees
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view booking attendees') THEN
    CREATE POLICY "Users can view booking attendees" ON booking_attendees
      FOR SELECT USING (
        booking_id IN (
          SELECT id FROM bookings
          WHERE establishment_id = (SELECT establishment_id FROM users WHERE id = auth.uid())
        )
      );
  END IF;
END $$;
