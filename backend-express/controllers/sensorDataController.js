const pool = require('../db');

exports.getAllSensorData = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, box_id, air_temp, air_humidity, media_humidity, timestamp FROM sensor_data ORDER BY timestamp DESC LIMIT 100');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch sensor_data' });
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
