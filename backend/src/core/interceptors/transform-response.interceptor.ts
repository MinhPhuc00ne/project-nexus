import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface StandardApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  traceId?: string;
}

@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<T, StandardApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<StandardApiResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest<Request>();
    const traceId = (request?.headers['x-trace-id'] as string) || `req-${Date.now().toString(36)}`;

    return next.handle().pipe(
      map((data: unknown) => {
        // If data is already in StandardApiResponse format, return as is
        if (typeof data === 'object' && data !== null && 'statusCode' in data && 'data' in data) {
          return data as StandardApiResponse<T>;
        }

        const statusCode = response.statusCode || 200;
        return {
          statusCode,
          message: 'Operation successful',
          data: data as T,
          timestamp: new Date().toISOString(),
          traceId,
        };
      }),
    );
  }
}
