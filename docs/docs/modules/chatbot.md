---
id: chatbot
title: Conversational AI Chatbot
sidebar_position: 2
---

# Conversational AI Chatbot

The Project Nexus chatbot uses Google Gemini to generate support answers constrained by the system prompt in `backend/src/modules/chat/services/chatbot-system-prompt.ts` and the knowledge base in `backend/src/modules/chat/services/chatbot-knowledge.ts`.

## Configuration

Set the following environment variables on the backend server and restart the process:

```dotenv
CHATBOT_AI_ENABLED=true
GEMINI_API_KEY=<your_gemini_api_key>
CHATBOT_GEMINI_MODEL=<supported_gemini_model>
```

The model identifier must start with `gemini-` and support structured JSON output. When `CHATBOT_AI_ENABLED` is disabled, when Gemini times out or returns an error, or when response validation fails, the backend falls back to static FAQ guidance (`engine: "FAQ"`). Valid Gemini responses return `engine: "GEMINI"`.

## Endpoints and Security Controls

The chatbot processes text messages only. Requests containing file attachments are rejected with HTTP `400 Bad Request`. Image URLs inside message text remain plain strings and are never fetched by the backend.

- `POST /api/v1/chat/bot/messages` requires a valid Bearer JWT and supports optional `orderId` lookups.
- `POST /api/v1/chat/bot/guest/messages` serves unauthenticated visitors with general platform guidance.
- Redis rate limiting restricts callers to 20 requests per minute per IP address or account.

Example request payload:

```json
{
  "message": "The shop confirmed my order. What should I do next?",
  "history": [
    { "role": "user", "content": "I want to cancel my order" },
    { "role": "assistant", "content": "Has the shop confirmed your order yet?" }
  ]
}
```

The optional `history` array accepts up to 12 prior turns with a maximum of 2,000 characters per message. Only `user` and `assistant` roles are accepted; client-supplied system prompts are rejected. Because the backend does not persist chatbot transcripts, callers pass prior turns to continue a conversation. Messages matching secret patterns or security keywords trigger static guidance, and matching entries in `history` are redacted before calling Gemini.

When an authenticated request includes `orderId`, the service queries the order directly from PostgreSQL after verifying buyer or seller ownership and returns `engine: "ORDER"` without invoking Gemini. Unauthenticated guests cannot pass `orderId`, and the assistant holds no administrative or write privileges.

Every response follows a fixed schema containing `reply`, `engine`, `topic`, `sources`, and `actions`. Sources and suggested actions are selected strictly from a predefined catalog.

## Verification

Run the automated unit and API tests for the chatbot module:

```bash
node --test backend/test/chatbot.test.mjs backend/test/chatbot-api.test.mjs
npm run build:backend
```

These tests mock Gemini responses so they run without external API calls or quota consumption.
