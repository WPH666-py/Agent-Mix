# Publishing Agent-Mix

Agent-Mix is a ready-to-install DSH bundle. The repository is the package:
there is no build step, no install script, and no npm release required.

## Published locations

| Surface | URL |
|---|---|
| GitHub repository | https://github.com/WPH666-py/Agent-Mix |
| Gitee repository | https://gitee.com/ph-wang_admin/Agent-Mix |
| GitHub no-Git tarball | https://raw.githubusercontent.com/WPH666-py/Agent-Mix/main/release/agent-mix-0.1.0.tgz |
| Gitee no-Git tarball | https://gitee.com/ph-wang_admin/Agent-Mix/raw/master/release/agent-mix-0.1.0.tgz |

## One-line installs

### No Git required (recommended here)

```sh
# Gitee, fastest from mainland China
dsh plugin add https://gitee.com/ph-wang_admin/Agent-Mix/raw/master/release/agent-mix-0.1.0.tgz

# GitHub
dsh plugin add https://raw.githubusercontent.com/WPH666-py/Agent-Mix/main/release/agent-mix-0.1.0.tgz
```

These download the packed bundle over HTTPS. They were installed in throwaway
DSH profiles and both commands selected the `agent-mix` bundle automatically.

### Repository URL (requires Git)

```sh
dsh plugin add https://github.com/WPH666-py/Agent-Mix
dsh plugin add https://gitee.com/ph-wang_admin/Agent-Mix
```

`dsh` uses pnpm to install a Git URL. If the machine has no `git`, pnpm fails at
`git ls-remote` before downloading anything; use the tarball link instead.

The package name inside `package.json` is `agent-mix`; the repository display
name is `Agent-Mix`. That difference is intentional and does not affect
installation.

## What the one line does

The tarball path installs the package, adds `agent-mix` to
`dsh.profile.bundles`, and loads its patch. The patch declares the twelve modes
and the `agent-mix/workflow` rows. There are no runtime dependencies and no
build artifacts besides the committed tarball.

## Updating the no-Git artifact

Whenever runtime files change, regenerate the package and replace the committed
copy; the raw URL stays the same only if the version does not change:

```sh
npm run check
npm pack --pack-destination dist
Copy-Item dist/agent-mix-0.1.0.tgz release/agent-mix-0.1.0.tgz
```

If you bump the version, update the two raw URLs in `README.md`,
`README.zh.md`, `release/README.md`, and this file.

## Before publishing

```sh
npm run check
```

The check must pass. It verifies the generated `cordis.patch.yml` is current and
runs the workflow and engine tests.
