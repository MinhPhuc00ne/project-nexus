import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Request, Response } from 'express';
import { resolveHeaderTraceId } from '../audit/request-trace.context';
import { toPaginationEnvelope } from './pagination-envelope';

export interface ResponseEnvelope<T> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  traceId?: string;
}

@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<
  T,
  T | ResponseEnvelope<T>
> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<T | ResponseEnvelope<T>> {
    // HTTP envelopes must not inspect or wrap Socket.IO event payloads.
    if (context.getType() !== 'http') return next.handle();
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request & { id?: string }>();
    const response = httpContext.getResponse<Response>();
    const traceId = request?.id || resolveHeaderTraceId(request?.headers) || crypto.randomUUID();

    return next.handle().pipe(
      map((data) => {
        const statusCode = response.statusCode || HttpStatus.OK;
        // If data is already structured with message or custom payload
        let message = 'Operation successful';
        if (statusCode === HttpStatus.SERVICE_UNAVAILABLE) {
          message = 'Service unavailable';
        } else if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
          message = 'Request failed';
        }
        let payload = data;

        if (data && typeof data === 'object' && 'message' in data && 'data' in data) {
          message = (data as { message: string }).message;
          payload = (data as { data: unknown }).data;
        }

        // Paginated lists are emitted in one shape regardless of which of the
        // four historical shapes the handler returned.
        const page = toPaginationEnvelope(payload);
        if (page) payload = page as typeof payload;

        const extraProperties =
          payload && typeof payload === 'object' && 'url' in payload
            ? { url: (payload as { url: unknown }).url }
            : {};

        return {
          statusCode,
          message,
          data: payload,
          ...extraProperties,
          timestamp: new Date().toISOString(),
          traceId,
        };
      }),
    );
  }
}
