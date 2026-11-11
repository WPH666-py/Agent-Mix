#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { workflows } from '../workflows/index.js'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const target = join(root, 'cordis.patch.yml')

class Raw {
  constructor(text) {
    this.text = text
  }
}

const IS_WINDOWS = new Raw("process.platform === 'win32'")
const IS_NOT_WINDOWS = new Raw("process.platform !== 'win32'")

const PLAN_SECTION = [
  'You are in plan mode. Stay in plan mode until the user approves your plan through exit_plan_mode or switches the session mode. Imperative language to implement changes means plan the implementation, not execute it. A conversational agreement approves nothing and does not end plan mode; fold the confirmed decision into the plan and submit it through exit_plan_mode.',
  '',
  'Explore first. Use non-mutating reads, searches, static analysis, and checks to ground the plan in the actual repository. Do not edit or write files, change configuration, run formatters or code generation that rewrites tracked files, commit, or otherwise carry out the plan. Prefer existing functions and patterns over new machinery.',
  '',
  'The tool catalog stays the same across modes for request-cache stability. These plan-mode rules override any later tool description or guidance that suggests using mutation tools; those tools remain listed to keep the tool catalog unchanged. Do not use todo_write to track this planning phase: it tracks implementation after an approved plan, while the plan itself belongs in exit_plan_mode.',
  '',
  'Resolve discoverable facts by inspection. Use ask_user_question only for user-owned choices or material ambiguity that inspection cannot answer. Do not ask the user where code lives or how current behavior works when you can find out.',
  '',
  'Make the plan decision-complete: state the goal and success criteria; group implementation changes by subsystem; identify public API, schema, and data-flow changes; cover edge cases, failure modes, tests, acceptance criteria, and explicit assumptions. Keep it concise enough to review but detailed enough that another engineer can implement it without making design decisions.',
  '',
  'When ready, call exit_plan_mode with the complete plan markdown, starting with a # title. Make exit_plan_mode the only and final tool call in that assistant response: it presents the plan for approval, and implementation begins only in a later step after approval. Do not paste the final plan as a plain reply or ask "should I proceed?" through prose or ask_user_question. If review rejects it, incorporate the feedback and present again. If the review channel is unavailable or aborted, stay in plan mode and ask the user to switch modes manually; do not proceed with implementation.',
].join('\n')

const PATCH = [
  {
    insert: [
      {
        id: 'agent-mix',
        name: 'agent-mix',
      },
      ...workflows.map((workflow, index) => presetRow(workflow, index)),
    ],
  },
]

function presetRow(workflow, index) {
  return {
    id: `preset-agent-mix-${workflow.id}`,
    name: '@deepseek-ai/dsh-agent-preset',
    config: {
      id: `agent-mix-${workflow.id}`,
      order: 100 + index,
      name: `Agent-Mix · ${workflow.name}`,
      description: workflow.description,
      plugins: presetPlugins(workflow),
    },
  }
}

