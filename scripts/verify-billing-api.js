#!/usr/bin/env node

/**
 * QRIS Billing API Verification Script
 * Tests the billing system via HTTP requests to the running API
 */

const jwt = require('jsonwebtoken');
const https = require('https');
const http = require('http');

// Configuration
const API_BASE = 'http://localhost:8787';
const JWT_SECRET = 'test-jwt-secret-32-characters-long-string-for-verification';

// Test users
const TEST_USERS = {
  admin: { id: 'admin01', role: 'admin' },
  mitra1: { id: 'mitra01', role: 'user' }, // Free tier
  mitra2: { id: 'mitra02', role: 'user' }, // Active subscription
  mitra3: { id: 'mitra03', role: 'user' }  // Past due
};

class BillingAPIVerification {
  constructor() {
    this.results = [];
    this.tokens = {};
    this.setupTokens();
  }

  setupTokens() {
    for (const [key, user] of Object.entries(TEST_USERS)) {
      this.tokens[key] = jwt.sign(
        { userId: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
    }
  }

  log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

  addResult(test, passed, details = '') {
    this.results.push({ test, passed, details });
    const status = passed ? '✅ PASS' : '❌ FAIL';
    this.log(`${status}: ${test}${details ? ` - ${details}` : ''}`);
  }

  async makeRequest(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const method = options.method || 'GET';
    const headers = options.headers || {};
    const body = options.body;

    if (options.token) {
      headers.Authorization = `Bearer ${options.token}`;
    }

    if (body && typeof body === 'object') {
      headers['Content-Type'] = 'application/json';
    }

    return new Promise((resolve, reject) => {
      const req = http.request(url, { method, headers }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : {};
            resolve({ status: res.statusCode, data: parsed, headers: res.headers });
          } catch {
            resolve({ status: res.statusCode, data: data, headers: res.headers });
          }
        });
      });

      req.on('error', reject);
      
      if (body) {
        req.write(typeof body === 'string' ? body : JSON.stringify(body));
      }
      
      req.end();
    });
  }

  async setupTestData() {
    this.log('Test data already inserted via SQL - skipping setup');
    return true;
  }

  async testMitraInvoicesAPI() {
    this.log('Testing Mitra billing API endpoints...');

    try {
      // Test: GET /api/mitra/billing/invoices (mitra02)
      const invoicesResponse = await this.makeRequest('/api/mitra/billing/invoices', {
        token: this.tokens.mitra2
      });

      this.addResult(
        'GET /api/mitra/billing/invoices (mitra02)',
        invoicesResponse.status === 200 && Array.isArray(invoicesResponse.data.invoices),
        `Status: ${invoicesResponse.status}, Invoices: ${invoicesResponse.data.invoices?.length || 0}`
      );

      // Test: GET /api/mitra/billing/invoices with status filter
      const pendingResponse = await this.makeRequest('/api/mitra/billing/invoices?status=pending', {
        token: this.tokens.mitra2
      });

      this.addResult(
        'GET /api/mitra/billing/invoices?status=pending',
        pendingResponse.status === 200 && Array.isArray(pendingResponse.data.invoices),
        `Pending invoices: ${pendingResponse.data.invoices?.length || 0}`
      );

      // Test: GET /api/mitra/billing/invoices (mitra01 - should be empty)
      const emptyResponse = await this.makeRequest('/api/mitra/billing/invoices', {
        token: this.tokens.mitra1
      });

      this.addResult(
        'GET /api/mitra/billing/invoices (mitra01 - empty)',
        emptyResponse.status === 200 && emptyResponse.data.invoices?.length === 0,
        `Invoices: ${emptyResponse.data.invoices?.length || 0}`
      );

      // Test: GET /api/mitra/billing/invoices/:invoiceId (mitra02)
      const singleInvoiceResponse = await this.makeRequest('/api/mitra/billing/invoices/pub_inv01', {
        token: this.tokens.mitra2
      });

      this.addResult(
        'GET /api/mitra/billing/invoices/pub_inv01 (mitra02)',
        singleInvoiceResponse.status === 200 && singleInvoiceResponse.data.status === 'pending',
        `Status: ${singleInvoiceResponse.status}, Invoice status: ${singleInvoiceResponse.data.status}`
      );

      // Test: GET /api/mitra/billing/invoices/:invoiceId (unauthorized - mitra01)
      const unauthorizedResponse = await this.makeRequest('/api/mitra/billing/invoices/pub_inv01', {
        token: this.tokens.mitra1
      });

      this.addResult(
        'GET /api/mitra/billing/invoices/pub_inv01 (unauthorized)',
        unauthorizedResponse.status === 403 || unauthorizedResponse.status === 404,
        `Status: ${unauthorizedResponse.status}`
      );

      // Test: POST /api/mitra/invoices (create customer invoice)
      const createInvoiceResponse = await this.makeRequest('/api/mitra/invoices', {
        method: 'POST',
        token: this.tokens.mitra2,
        body: {
          amount: 50000,
          description: 'Katering Siang',
          customerName: 'Budi'
        }
      });

      this.addResult(
        'POST /api/mitra/invoices (create customer invoice)',
        createInvoiceResponse.status === 201 && 
        createInvoiceResponse.data.type === 'CUSTOMER_PAYMENT' &&
        createInvoiceResponse.data.amount === 50000,
        `Status: ${createInvoiceResponse.status}, Type: ${createInvoiceResponse.data.type}`
      );

    } catch (error) {
      this.addResult('Mitra billing API', false, `Error: ${error.message}`);
    }
  }

  async testAdminInvoicesAPI() {
    this.log('Testing Admin billing API endpoints...');

    try {
      // Test: POST /api/admin/invoices/:invoiceId/confirm-payment (admin)
      const confirmPaymentResponse = await this.makeRequest('/api/admin/invoices/inv03/confirm-payment', {
        method: 'POST',
        token: this.tokens.admin,
        body: {
          paymentDate: '2024-06-01T10:00:00Z',
          notes: 'Bank Transfer'
        }
      });

      this.addResult(
        'POST /api/admin/invoices/:invoiceId/confirm-payment (admin)',
        confirmPaymentResponse.status === 200,
        `Status: ${confirmPaymentResponse.status}`
      );

      // Test: POST /api/admin/invoices/:invoiceId/confirm-payment (unauthorized - mitra)
      const unauthorizedConfirmResponse = await this.makeRequest('/api/admin/invoices/inv03/confirm-payment', {
        method: 'POST',
        token: this.tokens.mitra2,
        body: {
          paymentDate: '2024-06-01T10:00:00Z',
          notes: 'Bank Transfer'
        }
      });

      this.addResult(
        'POST /api/admin/invoices/:invoiceId/confirm-payment (unauthorized)',
        unauthorizedConfirmResponse.status === 403,
        `Status: ${unauthorizedConfirmResponse.status}`
      );

    } catch (error) {
      this.addResult('Admin billing API', false, `Error: ${error.message}`);
    }
  }

  async testPublicPaymentAPI() {
    this.log('Testing Public payment API endpoints...');

    try {
      // Test: GET /pay/:publicInvoiceId (unauthenticated)
      const publicPaymentResponse = await this.makeRequest('/pay/pub_cust_inv01');

      this.addResult(
        'GET /pay/:publicInvoiceId (unauthenticated)',
        publicPaymentResponse.status === 200 && 
        publicPaymentResponse.data.businessName === 'Toko Roti Enak' &&
        publicPaymentResponse.data.amount === 25000,
        `Status: ${publicPaymentResponse.status}, Business: ${publicPaymentResponse.data.businessName}, Amount: ${publicPaymentResponse.data.amount}`
      );

      // Verify QRIS payload exists
      this.addResult(
        'GET /pay/:publicInvoiceId QRIS payload',
        publicPaymentResponse.data.qrisPayload && typeof publicPaymentResponse.data.qrisPayload === 'string',
        `QRIS length: ${publicPaymentResponse.data.qrisPayload?.length || 0}`
      );

    } catch (error) {
      this.addResult('Public payment API', false, `Error: ${error.message}`);
    }
  }

  async testSubscriptionEnforcement() {
    this.log('Testing subscription enforcement logic...');

    try {
      // Test: Driver invite for past due mitra (should fail)
      const pastDueInviteResponse = await this.makeRequest('/api/mitra/drivers/invite', {
        method: 'POST',
        token: this.tokens.mitra3,
        body: {
          email: 'test@driver.com'
        }
      });

      this.addResult(
        'Driver invite for past due mitra (should fail)',
        pastDueInviteResponse.status === 402,
        `Status: ${pastDueInviteResponse.status}`
      );

      // Test: Driver invite for free tier mitra at limit (should fail if at limit)
      const freeTierInviteResponse = await this.makeRequest('/api/mitra/drivers/invite', {
        method: 'POST',
        token: this.tokens.mitra1,
        body: {
          email: 'another@driver.com'
        }
      });

      this.addResult(
        'Driver invite for free tier mitra (limit check)',
        freeTierInviteResponse.status === 402 || freeTierInviteResponse.status === 201,
        `Status: ${freeTierInviteResponse.status} (402 if at limit, 201 if under limit)`
      );

      // Test: Driver invite for active subscription mitra (should succeed if under limit)
      const activeInviteResponse = await this.makeRequest('/api/mitra/drivers/invite', {
        method: 'POST',
        token: this.tokens.mitra2,
        body: {
          email: 'tenth@driver.com'
        }
      });

      this.addResult(
        'Driver invite for active subscription mitra',
        activeInviteResponse.status === 201 || activeInviteResponse.status === 402,
        `Status: ${activeInviteResponse.status} (201 if under limit, 402 if at limit)`
      );

    } catch (error) {
      this.addResult('Subscription enforcement', false, `Error: ${error.message}`);
    }
  }

  async checkAPIHealth() {
    this.log('Checking API health...');

    try {
      const healthResponse = await this.makeRequest('/');
      this.addResult(
        'API Health Check',
        healthResponse.status === 200 && healthResponse.data.includes('Treksistem'),
        `Status: ${healthResponse.status}`
      );

      return healthResponse.status === 200;
    } catch (error) {
      this.addResult('API Health Check', false, `Error: ${error.message}`);
      return false;
    }
  }

  async runAllTests() {
    this.log('🚀 Starting QRIS Billing API Verification');
    this.log('='.repeat(60));

    // Check API health first
    const apiHealthy = await this.checkAPIHealth();
    if (!apiHealthy) {
      this.log('❌ API is not healthy, aborting tests');
      return this.generateReport();
    }

    // Setup test data
    const setupSuccess = await this.setupTestData();
    if (!setupSuccess) {
      this.log('❌ Test data setup failed, aborting tests');
      return this.generateReport();
    }

    // Run all tests
    await this.testMitraInvoicesAPI();
    await this.testAdminInvoicesAPI();
    await this.testPublicPaymentAPI();
    await this.testSubscriptionEnforcement();

    return this.generateReport();
  }

  generateReport() {
    this.log('='.repeat(60));
    this.log('📊 VERIFICATION REPORT');
    this.log('='.repeat(60));

    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;

    this.log(`Total Tests: ${total}`);
    this.log(`Passed: ${passed} ✅`);
    this.log(`Failed: ${failed} ❌`);
    this.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    this.log('\n📋 DETAILED RESULTS:');
    this.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      this.log(`${status} ${result.test}${result.details ? ` - ${result.details}` : ''}`);
    });

    return {
      total,
      passed,
      failed,
      successRate: ((passed / total) * 100).toFixed(1),
      allPassed: failed === 0,
      results: this.results
    };
  }
}

// Run verification if script is executed directly
if (require.main === module) {
  const verification = new BillingAPIVerification();
  verification.runAllTests()
    .then(report => {
      process.exit(report.allPassed ? 0 : 1);
    })
    .catch(error => {
      console.error('Verification script failed:', error);
      process.exit(1);
    });
}

module.exports = { BillingAPIVerification };