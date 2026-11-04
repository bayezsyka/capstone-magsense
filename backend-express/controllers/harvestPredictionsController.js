const pool = require('../db');
const { resolveBoxId } = require('../utils/resolveIds');
const { paginationMeta, parseListQuery } = require('../utils/listQuery');

const PREDICTION_COLUMNS = 'id, box_id, estimated_days, urgency_level, confidence, source, timestamp';
const PREDICTION_ALIASED = PREDICTION_COLUMNS
    .split(', ')
    .map((column) => `p.${column}`)
    .join(', ');
const PREDICTION_JOIN = 'FROM harvest_predictions p LEFT JOIN boxes b ON b.id = p.box_id';

function buildFilters(listQuery) {
    const params = [];
    let where = 'WHERE 1=1';

    if (listQuery.boxId) {
        params.push(resolveBoxId(listQuery.boxId));
        where += ` AND p.box_id = $${params.length}::uuid`;
    }
    if (listQuery.search) {
        params.push(`%${listQuery.search}%`);
        where += ` AND (b.name ILIKE $${params.length} OR p.urgency_level ILIKE $${params.length} OR p.source ILIKE $${params.length} OR p.box_id::text ILIKE $${params.length})`;
    }
    if (listQuery.start) {
        params.push(listQuery.start);
        where += ` AND p.timestamp >= $${params.length}::timestamp`;
    }
    if (listQuery.end) {
        params.push(listQuery.end);
        where += ` AND p.timestamp < ($${params.length}::date + INTERVAL '1 day')`;
    }

    return { params, where };
}

exports.getAllHarvestPredictions = async (req, res) => {
    try {
        const listQuery = parseListQuery(req.query);
        const { params, where } = buildFilters(listQuery);

        if (listQuery.latestPerBox) {
            const { rows } = await pool.query(
                `SELECT DISTINCT ON (p.box_id) ${PREDICTION_ALIASED}, b.name AS box_name
                 ${PREDICTION_JOIN} ${where}
                 ORDER BY p.box_id, p.timestamp DESC, p.id DESC`,
                params
            );
            return res.json(rows);
        }

        const countRes = await pool.query(`SELECT COUNT(*)::int AS total ${PREDICTION_JOIN} ${where}`, params);
        const total = countRes.rows[0]?.total || 0;

        if (!listQuery.paginated) {
            const { rows } = await pool.query(
                `SELECT ${PREDICTION_ALIASED}, b.name AS box_name
                 ${PREDICTION_JOIN} ${where}
                 ORDER BY p.timestamp ${listQuery.sort}, p.id ${listQuery.sort}
                 LIMIT ${listQuery.legacyLimit}`,
                params
            );
            return res.json(rows);
        }

        const dataParams = [...params, listQuery.limit, listQuery.offset];
        const limitParam = dataParams.length - 1;
        const offsetParam = dataParams.length;
        const { rows } = await pool.query(
            `SELECT ${PREDICTION_ALIASED}, b.name AS box_name
             ${PREDICTION_JOIN} ${where}
             ORDER BY p.timestamp ${listQuery.sort}, p.id ${listQuery.sort}
             LIMIT $${limitParam} OFFSET $${offsetParam}`,
            dataParams
        );

        return res.json({ data: rows, pagination: paginationMeta(listQuery, total) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch harvest_predictions' });
    }
};

exports.getLatestHarvestPrediction = async (req, res) => {
    try {
        const { box_id } = req.query;
        const params = [];
        let query = `SELECT ${PREDICTION_COLUMNS} FROM harvest_predictions`;

        if (box_id !== undefined && box_id !== '') {
            params.push(resolveBoxId(box_id));
            query += ' WHERE box_id = $1::uuid';
        }

        query += ' ORDER BY timestamp DESC LIMIT 1';
        const { rows } = await pool.query(query, params);
        res.json(rows[0] || null);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch latest harvest_prediction' });
    }
};

exports.createHarvestPrediction = async (req, res) => {
    try {
        const { box_id, estimated_days, predicted_days, urgency_level, confidence, source, timestamp } = req.body;
        const days = estimated_days !== undefined ? estimated_days : predicted_days;

        const { rows } = await pool.query(
            `INSERT INTO harvest_predictions (id, box_id, estimated_days, urgency_level, confidence, source, "timestamp")
             VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4, $5, COALESCE($6::timestamp, CURRENT_TIMESTAMP))
             RETURNING ${PREDICTION_COLUMNS}`,
            [resolveBoxId(box_id), days ?? null, urgency_level || 'Medium', confidence ?? null, source || 'real', timestamp || null]
        );

        const io = req.app.get('io');
        if (io) io.emit('new_harvest_predictions', rows);

        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create harvest_prediction' });
    }
};

exports.deleteHarvestPredictions = async (req, res) => {
    try {
        const { id } = req.params;
        const { rowCount } = await pool.query('DELETE FROM harvest_predictions WHERE id = $1', [id]);
        if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete' });
    }
};
