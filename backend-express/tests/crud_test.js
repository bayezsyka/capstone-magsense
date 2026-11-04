const BASE_URL = (process.env.API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;
const OPERATOR_EMAIL = process.env.TEST_OPERATOR_EMAIL;
const OPERATOR_PASSWORD = process.env.TEST_OPERATOR_PASSWORD;

const missingTestCredentials = [
  ['TEST_ADMIN_EMAIL', ADMIN_EMAIL],
  ['TEST_ADMIN_PASSWORD', ADMIN_PASSWORD],
  ['TEST_OPERATOR_EMAIL', OPERATOR_EMAIL],
  ['TEST_OPERATOR_PASSWORD', OPERATOR_PASSWORD]
].filter(([, value]) => !value).map(([name]) => name);

if (missingTestCredentials.length > 0) {
  console.error('Missing required test credentials:', missingTestCredentials.join(', '));
  console.error('Use dedicated test accounts, never production accounts.');
  process.exit(1);
}

const isLocalApi = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(BASE_URL);
if (!isLocalApi && process.env.ALLOW_REMOTE_TEST !== 'true') {
  console.error(`Refusing to run destructive tests against non-local API: ${BASE_URL}`);
  console.error('Set ALLOW_REMOTE_TEST=true only for an isolated test environment.');
  process.exit(1);
}

let passed = 0;
let failed = 0;
let defaultToken = null;

const cleanupTasks = [];

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const request = async (method, path, { token, body } = {}) => {
  const headers = {};
  const authToken = token || defaultToken;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  return { status: response.status, data };
};

const expectStatus = (result, expected, label) => {
  if (result.status !== expected) {
    throw new Error(`${label}: expected HTTP ${expected}, got ${result.status} ${JSON.stringify(result.data)}`);
  }
};

const test = async (name, fn) => {
  try {
    await fn();
    passed++;
    console.log(`PASS  ${name}`);
  } catch (error) {
    failed++;
    console.error(`FAIL  ${name}`);
    console.error(`      ${error.message}`);
  }
};

const addCleanup = (label, fn) => {
  cleanupTasks.push({ label, fn });
};

const runCleanup = async () => {
  for (let i = cleanupTasks.length - 1; i >= 0; i--) {
    const { label, fn } = cleanupTasks[i];
    try {
      await fn();
    } catch (error) {
      console.warn(`WARN  cleanup ${label}: ${error.message}`);
    }
  }
};

const main = async () => {
  const suffix = Date.now();
  let adminToken = null;
  let operatorToken = null;
  let tenantId = null;
  let userId = null;
  let boxId = null;
  let sensorId = null;
  let cvId = null;
  let actuatorId = null;
  let harvestId = null;
  let notificationId = null;
  let thresholdId = null;

  const login = async (email, password) => request('POST', '/users/login', { body: { email, password } });

  await test('login admin', async () => {
    const result = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    expectStatus(result, 200, 'login admin');
    assert(result.data?.token, 'response login tidak berisi token');
    adminToken = result.data.token;
    defaultToken = adminToken;
  });

  if (!adminToken) {
    console.error(`\nTidak dapat login sebagai ${ADMIN_EMAIL}. Pastikan backend lokal berjalan di ${BASE_URL}.`);
    await runCleanup();
    process.exitCode = 1;
    return;
  }

  await test('get profile', async () => {
    const result = await request('GET', '/users/profile', { token: adminToken });
    expectStatus(result, 200, 'get profile');
    assert(result.data?.email, 'profil tidak memiliki email');
  });

  await test('create tenant', async () => {
    const result = await request('POST', '/tenants', {
      token: adminToken,
      body: {
        name: `Test Tenant ${suffix}`,
        tenant_code: `TEST-${suffix}`,
        contact_person: 'Automated Test',
        phone: '0800000000',
        address: 'Test Address',
        is_active: true
      }
    });
    expectStatus(result, 201, 'create tenant');
    assert(result.data?.id, 'tenant tidak memiliki id');
    tenantId = result.data.id;
    addCleanup('tenant', () => request('DELETE', `/tenants/${tenantId}`, { token: adminToken }));
  });

  await test('get and update tenant', async () => {
    const getResult = await request('GET', `/tenants/${tenantId}`);
    expectStatus(getResult, 200, 'get tenant');
    assert(getResult.data?.id === tenantId, 'tenant id tidak sesuai');

    const updateResult = await request('PUT', `/tenants/${tenantId}`, {
      token: adminToken,
      body: {
        ...getResult.data,
        name: `Test Tenant Updated ${suffix}`
      }
    });
    expectStatus(updateResult, 200, 'update tenant');
    assert(updateResult.data?.name.includes('Updated'), 'nama tenant tidak terupdate');
  });

  await test('create and update user', async () => {
    const result = await request('POST', '/users', {
      token: adminToken,
      body: {
        username: `testuser${suffix}`,
        email: `testuser${suffix}@example.com`,
        password: 'test-password-123',
        role: 'Operator',
        tenant_id: tenantId,
        is_active: true
      }
    });
    expectStatus(result, 201, 'create user');
    assert(result.data?.id, 'user tidak memiliki id');
    userId = result.data.id;
    addCleanup('user', () => request('DELETE', `/users/${userId}`, { token: adminToken }));

    const updateResult = await request('PUT', `/users/${userId}`, {
      token: adminToken,
      body: { username: `testuser${suffix}-updated`, is_active: true }
    });
    expectStatus(updateResult, 200, 'update user');
    assert(updateResult.data?.username.includes('updated'), 'username tidak terupdate');
  });

  await test('create and update box', async () => {
    const result = await request('POST', '/boxes', {
      body: {
        tenant_id: tenantId,
        name: `Test Box ${suffix}`,
        box_number: 9001,
        is_active: true
      }
    });
    expectStatus(result, 201, 'create box');
    assert(result.data?.id, 'box tidak memiliki id');
    boxId = result.data.id;
    addCleanup('box', () => request('DELETE', `/boxes/${boxId}`));

    const updateResult = await request('PUT', `/boxes/${boxId}`, {
      body: { name: `Test Box Updated ${suffix}`, is_active: false }
    });
    expectStatus(updateResult, 200, 'update box');
    assert(updateResult.data?.name.includes('Updated'), 'nama box tidak terupdate');
    assert(updateResult.data?.is_active === false, 'status box tidak terupdate');
  });

  await test('get box sensor history', async () => {
    const result = await request('GET', `/boxes/${boxId}/sensor-history`);
    expectStatus(result, 200, 'box sensor history');
    assert(Array.isArray(result.data), 'riwayat sensor box bukan array');
  });

  await test('create sensor data and read latest/history', async () => {
    const result = await request('POST', '/sensor-data', {
      body: {
        box_id: boxId,
        air_temp: 28.5,
        air_humidity: 72.3,
        media_humidity: 55.1,
        raw_soil_adc: 2200,
        source: 'test'
      }
    });
    expectStatus(result, 201, 'create sensor data');
    sensorId = result.data?.id;
    assert(sensorId, 'sensor data tidak memiliki id');
    addCleanup('sensor data', () => request('DELETE', `/sensor-data/${sensorId}`));

    const latest = await request('GET', `/sensor-data/latest?box_id=${boxId}`);
    expectStatus(latest, 200, 'latest sensor data');
    assert(latest.data?.id === sensorId, 'latest sensor data bukan data yang baru dibuat');

    const history = await request('GET', `/sensor-data/history?hours=24&box_id=${boxId}`);
    expectStatus(history, 200, 'sensor history');
    assert(Array.isArray(history.data), 'sensor history bukan array');
    assert(history.data.some(row => row.id === sensorId), 'sensor history tidak memuat data uji');

    const boxHistory = await request('GET', `/boxes/${boxId}/sensor-history`);
    expectStatus(boxHistory, 200, 'box sensor history after insert');
    assert(boxHistory.data.some(row => row.id === sensorId), 'riwayat sensor box tidak memuat data uji');
  });

  await test('create CV result and read latest', async () => {
    const result = await request('POST', '/cv-results', {
      body: {
        box_id: boxId,
        dominant_phase: 'ADULT LARVA',
        confidence_score: 0.93,
        detection_counts: {
          baby_larva: 1,
          adult_larva: 2,
          prepupa: 3,
          pupa: 4
        },
        source: 'test'
      }
    });
    expectStatus(result, 201, 'create CV result');
    cvId = result.data?.id;
    assert(cvId, 'CV result tidak memiliki id');
    addCleanup('CV result', () => request('DELETE', `/cv-results/${cvId}`));

    const latest = await request('GET', `/cv-results/latest?box_id=${boxId}`);
    expectStatus(latest, 200, 'latest CV result');
    assert(latest.data?.id === cvId, 'latest CV result bukan data yang baru dibuat');
    assert(latest.data?.adult_larva === 2, 'detection_counts tidak di-flatten dengan benar');
    assert(latest.data?.total_detected === 10, 'total_detected tidak dihitung dengan benar');
  });

  await test('create actuator log and read latest', async () => {
    const result = await request('POST', '/actuator-logs', {
      body: {
        box_id: boxId,
        type: 'kipas',
        status: 'ON',
        source: 'test'
      }
    });
    expectStatus(result, 201, 'create actuator log');
    actuatorId = result.data?.id;
    assert(actuatorId, 'actuator log tidak memiliki id');
    addCleanup('actuator log', () => request('DELETE', `/actuator-logs/${actuatorId}`));

    const latest = await request('GET', `/actuator-logs/latest?box_id=${boxId}`);
    expectStatus(latest, 200, 'latest actuator log');
    assert(Array.isArray(latest.data), 'latest actuator log bukan array');
    const created = latest.data.find(row => row.id === actuatorId);
    assert(created, 'latest actuator log tidak memuat data yang baru dibuat');
    assert(String(created.status).toUpperCase() === 'ON', 'status actuator tidak sesuai');
  });

  await test('create harvest prediction and read latest', async () => {
    const result = await request('POST', '/harvest-predictions', {
      body: {
        box_id: boxId,
        estimated_days: 9.5,
        urgency_level: 'High',
        confidence: 0.9,
        source: 'test'
      }
    });
    expectStatus(result, 201, 'create harvest prediction');
    harvestId = result.data?.id;
    assert(harvestId, 'harvest prediction tidak memiliki id');
    addCleanup('harvest prediction', () => request('DELETE', `/harvest-predictions/${harvestId}`));

    const latest = await request('GET', `/harvest-predictions/latest?box_id=${boxId}`);
    expectStatus(latest, 200, 'latest harvest prediction');
    assert(latest.data?.id === harvestId, 'latest harvest prediction bukan data yang baru dibuat');
    assert(Number(latest.data?.estimated_days) === 9.5, 'estimated_days tidak sesuai');
  });

  await test('create notification, get by id, and mark as read', async () => {
    const result = await request('POST', '/notifications', {
      body: {
        tenant_id: tenantId,
        message: `Notifikasi uji ${suffix}`
      }
    });
    expectStatus(result, 201, 'create notification');
    notificationId = result.data?.id;
    assert(notificationId, 'notification tidak memiliki id');
    addCleanup('notification', () => request('DELETE', `/notifications/${notificationId}`));

    const getResult = await request('GET', `/notifications/${notificationId}`);
    expectStatus(getResult, 200, 'get notification by id');
    assert(getResult.data?.id === notificationId, 'notification id tidak sesuai');

    const readResult = await request('PUT', `/notifications/${notificationId}/read`);
    expectStatus(readResult, 200, 'mark notification as read');
    assert(readResult.data?.is_read === true, 'notification tidak ditandai sudah dibaca');
  });

  await test('upsert and get threshold by floor', async () => {
    const createResult = await request('PUT', '/automation-thresholds/floor/99', {
      body: {
        tenant_id: tenantId,
        floor_level: 99,
        temp_min: 25,
        temp_max: 33,
        air_hum_min: 60,
        air_hum_max: 80,
        media_hum_min: 45,
        media_hum_max: 65
      }
    });
    expectStatus(createResult, 201, 'create threshold by floor');
    thresholdId = createResult.data?.id;
    assert(thresholdId, 'threshold tidak memiliki id');
    addCleanup('threshold', () => request('DELETE', `/automation-thresholds/${thresholdId}`));

    const getResult = await request('GET', `/automation-thresholds/floor/99?tenant_id=${tenantId}`);
    expectStatus(getResult, 200, 'get threshold by floor');
    assert(getResult.data?.id === thresholdId, 'threshold id tidak sesuai');

    const updateResult = await request('PUT', '/automation-thresholds/floor/99', {
      body: {
        tenant_id: tenantId,
        floor_level: 99,
        temp_min: 26,
        temp_max: 34,
        air_hum_min: 61,
        air_hum_max: 81,
        media_hum_min: 46,
        media_hum_max: 66
      }
    });
    expectStatus(updateResult, 200, 'update threshold by floor');
    assert(Number(updateResult.data?.temp_min) === 26, 'threshold tidak terupdate');
  });

  await test('get edge sync history', async () => {
    const result = await request('GET', '/edge-sync/history?hours=24');
    expectStatus(result, 200, 'get edge sync history');
    assert(Array.isArray(result.data), 'edge sync history bukan array');
  });

  await test('get dashboard summary', async () => {
    const result = await request('GET', '/dashboard/summary');
    expectStatus(result, 200, 'get dashboard summary');
    assert(Array.isArray(result.data?.boxes), 'dashboard summary tidak memiliki boxes');
  });

  await test('operator cannot delete tenant', async () => {
    const operatorLogin = await login(OPERATOR_EMAIL, OPERATOR_PASSWORD);
    if (operatorLogin.status !== 200 || !operatorLogin.data?.token) {
      console.warn(`SKIP  operator tidak dapat login (${operatorLogin.status})`);
      return;
    }
    operatorToken = operatorLogin.data.token;

    const result = await request('DELETE', `/tenants/${tenantId}`, { token: operatorToken });
    expectStatus(result, 403, 'operator delete tenant');
  });

  await runCleanup();

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
};

main().catch(async error => {
  console.error('Test runner error:', error);
  await runCleanup();
  process.exitCode = 1;
});
