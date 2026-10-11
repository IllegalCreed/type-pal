# TEST-GLM-REFORGE-MENU-BOX-RESIDUAL-1 — MenuBox 未证明公开绘制合同审计

Status: review
Owner: GLM（Coding Owner）
Reviewer: Codex（独立验收）
Phase: phase2
Capability: reforge / menu（menu-box.ts 公开绘制）
源冻结: `9aa3bed892728f17c70d2f86d1fe07db10a718b8`（menu-box.ts sha256
`9c7c7b569e035fe5771fce79e5549e34aea1d66b7577569b2a6d98962ffcf2c1`）
Visual Verification Timing: e2e-deferred（纯绘制合同，功能性界面轴以 draw-call oracle 闭环）

## 目标

审计 `packages/reforge/src/menu/menu-box.ts` 在四份已接收测试之外**尚未证明的公开绘制合同**，
只覆盖：主菜单/级联菜单公开布局与选中颜色、装备/属性面板的数据驱动布局、有效 MenuAssets
下仍未证明的公开 draw dispatch。排除已接收家族：九宫格/tileFill（R11）、数字对齐（residual）、
scroll 自然宽高（residual/R11/N03）、confirm（residual）、状态板行为轴（status-residual：
毒行/立绘/钳制/阈值身份/图标缩放）、资源失败轴（glm-n/status-residual）。允许零新增；不以
覆盖率/数量为完成指标。

## 独占白名单

- `packages/reforge/src/menu/menu-box.residual.glm.test.ts`（本卡唯一测试文件）
- 本任务卡与 [evidence/TEST-GLM-REFORGE-MENU-BOX-RESIDUAL-1/](../evidence/TEST-GLM-REFORGE-MENU-BOX-RESIDUAL-1/)

## 上下文锚点

- `docs/phase2/READ-FIRST.md`（二阶段铁律；本卡零产品改动，不触真值门）。
- 已接收覆盖：`menu-box.residual.test.ts`（codex-plus2-runtime-wave5，针
  `scroll-right-width`）、`menu-box.status-residual.test.ts`（wave8，针
  `poison-incurable-display`）、`menu-box.glm-runtime-resource.test.ts` +
  `menu-box.glm-n.test.ts`（glm-runtime-resource-wave，targets.json groups[10]）。
- 公开 caller：`main.ts:5872` `menuBox.render(ctx, menu, world, performance.now(), statusIdx)`
  ——本卡全部合同经 `MenuBox.render` 公开入口驱动，不触私有方法。
- 排除项登记（REG，零新增）：`redBox`/`magicPlayerBox`/`cursor*`/`settleArrow`/
  `battleIcons`/`itembox` 在 MenuBox 内零消费（仙术菜单/战斗 UI 资产，供其它模块）；
  `loadMenuAssets` 属资源加载轴，不在绘制范围。

## 合同账（5 新合同，逐条 source:line / 公开 caller / 合法输入 / 旧证明 / oracle / 裁决）

公开 caller 全部 = `MenuBox.render`（main.ts:5872）；合法输入全部由公开 `menu-state.ts`
状态机（`openMenu`/`moveCursor`/`confirm`）与 typed `WorldState`/`MenuAssets` fixture 构造；
oracle = renderSpans 调用记录（module mock 仅替换 renderSpans，measureSpans 保持真实跑
真实字形宽回退）+ drawImage 按位图身份过滤的精确参数组。

