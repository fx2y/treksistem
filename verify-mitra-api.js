#!/usr/bin/env node
const crypto = require('crypto');

const API_BASE = 'http://localhost:8787';
const JWT_SECRET = 'test-jwt-secret-32-characters-long-string'; // Match the test secret from wrangler

// Generate proper JWT tokens for testing
function createJWT(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + (60 * 60 * 24) // 24 hours for testing
  };
  
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Test tokens with proper JWT format
const MITRA_1_TOKEN = createJWT({ userId: 'user_mitra_1' });
const MITRA_2_TOKEN = createJWT({ userId: 'user_mitra_2' });
const DRIVER_1_TOKEN = createJWT({ userId: 'user_driver_1' });

console.log('DEBUG: Generated tokens:');
console.log('MITRA_1_TOKEN:', MITRA_1_TOKEN);
console.log('MITRA_2_TOKEN:', MITRA_2_TOKEN);
console.log('DRIVER_1_TOKEN:', DRIVER_1_TOKEN);

let testsPassed = 0;
let testsFailed = 0;

async function test(description, testFn) {
  try {
    console.log(`\n🧪 ${description}`);
    await testFn();
    console.log(`✅ PASS: ${description}`);
    testsPassed++;
  } catch (error) {
    console.log(`❌ FAIL: ${description}`);
    console.log(`   Error: ${error.message}`);
    testsFailed++;
  }
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  const result = {
    status: response.status,
    headers: response.headers,
    body: null
  };
  
  try {
    result.body = await response.json();
  } catch (e) {
    result.body = await response.text();
  }
  
  return result;
}

