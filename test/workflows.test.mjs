import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { workflows, workflowIds, getWorkflow } from '../workflows/index.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

test('there are exactly the twelve requested workflows, with unique ids', () => {
  assert.equal(workflows.length, 12)
  assert.equal(new Set(workflowIds).size, 12)
  assert.deepEqual(workflowIds, [
    'harness-superagent',
    'claude-code',
    'codex',
    'zcode',
    'qoder',
    'trae',
    'kimi-code',
    'workbuddy',
    'hermes',
    'opencode',
    'cursor',
    'kilo-code',
  ])
})

test('every workflow has metadata and a substantive prompt', () => {
  for (const workflow of workflows) {
    assert.match(workflow.id, /^[a-z0-9][a-z0-9-]*$/)
    assert.ok(workflow.name.length > 0)
    assert.ok(workflow.tagline.length > 0)
    assert.ok(workflow.description.length > 0)
    assert.match(workflow.repo, /^https:\/\//)
    assert.match(workflow.docs, /^https:\/\//)
    assert.ok(workflow.prompt.length > 1200, `${workflow.id} prompt is too short`)
    assert.match(workflow.prompt, /Agent-Mix execution contract/)
  }
})

test('external engine manifests are complete and safe to spawn', () => {
  for (const workflow of workflows) {
    if (workflow.engine.kind === 'native') continue
    assert.equal(workflow.engine.kind, 'cli')
    assert.ok(workflow.engine.commands.length > 0)
    assert.ok(workflow.engine.args.length > 0)
    assert.ok(['stdin', 'arg'].includes(workflow.engine.prompt))
    assert.ok(workflow.engine.timeoutSec >= 30)
    assert.ok(workflow.engine.install.length > 0)
    if (workflow.engine.prompt === 'arg') {
      assert.ok(
        workflow.engine.args.some((arg) => arg.includes('{prompt}')),
        `${workflow.id} uses arg prompt mode without a {prompt} placeholder`,
      )
    }
  }
})

test('the Rust-first workflows actually use a Rust engine', () => {
  for (const id of ['codex', 'trae', 'hermes']) {
    assert.equal(getWorkflow(id).rust, true, `${id} should be marked Rust-backed`)
  }
  assert.equal(getWorkflow('codex').language, 'Rust')
  assert.equal(getWorkflow('trae').language, 'Rust')
  assert.match(getWorkflow('hermes').language, /Rust/)
})

test('the generated patch contains one preset per workflow and the workflow row', () => {
  const patch = readFileSync(join(root, 'cordis.patch.yml'), 'utf8')
  assert.match(patch, /id: "agent-mix"/)
  for (const workflow of workflows) {
    assert.match(patch, new RegExp(`id: "preset-agent-mix-${workflow.id}"`))
    assert.match(patch, new RegExp(`workflow: "${workflow.id}"`))
  }
  assert.equal((patch.match(/name: "agent-mix\/workflow"/g) ?? []).length, 12)
})

test('the workflow root does not register a duplicate persona', () => {
  const source = readFileSync(join(root, 'workflow.js'), 'utf8')
  assert.match(source, /deployment:persona-prefix/)
  assert.doesNotMatch(source, /@deepseek-ai\/dsh-persona/)
})