| # | 合同 | source:line | 合法输入 | 旧 fullName/实际断言（为何未证） | 精确 oracle | 裁决 |
|---|---|---|---|---|---|---|
| R1 | 级联层框几何+金钱条：金钱卷轴 (0,0) nLen=5 带影、`menu.cash` label (10,10)、金额黄数字右对齐 (85,14)；depth d 框 (3+27d, 37+23d,61, 22+18×项数)；项字 (bx+13, by+13+idx×18) | menu-box.ts:516-530,539-545 | `confirm(moveCursor(openMenu(),2))` 两层级联；`world.money=205`；typed 不规则九宫格（box/scroll 各一套独立位图）+ 数字宽 6+d 互异 | 「当前状态板与级联菜单画面所有权 / 两两级级联…」仅断言 label 文本与 3 色，无框坐标/项字坐标/金额数字/nLen/阴影启用 | scroll/box 四角 drawImage 逐角坐标（tl/bl/tr 锚 MENU_X/Y、CASCADE_DX/DY、MENU_W、22+18n）；金额三数字右对齐序 (74,68,60)×14；离屏画布恰 3 张；7 条 renderSpans (x,y) 全序 | 新增（几何轴全未证） |
| R2 | 级联选中颜色残余臂：最深层 blink=SELECTED_COLORS[floor(now/100)%6] 随相位循环且整表回绕；openPanel 期最深层转静态 SELECTED_COLORS[3]；禁用+选中 [215,109,93]；未选中 COLOR_NORMAL | menu-box.ts:525-538 | 两层态 now=100/600；`confirm(moveCursor(openMenu(),3))`（系统叶 → openPanel='system'，产品路径）；`moveCursor` 不跳禁用 → 光标停禁用首项（menu-state.ts:60-67 无 enabled 检查） | 旧测仅 now=0 单相位（phase0）+父层静态+禁用未选中；相位≠0、%6 回绕、openPanel 让位、禁用选中四臂未证 | renderSpans forceRgba 精确值：now=100→[235,211,97]、now=600→[247,231,109]（去 %6 时 [6] 越界回落米白，可判别）、系统期→[219,174,81] 且非选中项米白、禁用选中→[215,109,93] | 新增（四臂全未证） |
| S1 | 属性九行数据驱动布局：行序 exp/level/hp/mp/attack/magicAttack/defense/speed/luck；label (8,10+20i)；值黄数字右对齐 (70,14+20i)；带 max 行（exp/hp/mp）斜杠 (72,ny)；max 左对齐 (79,ny+5)——HP/MP 蓝、exp 青；attack 值走 effectiveStat 装备加成（10+2=12） | menu-box.ts:292-304(statList),176-177,561-577；effectiveStat=item.ts:350 | typed `CharacterInstance`（hp45/100, mp8/40, exp3, level1, attack10…）+ actorsById.expTable=[0,42] + ring(statBonus attack+2) | 旧测「状态板按 live 等级阈值…」仅断言青数字**身份**（numsCyan[4]/[2] 存在）与毒行；行序/全部坐标/蓝青派发/斜杠出现行/effectiveStat→drawNumber 接线未证（攻击若回落 base 10，数字组不同，可判别） | 12 条黄数字逐条 (x,y)、3 条斜杠 (72,14/54/74)、5 条蓝 (79/86/92,59)+(79/89,79)、2 条青 (79,19)+(89,19)、9 行 label (8,10+20i) 全序 | 新增（位置/派发轴未证；青 42 值选择与旧测同值属偶然重叠，已在卡面披露） |
| S2 | 中栏名字与立绘定位：名字金黄 [255,203,113] 居中 (158−w/2, 30)；无 imageCache 回落立绘居中 (round(158−w/2), 50) | menu-box.ts:179-181,580-591 | 同上成员（无 appearance/无 portraits.default → 回落 assets.avatar 32×40）；'主角' 2 字 × 真实 measureSpans 回退 16=32 宽 | 旧测仅断言名字**文本**出现（主角/同伴 toContain）与立绘**身份**；名字/立绘坐标与名字色未证 | renderSpans (142,30,[255,203,113])；drawImage [avatar,142,50]（居中公式可判别：改 MID_CX/NAME_Y/AVATAR_Y 即红） | 新增（定位/色轴未证） |
| S3 | 装备格 2×3 网格：六格 5 参 drawImage 56×56 于 (200+62·col, 6+60·row)（EQUIP_SLOT_IDS 序 weapon/head/body/cloak/feet/accessory → 行主序）；空槽只画格、零图标零物名；已装备图标内缩(42)等比居中；物名 0xBE 居中 (gx+(56−w)/2, gy+43) | menu-box.ts:185-192,615-650；EQUIP_SLOT_IDS=content/item.ts:24 | `equipment={weapon:'sword'}`（typed sword icon 28×28），余 5 槽空 | 旧测「装备图标按槽内框等比缩放…」仅证 accessory 一格图标缩放坐标与物名**文本**；网格全坐标/格图 56×56 5 参缩放/空槽跳过/物名坐标与色未证 | equipSlot 恰 6 组 5 参全坐标；sword-icon 恰 1 组 (214,20,28,28)；'木剑' (212,49,[231,223,195])；labels 总数恰 11（空槽零额外绘制——去 `if (!equippedId) return` 则 5 条 '?undefined' 令总数 16） | 新增（网格/空槽轴未证） |

排重结论：候选 7 项（上 5 + 状态板毒行换行坐标、级联父层静态高亮），后两项与
status-residual 既有断言同 caller 同 oracle（毒行 [118,98]/[118,116] 已证；父层
[219,174,81] 已证），按「同 caller+同 oracle 即删」登记不包装；其余接收家族见锚点节。

## 反控（5/5 VALID，证据 [README](../evidence/TEST-GLM-REFORGE-MENU-BOX-RESIDUAL-1/README.md)）

