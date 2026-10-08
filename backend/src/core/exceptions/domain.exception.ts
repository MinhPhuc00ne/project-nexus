export abstract class DomainException extends Error {
  abstract readonly errorCode: string;
  abstract readonly httpStatus: number;
  readonly errors?: unknown;

  constructor(message: string, errors?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundException extends DomainException {
  readonly errorCode = 'RESOURCE_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(resource: string, identifier?: string | number) {
    super(
      identifier
        ? `${resource} with identifier '${identifier}' not found`
        : `${resource} not found`,
    );
  }
}

export class BadRequestException extends DomainException {
  readonly errorCode = 'BAD_REQUEST';
  readonly httpStatus = 400;

  constructor(message: string, errors?: unknown) {
    super(message, errors);
  }
}

export class UnauthorizedException extends DomainException {
  readonly errorCode = 'UNAUTHORIZED';
  readonly httpStatus = 401;

  constructor(message: string = 'Authentication required') {
    super(message);
  }
}

export class ForbiddenException extends DomainException {
  readonly errorCode = 'FORBIDDEN';
  readonly httpStatus = 403;

  constructor(message: string = 'Access denied') {
    super(message);
  }
}

export class ConflictException extends DomainException {
  readonly errorCode = 'RESOURCE_CONFLICT';
  readonly httpStatus = 409;

  constructor(message: string) {
    super(message);
  }
}
