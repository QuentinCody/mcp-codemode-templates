import { z } from "zod";
import type { ToolEntry } from "../registry/types";
import { isReadOnly, isBlocked, executeSql } from "./sql-helpers";

export const sqlTools: ToolEntry[] = [
	{
		name: "sql_query",
		description: "Execute SELECT queries against SQLite. Returns rows as JSON.",
		schema: {
			query: z.string().describe("SQL SELECT query to execute. Only SELECT, PRAGMA, and EXPLAIN statements are allowed."),
			params: z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional().describe("Optional query parameters for parameterized queries"),
		},
		handler: async (input, ctx) => {
			const { query, params } = input as { query: string; params?: (string | number | boolean | null)[] };
			if (!isReadOnly(query)) {
				throw new Error("sql_query only allows SELECT, PRAGMA, and EXPLAIN statements. Use sql_exec for DDL/DML.");
			}
			return executeSql(ctx.sql, query, params);
		},
	},
	{
		name: "sql_exec",
		description: "Execute DDL/DML statements (CREATE TABLE, INSERT, UPDATE, DELETE).",
		schema: {
			query: z.string().describe("SQL DDL/DML statement to execute (CREATE TABLE, INSERT, UPDATE, DELETE, etc). ATTACH, DETACH, and LOAD_EXTENSION are blocked."),
			params: z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional().describe("Optional query parameters for parameterized queries"),
		},
		handler: async (input, ctx) => {
			const { query, params } = input as { query: string; params?: (string | number | boolean | null)[] };
			if (isBlocked(query)) {
				throw new Error("ATTACH, DETACH, and LOAD_EXTENSION statements are not allowed.");
			}
			const result = executeSql(ctx.sql, query, params);
			return { success: true, result };
		},
	},
];
