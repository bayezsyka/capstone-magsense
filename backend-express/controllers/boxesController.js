const pool = require('../db');
const { isUuid, resolveTenantId } = require('../utils/resolveIds');

const BOX_COLUMNS = 'id, tenant_id, name, box_number, is_active, created_at';

function toBoolean(value, fallback) {
    if (value === undefined) return fallback;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return Boolean(value);
}

function isValidBoxId(id) {
    return isUuid(id);
}

exports.getAllBoxes = async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT ${BOX_COLUMNS} FROM boxes ORDER BY box_number NULLS LAST, name`);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch boxes' });
    }
};

exports.getBoxById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidBoxId(id)) return res.status(400).json({ error: 'Invalid box id' });

        const { rows } = await pool.query(`SELECT ${BOX_COLUMNS} FROM boxes WHERE id = $1`, [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Box not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch box' });
    }
};

exports.getBoxSensorHistory = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidBoxId(id)) return res.status(400).json({ error: 'Invalid box id' });

        const hours = Math.min(Math.max(parseInt(req.query.hours, 10) || 24, 1), 720);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 1000, 1), 5000);

        const { rows } = await pool.query(
            `SELECT id, box_id, air_temp, air_humidity, media_humidity, raw_soil_adc, source, timestamp
             FROM sensor_data
             WHERE box_id = $1::uuid AND timestamp >= NOW() - ($2 * INTERVAL '1 hour')
             ORDER BY timestamp ASC
             LIMIT $3`,
            [id, hours, limit]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch box sensor history' });
    }
};

exports.createBox = async (req, res) => {
    try {
        const { tenant_id, name, box_number, is_active } = req.body;
        if (!name || String(name).trim() === '') {
            return res.status(400).json({ error: 'Nama box wajib diisi' });
        }

        const { rows } = await pool.query(
            `INSERT INTO boxes (id, tenant_id, name, box_number, is_active)
             VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4)
             RETURNING ${BOX_COLUMNS}`,
            [resolveTenantId(tenant_id), String(name).trim(), box_number ?? null, toBoolean(is_active, true)]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create box' });
    }
};

exports.updateBox = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidBoxId(id)) return res.status(400).json({ error: 'Invalid box id' });

        const existing = await pool.query('SELECT * FROM boxes WHERE id = $1', [id]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Box not found' });
        const current = existing.rows[0];

        const { tenant_id, name, box_number, is_active } = req.body;
        const newTenantId = tenant_id !== undefined ? resolveTenantId(tenant_id, current.tenant_id) : current.tenant_id;
        const newName = name !== undefined && name !== null && String(name).trim() !== '' ? String(name).trim() : current.name;
        const newBoxNumber = box_number !== undefined ? box_number : current.box_number;
        const newIsActive = toBoolean(is_active, current.is_active);

        const { rows } = await pool.query(
            `UPDATE boxes SET tenant_id = $1::uuid, name = $2, box_number = $3, is_active = $4
             WHERE id = $5
             RETURNING ${BOX_COLUMNS}`,
            [newTenantId, newName, newBoxNumber, newIsActive, id]
        );

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update box' });
    }
};

exports.deleteBox = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidBoxId(id)) return res.status(400).json({ error: 'Invalid box id' });

        const { rowCount } = await pool.query('DELETE FROM boxes WHERE id = $1', [id]);
        if (rowCount === 0) return res.status(404).json({ error: 'Box not found' });
        res.json({ message: 'Box deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete box' });
    }
};
