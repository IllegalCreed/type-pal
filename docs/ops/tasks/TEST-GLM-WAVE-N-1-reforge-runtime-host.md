# TEST-GLM-WAVE-N-1 — Reforge 非剧情运行时宿主与资源生命周期大包

Status: review
Phase: phase2
Capability: runtime-host / test-coverage
Coding Owner: GLM N（仅新增测试、专属 fixture/证据）
Reviewer: Codex（独立验收、集成和正式覆盖结算）
Visual Verification: GLM 最小功能操作，Codex 最终复核
Branch: `codex/glm-wave-n-reforge-host-r1`（独立工作树）

## 准入与前提

2026-09-30 Codex 核 `build allowed`，**只准非剧情宿主测试**。
[冻结表](../../testing/glm-next-triple/targets.json) N01–N05 为 **11 个互异生产源**，
[只读校验](../../testing/glm-next-triple/verify-targets.mjs)证与 A–K 及 L/M 目标零交集；
基础提交 `f70db72236d9cac794d40a625a89fef8c29459ae`。
本地 fast 逐文件 1473 个未命中臂中 `main.ts` 占 1217；许多可能属于剧情/E2E、
不可达或已有异文件断言，不承诺收益，也不为刷臂启动剧情。

工程前提：`packages/reforge/src/main.ts:254` 的 `bootGame` 是现行公开启动入口；
`:50,52,55,122,195` 接 BGM/SFX、战斗准备、菜单、视频端口。
原版/一阶段机制真值 N/A（本卡不定战斗数值、碰撞或剧情）；一阶段仅作已有
菜单视觉形态的 UX 参考，二阶段按 [`READ-FIRST`](../../phase2/READ-FIRST.md)
新架构合同观察。最强替代解释是大缺口在真实路线、DOM/Canvas 表现或被旧
`main.*.test.ts` 已证；逐项读旧断言后无法证明新的当前非剧情合同，就标
`existing-proof/out-of-scope`，不造私有状态或跳剧情快捷入口。

先读 `AGENTS.md`、`READ-FIRST`、[共同协议](../../testing/glm-next-triple/README.md)、
冻结表、`packages/reforge/src/main.*.test.ts` 及相邻资源测试。
不得改/重跑 Codex 当前 `E2E-R4-1` 的 001/002 路线、checkpoint、内容脚本、
场景移动和剧情演出；若 Codex 后续改变 `main.ts`，立即停受影响组请 Codex
重定源冻结，不把旧快照硬套新实现。

## 五组范围与可证伪结果

| 组 | 工作流 | 至少核的业务结果 |
|---|---|---|
| N01 | bootGame 非剧情启动/地图输入 | 合法小工程加载、失败诊断、退出释放，不越路线检查点 |
| N02 | BGM/MIDI/SFX 准备 | 可用/缺失/取消音源的精确结果与释放，不靠听感或 sleep |
| N03 | 菜单盒/视频覆盖层 | 显式选择/关闭、坏媒体降级与焦点/资源回收 |
| N04 | 战斗 UI/动画端口 | 合法 battle trial 的有限帧/菜单输出，不裁决数值或完整战斗 E2E |
| N05 | trial 资产与 launch | 小资源准备、撤销/取消、过期请求不可晚到覆盖 |

只写冻结源同目录 `*.glm-n.test.ts(x)` 新测试、
`packages/reforge/src/__tests__/glm-n/**` typed fixture、
`docs/testing/glm-next-triple/wave-N/**` 证据/反控；产品、旧测、共享配置和真实
PAL 资产只读。宿主替身仅封外部 browser/audio/IO，不 mock 被测 `bootGame`、
资源调度或战斗准备核心；异步用 entered/deferred 并在 `finally` 释放。
至少一条实际 browser 功能操作检查菜单或 battle trial 错误恢复，记 URL、视口、
截图 SHA256 与 console；若当前环境不能看图，标未证不以单测冒充。

验收按共同协议：五组排重账、至少四枚有效业务反控、新鲜 Vitest JSON，
Reforge 定向/相邻及全包 `env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/reforge test`、
`typecheck`、根 `pnpm lint` 0/0/0、docs/diff 零诊断。GLM 不合 main、不运行正式
ratchet、不标 done；纯测试用户验收 N/A，Codex 独立核定。

## 推进记录与交接

