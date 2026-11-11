# Agent-Mix

**Twelve coding-agent workflows, one installable DeepSeek Harness bundle.**

Agent-Mix turns the working styles of Harness SuperAgent, Claude Code, Codex,
ZCode, Qoder, Trae, Kimi Code, WorkBuddy, Hermes, OpenCode, Cursor, and Kilo
Code into selectable DSH modes. Pick a mode before a session starts; that mode
mounts its own workflow pack, prompt, tool composition, and optional external
engine. There is no separate runtime service to operate.

The repository is the plugin. There is no build step and no runtime dependency:
a single Git URL is enough.

## Install with one link

Paste the repository URL into **Plugins → Add plugin** in the DSH Web UI, or use
the CLI:

```sh
# GitHub
dsh plugin add https://github.com/OWNER/Agent-Mix

# Gitee
dsh plugin add https://gitee.com/OWNER/Agent-Mix
```

Replace `OWNER` with the account that hosts your fork. If you use a named
profile, add `--profile <name>` before `add`.

For local development:

```sh
dsh plugin add "link:D:\projects-py\Agent-Mix"
```

After installation, start a **new** session and open the mode picker. The
twelve modes appear as **Agent-Mix · <workflow>**. Existing sessions keep the
mode they already selected; Agent-Mix presets are chosen before the first turn,
not swapped mid-session.

> The exact single-line install depends on where you publish the repo. The
> package is deliberately publish-ready for both GitHub and Gitee: no build,
> no install script, no private registry. See [PUBLISH.md](PUBLISH.md) for the
> upload checklist if you are creating the remote repository.

## Modes

| Mode | Workflow posture | Preferred engine |
|---|---|---|
| Agent-Mix · Harness SuperAgent | Goal-driven, native multi-agent delivery | Native Harness |
| Agent-Mix · Claude Code | Explore, plan, tool-first edits, concise delivery | `claude` CLI or native |
| Agent-Mix · Codex | Minimal patch, sandbox, tight test loop | Rust `codex` CLI |
| Agent-Mix · ZCode | Workbench plan/build, legible trajectory | `zcode` CLI |
| Agent-Mix · Qoder | Spec-led decomposition and review | `qoder` CLI |
| Agent-Mix · Trae | Visible plan, sandboxed execution, self-review | Rust `traecli` |
| Agent-Mix · Kimi Code | Clean context, explore/plan/code separation | `kimi` CLI |
| Agent-Mix · WorkBuddy | Work-order scope, acceptance criteria, handoff | WorkBuddy/CodeBuddy CLI |
| Agent-Mix · Hermes | Learn the repo, reuse lessons, consolidate | Rust `hermes` CLI |
| Agent-Mix · OpenCode | Plan/build split, provider-neutral tooling | `opencode` CLI |
| Agent-Mix · Cursor | Rules-aware, fast precise edit loop | Cursor `agent` CLI |
| Agent-Mix · Kilo Code | Architect / Coder / Debugger role split | `kilo` CLI |

Every mode works without its external CLI. The CLI is an optional accelerator;
when it is missing, Agent-Mix says so and continues on the native Harness tool
loop. No mode silently installs anything.

## What gets mounted

Each preset is a normal `@deepseek-ai/dsh-agent-preset` declaration containing:

- one `agent-mix/workflow` row, which owns:
  - the workflow's scoped `deployment:persona-prefix` prompt;
  - the `agent_mix_engine` tool for optional delegation;
- `@deepseek-ai/dsh-agent-instructions` for `AGENTS.md`/`CLAUDE.md`;
- native file, search, shell, job, web, skill, todo, ask-user, schedule, goal,
  plan, compaction, and subagent tools;
- the workflow engine, compaction, and delegation groups with their own
  isolation realms.

The workflow pack is small and data-only. The host bridge is `workflow.js`; the
engine seam is `engine.js`; the twelve declarations are in `workflows/`. The
`cordis.patch.yml` file is generated from those declarations, so the modes stay
consistent.

### Why one bundle instead of twelve packages?

One link is the installation contract. Twelve separately published packages
would multiply the dependency graph, version skew, and failure modes before a
user sees a single mode. Each workflow is still mounted as its own
`agent-mix/workflow` plugin row with its own config and prompt, and each has a
separate preset composition. If a workflow later needs an independent release
cadence, move its `workflows/<id>.js` into a package that exports the same
`defineWorkflow` shape; the adapter contract does not change.

