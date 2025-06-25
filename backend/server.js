const express = require('express')
const path = require('path');

const app = express();
const port = 3000;

// Database connection 
const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'Charlotte_Parks_And_Greenways',
    password: 'password',
    port: 5432,
});

// Serve static files (HTML, CSS, JS, and JSON) from the frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve the index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));

});

/* -------- API endpoints to manually sync data to the database ------------*/

// Sync entrances
app.get('/api/sync-entrances', async (req, res) => {
    const url = 'https://meckgis.mecklenburgcountync.gov/server/rest/services/GreenwayTrailEntrances/FeatureServer/0/query?where=1=1&outFields=*&f=geojson';

    try {
        const response = await fetch(url);
        const data = await response.json();

        const client = await pool.connect();

        try {
            for (const feature of data.features) {
                const entranceId = feature.id?.toString(); // use feature.id as primary key
                const properties = feature.properties;

                const geom = {
                    type: feature.geometry.type,
                    coordinates: feature.geometry.coordinates
                };
                const geomJSON = JSON.stringify(geom);

                const query = `
                    INSERT INTO entrances (entrance_id, geom, properties)
                    VALUES ($1, ST_SetSRID(ST_GeomFromGeoJSON($2), 4326), $3)
                    ON CONFLICT (entrance_id) DO UPDATE SET
                        geom = EXCLUDED.geom,
                        properties = EXCLUDED.properties;
                `;

                await client.query(query, [entranceId, geomJSON, properties]);
            }

            res.json({ message: 'Entrances synced successfully!' });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error syncing entrances:', error);
        res.status(500).json({ error: 'Failed to sync entrances' });
    }
});

// Sync mile markers
app.get('/api/sync-milemarkers', async (req, res) => {
    const url = 'https://meckgis.mecklenburgcountync.gov/server/rest/services/GreenwayMileMarkers/FeatureServer/0/query?where=1=1&outFields=*&f=geojson';

    try {
        const response = await fetch(url);
        const data = await response.json();

        const client = await pool.connect();

        try {
            for (const feature of data.features) {
                const markerId = feature.id?.toString();
                const properties = feature.properties;

                const geom = {
                    type: feature.geometry.type,
                    coordinates: feature.geometry.coordinates
                };
                const geomJSON = JSON.stringify(geom);

                const query = `
                    INSERT INTO markers (marker_id, geom, properties)
                    VALUES ($1, ST_SetSRID(ST_GeomFromGeoJSON($2), 4326), $3)
                    ON CONFLICT (marker_id) DO UPDATE SET
                        geom = EXCLUDED.geom,
                        properties = EXCLUDED.properties;
                `;

                await client.query(query, [markerId, geomJSON, properties]);
            }

            res.json({ message: 'Mile markers synced successfully!' });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error syncing mile markers:', error);
        res.status(500).json({ error: 'Failed to sync mile markers' });
    }
});

// Sync trails
app.get('/api/sync-trails', async (req, res) => {
    const url = 'https://meckgis.mecklenburgcountync.gov/server/rest/services/GreenwayTrails/FeatureServer/0/query?where=1=1&outFields=*&f=geojson';

    try {
        const response = await fetch(url);
        const data = await response.json();

        const client = await pool.connect();

        try {
            for (const feature of data.features) {
                const trailId = feature.id ? feature.id.toString() : null;

                const properties = {
                    ...feature.properties,
                    trailowner: 'Mecklenburg'
                }

                const geom = {
                    type: feature.geometry.type,
                    coordinates: feature.geometry.coordinates
                };
                const geomJSON = JSON.stringify(geom)

                const query = `
                        INSERT INTO trails (trail_id, geom, properties)
                        VALUES ($1, ST_SetSRID(ST_LineMerge(ST_GeomFromGeoJSON($2)), 4326), $3)
                        ON CONFLICT (trail_id) DO UPDATE SET
                            geom = EXCLUDED.geom,
                            properties = EXCLUDED.properties;

                        `;


                await client.query(query, [trailId, geomJSON, properties]);

            }

            res.json({ message: 'Trails synced successfully!' });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error syncing trails:', error);
        res.status(500).json({ error: 'Failed to sync trails' });
    }
});


/* ----------------- Database access endpoints ----------------*/

// Access entrances
app.get('/api/entrances', async (req, res) => {
    try {
        const client = await pool.connect();

        const result = await client.query(`
            SELECT entrance_id, ST_AsGeoJSON(geom) as geom, properties
            FROM entrances
        `);

        client.release();

        const features = result.rows.map(row => ({
            type: 'Feature',
            id: row.entrance_id,
            geometry: JSON.parse(row.geom),
            properties: row.properties
        }));

        res.json({
            type: 'FeatureCollection',
            features
        });
    } catch (error) {
        console.error('Error fetching entrances:', error);
        res.status(500).json({ error: 'Failed to fetch entrances' });
    }
});

// Access mile markers
app.get('/api/milemarkers', async (req, res) => {
    try {
        const client = await pool.connect();

        const result = await client.query(`
            SELECT marker_id, ST_AsGeoJSON(geom) as geom, properties
            FROM markers
        `);

        client.release();

        const features = result.rows.map(row => ({
            type: 'Feature',
            id: row.marker_id,
            geometry: JSON.parse(row.geom),
            properties: row.properties
        }));

        res.json({
            type: 'FeatureCollection',
            features
        });
    } catch (error) {
        console.error('Error fetching mile markers:', error);
        res.status(500).json({ error: 'Failed to fetch mile markers' });
    }
});

// Access trails
app.get('/api/trails', async (req, res) => {
    try {
        const client = await pool.connect();

        const result = await client.query(`
            SELECT trail_id, ST_AsGeoJSON(geom) as geom, properties
            FROM trails
        `);

        client.release();

        // Format the data as FeatureCollection
        const features = result.rows.map(row => ({
            type: 'Feature',
            id: row.trail_id,
            geometry: JSON.parse(row.geom),
            properties: row.properties
        }
        ));

        res.json({
            type: 'FeatureCollection',
            features
        });
    } catch (error) {
        console.error('Error fetching trails from DB:', error);
        res.status(500).json({ error: 'Failed to fetch trails' });
    }
});

// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}`);
});

