# SAVE-ISOLATION-1 - 工程与工作区存档隔离

Status: blocked
Phase: phase2
Capability: X1（审计 A-01 修复，不新增能力格）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: both
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: main
Revision: r1
Evidence Baseline: 5462d01a

## 目标与边界

不同工程不能互相覆盖快速、自动、手动存档；存档列表、缩略图、计数与载荷必须使用同一隔离身份。
本卡处理审计 A-01，不重开 X1 历史验收，不合并成整个存档系统重写。
坏载荷预检另见 [SAVE-PREFLIGHT-1](SAVE-PREFLIGHT-1-current-save-restore-preflight.md)。

- 范围内：存储命名空间、运行壳与编辑器试玩入口的身份传递、真实 IndexedDB 读写回归。
- 范围外：编辑器作者文件写盘（A-02/03）、第一阶段存档、云存档、存档 UI 重设计、D-05 技能试放状态策略。
- 不修改 SAVE8/content20 载荷形状、工程 manifest 或迁移产物；不新增旧键双读/双写或静默迁移。
- 不删除用户浏览器数据库；旧开发存档如何退出当前读取域必须在最终方案中明示，不将清库当作实现捷径。

## 前提真值门

### 一句话前提

当前同源两个合法工程的存档 writer 都使用同一个数据库和 slot key；载荷中的 projectId 只防止错读，不能防止覆盖。