- Codex 前提/范围：公开宿主入口、A–K 去重、E2E 占用和冻结校验已核；限定测试 `build allowed`。
- GLM 交付：候选 `61dc0de19e85429740c218cfa0e1d29d89ee2dfd` 已推送，13 个新测试文件、
  55 例与 wave-N 证据。Codex 独立审核：**counter / rework**，未合 main、未计正式覆盖。

## Codex 独立审核（2026-09-30，候选 61dc0de1）

- 冻结表在候选与 main 均通过；定向 JSON 为 55/55 且 55 个不同 fullName。
  独立复跑 `env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/reforge test` 为
  **259 文件/2054 测试通过**，typecheck、根 lint 0/0/0、docs、候选区间
  `git diff --check 784fb098...HEAD` 通过。这些绿门不替代合同合法性。
- `menu-box.glm-n.test.ts:45,68,147-158,181` 与
  `battle-ui.glm-n.test.ts:77,118,146,201-203,236,345,355` 等多处
  `as unknown as`，其中还用 `undefined` 强作 `ImageBitmap`/调色值。
  共同协议明禁双强转；合法 typed fixture 必须重建，不能靠强转掩盖缺字段。
- 四枚反控的 `counter-controls.json` 仅给结论布尔值/失败名称，无原始 Vitest
  正反控输出、执行数及恢复后 SHA256 值，无法独立核“恰一个业务断言红”。
  RC4 的高度 `-1 → -2` 两端都是非法输入，不符合“合法输入单轴变异”；
  因此当前**不足四枚有效反控**。换成合法输入轴，交可复核的原始结果和哈希。
- 候选越过写入白名单，改了共享 `docs/testing/glm-next-triple/README.md`
  添加 N 导航。该行应从贡献者候选退出，由 Codex 集成时统一登记。
- 真实浏览器取证的 `drive-n.mjs` 在标题菜单按 Enter 后等待 `__rfWorld`，
  `world-after-entry.png` 实际已是开场剧情画面；这越过卡面“非剧情菜单或 battle
  trial 错误恢复”的视觉范围。请改为停留菜单内的可见键盘选择/关闭，或用小型
  battle trial 错误恢复，不再进入 PAL 001/002 叙事路线。两张截图 SHA256
  与记录相符，404 存档探测已如实披露，但不能把越界路径算本卡视觉完成。

### 历史 r1 返工提示词（已执行）

```text
你是 TEST-GLM-WAVE-N-1 唯一测试 Coding Owner。先读 AGENTS.md、
docs/phase2/READ-FIRST.md、本卡独立审核段、共同协议和 wave-N 原证据；
在原隔离分支基于 61dc0de1 返工。只改 *.glm-n.test.ts(x)、专属 typed fixture 与
wave-N 证据：去除全部双强转并证明合法输入；以合法单轴输入替换 RC4，给四枚
反控可核的正反控 Vitest 输出、目标 fullName/执行数及恢复 SHA256；重做非剧情
菜单或 battle trial 的浏览器功能证据。撤回共享 README 导航改动，留 Codex
集成时统一补。复跑 Reforge 全包、typecheck、根 lint 0/0/0、docs（导航缺行
按白名单如实报告）、git diff --check 784fb098...HEAD。产品、旧测、共享配置、
官方基线和 E2E-R4-1 路线只读；不合 main、不标 done，推送完整候选 SHA。
```

## Codex 二审（2026-09-30，r2 候选 7bcd0fcd）

候选 `7bcd0fcdc2c600b2c1ba74ce41d4d4b789b3b826`：**counter / rework**。
独立串行复跑 Reforge 259 文件/2052 测试通过、typecheck 零诊断、根 lint
2780 文件完整 0 error/0 warning/0 info、区间 diff 零诊断。docs 仅共享
README 缺 wave-N 导航；62 源冻结通过、白名单和共享 README 还原通过。
绿门不替代下列四项验收事实：

1. `menu-box.glm-n.test.ts:68`、`battle-ui.glm-n.test.ts:94`、专属
   `canvas-host.ts:72` 仍有三处 `as unknown as CanvasRenderingContext2D`。
   旧测有相同写法不构成本卡禁令豁免；必须换合法类型化外部宿主边界。
2. `battle-ui.glm-n.test.ts:249-256` 的 15 色 Palette 非现行合法输入。
   `packages/shared/src/resources.ts:31-33` 明定 256 RGB，
   `packages/reforge/src/assets.ts:67` 拒绝非 256 色，现行 battle-session
   使用验证后的 assets.palette。固定状态色索引的缺色防御臂只能登记
   unreachable，不可把短色板称为合法作者输入或覆盖收益。
