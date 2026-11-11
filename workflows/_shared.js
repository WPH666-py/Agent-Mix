/**
 * Shared vocabulary for Agent-Mix workflow packs.
 *
 * A workflow pack is deliberately small and data-only: one identity, one
 * operating protocol, and one optional external-engine manifest. The Host
 * plugin turns it into a scoped persona section and a delegation tool at
 * preset-activation time.
 */

export const COMMON_CONTRACT = `
## Agent-Mix execution contract

These rules apply to every Agent-Mix workflow. A workflow-specific rule wins
only where it is stricter than this contract.

1. **Ground every claim in the workspace.** Read the relevant files, run the
   relevant checks, and distinguish observed facts from assumptions. Never
   invent a file, command result, test outcome, or upstream capability.
2. **Inspect before editing.** Match the repository's existing structure,
   naming, error handling, and test style. Prefer a focused change in the
   right place over a broad rewrite.
3. **Keep the user's work.** Do not revert, reformat, or delete changes you did
   not make unless the task explicitly requires it. Do not run destructive
   commands against data outside the workspace.
4. **Use the smallest capable tool.** Use read/search/edit for precise file
   work, shell only for commands and processes, and delegation only when the
   task is large or independent enough to justify another agent.
5. **Plan multi-step work visibly.** For work that spans several files or
   verification stages, maintain a short todo list and keep it current. Do not
   turn a small fix into ceremony.
6. **Verify before declaring completion.** Run the narrowest meaningful tests,
   type checks, linters, builds, or reproductions. If a check cannot run,
   state exactly why and what remains unverified.
7. **Respect the permission boundary.** If an operation needs authority the
   session does not have, stop and explain the exact operation and reason.
   Never route around a denial through a different tool or an external engine.
8. **External engines are optional accelerators.** If this workflow provides
   \`agent_mix_engine\`, using it runs another coding agent unattended in the
   same workspace. It is a separate process outside DSH's tool-approval and
   sandbox pipeline; never use it to bypass a denial. Inspect its diff and
   verify its claims yourself; its output is evidence to review, not ground
   truth. If the engine is missing, continue with the native tools rather than
   blocking the task.
9. **Ask only user-owned questions.** Use \`ask_user_question\` for product
   choices, credentials, or genuinely ambiguous requirements that inspection
   cannot resolve. Do not ask where code lives or how it currently behaves.
10. **Communicate at the end, not at every step.** Lead with the result, name
    the files changed, name the checks run, and surface remaining risks. Keep
    intermediate narration short.
`.trim()

const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/

/**
 * Normalize one workflow declaration.
 * @param {object} definition
 * @returns {object}
 */
export function defineWorkflow(definition) {
  const {
    id,
    name,
    shortName = name,
    tagline,
    description,
    repo,
    docs,
    language,
    license,
    sourceKind = 'source',
    rust = false,
    prompt,
    engine,
  } = definition

  if (!ID_PATTERN.test(id ?? '')) {
    throw new Error(`Agent-Mix workflow id must match ${ID_PATTERN}: ${String(id)}`)
  }
  if (!name || !tagline || !description) {
    throw new Error(`Agent-Mix workflow ${id} is missing name, tagline, or description`)
  }
  if (!prompt || prompt.trim().length < 80) {
    throw new Error(`Agent-Mix workflow ${id} needs a substantive prompt`)
  }

  const normalizedEngine = normalizeEngine(id, engine)

  return Object.freeze({
    id,
    name,
    shortName,
    tagline,
    description,
    repo,
    docs,
    language,
    license,
    sourceKind,
    rust,
    engine: normalizedEngine,
    prompt: `${prompt.trim()}\n\n${COMMON_CONTRACT}\n`,
  })
}

function normalizeEngine(workflowId, engine) {
  if (engine === undefined || engine === null) {
    return Object.freeze({
      kind: 'native',
      name: 'DeepSeek Harness native tools',
      install: null,
      docs: null,
      note: 'No external engine; this mode runs entirely on the native Harness tool loop.',
    })
  }

  if (engine.kind !== 'cli') {
    throw new Error(`Agent-Mix workflow ${workflowId} has unsupported engine kind ${String(engine.kind)}`)
  }
  if (!Array.isArray(engine.commands) || engine.commands.length === 0) {
    throw new Error(`Agent-Mix workflow ${workflowId} needs at least one engine command`)
  }
  if (!Array.isArray(engine.args)) {
    throw new Error(`Agent-Mix workflow ${workflowId} needs an args array`)
  }
  const promptMode = engine.prompt ?? 'stdin'
  if (promptMode !== 'stdin' && promptMode !== 'arg') {
    throw new Error(`Agent-Mix workflow ${workflowId} prompt mode must be stdin or arg`)
  }
  const timeoutSec = engine.timeoutSec ?? 1800
  if (!Number.isFinite(timeoutSec) || timeoutSec < 30 || timeoutSec > 7200) {
    throw new Error(`Agent-Mix workflow ${workflowId} timeoutSec must be 30..7200`)
  }

  return Object.freeze({
    kind: 'cli',
    name: engine.name ?? engine.commands[0],
    commands: Object.freeze([...engine.commands]),
    args: Object.freeze([...engine.args]),
    prompt: promptMode,
    timeoutSec,
    install: engine.install ?? null,
    docs: engine.docs ?? null,
    note: engine.note ?? '',
  })
}