| 维度 | 真值 | 一手证据 |
|---|---|---|
| 原版 / primary source | 原版单游戏槽位不能决定编辑器多工程身份。IndexedDB 对象仓库中同键记录唯一，put 的正常覆盖由键决定，不检查应用载荷 projectId。 | [IndexedDB §2.2](https://w3c.github.io/IndexedDB/#object-store-concept)、[§6.1](https://w3c.github.io/IndexedDB/#object-store-storage-operation) |
| 第一阶段 | 单游戏使用 `type-pal/save-slots` 和数字槽；它没有现代编辑器工作区身份，不能直接照搬。 | `packages/game/src/core/save/indexed-db.ts:16`、`:64`；`packages/game/src/core/save/api.ts:14` |
| 当前二阶段 | 固定 `type-pal-saves`、三 store 均以 slotId 写入；main 无参数创建 Store。 | `packages/reforge/src/save/store.ts:34`、`:60`；`packages/reforge/src/main.ts:584` |
| 当前试玩身份 | 本地 workspaceId 已被校验并解析为目录句柄，随后只把 project 传给 bootGame；该身份尚未传给 SaveStore。 | `packages/editor/src/play.ts:33`、`:45`、`:53`；`packages/editor/src/core/handle-store.ts:7`；`packages/editor/src/core/play-workspace.ts:3` |
| 本任务目标 | 不同 projectId 必须隔离。相同 projectId 的不同 workspace 是否也隔离仍待产品裁决，不能默认当成已批准。 | 用户已批准审计后存档安全修复顺序；[审计总收口的产品边界](../audits/pre-e2e/summary.md#需要产品选择的边界) |

### 直接复现（2026-09-06）

运行 `node --import tsx docs/ops/audits/pre-e2e/probe-save-boundaries.mjs`：
A 先写 quick，B 后写 quick；两个真实 IndexedDbSaveStore 都打开 `type-pal-saves@1`，
meta/payload/thumb 都写 `quick`；A 读出的 projectId 从 A 变为 B，随后 A 的 preflight 拒绝 B。
探针只替换 IndexedDB 外围为内存边界，并在启动时拒绝既有真实 IndexedDB；没有写用户数据库。
探针附带的 A-04/05/06 第一阶段观察不属于本卡修复范围。

### 反证与替代解释

- 最强替代解释：projectId 校验已经隔离存档；不同端口自然隔离。前者只防错读，后者确实成立但不覆盖编辑器同源试玩。
- 可证伪观察：若真实同源、相同 slot 的 A/B 写入采用不同存储地址且 A 的载荷/元数据/缩略图保持不变，则 A-01 前提失效。
- runtime 分类：根因位于存储键与入口身份传递，不是 scene、entry 或 script 分类。
- 原版理解：原版/一阶段单游戏不定义现代多工程共用策略，不以原版槽位数推导命名空间。
- 提取/解码：用两个内存构造的合法工程即可复现，与 PAL 提取或迁移无关。
- 审计模型：键由真实 store 选择，桩只执行按数据库/store/key 寻址；仍须 build 期以真实浏览器 IDB 复验。

### 待用户裁决

建议：**同一工程的不同本地工作区也各自保存试玩进度；同一工作区重开仍使用自己的存档。**
代表：PAL 开发基线和 `ui_samples` 评审沙盒即使 manifest.id 都为 pal，也互不覆盖。
另一选择是所有同 projectId 工作区共用进度。两者不能由 Agent 偷换。

`before -> after`：同源共用槽 → 至少按工程隔离；是否再按现有 workspaceId 隔离由用户选择。
2026-09-06 已向用户提出选择，**当前 pending**；异步问题的预选项不构成批准。
因此本卡保持 blocked，仅记录证据与决策边界，尚未制定依赖该选择的详细存储/API 方案。

## 上下文锚点

- [READ-FIRST](../../phase2/READ-FIRST.md) 第 5/8/9/11 条；不使用数组下标身份、不擅改存档界面、不复活旧兼容链。
- [一阶段知识收获 X9](../../phase2/reference/phase1-knowledge-harvest.md#x9-存档版本化迁移--读档归一化)：作为历史经验，不把其中旧“已完成”代替本轮证据。
- [数据安全审计 A-01](../audits/pre-e2e/README.md#a-01--不同项目的快速自动存档会互相覆盖)。
- `packages/reforge/src/save/types.ts:10`：auto/quick/m01..m28 与 30 槽 UI 合同保持。
- `packages/reforge/src/boot.ts:9`、`packages/editor/src/play.ts:33`：独立壳与本地试玩入口须分别覆盖。
- `packages/editor/src/core/workspace-context.ts:95`、`packages/editor/src/core/handle-store.ts:156`：复用已存在的持久工作区身份，不另造临时 ID。
- `packages/reforge/src/save/store.test.ts:40`：现有主要测试仅覆盖 MemorySaveStore，不能作为 IDB 隔离证明。

## 验收矩阵（身份策略批准后细化，不授权 build）

| 情况 | 必须验证 |
|---|---|
| A/B 工程同源同槽 | 各自 payload、meta、thumb、列表与存档次数不串；quick/auto/manual 都覆盖 |
| 同工程同工作区重开 | 继续读自己的存档，稳定身份不因页签/刷新变化 |
| 同工程不同工作区 | 按用户裁决；明确 PAL 基线/沙盒与目录副本的预期 |
| 同工程多入口 | 不按 entryId/sceneId 分库，不破坏主线/DLC 同工程存档浏览合同 |
| 非法/缺失工作区 | 沿现有 fail-loud 合同，不退回同名 HTTP 工程或共享空间 |
| 部分写失败/事务 abort | 不报告成功，三块数据一致；不因隔离重写破坏原子性 |
| 旧未分区开发键 | 不静默回读、迁移、清库；按批准方案给出明确退出边界 |

要求新的 scope/key 纯函数尽量 100% 分支，真实 store 与入口接线有独立回归；全仓覆盖率只升不降。
功能性最小浏览器验证由 Codex 用专用测试 origin/数据库执行，不破坏现有用户存档。
多工程 checkpoint 与刷新恢复登记到 R4/Q1；不要求用户运行故障注入或技术对账。

## 推进签字

### 进入 build 前

- Codex：A-01 覆盖缺陷 premise verified（上述真实 store 探针、`store.ts:60`）；目标中的同 ID 工作区合同 pending；design pending。
- Kimi：premise pending；design pending。
- GLM：premise pending；design pending。
- 独立反证审查：pending，至少一席须直接读规范与 store/入口代码。
- 缺签豁免：无。
- build 准入结论：blocked（产品选择未定且三签未齐）。

### 进入 done 前

- Codex：pending。
- Kimi：pending。
- GLM：pending。
- done 准入结论：blocked。

## 实现 / 视觉 / 验收

未开始实现；未修改任何产品或存档文件。视觉验证未执行，安排在 build 期最小功能验证；Q1/R4 集中验证保留。
38 项既有相关测试已通过，只是证实当前测试基线，不代表 A-01 已修复。
无 Agent 缺席/额度代班；用户尚未验收本修复。

## 交接日志

- 2026-09-06 Codex：复读 current-only 与工作区身份合同，复跑 A-01 内存边界反例；提出同工程不同工作区的产品选择。

## 下一位 Agent 提示词

无下一位 Agent 提示词，等待用户身份策略裁决；不要让 Kimi/GLM 对尚未确定的产品选择空签。
裁决落卡后，再一次性提供两席对同一 revision 的独立设计审查提示词。
