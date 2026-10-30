# CODE50 draw-magic 当前复审切片

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「CODE50 draw-magic 当前复审切片」的治理候选页;证据原件即下方逐字节保全的固定main源(2504B,SHA 47fe04205cb7)。

## 来源与输入

来源为固定Git载体,非本次运行;原1个链接处置见作者review的linkDisposition。当前存活入口:[GAME-MAGIC-PLAYERINFO-STATUS-1.md](../../../tasks/GAME-MAGIC-PLAYERINFO-STATUS-1.md)

## 断言与业务 oracle

文档事实核对(currentExecution=false):原记录按其自身字段成立;空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;不产生新执行结果。

## 限制与复核

未重跑原命令/浏览器/测试;历史结论保持原时点;候选待Owner非作者接收。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2504B / SHA-256 47fe04205cb7c2a003a08821f4de33b5ecb2a757f5f7414d29768f000b68fd5c；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE50 draw-magic 当前复审切片

基点：`9e9657bc`；分支：`codex/code-quality-3y`。本片重新复审历史 50 的大世界仙术菜单绘制，不把历史 `done`、旧全仓回执或测试全绿当作当前整卡验收。50 当前复审提升为 `partial`，未标 accept/done。

完整读取 `packages/game/src/present/menu/draw-magic.ts`（359 行）、`draw-magic.test.ts`（235 行）、`draw-magic.glm-phase1-leaves.test.ts`（267 行）、`magic-menu-pixels.grok-r1.test.ts`（584 行）和 P06 caller/oracle（345 行）；读取 `draw-menu.ts`、`present.ts`、`core/menu/in-game-magic-menu.ts`、`menu-driver.ts`；primary 为 SDLPal `magicmenu.c:1-484`、`uigame.c:653-875`、`uibattle.c:31-269`。

已核对：pick-caster/pick-spell/pick-target 阶段、单人/多人 party、角色死亡禁用、仙术 MP/说明/分页/光标、运行时 HP/MP、缺资源降级、framebuffer ownership 和输入状态隔离。现有 4 个范围测试与 P06 合同共 25 tests 通过；相邻菜单/状态机/出口回归 5 files / 136 tests 通过；game typecheck 通过。

发现的高风险边界：SDLPal `PAL_PlayerInfoBox` 会在仙术页复用的底部信息框中按 `rgPoisonStatus` 重染中毒头像，并在活人头像旁绘制 confused/slow/sleep/silence 状态字（`uibattle.c:31-269`）。当前 `draw-magic.ts` 的 `drawPlayerInfoBox` 注释明确省略这些分支，只绘制 frame、头像、HP/MP/slash；第一阶段计划又把该行为记录为已修复的用户可见行为。现有测试没有状态/毒色反例，不能把这一差异当作“无问题”。

按高风险边界纪律，本片不修改产品代码、不新增公共输入、不复制 poison mapper，也不改变 UI 形态；已开 [`GAME-MAGIC-PLAYERINFO-STATUS-1`](../../../tasks/GAME-MAGIC-PLAYERINFO-STATUS-1.md) 等待用户确认 canonical 输入和是否要求仙术页复用状态显示。50 的实现文件登记 `review`，三份测试按自身合同登记已验证；整卡保持 `partial`。

质量验证：

- 直接：4 files / 25 tests passed。
- 相邻：5 files / 136 tests passed。
- `pnpm --filter @type-pal/game typecheck` passed。
- 本片未运行 coverage ratchet、official coverage、protected fast、全仓 `pnpm check`；按用户成本边界留到完整 game/present 模块收口，不能据此宣称统一质量门通过。
- lint、文档、ledger 和 diff 静态门在本批治理文档提交前重跑；高风险用户可见差异未获得实现授权。
```
<!-- incremental-original-source:end -->
