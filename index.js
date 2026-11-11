/**
 * Agent-Mix host root.
 *
 * The bundle's actual work happens in `agent-mix/workflow`, which every
 * Agent-Mix preset mounts with a different workflow id. This root row exists
 * so the bundle has a normal Host entry, display metadata, and a stable place
 * for future profile-wide services.
 */
export const name = 'agent-mix'

export function apply() {}
