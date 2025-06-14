const jwt = require('jsonwebtoken');

// Configuration to match local development
const JWT_SECRET = 'test-jwt-secret-32-characters-long-string';
const API_BASE = 'http://localhost:8787';

// Generate an admin token for setup
const adminToken = jwt.sign(
  { userId: 'admin-user-id' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

console.log('Setting up test data...');

fetch(`${API_BASE}/api/admin/test-data/setup`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  },
  body: JSON.stringify({ resetData: true })
})
.then(response => {
  console.log('Status:', response.status);
  return response.json();
})
.then(data => {
  console.log('Response:', data);
  
  if (data.success) {
    console.log('✅ Test data setup completed');
    console.log('Mitra JWT:', data.mitraJwt);
    console.log('Driver JWT:', data.driverJwt);
  } else {
    console.log('❌ Setup failed');
  }
})
.catch(error => {
  console.error('❌ Error:', error.message);
});
EOF < /dev/null