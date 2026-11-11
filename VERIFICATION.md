# Verification record

- **Date:** 2026-11-12 (Asia/Shanghai)
- **DSH runtime:** 0.2.2-rc.1
- **Package:** `agent-mix@0.1.0`
- **Repository:** `D:\projects-py\Agent-Mix`

## Static and unit checks

```text
$ node scripts/generate-presets.mjs --check
cordis.patch.yml is current (12 presets)

$ node --test
✔ the native workflow reports that no external engine is configured
✔ a CLI status resolves the first available candidate without spawning
✔ a missing CLI reports the install hint and stays non-fatal
✔ the tool schema uses standard JSON Schema required arrays
✔ there are exactly the twelve requested workflows, with unique ids
✔ every workflow has metadata and a substantive prompt
✔ external engine manifests are complete and safe to spawn
✔ the Rust-first workflows actually use a Rust engine
✔ the generated patch contains one preset per workflow and the workflow row
✔ the workflow root does not register a duplicate persona
ℹ tests 10
ℹ pass 10
ℹ fail 0
```

## Live preset activation

An isolated DSH profile (`agentmix-test`) was composed from
`@deepseek-ai/dsh-base`, `@deepseek-ai/dsh-web-app`, and `agent-mix`, then booted
on `127.0.0.1:8899`. The authenticated `agentPresets/list` Remote returned:

```text
id=agent-mix-harness-superagent order=100 broken=
id=agent-mix-claude-code         order=101 broken=
id=agent-mix-codex               order=102 broken=
id=agent-mix-zcode               order=103 broken=
id=agent-mix-qoder               order=104 broken=
id=agent-mix-trae                order=105 broken=
id=agent-mix-kimi-code           order=106 broken=
id=agent-mix-workbuddy           order=107 broken=
id=agent-mix-hermes              order=108 broken=
id=agent-mix-opencode            order=109 broken=
id=agent-mix-cursor              order=110 broken=
id=agent-mix-kilo-code           order=111 broken=
```

All twelve declarations are present in the mode roster and report no activation
diagnostic. The four shipped presets (`standard`, `ptc`, `minimal`, `cordis`)
remained healthy in the same roster. The isolated profile and test server were
removed afterwards.

## CLI install path

A second throwaway profile was created from the shipped `web` template. The
same `dsh plugin ... add <package>` path used by the one-line Git install was
exercised with the packed artifact:

```text
$ dsh plugin --profile agentmix-cli add agent-mix-0.1.0.tgz
+ agent-mix file:.../agent-mix-0.1.0.tgz
Done

# profile package.json after the command:
"dependencies": { "agent-mix": "file:.../agent-mix-0.1.0.tgz" },
"dsh.profile.bundles": [
  "@deepseek-ai/dsh-base",
  "@deepseek-ai/dsh-web-app",
  "agent-mix"
]
```

`--dump-config` then printed all twelve `preset-agent-mix-*` rows with their
`agent-mix/workflow` children. The command both installed the package and
selected the bundle; no manual `package.json` edit was needed. The throwaway
profile was removed.

The composition tree was also checked with:

```text
dsh --profile agentmix-test --dump-config
```

It parsed the generated patch and printed all twelve `preset-agent-mix-*` rows
with their `agent-mix/workflow` children.

## Desktop install

The bundle was installed into the live `desktop` profile. DSH reported
`application: restart-required` because the running Desktop process composed its
profile before the new bundle existed. This is expected for a newly added
bundle; the files are installed and the bundle is selected. Restart DeepSeek
Harness once, then start a new session and open the mode picker.

## What was not executed

No external coding CLI was run end-to-end during verification. The adapter's
`status` path, native fallback, missing-CLI behavior, and schema are covered by
unit tests, but an actual `agent_mix_engine` `run` would start another agent in
the workspace and was left for the user's deliberate first use. In particular,
CLI flags and login state can vary by version; the tool returns the CLI's stderr
and never reports success on a non-zero exit.

## Reproduction

```sh
npm run check
```

For a live check, install the bundle and inspect **Settings → Plugins →
Agent-Mix** or open a new session's mode picker. Every Agent-Mix mode should
have an active `agent-mix/workflow` row and no diagnostic in the composition
viewer.
