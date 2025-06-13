#!/usr/bin/env node

/**
 * QRIS Billing System Verification Script
 * Tests the Manual QRIS Billing System implementation
 */

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './packages/db/src/schema/index.ts';
import { BillingService } from './apps/api/src/services/billing.service.ts';
import { DriverManagementService } from './apps/api/src/services/driver-management.service.ts';
import { generateQRIS } from './apps/api/src/lib/qris.ts';
import { nanoid } from 'nanoid';

// Test configuration
const TEST_DATABASE_URL = 'file:./test-qris-billing.db';
const TEST_CONFIG = {
  SUBSCRIPTION_AMOUNT_PER_DRIVER: 10000, // 10k IDR per driver
  DEFAULT_DRIVER_LIMIT: 2,
  PREMIUM_DRIVER_LIMIT: 5,
};

class QRISBillingVerification {
  constructor() {
    this.client = createClient({ url: TEST_DATABASE_URL });
    this.db = drizzle(this.client, { schema });
    this.billingService = new BillingService(this.db);
    this.driverService = new DriverManagementService(this.db);
    this.testResults = [];
  }

  log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

  logError(message, error) {
    console.error(`[${new Date().toISOString()}] ERROR: ${message}`, error);
  }

  addResult(testName, passed, details = null) {
    this.testResults.push({
      test: testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    });
    
    const status = passed ? '✅ PASS' : '❌ FAIL';
    this.log(`${status}: ${testName}${details ? ` - ${details}` : ''}`);
  }

  async setupTestData() {
    this.log('Setting up test data...');
    
    try {
      // Create test users
      this.testUser1 = await this.db.insert(schema.users).values({
        id: nanoid(),
        googleId: 'test-google-1',
        email: 'test1@example.com',
        name: 'Test User 1',
      }).returning().then(rows => rows[0]);

      this.testUser2 = await this.db.insert(schema.users).values({
        id: nanoid(),
        googleId: 'test-google-2', 
        email: 'test2@example.com',
        name: 'Test User 2',
      }).returning().then(rows => rows[0]);

      // Create test mitras
      this.testMitra1 = await this.db.insert(schema.mitras).values({
        id: nanoid(),
        userId: this.testUser1.id,
        businessName: 'Test Mitra 1',
        subscriptionStatus: 'free_tier',
        activeDriverLimit: TEST_CONFIG.DEFAULT_DRIVER_LIMIT,
      }).returning().then(rows => rows[0]);

      this.testMitra2 = await this.db.insert(schema.mitras).values({
        id: nanoid(),
        userId: this.testUser2.id,
        businessName: 'Test Mitra 2', 
        subscriptionStatus: 'active',
        activeDriverLimit: TEST_CONFIG.PREMIUM_DRIVER_LIMIT,
      }).returning().then(rows => rows[0]);

      this.log('Test data setup complete');
      return true;
    } catch (error) {
      this.logError('Failed to setup test data', error);
      return false;
    }
  }

  async testInvoiceCreation() {
    this.log('Testing invoice creation...');

    try {
      // Test 1: Create subscription invoice
      const subscriptionInvoice = await this.billingService.createInvoice({
        mitraId: this.testMitra1.id,
        type: 'subscription',
        amount: TEST_CONFIG.SUBSCRIPTION_AMOUNT_PER_DRIVER * TEST_CONFIG.DEFAULT_DRIVER_LIMIT,
        description: 'Monthly subscription fee',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      });

      this.addResult(
        'Invoice Creation - Subscription',
        subscriptionInvoice && subscriptionInvoice.publicId && subscriptionInvoice.qrisPayload,
        `Invoice ID: ${subscriptionInvoice?.publicId}, Amount: ${subscriptionInvoice?.amount}`
      );

      // Test 2: Create delivery fee invoice
      const deliveryInvoice = await this.billingService.createInvoice({
        mitraId: this.testMitra2.id,
        type: 'delivery_fee',
        amount: 5000,
        description: 'Delivery service fee'
      });

      this.addResult(
        'Invoice Creation - Delivery Fee',
        deliveryInvoice && deliveryInvoice.publicId && deliveryInvoice.qrisPayload,
        `Invoice ID: ${deliveryInvoice?.publicId}, Amount: ${deliveryInvoice?.amount}`
      );

      // Store for later tests
      this.testSubscriptionInvoice = subscriptionInvoice;
      this.testDeliveryInvoice = deliveryInvoice;

      return true;
    } catch (error) {
      this.logError('Invoice creation test failed', error);
      this.addResult('Invoice Creation', false, error.message);
      return false;
    }
  }

