import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { initializeSchema } from "./schema";
import { ToolRegistry } from "./registry/registry";
import { sqlTools } from "./tools/sql";
import { registerMetaTools } from "./tools/compute";

type State = Record<string, never>;

// Minimal interface for shared code (actual Env declared per-server)
interface SharedEnv {
	MCP_OBJECT: DurableObjectNamespace;
	LOADER?: WorkerLoader;
	CODE_MODE_PROXY?: Fetcher;
}

export class MyMCP extends McpAgent<Env, State, Record<string, never>> {
	server = new McpServer({
		name: "Code Mode MCP Server",
		version: "1.0.0",
	});

	initialState: State = {};

	// Guard against re-registering tools on reconnect
	// (init() is called on each connection, but server persists across connections)
	private _toolsRegistered = false;
	private _schemaInitialized = false;
	private registry!: ToolRegistry;

	async init() {
		const sql = this.sql.bind(this);

		// Initialize platform SQLite schema once per DO lifecycle.
		if (!this._schemaInitialized) {
			initializeSchema(sql);
			this._schemaInitialized = true;
		}

		if (this._toolsRegistered) return;
		this._toolsRegistered = true;

		// Build registry with platform context
		this.registry = new ToolRegistry({ sql });

		// Register data tools
		this.registry.add(...sqlTools);

		// Register all data tools with MCP server
		this.registry.registerAll(this.server);

		const env = this.env as unknown as SharedEnv;

		// Register meta-tools (execute_code, get_type_schema) — these depend on the registry
		registerMetaTools(this.server, this.registry, {
			loader: env.LOADER,
			proxy: env.CODE_MODE_PROXY,
			doId: this.ctx.id.toString(),
			logExecution: (code, result, error) => {
				sql`
						INSERT INTO execution_log (code, result, error)
						VALUES (${code}, ${result}, ${error})
					`;
			},
		});
	}

	/**
	 * Called from V8 isolates via CodeModeProxy → DO RPC.
	 * Routes function calls to the appropriate tool handler via the registry.
	 */
	async callTool(functionName: string, args: unknown[]): Promise<unknown> {
		return this.registry.handleIsolateCall(functionName, args);
	}
}
