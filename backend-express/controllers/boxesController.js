const pool = require('../db');

exports.getAllBoxes = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM boxes');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch boxes' });
    }
};

exports.getBoxById = async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await pool.query('SELECT * FROM boxes WHERE id = $1', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Box not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch box' });
    }
};

exports.createBox = async (req, res) => {
    try {
        const { tenant_id, name, is_active } = req.body;
        const { rows } = await pool.query(
            'INSERT INTO boxes (id, tenant_id, name, is_active) VALUES (gen_random_uuid(), $1, $2, $3) RETURNING *',
            [tenant_id, name, is_active ?? true]
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
        const { tenant_id, name, is_active } = req.body;
        const { rows } = await pool.query(
            'UPDATE boxes SET tenant_id = $1, name = $2, is_active = $3 WHERE id = $4 RETURNING *',
            [tenant_id, name, is_active, id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Box not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update box' });
    }
};

exports.deleteBox = async (req, res) => {
    try {
        const { id } = req.params;
        const { rowCount } = await pool.query('DELETE FROM boxes WHERE id = $1', [id]);
        if (rowCount === 0) return res.status(404).json({ error: 'Box not found' });
        res.json({ message: 'Box deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete box' });
    }
};