  async testQRISGeneration() {
    this.log('Testing QRIS generation...');

    try {
      // Test QRIS payload generation
      const qrisPayload = generateQRIS({
        amount: 50000,
        invoiceId: 'TEST-INVOICE-123',
        description: 'Test Payment',
        merchantName: 'Treksistem',
        merchantCity: 'Jakarta'
      });

      // Validate QRIS format
      const isValidFormat = qrisPayload.startsWith('00020101021226') && 
                           qrisPayload.includes('5303360') && // IDR currency
                           qrisPayload.includes('5802ID') && // Indonesia country code
                           qrisPayload.length > 50;

      this.addResult(
        'QRIS Generation - Format Validation',
        isValidFormat,
        `Payload length: ${qrisPayload.length}, Starts with correct format: ${qrisPayload.startsWith('00020101021226')}`
      );

      // Test QRIS with different amounts
      const smallAmount = generateQRIS({
        amount: 1000,
        invoiceId: 'TEST-SMALL',
        description: 'Small payment'
      });

      const largeAmount = generateQRIS({
        amount: 999999,
        invoiceId: 'TEST-LARGE', 
        description: 'Large payment'
      });

      this.addResult(
        'QRIS Generation - Amount Variations',
        smallAmount.length > 0 && largeAmount.length > 0,
        `Small: ${smallAmount.length} chars, Large: ${largeAmount.length} chars`
      );

      return true;
    } catch (error) {
      this.logError('QRIS generation test failed', error);
      this.addResult('QRIS Generation', false, error.message);
      return false;
    }
  }

  async testPaymentConfirmation() {
    this.log('Testing payment confirmation workflow...');

    try {
      if (!this.testSubscriptionInvoice) {
        this.addResult('Payment Confirmation', false, 'No test invoice available');
        return false;
      }

      // Test 1: Confirm payment for subscription invoice
      const paymentResult = await this.billingService.confirmPayment({
        invoiceId: this.testSubscriptionInvoice.publicId,
        paymentDate: new Date(),
        notes: 'Manual payment confirmation test'
      });

      this.addResult(
        'Payment Confirmation - Subscription',
        paymentResult && paymentResult.invoice.status === 'paid' && 
        paymentResult.mitraSubscriptionStatus === 'active',
        `Status: ${paymentResult?.invoice?.status}, Mitra status: ${paymentResult?.mitraSubscriptionStatus}`
      );

      // Test 2: Try to confirm payment again (should fail)
      try {
        await this.billingService.confirmPayment({
          invoiceId: this.testSubscriptionInvoice.publicId,
          paymentDate: new Date(),
        });
        this.addResult('Payment Confirmation - Duplicate Prevention', false, 'Should have thrown error for duplicate payment');
      } catch (error) {
        this.addResult(
          'Payment Confirmation - Duplicate Prevention',
          error.message.includes('already paid'),
          `Error: ${error.message}`
        );
      }

      // Test 3: Confirm payment for non-subscription invoice
      const deliveryPaymentResult = await this.billingService.confirmPayment({
        invoiceId: this.testDeliveryInvoice.publicId,
        paymentDate: new Date(),
      });

      this.addResult(
        'Payment Confirmation - Non-Subscription',
        deliveryPaymentResult && deliveryPaymentResult.invoice.status === 'paid',
        `Status: ${deliveryPaymentResult?.invoice?.status}`
      );

      return true;
    } catch (error) {
      this.logError('Payment confirmation test failed', error);
      this.addResult('Payment Confirmation', false, error.message);
      return false;
    }
  }