判据库移植 TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1 r2 定稿（隔离树/双 reporter/
执行集逐字锁定/20 例合成反例自测），未放宽。协议：绿基线（五文件=新 1+已接收 4，25 行
执行集锁定）→ 每针独立 /tmp 新树变异 → 红（**跨文件恰一**指定业务 AssertionError，
fullName 精确相等+marker）→ 删树留清理证明 → 新净树还原绿（执行集与基线逐字一致、树内
menu-box.ts sha=冻结源）→ 工作树产品零残留。工作树全程零产品改动。

| 针 | 变异（menu-box.ts 唯一锚点） | 目标合同 |
|---|---|---|
| K1 | `const CASCADE_DX = 27` → `28` | R1 层偏移接线 |
| K2 | blink `Math.floor(now / 100)` → `/ 200`（带唯一注释锚） | R2 now 相位接线 |
| K3 | `const STAT_LINE_H = 20` → `21` | S1 行距数据驱动接线 |
| K4 | `const NAME_Y = 30` → `31` | S2 名字定位接线 |
| K5 | `if (!equippedId) return` → `if (false) return` | S3 空槽跳过接线 |

每针红相位在**五文件执行集**上恰 1 failed（跨文件恰一红：四份已接收测试在同针下全绿，
证明新针不与旧测重叠）；回执 counterproof.json（sha256 `82d66154798e5833…`）+ 31 份
native raw/JSON 全落 evidence/mutation-logs。

## 质量门（2026-10-11）

- 定向 5/5；`src/menu/` 全目录 106/106；reforge 全包 359 文件 **8963/8963**（EXIT=0）。
- reforge `tsc --noEmit` EXIT=0；根 `pnpm lint` 零诊断通过。
- `git diff --check` 0；diff 仅新增：1 测试文件 + 任务卡 + evidence 目录（含
  evidence/README.md 一行索引登记）。
- `pnpm check:docs` **FAIL(3)，无一属本卡可修域**，逐项披露：①turn-boundaries 卡终态未
  归档（main 既有，看板维护域）；②tasks/index.md 与卡状态不一致（main 既有 + Codex 在途
  未提交改动）；③board.md 未链接本活动卡——board.md 不在本卡白名单且当前含 Codex 未提交
  改动，按现行模式（Codex 维护看板）留给 Codex 收口时登记；本卡与 evidence 的相对链接均
  按 docs 门规则书写，无其它链接问题。
- 零产品/旧测/配置/baseline/真实数据改动；无 skip/ignore/timeout 修改/私有 helper/
  宽泛 canvas mock（drawImage 记录型宿主 + 按位图身份过濤断言，沿用本目录已接收家族模式）。

## 环境备注

- 早期一次根级 `pnpm test` 与定向采集并行起多个 vitest 实例致 migrate 包假失败；串行重跑
  该包 739/739 与 reforge 全包均绿，属并发干扰非产品问题。
- 反控脚本经 biome format 后按判例整体重跑；本目录证据为 format 后脚本的完整重放。

## 交付回执（GLM r1，2026-10-11）

**结论：排重后 5 条未证明公开绘制合同全绿（1 新测试文件），反控 5/5 VALID（每针跨文件
恰一红），全门通过；不请求 done，等待 Codex 独立验收。**

## 下一位 Agent 提示词（Codex 独立验收）

```text
你是 Codex，负责独立验收 TEST-GLM-REFORGE-MENU-BOX-RESIDUAL-1 的 r1 交付。
先读本卡、AGENTS.md、docs/ops/agent-workflow.md 测试质量验收节、
docs/ops/evidence/TEST-GLM-REFORGE-MENU-BOX-RESIDUAL-1/（README/counterproof.json/
lib-isolated-tree.mjs/run-counterproof.mjs/mutation-logs），再核：
1) menu-box.residual.glm.test.ts 5 合同的原子性、合法 typed 输入、真实公开 caller
   （MenuBox.render）、oracle 判别力与排重账——对照四份已接收测试逐项核实「未证」判断
   是否属实（尤其 R1 框几何/S1 行序坐标/S3 空槽跳过确无旧断言；R2 与 status-residual
   旧级联测试的四臂分工；S1 青 42 与旧测身份断言的重叠披露）；
2) 反控 5 针三态证据：执行集 25 行逐字锁定、红态跨文件恰一指定业务 AssertionError、
   隔离树冻结源/清理证明、判据库 20 例自测反例；可重放 run-counterproof.mjs；
3) 门禁：定向/menu 目录/reforge 全包/typecheck/lint 零诊断/check:docs/git diff --check；
4) 白名单外零改动（git diff 应仅含本卡三处：测试文件、任务卡、evidence 目录+索引行）。
裁决 accept 则按现行模式收口并自行更新看板；counter 则列返工项，本卡留在 review。
```
