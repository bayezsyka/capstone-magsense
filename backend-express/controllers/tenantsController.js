const pool = require('../db');

exports.getAllTenants = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM tenants');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch tenants' });
    }
};

exports.getTenantById = async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await pool.query('SELECT * FROM tenants WHERE id = $1', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Tenant not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch tenant' });
    }
};

exports.createTenant = async (req, res) => {
    try {
        const { name, tenant_code, contact_person, phone, address, is_active } = req.body;
        const { rows } = await pool.query(
            'INSERT INTO tenants (id, name, tenant_code, contact_person, phone, address, is_active) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6) RETURNING *',
            [name, tenant_code, contact_person, phone, address, is_active ?? true]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create tenant' });
    }
};

exports.updateTenant = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, tenant_code, contact_person, phone, address, is_active } = req.body;
        const { rows } = await pool.query(
            'UPDATE tenants SET name = $1, tenant_code = $2, contact_person = $3, phone = $4, address = $5, is_active = $6 WHERE id = $7 RETURNING *',
            [name, tenant_code, contact_person, phone, address, is_active, id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Tenant not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update tenant' });
    }
};

exports.deleteTenant = async (req, res) => {
    try {
        const { id } = req.params;
        const { rowCount } = await pool.query('DELETE FROM tenants WHERE id = $1', [id]);
        if (rowCount === 0) return res.status(404).json({ error: 'Tenant not found' });
        res.json({ message: 'Tenant deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete tenant' });
    }
};