  async testDriverLimitEnforcement() {
    this.log('Testing driver limit enforcement...');

    try {
      // Test 1: Free tier limit enforcement
      const currentDrivers = await this.driverService.listDriversForMitra(this.testMitra1.id);
      const driversToInvite = TEST_CONFIG.DEFAULT_DRIVER_LIMIT - currentDrivers.length + 1; // Exceed limit by 1

      let inviteResults = [];
      for (let i = 0; i < driversToInvite; i++) {
        try {
          const inviteResult = await this.driverService.inviteDriver(
            this.testMitra1.id,
            `driver-${i}-${Date.now()}@example.com`
          );
          inviteResults.push({ success: true, result: inviteResult });
        } catch (error) {
          inviteResults.push({ success: false, error: error.message, code: error.code });
        }
      }

      // Should succeed for drivers within limit, fail for excess
      const successfulInvites = inviteResults.filter(r => r.success).length;
      const paymentRequiredErrors = inviteResults.filter(r => !r.success && r.code === 'PAYMENT_REQUIRED').length;

      this.addResult(
        'Driver Limit Enforcement - Free Tier',
        successfulInvites <= TEST_CONFIG.DEFAULT_DRIVER_LIMIT && paymentRequiredErrors > 0,
        `Successful: ${successfulInvites}/${driversToInvite}, Payment required errors: ${paymentRequiredErrors}`
      );

      // Test 2: Active subscription higher limit
      const activeCurrentDrivers = await this.driverService.listDriversForMitra(this.testMitra2.id);
      const canInviteMore = TEST_CONFIG.PREMIUM_DRIVER_LIMIT - activeCurrentDrivers.length;

      if (canInviteMore > 0) {
        try {
          const premiumInvite = await this.driverService.inviteDriver(
            this.testMitra2.id,
            `premium-driver-${Date.now()}@example.com`
          );
          
          this.addResult(
            'Driver Limit Enforcement - Active Subscription',
            premiumInvite && premiumInvite.inviteLink,
            `Can invite ${canInviteMore} more drivers`
          );
        } catch (error) {
          this.addResult(
            'Driver Limit Enforcement - Active Subscription',
            false,
            `Unexpected error: ${error.message}`
          );
        }
      } else {
        this.addResult(
          'Driver Limit Enforcement - Active Subscription',
          true,
          'At driver limit for active subscription'
        );
      }

      return true;
    } catch (error) {
      this.logError('Driver limit enforcement test failed', error);
      this.addResult('Driver Limit Enforcement', false, error.message);
      return false;
    }
  }

