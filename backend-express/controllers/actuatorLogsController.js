const pool = require('../db');
const { resolveBoxId } = require('../utils/resolveIds');
const { paginationMeta, parseListQuery } = require('../utils/listQuery');

const ACTUATOR_COLUMNS = 'id, box_id, type, status, source, timestamp';
const ACTUATOR_ALIASED = ACTUATOR_COLUMNS
    .split(', ')
    .map((column) => `a.${column}`)
    .join(', ');
const ACTUATOR_JOIN = 'FROM actuator_logs a LEFT JOIN boxes b ON b.id = a.box_id';

function buildFilters(listQuery) {
    const params = [];
    let where = 'WHERE 1=1';

    if (listQuery.boxId) {
        params.push(resolveBoxId(listQuery.boxId));
        where += ` AND a.box_id = $${params.length}::uuid`;
    }
    if (listQuery.search) {
        params.push(`%${listQuery.search}%`);
        where += ` AND (b.name ILIKE $${params.length} OR a.type ILIKE $${params.length} OR a.status ILIKE $${params.length} OR a.source ILIKE $${params.length} OR a.box_id::text ILIKE $${params.length})`;
    }
    if (listQuery.start) {
        params.push(listQuery.start);
        where += ` AND a.timestamp >= $${params.length}::timestamp`;
    }
    if (listQuery.end) {
        params.push(listQuery.end);
        where += ` AND a.timestamp < ($${params.length}::date + INTERVAL '1 day')`;
    }

    return { params, where };
}

exports.getAllActuatorLogs = async (req, res) => {
    try {
        const listQuery = parseListQuery(req.query);
        const { params, where } = buildFilters(listQuery);

        if (listQuery.latestPerBox) {
            const { rows } = await pool.query(
                `SELECT DISTINCT ON (a.box_id) ${ACTUATOR_ALIASED}, b.name AS box_name
                 ${ACTUATOR_JOIN} ${where}
                 ORDER BY a.box_id, a.timestamp DESC, a.id DESC`,
                params
            );
            return res.json(rows);
        }

        const countRes = await pool.query(`SELECT COUNT(*)::int AS total ${ACTUATOR_JOIN} ${where}`, params);
        const total = countRes.rows[0]?.total || 0;

        if (!listQuery.paginated) {
            const { rows } = await pool.query(
                `SELECT ${ACTUATOR_ALIASED}, b.name AS box_name
                 ${ACTUATOR_JOIN} ${where}
                 ORDER BY a.timestamp ${listQuery.sort}, a.id ${listQuery.sort}
                 LIMIT ${listQuery.legacyLimit}`,
                params
            );
            return res.json(rows);
        }

        const dataParams = [...params, listQuery.limit, listQuery.offset];
        const limitParam = dataParams.length - 1;
        const offsetParam = dataParams.length;
        const { rows } = await pool.query(
            `SELECT ${ACTUATOR_ALIASED}, b.name AS box_name
             ${ACTUATOR_JOIN} ${where}
             ORDER BY a.timestamp ${listQuery.sort}, a.id ${listQuery.sort}
             LIMIT $${limitParam} OFFSET $${offsetParam}`,
            dataParams
        );

        return res.json({ data: rows, pagination: paginationMeta(listQuery, total) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch actuator_logs' });
    }
};

exports.getLatestActuatorLogs = async (req, res) => {
    try {
        const { box_id } = req.query;
        const params = [];
        let query = `SELECT ${ACTUATOR_COLUMNS} FROM actuator_logs`;

        if (box_id !== undefined && box_id !== '') {
            params.push(resolveBoxId(box_id));
            query += ' WHERE box_id = $1::uuid';
        }

        query += ' ORDER BY timestamp DESC LIMIT 20';
        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch latest actuator_logs' });
    }
};

exports.createActuatorLog = async (req, res) => {
    try {
        const { box_id, type, status, source, timestamp } = req.body;
        const { rows } = await pool.query(
            `INSERT INTO actuator_logs (id, box_id, type, status, source, "timestamp")
             VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4, COALESCE($5::timestamp, CURRENT_TIMESTAMP))
             RETURNING ${ACTUATOR_COLUMNS}`,
            [resolveBoxId(box_id), type || null, status || 'OFF', source || 'real', timestamp || null]
        );

        const io = req.app.get('io');
        if (io) io.emit('new_actuator_logs', rows);

        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create actuator_log' });
    }
};

exports.deleteActuatorLogs = async (req, res) => {
    try {
        const { id } = req.params;
        const { rowCount } = await pool.query('DELETE FROM actuator_logs WHERE id = $1', [id]);
        if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete' });
    }
};
