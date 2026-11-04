const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../db');

const generatePassword = () => crypto.randomBytes(24).toString('base64url');

const email = String(process.argv[2] || process.env.TARGET_EMAIL || '').trim().toLowerCase();
const providedPassword = process.env.NEW_PASSWORD;
const newPassword = providedPassword || generatePassword();

if (!email || !email.includes('@')) {
  console.error('Usage: node scripts/reset-password.js <email>');
  process.exit(1);
}

if (providedPassword && providedPassword.length < 12) {
  console.error('NEW_PASSWORD must contain at least 12 characters');
  process.exit(1);
}

(async () => {
  try {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    const result = await pool.query(
      `UPDATE public.users
       SET password = $1
       WHERE LOWER(TRIM(email)) = $2
       RETURNING id, email`,
      [passwordHash, email]
    );

    if (result.rows.length === 0) {
      console.error(`User not found: ${email}`);
      process.exitCode = 1;
      return;
    }

    console.log(`Password updated for: ${result.rows[0].email}`);
    if (!providedPassword) {
      console.log(`Generated password (shown once): ${newPassword}`);
      console.log('Store this password in a password manager now.');
    }
    console.log('Rotate JWT_SECRET to invalidate all existing sessions.');
  } catch (error) {
    console.error('Failed to reset password:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
