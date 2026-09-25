# CURSOR-WAVE-2-1 — 五包连续文档纠偏与纯边界回归

Status: build
Phase: ops / phase1 / phase2（文档与测试，生产代码冻结）
Contribution Owner: Cursor
Review / Integration Owner: Codex
Base: `8ff22973`（2026-09-25 main；开工时先同步并记录实际 base）
Branch: `codex/cursor-wave2-r1`；独立 worktree `type-pal-cursor-wave2`

## 前提与准入

用户要求给 Cursor 连续分配更多工作。Codex 已独立核实五包互不修改同一文件；全部属于文档或测试候选，**不授权产品实现、schema、存档、迁移、生成资产或基线变更**。当前委派模式由 Cursor 实施、Codex 独立验收与集成；不等固定 AI 席位，也不把 Cursor 自测当独立证明。五包按 W1→W5 连续提交，不必每包等 Codex 回复；每包独立提交，便于 Codex 按包选择性接收。若主线同名目标变动，先 rebase 再核白名单，不覆写他人修改。

既有锚点：`CLAUDE.md:22` 一阶段允许无行为漂移架构治理；`docs/phase2/READ-FIRST.md` 二阶段原则；[DOC-CURSOR-6 独立复核](../../testing/cursor-author-guides-review.md)指出七处现行指南误导与 `callScript` 保存保护缺口；[文档工具正式接入记录](../../testing/cursor-tool-regressions/integration.md)已有相关用例，不能再造同义测试。仓库使用 Vitest 4.1.7 和 pnpm 10 工作区，按本仓配置而非外部旧版示例运行。

## W1 — 三份作者指南的已证文字窄修

白名单：`docs/phase2/guides/battlefield-authoring.md`、`shared-script-author-guide.md`、`debug-tools.md`。逐项对照 `docs/testing/cursor-author-guides-batch.md` 的 B1-3、C1-1/2/3、C2-2/4、D1-1 和 Codex 独立复核，修正七处误导：悬空战场文案；共享脚本创建字段与无复制入口；抽屉真页签；引用列表而非“扫描”按钮；保存门尚未执行 canonical `callScript` 环检查；试玩按钮不自动追加 `debug`。保留已核实的运行时和设计意图。特别是 C2-4：**不要把未实现的保存保护描述为已实现，也不要通过删掉“应避免调用环”的约束把产品缺口合理化**；`self: required` 的保存/发布承诺只写实际查到的调用域，未证实则标待证。D1-1 的带 `debug` URL 可作为手工示例，不可暗示按钮自动加参。不得加新产品操作或重写历史规范。

## W2 — 根工程指令的过时命令窄修

白名单仅 `CLAUDE.md`。当前 `:44` 的 game `run e2e` 在 `packages/game/package.json` 已不存在；`:48` 的 6001 e2e 实例也已退役。对照 `docs/ops/guides/dev-servers.md:30-48`、`packages/game/vite.config.ts` 和 DOC-CURSOR-5 已接收 game README，修正当前命令/端口说明。`E2E=1` 只表示不挂 basicSsl 的 HTTP dev，不得称真实 SW 或 Playwright。只动这两处及必要的邻接语句，不改一阶段机制、阶段铁律或历史经验。

## W3 — 编辑器三块纯边界测试

目标生产文件只读：`packages/editor/src/core/binary-signature.ts`、`project-read-lock.ts`、`play-url.ts`。可改相应现有测试或同目录新增 `*.test.ts`，不得改其它编辑器文件。先逐条盘点 `clone.test.ts`、`workspace-capability-lifecycle.test.ts`、`project-read-admission.test.ts`、`play-url.test.ts` 的已有证明，再补**确实未钉住**的合同，如偏移视图散列/输入不变、读取锁在绑定换代或回调失败后的释放、URL 重复/歧义拒绝。不能因为目标有分支就臆造运行态；至少一条新断言用隔离单点反控证明会因对应业务防护移除而红。若一轴已有充分证明，回执标 `existing-proof` 与精确测试名，不堆重复用例。产品缺陷只交隔离诊断，不把默认红测试放进绿套件。

## W4 — 第一阶段工具边界测试

目标生产文件只读：`packages/game/src/tools/fps-overlay.ts`、`display-scale.ts`、`toast.ts`。可改同目录对应测试或新增 `fps-overlay.test.ts`。重点补 `fps-overlay` 当前缺直接回归：持久开关、500ms 采样、50 FPS 色阈、关闭后清理、连续启停不沿用脏计数；用受控 rAF 时间戳和 jsdom/假时钟，不靠真实 sleep。`display-scale` 与 `toast` 现有测试已经覆盖默认、夹限、持久及移除，只有独立缺口才补。隔离清理 DOM、localStorage、timer 和模块状态，不能污染相邻套件；至少一条新断言有单点负控制。第一阶段呈现语义以当前实现和 `docs/phase1/engineering-notes.md` 为锚，不借补测改变 UX。

## W5 — 文档工具安全边界测试

目标生产文件只读：`scripts/docs/markdown.mjs`、`check.mjs`、`relocate.mjs`。可改 `scripts/docs/*.test.mjs`，但不得改正式迁移计划、任务索引或文档资产。先读 TEST-CURSOR-TOOLS-1 正式接入测试，针对真正遗漏的 Markdown 代码区/定义位置、路径目标边界、relocate dry-run/碰撞预检等补回归；所有 IO fixture 在 `mkdtemp` 下，运行完清理自身临时目录，不指向仓库根做写入。任何发现的工具缺陷另存诊断，不自行修改生产脚本；若已充分覆盖，按 `existing-proof` 登记具体测试名。至少一条新增用例用隔离变异或等价反例展示鉴别力。

## 交付与门禁

- 五包分别提交，最终在 `docs/testing/cursor-wave2/README.md` 写逐包文件白名单、真实新增测试标题、现有去重、执行命令/退出码、单点反控和待证/缺陷；允许给 `docs/testing/README.md` 增一条导航以满足文档门。除此之外不改 docs/ops 任务卡/看板。
- 每包只跑相关定向和相邻套件；整批末跑 editor/game typecheck、`pnpm test:docs-tools`、改动文件 Biome、`pnpm check:docs`、`git diff --check`。新测试计数从运行结果生成，不凭记忆写。不运行迁移、资源提取、E2E、部署，不调 ratchet 或改 `baseline.fast.json`；**官方全仓 check、统一 ratchet、受保护 strict-fast 由 Codex 接收后串行执行一次**，不用每补几项就重复跑覆盖率。
- 任何包没有可信增量时可以是 `existing-proof`；不得为消耗额度重复旧断言、降低门槛或修改旧测试预期。新增测试失败不能以 skip/test.fails/提高超时掩盖。候选只在隔离分支提交推送，不合 main、不标 done。Codex 独立逐包 accept/counter，合格包直接接入推送并及时清理候选工作树/分支。

## 下一位 Cursor 提示词

见 Codex 交付消息；本卡五包 W1→W5 连续执行，不需要每包重新请示。无产品实现授权。