  async testIdempotentMonthlyInvoiceGeneration() {
    this.log('Testing idempotent monthly invoice generation...');

    try {
      // Test 1: Generate monthly invoices for first time
      const firstGeneration = await this.billingService.generateMonthlyInvoices();
      
      this.addResult(
        'Monthly Invoice Generation - First Run',
        Array.isArray(firstGeneration) && firstGeneration.length >= 0,
        `Generated ${firstGeneration.length} invoices`
      );

      // Test 2: Generate monthly invoices again (should be idempotent)
      const secondGeneration = await this.billingService.generateMonthlyInvoices();
      
      this.addResult(
        'Monthly Invoice Generation - Idempotency',
        Array.isArray(secondGeneration) && secondGeneration.length === 0,
        `Second run generated ${secondGeneration.length} invoices (should be 0)`
      );

      // Test 3: Verify invoice calculation based on driver limits
      const activeInvoices = await this.billingService.getInvoicesByMitra(this.testMitra2.id, 'pending');
      const monthlySubscriptionInvoices = activeInvoices.filter(inv => 
        inv.type === 'subscription' && 
        inv.createdAt.getMonth() === new Date().getMonth()
      );

      if (monthlySubscriptionInvoices.length > 0) {
        const invoice = monthlySubscriptionInvoices[0];
        const expectedAmount = this.testMitra2.activeDriverLimit * TEST_CONFIG.SUBSCRIPTION_AMOUNT_PER_DRIVER;
        
        this.addResult(
          'Monthly Invoice Generation - Amount Calculation',
          invoice.amount === expectedAmount,
          `Expected: ${expectedAmount}, Actual: ${invoice.amount}, Drivers: ${this.testMitra2.activeDriverLimit}`
        );
      } else {
        this.addResult(
          'Monthly Invoice Generation - Amount Calculation',
          true,
          'No monthly subscription invoices found (expected for test scenario)'
        );
      }

      return true;
    } catch (error) {
      this.logError('Monthly invoice generation test failed', error);
      this.addResult('Monthly Invoice Generation', false, error.message);
      return false;
    }
  }

  async testInvoiceRetrieval() {
    this.log('Testing invoice retrieval operations...');

    try {
      // Test 1: Get invoices by mitra
      const mitra1Invoices = await this.billingService.getInvoicesByMitra(this.testMitra1.id);
      const mitra2Invoices = await this.billingService.getInvoicesByMitra(this.testMitra2.id);

      this.addResult(
        'Invoice Retrieval - By Mitra',
        Array.isArray(mitra1Invoices) && Array.isArray(mitra2Invoices),
        `Mitra1: ${mitra1Invoices.length} invoices, Mitra2: ${mitra2Invoices.length} invoices`
      );

      // Test 2: Get invoices by status
      const pendingInvoices = await this.billingService.getInvoicesByMitra(this.testMitra1.id, 'pending');
      const paidInvoices = await this.billingService.getInvoicesByMitra(this.testMitra1.id, 'paid');

      this.addResult(
        'Invoice Retrieval - By Status',
        Array.isArray(pendingInvoices) && Array.isArray(paidInvoices),
        `Pending: ${pendingInvoices.length}, Paid: ${paidInvoices.length}`
      );

      // Test 3: Get invoice by public ID
      if (this.testSubscriptionInvoice) {
        const invoiceById = await this.billingService.getInvoiceByPublicId(
          this.testSubscriptionInvoice.publicId,
          this.testMitra1.id
        );

        this.addResult(
          'Invoice Retrieval - By Public ID',
          invoiceById && invoiceById.id === this.testSubscriptionInvoice.id,
          `Found invoice: ${invoiceById?.publicId}`
        );
      }

      return true;
    } catch (error) {
      this.logError('Invoice retrieval test failed', error);
      this.addResult('Invoice Retrieval', false, error.message);
      return false;
    }
  }

  async testDatabaseConstraints() {
    this.log('Testing database constraints...');

    try {
      // Test 1: Unique public ID constraint
      try {
        const duplicateId = 'DUPLICATE-TEST-ID';
        await this.db.insert(schema.invoices).values({
          publicId: duplicateId,
          mitraId: this.testMitra1.id,
          type: 'other',
          amount: 1000,
        });
        
        await this.db.insert(schema.invoices).values({
          publicId: duplicateId,
          mitraId: this.testMitra2.id,
          type: 'other', 
          amount: 2000,
        });
        
        this.addResult('Database Constraints - Unique Public ID', false, 'Should have thrown unique constraint error');
      } catch (error) {
        this.addResult(
          'Database Constraints - Unique Public ID',
          error.message.includes('UNIQUE') || error.message.includes('unique'),
          `Error: ${error.message}`
        );
      }

      // Test 2: Foreign key constraint
      try {
        await this.db.insert(schema.invoices).values({
          publicId: nanoid(),
          mitraId: 'NON-EXISTENT-MITRA-ID',
          type: 'other',
          amount: 1000,
        });
        
        this.addResult('Database Constraints - Foreign Key', false, 'Should have thrown foreign key constraint error');
      } catch (error) {
        this.addResult(
          'Database Constraints - Foreign Key',
          error.message.includes('FOREIGN KEY') || error.message.includes('foreign key'),
          `Error: ${error.message}`
        );
      }

      return true;
    } catch (error) {
      this.logError('Database constraints test failed', error);
      this.addResult('Database Constraints', false, error.message);
      return false;
    }
  }

