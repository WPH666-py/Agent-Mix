import { createEngineTool } from './engine.js'
import { getWorkflow } from './workflows/index.js'

/** Stable Loader identity for the per-preset workflow row. */
export const name = 'agent-mix-workflow'

/** Host services used by the workflow pack. */
export const inject = ['systemPrompt', 'tools', 'subprocess', 'workingDirectory']

/**
 * Mount one Agent-Mix workflow pack in the preset's scope.
 *
 * The pack owns the agent's identity section and the optional external-engine
 * tool. Everything else — filesystem, shell, subagents, plan mode, compaction,
 * skills — comes from the surrounding preset composition, so a workflow pack
 * stays small and auditable.
 *
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {{ workflow?: string }} config
 */
export function apply(ctx, config) {
  if (typeof config?.workflow !== 'string' || config.workflow.length === 0) {
    throw new Error('agent-mix/workflow requires a non-empty `workflow` config field')
  }

  const workflow = getWorkflow(config.workflow)

  ctx.effect(
    () =>
      ctx.systemPrompt.section({
        name: 'deployment:persona-prefix',
        order: ctx.systemPrompt.getSectionOrder('DEPLOYMENT_PERSONA_PREFIX'),
        text: workflow.prompt,
        interpolate: false,
      }),
    `agent-mix.persona(${workflow.id})`,
  )

  ctx.effect(
    () => ctx.tools.register(createEngineTool(ctx, workflow)),
    `agent-mix.engine(${workflow.id})`,
  )
}
