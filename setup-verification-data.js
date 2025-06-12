#!/usr/bin/env node

const jwt = require('jsonwebtoken');

// Configuration
const API_BASE = 'http://localhost:8787';
const JWT_SECRET = 'test-jwt-secret-32-characters-long-string';

// Create admin token for setup
const adminToken = jwt.sign({ userId: 'admin-user-id' }, JWT_SECRET, { expiresIn: '1h' });

async function setupTestData() {
  console.log('Setting up verification test data...');
  
  try {
    const response = await fetch(`${API_BASE}/api/admin/test-data/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ 
        resetData: true,
        specificUsers: [
          {
            id: 'user_mitra_1',
            googleId: 'google_mitra_1',
            email: 'mitra1@example.com',
            name: 'Mitra 1',
            avatarUrl: null
          },
          {
            id: 'user_mitra_2',
            googleId: 'google_mitra_2', 
            email: 'mitra2@example.com',
            name: 'Mitra 2',
            avatarUrl: null
          },
          {
            id: 'user_driver_1',
            googleId: 'google_driver_1',
            email: 'driver1@example.com', 
            name: 'Budi Santoso',
            avatarUrl: null
          }
        ],
        specificMitras: [
          {
            id: 'mitra_1',
            userId: 'user_mitra_1',
            businessName: 'Katering Bu Ani',
            businessAddress: 'Jl. Test 1',
            phoneNumber: '+628123456789',
            subscriptionStatus: 'active',
            activeDriverLimit: 10
          },
          {
            id: 'mitra_2',
            userId: 'user_mitra_2', 
            businessName: 'Toko Roti Lezat',
            businessAddress: 'Jl. Test 2',
            phoneNumber: '+628123456790',
            subscriptionStatus: 'active',
            activeDriverLimit: 5
          }
        ]
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Test data setup completed successfully');
      console.log('Data:', data);
      
      // Generate tokens for the specific users
      const tokens = {
        mitra1: jwt.sign({ userId: 'user_mitra_1' }, JWT_SECRET, { expiresIn: '1h' }),
        mitra2: jwt.sign({ userId: 'user_mitra_2' }, JWT_SECRET, { expiresIn: '1h' }),
        driver1: jwt.sign({ userId: 'user_driver_1' }, JWT_SECRET, { expiresIn: '1h' })
      };
      
      console.log('\n🔑 Test Tokens Generated:');
      console.log('MITRA_1_JWT=', tokens.mitra1);
      console.log('MITRA_2_JWT=', tokens.mitra2);
      console.log('DRIVER_1_JWT=', tokens.driver1);
      
      return true;
    } else {
      console.log(`❌ Setup failed with status: ${response.status}`);
      const errorText = await response.text();
      console.log('Error:', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Error setting up test data:', error.message);
    return false;
  }
}

setupTestData().then(success => {
  if (success) {
    console.log('\n✅ Ready for verification tests!');
    process.exit(0);
  } else {
    console.log('\n❌ Setup failed');
    process.exit(1);
  }
});