## Rust first

The user-facing preference is: **use the Rust implementation when one exists,
and say so plainly when it does not.**

| Workflow | Rust engine? | Notes |
|---|---|---|
| Codex | Yes | `@openai/codex` ships the Rust CLI; `codex exec` |
| Trae | Yes | the installed `traecli` is a Rust program |
| Hermes | Yes | `hermes-agent-rs` is the Rust port; the Python original is compatible |
| Harness SuperAgent | No | native DSH/TypeScript loop |
| Claude Code | No | TypeScript CLI; optional external engine |
| ZCode | No | TypeScript CLI |
| Qoder | Unknown (closed) | documented headless CLI |
| Kimi Code | No | TypeScript CLI |
| WorkBuddy | Unknown (closed) | CodeBuddy Code family |
| OpenCode | No | TypeScript CLI |
| Cursor | Unknown (closed) | documented headless CLI |
| Kilo Code | No | TypeScript CLI |

The plugin layer itself is JavaScript because DSH Host plugins are JavaScript.
"Rust first" applies to the external coding engine, not to the DSH adapter. The
adapter never reimplements a Rust engine in JavaScript; it resolves the real
binary and runs it in the session workspace.

## Using an external engine

Every Agent-Mix mode exposes one small tool, `agent_mix_engine`:

- `action: "status"` — resolve the CLI, show the exact command, install hint,
  and docs. This never starts a process.
- `action: "run"` — pass a complete, self-contained task to the CLI in the
  session working directory and return its final output.

The tool does not use a shell, does not interpolate the prompt into a command
line unless the manifest explicitly asks for an argument, and does not retry
with a different engine. Output is bounded (256 KiB stdout, 64 KiB stderr) with
spill files for larger runs. The default timeout is 30 minutes.

External engines edit the **same** workspace. Treat their output as a proposed
change: inspect the diff and run the checks yourself. The prompt tells the
model this explicitly.

### Authentication and permissions

Each engine owns its own login (`claude`, `codex login`, `qoder`, `kimi`, …).
DSH launches child processes with a scrubbed environment, so an API key that
exists only in the current shell may not reach the engine; use the engine's
persisted login or pass credentials through its own configuration.

Headless permission flags differ by engine. The manifests use the conservative
documented mode for each CLI:

- Claude Code: `--permission-mode acceptEdits`
- Codex: `--sandbox workspace-write`
- Qoder: `--permission-mode accept_edits`
- Trae: `--sandbox workspace-write --permission-mode auto`
- Kimi Code: print mode (auto-approves tools; review the diff)
- WorkBuddy/CodeBuddy: `--permission-mode acceptEdits`
- Cursor: `-p --force`
- ZCode: headless `--mode yolo` (upstream's batch example; review the diff)
- OpenCode, Kilo, Hermes: their documented one-shot mode

Do not use Agent-Mix to broaden a permission you would not grant yourself.
The plugin does not route around DSH tool denials.

The external engine is a **separate process outside DSH's tool-approval and
sandbox pipeline**. Its own CLI flags and OS permissions decide what it can
read or write; DSH's tool policy does not constrain it. Run it only when you
would allow that CLI to operate in the workspace, and review its diff before
accepting the result.

## Source map and attribution

Agent-Mix is **not affiliated with or endorsed by** any upstream vendor. The
workflow prompts are original, clean-room operating protocols distilled from
public documentation and, where a repository is open source, publicly visible
behavior. No proprietary source code or system prompt is copied. Open-source
ideas remain subject to their upstream licenses.

| Workflow | Upstream source | Language | License | How this repo uses it |
|---|---|---|---|---|
| Harness SuperAgent | [deepseek-ai/dsh-superagent-prototype](https://github.com/deepseek-ai/dsh-superagent-prototype) | TypeScript | MIT | Reference for goal-driven autonomy; native Harness loop |
| Claude Code | [anthropics/claude-code](https://github.com/anthropics/claude-code) | TypeScript | See upstream | Public docs and CLI behavior; optional `claude` engine |
| Codex | [openai/codex](https://github.com/openai/codex) | Rust | Apache-2.0 | Rust CLI engine and public docs |
| ZCode | [zai-org/ZCode](https://github.com/zai-org/ZCode) | TypeScript | Apache-2.0 | CLI docs; optional `zcode` engine |
| Qoder | [QoderAI/qoder-action](https://github.com/QoderAI/qoder-action), [CLI docs](https://docs.qoder.com/cli/run-in-scripts) | Closed CLI | Proprietary | Public headless docs; optional `qoder` engine |
| Trae | [Trae-AI/TRAE](https://github.com/Trae-AI/TRAE), [CLI docs](https://www.trae.ai/cli) | Rust CLI | Proprietary | Public CLI behavior; optional `traecli` engine |
| Kimi Code | [MoonshotAI/kimi-code](https://github.com/MoonshotAI/kimi-code) | TypeScript | MIT | Public docs; optional `kimi` engine |
| WorkBuddy | [Tencent Cloud docs](https://www.tencentcloud.com/document/product/1316/84420), [CodeBuddy Code](https://www.npmjs.com/package/@tencent-ai/codebuddy-code) | TypeScript | Proprietary | Public docs; optional WorkBuddy/CodeBuddy engine |
| Hermes | [Lumio-Research/hermes-agent-rs](https://github.com/Lumio-Research/hermes-agent-rs), [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) | Rust port | MIT | Rust CLI engine and public docs |
| OpenCode | [anomalyco/opencode](https://github.com/anomalyco/opencode) | TypeScript | MIT | CLI docs; optional `opencode` engine |
| Cursor | [cursor/cursor](https://github.com/cursor/cursor), [headless docs](https://cursor.com/docs/cli/headless) | Closed CLI | Proprietary | Public headless docs; optional `agent` engine |
| Kilo Code | [Kilo-Org/kilocode](https://github.com/Kilo-Org/kilocode) | TypeScript | MIT | Public CLI docs; optional `kilo` engine |

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the attribution notes
and the full list of linked projects. Vendor names and marks belong to their
owners.

## Add or change a workflow

1. Add `workflows/<id>.js` using `defineWorkflow` from `workflows/_shared.js`.
2. Import it in `workflows/index.js` and add it to the ordered list.
3. Run `npm run generate`.
4. Run `npm run check`.
5. Install the bundle again; start a new session to see the new mode.

An engine manifest is optional. A native workflow uses `engine: null`; a CLI
workflow declares `commands`, `args`, `prompt: "stdin" | "arg"`, and an
`install` hint. Keep the command explicit and avoid shell syntax.

## Verify

```sh
npm test          # workflow invariants and generated-patch consistency
npm run check     # generate --check plus tests
```

The generated patch must contain one `preset-agent-mix-<id>` row and one
`agent-mix/workflow` child per workflow. The test suite checks the twelve ids,
prompt size, engine manifests, Rust markers, and patch consistency.

To verify a live install, open **Settings → Plugins → Agent-Mix** and the
composition viewer for each mode. A healthy preset has an active
`agent-mix/workflow` row and no activation diagnostic. Then start a new session
with one mode, ask it to state its workflow, and check that
`agent_mix_engine` with `action: "status"` reports the expected engine (or the
native fallback).

The exact run that produced this repository's evidence is recorded in
[VERIFICATION.md](VERIFICATION.md): twelve healthy Agent-Mix presets in an
isolated DSH profile, ten passing tests, and the expected desktop
restart-required state.

## Limitations

- A DSH session's preset is fixed when the session starts its first turn.
  Switching workflows means starting a new session with a different mode.
- External CLI flags and login flows change. The manifests are best-effort
  defaults; a failed `run` returns the CLI's stderr and never claims success.
- The external engine runs unattended and can edit the workspace. Review every
  diff. The adapter's permission flags are not a substitute for your own
  judgment.
- Large engine output is truncated with a spill file; the tool result says so.
- The modes intentionally include a broad native toolset. If you need a
  narrower composition, edit `workflows/<id>.js` or the generated preset and
  reinstall.

## Uninstall

Disable or remove the **Agent-Mix** bundle in **Plugins**. Its modes disappear
for new sessions; sessions already using a mode keep their recorded preset
until they are archived.

## License

MIT. See [LICENSE](LICENSE).
