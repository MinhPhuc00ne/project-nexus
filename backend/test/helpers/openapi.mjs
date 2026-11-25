/**
 * Reads the request body schema a route documents.
 *
 * A body described by a Zod schema is inlined at the route rather than named in
 * `components.schemas`, so a test that used to look the DTO up by class name
 * asks the route for its body instead.
 *
 * @param {object} document - A generated OpenAPI document.
 * @param {string} path - The route's path, as the document spells it.
 * @param {string} method - The HTTP method, lowercase.
 * @param {string} [contentType] - Which body media type to read.
 * @returns {object} The JSON Schema for that body.
 */
export function requestBodySchema(document, path, method, contentType = 'application/json') {
  const operation = document.paths[path]?.[method];
  if (!operation) throw new Error(`no ${method} ${path} in the document`);
  const content = operation.requestBody?.content?.[contentType];
  if (!content) throw new Error(`no ${contentType} body on ${method} ${path}`);
  const schema = content.schema;
  return schema.$ref ? document.components.schemas[schema.$ref.split('/').pop()] : schema;
}
