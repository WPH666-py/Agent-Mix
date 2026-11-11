import test from 'node:test'
import assert from 'node:assert/strict'
import { createEngineTool } from '../engine.js'
import { getWorkflow } from '../workflows/index.js'

const signal = new AbortController().signal
const agent = { id: 'test-agent' }

function fakeContext(resolve) {
  return {
    subprocess: {
      resolveExecutable: async (command) => resolve(command),
    },
    workingDirectory: {
      ensure: async () => process.cwd(),
    },
  }
}

test('the native workflow reports that no external engine is configured', async () => {
  const tool = createEngineTool(fakeContext(() => {
    throw new Error('should not resolve for a native workflow')
  }), getWorkflow('harness-superagent'))

  const status = await tool.execute({ action: 'status' }, { signal, agent })
  assert.equal(status.kind, 'native')
  assert.equal(status.available, false)
  assert.equal(status.workflow, 'harness-superagent')

  const run = await tool.execute({ action: 'run', task: 'do work' }, { signal, agent })
  assert.equal(run.kind, 'native')
  assert.match(run.message, /No external engine/)
})

test('a CLI status resolves the first available candidate without spawning', async () => {
  const tool = createEngineTool(fakeContext((command) => {
    if (command === 'traecli') return 'C:\\Tools\\trae-cli.cmd'
    throw new Error('not installed')
  }), getWorkflow('trae'))

  const status = await tool.execute({ action: 'status' }, { signal, agent })
  assert.equal(status.kind, 'cli')
  assert.equal(status.available, true)
  assert.equal(status.engine, 'Trae CLI (Rust)')
  assert.match(status.command, /trae-cli\.cmd/)
  assert.match(status.command, /exec/)
  assert.match(status.message, /available at/)
})

test('a missing CLI reports the install hint and stays non-fatal', async () => {
  const tool = createEngineTool(fakeContext(() => {
    throw new Error('not found')
  }), getWorkflow('codex'))

  const status = await tool.execute({ action: 'status' }, { signal, agent })
  assert.equal(status.kind, 'cli')
  assert.equal(status.available, false)
  assert.match(status.message, /not available/)
  assert.match(status.install, /@openai\/codex/)
})

test('the tool schema uses standard JSON Schema required arrays', () => {
  const tool = createEngineTool(fakeContext(() => 'x'), getWorkflow('codex'))
  assert.deepEqual(tool.parameters.required, ['action'])
  assert.ok(Array.isArray(tool.output.schema.required))
  assert.ok(tool.output.schema.required.includes('workflow'))
  assert.equal(tool.output.schema.properties.workflow.required, undefined)
})
