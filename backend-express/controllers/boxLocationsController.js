const pool = require('../db');

exports.getAllBoxLocations = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, box_id, floor_level, created_at FROM box_locations ORDER BY timestamp DESC LIMIT 100');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch box_locations' });
    }
};

exports.deleteBoxLocations = async (req, res) => {
    try {
        const { id } = req.params;
        const { rowCount } = await pool.query('DELETE FROM box_locations WHERE id = $1', [id]);
        if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete' });
    }
};
