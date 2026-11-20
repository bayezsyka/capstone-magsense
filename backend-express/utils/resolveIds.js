const { DEFAULT_TENANT_ID } = require('../config');

const BOX_UUID_MAP = {
  1: '00000000-0000-0000-0000-000000000001',
  2: '00000000-0000-0000-0000-000000000002',
  3: '00000000-0000-0000-0000-000000000003',
  'MAG-01': '00000000-0000-0000-0000-000000000001',
  'MAG-02': '00000000-0000-0000-0000-000000000002',
  'MAG-03': '00000000-0000-0000-0000-000000000003',
  'BOX-1': '00000000-0000-0000-0000-000000000001',
  'BOX-2': '00000000-0000-0000-0000-000000000002',
  'BOX-3': '00000000-0000-0000-0000-000000000003'
};

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

function resolveBoxId(input, fallback = BOX_UUID_MAP[1]) {
  if (input === undefined || input === null || input === '') return fallback;
  if (typeof input === 'number' && BOX_UUID_MAP[input]) return BOX_UUID_MAP[input];
  if (isUuid(input)) return input;
  const str = String(input).trim();
  if (BOX_UUID_MAP[str]) return BOX_UUID_MAP[str];
  const upper = str.toUpperCase();
  if (BOX_UUID_MAP[upper]) return BOX_UUID_MAP[upper];
  const num = parseInt(str, 10);
  if (!Number.isNaN(num) && BOX_UUID_MAP[num]) return BOX_UUID_MAP[num];
  const match = str.match(/\d+/);
  if (match) {
    const parsedNum = parseInt(match[0], 10);
    if (BOX_UUID_MAP[parsedNum]) return BOX_UUID_MAP[parsedNum];
  }
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
