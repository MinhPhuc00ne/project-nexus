import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

export interface ResponseEnvelope<T> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  traceId?: string;
}

@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<T, ResponseEnvelope<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ResponseEnvelope<T>> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse();
    const statusCode = response.statusCode || 200;
    const traceId = (request.headers['x-trace-id'] as string) || `req-${Date.now().toString(36)}`;

    return next.handle().pipe(
      map((data) => {
        // If data is already structured with message or custom payload
        let message = 'Operation successful';
        let payload = data;

        if (data && typeof data === 'object' && 'message' in data && 'data' in data) {
          message = (data as { message: string }).message;
          payload = (data as { data: unknown }).data;
        }

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
