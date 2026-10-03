# TEST-GLM-WAVE-L-1 — 地图、场景、精灵与印章创作大包

Status: done
Closed Evidence: main 44345a45fe562b74dd3a8ec758a8b9d6e224c56e; GitHub Documentation 37143305933 + Coverage 37143305925 success (2026-10-04); finite regression admission after audit, not historical quota fulfillment.
Phase: phase2
Capability: editor-authoring / test-coverage
Coding Owner: GLM L（仅新增测试、专属 fixture/证据）
Reviewer: Codex（独立验收、集成和正式覆盖结算）
Visual Verification: GLM 实操取最小证据，Codex 最终复核
Branch: `codex/glm-wave-l-editor-map-r1`（独立工作树）

## 准入与前提

2026-09-30 Codex 核 `build allowed`，限纯测试。
[冻结表](../../../../testing/glm-next-triple/targets.json) L01–L06 为 **24 个互异生产源**，
[只读校验](../../../../testing/glm-next-triple/verify-targets.mjs)证与 A–K 目标及 M/N 零交集；
基础提交 `f70db72236d9cac794d40a625a89fef8c29459ae`。
本地 fast 逐文件 1155 个未命中臂只是选题池，不承诺可达收益。

工程前提：本卡不改变产品行为，只从当前合法作者操作观察公开 UI、命令结果、撤销/取消和资源边界。
原版/一阶段机制真值 N/A（不测剧情、碰撞或战斗）；一阶段已有对应的可见形态仍按
[`READ-FIRST`](../../../../phase2/READ-FIRST.md) 铁律 8，不能从源码臆造新形态。
二阶段现行入口 `packages/editor/src/ui/App.tsx:195,2182` 调用 `MapMode`；
各叶组件/命令以冻结表路径和现行导出为准。最强替代解释是旧测试已精确证明、
某分支只有非法状态可达或真实缺陷尚未定夺；出现这些观察就登记
`existing-proof/unreachable/blocked`，不写伪新测。

先读 `AGENTS.md`、`docs/phase2/READ-FIRST.md`、
`docs/testing/glm-next-triple/README.md`、冻结表及对应旧测试，
特别排重历史 A 的编辑器表单、B 的会话和 F 的主壳/预览；
不得接 `EDITOR-SCENE-FACING-1` 的朝向产品修复或 E2E-R4-1 的剧情路线。

## 六组范围与可证伪结果

| 组 | 工作流 | 至少核的业务结果 |
|---|---|---|
| L01 | 地图选择/检查器 | 合法选区、切换、失效后选择与只读回显一致 |
| L02 | 场景画布/舞台/命令 | 显式对象身份、绘制输入与取消/撤销不误写其它对象 |
| L03 | 图块/地图编辑/资源 | 有界编辑与资源缺失提示，命令逆操作和未触区域不变 |
| L04 | 世界精灵/动作 | 稳定 id、动作切换、非法引用反馈与预览释放 |
| L05 | 印章草稿/模板/选择器 | 草稿→提交/取消、组变换前后数据与选择一致 |
| L06 | 印章组命令/所有权 | 顺序、变换、撤销与归属不串写 |

这些是审计轴，不是按未命中臂凑用例的额度。写入白名单只含冻结源同目录
`*.glm-l.test.ts(x)` 新文件、`packages/editor/src/__tests__/glm-l/**` typed fixture、
`docs/testing/glm-next-triple/wave-L/**` 证据/反控；产品、旧测和共享文件只读。
功能视觉至少两条：地图选区/取消与精灵或印章编辑回显，记录实际浏览器 URL、
视口、操作、截图 SHA256、console；不能看图则标未证，不能用测试 DOM 代替。

验收按[共同协议](../../../../testing/glm-next-triple/README.md)：六组逐行
caller→旧 fullName/断言→新证或不写理由，至少四枚有效业务反控，
Editor 定向/相邻及全包 `env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor test`、
`typecheck`、根 `pnpm lint` 0/0/0、docs/diff 零诊断。GLM 只推隔离候选，不合 main、
不更新官方基线、不标 done；Codex 独立验收后收口。用户产品验收 N/A（纯测试）。

## 推进记录与交接

- Codex 前提/范围：上述只读当前入口、A–K 去重和冻结校验已核；纯测试 `build allowed`。
- GLM 交付：候选 `e2b3f43770c9968d72b16a34f3d0173a271cc4ca`（派发 `784fb098`），
  15 个新测试文件、67 例及 wave-L 证据；未合 main。Codex 独立审核：**counter / rework**，
  详见下节；`done` 未准入。

## Codex 独立审核（2026-09-30，候选 e2b3f437）

