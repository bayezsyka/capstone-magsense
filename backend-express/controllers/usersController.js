const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Login User
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Email atau password salah' });
        }
        const user = result.rows[0];
        
        if (user.is_active === false) {
            return res.status(403).json({ error: 'Akun dinonaktifkan. Silakan hubungi administrator.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Email atau password salah' });
        }
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, tenant_id: user.tenant_id },
            process.env.JWT_SECRET || 'secret123',
            { expiresIn: '1d' }
        );
        res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role, tenant_id: user.tenant_id } });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Gagal melakukan login' });
    }
};

// Get Profile of Authenticated User
exports.getProfile = async (req, res) => {
    try {
        const userId = req.user && req.user.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: User ID tidak valid' });
        }
        const result = await pool.query(
            'SELECT id, username, email, role, is_active, tenant_id, created_at FROM users WHERE id = $1',
            [userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User tidak ditemukan' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching profile:', err);
        res.status(500).json({ error: 'Gagal memuat profil' });
    }
};

// Update Profile Name of Authenticated User
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user && req.user.id;
        const { name, username } = req.body;
        const newName = name || username;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: User ID tidak valid' });
        }
        if (!newName || !newName.trim()) {
            return res.status(400).json({ error: 'Nama pengguna tidak boleh kosong' });
        }
        const result = await pool.query(
            'UPDATE users SET username = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username, email, role, is_active',
            [newName.trim(), userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User tidak ditemukan' });
        }
        res.json({ message: 'Profil berhasil diperbarui', user: result.rows[0] });
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({ error: 'Gagal memperbarui profil' });
    }
};

// Update Password of Authenticated User
exports.updatePassword = async (req, res) => {
    try {
        const userId = req.user && req.user.id;
        const { currentPassword, newPassword } = req.body;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: User ID tidak valid' });
        }
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Password saat ini dan password baru wajib diisi' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password baru minimal 6 karakter' });
        }
        const userRes = await pool.query('SELECT password FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'User tidak ditemukan' });
        }
        const isMatch = await bcrypt.compare(currentPassword, userRes.rows[0].password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Password saat ini salah' });
        }
        const hashed = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hashed, userId]);
        res.json({ message: 'Password berhasil diperbarui' });
    } catch (err) {
        console.error('Error updating password:', err);
        res.status(500).json({ error: 'Gagal memperbarui password' });
    }
};

// Get All Users
exports.getAllUsers = async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, email, role, is_active, tenant_id, created_at FROM users ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Gagal mengambil data pengguna' });
    }
};

// Get User by ID
exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT id, username, email, role, is_active, tenant_id, created_at FROM users WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User tidak ditemukan' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching user:', err);
        res.status(500).json({ error: 'Gagal mengambil data user' });
    }
};

// Create User
exports.createUser = async (req, res) => {
    try {
        const { username, email, password, role, tenant_id, is_active } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const effectiveTenantId = tenant_id && tenant_id.trim() !== '' ? tenant_id : null;
        const effectiveUsername = username && username.trim() !== '' ? username.trim() : email.split('@')[0];
        const effectiveActive = is_active !== undefined ? Boolean(is_active) : true;

        const result = await pool.query(
            'INSERT INTO users (username, email, password, role, tenant_id, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email, role, is_active, tenant_id, created_at',
            [effectiveUsername, email, hashedPassword, role || 'operator', effectiveTenantId, effectiveActive]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating user:', err);
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Email sudah terdaftar' });
        }
        res.status(500).json({ error: 'Gagal membuat user' });
    }
};

// Update User
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, role, tenant_id, is_active, password } = req.body;
        const effectiveTenantId = tenant_id && tenant_id.trim() !== '' ? tenant_id : null;
        
        let query = '';
        let params = [];
        
        if (password && password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(password, 10);
            query = 'UPDATE users SET username = COALESCE($1, username), email = COALESCE($2, email), role = COALESCE($3, role), tenant_id = $4, is_active = COALESCE($5, is_active), password = $6, updated_at = NOW() WHERE id = $7 RETURNING id, username, email, role, is_active, tenant_id, updated_at';
            params = [username, email, role, effectiveTenantId, is_active, hashedPassword, id];
        } else {
            query = 'UPDATE users SET username = COALESCE($1, username), email = COALESCE($2, email), role = COALESCE($3, role), tenant_id = $4, is_active = COALESCE($5, is_active), updated_at = NOW() WHERE id = $6 RETURNING id, username, email, role, is_active, tenant_id, updated_at';
            params = [username, email, role, effectiveTenantId, is_active, id];
        }

        const result = await pool.query(query, params);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User tidak ditemukan' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).json({ error: 'Gagal memperbarui user' });
    }
};

// Delete User
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User tidak ditemukan' });
        }
        res.json({ message: 'User berhasil dihapus', id });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ error: 'Gagal menghapus user' });
    }
};
