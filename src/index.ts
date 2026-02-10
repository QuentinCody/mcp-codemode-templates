import { MyMCP } from "./mcp-shared";
export { MyMCP, CodeModeProxy } from "./mcp-shared";

const mcpHandler = MyMCP.serve("/mcp");

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/mcp") {
			return mcpHandler.fetch(request, env, ctx);
		}

		// Simple homepage
		if (url.pathname === "/") {
			return new Response(
				`<!DOCTYPE html>
<html>
<head><title>Code Mode MCP Server</title></head>
<body>
<h1>Code Mode MCP Server</h1>
<p>Connect to <code>/mcp</code> using an MCP client.</p>
<h2>Available Tools:</h2>
<ul>
<li><b>sql_query</b> -- Execute SELECT queries against SQLite</li>
<li><b>sql_exec</b> -- Execute DDL/DML (CREATE TABLE, INSERT, UPDATE, DELETE)</li>
<li><b>sql_exec_batch</b> -- Execute multiple DDL/DML statements in one call</li>
<li><b>get_weather</b> -- Get current weather for any city</li>
<li><b>execute_code</b> -- Execute JavaScript in a sandboxed V8 isolate</li>
<li><b>get_type_schema</b> -- Get TypeScript type definitions for all tools</li>
</ul>
</body>
</html>`,
				{ headers: { "Content-Type": "text/html" } }
			);
		}

		return new Response("Not found", { status: 404 });
	},
};