1. 范围及合同：候选只新增 15 个 `*.glm-l.test.ts(x)`、专属 typed fixture 与 wave-L
   证据，无产品/旧测/官方基线修改；`verify-targets.mjs` 在候选及当时 main 均通过。
   15 文件 67 fullName 唯一；逐组抽查公开 caller、旧测断言和新断言，未见直接重测，
   L04 深链疑似缺陷也未写绿测冻结。但 `StampTemplateDialog.glm-l.test.tsx:159`
   使用禁止的 `as unknown as [string]`，必须改为类型化 mock/取参。
2. 反控：五枚恢复后产品源 SHA256 均与 `counters.json` 一致；正控均 exit0。
   CC1–CC4 注入后仅各自目标 fullName 的业务断言红、exit1，**4 枚有效**，达到最低四枚。
   CC5 注入后虽仅目标用例红，却先抛 `TypeError: Cannot read properties of undefined
   (reading 'visualSlots')`，不是业务断言红；不得写 5/5 valid，须更换反控或改为
   4/5 并保留原始日志。日志为证据审查，未重做五次源变异。
3. 独立复跑：`env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor test`
   **496 文件/3720 测试通过**；同过滤器 `typecheck` 通过；`git diff --check` 通过。
   但根 `pnpm lint` **失败**：新 `wave-L/vitest-directed.json` 有 1 个 Biome 格式诊断，
   `lint-zero.mjs` 报 errors 1 / diagnostics 1，非 0/0/0。GLM 回执的 lint 全零
   不适用于最终候选。`StampTemplateDialog.glm-l.test.tsx` 的正控/全包输出还持续出现
   React `act(...)` 环境警告，应修测试环境并保留真实输出，不能以 test exit0 隐去。
4. 功能视觉两条 5 张截图 SHA256 均匹配回执，地图选区/Esc 与精灵源帧 #2 的
   画面回显已核；但浏览器 console 逐条记录未采集，不能据“无 overlay”宣称
   console 归零。补可核的 console 证据，或明确此验收轴未证。
5. `node scripts/docs/check.mjs` 在候选仅因共享
   `docs/testing/glm-next-triple/README.md` 缺 wave-L 导航行失败。该共享文件在 GLM
   白名单外，**不要求 GLM 越界修**；Codex 待接收集成时补一行并复跑 docs 门。
   隔离覆盖 +133 / 同分母 5381 仅是候选对照；正式结算待 main 并集实测，
   本轮不运行官方 ratchet/受保护 fast、不清理分支或工作树。

产品项单列：17 层合法 callScript 链的公开预览会从实际 #1→#2 错报为脚本中
不存在的「检测到 #0」，Codex 用临时 Vitest 探针独立复现 15/16/17 层差异，
已立草案 `EDITOR-SPRITE-DEEP-PREVIEW-1`；不随 L 测试包修产品。O1 Esc 后选区
Inspector 消失但底部仍写「已选择 1 个视觉槽、1 个格点」，截图及
`MapMode.tsx:2178-2187,2646` / `EditorDiagnosticsBar.tsx:82-87` 相符；
已立 `EDITOR-MAP-SELECTION-NOTICE-1` 草案供用户判断“最近事件”还是“当前状态”，
不把产品取舍混入测试返工。

### 历史 r1 返工提示词（已执行）

```text
你是 TEST-GLM-WAVE-L-1 测试 Coding Owner，请在原隔离工作树/分支
codex/glm-wave-l-editor-map-r1 基于候选 e2b3f437 返工。先读本卡 Codex 独立审核段、
AGENTS.md、docs/phase2/READ-FIRST.md、docs/testing/glm-next-triple/README.md
及 wave-L 原始日志。只改卡面白名单内新测试与 wave-L 证据：
1) 格式化 vitest-directed.json，完整重跑 pnpm lint 并交 lint-zero.mjs 0/0/0 原始输出；
2) 去掉 StampTemplateDialog 新测的双强转，修 act 环境警告，不降规则、不吞 console；
3) CC5 更换为真正仅目标业务断言红的单轴变异，或如实改记 4/5 valid，保留旧日志；
4) 为两条功能视觉补可核 console 证据，无法获取则明确未证，不伪称归零；
5) 复跑 Editor 全包、typecheck、docs、diff，并提交最终候选 SHA。
共享 glm-next-triple/README.md 仍只读，缺导航由 Codex 集成时处理；
不得修改产品/旧测/官方基线/任务卡/看板，不合 main、不标 done。
```

### 历史首轮派发提示词（已执行，非本次返工指令）

