# Formatix AI — MCP Server

**The only AI that automates and personalizes _any_ branded talent document — not just CVs.**

Turn a CV, a LinkedIn profile, or structured data into **assessment reports (Hogan, psychometric, CEO & leadership), progression reports, executive profiles, candidate shortlists, client submittals, proposals and RPO reports** — exported as **DOCX, PPTX, PDF or Excel**, perfectly on-brand.

Connect Formatix to **Claude, ChatGPT, Perplexity, Cursor, Claude Code** — or any MCP-compatible AI agent — and let the AI generate the finished, client-ready document for you.

[![npm](https://img.shields.io/npm/v/@formatix-ai/mcp.svg)](https://www.npmjs.com/package/@formatix-ai/mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Trustpilot](https://img.shields.io/badge/Trustpilot-Reviews-00b67a.svg)](https://www.trustpilot.com/review/formatix.ai)
[![GitHub](https://img.shields.io/badge/GitHub-FormatixAI%2Fmcp--server-181717.svg)](https://github.com/FormatixAI/mcp-server)

> Website: **https://formatix.ai** · Reviews: **[Trustpilot](https://www.trustpilot.com/review/formatix.ai)**

---

## Why Formatix is different

Every other "CV formatter" stops at _one CV → one Word document_. Formatix is the only platform that **templatizes and automates the documents nobody else does**, across every format and use case:

| Document type | Examples | Formats |
| --- | --- | --- |
| **Assessment reports** | Hogan reports, psychometric reports, CEO assessment, leadership assessment | DOCX · PPTX · PDF |
| **Progression reports** | Succession & talent-review packs, 9-box, promotion cases | DOCX · PPTX · XLSX |
| **Executive profiles** | One-page bios, branded candidate profiles, blind/anonymized CVs | DOCX · PPTX · PDF |
| **Shortlists & decks** | Multi-candidate shortlist decks, longlists, slate presentations | PPTX |
| **Client deliverables** | Client submittals, proposals, RPO reports, market & comp intelligence | DOCX · PPTX · PDF · XLSX |

Every document is generated from your own branded template — fonts, colours, logos and layout preserved exactly.

## Who uses it

- **Executive search firms** — client-branded profiles, shortlist decks and proposals in minutes.
- **In-house exec & leadership recruiting (TA)** — board-ready candidate slates and assessment summaries.
- **Talent mapping / RPO teams** — market maps, comp benchmarking, RPO reporting.
- **HR / People teams** — succession planning, talent reviews and promotion packs.

## Three ways to use Formatix

1. **Remote MCP** — point ChatGPT, Claude or Perplexity at the hosted Formatix MCP endpoint.
2. **`npx` (this package)** — run locally inside Claude Desktop, Cursor or Claude Code.
3. **Chrome extension** — capture any LinkedIn profile and turn it into a polished resume in one click. → https://formatix.ai

---

## Quick start

### Get a free API key (company email)

Free access requires a **company email** — personal inboxes (gmail, outlook, yahoo, proton…) are not eligible.

- In any connected AI client, just ask it to **"claim free Formatix access with my email <you@yourcompany.com>"** — the `claim_access` tool issues a key instantly, **or**
- Sign up at **https://formatix.ai** and create a key in **Settings → API keys**.

Set the key as `FORMATIX_API_KEY` in the configs below.

### Claude Desktop / Claude Code

`claude_desktop_config.json` (or `.mcp.json` for Claude Code):

```json
{
  "mcpServers": {
    "formatix": {
      "command": "npx",
      "args": ["-y", "@formatix-ai/mcp"],
      "env": {
        "FORMATIX_API_KEY": "fxi_your_key_here"
      }
    }
  }
}
```

### Cursor

`~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "formatix": {
      "command": "npx",
      "args": ["-y", "@formatix-ai/mcp"],
      "env": { "FORMATIX_API_KEY": "fxi_your_key_here" }
    }
  }
}
```

### ChatGPT / Perplexity (remote connector)

Add a custom connector / MCP server pointing at the hosted endpoint:

```
https://platform.formatix.ai/mcp
```

Authenticate with your Formatix account (OAuth) or paste your `fxi_` API key when prompted.

---

## Tools

| Tool | What it does |
| --- | --- |
| `list_document_types` | List every document Formatix can generate (assessment reports, profiles, shortlists, proposals…) with available formats. Call this first. |
| `generate_document` | The hero. Any source text → any branded document in DOCX/PPTX/PDF/XLSX. Returns a `record_id`. |
| `format_from_linkedin` | LinkedIn profile text → polished resume / candidate profile. |
| `check_status` | Poll a `record_id`; returns the download link when the document is ready. |
| `claim_access` | Get a free API key with your company email. |

### Typical agent flow

```
list_document_types()                         → choose a template_id + template_type
generate_document(source_text, template_id,   → returns record_id
                  template_type, output_format)
check_status(record_id)                        → "Formatted" + download_url
→ hand the download_url back to the client
```

---

## Configuration

| Env var | Default | Purpose |
| --- | --- | --- |
| `FORMATIX_API_KEY` | _(none)_ | Your `fxi_` key. Without it, only `claim_access` works. |
| `FORMATIX_API_BASE` | `https://platform.formatix.ai` | Override for testing against another environment. |

## How it works

This package is a **thin client**. All formatting, AI extraction and rendering run on the Formatix platform; this server simply exposes a small, agent-friendly set of tools over the [Model Context Protocol](https://modelcontextprotocol.io). **No credentials are stored in this repo** — you supply your own key.

## Links

- **Website & sign-up:** https://formatix.ai
- **Trustpilot reviews:** https://www.trustpilot.com/review/formatix.ai
- **Issues:** https://github.com/FormatixAI/mcp-server/issues

## License

MIT © Formatix AI Ltd
