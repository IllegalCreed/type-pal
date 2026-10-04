# TEST-GLM-LEAF-WORKFLOWS-1 — 三十二组叶层与小界面补测

Status: done
Owner: GLM（受委派测试贡献者）
Reviewer: Codex（独立验收、统一质量门与集成）
Phase: phase2
Capability: editor / content / coverage
Visual Verification Timing: dev-functional（明确步骤的隔离小闭环；G/H 纯函数 N/A）

## 授权与目标

2026-09-28 用户要求给 GLM 超大批量、较低单组复杂度的补测任务，并确认其多模态能力。
按 **32 组 / A–H 八批 / 每批四组** 连续实施，当前直接准入新增测试，不先交纯审计报告再等待。
Codex 独立接收，不恢复固定三签；作者自验不是独立第三方证明。

生产冻结 `3925980cab8e1e62bb59cf560db756935fda7d05`（对 `29e76fe6` 仅派发文档变更）。
[冻结表](../../../../testing/archive/legacy/batches/glm-leaf-workflows/targets.json)含 49 个实际目标源 hash、正式 fast 统计、
公开入口行号、静态 import 线索及同名旧测试入口；工作包定义每组窄范围。
分支 `codex/glm-leaf-workflows-r1`，已准备隔离工作树
`/Users/zhangxu/.codex/worktrees/glm-leaf-workflows/type-pal`；不借 main、Kimi 或 Codex E2E 树。

## 前提真值门

- 工程前提：49 目标现有 fast 分支 4,459/5,584（未命中 1,125），行 4,500/5,161（未命中 661）；
  从已有公开组件/纯函数选择新合同。缺口不是新 bug 数，也不等于所有臂可合法触达或承诺覆盖增量。
- 一手依据：冻结 LCOV 的 source/hash 与逐文件计数；`DsMultiSelect` 的过滤/禁用/选择路径
  `multi-select.tsx:21–66`；`DsZoomToolbar/DsMediaViewport` 的上下界 `media.tsx:17/73`；
  `editor-target.ts:10` 当前对象查询；`map-selection-overlay.ts:36/62` 边界与绘制；
  `command-asset-record.ts:18/31/42/53` 明确只校验 record/长度/头部；
  `frame-sequence.ts:567/593` 播放区间/时长；其余公开入口及实际消费者按冻结表逐组查阅。
- 原版/第一阶段机制 N/A：本卡不改玩法、数值、格式、碰撞或渲染架构；只补当前二阶段已定合同。
  当前可见 UI 来源为生产控件/已有设计系统，测试不授权 UI 重设计。
- before → after：产品不变，新增可自动复跑的断言和最小功能证据。没有新产品取舍。
- 最强替代解释：空臂是编译器防御、旧测试跨文件已证、或过时入口；只看 LCOV 不足以断言有新合同。
  `StampPlacementInspector.tsx` 未找到当前产品消费者，已主动从本包移除，不造新挂载来刷覆盖。
- 推翻条件：只能 mock 掉上游守卫/伪造旧版本或读私有函数才能触达；登记不可达或风险，继续下一族。
  合法业务失败交正确预期的隔离红诊断，不通过改预期掩盖，也不擅修产品。

## 范围与隔离

- 精确新测试路径：targets.json 的 49 个 `newTest`；没有新合同的模块可只登记 existing-proof，不能凑文件。
- fixture 白名单：`packages/editor/src/ui/__tests__/glm-leaf-workflows/**`、
  `packages/content/src/__tests__/glm-leaf-workflows/**`，仅本包 typed fixture / 硬件端口替身。
- 工具/回执/诊断/最小浏览器宿主：`docs/testing/archive/legacy/batches/glm-leaf-workflows/**`；冻结表只读。
- 不能改产品、旧测试、官方配置、依赖/锁、基线、任务卡/看板/公共索引、其他贡献者文件、正式工程资产。
  如需产品修复交 Codex；本卡不因产品缺陷自动扩权。
- Kimi 的 20 目标与本卡 49 目标集合已核零交集；公共依赖覆盖可能重叠，最终贡献按 main 并集去重。
  两者都只新增自身测试，不改共享产品/fixture。并发 package 测试限制低 worker，重门串行。
- Codex 继续 E2E002；001/002、App、ScriptEditor、PreviewCanvas、FrameAnimationEditor、
  已知朝向清除问题与角色换装均不在 GLM 范围；不把测试任务变成新功能任务。

## 验收

完整分组、操作步骤、精简账与运行要求见[工作包](../../../../testing/archive/legacy/batches/glm-leaf-workflows/README.md)。

