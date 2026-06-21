-- 1. Pastikan Anda sudah membuat database bernama 'aspas'
-- CREATE DATABASE aspas;

-- 2. Aktifkan ekstensi PostGIS (harus dijalankan oleh superuser di database 'aspas')
CREATE EXTENSION IF NOT EXISTS postgis;

-- 3. Buat tabel halte_transpadang
CREATE TABLE IF NOT EXISTS halte_transpadang (
    id SERIAL PRIMARY KEY,
    nama_halte VARCHAR(100) NOT NULL,
    koridor VARCHAR(10) NOT NULL,
    geom geometry(Point, 4326) -- SRID 4326 untuk sistem koordinat WGS 84 (GPS)
);

-- 4. Masukkan data dummy Halte Trans Padang (Koridor 5 & 6)
-- Contoh data dengan koordinat nyata di Kota Padang
INSERT INTO halte_transpadang (nama_halte, koridor, geom) VALUES
('Halte RTH Imam Bonjol', '5', ST_SetSRID(ST_MakePoint(100.3658, -0.9471), 4326)),
('Halte Pasar Raya', '5', ST_SetSRID(ST_MakePoint(100.3610, -0.9490), 4326)),
('Halte Basko Grand Mall', '5', ST_SetSRID(ST_MakePoint(100.3475, -0.8970), 4326)),
('Halte UNP', '6', ST_SetSRID(ST_MakePoint(100.3450, -0.8935), 4326)),
('Halte Tabing', '6', ST_SetSRID(ST_MakePoint(100.3390, -0.8750), 4326));

-- 5. Buat Spatial Index untuk mempercepat query pencarian jarak terdekat (ST_DWithin)
CREATE INDEX IF NOT EXISTS halte_geom_idx
  ON halte_transpadang
  USING GIST (geom);

-- Anda bisa menguji query jarak halte terdekat dengan skrip berikut:
/*
SELECT 
  id, nama_halte, koridor,
  ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint(100.3660, -0.9470), 4326)::geography) AS jarak_meter
FROM halte_transpadang
ORDER BY jarak_meter ASC
LIMIT 1;
*/
