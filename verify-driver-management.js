#!/usr/bin/env node

const jwt = require('jsonwebtoken');

// Configuration
const API_BASE = 'http://localhost:59946';
const JWT_SECRET = 'test-jwt-secret-32-characters-long-string-for-verification';

// Test users as per verification plan
const users = {
  mitra1: {
    userId: 'user_mitra_1',
    email: 'mitra1@example.com',
    name: 'Mitra 1',
    googleId: 'google_mitra_1'
  },
  mitra2: {
    userId: 'user_mitra_2', 
    email: 'mitra2@example.com',
    name: 'Mitra 2',
    googleId: 'google_mitra_2'
  },
  driver1: {
    userId: 'user_driver_1',
    email: 'driver1@example.com', 
    name: 'Budi Santoso',
    googleId: 'google_driver_1'
  }
};

// Generate JWTs
const tokens = {
  mitra1: jwt.sign({ userId: users.mitra1.userId }, JWT_SECRET, { expiresIn: '1h' }),
  mitra2: jwt.sign({ userId: users.mitra2.userId }, JWT_SECRET, { expiresIn: '1h' }),
  driver1: jwt.sign({ userId: users.driver1.userId }, JWT_SECRET, { expiresIn: '1h' })
};

// Verification state
let inviteToken = null;
let driverRecordId = null;

// Helper function to make API requests
async function apiRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    const data = await response.text();
    let parsedData;
    try {
      parsedData = JSON.parse(data);
    } catch {
      parsedData = data;
    }
    
    return { status: response.status, data: parsedData };
  } catch (error) {
    return { status: 0, error: error.message };
  }
}

// Test functions
async function test1_1_successfulInvitation() {
  console.log('\n=== 1.1 Successful Invitation ===');
  
  const result = await apiRequest('/api/mitra/drivers/invite', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokens.mitra1}` },
    body: JSON.stringify({ email: users.driver1.email })
  });
  
  if (result.status === 200 && result.data.inviteLink) {
    console.log('✅ PASS: Invitation created successfully');
    console.log(`✅ PASS: Response contains inviteLink: ${result.data.inviteLink}`);
    
    // Extract token from URL
    const url = new URL(result.data.inviteLink);
    inviteToken = url.searchParams.get('token');
    console.log(`✅ PASS: Extracted token: ${inviteToken.substring(0, 10)}...`);
    
    return true;
  } else {
    console.log(`❌ FAIL: Expected 200 with inviteLink, got ${result.status}`, result.data);
    return false;
  }
}

async function test1_2_invitationFailures() {
  console.log('\n=== 1.2 Invitation Failure Cases ===');
  let allPassed = true;
  
  // Test non-Mitra JWT
  const nonMitraResult = await apiRequest('/api/mitra/drivers/invite', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokens.driver1}` },
    body: JSON.stringify({ email: 'test@example.com' })
  });
  
  if (nonMitraResult.status === 403) {
    console.log('✅ PASS: Non-Mitra JWT returns 403');
  } else {
    console.log(`❌ FAIL: Expected 403 for non-Mitra JWT, got ${nonMitraResult.status}`);
    allPassed = false;
  }
  
  // Test invalid email
  const invalidEmailResult = await apiRequest('/api/mitra/drivers/invite', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokens.mitra1}` },
    body: JSON.stringify({ email: 'not-an-email' })
  });
  
  if (invalidEmailResult.status === 400) {
    console.log('✅ PASS: Invalid email returns 400');
  } else {
    console.log(`❌ FAIL: Expected 400 for invalid email, got ${invalidEmailResult.status}`);
    allPassed = false;
  }
  
  // Test duplicate invitation
  const duplicateResult = await apiRequest('/api/mitra/drivers/invite', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokens.mitra1}` },
    body: JSON.stringify({ email: users.driver1.email })
  });
  
  if (duplicateResult.status === 409) {
    console.log('✅ PASS: Duplicate invitation returns 409');
  } else {
    console.log(`❌ FAIL: Expected 409 for duplicate invitation, got ${duplicateResult.status}`);
    allPassed = false;
  }
  
  return allPassed;
}

