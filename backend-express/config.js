require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'REDACTED_JWT_SECRET';
const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

module.exports = {
  JWT_SECRET,
  DEFAULT_TENANT_ID
};
