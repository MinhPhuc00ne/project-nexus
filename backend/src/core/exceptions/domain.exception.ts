export abstract class DomainException extends Error {
  abstract readonly errorCode: string;
  abstract readonly httpStatus: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UserNotFoundException extends DomainException {
  readonly errorCode = 'USER_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(identifier: string) {
    super(`User with identifier '${identifier}' was not found`);
  }
}

export class UserAlreadyExistsException extends DomainException {
  readonly errorCode = 'USER_ALREADY_EXISTS';
  readonly httpStatus = 409;

  constructor(field: string, value: string) {
    super(`User with ${field} '${value}' already exists`);
  }
}

export class InvalidCredentialsException extends DomainException {
  readonly errorCode = 'AUTH_INVALID_CREDENTIALS';
  readonly httpStatus = 401;

  constructor(message = 'Invalid email or password') {
    super(message);
  }
}

export class AccountLockedException extends DomainException {
  readonly errorCode = 'AUTH_ACCOUNT_LOCKED';
  readonly httpStatus = 403;

  constructor(unlockTime: Date) {
    super(`Account locked due to consecutive failed attempts until ${unlockTime.toISOString()}`);
  }
}

export class AccountPendingActivationException extends DomainException {
  readonly errorCode = 'AUTH_PENDING_ACTIVATION';
  readonly httpStatus = 403;

  constructor(message = 'Account requires activation via the invitation email') {
    super(message);
  }
}

export class AccountSuspendedException extends DomainException {
  readonly errorCode = 'AUTH_ACCOUNT_SUSPENDED';
  readonly httpStatus = 403;

  constructor(message = 'Account has been suspended or deactivated') {
    super(message);
  }
}

export class InvalidTokenException extends DomainException {
  readonly errorCode = 'AUTH_INVALID_TOKEN';
  readonly httpStatus = 401;

  constructor(message = 'Token is invalid or expired') {
    super(message);
  }
}

export class InvalidOtpException extends DomainException {
  readonly errorCode = 'AUTH_INVALID_OTP';
  readonly httpStatus = 400;

  constructor(message = 'Invalid or expired OTP') {
    super(message);
  }
}

export class UnauthorizedRoleException extends DomainException {
  readonly errorCode = 'AUTH_INSUFFICIENT_PERMISSIONS';
  readonly httpStatus = 403;

  constructor(requiredPrivilege: string) {
    super(`Forbidden: Missing required privilege '${requiredPrivilege}'`);
  }
}

export class SellerNotApprovedException extends DomainException {
  readonly errorCode = 'SELLER_NOT_APPROVED';
  readonly httpStatus = 400;

  constructor(message = 'Account is not approved for Seller mode') {
    super(message);
  }
}

export class SellerApplicationPendingException extends DomainException {
  readonly errorCode = 'SELLER_APPLICATION_PENDING';
  readonly httpStatus = 409;

  constructor(message = 'You already have a pending seller application under review') {
    super(message);
  }
}
