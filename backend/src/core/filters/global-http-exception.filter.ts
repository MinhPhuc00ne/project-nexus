import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { inspect } from 'node:util';
import { Request, Response } from 'express';

/** The shape of an HttpException, whichever copy of Nest built it. */
interface HttpExceptionLike {
  getStatus(): number;
  getResponse(): unknown;
  message: string;
}

/**
 * Whether this is an HTTP error, without asking which `HttpException` class it
 * came from.
 *
 * `instanceof` is the obvious test and it is not enough: a monorepo can end up
 * with the request pipeline and the thing that threw holding different module
 * instances of `@nestjs/common`, and then a `BadRequestException` is not an
 * `HttpException` here. The symptom is the worst kind — a rejected request
 * answered as 500 Internal Server Error, intermittently, with the real reason
 * swallowed — so this checks the shape as well.
 *
 * @param value - Whatever was thrown.
 * @returns True when it can answer for its own status.
 */
function isHttpException(value: unknown): value is HttpExceptionLike {
  if (value instanceof HttpException) return true;
  const candidate = value as Partial<HttpExceptionLike> | null;
  if (!candidate || typeof candidate !== 'object') return false;
  if (typeof candidate.getStatus !== 'function' || typeof candidate.getResponse !== 'function')
    return false;
  const status = candidate.getStatus();
  return Number.isInteger(status) && status >= 400 && status <= 599;
}

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    if (typeof host.getType === 'function' && host.getType() !== 'http') {
      return;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { id?: string }>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message: string | string[] = 'Internal server error occurred';
    let errors: unknown = null;

    if (isHttpException(exception)) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        message = (resObj.message as string | string[]) || exception.message;
        errorCode =
          (typeof resObj.errorCode === 'string' && resObj.errorCode) ||
          (typeof resObj.error === 'string' && resObj.error) ||
          `HTTP_${statusCode}`;
        errors = resObj.errors || null;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled Error: ${exception.message}`, exception.stack);
    } else {
      // Something was thrown that is neither an HTTP error nor an Error — a
      // bare object or a string, usually from a library. Without this the
      // request became a 500 that logged nothing at all.
      this.logger.error(
        `Unhandled throwable (${Object.prototype.toString.call(exception)}): ${inspect(exception, {
          depth: 3,
        }).slice(0, 2000)}`,
      );
    }

    const traceId =
      request?.id ||
      (request?.headers?.['x-request-id'] as string) ||
      (request?.headers?.['x-trace-id'] as string) ||
      crypto.randomUUID();

    response.status(statusCode).json({
      statusCode,
      errorCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      traceId,
      errors,
    });
  }
}
