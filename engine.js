import { setTimeout as delay } from 'node:timers/promises'

const STDOUT_MAX_BYTES = 256 * 1024
const STDERR_MAX_BYTES = 64 * 1024
const STDOUT_SPILL_BYTES = 4 * 1024 * 1024
const STDERR_SPILL_BYTES = 1024 * 1024
const DEFAULT_TIMEOUT_SECONDS = 1800

/**
 * Build the `agent_mix_engine` tool for one workflow.
 *
 * The tool is intentionally one small, explicit seam: `status` never starts a
 * process, and `run` only starts the CLI named by the workflow manifest. It
 * does not shell-interpret the prompt, install packages, or fall back to a
 * different engine after a failure.
 *
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {object} workflow
 */
export function createEngineTool(ctx, workflow) {
  const engine = workflow.engine
  const isCli = engine.kind === 'cli'

  return {
    name: 'agent_mix_engine',
    description: isCli
      ? `Inspect or invoke the external ${engine.name} for the ${workflow.name} workflow. ` +
        `Use action="status" to check whether the CLI is installed and see the exact command. ` +
        `Use action="run" with a complete, self-contained task to run the engine unattended in the session workspace ` +
        `and return its final output. The external agent edits the same workspace, so inspect its diff and verify ` +
        `its claims with your own tools. It runs outside DSH's tool-approval path with its own CLI permissions. ` +
        `If it is unavailable, continue with the native tools; do not install it silently.`
      : `Report the execution backend for the ${workflow.name} workflow. This mode has no external CLI engine; ` +
        `it runs entirely on the native Harness loop. action="run" explains that no external engine is configured.`,
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['action'],
      properties: {
        action: {
          type: 'string',
          enum: ['status', 'run'],
          description: 'status checks the engine without starting it; run executes a delegated task.',
        },
        task: {
          type: 'string',
          description:
            'Complete, self-contained task for the external engine. Required for action="run"; ignored for status. ' +
            'Include the goal, relevant paths, constraints, and the checks the engine should run.',
        },
        timeout_seconds: {
          type: 'integer',
          description:
            `Optional run timeout in seconds (30-3600). Defaults to ${Math.min(engine.timeoutSec ?? DEFAULT_TIMEOUT_SECONDS, 3600)}.`,
        },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['workflow', 'workflow_name', 'engine', 'kind', 'available', 'message'],
        properties: {
          workflow: { type: 'string' },
          workflow_name: { type: 'string' },
          engine: { type: 'string' },
          kind: { type: 'string' },
          available: { type: 'boolean' },
          command: { type: 'string' },
          install: { type: 'string' },
          docs: { type: 'string' },
          note: { type: 'string' },
          exitCode: { type: 'integer' },
          signal: { type: 'string' },
          stdout: { type: 'string' },
          stderr: { type: 'string' },
          truncated: { type: 'boolean' },
          message: { type: 'string' },
        },
      },
      render: (_args, value) => {
        const lines = [value.message]
        if (value.stdout) lines.push('', '--- stdout ---', value.stdout)
        if (value.stderr) lines.push('', '--- stderr ---', value.stderr)
        return [{ type: 'text', text: lines.join('\n') }]
      },
    },
    async execute(args, exec) {
      if (args?.action === 'status') return engineStatus(ctx, workflow, exec)
      if (args?.action !== 'run') throw new Error('action must be "status" or "run"')

      if (!isCli) {
        return {
          workflow: workflow.id,
          workflow_name: workflow.name,
          engine: engine.name,
          kind: 'native',
          available: false,
          install: '',
          docs: engine.docs ?? '',
          note: engine.note ?? '',
          message:
            'No external engine is configured for this workflow. Continue with the native Harness tools; ' +
            'this mode is designed to work without another CLI.',
        }
      }

      if (typeof args.task !== 'string' || args.task.trim().length === 0) {
        throw new Error('action="run" requires a non-empty task')
      }
      if (exec.agent === undefined) throw new Error('agent_mix_engine requires an agent Session')

      const resolved = await resolveEngine(ctx, workflow, exec.signal)
      if (!resolved.available) {
        return {
          ...resolved.status,
          kind: 'cli',
          available: false,
          message:
            `The ${engine.name} CLI is not installed or not resolvable on this host. ` +
            `${engine.install ? `Install it with: ${engine.install}. ` : ''}Continue with the native Harness tools.`,
        }
      }

      const cwd = await ctx.workingDirectory.ensure(exec.agent, exec.signal)
      const task = args.task.trim()
      const argv = buildArgv(engine, resolved.executable, cwd, task)
      const timeoutSeconds = clampTimeout(args.timeout_seconds, engine.timeoutSec)
      const preview = formatCommand(argv, engine.prompt === 'stdin' ? task : undefined)

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutSeconds * 1000)
      const onAbort = () => controller.abort()
      exec.signal.addEventListener('abort', onAbort, { once: true })

      let handle
      let outcome
      let failure
      let timedOut = false
      try {
        handle = ctx.subprocess.spawn({
          argv,
          cwd,
          stdio: {
            stdin: engine.prompt === 'stdin' ? { data: task } : 'ignore',
            stdout: { maxBytes: STDOUT_MAX_BYTES, spill: { maxBytes: STDOUT_SPILL_BYTES } },
            stderr: { maxBytes: STDERR_MAX_BYTES, spill: { maxBytes: STDERR_SPILL_BYTES } },
          },
          graceMs: 5000,
          signal: controller.signal,
        })
        try {
          outcome = await handle.done
        } catch (error) {
          if (controller.signal.aborted) timedOut = true
          else failure = error
        }

        if (timedOut) {
          handle.terminate()
          await Promise.race([handle.waitForExit().catch(() => {}), delay(15000)])
        }
      } finally {
        clearTimeout(timer)
        exec.signal.removeEventListener('abort', onAbort)
      }

      const stdout = readCollected(handle?.collected?.stdout)
      const stderr = readCollected(handle?.collected?.stderr)
      const exitCode = typeof outcome?.exitCode === 'number' ? outcome.exitCode : undefined
      const signal = typeof outcome?.signal === 'string' ? outcome.signal : undefined

      const result = {
        workflow: workflow.id,
        workflow_name: workflow.name,
        engine: engine.name,
        kind: 'cli',
        available: true,
        command: preview,
        install: engine.install ?? '',
        docs: engine.docs ?? '',
        note: engine.note ?? '',
        stdout: stdout.text,
        stderr: stderr.text,
        truncated: stdout.lossy || stderr.lossy,
      }
      if (exitCode !== undefined) result.exitCode = exitCode
      if (signal !== undefined) result.signal = signal

      if (timedOut) {
        result.message =
          `The ${engine.name} engine did not finish within ${timeoutSeconds}s and was terminated. ` +
          `Inspect any partial changes before retrying.`
      } else if (failure !== undefined) {
        result.message = `The ${engine.name} engine failed to run: ${errorMessage(failure)}`
      } else if (exitCode === 0) {
        result.message =
          `The ${engine.name} engine exited successfully. Review its diff and run the relevant checks yourself; ` +
          `its final output is below.`
      } else {
        result.message =
          `The ${engine.name} engine exited with code ${String(exitCode ?? 'unknown')}` +
          `${signal ? ` (${signal})` : ''}. Treat the task as unverified and inspect the output.`
      }
      return result
    },
  }
}

