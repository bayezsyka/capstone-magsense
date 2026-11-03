const pool = require('../db');
const { resolveBoxId } = require('../utils/resolveIds');

const ACTUATOR_COLUMNS = 'id, box_id, type, status, source, timestamp';

exports.getAllActuatorLogs = async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT ${ACTUATOR_COLUMNS} FROM actuator_logs ORDER BY timestamp DESC LIMIT 100`);
        res.json(rows);
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
