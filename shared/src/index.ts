// Core agent class
export { MyMCP } from "./agent";

// CodeModeProxy (must be re-exported from worker entry points for service binding)
export { CodeModeProxy } from "./codemode/proxy";

// Schema initialization
export { initializeSchema } from "./schema";

// Unified tool registry
export { ToolRegistry } from "./registry/registry";
export type { ToolEntry, ToolContext, SqlTaggedTemplate } from "./registry/types";

// Tool definitions
export { sqlTools } from "./tools/sql";
export { registerMetaTools } from "./tools/compute";

// Code Mode infrastructure
export { createEvaluator } from "./codemode/evaluator";
export { generateTypes, type ToolDefinition } from "./codemode/types";