function presetPlugins(workflow) {
  return [
    {
      id: 'am-workflow',
      name: 'agent-mix/workflow',
      config: { workflow: workflow.id },
    },
    {
      id: 'am-agent-instructions',
      name: '@deepseek-ai/dsh-agent-instructions',
      config: { maxBytes: 65536 },
    },
    {
      id: 'am-time-context',
      name: '@deepseek-ai/dsh-time-context',
    },
    {
      id: 'am-tool-bash',
      name: '@deepseek-ai/dsh-tool-bash',
      disabled: IS_WINDOWS,
    },
    {
      id: 'am-tool-pwsh',
      name: '@deepseek-ai/dsh-tool-pwsh',
      disabled: IS_NOT_WINDOWS,
    },
    {
      id: 'am-tool-fs',
      name: '@deepseek-ai/dsh-tool-fs',
      config: { applyPatch: true },
    },
    {
      id: 'am-tool-fs-search',
      name: '@deepseek-ai/dsh-tool-fs-search',
      config: { sampleOverCapGlobResults: false },
    },
    {
      id: 'am-tool-jobs',
      name: '@deepseek-ai/dsh-tool-jobs',
    },
    {
      id: 'am-tool-schedule',
      name: '@deepseek-ai/dsh-tool-schedule',
    },
    {
      id: 'am-skill-filesystem',
      name: '@deepseek-ai/dsh-skill-filesystem',
    },
    {
      id: 'am-tool-skill',
      name: '@deepseek-ai/dsh-tool-skill',
    },
    {
      id: 'am-command-goal',
      name: '@deepseek-ai/dsh-command-goal',
    },
    {
      id: 'am-tool-goal',
      name: '@deepseek-ai/dsh-tool-goal',
    },
    {
      id: 'am-planning',
      name: 'cordis:group',
      group: true,
      isolate: { planMode: true },
      config: [
        {
          id: 'am-plan-mode',
          name: '@deepseek-ai/dsh-plan-mode',
          config: { section: PLAN_SECTION },
        },
      ],
    },
    {
      id: 'am-compaction',
      name: 'cordis:group',
      group: true,
      isolate: { compaction: true, toolResultPruner: true },
      config: [
        {
          id: 'am-compaction-basic',
          name: '@deepseek-ai/dsh-compaction-basic',
        },
        {
          id: 'am-command-compact',
          name: '@deepseek-ai/dsh-command-compact',
        },
        {
          id: 'am-tool-result-pruner',
          name: '@deepseek-ai/dsh-compaction-tool-result-pruner',
          config: { thresholdChars: 8192, headChars: 4096, tailChars: 1024 },
        },
      ],
    },
    {
      id: 'am-delegation',
      name: 'cordis:group',
      group: true,
      isolate: { workflowEngine: true },
      config: [
        {
          id: 'am-tool-subagent-control',
          name: '@deepseek-ai/dsh-tool-subagent-control',
        },
        {
          id: 'am-tool-subagent',
          name: '@deepseek-ai/dsh-tool-subagent',
          config: {
            provider: 'spawn',
            toolName: 'subagent',
            modelSelection: true,
            modelDiscovery: true,
          },
        },
        {
          id: 'am-tool-subagent-fork',
          name: '@deepseek-ai/dsh-tool-subagent',
          config: { provider: 'fork', toolName: 'subagent_fork' },
        },
        {
          id: 'am-workflow-ptc',
          name: '@deepseek-ai/dsh-workflow-ptc',
          config: { provider: 'spawn' },
        },
        {
          id: 'am-tool-workflow',
          name: '@deepseek-ai/dsh-tool-workflow',
        },
      ],
    },
    {
      id: 'am-tool-ask-user',
      name: '@deepseek-ai/dsh-tool-ask-user',
    },
    {
      id: 'am-tool-todo',
      name: '@deepseek-ai/dsh-tool-todo',
      config: { allowParallelInProgress: true },
    },
    {
      id: 'am-tool-web',
      name: '@deepseek-ai/dsh-tool-web',
      config: { fetch: true, searchTimeoutMs: 60000 },
    },
    {
      id: 'am-present',
      name: '@deepseek-ai/dsh-tool-present',
    },
  ]
}

function scalar(value) {
  if (value instanceof Raw) return `!!js ${value.text}`
  if (value === null) return 'null'
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  throw new Error(`Unsupported YAML scalar: ${String(value)}`)
}

function isScalar(value) {
  return value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

function emit(value, indent) {
  const pad = ' '.repeat(indent)
  if (value instanceof Raw) return `${pad}!!js ${value.text}`
  if (Array.isArray(value)) {
    if (value.length === 0) return `${pad}[]`
    return value.map((item) => emitArrayItem(item, indent)).join('\n')
  }
  if (typeof value === 'object' && value !== null) {
    if (Object.keys(value).length === 0) return `${pad}{}`
    return Object.entries(value)
      .map(([key, child]) => emitKeyValue(key, child, indent, false))
      .join('\n')
  }
  return pad + scalar(value)
}

function emitArrayItem(item, indent) {
  const pad = ' '.repeat(indent)
  if (isScalar(item) || item instanceof Raw) return `${pad}- ${scalar(item)}`
  if (Array.isArray(item)) {
    return `${pad}-\n${emit(item, indent + 2)}`
  }
  const entries = Object.entries(item)
  if (entries.length === 0) return `${pad}- {}`
  return entries
    .map(([key, child], index) => emitKeyValue(key, child, index === 0 ? indent : indent + 2, index === 0))
    .join('\n')
}

function emitKeyValue(key, value, indent, firstInArrayItem) {
  const pad = ' '.repeat(indent)
  const prefix = firstInArrayItem ? `${pad}- ${key}:` : `${pad}${key}:`
  if (isScalar(value) || value instanceof Raw) return `${prefix} ${scalar(value)}`
  if (Array.isArray(value) && value.length === 0) return `${prefix} []`
  if (typeof value === 'object' && value !== null && Object.keys(value).length === 0) return `${prefix} {}`
  return `${prefix}\n${emit(value, indent + 2)}`
}

const text = `${emit(PATCH, 0)}\n`

if (process.argv.includes('--check')) {
  if (!existsSync(target)) {
    console.error('cordis.patch.yml is missing; run npm run generate')
    process.exit(1)
  }
  const current = readFileSync(target, 'utf8')
  if (current !== text) {
    console.error('cordis.patch.yml is out of date; run npm run generate')
    process.exit(1)
  }
  console.log(`cordis.patch.yml is current (${workflows.length} presets)`)
} else {
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, text, 'utf8')
  console.log(`Wrote ${target} (${workflows.length} presets)`)
}
