# Agent-Mix

**十二种编程 Agent 工作流，一个可安装的 DeepSeek Harness 插件。**

Agent-Mix 把 Harness SuperAgent、Claude Code、Codex、ZCode、Qoder、Trae、Kimi
Code、WorkBuddy、Hermes、OpenCode、Cursor、Kilo Code 的工作方式做成 DSH
模式。新建会话前选择模式，该模式会挂载自己的工作流包、提示词、工具组合和可选外部引擎。
不需要额外服务，仓库本身就是插件：没有构建步骤，也没有运行时依赖。

## 一行链接安装

在 DSH Web 的 **插件 → 添加插件** 中粘贴仓库链接，或用 CLI：

```sh
# GitHub
dsh plugin add https://github.com/OWNER/Agent-Mix

# Gitee
dsh plugin add https://gitee.com/OWNER/Agent-Mix
```

把 `OWNER` 换成实际托管账号；如果使用命名 profile，在 `add` 前加
`--profile <name>`。本地开发可以直接：

```sh
dsh plugin add "link:D:\projects-py\Agent-Mix"
```

仓库还没有远端时，按 [PUBLISH.md](PUBLISH.md) 上传即可；上传后把上面的
`OWNER` 换成你的账号，这一行就是安装命令。

安装后**新建会话**，打开模式选择器，会看到十二个
**Agent-Mix · <工作流>**。已有会话保持原模式；DSH 的预设是在会话第一轮开始前
选定的，不能在同一会话里热切换。

## 模式

| 模式 | 工作流风格 | 首选引擎 |
|---|---|---|
| Agent-Mix · Harness SuperAgent | 目标驱动、原生多 Agent 交付 | 原生 Harness |
| Agent-Mix · Claude Code | 先探索再计划，工具优先、简洁交付 | `claude` CLI 或原生 |
| Agent-Mix · Codex | 最小补丁、沙箱、紧凑测试循环 | Rust `codex` CLI |
| Agent-Mix · ZCode | 工作台式计划/构建、可读轨迹 | `zcode` CLI |
| Agent-Mix · Qoder | 规格驱动拆解与审查 | `qoder` CLI |
| Agent-Mix · Trae | 明示计划、沙箱执行、自审 | Rust `traecli` |
| Agent-Mix · Kimi Code | 干净上下文，探索/计划/实现分离 | `kimi` CLI |
| Agent-Mix · WorkBuddy | 工单范围、验收标准、交接 | WorkBuddy/CodeBuddy CLI |
| Agent-Mix · Hermes | 理解仓库、复用经验、沉淀结论 | Rust `hermes` CLI |
| Agent-Mix · OpenCode | 计划/构建分离、供应商中立 | `opencode` CLI |
| Agent-Mix · Cursor | 遵循 rules、快速精确编辑 | Cursor `agent` CLI |
| Agent-Mix · Kilo Code | Architect / Coder / Debugger 分工 | `kilo` CLI |

即使没有安装外部 CLI，每个模式也能用原生 Harness 工具工作。Agent-Mix 会明确报告
引擎是否可用，不会自动安装任何东西。

## 挂载内容

每个预设都是一个普通 `@deepseek-ai/dsh-agent-preset` 声明，包含：

- 一个 `agent-mix/workflow` 行：负责该工作流的
  `deployment:persona-prefix` 提示词，以及可选的 `agent_mix_engine` 工具；
- `@deepseek-ai/dsh-agent-instructions`：读取 `AGENTS.md` / `CLAUDE.md`；
- 原生文件、搜索、shell、后台任务、web、skill、todo、ask-user、schedule、goal、
  plan、压缩和子代理工具；
- 带独立隔离域的 plan、compaction、delegation 组。

工作流包本身只包含身份、操作协议和可选引擎清单；适配层在 `workflow.js`，进程接缝在
`engine.js`，十二个工作流在 `workflows/`。`cordis.patch.yml` 由这些声明生成，
避免模式和实现漂移。

### 为什么是一个 bundle，而不是十二个包？

