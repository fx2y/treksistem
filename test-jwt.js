#!/usr/bin/env node

async function testJWT() {
  const { sign, verify } = await import('hono/jwt');
  
  const JWT_SECRET = 'test-jwt-secret-32-characters-long-string';
  
  const payload = {
    userId: 'user_mitra_1',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
  };
  
  console.log('Creating JWT with payload:', payload);
  
  try {
    const token = await sign(payload, JWT_SECRET);
    console.log('Generated token:', token);
    
    const verified = await verify(token, JWT_SECRET);
    console.log('Verified payload:', verified);
    
    // Test with the API
    const response = await fetch('http://localhost:8787/api/mitra/services', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('API Response status:', response.status);
    const body = await response.text();
    console.log('API Response body:', body);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testJWT();