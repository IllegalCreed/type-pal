# TEST-GLM-WAVE-M-1 — 编辑器数据页、资源库和设计控件大包

Status: build
Phase: phase2
Capability: editor-data / test-coverage
Coding Owner: GLM M（仅新增测试、专属 fixture/证据）
Reviewer: Codex（独立验收、集成和正式覆盖结算）
Visual Verification: GLM 实操取最小证据，Codex 最终复核
Branch: `codex/glm-wave-m-editor-data-r1`（独立工作树）

## 准入与前提

2026-09-30 Codex 核 `build allowed`，限纯测试。
[冻结表](../../testing/glm-next-triple/targets.json) M01–M07 为 **27 个互异生产源**，
[只读校验](../../testing/glm-next-triple/verify-targets.mjs)证与 A–K 及 L/N 目标零交集；
基础提交 `f70db72236d9cac794d40a625a89fef8c29459ae`。
本地 fast 的 1301 个未命中臂只作为排查线索，不是收益承诺。

工程前提：产品、schema、作者数据不变；测当前 canonical 数据输入在公开编辑页的
选择、编辑、取消/撤销、资源缺失和无关记录保全。原版/一阶段 N/A（本卡不以旧引擎
数据形状定义二阶段作者界面）；现行二阶段入口 `packages/editor/src/ui/DataMode.tsx:47,52,370,689,721`
显示技能/资源库等消费者；其它页逐组核 `DataMode` 或当前真实 caller。
若无 caller、旧测已证或只有非法 fixture 才可达，该轴如实登记不新增；
若观察到 schema/生成内容/产品缺陷，停对应组交 Codex，不改产品或测试 oracle 凑绿。

先读 `AGENTS.md`、[`READ-FIRST`](../../phase2/READ-FIRST.md)、
[共同协议](../../testing/glm-next-triple/README.md)、冻结表与现行旧测；
特别排重 A 的 DataMode/表单、F 的 sprite 上传与 B 的会话测试。
不接真实资产导入/发布、PAL 内容改写、E2E 剧情或新 UX 形态裁决。

## 七组范围与可证伪结果

| 组 | 工作流 | 至少核的业务结果 |
|---|---|---|
| M01 | 技能/成长/战场页 | 当前合法引用和编辑回显，无关记录不变 |
| M02 | 道具/使用效果/炼化/商店 | 命令选择与草稿提交/取消，不造旧版兼容数据 |
| M03 | 敌人/队伍/死亡脚本/伤亡 | 稳定身份、引用提示和撤销保真；机制真值争议停组 |
| M04 | 毒/变量/引用索引 | 合法重命名/选择后引用结果准确，坏引用可诊断 |
| M05 | 战斗精灵库/内联预览 | 小合法资源元数据、选择/失败/释放，不发布资产 |
| M06 | 工程资源工作台/音图 | 选择、失效、取消与资源 IO 反馈，不动真实工程 |
| M07 | 重排/选择/导航/虚拟列表 | 键盘与鼠标状态/可达性、排序稳定、卸载清理 |

写入白名单只含冻结源同目录 `*.glm-m.test.ts(x)` 新文件、
`packages/editor/src/__tests__/glm-m/**` typed fixture、
`docs/testing/glm-next-triple/wave-M/**` 证据/反控；L 的地图/印章文件也只读。
功能视觉至少两条：一条数据记录编辑/撤销，一条资源或控件键盘选择/失败恢复；
保存实际浏览器操作、视口、截图 SHA256、console。任何用户可见行为选择只记录
before→after 供 Codex/用户裁决，本测试包不预批产品修改。

验收按共同协议：七组排重账、至少四枚有效业务反控、鲜活 Vitest JSON，
Editor 定向/相邻及全包 `env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor test`、
`typecheck`、根 `pnpm lint` 0/0/0、docs/diff 零诊断。GLM 不合 main、不改官方基线、
不标 done；纯测试用户验收 N/A，Codex 独立核定。

## 推进记录与交接

- Codex 前提/范围：当前入口、A–K 去重和冻结校验已核；纯测试 `build allowed`。
- GLM 交付/自验：pending。Codex accept/counter：pending。done：blocked 待独立验收。

### 下一位 GLM 提示词

```text
你是 TEST-GLM-WAVE-M-1 的唯一测试 Coding Owner。请在独立工作树、分支
codex/glm-wave-m-editor-data-r1 从包含本卡的最新 main 派发提交起步；生产冻结 f70db722。
先读 AGENTS.md、docs/phase2/READ-FIRST.md、本卡、
docs/testing/glm-next-triple/README.md 与 targets.json，运行 verify-targets.mjs。
完成 M01–M07 数据页/资源/控件 27 源大包：逐组查真实 caller 与旧测 fullName/断言，
只为合法未重复合同新增 *.glm-m.test.ts(x)、专属 typed fixture 和 wave-M 证据。
两条真实浏览器功能视觉、至少四枚合法输入业务反控、鲜活 Vitest JSON、Editor 全包测试与
typecheck、根 lint 0/0/0、docs/diff 必须交原始结果。真 bug/schema/产品选择停对应组报告。
产品/旧测/公共 fixture/配置/基线/任务卡/看板、L/N 文件、真实项目资产只读；
不合 main、不标 done。提交推送 40 位 SHA，Codex 独立审核与正式覆盖结算。
```
