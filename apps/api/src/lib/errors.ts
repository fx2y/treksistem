export abstract class BaseError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;

  constructor(
    message: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends BaseError {
  readonly statusCode = 404;
  readonly code = "NOT_FOUND";

  constructor(message: string = "Resource not found", details?: any) {
    super(message, details);
  }
}

export class ForbiddenError extends BaseError {
  readonly statusCode = 403;
  readonly code = "FORBIDDEN";

  constructor(message: string = "Access forbidden", details?: any) {
    super(message, details);
  }
}

export class BadRequestError extends BaseError {
  readonly statusCode = 400;
  readonly code = "BAD_REQUEST";

  constructor(message: string = "Bad request", details?: any) {
    super(message, details);
  }
}

export class ConflictError extends BaseError {
  readonly statusCode = 409;
  readonly code = "CONFLICT";

  constructor(message: string = "Resource conflict", details?: any) {
    super(message, details);
  }
}

export class PaymentRequiredError extends BaseError {
  readonly statusCode = 402;
  readonly code = "PAYMENT_REQUIRED";

  constructor(message: string = "Payment required", details?: any) {
    super(message, details);
  }
}

export class UnauthorizedError extends BaseError {
  readonly statusCode = 401;
  readonly code = "UNAUTHORIZED";

  constructor(message: string = "Unauthorized", details?: any) {
    super(message, details);
  }
}

export class InternalServerError extends BaseError {
  readonly statusCode = 500;
  readonly code = "INTERNAL_SERVER_ERROR";

  constructor(message: string = "Internal server error", details?: any) {
    super(message, details);
  }
}
