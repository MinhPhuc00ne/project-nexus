import { Body, Param, Query, StandardSchemaValidationPipe } from '@nestjs/common';
import type { StandardSchemaV1 } from '@standard-schema/spec';

export { StandardSchemaValidationPipe };

/**
 * Shared stateless Standard Schema validation pipe instance.
 * `transform: true` ensures Zod coerced/defaulted values are forwarded to handlers.
 */
const standardSchemaPipe = new StandardSchemaValidationPipe({ transform: true });

function assertSchemaProvided(schema: StandardSchemaV1, decoratorName: string): void {
  if (
    typeof schema !== 'object' ||
    schema === null ||
    !('~standard' in schema) ||
    schema['~standard'] === null ||
    schema['~standard'] === undefined ||
    typeof schema['~standard'] !== 'object'
  ) {
    throw new TypeError(
      `${decoratorName} requires a non-null StandardSchemaV1 instance (Guardrail 1: StandardSchemaValidationPipe skips validation when metadata.schema is missing).`,
    );
  }
}

/**
 * Validates and transforms the HTTP request body using a NestJS 12 Standard Schema
 * (`zod@^4`) and `StandardSchemaValidationPipe` — no `nestjs-zod` required.
 *
 * Standard Schema Guardrails:
 * 1. **Non-null `schema` metadata**: Always use `@ZodBody(schema)` / `@ZodQuery(schema)` /
 *    `@ZodParam(key, schema)` / `@ZodParams(schema)` instead of bare `@Body()` / `@Query()` /
 *    `@Param()`, because `StandardSchemaValidationPipe` silently skips validation when
 *    `metadata.schema` is missing.
 * 2. **No `.meta({ id })` on `@ZodQuery`**: Never attach `.meta({ id: '...' })` to query
 *    schemas. NestJS Swagger's `SchemaObjectFactory.expandStandardSchemaParam` requires an
 *    inline `{ type: 'object', properties }` JSON Schema and drops `$ref` query schemas.
 * 3. **No `.transform()` on response schemas**: Never use `.transform()` on schemas passed
 *    to `@ApiOkResponse({ standardSchema })`, because `StandardSchemaOpenApiConverter` invokes
 *    `'output'` JSON Schema conversion and Zod 4 throws on `.transform()` in output mode.
 * 4. **Explicit binary `@ApiBody` for file uploads**: `@nestjs/swagger` `ApiBodyOptions` does
 *    not support `standardSchema`; keep `@ApiBody({ schema: { type: 'object', ... format: 'binary' } })`
 *    on multipart upload routes.
 */
export function ZodBody<T extends StandardSchemaV1>(schema: T): ParameterDecorator {
  assertSchemaProvided(schema, 'ZodBody');
  return Body({ schema, pipes: [standardSchemaPipe] });
}

/**
 * Validates and coerces HTTP query parameters using a NestJS 12 Standard Schema
 * (`zod@^4`) and `StandardSchemaValidationPipe`.
 *
 * Guardrail: Do NOT attach `.meta({ id })` to `schema`, or `@nestjs/swagger` will emit a
 * `$ref` instead of an inline object and fail to expand query parameters into OpenAPI.
 */
export function ZodQuery<T extends StandardSchemaV1>(schema: T): ParameterDecorator {
  assertSchemaProvided(schema, 'ZodQuery');
  return Query({ schema, pipes: [standardSchemaPipe] });
}

/**
 * Validates a single HTTP route parameter by `key` using a NestJS 12 Standard Schema
 * (`zod@^4`) and `StandardSchemaValidationPipe`.
 */
export function ZodParam<T extends StandardSchemaV1>(key: string, schema: T): ParameterDecorator {
  assertSchemaProvided(schema, 'ZodParam');
  return Param(key, { schema, pipes: [standardSchemaPipe] });
}

/**
 * Validates the entire HTTP route params object using a NestJS 12 Standard Schema
 * (`zod@^4`) and `StandardSchemaValidationPipe`.
 */
export function ZodParams<T extends StandardSchemaV1>(schema: T): ParameterDecorator {
  assertSchemaProvided(schema, 'ZodParams');
  return Param({ schema, pipes: [standardSchemaPipe] });
}
