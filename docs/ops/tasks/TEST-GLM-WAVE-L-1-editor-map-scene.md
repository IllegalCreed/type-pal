# TEST-GLM-WAVE-L-1 — 地图、场景、精灵与印章创作大包

Status: build
Phase: phase2
Capability: editor-authoring / test-coverage
Coding Owner: GLM L（仅新增测试、专属 fixture/证据）
Reviewer: Codex（独立验收、集成和正式覆盖结算）
Visual Verification: GLM 实操取最小证据，Codex 最终复核
Branch: `codex/glm-wave-l-editor-map-r1`（独立工作树）

## 准入与前提

2026-09-30 Codex 核 `build allowed`，限纯测试。
[冻结表](../../testing/glm-next-triple/targets.json) L01–L06 为 **24 个互异生产源**，
[只读校验](../../testing/glm-next-triple/verify-targets.mjs)证与 A–K 目标及 M/N 零交集；
基础提交 `f70db72236d9cac794d40a625a89fef8c29459ae`。
本地 fast 逐文件 1155 个未命中臂只是选题池，不承诺可达收益。

工程前提：本卡不改变产品行为，只从当前合法作者操作观察公开 UI、命令结果、撤销/取消和资源边界。
原版/一阶段机制真值 N/A（不测剧情、碰撞或战斗）；一阶段已有对应的可见形态仍按
[`READ-FIRST`](../../phase2/READ-FIRST.md) 铁律 8，不能从源码臆造新形态。
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

验收按[共同协议](../../testing/glm-next-triple/README.md)：六组逐行
caller→旧 fullName/断言→新证或不写理由，至少四枚有效业务反控，
Editor 定向/相邻及全包 `env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor test`、
`typecheck`、根 `pnpm lint` 0/0/0、docs/diff 零诊断。GLM 只推隔离候选，不合 main、
不更新官方基线、不标 done；Codex 独立验收后收口。用户产品验收 N/A（纯测试）。

## 推进记录与交接

- Codex 前提/范围：上述只读当前入口、A–K 去重和冻结校验已核；纯测试 `build allowed`。
- GLM 交付/自验：pending。Codex accept/counter：pending。done：blocked 待独立验收。

### 下一位 GLM 提示词

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
