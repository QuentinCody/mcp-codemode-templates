import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolDefinition } from "../codemode/types";
import type { ToolEntry, ToolContext } from "./types";

/**
 * Unified tool registry — the single place tools are defined.
 *
 * Derives MCP registration, isolate call routing, and type generation
 * from the same ToolEntry definitions.
 */
export class ToolRegistry {
	private tools: ToolEntry[] = [];
	private toolByName = new Map<string, ToolEntry>();
	private ctx: ToolContext;

	constructor(ctx: ToolContext) {
		this.ctx = ctx;
	}

	/**
	 * Add tool entries to the registry.
	 */
	add(...entries: ToolEntry[]) {
		this.tools.push(...entries);
		for (const entry of entries) {
			this.toolByName.set(entry.name, entry);
		}
	}

	/**
	 * Register all tools with the MCP server.
	 * Wraps each handler to produce MCP-formatted responses.
	 */
	registerAll(server: McpServer) {
		for (const tool of this.tools) {
			const ctx = this.ctx;
			server.tool(tool.name, tool.schema, async (input) => {
				try {
					const result = await tool.handler(input, ctx);
					return {
						content: [{ type: "text", text: result === undefined ? "undefined" : JSON.stringify(result) }],
					};
				} catch (e: unknown) {
					const error = e instanceof Error ? e.message : String(e);
					return {
						content: [{ type: "text", text: JSON.stringify({ error }) }],
					};
				}
			});
		}
	}

	/**
	 * Handle a tool call from a V8 isolate (via CodeModeProxy → DO RPC).
	 * Replaces the manual callTool() switch statement.
	 */
	async handleIsolateCall(functionName: string, args: unknown[]): Promise<unknown> {
		const tool = this.toolByName.get(functionName);
		if (!tool) {
			return { error: `Unknown tool: ${functionName}` };
		}
		const input = (args[0] ?? {}) as Record<string, unknown>;
		return tool.handler(input, this.ctx);
	}

	/**
	 * Get tool definitions for type generation.
	 * Returns the shape expected by generateTypes().
	 */
	getDefinitions(): ToolDefinition[] {
		return this.tools.map((t) => ({
			name: t.name,
			description: t.description,
			inputSchema: t.schema,
		}));
	}
}
