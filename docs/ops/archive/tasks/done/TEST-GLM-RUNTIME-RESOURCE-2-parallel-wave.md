# TEST-GLM-RUNTIME-RESOURCE-2 — 第二对话运行时与资源七批补测

Status: done
Owner: GLM 第二对话（受委派测试贡献者）
Reviewer: Codex（独立验收与集成）
Phase: ops（shared/pal-extract 编解码；reforge/migrate 当前二阶段接口）
Capability: coverage / runtime-presentation / resource-leaves
Visual Verification Timing: dev-functional（隔离固定输入绘制，不走剧情）

## 授权与目的

2026-09-28 用户明确要求为 GLM 再开一大批任务，**两个对话同时做，分支和工作树分别隔离**。
本卡是第二对话的 **28 组 / A–G 七批**，每四组固定候选并推送，可继续下批。
第一对话的 [32 组叶层/编辑器包](TEST-GLM-LEAF-WORKFLOWS-1-thirty-two-groups.md)照常继续，
不挪其分支、不读写其进行中的文件；Kimi 的 20 目标也独立。两条 GLM 队列合计 60 组，不互相审签。

生产冻结 `f6878b3cd18d916d3cac8aba3e50dc8c70556a2c`（对 `29e76fe6` 产品/scripts 无变更）。
分支 `codex/glm-runtime-resource-r1`，已备好工作树
`/Users/zhangxu/.codex/worktrees/glm-runtime-resource/type-pal`；不得借 main、GLM 第一对话、Kimi 或 E2E 树。
准确目标/newTest/hash 在[冻结表](../../../../testing/archive/legacy/batches/glm-runtime-resource-wave/targets.json)。

## 前提真值门

- 工程前提：62 个源码目标与 GLM 第一队列、Kimi 主目标集合零交集，且新增测试路径均未占用。
  只增加当前公开合同的回归，不新增产品行为或改兼容政策。
- 统计真值：复用既有正式 fast LCOV（9,746 测试 / 730 文件），未重跑盘点。
  冻结表的 `wholeFileTotals` 是选题文件汇总，**不等于本卡授权/可达/承诺增量**。
  特别是 R28，源码全文件 353 未命中臂不归 GLM 全包；只准入
  `collectSourceEntrySites:545–651`（函数范围现有 0/31 臂、0/39 行）。
- 编解码一手依据：shared `rle.ts/rle-encode.ts`；pal-extract `events/recompile.ts:11` 与
  `disasm.ts:36` 的真实字节接口，`resources/parsers/ball.ts` 的头部/帧处理。
  第一阶段要求保持字节忠实，按 [engineering-notes §1.2/§2.3](../../../../phase1/engineering-notes.md)
  调真实解码器，不能用自己写的模拟算法充当测试对象。合成小字节样本不是“原版实测”。
- 二阶段一手依据：`menu/item-list.ts` 的 320 逻辑坐标/裁剪合同，`battle/settlement.ts:47/85` 的
  屏幕构造和绘制，`battle-trial-config.ts` 的我方最多三人，`project-map.ts:47/208` 的合法纯构造/编辑，
  各迁移纯函数的当前调用域。旧引擎只用于已存在 UX/资源格式依据，不复制其内部机制。
- before → after：生产、存档、资产与 UI 不变；新增自包含测试、明确范围的绘制证据。
- 最强替代解释：fast 空白可能只是已有 full-only/PAL 测试，或目标是编译防御/旧测试跨文件已覆盖。
  贡献须拆分“新合同”与“已有合同自包含接入 fast”，不假称发现新业务；未定政策不造答案。
- 停止线：新机制/格式、迁移写盘、复杂场景竞态或只能访问私有/ForTest 入口才能完成的族，登记后继续
  其它组。合法业务错误交 Codex 单独修，不在本卡改产品。

## 文件白名单与并行所有权

- 新测试：targets.json 的 62 个 `newTest`；无新合同无需凑文件。
- 辅助：四包各自 `src/__tests__/glm-runtime-resource/**`，只放本卡 fixture/端口替身。
- 本包工具、回执、诊断、最小浏览器宿主：`docs/testing/archive/legacy/batches/glm-runtime-resource-wave/**`。
  Codex 冻结表只读；GLM 交 receipt/evidence，不改派发事实。
- 禁改产品、旧测试、官方配置/基线/依赖/锁、AGENTS、任务卡/看板/公共索引、别的对话文件。
- 禁止执行 extract、migrate、bake、publish/commitTransaction；不写正式 `projects/pal`、`data/raw`、
  `data/extracted`、迁移 baseline、存档。测试 FS 仅自己的 mkdtemp，函数名含 materialize 不代表可以执行 CLI。