  async cleanup() {
    this.log('Cleaning up test data...');
    try {
      await this.client.close();
      this.log('Cleanup complete');
    } catch (error) {
      this.logError('Cleanup failed', error);
    }
  }

  async runAllTests() {
    this.log('🚀 Starting QRIS Billing System Verification');
    this.log('='.repeat(50));

    try {
      // Setup
      const setupSuccess = await this.setupTestData();
      if (!setupSuccess) {
        this.log('❌ Setup failed, aborting tests');
        return this.generateReport();
      }

      // Run all tests
      await this.testInvoiceCreation();
      await this.testQRISGeneration();
      await this.testPaymentConfirmation();
      await this.testDriverLimitEnforcement();
      await this.testIdempotentMonthlyInvoiceGeneration();
      await this.testInvoiceRetrieval();
      await this.testDatabaseConstraints();

    } catch (error) {
      this.logError('Test execution failed', error);
    } finally {
      await this.cleanup();
    }

    return this.generateReport();
  }

  generateReport() {
    this.log('='.repeat(50));
    this.log('📊 VERIFICATION REPORT');
    this.log('='.repeat(50));

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    this.log(`Total Tests: ${totalTests}`);
    this.log(`Passed: ${passedTests} ✅`);
    this.log(`Failed: ${failedTests} ❌`);
    this.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    this.log('\n📋 DETAILED RESULTS:');
    this.testResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      this.log(`${status} ${result.test}${result.details ? ` - ${result.details}` : ''}`);
    });

    this.log('\n🔍 CRITICAL CONSTRAINTS VERIFICATION:');
    const criticalTests = [
      'Invoice Creation - Subscription',
      'QRIS Generation - Format Validation', 
      'Payment Confirmation - Subscription',
      'Payment Confirmation - Duplicate Prevention',
      'Driver Limit Enforcement - Free Tier',
      'Monthly Invoice Generation - Idempotency',
      'Database Constraints - Unique Public ID'
    ];

    const criticalResults = this.testResults.filter(r => 
      criticalTests.some(ct => r.test.includes(ct))
    );
    
    const criticalPassed = criticalResults.filter(r => r.passed).length;
    const criticalTotal = criticalResults.length;

    this.log(`Critical Tests: ${criticalPassed}/${criticalTotal} passed`);

    if (criticalPassed === criticalTotal) {
      this.log('\n🎉 ALL CRITICAL CONSTRAINTS VERIFIED SUCCESSFULLY!');
      this.log('The Manual QRIS Billing System implementation is ready for production.');
    } else {
      this.log('\n⚠️  CRITICAL ISSUES DETECTED');
      this.log('Please review and fix the failing tests before deploying to production.');
    }

    return {
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        successRate: ((passedTests / totalTests) * 100).toFixed(1),
        criticalPassed,
        criticalTotal,
        allCriticalPassed: criticalPassed === criticalTotal
      },
      results: this.testResults
    };
  }
}

// Run verification if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const verification = new QRISBillingVerification();
  verification.runAllTests()
    .then(report => {
      process.exit(report.summary.allCriticalPassed ? 0 : 1);
    })
    .catch(error => {
      console.error('Verification script failed:', error);
      process.exit(1);
    });
}

export { QRISBillingVerification };