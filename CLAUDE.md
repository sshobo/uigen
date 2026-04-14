# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server with Turbopack (http://localhost:3000)
npm run build        # Production build
npm run start        # Run production server
npm run test         # Run Vitest tests
npm run lint         # Run ESLint
npm run setup        # Install deps + generate Prisma client + run migrations
```

To run a single test file:
```bash
npx vitest run src/components/chat/__tests__/ChatInterface.test.tsx
```

Database (SQLite via Prisma):
```bash
npx prisma migrate dev    # Apply migrations
npx prisma generate       # Regenerate client after schema changes
npx prisma studio         # GUI for inspecting the database
```

Environment: copy `.env` and set `ANTHROPIC_API_KEY`. Without it, the app falls back to a `MockLanguageModel` that returns static examples.

## Architecture

UIGen is an AI-powered React component generator with a live preview. Users describe components in chat; Claude AI generates them via tool calls; the result renders in real-time in an iframe.

### Data Flow

1. User sends a message → `ChatProvider` (`src/lib/contexts/chat-context.tsx`) via Vercel AI SDK's `useChat`
2. Request hits `/api/chat` (`src/app/api/chat/route.ts`) — includes system prompt and current file system snapshot
3. Claude responds with tool calls (`str_replace_editor`, `file_manager`)
4. `FileSystemProvider` (`src/lib/contexts/file-system-context.tsx`) processes tool calls via `handleToolCall`, updating the in-memory `VirtualFileSystem`
5. File changes trigger `PreviewFrame` re-render (`src/components/preview/`)
6. `PreviewFrame` transforms JSX via Babel (`src/lib/transform/jsx-transformer.ts`) and renders in a sandboxed iframe with import maps
7. On completion, project state (messages + file data) is persisted to SQLite via Prisma (works for both authenticated and anonymous users)

### Key Abstractions

- **`VirtualFileSystem`** (`src/lib/file-system.ts`): In-memory file tree. No disk access — all file state lives here and is serialized to JSON for the database.
- **`ChatProvider`** / **`FileSystemProvider`**: The two main React contexts. Chat owns message state; FileSystem owns file state and tool execution. They are separate but coordinated — the chat context passes a tool handler to the AI SDK.
- **AI Tools** (`src/lib/tools/`): `str_replace_editor` handles view/create/str_replace/insert; `file_manager` handles rename/delete. These mirror the Claude computer-use tool API.
- **JSX Transformer** (`src/lib/transform/jsx-transformer.ts`): Uses Babel standalone to compile JSX in-browser, with import maps to resolve React, Tailwind, shadcn, and lucide-react from CDN inside the iframe.
- **Language Model Provider** (`src/lib/provider.ts`): Returns Anthropic model or `MockLanguageModel` based on env var presence.

### Routing & Auth

- `src/app/page.tsx` — home/landing; redirects authenticated users to their most recent project
- `src/app/[projectId]/page.tsx` — main workspace (chat + editor + preview)
- `src/app/api/chat/route.ts` — POST endpoint consumed by Vercel AI SDK
- `src/middleware.ts` — protects `/api/projects` and `/api/filesystem` routes with JWT
- Auth is JWT-based sessions stored in cookies (`src/lib/auth.ts`); passwords hashed with bcrypt

### Database Models (Prisma + SQLite)

The schema is defined in `prisma/schema.prisma` — reference it whenever you need to understand the structure of data stored in the database.

- `User`: email, passwordHash
- `Project`: name, messages (JSON string), data (JSON string), optional userId (anonymous projects allowed)

### UI Layout

`src/app/main-content.tsx` renders two resizable panels: a chat panel on the left and a tabbed preview/code editor panel on the right. The `ResizablePanel` components from shadcn drive the layout. All shadcn/ui primitives live in `src/components/ui/`.
