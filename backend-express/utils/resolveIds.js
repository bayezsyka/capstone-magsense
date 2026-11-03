const { DEFAULT_TENANT_ID } = require('../config');

const BOX_UUID_MAP = {
  1: '00000000-0000-0000-0000-000000000001',
  2: '00000000-0000-0000-0000-000000000002',
  3: '00000000-0000-0000-0000-000000000003'
};

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

function resolveBoxId(input, fallback = BOX_UUID_MAP[1]) {
  if (input === undefined || input === null || input === '') return fallback;
  if (typeof input === 'number' && BOX_UUID_MAP[input]) return BOX_UUID_MAP[input];
  if (isUuid(input)) return input;
  const num = parseInt(String(input), 10);
  if (!Number.isNaN(num) && BOX_UUID_MAP[num]) return BOX_UUID_MAP[num];
  return fallback;
}

function resolveTenantId(input, fallback = DEFAULT_TENANT_ID) {
  if (isUuid(input)) return input;
  if (typeof input === 'number') return fallback;
  if (typeof input === 'string' && input.trim() !== '') {
    if (isUuid(input.trim())) return input.trim();
    return fallback;
  }
  return fallback;
}

module.exports = {
  BOX_UUID_MAP,
  DEFAULT_TENANT_ID,
  isUuid,
  resolveBoxId,
  resolveTenantId
};
