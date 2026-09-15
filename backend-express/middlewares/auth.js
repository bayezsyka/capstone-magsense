const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
        return res.status(403).json({ error: 'Token otorisasi diperlukan' });
    }

    // Biasanya formatnya "Bearer <token>"
    const token = authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(403).json({ error: 'Format token salah' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'REDACTED_JWT_SECRET');
        req.user = decoded; // Menyimpan payload JWT ke dalam req.user
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token tidak valid atau sudah kedaluwarsa' });
    }
};

const requireAdmin = (req, res, next) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'Admin')) {
        return res.status(403).json({ error: 'Akses ditolak: Memerlukan hak akses Admin' });
    }
    next();
};

module.exports = {
    verifyToken,
    requireAdmin
};
