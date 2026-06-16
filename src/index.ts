#!/usr/bin/env node
/**
 * Formatix AI — MCP server (public client)
 *
 * Generate branded talent documents — assessment reports (Hogan, psychometric,
 * CEO & leadership), progression reports, candidate profiles, shortlists,
 * client submittals, proposals and RPO reports — in DOCX, PPTX, PDF or Excel,
 * from a CV, a LinkedIn profile, or structured data.
 *
 * This is a thin client for the Formatix API (https://platform.formatix.ai).
 * It contains no application logic and no credentials: the user supplies their
 * own key via FORMATIX_API_KEY, or requests a free one with `claim_access`.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const DEFAULT_BASE = "https://platform.formatix.ai";
// Only allow https overrides; anything else falls back to the default host so a
// misconfigured base can never redirect the Authorization header over plaintext.
const RAW_BASE = (process.env.FORMATIX_API_BASE || DEFAULT_BASE).replace(/\/+$/, "");
const API_BASE = /^https:\/\//i.test(RAW_BASE) ? RAW_BASE : DEFAULT_BASE;
const API_KEY = process.env.FORMATIX_API_KEY?.trim() || "";

const SIGNUP_URL = "https://formatix.ai";

const NO_KEY_HINT =
  "No Formatix API key is configured for this connection.\n\n" +
  "To get FREE access right now, call the `claim_access` tool with your COMPANY email " +
  "(personal inboxes such as gmail.com / outlook.com / yahoo.com are not eligible). " +
  "A free API key will be issued.\n\n" +
  "Alternatively, set FORMATIX_API_KEY in your MCP configuration, or sign up at " +
  SIGNUP_URL +
  ".";

function text(s: string) {
  return { content: [{ type: "text" as const, text: s }] };
}

function errText(s: string) {
  return { content: [{ type: "text" as const, text: s }], isError: true };
}

type ApiResult = { ok: boolean; status: number; json: any; raw: string };
type FetchInit = { method?: string; headers?: Record<string, string>; body?: string };

async function apiFetch(path: string, init: FetchInit = {}): Promise<ApiResult> {
  const headers: Record<string, string> = { Accept: "application/json", ...(init.headers || {}) };
  if (API_KEY) headers["Authorization"] = `Bearer ${API_KEY}`;
  const res = await fetch(`${API_BASE}${path}`, { method: init.method || "GET", headers, body: init.body });
  const raw = await res.text();
  let json: any = null;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json, raw };
}

// Build a user-facing detail string without forwarding raw upstream bodies
// verbatim: prefer a structured message, never echo 5xx bodies, and cap length.
function detail(r: ApiResult): string {
  const msg = r.json?.message || r.json?.error;
  if (msg) return String(msg).slice(0, 300);
  if (r.status >= 500) return "";
  return (r.raw || "").replace(/\s+/g, " ").trim().slice(0, 200);
}

function requireKey(): string | null {
  return API_KEY ? null : NO_KEY_HINT;
}

const server = new McpServer({
  name: "formatix",
  version: "0.1.0",
});

// List the document types available to the account.
server.tool(
  "list_document_types",
  "List the branded talent documents Formatix can generate — assessment reports (Hogan, psychometric, CEO & leadership), progression reports, candidate profiles, shortlists, client submittals, proposals and RPO reports — each with its available output formats (DOCX, PPTX, PDF, XLSX). Call this first to choose a template_id for `generate_document`.",
  {},
  async () => {
    const hint = requireKey();
    if (hint) return text(hint);
    const r = await apiFetch("/api/v1/templates/");
    if (r.status === 401) return text(NO_KEY_HINT);
    if (!r.ok) return errText(`Could not list document types (HTTP ${r.status}). ${detail(r)}`.trim());
    const templates: any[] = r.json?.templates || [];
    if (templates.length === 0) return text("No templates are available on this account yet. Visit " + SIGNUP_URL + " to add or request templates.");
    const lines = templates.map(
      (t) => `- [${t.id}] ${t.name}  (type: ${t.type}, category: ${t.category}, formats: ${(t.formats || []).join(", ") || "docx"})`
    );
    return text(
      `Formatix can generate the following document types.\nUse the bracketed id as \`template_id\` and the listed \`type\` as \`template_type\` in \`generate_document\`.\n\n${lines.join("\n")}`
    );
  }
);

// Generate a branded document from candidate text.
server.tool(
  "generate_document",
  "Generate a branded, personalized talent document from candidate text. Works for any document type returned by `list_document_types` — assessment reports, executive profiles, shortlists, proposals, etc. Returns a record_id; poll `check_status` until the document is ready to download.",
  {
    source_text: z.string().describe("The candidate's CV text, profile, or source content to format. Plain text."),
    template_id: z.union([z.string(), z.number()]).describe("Template id from `list_document_types`."),
    template_type: z.enum(["cvtobios", "custom"]).describe("The template's type, as shown by `list_document_types`."),
    output_format: z.enum(["docx", "pptx", "xlsx"]).default("docx").describe("Output file format. Default docx."),
    candidate_name: z.string().optional().describe("Candidate display name used in the file/output. Optional."),
  },
  async ({ source_text, template_id, template_type, output_format, candidate_name }) => {
    const hint = requireKey();
    if (hint) return text(hint);
    const r = await apiFetch("/api/v1/format-cv-text/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cv_text: source_text,
        template_id: String(template_id),
        template_type,
        output_format,
        ...(candidate_name ? { candidate_name } : {}),
      }),
    });
    if (r.status === 401) return text(NO_KEY_HINT);
    if (r.status === 402)
      return errText(
        `Out of credits. ${r.json?.message || ""} You have ${r.json?.available ?? "0"} and need ${r.json?.required ?? "1"}. Upgrade: ${r.json?.upgrade_url || SIGNUP_URL}`.trim()
      );
    if (!r.ok) return errText(`Generation failed (HTTP ${r.status}). ${detail(r)}`.trim());
    const id = r.json?.record_id;
    return text(
      `Document queued (record_id: ${id}, status: ${r.json?.status || "processing"}).\nCall \`check_status\` with record_id ${id} until status is "Formatted", then share the download_url with the client.`
    );
  }
);

// Turn a LinkedIn profile into a polished resume / candidate profile.
server.tool(
  "format_from_linkedin",
  "Turn a LinkedIn profile into a polished, branded resume or candidate profile. Paste the visible profile text as `profile_text`. (To capture LinkedIn profiles automatically inside the browser, install the Formatix Chrome extension.) Returns a record_id; poll `check_status`.",
  {
    profile_text: z.string().describe("The text content of the LinkedIn profile (paste what is visible on the page)."),
    template_id: z.union([z.string(), z.number()]).optional().describe("Optional template id from `list_document_types`. If omitted, call `list_document_types` first to choose a profile/resume template."),
    template_type: z.enum(["cvtobios", "custom"]).optional().describe("The template's type. Required if template_id is supplied."),
    output_format: z.enum(["docx", "pptx", "xlsx"]).default("docx").describe("Output file format. Default docx."),
    candidate_name: z.string().optional().describe("Candidate display name. Optional."),
  },
  async ({ profile_text, template_id, template_type, output_format, candidate_name }) => {
    const hint = requireKey();
    if (hint) return text(hint);
    if (!template_id || !template_type) {
      return text(
        "Choose a profile/resume template first: call `list_document_types`, pick a template, then call this tool again with its `template_id` and `template_type`."
      );
    }
    const r = await apiFetch("/api/v1/format-cv-text/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cv_text: profile_text,
        template_id: String(template_id),
        template_type,
        output_format,
        ...(candidate_name ? { candidate_name } : {}),
      }),
    });
    if (r.status === 401) return text(NO_KEY_HINT);
    if (!r.ok) return errText(`Could not format the LinkedIn profile (HTTP ${r.status}). ${detail(r)}`.trim());
    const id = r.json?.record_id;
    return text(`Profile queued (record_id: ${id}). Poll \`check_status\` with record_id ${id} until ready.`);
  }
);

// Poll a generation job and return its download link when ready.
server.tool(
  "check_status",
  "Check whether a generated document is ready and get its download link. Status is 'Processing' (keep polling), 'Formatted' (ready — share the download_url with the client), or 'Failed - <reason>'.",
  {
    record_id: z.union([z.string(), z.number()]).describe("The record_id returned by `generate_document` or `format_from_linkedin`."),
  },
  async ({ record_id }) => {
    const hint = requireKey();
    if (hint) return text(hint);
    const r = await apiFetch(`/api/v1/format-cv/${encodeURIComponent(String(record_id))}/`);
    if (r.status === 401) return text(NO_KEY_HINT);
    if (r.status === 404) return errText(`No document found for record_id ${record_id}.`);
    if (!r.ok) return errText(`Could not check status (HTTP ${r.status}). ${detail(r)}`.trim());
    const status = r.json?.status || "unknown";
    if (r.json?.download_url) {
      return text(`Status: ${status}\nReady to download: ${r.json.download_url}\nShare this link with the client.`);
    }
    return text(`Status: ${status}. Keep polling \`check_status\` until it reads "Formatted".`);
  }
);

// Issue a free API key for company-email users.
server.tool(
  "claim_access",
  "Get FREE Formatix access using your COMPANY email. Personal inboxes (gmail, outlook, yahoo, proton, etc.) are not eligible. Returns a free API key — treat it as a secret: store it as FORMATIX_API_KEY in your MCP config rather than leaving it in chat history.",
  {
    company_email: z.string().email().describe("Your work/company email address. Personal inboxes are rejected."),
  },
  async ({ company_email }) => {
    const r = await apiFetch("/api/v1/claim/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: company_email }),
    });
    if (r.status === 404)
      return text(
        `Free self-serve access isn't enabled on this endpoint yet. Sign up (company email) at ${SIGNUP_URL} and create an API key in Settings, then set FORMATIX_API_KEY.`
      );
    if (r.status === 422 || r.status === 400)
      return text(
        `That email wasn't accepted${r.json?.message ? `: ${r.json.message}` : " — please use your company email (personal inboxes are not eligible)."}`
      );
    if (r.status === 429)
      return text("Too many requests right now — please wait a minute and try again.");
    if (!r.ok) return errText(`Could not claim access (HTTP ${r.status}). ${detail(r)}`.trim());
    const key = r.json?.api_key || r.json?.key;
    if (key)
      return text(
        `Free access granted. Store this as FORMATIX_API_KEY in your MCP config (keep it secret):\n\n${key}\n\nThen call \`list_document_types\` to begin. ${r.json?.message || ""}`.trim()
      );
    return text(`Request received. ${r.json?.message || "Check your inbox to activate your free Formatix access."}`);
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // eslint-disable-next-line no-console
  console.error(`Formatix MCP server running (api: ${API_BASE}, key: ${API_KEY ? "set" : "not set"})`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Fatal error starting Formatix MCP server:", err);
  process.exit(1);
});
