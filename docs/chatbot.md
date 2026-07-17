# Store Chatbot

The storefront chatbot is mounted globally from:

```txt
src/app/layout.tsx
```

Main files:

```txt
src/components/chat/store-chat-widget.tsx
src/app/api/chat/route.ts
src/lib/chat/customer-assistant.ts
```

Teach the assistant by editing:

```txt
src/lib/chat/customer-assistant.ts
```

Add shop policies, preferred phrasing, fitment rules, service intake questions,
and escalation rules to `CUSTOMER_ASSISTANT_INSTRUCTIONS`.

Required environment variable:

```txt
OPENAI_API_KEY
```

Optional model override:

```txt
OPENAI_CHAT_MODEL=gpt-5
```

Security notes:

- The browser never receives the OpenAI API key.
- The widget calls `/api/chat`.
- `/api/chat` calls OpenAI server-side and includes a few matching active
  catalog products as context.
- The assistant should not be treated as authoritative for fitment, inventory,
  price, emissions legality, or service estimates.
