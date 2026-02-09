import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { MyMCP } from "mcp-shared";
export { MyMCP, CodeModeProxy } from "mcp-shared";
import app from "./app";

// Export the OAuth handler as the default
export default new OAuthProvider({
	apiRoute: "/mcp",
	apiHandler: MyMCP.serve("/mcp"),
	// @ts-expect-error
	defaultHandler: app,
	authorizeEndpoint: "/authorize",
	tokenEndpoint: "/token",
	clientRegistrationEndpoint: "/register",
});
