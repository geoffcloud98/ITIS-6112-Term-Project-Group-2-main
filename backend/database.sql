-- Create PostGIS extension (run once per database)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Table: trails
CREATE TABLE trails (
    trail_id INTEGER PRIMARY KEY,
    geom GEOMETRY(MultiLineString, 4326),
    properties JSONB
);


-- Table: entrances
CREATE TABLE IF NOT EXISTS entrances (
    entrance_id INTEGER PRIMARY KEY,
    geom GEOMETRY(Point, 4326),
    properties JSONB
);

-- Table: markers
CREATE TABLE IF NOT EXISTS markers (
    marker_id INTEGER PRIMARY KEY,
    geom GEOMETRY(Point, 4326),
    properties JSONB
);