- 不合另一对话分支，不共享新增 fixture，不替他修复，不能在主工作树切分支。生产被 main 新修复影响时
  只报具体源 hash 差异，由 Codex 排期适配，不自己跨树同步。
- Codex 的 E2E001/002、main 总壳、对话/移动/脚本执行与 battle-core/session 不在本卡；
  不新增角色换装/外观规则，不把当前精灵映射测试解释为换装实施。

## 验证节奏

详见[工作包](../../../../testing/archive/legacy/batches/glm-runtime-resource-wave/README.md)。

1. 每批定向新增 + 相邻、涉及包 typecheck、精确新增文件 Biome error/warning/info 全零、docs/diff。
2. 默认单 worker、单测试进程；只在自己的 checkout 操作，不能终止他人的测试/服务。
3. 每批约两针代表业务反控，工具共用一套严判据；真实业务红、同输入深快照、源 hash 不变。
4. 四项固定输入视觉取证只对已声明的绘制/解析范围，不能冒充游戏通关/战斗计算或音频听感。
5. 本队列**不与两个已有队列争抢全包/覆盖率**：GLM 只交局部对照 config/命令，不自行跑全仓或
   四包大覆盖；包全测、覆盖对照与 check → ratchet → 受保护 strict-fast 由 Codex 独立接收时串行统一。
6. 七批分别交付固定 SHA，不需等前批审完；一族卡住留最小反例继续其它组。
   收口前必须有真实独立验收和统一质量门，候选不得提前计入官方覆盖率。

## 当前模式推进记录

- Codex 前提/范围：verified；62 源 hash、28 组、新测试路径和跨队列零交集已核；R28 窄准入明确。
- build 准入：**build allowed（仅新增测试/专属证据）**，2026-09-28。
- Coding Owner：GLM 第二对话；第一对话继续原卡，两者都由 Codex 独立验收。
- 贡献者交付：A–G 与返工候选 `272712323ed3657a4b1d1a33f3a887261814312d` 已推送。
- Codex 独立接收：2026-09-29 `accept`，四项历史返工已闭合；见最终验收。
- 用户产品验收：N/A，本卡不改产品；需新产品取舍时另提。
- done 准入：**done allowed**，纯测试包用户产品验收 N/A。

## 交接日志

- 2026-09-28 Codex：按用户“两对话并行”授权建立第二队列，不迁走已有 GLM/Kimi 新提交。
  基于当前 Vitest/pnpm 配置冻结目标，不为排任务重跑覆盖；纯渲染与业务执行、合成样本与原版证据分栏。
- 2026-09-29 Codex：独立审核实际候选 `fed0a7869`，工作树干净；62/62 产品源 SHA256 匹配冻结表，
  改动仅在本卡新增测试/fixture/证据。四包 typecheck 全过，39 个新测试文件定向 JSON 共 157/157 绿
  （shared 13、reforge 71、pal-extract 58、migrate 15）；R28 窄入口 4/4、G 批反控对照 27 绿＋
  两针业务红与判据自测 10 类独立复跑通过。docs/diff 通过，3 张截图存在且全 hash 匹配并已看图。
  `pnpm lint` 失败（10 error、1 warning），另有测试 fixture、RV3 宿主和汇总口径反例。
  因接收门未过，未合 main、未跑四包全测/覆盖对照或官方 check/ratchet/strict-fast。

## Codex 独立审核返工项（候选 `fed0a7869`）

1. **零诊断门失败**：`pnpm lint` 共 11 条，均在本卡新增文件：`registry.glm-runtime-resource.test.ts`
   1 warning；`evidence.json`、`runtime-resource-mutants.mjs`、`ball.glm-runtime-resource.test.ts`、
   `battle-trial-config`、`battle-anim`、`battle-positions`、`settlement`、`save-browser-box` 新测试
   合计 10 条格式/import error。逐项修复，完整全仓零诊断输出才可接收。
2. **合法测试输入被强转掩盖**：`recompile.glm-runtime-resource.test.ts:16–23` 通过
   `as unknown as Command[]` 把 authored `sequence/if/choice` 塞进只接受字节码 `Command[]`
   的公开入口，属于卡面禁止的非法 caller 分支；移除或用真实 typed 调用域证明它可触达。
   `battle-anim.glm-runtime-resource.test.ts:63` 把 `screenShake: {durationMs, screenShakeLevel}`
   以 `as never` 当合法 `AnimFrame`，实际字段类型是 `boolean`，被测代码只因对象 truthy 触发回调；
   改成 `screenShake:true, screenShakeLevel:2` 并断言时长/强度等真实参数。扫描本包其它强转，
   合法路径不保留同类掩盖。