```text
你是 TEST-GLM-WAVE-L-1 的唯一测试 Coding Owner。请在独立工作树、分支
codex/glm-wave-l-editor-map-r1 从包含本卡的最新 main 派发提交起步；生产冻结 f70db722。
先读 AGENTS.md、docs/phase2/READ-FIRST.md、本卡、
docs/testing/glm-next-triple/README.md 与 targets.json，运行 verify-targets.mjs。
完成 L01–L06 地图/场景/精灵/印章 24 源大包：先逐组查真实 caller 和旧测 fullName/断言，
再只为合法未重复合同新增 *.glm-l.test.ts(x)、专属 typed fixture 和 wave-L 证据。
两条真实浏览器功能视觉、至少四枚合法输入业务反控、鲜活 Vitest JSON、Editor 全包测试与
typecheck、根 lint 0/0/0、docs/diff 必须交原始结果。真 bug/真值争议停对应组报告。
产品/旧测/公共 fixture/配置/基线/任务卡/看板/E2E 只读；不改朝向产品行为，
不合 main、不标 done。提交推送 40 位 SHA，Codex 独立审核及官方覆盖结算。
```

## Codex 二审（2026-09-30，r2 候选 4547c8c3）

GLM 已逐项修复首轮实质问题：`vitest-directed.json` 为 67/67 且 67 个唯一
fullName；五枚恢复后产品源 hash 均匹配，替换的 CC5b 是目标业务
`AssertionError`，旧无效日志保留；禁用双强转已去除，单文件 `act(...)` 警告归零；
两条功能视觉补了操作窗口 console error/warn/未捕获异常 0 条，初始加载期明确未证。
Codex 独立复跑 Editor **496 文件/3720 测试**、typecheck 与根 lint
**0 error/0 warning/0 info** 全过，冻结核验、截图 SHA256 均通过。

但候选仍**不能接收**：执行 `git diff --check 784fb098...4547c8c3`，
10 份 CC1–CC5 正反控日志、2 份 CC5b 正反控日志及
`logs/stamp-dialog-act-clean.txt` 共 **13 处 `new blank line at EOF`**。
回执所称 `git diff --check` 只检查了干净工作树，没有检查已提交候选区间；
卡面要求 diff 零诊断，故维持 `counter / rework`。候选 docs 门仍只因共享
README 缺 wave-L 导航行失败，此项仍由 Codex 在集成时补，不让 GLM 越界。
本轮不合 main、不运行正式覆盖结算、不清理隔离树。

### 历史 r2 返工提示词（已执行）

```text
你是 TEST-GLM-WAVE-L-1 唯一测试 Coding Owner。先读 AGENTS.md、
docs/phase2/READ-FIRST.md、本卡二审和 wave-L 原证据。在原隔离分支
codex/glm-wave-l-editor-map-r1 基于 4547c8c3 只修本卡白名单内 13 份日志
文件尾空行（保留日志内容与旧反控历史），用
git diff --check 784fb098...HEAD 核整个已提交候选区间零诊断，勿只查工作树。
复跑根 lint、Editor 全包/typecheck、docs（共享导航缺行如实报告），交完整
40 位新候选 SHA。产品、旧测、共享 README、官方基线/任务卡只读；
不合 main、不标 done。共享导航仍由 Codex 集成时修。
```

## Codex 三审（2026-09-30，r3 候选 69b56cc3）

候选 `69b56cc388bbd0c0b7632d7ed59154461dd0410b`：**独立代码验收 accept**。
相对 r2 的 packages 树零改动，复用二审相同测试代码的独立 Editor
496 文件/3720 测试与 typecheck 通过证据；r3 只维护日志/回执。
本次独立 `git diff --check 784fb098...HEAD` 零诊断，13 处尾空行全部闭合；
根 lint 完整报告 2780 文件、0 error/0 warning/0 info；62 源冻结校验通过。
候选 docs 只剩共享 README 的 wave-L 导航项，Codex 已在隔离接收树补行。
五枚业务反控、截图与操作窗口 console 的二审结论保持，初始加载期未证不改写。
旧版本兼容审查 pass：测试/证据范围未新增产品兼容路径。

先接收至 `codex/glm-lmn-acceptance-r1`，不抢写正在验证的主树；尚未完成
统一 `check → 官方 ratchet → protected fast`，故保持 review，未记正式收益、未清树。
GLM 无需继续返工；下一位为 Codex，完成并集门后才能 done。

并集最终门：完整 check 10715 例及硬性静态门通过，但官方 ratchet exit1，
migrate statements/branches/lines 比率回退；baseline 未改，protected fast 未执行。
详见[统一记录](../../../../testing/glm-next-triple/codex-lm-union-review.md)。
保持 review，测试未合 main、未正式结算、未清树；不把存量 migrate 问题转给 GLM L。
