-- Migration 002 : Ajout des champs académiques aux bookings
-- Ces colonnes sont utilisées par les filtres matière/diplôme/niveau du calendrier

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS matiere VARCHAR(100);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS diplome VARCHAR(100);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS niveau VARCHAR(100);

-- Index pour performance des filtres
CREATE INDEX IF NOT EXISTS idx_bookings_matiere ON bookings(matiere) WHERE matiere IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_diplome ON bookings(diplome) WHERE diplome IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_niveau ON bookings(niveau) WHERE niveau IS NOT NULL;
