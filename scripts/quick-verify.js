#!/usr/bin/env node

const API_BASE = 'http://localhost:59946';

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

async function testBasicEndpoints() {
  console.log('🔍 Quick API Verification');
  console.log('========================');
  
  // Test 1: Root endpoint
  console.log('\n1. Testing root endpoint...');
  const rootResult = await apiRequest('/');
  if (rootResult.status === 200) {
    console.log('✅ PASS: Root endpoint accessible');
  } else {
    console.log('❌ FAIL: Root endpoint not accessible');
  }
  
  // Test 2: Health check or any public endpoint
  console.log('\n2. Testing public endpoints...');
  const publicResult = await apiRequest('/api/public');
  console.log(`Status: ${publicResult.status}`);
  
  // Test 3: Check if mitra endpoints require auth
  console.log('\n3. Testing mitra endpoints (should require auth)...');
  const mitraResult = await apiRequest('/api/mitra/drivers');
  if (mitraResult.status === 401) {
    console.log('✅ PASS: Mitra endpoints require authentication');
  } else {
    console.log(`❌ FAIL: Expected 401, got ${mitraResult.status}`);
  }
  
  console.log('\n========================');
  console.log('Quick verification complete');
}

testBasicEndpoints().catch(console.error);