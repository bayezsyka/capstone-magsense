const pool = require('../db');
const { resolveBoxId } = require('../utils/resolveIds');

const SENSOR_COLUMNS = 'id, box_id, air_temp, air_humidity, media_humidity, raw_soil_adc, source, timestamp';

function parseHours(value, fallback = 24) {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) return fallback;
    return Math.min(Math.max(parsed, 1), 720);
}

exports.getAllSensorData = async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT ${SENSOR_COLUMNS} FROM sensor_data ORDER BY timestamp DESC LIMIT 100`);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch sensor_data' });
    }
};

exports.getLatestSensorData = async (req, res) => {
    try {
        const { box_id } = req.query;
        const params = [];
        let query = `SELECT ${SENSOR_COLUMNS} FROM sensor_data`;

        if (box_id !== undefined && box_id !== '') {
            params.push(resolveBoxId(box_id));
            query += ' WHERE box_id = $1::uuid';
        }

        query += ' ORDER BY timestamp DESC LIMIT 1';
        const { rows } = await pool.query(query, params);
        res.json(rows[0] || null);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch latest sensor_data' });
    }
};

exports.getSensorHistory = async (req, res) => {
    try {
        const { box_id } = req.query;
        const hours = parseHours(req.query.hours);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 1000, 1), 5000);

        const params = [hours, limit];
        let query = `SELECT ${SENSOR_COLUMNS} FROM sensor_data WHERE timestamp >= NOW() - ($1 * INTERVAL '1 hour')`;

        if (box_id !== undefined && box_id !== '') {
            params.push(resolveBoxId(box_id));
            query += ` AND box_id = $${params.length}::uuid`;
        }

        query += ` ORDER BY timestamp ASC LIMIT $2`;
        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch sensor history' });
    }
};

exports.createSensorData = async (req, res) => {
    try {
        const { box_id, air_temp, air_humidity, media_humidity, raw_soil_adc, source, timestamp } = req.body;
        const { rows } = await pool.query(
            `INSERT INTO sensor_data (id, box_id, air_temp, air_humidity, media_humidity, raw_soil_adc, source, "timestamp")
             VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4, $5, $6, COALESCE($7::timestamp, CURRENT_TIMESTAMP))
             RETURNING ${SENSOR_COLUMNS}`,
            [resolveBoxId(box_id), air_temp, air_humidity, media_humidity, raw_soil_adc ?? null, source || 'real', timestamp || null]
        );

        const io = req.app.get('io');
        if (io) io.emit('new_sensor_data', rows);

        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create sensor_data' });
    }
};

exports.deleteSensorData = async (req, res) => {
    try {
        const { id } = req.params;
        const { rowCount } = await pool.query('DELETE FROM sensor_data WHERE id = $1', [id]);
        if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete' });
    }
};