async function test2_1_successfulAcceptance() {
  console.log('\n=== 2.1 Successful Acceptance ===');
  
  if (!inviteToken) {
    console.log('❌ FAIL: No invite token available');
    return false;
  }
  
  const result = await apiRequest('/api/public/invites/accept', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokens.driver1}` },
    body: JSON.stringify({ token: inviteToken })
  });
  
  if (result.status === 200 && 
      result.data.message === 'Invitation accepted successfully.' &&
      result.data.mitraName === 'Katering Bu Ani') {
    console.log('✅ PASS: Invitation accepted successfully');
    console.log(`✅ PASS: Correct response message: ${result.data.message}`);
    console.log(`✅ PASS: Correct mitra name: ${result.data.mitraName}`);
    return true;
  } else {
    console.log(`❌ FAIL: Expected 200 with success message, got ${result.status}`, result.data);
    return false;
  }
}

async function test2_2_acceptanceFailures() {
  console.log('\n=== 2.2 Acceptance Failure Cases ===');
  let allPassed = true;
  
  // Test invalid token
  const invalidTokenResult = await apiRequest('/api/public/invites/accept', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokens.driver1}` },
    body: JSON.stringify({ token: 'invalid-token-string' })
  });
  
  if (invalidTokenResult.status === 400) {
    console.log('✅ PASS: Invalid token returns 400');
  } else {
    console.log(`❌ FAIL: Expected 400 for invalid token, got ${invalidTokenResult.status}`);
    allPassed = false;
  }
  
  // Test duplicate acceptance
  const duplicateAcceptResult = await apiRequest('/api/public/invites/accept', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokens.driver1}` },
    body: JSON.stringify({ token: inviteToken })
  });
  
  if (duplicateAcceptResult.status === 409) {
    console.log('✅ PASS: Duplicate acceptance returns 409');
  } else {
    console.log(`❌ FAIL: Expected 409 for duplicate acceptance, got ${duplicateAcceptResult.status}`);
    allPassed = false;
  }
  
  return allPassed;
}

async function test3_1_listDrivers() {
  console.log('\n=== 3.1 List Drivers ===');
  
  const result = await apiRequest('/api/mitra/drivers', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokens.mitra1}` }
  });
  
  if (result.status === 200 && Array.isArray(result.data) && result.data.length === 1) {
    const driver = result.data[0];
    if (driver.id && driver.userId === users.driver1.userId && 
        driver.email === users.driver1.email) {
      console.log('✅ PASS: Drivers list retrieved successfully');
      console.log(`✅ PASS: Contains correct driver data for ${driver.email}`);
      driverRecordId = driver.id;
      return true;
    } else {
      console.log('❌ FAIL: Driver data is incorrect', driver);
      return false;
    }
  } else {
    console.log(`❌ FAIL: Expected 200 with array of 1 driver, got ${result.status}`, result.data);
    return false;
  }
}

async function test3_2_removeDriver() {
  console.log('\n=== 3.2 Remove Driver ===');
  
  if (!driverRecordId) {
    console.log('❌ FAIL: No driver record ID available');
    return false;
  }
  
  const result = await apiRequest(`/api/mitra/drivers/${driverRecordId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${tokens.mitra1}` }
  });
  
  if (result.status === 204) {
    console.log('✅ PASS: Driver removed successfully (204)');
    
    // Verify list is now empty
    const listResult = await apiRequest('/api/mitra/drivers', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokens.mitra1}` }
    });
    
    if (listResult.status === 200 && Array.isArray(listResult.data) && listResult.data.length === 0) {
      console.log('✅ PASS: Drivers list is now empty');
      return true;
    } else {
      console.log('❌ FAIL: Drivers list should be empty after removal', listResult.data);
      return false;
    }
  } else {
    console.log(`❌ FAIL: Expected 204 for driver removal, got ${result.status}`);
    return false;
  }
}

async function test4_multiTenancySecurity() {
  console.log('\n=== 4. Multi-Tenancy & Security ===');
  let allPassed = true;
  
  // Test Mitra 2 can only see their own drivers (should be empty)
  const mitra2DriversResult = await apiRequest('/api/mitra/drivers', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokens.mitra2}` }
  });
  
  if (mitra2DriversResult.status === 200 && Array.isArray(mitra2DriversResult.data) && mitra2DriversResult.data.length === 0) {
    console.log('✅ PASS: Mitra 2 sees empty drivers list (proper tenant isolation)');
  } else {
    console.log(`❌ FAIL: Mitra 2 should see empty list, got ${mitra2DriversResult.status}`, mitra2DriversResult.data);
    allPassed = false;
  }
  
  return allPassed;
}

// Main verification function
async function runVerification() {
  console.log('🔍 Driver Management API Verification');
  console.log('=====================================');
  
  const results = [];
  
  // Run all tests in sequence
  results.push(await test1_1_successfulInvitation());
  results.push(await test1_2_invitationFailures());
  results.push(await test2_1_successfulAcceptance());
  results.push(await test2_2_acceptanceFailures());
  results.push(await test3_1_listDrivers());
  results.push(await test3_2_removeDriver());
  results.push(await test4_multiTenancySecurity());
  
  // Summary
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('\n=====================================');
  console.log(`VERIFICATION SUMMARY: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 ALL TESTS PASSED - API is working correctly!');
    process.exit(0);
  } else {
    console.log('❌ SOME TESTS FAILED - Review the output above');
    process.exit(1);
  }
}

// Check if server is running first
async function checkServer() {
  console.log('Checking API server...');
  const result = await apiRequest('/');
  
  if (result.status === 200) {
    console.log('✅ API server is running');
    return true;
  } else {
    console.log('❌ API server is not responding');
    console.log('Please start the server with: cd apps/api && pnpm run dev');
    return false;
  }
}

// Start verification
checkServer().then(serverRunning => {
  if (serverRunning) {
    runVerification().catch(console.error);
  } else {
    process.exit(1);
  }
});