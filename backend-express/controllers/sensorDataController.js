const pool = require('../db');
const { resolveBoxId } = require('../utils/resolveIds');
const { paginationMeta, parseListQuery } = require('../utils/listQuery');

const SENSOR_COLUMNS = 'id, box_id, air_temp, air_humidity, media_humidity, raw_soil_adc, source, timestamp';
const SENSOR_ALIASED = SENSOR_COLUMNS
    .split(', ')
    .map((column) => `s.${column}`)
    .join(', ');

const SENSOR_JOIN = 'FROM sensor_data s LEFT JOIN boxes b ON b.id = s.box_id';

function parseHours(value, fallback = 24) {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) return fallback;
    return Math.min(Math.max(parsed, 1), 720);
}

function buildFilters(listQuery) {
    const params = [];
    let where = 'WHERE 1=1';

    if (listQuery.boxId) {
        params.push(resolveBoxId(listQuery.boxId));
        where += ` AND s.box_id = $${params.length}::uuid`;
    }
    if (listQuery.search) {
        params.push(`%${listQuery.search}%`);
        where += ` AND (b.name ILIKE $${params.length} OR s.source ILIKE $${params.length} OR s.box_id::text ILIKE $${params.length})`;
    }
    if (listQuery.start) {
        params.push(listQuery.start);
        where += ` AND s.timestamp >= $${params.length}::timestamp`;
    }
    if (listQuery.end) {
        params.push(listQuery.end);
        where += ` AND s.timestamp < ($${params.length}::date + INTERVAL '1 day')`;
    }

    return { params, where };
}

exports.getAllSensorData = async (req, res) => {
    try {
        const listQuery = parseListQuery(req.query);
        const { params, where } = buildFilters(listQuery);

        if (listQuery.latestPerBox) {
            const { rows } = await pool.query(
                `SELECT DISTINCT ON (s.box_id) ${SENSOR_ALIASED}, b.name AS box_name
                 ${SENSOR_JOIN} ${where}
                 ORDER BY s.box_id, s.timestamp DESC, s.id DESC`,
                params
            );
            return res.json(rows);
        }

        const countRes = await pool.query(`SELECT COUNT(*)::int AS total ${SENSOR_JOIN} ${where}`, params);
        const total = countRes.rows[0]?.total || 0;

        if (!listQuery.paginated) {
            const { rows } = await pool.query(
                `SELECT ${SENSOR_ALIASED}, b.name AS box_name
                 ${SENSOR_JOIN} ${where}
                 ORDER BY s.timestamp ${listQuery.sort}, s.id ${listQuery.sort}
                 LIMIT ${listQuery.legacyLimit}`,
                params
            );
            return res.json(rows);
        }

        const dataParams = [...params, listQuery.limit, listQuery.offset];
        const limitParam = dataParams.length - 1;
        const offsetParam = dataParams.length;
        const { rows } = await pool.query(
            `SELECT ${SENSOR_ALIASED}, b.name AS box_name
             ${SENSOR_JOIN} ${where}
             ORDER BY s.timestamp ${listQuery.sort}, s.id ${listQuery.sort}
             LIMIT $${limitParam} OFFSET $${offsetParam}`,
            dataParams
        );

        return res.json({ data: rows, pagination: paginationMeta(listQuery, total) });
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
