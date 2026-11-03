const pool = require('../db');
const { resolveTenantId } = require('../utils/resolveIds');

exports.getAllNotifications = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, tenant_id, message, is_read, timestamp FROM notifications ORDER BY timestamp DESC LIMIT 100');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

exports.getNotificationById = async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await pool.query('SELECT id, tenant_id, message, is_read, timestamp FROM notifications WHERE id = $1', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch notification' });
    }
};

exports.createNotification = async (req, res) => {
    try {
        const { message, is_read } = req.body;
        if (!message || String(message).trim() === '') {
            return res.status(400).json({ error: 'Message wajib diisi' });
        }

        const tenantId = resolveTenantId(req.body.tenant_id || (req.user && req.user.tenant_id));
        const { rows } = await pool.query(
            'INSERT INTO notifications (id, tenant_id, message, is_read) VALUES (gen_random_uuid(), $1::uuid, $2, $3) RETURNING id, tenant_id, message, is_read, timestamp',
            [tenantId, String(message).trim(), is_read === undefined ? false : Boolean(is_read)]
        );

        const io = req.app.get('io');
        if (io) io.emit('new_notification', rows[0]);

        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create notification' });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await pool.query('UPDATE notifications SET is_read = true WHERE id = $1 RETURNING id, tenant_id, message, is_read, timestamp', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update notification' });
    }
};

exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const { rowCount } = await pool.query('DELETE FROM notifications WHERE id = $1', [id]);
        if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
};