因为安装契约是“一行链接”。十二个独立发布的包会在用户看到第一个模式之前就引入
依赖图、版本错位和更多失败点。每个工作流仍然是独立的 `agent-mix/workflow`
插件行，有自己的配置和提示词，也有自己的预设组合。如果某个工作流以后需要独立发版，
把 `workflows/<id>.js` 移到独立包并保持 `defineWorkflow` 形状即可，适配层不需要改。

## Rust 优先

原则是：**有 Rust 实现就用 Rust 实现；没有就明确说明。**

| 工作流 | Rust 引擎 | 说明 |
|---|---|---|
| Codex | 是 | `@openai/codex` 自带 Rust CLI，使用 `codex exec` |
| Trae | 是 | 本机 `traecli` 是 Rust 程序 |
| Hermes | 是 | `hermes-agent-rs` 是 Rust 移植；Python 原版命令兼容 |
| Harness SuperAgent | 否 | 原生 DSH / TypeScript 循环 |
| Claude Code | 否 | TypeScript CLI；外部引擎可选 |
| ZCode | 否 | TypeScript CLI |
| Qoder | 未知（闭源） | 文档化的 headless CLI |
| Kimi Code | 否 | TypeScript CLI |
| WorkBuddy | 未知（闭源） | CodeBuddy Code 同族 |
| OpenCode | 否 | TypeScript CLI |
| Cursor | 未知（闭源） | 文档化的 headless CLI |
| Kilo Code | 否 | TypeScript CLI |

DSH Host 插件层本身是 JavaScript，所以“Rust 优先”指的是外部编码引擎，而不是把
Rust CLI 重写成 JS。适配器只解析真实二进制并在会话工作区里运行它。

## 外部引擎怎么用

每个 Agent-Mix 模式只有一个引擎工具 `agent_mix_engine`：

- `action: "status"`：解析 CLI，返回确切命令、安装提示和文档；不会启动进程。
- `action: "run"`：把完整、自包含的任务交给 CLI，在会话工作区运行并返回最终输出。

工具不走 shell；只有清单明确声明 `prompt: "arg"` 时才把任务作为参数传入。输出有上限
（stdout 256 KiB、stderr 64 KiB），超出部分写 spill 文件；默认超时 30 分钟。

外部引擎会修改**同一个**工作区。模型收到的提示明确要求：把引擎结果当作待审改动，
自己检查 diff 并重跑检查。不要把它当事实来源。

### 登录与权限

各引擎使用自己的登录状态（`claude`、`codex login`、`qoder`、`kimi` 等）。DSH
启动子进程时会清理环境，所以只在当前 shell 里存在的 API key 可能不会传给引擎；
请使用引擎自己的持久登录或配置。

各 CLI 的权限参数不同，清单使用各自文档里的保守模式：Claude Code
`--permission-mode acceptEdits`、Codex `--sandbox workspace-write`、Qoder
`--permission-mode accept_edits`、Trae `--sandbox workspace-write
--permission-mode auto`、Kimi print 模式（自动批准工具）、WorkBuddy/CodeBuddy
`--permission-mode acceptEdits`、Cursor `-p --force`、ZCode headless
`--mode yolo`（上游批处理示例，需自审）、OpenCode/Kilo/Hermes 各自的 one-shot
模式。不要用 Agent-Mix 去绕过你本来不会授予的权限。

外部引擎是 **DSH 工具审批与沙箱之外的独立进程**。它自己的 CLI 参数和操作系统权限
决定它能读什么、写什么；DSH 的工具策略约束不到它。只有在你允许该 CLI 操作这个
工作区时才运行它，并在接受结果前审查 diff。

## 源码与归属

Agent-Mix **不隶属于任何上游厂商，也未获其背书**。工作流提示词是根据公开文档和
开源仓库的公开行为编写的原创操作协议，不复制闭源源码或系统提示词；开源项目的思想
仍受其各自许可证约束。

