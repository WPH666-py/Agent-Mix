# No-Git installer artifact

The repository itself is the package: `dsh plugin add <repository URL>` works
when the machine has Git. This directory additionally ships the packed bundle so
the same install works on a machine **without Git**, using a plain HTTPS
tarball URL.

## GitHub

```sh
dsh plugin add https://raw.githubusercontent.com/WPH666-py/Agent-Mix/main/release/agent-mix-0.1.0.tgz
```

## Gitee

```sh
dsh plugin add https://gitee.com/ph-wang_admin/Agent-Mix/raw/master/release/agent-mix-0.1.0.tgz
```

The tarball is produced with `npm pack` from the repository root. Replace it
whenever runtime files change:

```sh
npm run check
npm pack --pack-destination dist
Copy-Item dist/agent-mix-<version>.tgz release/
```

`dist/` is ignored; this `release/` copy is intentionally committed for the
no-Git install path.
