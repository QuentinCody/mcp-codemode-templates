/**
 * SQLite schema initialization for the Code Mode platform.
 *
 * Uses SQLite-in-DO (Durable Objects) -- Cloudflare's recommended storage primitive.
 * Agents can create their own tables via sql_exec; this is just the platform baseline.
 */

export function initializeSchema(sql: <T>(strings: TemplateStringsArray, ...values: (string | number | boolean | null)[]) => T[]) {
	sql`
		CREATE TABLE IF NOT EXISTS execution_log (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			code TEXT NOT NULL,
			result TEXT,
			error TEXT,
			executed_at TEXT DEFAULT CURRENT_TIMESTAMP
		)
	`;
}
