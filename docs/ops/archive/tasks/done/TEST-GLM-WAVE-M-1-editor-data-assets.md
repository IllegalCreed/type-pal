# TEST-GLM-WAVE-M-1 — 编辑器数据页、资源库和设计控件大包

Status: done
Closed Evidence: main 44345a45fe562b74dd3a8ec758a8b9d6e224c56e; GitHub Documentation 37143305933 + Coverage 37143305925 success (2026-10-04); finite regression admission after audit, not historical quota fulfillment.
Phase: phase2
Capability: editor-data / test-coverage
Coding Owner: GLM M（仅新增测试、专属 fixture/证据）
Reviewer: Codex（独立验收、集成和正式覆盖结算）
Visual Verification: GLM 实操取最小证据，Codex 最终复核
Branch: `codex/glm-wave-m-editor-data-r1`（独立工作树）

## 准入与前提

2026-09-30 Codex 核 `build allowed`，限纯测试。
[冻结表](../../../../testing/glm-next-triple/targets.json) M01–M07 为 **27 个互异生产源**，
[只读校验](../../../../testing/glm-next-triple/verify-targets.mjs)证与 A–K 及 L/N 目标零交集；
基础提交 `f70db72236d9cac794d40a625a89fef8c29459ae`。
本地 fast 的 1301 个未命中臂只作为排查线索，不是收益承诺。

工程前提：产品、schema、作者数据不变；测当前 canonical 数据输入在公开编辑页的
选择、编辑、取消/撤销、资源缺失和无关记录保全。原版/一阶段 N/A（本卡不以旧引擎
数据形状定义二阶段作者界面）；现行二阶段入口 `packages/editor/src/ui/DataMode.tsx:47,52,370,689,721`
显示技能/资源库等消费者；其它页逐组核 `DataMode` 或当前真实 caller。
若无 caller、旧测已证或只有非法 fixture 才可达，该轴如实登记不新增；
若观察到 schema/生成内容/产品缺陷，停对应组交 Codex，不改产品或测试 oracle 凑绿。

先读 `AGENTS.md`、[`READ-FIRST`](../../../../phase2/READ-FIRST.md)、
[共同协议](../../../../testing/glm-next-triple/README.md)、冻结表与现行旧测；
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
- GLM 交付：候选 `0b045c15e91e6b66929458dd430af15f58016b14` 已推送，
  12 个新测试文件、31 例与 wave-M 证据。Codex 独立审核：**counter / rework**，
  未合 main、未计正式覆盖。

## Codex 独立审核（2026-09-30，候选 0b045c15）

- 冻结表在候选及 main 均通过；定向 JSON 为 31/31 且 31 个不同 fullName。
  范围仅新增 12 个 `*.glm-m.test.ts(x)`、专属 fixture 与 wave-M 证据，
  排重账逐组列现行 caller/旧合同，抽查未见直接重测。独立复跑 Editor
  **493 文件/3684 测试通过**、typecheck 通过；候选区间
  `git diff --check 784fb098...HEAD` 通过。五张功能视觉截图 SHA256 匹配。
- 根 `pnpm lint` **失败**：新 `wave-M/vitest-directed.json` 有 1 个 Biome
  格式诊断，非卡面要求的 0/0/0；回执的 lint 全绿不适用于最终候选。
- `item-references.glm-m.test.ts:46,77,90,103,129` 多处 `as unknown as`；
  `ItemTab`, `BattleFieldTab`, `EnemyTab`, `SkillTab` 新测多处 `as never`
  伪造 `assetReader`/`assetBase` 等输入，`CasualtyEditor` 等也有双强转。
  共同协议明禁两者；尤其当前合法项目/资源前提不能用强转掩盖。
  请重建 typed fixture，并复核改后合同仍是现行可达输入。
- 四枚反控的当前证据均为正控 exit0、注入后目标一例
  `AssertionError` 红，runner `--self-test` 8/8；但可执行判据只检查存在
  `failureMessages`，未检查红色确为业务断言，目标 `TypeError` 也会被误判 valid
  （与 L 首轮 CC5 同类）。返工时增加非断言红拒绝及对应 self-test，再重跑四枚。
