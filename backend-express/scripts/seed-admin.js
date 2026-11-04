const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../db');

const generatePassword = () => crypto.randomBytes(24).toString('base64url');

const email = String(process.argv[2] || process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
const username = String(process.argv[3] || process.env.BOOTSTRAP_ADMIN_USERNAME || (email ? email.split('@')[0] : '')).trim();
let tenantId = process.argv[4] || process.env.BOOTSTRAP_ADMIN_TENANT_ID || null;
const providedPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
const password = providedPassword || generatePassword();

if (!email || !email.includes('@')) {
  console.error('Usage: node scripts/seed-admin.js <email> [username] [tenant_id]');
  process.exit(1);
}

if (providedPassword && providedPassword.length < 12) {
  console.error('BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters');
  process.exit(1);
}

(async () => {
  try {
    if (!tenantId) {
      const tenantResult = await pool.query('SELECT id FROM public.tenants ORDER BY created_at ASC LIMIT 1');
      tenantId = tenantResult.rows[0] ? tenantResult.rows[0].id : null;
    }

    const existing = await pool.query(
      'SELECT id FROM public.users WHERE LOWER(TRIM(email)) = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      console.error(`User already exists: ${email}`);
      console.error('Use scripts/reset-password.js to rotate an existing account.');
      process.exitCode = 1;
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO public.users (tenant_id, username, email, password, role, is_active)
       VALUES ($1, $2, $3, $4, 'admin', true)
       RETURNING id, email, role`,
      [tenantId, username, email, passwordHash]
    );

    console.log(`Admin created: ${result.rows[0].email} (${result.rows[0].role})`);
    if (!providedPassword) {
      console.log(`Generated password (shown once): ${password}`);
      console.log('Store this password in a password manager now.');
    }
  } catch (error) {
    console.error('Failed to create admin:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
