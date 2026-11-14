const pool = require('../db');
const { resolveTenantId } = require('../utils/resolveIds');

const NOTIFICATION_COLUMNS = 'id, tenant_id, message, notification_type, target_role, severity, box_id, is_read, timestamp';
const allowedRoles = new Set(['admin', 'operator', 'pembudidaya']);
const allowedSeverities = new Set(['info', 'warning', 'critical']);

function roleOf(req) {
    return String(req.user?.role || '').toLowerCase();
}

function notificationScope(req) {
    const role = roleOf(req);
    const params = [role];
    let where = `(target_role = 'all' OR LOWER(target_role) = $1)`;
    if (req.user?.tenant_id) {
        params.push(req.user.tenant_id);
        where += ` AND (tenant_id IS NULL OR tenant_id = $${params.length}::uuid)`;
    }
    return { where, params };
}

exports.getAllNotifications = async (req, res) => {
    try {
        const { where, params } = notificationScope(req);
        const { rows } = await pool.query(`SELECT ${NOTIFICATION_COLUMNS} FROM notifications WHERE ${where} ORDER BY timestamp DESC LIMIT 100`, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

exports.getNotificationById = async (req, res) => {
    try {
        const { id } = req.params;
        const { where, params } = notificationScope(req);
        const idParam = params.length + 1;
        const { rows } = await pool.query(`SELECT ${NOTIFICATION_COLUMNS} FROM notifications WHERE id = $${idParam} AND ${where}`, [...params, id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch notification' });
    }
};

exports.createNotification = async (req, res) => {
    try {
        const { message, is_read, notification_type, target_role, severity, box_id } = req.body;
        if (!message || String(message).trim() === '') {
            return res.status(400).json({ error: 'Message wajib diisi' });
        }
        const targetRole = String(target_role || 'all').toLowerCase();
        const notificationSeverity = String(severity || 'info').toLowerCase();
        if (targetRole !== 'all' && !allowedRoles.has(targetRole)) return res.status(400).json({ error: 'Target role tidak valid' });
        if (!allowedSeverities.has(notificationSeverity)) return res.status(400).json({ error: 'Severity tidak valid' });

        const tenantId = resolveTenantId(req.body.tenant_id || (req.user && req.user.tenant_id));
        const { rows } = await pool.query(
            `INSERT INTO notifications (id, tenant_id, message, notification_type, target_role, severity, box_id, is_read)
             VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4, $5, $6::uuid, $7)
             RETURNING ${NOTIFICATION_COLUMNS}`,
            [tenantId, String(message).trim(), String(notification_type || 'info').trim(), targetRole, notificationSeverity, box_id || null, is_read === undefined ? false : Boolean(is_read)]
        );

        const io = req.app.get('io');
        if (io) {
            const room = targetRole === 'all' ? `tenant:${tenantId}` : `role:${targetRole}:tenant:${tenantId}`;
            io.to(room).emit('new_notification', rows[0]);
        }

        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create notification' });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const { where, params } = notificationScope(req);
        const idParam = params.length + 1;
        const { rows } = await pool.query(`UPDATE notifications SET is_read = true WHERE id = $${idParam} AND ${where} RETURNING ${NOTIFICATION_COLUMNS}`, [...params, id]);
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
        const { where, params } = notificationScope(req);
        const idParam = params.length + 1;
        const { rowCount } = await pool.query(`DELETE FROM notifications WHERE id = $${idParam} AND ${where}`, [...params, id]);
        if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
};