- `node scripts/docs/check.mjs` 在**最终候选**因共享
  `docs/testing/glm-next-triple/README.md` 缺 wave-M 导航行失败，非回执所写 PASS。
  共享文件在 GLM 白名单外；仍由 Codex 集成时补行，不要求 GLM 越界修。
  V2 的“Enter 不激活、Space 激活”仅作观察，尚无足够一手证据定产品缺陷，
  不随本测试波改 UI。隔离覆盖未成功产出，不可主张本包覆盖增量。

### 历史 r1 返工提示词（已执行）

```text
你是 TEST-GLM-WAVE-M-1 唯一测试 Coding Owner。先读 AGENTS.md、
docs/phase2/READ-FIRST.md、本卡独立审核段、共同协议及 wave-M 证据；
在原隔离分支基于 0b045c15 只改本卡白名单内新测/fixture/证据。
格式化 vitest-directed.json；去掉全部 as never、as unknown as，用 typed 合法
项目与资源夹具替代并复核公开 caller。反控 judge 要拒绝目标 TypeError 等
非业务断言红，增加 self-test 后重跑四枚并留新鲜原始结果。完整复跑 Editor
全包、typecheck、根 lint 0/0/0、docs、git diff --check 784fb098...HEAD；
共享 README 导航缺行如实报告，留 Codex 集成时补。产品、旧测、公共配置、
L/N 文件、官方基线只读；不合 main、不标 done，推送完整候选 SHA。
```

## Codex 二审（2026-09-30，r2 候选 b59f1738）

候选 `b59f1738f56f153a3c6d80b5f7dee1bcf27f7fae`：**独立代码验收 accept**。
新测试/fixture 已无禁用双强转或 as never；真实 blank loader/save-valid 底座、
真实 AssetBase/createEditorAssetReader 和当前 typed schema 替代伪造输入。
目录缺失 AssetId 的失败面是合法作者编辑下的可诊断引用，不造非法宿主。
定向 JSON 12 文件/31 唯一 fullName/31 passed，62 源冻结校验通过，白名单通过。
五张截图 SHA256 均匹配且实际看图：名称编辑→撤销恢复、目录键盘到立绘003
回显成立；原始 before 图片为001，README 操作描述先点击002作为中间起点，
不把截图前态改写成002。Enter/Space 仅保持观察，不随本卡改产品。

独立复跑 Editor **493 文件/3684 测试通过**、typecheck 零诊断，根 lint
**2778 文件完整 0 error/0 warning/0 info**；区间 diff 零诊断。docs 只有
共享 README 缺 wave-M 导航，Codex 隔离接收时补。反控 self-test **10/10**，
新增 TypeError/混合错误拒绝已闭合；独立执行四枚反控 **4/4 valid**，
各正控4/2/3/2例全绿，反控每枚仅目标 AssertionError 红且 exit1。
独立结果落临时目录 `codex-m-counters-Q9azOE/evidence.json`，未覆盖 GLM 证据；
副本删除、候选工作树保持干净。旧版本兼容审查 pass：未新增产品兼容路径。

接收至 `codex/glm-lmn-acceptance-r1`，与 L 并集后仍须完整串行
check/官方 ratchet/protected fast；当前 review，未计正式收益、未清树。
无下一位 GLM 返工提示词；下一位 Codex 完成统一门和正式结算后才能 done。

并集最终门：完整 check 10715 例及硬性静态门通过，但官方 ratchet exit1，
migrate statements/branches/lines 比率回退；baseline 未改，protected fast 未执行。
详见[统一记录](../../../../testing/glm-next-triple/codex-lm-union-review.md)。
保持 review，测试未合 main、未正式结算、未清树；不把存量 migrate 问题转给 GLM M。

### 历史首轮派发提示词（已执行，非本次返工指令）

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