async function engineStatus(ctx, workflow, exec) {
  const engine = workflow.engine
  if (engine.kind !== 'cli') {
    return {
      workflow: workflow.id,
      workflow_name: workflow.name,
      engine: engine.name,
      kind: 'native',
      available: false,
      install: '',
      docs: engine.docs ?? '',
      note: engine.note ?? '',
      message:
        'This workflow has no external CLI engine. It runs on the native Harness tools; ' +
        'action="run" is not needed.',
    }
  }

  const resolved = await resolveEngine(ctx, workflow, exec.signal)
  return {
    ...resolved.status,
    kind: 'cli',
    message: resolved.available
      ? `${engine.name} is available at ${resolved.executable}. action="run" will start it in the session workspace.`
      : `${engine.name} is not available. ${engine.install ? `Install it with: ${engine.install}. ` : ''}` +
        'Continue with the native Harness tools.',
  }
}

async function resolveEngine(ctx, workflow, signal) {
  const engine = workflow.engine
  const attempts = []
  for (const command of engine.commands) {
    try {
      const executable = await ctx.subprocess.resolveExecutable(command, undefined, signal)
      const preview = formatCommand([executable, ...engine.args], engine.prompt === 'stdin' ? '<task>' : undefined)
      return {
        available: true,
        executable,
        status: {
          workflow: workflow.id,
          workflow_name: workflow.name,
          engine: engine.name,
          available: true,
          command: preview,
          install: engine.install ?? '',
          docs: engine.docs ?? '',
          note: engine.note ?? '',
        },
      }
    } catch (error) {
      attempts.push(`${command}: ${errorMessage(error)}`)
    }
  }
  return {
    available: false,
    status: {
      workflow: workflow.id,
      workflow_name: workflow.name,
      engine: engine.name,
      available: false,
      command: engine.commands.join(' | '),
      install: engine.install ?? '',
      docs: engine.docs ?? '',
      note: engine.note ?? '',
      message: `Looked for: ${attempts.join('; ')}`,
    },
  }
}

function buildArgv(engine, executable, cwd, task) {
  const args = engine.args.map((arg) =>
    arg.replaceAll('{cwd}', cwd).replaceAll('{prompt}', engine.prompt === 'arg' ? task : ''),
  )
  if (engine.prompt === 'arg' && !engine.args.some((arg) => arg.includes('{prompt}'))) args.push(task)
  return [executable, ...args]
}

function clampTimeout(value, fallback) {
  const seconds = Number.isInteger(value) ? value : Math.min(fallback ?? DEFAULT_TIMEOUT_SECONDS, 3600)
  return Math.max(30, Math.min(seconds, 3600))
}

function readCollected(reader) {
  if (reader === undefined) return { text: '', lossy: false }
  try {
    const read = reader.readFrom(0)
    return { text: read.text ?? '', lossy: read.lossy === true }
  } catch {
    return { text: '', lossy: true }
  }
}

function formatCommand(argv, stdinText) {
  const rendered = argv.map((arg) => {
    if (arg === stdinText) return '<task on stdin>'
    return /[\s"'\\]/.test(arg) ? JSON.stringify(arg) : arg
  })
  return rendered.join(' ')
}

function errorMessage(error) {
  if (error instanceof Error) return error.message
  return String(error)
}
