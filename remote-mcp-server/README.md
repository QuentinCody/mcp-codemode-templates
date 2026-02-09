# Code Mode MCP Server (with OAuth)

A remote MCP server on Cloudflare Workers implementing the **Code Mode** pattern — a generic compute + storage platform where AI agents connect via MCP, get typed APIs, and can execute code in sandboxed V8 isolates.

- **SQLite-in-DO** — Full SQL database per instance (up to 10GB, zero-latency)
- **Code Mode** — Execute JavaScript in sandboxed V8 isolates with typed tool access
- **Agent Registry** — Track connected agents with metadata
- **OAuth Authentication** — Secure access with login flow

## Get Started

```bash
# From the monorepo root:
npm install
cd remote-mcp-server
npm run dev
```

Server runs at `http://localhost:8787`
- Homepage: `http://localhost:8787/`
- MCP endpoint: `http://localhost:8787/mcp`
- Authorization: `http://localhost:8787/authorize`

## Available Tools

### Storage (SQL)

| Tool | Params | Description |
|------|--------|-------------|
| `sql_query` | `query`, `params?` | Execute SELECT/PRAGMA/EXPLAIN queries. Returns rows as JSON. |
| `sql_exec` | `query`, `params?` | Execute DDL/DML (CREATE TABLE, INSERT, UPDATE, DELETE). |

Agents can create their own tables, indexes, and manage data entirely through SQL. Parameterized queries prevent injection. `sql_exec` blocks ATTACH, DETACH, and LOAD_EXTENSION for safety.

### Compute (Code Mode)

| Tool | Params | Description |
|------|--------|-------------|
| `execute_code` | `code` | Execute JavaScript in a sandboxed V8 isolate with access to all tools via `codemode` object. |
| `get_type_schema` | (none) | Returns TypeScript type definitions for all tools, so agents can write well-typed code. |

### System

| Tool | Params | Description |
|------|--------|-------------|
| `register_agent` | `id`, `name?`, `metadata?` | Register agent identity. Updates last_seen_at on re-registration. |
| `list_agents` | (none) | List all registered agents. |

## How Code Mode Works

1. **Agent calls `get_type_schema`** to get TypeScript definitions for all available tools
2. **Agent writes JavaScript code** using those types as a guide
3. **Agent calls `execute_code`** with the code string
4. **Code runs in a sandboxed V8 isolate** with a `codemode` proxy object
5. **Tool calls in the isolate** (e.g., `codemode.sql_query(...)`) route back to the MCP server
6. **Results return** to the agent

### Example Flow

```
Agent → get_type_schema()
Agent ← TypeScript definitions

Agent → execute_code({
  code: `
    await codemode.sql_exec({
      query: "CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, title TEXT, body TEXT)"
    });
    await codemode.sql_exec({
      query: "INSERT INTO notes (title, body) VALUES (?, ?)",
      params: ["Hello", "World"]
    });
    const notes = await codemode.sql_query({ query: "SELECT * FROM notes" });
    return notes;
  `
})
Agent ← [{ id: 1, title: "Hello", body: "World" }]
```

> **Note:** Worker Loader API may require Cloudflare beta access. The `execute_code` tool will gracefully error if the LOADER binding isn't available. All other tools work independently of Code Mode.

## Connect with MCP Inspector

```bash
npx @modelcontextprotocol/inspector
```

1. Enter `http://localhost:8787/sse` as the MCP server URL
2. You'll be redirected to login (any email/password works for demo)
3. After auth, you can list and call tools

## Connect with Claude Desktop

Add to your Claude Desktop config (`Settings > Developer > Edit Config`):

```json
{
  "mcpServers": {
    "codemode": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:8787/sse"]
    }
  }
}
```

A browser window will open for login when Claude starts.

## Deploy to Cloudflare

1. Create KV namespace for OAuth:
   ```bash
   npx wrangler kv namespace create OAUTH_KV
   ```

2. Add the KV namespace ID to `wrangler.jsonc`

3. Deploy:
   ```bash
   npm run deploy
   ```

4. Update Claude Desktop config to use your deployed URL:
   ```
   https://remote-mcp-server.<your-account>.workers.dev/sse
   ```

## Architecture

- **Monorepo** — Shared `mcp-shared` package keeps both servers in sync
- **McpAgent** — Extends Cloudflare's Agent class with MCP server capabilities
- **SQLite-in-DO** — Each Durable Object instance has its own embedded SQLite database
- **Code Mode** — V8 isolates via Worker Loader with CodeModeProxy for tool callbacks
- **Agent Registry** — SQLite-backed agent tracking with metadata
- **OAuth** — `@cloudflare/workers-oauth-provider` wraps the MCP handler

## Customization

### Adding Tools

Tools are defined in `shared/src/tools/`. To add new tools:

1. Create a new file in `shared/src/tools/`
2. Export a `registerXTools(server, sql)` function
3. Call it from `shared/src/agent.ts` in the `init()` method
4. Add tool definitions to `getToolDefinitions()` for Code Mode type generation
5. Add a case to `callTool()` for V8 isolate access

### Customizing Auth

Edit `src/app.ts` to:
- Integrate with real identity providers (Google, GitHub, etc.)
- Add actual user validation
- Customize the login UI

The demo accepts any email/password by default.
