# Prompt Engineering — Patterns from System Prompt Leaks

## Sources Read
- Cursor (`cursor.md`) — IDE coding agent
- Claude Code (`claude-code-opus-4.6.md`) — CLI coding agent
- VS Code GitHub Copilot (`vscode-copilot-agent.md`) — IDE agent
- OpenAI GPT-5.5 Thinking (`gpt-5.5-thinking.md`) — general assistant
- Google Gemini 3.5 Flash (`gemini-3.5-flash.md`) — web assistant
- OpenCode (`opencode.md`) — CLI coding agent

---

## Universal Patterns (All Models)

### 1. Role Definition
Every prompt starts with a crisp identity statement:
```
You are {name}, {purpose}.
```
Examples: "You are Claude Code, Anthropic's official CLI for Claude." / "You are an AI coding assistant, powered by {model_name}."

### 2. Tone & Style Rules
- **No emojis** unless the user explicitly requests them (Cursor, Claude Code, OpenCode)
- **Concise output** — 100 words or less for routine responses (Copilot), no chit-chat (OpenCode)
- **No thinking in code or comments** — comments explain WHY, not WHAT (Cursor, Claude Code)
- **No colons before tool calls** — just make the call (Cursor, Claude Code)

### 3. Tool Calling Conventions
- **Prefer dedicated tools** over Bash for file ops (Read, Write, Edit) (ALL models)
- **Parallel independent calls** — batch reads/greps in one turn (ALL models)
- **Dedicated read before edit** — must read a file before editing (Cursor, Claude Code, OpenCode)

### 4. Code Change Rules
- **Prefer editing existing files** over creating new ones (Cursor, Claude Code, OpenCode)
- **No redundant comments** — never explain WHAT, only non-obvious WHY (ALL models)
- **No backwards-compatibility hacks** — delete unused code completely (Claude Code)
- **No premature abstractions** — three similar lines > one abstraction (Claude Code)
- **Security by default** — no OWASP top 10 vulnerabilities, no secrets (ALL)

### 5. Verification
- Run lint/typecheck/test after changes (Cursor, Claude Code, OpenCode, Copilot)
- Test UI in browser before claiming completion (Claude Code)

### 6. Delegation (Sub-agents)
- **Sub-agents need complete context** — they haven't seen the conversation (Claude Code)
- Terse command-style prompts produce shallow work; brief like a smart colleague (Claude Code)
- Use for parallelizable research or tasks that protect main context (All coding agents)

---

## Model-Specific Patterns

### Claude Code (Opus 4.6) — Most Sophisticated
```
- Skills system: trigger-based (e.g., "when code imports `anthropic`")
- Memory: 4 types (user, feedback, project, reference) with frontmatter format
- Workflow orchestration: pipeline() > parallel() (avoid barriers)
- Deferred tools via ToolSearch (schemas loaded on demand)
- Plan mode for design before implementation
```

### Cursor — Cleanest Structure
```
- Sections: tone → tool calling → code changes → citing code → mode selection
- Two code reference methods: existing code = startLine:endLine:path, new code = markdown blocks
- Mode switching: Plan / Agent / Debug / Ask
- MCP FileSystem integration
```

### VS Code Copilot — Most Concise
```
- "100 words or less" for routine responses
- Parallel tool calling is CRITICAL — minimize round trips
- Report intent on first turn via report_intent tool
- Use plan.md for planning (not markdown files in repo)
- SQL tool for todo tracking
- Ecosystem tools over manual changes (npm init, pip install, linters)
```

### OpenAI GPT-5.5 Thinking — Most Feature-Rich
```
- Writing blocks for emails/chat/social posts (:::writing{...}:::)
- Canvas (canmore) for code/docs that user iterates on
- Web search as DEFAULT for anything post-cutoff
- Memory (bio tool) for cross-conversation persistence
- Very detailed tool schemas with namespaces
- Oververbosity scale (1-10) to control response length
```

### Google Gemini 3.5 Flash — Most Conversational
```
- "Warm, curious, witty, energetic, familiar"
- LMDX UI components: Image, Carousel, Sequence, Timeline
- Variety principle: don't repeat same format mechanically
- Image strategy: gate on relevance, curate, analyze don't just label
- Mirror user vocabulary level
```

### OpenCode — My Prompt
```
- New Applications workflow: Understand → Propose Plan → User Approval → Implement → Verify → Feedback
- Path construction: always absolute paths from project root
- Concise: <3 lines of text per response unless needed
- Self-verification loop via tests
```

---

## How to Write a Perfect Prompt for Gemini (Our Use Case)

Based on the patterns above, here's the template for prompting the Gemini API in our Chat → Preview prototype:

```
You are a senior frontend developer expert in modern HTML/CSS/JS.

Rules:
- Return ONLY valid HTML code wrapped in ```html ... ``` blocks
- Use modern CSS (flexbox, grid, custom properties, clamp)
- Use system font stack (Inter or native)
- Make responsive, accessible, visually polished
- Include GSAP from CDN (https://cdn.jsdelivr.net/npm/gsap@3.12/dist/gsap.min.js) if animations are needed
- Respect prefers-reduced-motion in all animations
- Never include markdown outside the code block
- Never explain the code — just return it
- Use dark mode by default unless user requests otherwise
- Use 2-3 color palette, generous whitespace, consistent rhythm
- No comments in code — let well-named identifiers speak
```

### Key Prompt Engineering Techniques Observed

| Technique | Source | Example |
|---|---|---|
| **Negative constraints** | All models | "Never explain. Just return the code." |
| **Format lock** | Claude Code, Cursor | "Return ONLY code in ```html ... ```" |
| **Explicit rules over suggestions** | Claude Code | "Default to writing no comments" (not "try to") |
| **Show don't tell** | OpenAI, Claude Code | Let compliance speak — don't say "I will be concise", just be concise |
| **Role + Context + Rules + Format** | All | Four-part structure: identity → situation → constraints → output format |
| **Reduced-motion defaults** | Claude Code, our spec | "Respect prefers-reduced-motion in all animations" |
| **No thinking aloud** | Cursor, Claude Code | Never use code comments or shell comments as scratchpad |
| **Cap boundaries** | Claude Code | "Don't add error handling for scenarios that can't happen" |
