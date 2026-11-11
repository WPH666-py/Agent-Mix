# Publishing Agent-Mix

Agent-Mix is a ready-to-install DSH bundle. The repository is the package:
there is no build step, no install script, and no npm release required.

## GitHub

1. Create an empty repository named **Agent-Mix**.
2. Upload or push this directory as the repository root.
3. Install it with one line:

```sh
dsh plugin add https://github.com/<your-account>/Agent-Mix
```

The equivalent Web UI path is **Plugins → Add plugin → paste the URL**.

## Gitee

1. Create an empty repository named **Agent-Mix**.
2. Upload or push this directory as the repository root.
3. Install it with one line:

```sh
dsh plugin add https://gitee.com/<your-account>/Agent-Mix
```

The package name inside `package.json` is `agent-mix`; the repository display
name is `Agent-Mix`. That difference is intentional and does not affect
installation.

## What the one line does

`dsh plugin add <git-url>` asks pnpm to install the package from the repository,
selects the bundle in the current profile, and loads its patch. The patch
declares the twelve modes and the `agent-mix/workflow` rows. There are no
dependencies to install and no build artifacts to publish.

If the repository is private, DSH uses the host's Git/pnpm credentials. A public
repository is the simplest option for sharing a single link.

## Before publishing

```sh
npm run check
```

The check must pass. It verifies the generated `cordis.patch.yml` is current and
runs the workflow and engine tests.

## After publishing

- Use a tagged release only if you want reproducible installs; the plain
  repository URL already installs the default branch.
- If you change `workflows/`, run `npm run generate` and commit the regenerated
  `cordis.patch.yml` **before** pushing.
- Do not commit `dist/`, `node_modules/`, or local logs; they are ignored.
