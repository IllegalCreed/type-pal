# CODE-QUALITY-105 — Reforge MenuBox 残余测试逐文件复核

Status: review
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase2
Capability: reforge / menu / test-contract-precision
Visual Verification Timing: N/A（本批只审公开绘制合同测试，不改产品行为）

## 目标与白名单

复核账本中仍为 `待核` 的 `packages/reforge/src/menu/menu-box.residual.glm.test.ts`，确认
五个公开绘制合同是否有真实 caller、合法 typed 输入、可判别 oracle、相邻测试排重和反控证据。
本批白名单仅包含该测试文件、当前任务卡和 `docs/ops/evidence/CODE-QUALITY-105/`；不修改
`menu-box.ts`、旧测试、资源、schema、UI 行为或 coverage 配置。

## 逐文件读取与事实边界

已完整读取：

- `packages/reforge/src/menu/menu-box.residual.glm.test.ts`
- `packages/reforge/src/menu/menu-box.ts`
- `packages/reforge/src/menu/menu-box.residual.test.ts`
- `packages/reforge/src/menu/menu-box.status-residual.test.ts`
- `packages/reforge/src/menu/menu-box.glm-runtime-resource.test.ts`
- `packages/reforge/src/menu/menu-box.glm-n.test.ts`
- `packages/reforge/src/menu-state.ts`
- `packages/reforge/src/main.ts` 中 MenuBox 构造与 `menuBox.render(...)` 公共调用点
- `docs/phase2/READ-FIRST.md`、历史 TEST-GLM-REFORGE-MENU-BOX-RESIDUAL-1 任务卡与证据

primary source 是当前 `menu-box.ts` 的公开 `MenuBox.render`/`renderCascade`/`renderStatus`，
生产 caller 是 `main.ts` 的菜单渲染分流；菜单输入由 `menu-state.ts` 的 `openMenu`、
`moveCursor`、`confirm` 构造。五个测试均通过公开入口驱动，不调用私有 helper。

## 合同与测试判别力

- R1：两级级联框的层偏移、框高、金钱卷轴和金额右对齐。
- R2：最深层闪烁相位回绕、系统面板静态高亮、禁用选中红色和未选中米白。
- S1：九行状态数据顺序、坐标、HP/MP 斜杠与蓝色最大值、经验青色最大值、装备加成。
- S2：角色名金黄居中和默认立绘回落定位。
- S3：六格装备网格、已装备图标等比内缩、装备名定位和空槽跳过。

相邻四个测试文件已逐项排重：数字/卷轴/确认框、九宫格阴影与退化输入、状态板毒/头像/阈值/图标
缩放和运行时资源轴均有独立合同；本文件未包装同 caller+同 oracle 的旧断言。fixture 使用
typed `MenuAssets`、`CharacterInstance`、`WorldState`、`ItemDataMap`，只将 `renderSpans`
记录为绘制 oracle，`measureSpans` 保持真实实现；Canvas 宿主仅记录位图身份与坐标。

历史 5/5 反控证据已在当前源树重新重放：K1–K5 均能变异红、还原绿，退出状态与指定失败
合同可判别；脚本改写的历史 artifact 已恢复原样，不把旧机器文件冒充当前 receipt。

## 验证结果与未闭合项

- 定向：5 files / 25 tests PASS，退出码 0；无该批 stderr。
- `packages/reforge/src/menu/` 相邻：21 files / 118 tests PASS，退出码 0；存在一条
  `reward-gain-queue.boundaries.test.ts` 的未 await `expect(...).resolves` Vitest 未来兼容诊断，
  不属于本卡白名单，未静音或放宽规则。
- reforge typecheck：PASS。
- 全仓 `pnpm check`：exit 0；content 1498/1498、shared 126、game 3613、pal-extract 434、reforge 8964、editor 4943、migrate 739，根 lint 4962 files 且 error/warning/info 均为 0。
- official `pnpm coverage:ratchet` 与 `TYPE_PAL_COVERAGE_BASE_REF=origin/main node scripts/coverage/run.mjs fast`：均 exit 1，shared/pal-extract/total 既有 baseline 回退；未改 baseline。
- 当前源实现 SHA 与历史冻结 `menu-box.ts` 相同：
  `9c7c7b569e035fe5771fce79e5549e34aea1d66b7577569b2a6d98962ffcf2c1`。
- 本批没有产品实现、schema/save、公共接口、生成物或 coverage scope 变化。
- unified coverage ratchet/protected fast 仍受 shared/pal-extract 与 total baseline 回退阻塞，
  因而该文件登记为 `review`，不写成 `已验证`。

## 结论与下一步

五个合同和五针反控均有当前源代码证据，未发现需要修复的产品或测试缺陷；但相邻包已有未
await 诊断且统一 coverage 门仍失败，不能关闭本文件。下一步先处理相邻 Vitest 诊断的
独立最小批次，再复验本卡；任何发现公共 UI、资产或第一阶段机制变化时立即停线另开高风险卡。
