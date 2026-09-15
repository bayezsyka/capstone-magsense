const pool = require('../db');

exports.getAllActuatorLogs = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, box_id, type, status, timestamp FROM actuator_logs ORDER BY timestamp DESC LIMIT 100');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch actuator_logs' });
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