async function main() {
  console.log('🚀 Starting Mitra Service API Verification Tests\n');

  // Test Security & Access Control
  await test('POST /api/mitra/services without Authorization returns 401', async () => {
    const response = await request('/api/mitra/services', { method: 'POST' });
    if (response.status !== 401) {
      throw new Error(`Expected 401, got ${response.status}`);
    }
  });

  await test('POST /api/mitra/services with invalid JWT returns 401', async () => {
    const response = await request('/api/mitra/services', {
      method: 'POST',
      headers: { Authorization: 'Bearer invalid-token' }
    });
    if (response.status !== 401) {
      throw new Error(`Expected 401, got ${response.status}`);
    }
  });

  await test('POST /api/mitra/services with driver token returns 403', async () => {
    const response = await request('/api/mitra/services', {
      method: 'POST',
      headers: { Authorization: `Bearer ${DRIVER_1_TOKEN}` }
    });
    if (response.status !== 403) {
      throw new Error(`Expected 403, got ${response.status}`);
    }
  });

  await test('GET /api/mitra/services with driver token returns 403', async () => {
    const response = await request('/api/mitra/services', {
      headers: { Authorization: `Bearer ${DRIVER_1_TOKEN}` }
    });
    if (response.status !== 403) {
      throw new Error(`Expected 403, got ${response.status}`);
    }
  });

  await test('GET /api/mitra/master-data with driver token returns 403', async () => {
    const response = await request('/api/mitra/master-data', {
      headers: { Authorization: `Bearer ${DRIVER_1_TOKEN}` }
    });
    if (response.status !== 403) {
      throw new Error(`Expected 403, got ${response.status}`);
    }
  });

  // Test Service Creation Validation
  await test('POST /api/mitra/services with missing name returns 400', async () => {
    const response = await request('/api/mitra/services', {
      method: 'POST',
      headers: { Authorization: `Bearer ${MITRA_1_TOKEN}` },
      body: JSON.stringify({
        isPublic: true,
        maxRangeKm: 20,
        rate: { baseFee: 5000, feePerKm: 2000 }
      })
    });
    if (response.status !== 400) {
      throw new Error(`Expected 400, got ${response.status}`);
    }
  });

  await test('POST /api/mitra/services with negative baseFee returns 400', async () => {
    const response = await request('/api/mitra/services', {
      method: 'POST',
      headers: { Authorization: `Bearer ${MITRA_1_TOKEN}` },
      body: JSON.stringify({
        name: 'Test Service',
        isPublic: true,
        maxRangeKm: 20,
        supportedVehicleTypeIds: ['vehicle_motor'],
        supportedPayloadTypeIds: ['payload_food'],
        rate: { baseFee: -5000, feePerKm: 2000 }
      })
    });
    if (response.status !== 400) {
      throw new Error(`Expected 400, got ${response.status}`);
    }
  });

  // Test Service Creation Success
  let createdServiceId;
  await test('POST /api/mitra/services creates service successfully', async () => {
    const response = await request('/api/mitra/services', {
      method: 'POST',
      headers: { Authorization: `Bearer ${MITRA_1_TOKEN}` },
      body: JSON.stringify({
        name: 'Katering Cepat',
        isPublic: true,
        maxRangeKm: 20,
        supportedVehicleTypeIds: ['vehicle_motor'],
        supportedPayloadTypeIds: ['payload_food'],
        rate: { baseFee: 5000, feePerKm: 2000 }
      })
    });
    
    if (response.status !== 201) {
      throw new Error(`Expected 201, got ${response.status}`);
    }
    
    if (!response.body.id) {
      throw new Error('Response missing service ID');
    }
    
    if (response.body.name !== 'Katering Cepat') {
      throw new Error(`Expected name 'Katering Cepat', got '${response.body.name}'`);
    }
    
    if (response.body.isPublic !== true) {
      throw new Error(`Expected isPublic true, got ${response.body.isPublic}`);
    }
    
    if (response.body.rate.baseFee !== 5000) {
      throw new Error(`Expected baseFee 5000, got ${response.body.rate.baseFee}`);
    }
    
    createdServiceId = response.body.id;
  });

  // Test Service Retrieval
  await test('GET /api/mitra/services returns services for authenticated mitra', async () => {
    const response = await request('/api/mitra/services', {
      headers: { Authorization: `Bearer ${MITRA_1_TOKEN}` }
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }
    
    if (!Array.isArray(response.body)) {
      throw new Error('Response body should be an array');
    }
    
    if (response.body.length === 0) {
      throw new Error('Expected at least one service');
    }
    
    const service = response.body.find(s => s.name === 'Katering Cepat');
    if (!service) {
      throw new Error('Could not find created service');
    }
  });

  await test('GET /api/mitra/services/:id returns specific service', async () => {
    if (!createdServiceId) {
      throw new Error('No service ID available from previous test');
    }
    
    const response = await request(`/api/mitra/services/${createdServiceId}`, {
      headers: { Authorization: `Bearer ${MITRA_1_TOKEN}` }
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }
    
    if (response.body.id !== createdServiceId) {
      throw new Error(`Expected service ID ${createdServiceId}, got ${response.body.id}`);
    }
  });

  // Test Service Update
  await test('PUT /api/mitra/services/:id updates service successfully', async () => {
    if (!createdServiceId) {
      throw new Error('No service ID available from previous test');
    }
    
    const response = await request(`/api/mitra/services/${createdServiceId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${MITRA_1_TOKEN}` },
      body: JSON.stringify({
        name: 'Layanan Baru',
        rate: { baseFee: 6000, feePerKm: 2000 }
      })
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }
    
    if (response.body.name !== 'Layanan Baru') {
      throw new Error(`Expected name 'Layanan Baru', got '${response.body.name}'`);
    }
    
    if (response.body.rate.baseFee !== 6000) {
      throw new Error(`Expected baseFee 6000, got ${response.body.rate.baseFee}`);
    }
  });

  // Test Master Data Retrieval
  await test('GET /api/mitra/master-data returns master data structure', async () => {
    const response = await request('/api/mitra/master-data', {
      headers: { Authorization: `Bearer ${MITRA_1_TOKEN}` }
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }
    
    if (!response.body.vehicles || !response.body.payloads || !response.body.facilities) {
      throw new Error('Response missing required keys: vehicles, payloads, facilities');
    }
    
    if (!Array.isArray(response.body.vehicles)) {
      throw new Error('vehicles should be an array');
    }
    
    if (!Array.isArray(response.body.payloads)) {
      throw new Error('payloads should be an array');
    }
    
    if (!Array.isArray(response.body.facilities)) {
      throw new Error('facilities should be an array');
    }
  });

  // Test Cross-Tenant Isolation
  await test('GET /api/mitra/services/:id with wrong mitra token returns 404', async () => {
    if (!createdServiceId) {
      throw new Error('No service ID available from previous test');
    }
    
    const response = await request(`/api/mitra/services/${createdServiceId}`, {
      headers: { Authorization: `Bearer ${MITRA_2_TOKEN}` }
    });
    
    if (response.status !== 404) {
      throw new Error(`Expected 404 due to tenancy isolation, got ${response.status}`);
    }
  });

  await test('PUT /api/mitra/services/:id with wrong mitra token returns 404', async () => {
    if (!createdServiceId) {
      throw new Error('No service ID available from previous test');
    }
    
    const response = await request(`/api/mitra/services/${createdServiceId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${MITRA_2_TOKEN}` },
      body: JSON.stringify({
        name: 'Should Not Work'
      })
    });
    
    if (response.status !== 404) {
      throw new Error(`Expected 404 due to tenancy isolation, got ${response.status}`);
    }
  });

  // Summary
  console.log('\n📊 Test Results:');
  console.log(`✅ Tests Passed: ${testsPassed}`);
  console.log(`❌ Tests Failed: ${testsFailed}`);
  console.log(`📈 Total Tests: ${testsPassed + testsFailed}`);
  
  if (testsFailed > 0) {
    console.log('\n🚨 Some tests failed. Please review the implementation.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed! API verification successful.');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});