import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createEvaluator } from "../codemode/evaluator";
import { generateTypes } from "../codemode/types";
import type { ToolRegistry } from "../registry/registry";

export function registerMetaTools(
	server: McpServer,
	registry: ToolRegistry,
	options: {
		loader?: WorkerLoader;
		proxy?: Fetcher;
		doId: string;
		logExecution: (code: string, result: string | null, error: string | null) => void;
	}
) {
	let cachedTypes: string | null = null;

	server.tool(
		"execute_code",
		{
			code: z.string().describe(
				"JavaScript code to execute in a sandboxed V8 isolate. " +
				"The code has access to a `codemode` object with typed functions for all other tools. " +
				"The code should be a function body (not wrapped in a function). " +
				"Use `return` to return a value. Example: `const rows = await codemode.sql_query({query: 'SELECT * FROM agents'}); return rows;`"
			),
		},
		async ({ code }) => {
			if (!options.loader) {
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								error: "Worker Loader (LOADER binding) is not available. " +
									"execute_code requires the Worker Loader API (Cloudflare beta). " +
									"All other tools work independently of Code Mode.",
							}),
						},
					],
				};
			}
			if (!options.proxy) {
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								error: "CODE_MODE_PROXY service binding is not available. " +
									"Add a self-referencing service binding for CodeModeProxy in wrangler.jsonc.",
							}),
						},
					],
				};
			}

			try {
				const evaluator = createEvaluator(code, {
					loader: options.loader,
					proxy: options.proxy,
					doId: options.doId,
				});
				const result = await evaluator();

				// The isolate's try/catch returns { error, stack } on JS errors
				if (result && typeof result === "object" && "error" in result && "stack" in result) {
					const errResult = result as { error: string; stack: string };
					options.logExecution(code, null, errResult.error);
					return {
						content: [{ type: "text", text: JSON.stringify({ error: errResult.error, stack: errResult.stack }) }],
					};
				}

				const resultStr = result === undefined ? "undefined" : JSON.stringify(result);
				options.logExecution(code, resultStr, null);

				return {
					content: [{ type: "text", text: resultStr }],
				};
			} catch (e: unknown) {
				const error = e instanceof Error ? e.message : String(e);
				options.logExecution(code, null, error);
				return {
					content: [{ type: "text", text: JSON.stringify({ error }) }],
				};
			}
		}
	);

	server.tool("get_type_schema", {}, async () => {
		if (cachedTypes === null) {
			const tools = registry.getDefinitions();
			cachedTypes = generateTypes(tools);
		}
		return {
			content: [{ type: "text", text: cachedTypes }],
		};
	});
}
