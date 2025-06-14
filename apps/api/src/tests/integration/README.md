# API Integration Tests

This directory contains comprehensive integration tests for the Treksistem API that test end-to-end workflows and business logic.

## Test Structure

### Test Files

- **`auth.integration.test.ts`** - Authentication flow tests including Google OAuth, JWT token management, and rate limiting
- **`orders.integration.test.ts`** - Order creation, tracking, and management workflows
- **`mitra.integration.test.ts`** - Mitra (business owner) functionality including service management and driver management
- **`admin.integration.test.ts`** - Admin endpoints including health checks and schema validation
- **`setup.ts`** - Global test setup, teardown, and test utilities

### Test Configuration

- **`vitest.integration.config.ts`** - Vitest configuration specifically for integration tests with longer timeouts and test database setup

## Running Tests

```bash
# Run all integration tests
pnpm test:integration

# Run specific test file
pnpm test:integration auth.integration.test.ts

# Run tests in watch mode
pnpm test:watch --config vitest.integration.config.ts

# Run with coverage
pnpm test:coverage --config vitest.integration.config.ts
```

## Test Environment Setup

### Prerequisites

1. **Test Database**: Integration tests require a separate test database to avoid affecting development data
2. **Environment Variables**: Set up test-specific environment variables
3. **Mock Services**: External services (Google OAuth, Midtrans) should be mocked for consistent testing

### Test Data

The tests use the following test data patterns:

- **Test User ID**: `test-user-123`
- **Test Mitra ID**: `test-mitra-123`
- **Test Service ID**: `test-service-123`
- **Test Order ID**: `test-order-123`

### Mocked External Services

- **Google OAuth**: Mocked to return consistent user data
- **Midtrans Payments**: Mocked to simulate payment flows
- **R2 Storage**: Mocked for file upload testing

## Test Scenarios Covered

### Authentication Tests
- Google OAuth login flow
- JWT token validation and refresh
- Rate limiting on auth endpoints
- Session management

### Order Management Tests
- Public order creation with validation
- Order tracking by public ID
- Service quotes and pricing
- Rate limiting on order creation

### Mitra Management Tests
- Service creation and management
- Driver invitation and management
- Order assignment workflows
- Profile management

### Admin Tests
- Health check endpoints
- Schema validation
- System monitoring
- Authentication and authorization

## Best Practices

### Test Isolation
- Each test should be independent and not rely on other tests
- Use proper setup and teardown to ensure clean state
- Use transactions or database cleaning between tests

### Error Handling
- Test both success and failure scenarios
- Verify proper error codes and messages
- Test rate limiting and validation errors

### Performance
- Integration tests have longer timeouts (30 seconds)
- Tests run in separate processes for better isolation
- Use efficient database operations

## Future Improvements

### Database Testing
- Implement proper test database setup with migrations
- Add database transaction rollback for faster test isolation
- Use test-specific data seeding

### Mock Services
- Implement comprehensive mocking for external services
- Add webhook testing for payment callbacks
- Mock geolocation services for routing tests

### Test Coverage
- Add tests for driver workflows
- Add tests for notification systems
- Add tests for billing and subscription management

### CI/CD Integration
- Add integration test runs to CI pipeline
- Set up test database for CI environment
- Add test result reporting and coverage tracking

## Troubleshooting

### Common Issues

1. **Database Connection Errors**: Ensure test database is properly configured
2. **Authentication Failures**: Verify JWT secrets and test tokens are correct
3. **Rate Limiting**: Tests may fail if rate limits are too restrictive for test scenarios
4. **Async Issues**: Use proper `await` for all async operations

### Debug Tips

- Use `test.only()` to run specific tests during development
- Add console logs for debugging complex flows
- Check test database state manually if tests are failing
- Verify mock services are returning expected data

## Contributing

When adding new integration tests:

1. Follow existing test patterns and naming conventions
2. Add proper setup and teardown for test data
3. Test both success and error scenarios
4. Include rate limiting tests for new endpoints
5. Update this README with new test scenarios