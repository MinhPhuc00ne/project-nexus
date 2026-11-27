-- Drop unused transactional outbox table and enum (zero producers/consumers).
DROP TABLE IF EXISTS "outbox_events";
DROP TYPE IF EXISTS "OutboxEventStatus";
