// Core agent class (server-specific — not in shared package)
export { MyMCP } from "./agent";

// CodeModeProxy (re-exported from shared package)
export { CodeModeProxy } from "@bio-mcp/shared";

// Schema initialization (server-specific)
export { initializeSchema } from "./schema";

// Unified tool registry (re-exported from shared package)
export { ToolRegistry } from "@bio-mcp/shared";
export type { ToolEntry, ToolContext, SqlTaggedTemplate } from "@bio-mcp/shared";

// Tool definitions (re-exported from shared package)
export { sqlTools } from "@bio-mcp/shared";

// Code Mode infrastructure (re-exported from shared package)
export { createEvaluator } from "@bio-mcp/shared";
export { generateTypes } from "@bio-mcp/shared";
export type { ToolDefinition } from "@bio-mcp/shared";

// Server-specific tools
export { registerMetaTools } from "./tools/compute";
