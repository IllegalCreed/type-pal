# game-dev(state-dump + dev-panel)八维复审批 —— game 包收口批

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

- 批次:pre-94 foundation 模块 11 批 29(game 包终批)
- 基线:origin/codex/code-quality-3y @ 53db76bbbb(候选线 62+ 提交)
- Coding Owner:GLM;两文件全文读毕(state-dump 117 / dev-panel 2342)
- 整改类型:纯注释 1 处,零代码改动 — body-invariance `allEqual: true`

## 整改清单

| # | 位置 | 问题 | 修正 |
|---|---|---|---|
| 1 | dev-panel.ts applySceneJump docblock | "tile PNG / palette 留首屏(已知 visual 错;M5 升)"半过时 — tile 部分已被 T17 实现(sceneFetcher 取该场景 tileset blob + onSceneChanged 切 currentSceneId 路由);palette 部分仍真(scene-system.loadScene 全文无 palette 写,已核) | 拆分陈述:tile 已按 scene 路由(T17);palette 仍留首屏 + 原因与已知差异 |

## 零整改面

- **state-dump.ts**:字段对齐 sdlpal tp_dump_state.c 声明、leader wFrame 与 present 同逻辑说明准确。
- **dev-panel.ts 其余 2338 行**:BOSS_ROSTER story-grounded 三方校验考证(精灵名≠剧情名修正史/七神龙补全/user 指正条目)、彩依飞走 pan-op 锚定位论证、applyFixture 边界同步链(2.5/2.55/2.6 三层 hydrate/exp 同步)、t37 过场自动战 1:1 复刻(0x75[5,6,5]→roles[4,5,4] 真值)、法术测试 rgwName 3/4 对调 ⚠、picker generation fence、全道具 id0 观音符不 skip 修正史 — 全部准确。

## 验证

- body-invariance:dev-panel.ts printedSha256 一致 → [body-invariance.json](body-invariance.json)
- `tsc --noEmit -p packages/game`:exit 0;scoped biome 0 诊断;`git diff --check` 干净(dev-panel 无独立测试文件,行为由 game 全包测试覆盖,typecheck 为本批定向门)

## 模块收口

**game 包生产源码全部收口**(assets 5 + core 46 + present 29 + shell 22 + analytics 4 + tools 17 + dev 2 = 125 文件,b1-b29 累计)。下一站:content → migrate → reforge → editor 四包 → 94-102 返工。


## Codex 剩余29文件返工（2026-10-20）

原文“dev-panel无独立测试文件”错误；现有pure29与glm-next-wave4均实际运行，UI例含battle禁编辑/explore可编辑。仍不认证整个picker异步卸载；palette文案改为保持跳转前当前色表。

逐文件八维、原件与限制见[本轮回执](../codex-final29.json)。本节不接收原文整包/模块收口宣称。

补核pure.test旧574行后发现大量any/双强转夹具与私有stash访问，现以现成typed Enemy/Role工厂、完整Magic/Item、真cache及公开getBattleResources替换；物品样本改用合法61/62并同步等价库存oracle。29身份/断言合同保留，4UI+29pure重跑0stderr、三包typecheck0。1配置自检只给fixture输入信用，不单独计玩法验收。此前两次全仓覆盖率门均在这份夹具修复前执行且失败；未拿旧19,979绿数认证新夹具，未再跑昂贵门。
