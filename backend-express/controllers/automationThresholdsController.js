const pool = require('../db');
const { isUuid, resolveTenantId } = require('../utils/resolveIds');

const THRESHOLD_COLUMNS = 'id, tenant_id, floor_level, temp_min, temp_max, air_hum_min, air_hum_max, media_hum_min, media_hum_max';

function parseFloor(value) {
    const floor = parseInt(value, 10);
    return Number.isNaN(floor) ? null : floor;
}

function parseNumber(value) {
    if (value === null || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}

function buildPayload(body, tenantFallback, floorFallback) {
    return {
        tenantId: resolveTenantId(body.tenant_id, tenantFallback),
        floor: parseFloor(body.floor_level !== undefined ? body.floor_level : floorFallback),
        temp_min: parseNumber(body.temp_min),
        temp_max: parseNumber(body.temp_max),
        air_hum_min: parseNumber(body.air_hum_min),
        air_hum_max: parseNumber(body.air_hum_max),
        media_hum_min: parseNumber(body.media_hum_min),
        media_hum_max: parseNumber(body.media_hum_max)
    };
}

async function findByFloor(tenantId, floor) {
    const { rows } = await pool.query(
        `SELECT ${THRESHOLD_COLUMNS} FROM automation_thresholds
         WHERE tenant_id = $1::uuid AND floor_level = $2
         ORDER BY id LIMIT 1`,
        [tenantId, floor]
    );
    return rows[0] || null;
}

exports.getAllThresholds = async (req, res) => {
    try {
        const { tenant_id, floor_level } = req.query;
        const params = [];
        const conditions = [];

        if (tenant_id !== undefined && tenant_id !== '') {
            params.push(resolveTenantId(tenant_id));
            conditions.push(`tenant_id = $${params.length}::uuid`);
        }

        if (floor_level !== undefined && floor_level !== '') {
            params.push(parseFloor(floor_level));
            conditions.push(`floor_level = $${params.length}`);
        }

        let query = `SELECT ${THRESHOLD_COLUMNS} FROM automation_thresholds`;
        if (conditions.length > 0) query += ` WHERE ${conditions.join(' AND ')}`;
        query += ' ORDER BY floor_level ASC';

        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch automation thresholds' });
    }
};

exports.getThresholdById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isUuid(id)) return res.status(400).json({ error: 'Invalid threshold id' });

        const { rows } = await pool.query(`SELECT ${THRESHOLD_COLUMNS} FROM automation_thresholds WHERE id = $1`, [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Threshold not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch threshold' });
    }
};

exports.getThresholdByFloor = async (req, res) => {
    try {
        const floor = parseFloor(req.params.floorLevel);
        if (floor === null) return res.status(400).json({ error: 'Invalid floor level' });

        const tenantId = resolveTenantId(req.query.tenant_id || (req.user && req.user.tenant_id));
        const threshold = await findByFloor(tenantId, floor);
        if (!threshold) return res.status(404).json({ error: 'Threshold not found' });
        res.json(threshold);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch threshold' });
    }
};

exports.getThresholdByBox = async (req, res) => {
    try {
        const { boxId } = req.params;

        if (isUuid(boxId)) {
            const boxRes = await pool.query('SELECT tenant_id, box_number FROM boxes WHERE id = $1::uuid', [boxId]);
            if (boxRes.rows.length === 0) return res.status(404).json({ error: 'Box not found' });

            const { tenant_id, box_number } = boxRes.rows[0];
            const threshold = box_number !== null ? await findByFloor(tenant_id, box_number) : null;
            if (threshold) return res.json(threshold);

            const { rows } = await pool.query(
                `SELECT ${THRESHOLD_COLUMNS} FROM automation_thresholds WHERE tenant_id = $1::uuid ORDER BY floor_level ASC LIMIT 1`,
                [tenant_id]
            );
            if (rows.length === 0) return res.status(404).json({ error: 'Threshold not found' });
            return res.json(rows[0]);
        }

        const floor = parseFloor(boxId);
        if (floor === null) return res.status(400).json({ error: 'Invalid box or floor id' });

        const tenantId = resolveTenantId(req.query.tenant_id || (req.user && req.user.tenant_id));
        const threshold = await findByFloor(tenantId, floor);
        if (!threshold) return res.status(404).json({ error: 'Threshold not found' });
        res.json(threshold);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch threshold' });
    }
};