3. `directed-vitest.json` 仍是 r1 的 55/55，包含 r2 已删除的 portrait pending
   与 MP 缺 slash/cursor 用例；r2 实际为 11 个测试文件、2 个 fixture、53 例。
   必须在最终代码上重生成 file/fullName/status 并统一 README 数量。
4. RC1 original/restored 哈希不是最终候选测试文件：实际
   `e2c3ebbf5f1c944e2c63d796fdad34cabfa6b9b62c00522080374e0d52418359`，
   记录却为 `bce56b5e8c7e2ba19096487d37e18ddb6d4709ff01438c69c95bfc5f6ce061e4`。
   在内存重建相同输入变异后 mutant 哈希也不符，不能认证四枚最终候选反控。
   RC2–RC4 三态哈希及正反控摘录可核，RC4 2→5 已是合法轴；最后格式化后
   重新生成四枚原始结果、执行数和三态 hash，不能复用中间文件证据。

已通过且不要求重复返工：portrait 异步 fallback/ready 在
`menu-box.status-residual.test.ts:202-229` 已证，删重正确；slash/cursor 为
必需 ImageBitmap，缺字段路径不可合法构造，删除正确。菜单新证据三张截图
SHA256 均匹配并已实际看图，读取进度空列表→Escape 返回标题相位成立；
driver 不进入剧情并硬核 __rfWorld 未挂载，scope 合格。404 存档探测与取消请求
已披露，不改写为全程 console 零错误。旧版本兼容审查 pass（未新增产品兼容层）。
本次未重做 N 源注入，哈希核对与原始日志审查已足以否定 RC1；未合 main、
未运行官方结算、未清理隔离树。

### 下一位 GLM N 窄返工提示词

```text
你是 TEST-GLM-WAVE-N-1 唯一测试 Coding Owner，当前 rework，基于原隔离分支
7bcd0fcdc2c600b2c1ba74ce41d4d4b789b3b826。先读 AGENTS.md、READ-FIRST、
本卡二审与共同协议。仅改卡面新测试/专属 fixture/wave-N 证据：去掉三处双强转，
用 typed 外部 Canvas 宿主；删除 15 色非法 Palette 覆盖轴，正常状态臂保留，
缺色防御臂按现行 256 色 loader 记 unreachable；最终代码重生成定向 Vitest JSON
和准确文件/例数；最后格式化后重跑四枚反控，交目标业务 AssertionError、正反控
退出码/执行数及与最终文件匹配的 original/mutant/restored SHA256。
已通过菜单截图/删重/README 还原保持，不重进剧情。串行复跑 Reforge 全包、
typecheck、根 lint 0/0/0、docs、git diff --check 784fb098...HEAD；共享导航仍
留 Codex 集成修。产品/旧测/共享配置/官方基线/任务卡只读，不合 main、不标 done，
推送完整 40 位新候选 SHA。
```

### 历史首轮派发提示词（已执行，非本次返工指令）

```text
你是 TEST-GLM-WAVE-N-1 的唯一测试 Coding Owner。请在独立工作树、分支
codex/glm-wave-n-reforge-host-r1 从包含本卡的最新 main 派发提交起步；生产冻结 f70db722。
先读 AGENTS.md、docs/phase2/READ-FIRST.md、本卡、
docs/testing/glm-next-triple/README.md 与 targets.json，运行 verify-targets.mjs。
完成 N01–N05 非剧情 runtime host/资源生命周期 11 源大包：逐组查真实 caller、
旧测 fullName/断言，只为合法未重复合同新增 *.glm-n.test.ts(x)、专属 typed fixture
和 wave-N 证据。至少一条真实浏览器菜单/trial 功能操作、四枚合法输入业务反控、
鲜活 Vitest JSON、Reforge 全包测试与 typecheck、根 lint 0/0/0、docs/diff 交原始结果。
禁止接 E2E-R4-1 路线、checkpoint、剧情、移动或真实 PAL 资产；产品/旧测/共享配置/
官方基线/任务卡/看板只读。main.ts 若漂移停相关组请 Codex 重冻；不合 main、不标 done。
提交推送完整 40 位 SHA，Codex 独立审核及正式覆盖结算。
```
