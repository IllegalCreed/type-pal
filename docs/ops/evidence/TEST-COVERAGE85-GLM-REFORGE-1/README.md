# TEST-COVERAGE85-GLM-REFORGE-1 交付证据（r7 = r6 内容 + 反控重 pin）

Owner: GLM · Branch: `codex/coverage85-glm-reforge-r1`
状态: 待 Codex 独立验收（不合 main、不标 done）。

## 度量（fast 口径，与官方 runner 同参数）

| 指标 | 基线（main=r5 合入后） | 终态（r6） | Δ |
|---|---|---|---|
| branches | 9787/12166 (80.44%) | 9793/12166 (80.49%) | **+6** |
| statements | 15841 | 15843 | +2 |
| lines | 14209 | 14212 | +3 |

**80.49% ≠ 85%：距 85%（10341 臂）仍差约 548 臂，不作为达标收口**（见「后续范围」）。

## 当前交付（118 测试，全公开 caller）

- 8 个 `*.c85-*.test.ts`：118 测试（r5 的 113 + r6 的 5：entity-motion 让位回落/持杖多拍回喂/绕行受限、runtime abort 保留断点的真实 continuation 复跑、main 标题启动空序列）。零 unsafe cast / `@ts-expect-error` / skip / timeout 扩大；观测面只 `observation()` 与 canvas DEV dataset（DOM 面）。
- 逐 fullName → family → 源行 → caller → oracle 映射账：`packages/reforge/src/__tests__/coverage85/c85-family-ledger.json`（`scripts/c85-family-ledger.mjs` 表驱动重建，118/118 全匹配，双跑逐字节一致，mkdtemp+finally 零残留）。
- 臂级闭合账：`packages/reforge/src/__tests__/coverage85/c85-branch-delta.json`（基线/终态 lcov 拷贝随账提交，`scripts/c85-branch-delta.mjs` 可再生成）。
- identity（file×fullName×status）：`c85-identity-status.json`。
- 反控 9/9：`c85-mutation-counterproof.json` + 全量 raw `c85-counterproof-raw/`（r7 在干净树对当前 118 测试树整体重 pin：executedSet/skippedSet、command/cwd/env digest、exit/signal/spawn、stdout/stderr 全量、四态 hash、vacuous 硬防、mkdtemp+finally）。

## r6 blocked 登记（battle-session 表现层）

| # | 范围 | 判定 | 依据 |
|---|---|---|---|
| B1 | battle-session.ts render/timeline/settlement/召唤染色（~390 臂） | **blocked（缺产品观察口）**：`state`/`visual` 均 private 且无公开 snapshot/observer；`render(ctx)` 虽公开但断言 draw 调用序列属表现层而非业务 oracle，且无 cast 构造全量 `CanvasRenderingContext2D` 不合法。终局/演出动作类可经 `done`+opts 回调观测的部分（stopMusic 排程/终局登记/敌逃/cancel 守卫）已在 r1–r3 覆盖；其余臂待产品先落公开观测口（不属本卡授权）。 | battle-session.ts:211 `private readonly state`；卡面约束"不新增产品接口"。 |

## 后续范围（剩余可达分支，85% 需再闭 ~557 臂）

按域列出剩余可达未覆盖臂的规模与所需 harness（非不可达，是后续轮工作面）：

1. **main.ts 主循环/交互长尾（~780 臂）**：输入路由、菜单流、存档流、演出宿主回调分支。
   驱动方式 = runtime-shell `installShellHost` + `key()/frame()` 逐场景推进（本卡 boot 区间
   已验证该 harness 可行）；按 main.<domain>-flows 系列既有家族模式扩展。
2. **battle-session.ts 表现层（~390 臂）**：render/timeline/结算屏/召唤染色。`state` 为
   private 且无公开观测口——需先落产品观测口（公开 snapshot/observer）或以
   `render(ctx)` + 录制 ctx 断言 draw 序列；观测口落地前无法合法断言，本卡未伪造。
3. **script-runner-core.ts 续跑帧内部（~22 臂）**：需手工 `AutoCommandFrame` 续跑 fixture
   （resume frames 带 control phase），属 checkpoint/continuation 专项。
3b. **entity-motion.ts 求解器臂（~41 臂）**：sideCandidate 符号臂/持杖候选/求解器让位与
   预约臂——探针实证「party 正面撞静止 NPC 的首次规划被拒（reason=actor）」，侧踏接受需
   按运行时 side-stick 重试纪律构造多拍场景，属运动专项续卡。
4. **其余 reforge 文件（dither/audio/save codec/menu 等，~160 臂）**：不在本卡合同四域，
   归后续通用覆盖轮。

## 验证

- 定向：8 个新文件 118/118 绿。
- 全量：fast 全量 325 文件/8687 测试全绿（main 干净基线 8682 全绿复现）（基线复现 317 文件/8569 全绿）。
- typecheck：零错误。lint：全仓 3145 文件零诊断 PASS。docs：PASS。
- 反控：9/9（含 vacuous 零匹配硬防）；四 hash 对账 + 工作树快照零残留。
- diff：产品文件零改动（`git status` 仅本卡测试/脚本/证据/文档）。

## History（历史轮次，仅存档）

- r1–r2（76f3c6bf2/746f0c4f8）：+128 臂/121→117 测试；去重、公开 observation、账目重建。
- r3（4cef72844）：撤销重复合同 → 108 测试/+128；逐 fullName ledger；反控加固。
- r4–r5（75a12d84b…515eeaf96）：证据迁移、可复现脚本、executed/skipped 分集回执（+130/113 测试）。
- r6–r7（c835378e5/d0a14b337）：真实多拍/continuation 合同 → 118 测试/+6 → 9793/12166（80.49%）。
- 历史基线 9657/12166（79.39%）对应 dispatch 起点;当前官方基线=main（9787）。
