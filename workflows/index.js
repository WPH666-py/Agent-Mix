import harnessSuperagent from './harness-superagent.js'
import claudeCode from './claude-code.js'
import codex from './codex.js'
import zcode from './zcode.js'
import qoder from './qoder.js'
import trae from './trae.js'
import kimiCode from './kimi-code.js'
import workbuddy from './workbuddy.js'
import hermes from './hermes.js'
import opencode from './opencode.js'
import cursor from './cursor.js'
import kiloCode from './kilo-code.js'

const list = [
  harnessSuperagent,
  claudeCode,
  codex,
  zcode,
  qoder,
  trae,
  kimiCode,
  workbuddy,
  hermes,
  opencode,
  cursor,
  kiloCode,
]

const byId = new Map()
for (const workflow of list) {
  if (byId.has(workflow.id)) throw new Error(`Duplicate Agent-Mix workflow id: ${workflow.id}`)
  byId.set(workflow.id, workflow)
}

/** Ordered workflow packs, in the order their modes should appear. */
export const workflows = Object.freeze(list)

/** Look up one workflow pack by id. */
export function getWorkflow(id) {
  const workflow = byId.get(id)
  if (workflow === undefined) {
    throw new Error(
      `Unknown Agent-Mix workflow ${JSON.stringify(id)}. Known workflows: ${[...byId.keys()].join(', ')}`,
    )
  }
  return workflow
}

/** All known workflow ids, for diagnostics and tests. */
export const workflowIds = Object.freeze([...byId.keys()])