exports.createThreshold = async (req, res) => {
    try {
        const payload = buildPayload(req.body, req.user && req.user.tenant_id);
        if (payload.floor === null) return res.status(400).json({ error: 'floor_level wajib diisi' });

        const { rows } = await pool.query(
            `INSERT INTO automation_thresholds
             (id, tenant_id, floor_level, temp_min, temp_max, air_hum_min, air_hum_max, media_hum_min, media_hum_max)
             VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4, $5, $6, $7, $8)
             RETURNING ${THRESHOLD_COLUMNS}`,
            [
                payload.tenantId,
                payload.floor,
                payload.temp_min,
                payload.temp_max,
                payload.air_hum_min,
                payload.air_hum_max,
                payload.media_hum_min,
                payload.media_hum_max
            ]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create threshold' });
    }
};

exports.updateThreshold = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isUuid(id)) return res.status(400).json({ error: 'Invalid threshold id' });

        const existing = await pool.query('SELECT * FROM automation_thresholds WHERE id = $1', [id]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Threshold not found' });
        const current = existing.rows[0];

        const payload = buildPayload(req.body, current.tenant_id, current.floor_level);
        if (payload.floor === null) return res.status(400).json({ error: 'floor_level wajib diisi' });

        const { rows } = await pool.query(
            `UPDATE automation_thresholds
             SET tenant_id = $1::uuid, floor_level = $2, temp_min = $3, temp_max = $4,
                 air_hum_min = $5, air_hum_max = $6, media_hum_min = $7, media_hum_max = $8
             WHERE id = $9
             RETURNING ${THRESHOLD_COLUMNS}`,
            [
                payload.tenantId,
                payload.floor,
                payload.temp_min,
                payload.temp_max,
                payload.air_hum_min,
                payload.air_hum_max,
                payload.media_hum_min,
                payload.media_hum_max,
                id
            ]
        );
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update threshold' });
    }
};

exports.upsertThresholdByFloor = async (req, res) => {
    try {
        const floor = parseFloor(req.params.floorLevel);
        if (floor === null) return res.status(400).json({ error: 'Invalid floor level' });

        const payload = buildPayload(req.body, req.user && req.user.tenant_id, floor);
        payload.floor = floor;

        const existing = await findByFloor(payload.tenantId, floor);
        if (existing) {
            const { rows } = await pool.query(
                `UPDATE automation_thresholds
                 SET temp_min = $1, temp_max = $2, air_hum_min = $3, air_hum_max = $4,
                     media_hum_min = $5, media_hum_max = $6
                 WHERE id = $7
                 RETURNING ${THRESHOLD_COLUMNS}`,
                [
                    payload.temp_min,
                    payload.temp_max,
                    payload.air_hum_min,
                    payload.air_hum_max,
                    payload.media_hum_min,
                    payload.media_hum_max,
                    existing.id
                ]
            );
            return res.json(rows[0]);
        }

        const { rows } = await pool.query(
            `INSERT INTO automation_thresholds
             (id, tenant_id, floor_level, temp_min, temp_max, air_hum_min, air_hum_max, media_hum_min, media_hum_max)
             VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4, $5, $6, $7, $8)
             RETURNING ${THRESHOLD_COLUMNS}`,
            [
                payload.tenantId,
                floor,
                payload.temp_min,
                payload.temp_max,
                payload.air_hum_min,
                payload.air_hum_max,
                payload.media_hum_min,
                payload.media_hum_max
            ]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save threshold' });
    }
};

exports.deleteThreshold = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isUuid(id)) return res.status(400).json({ error: 'Invalid threshold id' });

        const { rowCount } = await pool.query('DELETE FROM automation_thresholds WHERE id = $1', [id]);
        if (rowCount === 0) return res.status(404).json({ error: 'Threshold not found' });
        res.json({ message: 'Threshold deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete threshold' });
    }
};
