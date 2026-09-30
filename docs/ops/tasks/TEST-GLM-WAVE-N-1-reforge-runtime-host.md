# TEST-GLM-WAVE-N-1 — Reforge 非剧情运行时宿主与资源生命周期大包

Status: build
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
- GLM 交付/自验：pending。Codex accept/counter：pending。done：blocked 待独立验收。

### 下一位 GLM 提示词

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
