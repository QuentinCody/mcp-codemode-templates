import type { SqlTaggedTemplate } from "../registry/types";

const READ_ONLY_PREFIXES = ["SELECT", "PRAGMA", "EXPLAIN"];
const BLOCKED_STATEMENTS = ["ATTACH", "DETACH", "LOAD_EXTENSION"];

function normalizeQuery(query: string): string {
	return query.trim().replace(/\s+/g, " ");
}

export function isReadOnly(query: string): boolean {
	const upper = normalizeQuery(query).toUpperCase();
	return READ_ONLY_PREFIXES.some((prefix) => upper.startsWith(prefix));
}

export function isBlocked(query: string): boolean {
	const upper = normalizeQuery(query).toUpperCase();
	return BLOCKED_STATEMENTS.some(
		(stmt) => upper.startsWith(stmt) || upper.includes(` ${stmt} `) || upper.includes(` ${stmt}(`)
	);
}

/**
 * Execute a SQL query with optional parameters using the tagged template literal.
 * Builds a proper tagged template call to ensure parameterized execution.
 */
export function executeSql<T = Record<string, string | number | boolean | null>>(
	sql: SqlTaggedTemplate,
	query: string,
	params?: (string | number | boolean | null)[]
): T[] {
	if (!params || params.length === 0) {
		const strings = Object.assign([query], { raw: [query] }) as unknown as TemplateStringsArray;
		return sql<T>(strings);
	}

	const parts = query.split("?");
	if (parts.length !== params.length + 1) {
		throw new Error(
			`Parameter count mismatch: query has ${parts.length - 1} placeholders but ${params.length} params were provided`
		);
	}

	const strings = Object.assign(parts, { raw: parts }) as unknown as TemplateStringsArray;
	return sql<T>(strings, ...params);
}