| 工作流 | 上游 | 语言 | 许可证 | 本仓库如何使用 |
|---|---|---|---|---|
| Harness SuperAgent | [dsh-superagent-prototype](https://github.com/deepseek-ai/dsh-superagent-prototype) | TypeScript | MIT | 参考目标驱动自主性；运行在原生 Harness |
| Claude Code | [anthropics/claude-code](https://github.com/anthropics/claude-code) | TypeScript | 见上游 | 公开文档和 CLI 行为；可选 `claude` |
| Codex | [openai/codex](https://github.com/openai/codex) | Rust | Apache-2.0 | Rust CLI 引擎与公开文档 |
| ZCode | [zai-org/ZCode](https://github.com/zai-org/ZCode) | TypeScript | Apache-2.0 | CLI 文档；可选 `zcode` |
| Qoder | [qoder-action](https://github.com/QoderAI/qoder-action)、[CLI 文档](https://docs.qoder.com/cli/run-in-scripts) | 闭源 CLI | Proprietary | 公开 headless 文档；可选 `qoder` |
| Trae | [Trae-AI/TRAE](https://github.com/Trae-AI/TRAE)、[CLI](https://www.trae.ai/cli) | Rust CLI | Proprietary | 公开 CLI 行为；可选 `traecli` |
| Kimi Code | [MoonshotAI/kimi-code](https://github.com/MoonshotAI/kimi-code) | TypeScript | MIT | 公开文档；可选 `kimi` |
| WorkBuddy | [腾讯云文档](https://www.tencentcloud.com/document/product/1316/84420)、[CodeBuddy Code](https://www.npmjs.com/package/@tencent-ai/codebuddy-code) | TypeScript | Proprietary | 公开文档；可选 WorkBuddy/CodeBuddy |
| Hermes | [hermes-agent-rs](https://github.com/Lumio-Research/hermes-agent-rs)、[hermes-agent](https://github.com/NousResearch/hermes-agent) | Rust 移植 | MIT | Rust CLI 引擎与公开文档 |
| OpenCode | [anomalyco/opencode](https://github.com/anomalyco/opencode) | TypeScript | MIT | CLI 文档；可选 `opencode` |
| Cursor | [cursor/cursor](https://github.com/cursor/cursor)、[headless 文档](https://cursor.com/docs/cli/headless) | 闭源 CLI | Proprietary | 公开 headless 文档；可选 `agent` |
| Kilo Code | [Kilo-Org/kilocode](https://github.com/Kilo-Org/kilocode) | TypeScript | MIT | 公开 CLI 文档；可选 `kilo` |

完整归属说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。厂商名称和商标
归各自所有者。

## 增加或修改工作流

1. 新建 `workflows/<id>.js`，使用 `workflows/_shared.js` 的 `defineWorkflow`。
2. 在 `workflows/index.js` 导入并加入有序列表。
3. 运行 `npm run generate`。
4. 运行 `npm run check`。
5. 重新安装 bundle，新建会话查看新模式。

不需要引擎的工作流写 `engine: null`；CLI 工作流声明 `commands`、`args`、
`prompt: "stdin" | "arg"` 和 `install` 提示。命令必须显式，避免 shell 语法。

## 验证

```sh
npm test          # 工作流不变量与生成补丁一致性
npm run check     # generate --check + 测试
```

测试会检查十二个 id、提示词长度、引擎清单、Rust 标记和补丁是否最新。实机验证时，
在 **设置 → 插件 → Agent-Mix** 查看每个模式的 composition：`agent-mix/workflow`
应为 active 且没有激活诊断。然后新建会话，让它说明当前工作流，并调用
`agent_mix_engine` 的 `status` 检查引擎或原生兜底。

本次验证的原始记录见 [VERIFICATION.md](VERIFICATION.md)：隔离 profile 中十二个
Agent-Mix 预设全部健康、10 项测试通过，桌面版安装后按预期需要重启一次。

## 限制

- DSH 会话的预设在第一轮开始后固定；切换工作流需要新建会话。
- 外部 CLI 的参数和登录流程会变化。清单是尽力而为的默认值；失败时返回 stderr，
  不会伪报成功。
- 外部引擎会无人值守地修改工作区，必须审查 diff。适配器的权限参数不能替代你的判断。
- 引擎输出过大时会被截断并写 spill 文件，结果会明确标记。
- 模式刻意包含较宽的原生工具集；需要更窄的组合时，修改 `workflows/<id>.js` 或
  生成的预设后重新安装。

## 卸载

在 **插件** 中禁用或移除 Agent-Mix。新会话不再显示这些模式；已使用某个模式的会话
会保留其记录，直到归档。

## 许可证

MIT，见 [LICENSE](LICENSE)。
