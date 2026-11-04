require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set and contain at least 32 characters');
}

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

module.exports = {
  JWT_SECRET,
  DEFAULT_TENANT_ID
};
