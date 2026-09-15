const pool = require('../db');

exports.getAllCvResults = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, box_id, dominant_phase, confidence_score, detection_counts, timestamp FROM cv_results ORDER BY timestamp DESC LIMIT 100');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch cv_results' });
    }
};

exports.deleteCvResults = async (req, res) => {
    try {
        const { id } = req.params;
        const { rowCount } = await pool.query('DELETE FROM cv_results WHERE id = $1', [id]);
        if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete' });
    }
};
