const pool = require('../db');

exports.getAllHarvestPredictions = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, box_id, estimated_days, urgency_level, timestamp FROM harvest_predictions ORDER BY timestamp DESC LIMIT 100');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch harvest_predictions' });
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
