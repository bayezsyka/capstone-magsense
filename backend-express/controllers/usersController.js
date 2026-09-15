const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.getAllUsers = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM users');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
};

exports.createUser = async (req, res) => {
    try {
        const { tenant_id, username, email, password, role, is_active } = req.body;
        
        // Hash password before saving
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const { rows } = await pool.query(
            'INSERT INTO users (id, tenant_id, username, email, password, role, is_active) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6) RETURNING id, tenant_id, username, email, role, is_active, created_at',
            [tenant_id, username, email, hashedPassword, role, is_active ?? true]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error("Error creating user:", err);
        if (err.code === '23505') { // PostgreSQL unique violation error code
             return res.status(409).json({ error: 'Email sudah terdaftar' });
        }
        res.status(500).json({ error: 'Failed to create user' });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { tenant_id, username, email, password, role, is_active } = req.body;
        
        let query;
        let params;
        
        if (password) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            query = 'UPDATE users SET tenant_id = $1, username = $2, email = $3, password = $4, role = $5, is_active = $6 WHERE id = $7 RETURNING id, tenant_id, username, email, role, is_active, updated_at';
            params = [tenant_id, username, email, hashedPassword, role, is_active ?? true, id];
        } else {
            query = 'UPDATE users SET tenant_id = $1, username = $2, email = $3, role = $4, is_active = $5 WHERE id = $6 RETURNING id, tenant_id, username, email, role, is_active, updated_at';
            params = [tenant_id, username, email, role, is_active ?? true, id];
        }

        const { rows } = await pool.query(query, params);
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error("Error updating user:", err);
        if (err.code === '23505') {
             return res.status(409).json({ error: 'Email sudah terdaftar' });
        }
        res.status(500).json({ error: 'Failed to update user' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [id]);
        if (rowCount === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        // 1. Find user by email
        const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Email atau password salah' });
        }
        
        const user = rows[0];
        
        // 2. Cek status aktif
        if (!user.is_active) {
            return res.status(403).json({ error: 'Akun dinonaktifkan' });
        }

        // 3. Verifikasi password (asumsi di DB plaintext untuk sekarang, atau bcrypt)
        // Jika di DB masih plaintext (dari dummy data), kita cek langsung
        // Di produksi wajib bcrypt.compare(password, user.password)
        let isMatch = false;
        
        // Temporary logic to allow plaintext passwords if bcrypt fails
        try {
            isMatch = await bcrypt.compare(password, user.password);
        } catch (e) {
            isMatch = false;
        }
        
        if (!isMatch && password === user.password) {
            isMatch = true; // Fallback for old plaintext seed data
        }
        
        if (!isMatch) {
            return res.status(401).json({ error: 'Email atau password salah' });
        }
        
        // 4. Generate JWT
        const token = jwt.sign(
            { id: user.id, role: user.role, tenant_id: user.tenant_id },
            process.env.JWT_SECRET || 'REDACTED_JWT_SECRET',
            { expiresIn: '24h' }
        );
        
        // Return without password
        delete user.password;
        
        res.json({ token, user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login gagal karena server error' });
    }
};