3. **RV3 视觉宿主无法证明四面板互不覆盖**：`hosts/rv3-rv4/entry.ts` 的 `battlePanel` 在
   `scale(3,3)` 后仅按 `px/3,py/3` 平移，没有按每个 320×200 逻辑面板裁剪；绘制跨相邻面板，
   截图可见重叠，回执也承认 MAGIC_GRID 重叠。取样 `lit(35,54)` 等未加 P2/P4 面板偏移，
   所谓禁用行/箭头 lit 可采到 P1/P3。用独立 canvas 或明确 clip/坐标，重新取证 RV3，
   断言每块本区与相邻区；不能把宿主重叠写成已通过的产品绘制结论。RV4 可保留已证范围。
4. **机器账汇总自相矛盾**：`evidence.json` 七批 `directed.new` 为 44+34+39+17+6+8+9=157，
   Codex 定向新文件 JSON 也为 157；`summary.totals.newTests` 却写 115，B 包被标为 `migrateB`
   而实为 pal-extract。按新鲜 JSON 重新生成总数/包名，保留批次与 fullName/status 可追溯。

上述问题在本卡白名单内返工；没有扩大产品、格式或迁移写盘权限。新候选固定提交推送后 Codex
重新独立验收，接收通过才串行执行四包全测、局部覆盖对照及官方 check → ratchet → 受保护 strict-fast。

## 下一位 Agent 提示词（返工阶段历史）

```text
你是 GLM 第二对话，返工 TEST-GLM-RUNTIME-RESOURCE-2，不接第一对话的叶层编辑器卡。
先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md，编解码部分另读
docs/phase1/engineering-notes.md 的 §1.2/§2.3，再读
docs/ops/tasks/TEST-GLM-RUNTIME-RESOURCE-2-parallel-wave.md、
docs/testing/archive/legacy/batches/glm-runtime-resource-wave/README.md 与 targets.json。
本卡原 build allowed 范围不变；先读本卡“Codex 独立审核返工项”，以实际候选 fed0a7869 为起点。
分支 codex/glm-runtime-resource-r1，生产冻结 f6878b3c。
工作树 /Users/zhangxu/.codex/worktrees/glm-runtime-resource/type-pal 已备好。
只在自己的隔离工作树修四项反例，提交推送新的固定候选完整 SHA。
不挪第一对话/Kimi/E2E 的树，不合它们的分支，不共享或改它们的fixture。
清零 lint 全部诊断；去除 R05 非法 Command[] 与 R15 无效 AnimFrame 的强转并扫描同类；
修 RV3 四面板变换/取样，复看图并记完整截图元数据；从新鲜 JSON 修 evidence 总数与包名。
保留 R28 仅 collectSourceEntrySites 的窄范围。默认单worker复跑受影响定向/相邻、TC、
Biome/docs/diff和相应反控；全包/覆盖/全仓门由Codex接收时串行执行。
只改白名单新增测试/fixture/证据，不改产品/旧测试/配置/基线/依赖；不执行迁移、烘焙或提取写盘。
回执交新候选完整 SHA、逐项修复与复跑证据、JSON/反控/截图、命令和未证项。
Codex独立验收、集成推送和清理；不合main、不代签、不标done。
```

## 2026-09-29 Codex 最终独立验收

- 以返工候选 `272712323` 对 62/62 冻结产品源 hash；改动限本卡白名单。
  Codex 新鲜定向四包共 **157/157** 新例（shared 13、reforge 71、pal-extract 58、migrate 15）全绿；
  A–G 共 14 针业务反控、对照绿和同一判据自测独立通过。R28 仅测
  `collectSourceEntrySites`，4/4 定向通过，未扩完整审计器。
- 历史四项 `counter` 已闭合：lint 零诊断；R05/R15 合法 typed 输入；RV3/RV4 独立 clip 与面板
  坐标重取证；evidence 157 总数与包名。Codex 更正 D 批机读 visual 指向返工截图，并使 RV4
  亮像素阈值真正参与最终判定。主树隔离 Chrome 复验四面板邻板渗入 0/0、结算条 lit=94666，
  最终 `ASSERT PASS`，console warning/error 与 page error 全为 0。合成样本只证固定绘制/解析，
  不冒充实际战斗、原版资源观感或奖励入账；lenient RLE 截断流未纳入本卡防御修复。
- 三条 GLM 候选合入主树后统一 `pnpm check` exit 0，七包 **10,841/10,841** 全绿，
  lint 2623 文件 0/0/0；保护 `3bae1a69` 的官方 ratchet 与单次 strict-fast 均 exit 0。
  全仓 fast **10,380/10,380**、730 生产文件、分支 **49,081/63,398（77.42%）**，
  只升不降且新基线零回退。正式增量以三队列集成并集为准，不相加隔离回执。
- **无下一位 Agent 提示词；本卡技术收口完成。**
