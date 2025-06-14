#!/usr/bin/env node

import { sign } from 'hono/jwt';

const API_BASE = 'http://localhost:8787';
const JWT_SECRET = 'test-jwt-secret-32-characters-long-string';

async function testHonoJWT() {
  try {
    // Create token exactly like the auth service does
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      userId: 'user_mitra_1',
      iat: now,
      exp: now + 60 * 15, // 15 minutes like the auth service
    };
    
    console.log('Creating JWT with Hono sign function...');
    const token = await sign(payload, JWT_SECRET);
    console.log('Generated token:', token);
    
    // Test the token
    console.log('\n--- Testing Mitra drivers endpoint ---');
    const response = await fetch(`${API_BASE}/api/mitra/drivers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, data);
    
    if (response.status === 200) {
      console.log('🎉 Authentication successful!');
    } else if (response.status === 401) {
      console.log('❌ Still getting 401 - there may be another issue');
    } else {
      console.log('🤔 Unexpected status code');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testHonoJWT().catch(console.error);