1. 真实公开入口、有效 fixture 与业务结果；允许组件规定的 callback，不以 mock 核心函数冒充业务链。
2. 每批优先 2 个最强代表单点反控（全包约 16–24 针），共用严判据，不逐组搭一套验证框架。
   关键失败/输入保真合同必须可证伪；数量不是验收门，不造无关变异。
3. 每批定向/相邻、对应包 typecheck、新增文件 Biome 全零诊断、docs/diff；D/H 批末各跑一次
   截至当时受影响包全测。不每加几个用例就跑全包/覆盖。
4. A–F 各一条指定小 UI 闭环，两种工作区宽度；真实截图/日志，G/H 纯函数无需虚构视觉。
5. D/H 两个批末里程碑各做一次局部、同口径 before/after 覆盖（E–H 报后半增量及总并集，不重复相加）；
   所有官方全仓 check / ratchet / strict-fast 和基线由 Codex 统一执行。
6. 每四组固定候选 SHA 并推送，可继续下一批；单组卡住登记原因，不堵其余七批。
   接收通过后 Codex 集成推送、核 done、清理退休分支/worktree，不要求用户再提醒。

## 当前模式推进记录

- Codex 前提/范围：verified，32 组 49 目标；统计与 Kimi 零交集校验，移除无当前消费者的旧组件。
- build 准入：**build allowed（仅本卡新增测试、fixture 与隔离证据）**，2026-09-28。
- Coding Owner：GLM；不分派其改 E2E/产品，复杂跨组件竞态另归 Kimi/Codex。
- GLM 交付与自验：旧候选 `4b5aade7f` 与返工候选 `12fe2208d02d4eb6ca09c74660d8d05d0c476a09` 已推送，A–H 自验见回执。
- Codex 独立验收：2026-09-29 `accept`，五项历史返工已逐项闭合；见最终验收。
- 用户可感知产品验收：N/A，本卡不改行为；发现需要新产品裁决则另提。
- done 准入：**done allowed**，测试包无用户可见产品取舍，用户产品验收 N/A。

## 交接日志

- 2026-09-28 Codex：依现有 Vitest/pnpm 与 fast 证据派发八批，未重跑覆盖率盘点。
  GLM 直接实现，不先堆审计材料；允许有界的隔离功能视觉，不占用用户服务。
- 2026-09-28 Codex：独立审核贡献者实际 HEAD `4b5aade7f`，候选工作树干净，改动限测试与隔离证据。
  editor `check` 438 文件/3462 测试、content `check` 123 文件/1222 测试通过；`node scripts/docs/check.mjs`
  通过，`git diff --check main...HEAD` 通过。`pnpm lint` 失败，9 error、2 warning、2 info，均落在新增测试。
  任务转 `rework`，不合 main、不跑官方 ratchet/strict-fast、不改基线。截图文件在
  `/tmp/type-pal-glm-leaf-workflows/`，已核实存在并抽查 A/B/C/D/E 图像。

## Codex 独立审核反例（候选 `4b5aade7f`）

1. **硬门未过**：`pnpm lint` 共 13 条诊断。例：`editor-target.glm-leaf-wave.test.ts:152/158`
   两条 info；`StampTemplateDialog.glm-leaf-wave.test.tsx:2/16` 两条 warning；
   `StampContentEditor.glm-leaf-wave.test.tsx`、`MapSelectionInspector.glm-leaf-wave.test.tsx`
   等有 import/format error。必须全部清零并给完整零诊断回执。
2. **fixture 与类型掩盖违反准入边界**：任务包要求当前合法输入，明确禁用 `as unknown as` / ignore。
   候选 `ItemAlchemyTab.glm-leaf-wave.test.tsx:64`、`command-asset-record.glm-leaf-wave.test.ts:71`、
   `BattleFieldTab.glm-leaf-wave.test.tsx:72` 等将不完整对象双重强转为 `EditorState`；
   `script-references.glm-leaf-wave.test.ts:13/85/90` 以 `as never` 掩盖当前脚本形状；
   多个 UI 测试以 `@ts-expect-error` 压制 Node 桥接类型。逐处改为合法 typed fixture/局部真实端口，
   以当前 guard 或合法项目装载器自证；非法输入测试只在 API 声明接受 `unknown` 的边界注入。
3. **组合同与去重不足**：G25 指定的 MP4 extended-size/截断 box 没有新增测试，
   `video-metadata.test.ts` 旧例只证 `soun`/`vide`/非 MP4；G28 指定的相连/隔离 flood-fill、
   规划前后同图参数保真没有在新增 `stamp-placement.glm-leaf-wave.test.ts` 中验证，需给精确旧断言证据或补测。
   G27 的新 `script-references` 仅测模糊的 JSON 子串，缺完整 domain/owner/path 与输入深快照。
   G20 新例的 owner 展示在 `ItemAlchemyTab.test.tsx:241/349/683` 已有更强旧证，需去重并把精力放到
   尚未覆盖的配方/奖励行合同，或标明 existing-proof 不保留重复例。
