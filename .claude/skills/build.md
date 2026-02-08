# Build & Fix Skill

## Build Command

```bash
npm run build
```

Compiles TypeScript from `src/` to `dist/`.

## Dev Server

```bash
npm run dev
```

Runs with tsx watch (hot reload on file changes).

## Production

```bash
npm run start
```

Runs the compiled `dist/index.js`.

## Lint & Format

```bash
npm run check    # Biome check (lint + format + organize imports)
npm run lint     # Biome lint only
npm run format   # Biome format only
```

## Fix Loop

When the build fails:

1. Read the error output
2. Fix the TypeScript error
3. Re-run `npm run build`
4. Repeat until clean

## Testing with Claude Desktop

After building, add to Claude Desktop config:

```json
{
  "mcpServers": {
    "techstart-crm": {
      "command": "node",
      "args": ["dist/index.js"]
    }
  }
}
```

## Common Issues

- **Zod schemas**: Tool input schemas must use Zod. Convert to JSON Schema via `.describe()`.
- **stdio transport**: MCP servers communicate over stdin/stdout. Never use `console.log` for debugging — use `console.error` instead.
- **Supabase types**: Use the generated types from Supabase CLI or define manually in `lib/types.ts`.