4. **视觉证据未闭合**：任务包明确 A–F 各一条。回执 F 段以 D/E 截图代替 F 自身 casualty 闭环，
   不满足 F 步骤。E 的 `E-vars-1440-number-created.png` 和 `E-vars-1000-final.png` 显示
   `score.bonus` 在“开关 2”分组且详情“类型 开关”，与要求的 number 创建相反；回执也承认直挂宿主
   提交 `kind=flag`。需实际复现并判定宿主操作误差还是产品缺陷；真缺陷交隔离红诊断，不改产品。
5. **覆盖回执范围不足**：`coverage-delta.mjs` 仅配置 editor，A–H 数字只含 37 个 editor 新测试文件，
   H 的 7 个 content 文件未进入 before/after；也没有独立 E–H 增量。按任务包在同源码、相同官方 fast
   选测与同分母下分别补 editor/content 贡献与 A–H 并集，明确局部数字不得充当正式全仓覆盖率。
   截图回执还需完整 SHA256、尺寸、URL、候选 SHA；目前多为省略号 hash。

这些反例属当前候选返工范围；GLM 仍是测试 Coding Owner，只修改本卡白名单。Codex 在新候选实际 HEAD
独立复核后决定接收/集成，不将本次全绿单测解释为正式质量门通过。

## 下一位 Agent 提示词（返工阶段历史）

```text
返工 TEST-GLM-LEAF-WORKFLOWS-1。先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、
docs/ops/tasks/TEST-GLM-LEAF-WORKFLOWS-1-thirty-two-groups.md、
docs/testing/archive/legacy/batches/glm-leaf-workflows/README.md、targets.json 和卡内 Codex 独立审核反例。
你是测试 Coding Owner；以当前实际候选 HEAD 4b5aade7f 为返工起点，不要使用派发时冻结 SHA 当最新交付。
在 /Users/zhangxu/.codex/worktrees/glm-leaf-workflows/type-pal、
codex/glm-leaf-workflows-r1 分支修本卡白名单内的五项审核反例，提交推送新的固定候选 SHA。
只改精确新增测试、专属 fixture/证据；不改产品、旧测试、官方配置/依赖/基线或别人的文件。
先旧断言去重，修掉强转/类型压制，补 G25/G27/G28 的未证合同或给精确 existing-proof；
按 F 步骤取两种视口视觉证据，复核 E 创建 number 的实测差异。真 bug 交隔离红诊断，不改预期凑绿。
静态门必须 error/warning/info 全零；补 content 与 E–H 的同口径局部覆盖对照。
不跑官方全仓 check/ratchet/strict-fast；阻塞一族继续其它族。
回执给新候选完整 SHA、逐项修复或反证、复跑命令/JSON、反控、完整截图元数据和未证项。
GLM 是贡献者；Codex 独立验收、集成推送、统一质量门和清理。不要合 main、代签或标 done。
```

## 2026-09-29 Codex 最终独立验收

- 以返工候选 `12fe2208d` 对 49/49 冻结产品源 hash；只接入本卡测试、专属 fixture/证据。
  Codex 新鲜定向 editor 36 文件 165/165、content 7 文件 24/24；八批同一严判据的对照绿、
  16 枚单点业务反控红与自测均独立通过。14 张 A–F 截图全 hash 匹配；重看 E 数值变量正确落入
  “数值”分组、F 两视口 casualty 分槽/undo 回显。F 直挂宿主左栏概率行在 1440 宽时偏拥挤，
  本卡仅以会话合同与分槽可见性收口，不据此声明完整 App 响应式验收。
- 历史五项 `counter` 已闭合：零诊断；合法项目 typed fixture/Node 端口；G25 旧精确断言与
  G27/G28 新合同及 G20 去重；E/F 视觉；editor A–D/E–H/总并集和 content 的同口径局部对照。
  本卡局部 editor 分支 +218、content +4 仅作贡献者自验，不与其它隔离分支直接相加。
- 三条 GLM 候选合入主树后统一 `pnpm check` exit 0，七包共 **10,841/10,841** 测试通过，
  lint 2623 文件 **0 error/0 warning/0 info**。保护基点 `3bae1a69` 的官方 ratchet exit 0，
  随后单次 `pnpm coverage:fast` exit 0：全仓 fast **10,380/10,380**、730 生产文件，
  分支 **49,081/63,398（77.42%）**，新基线逐整数复现、零回退；三队列的正式净增由此并集决定。
  旧 `counter` 仅对旧候选有效，不再阻止本卡 done。剧情 E2E 另卡执行。
- **无下一位 Agent 提示词；本卡技术收口完成。**
