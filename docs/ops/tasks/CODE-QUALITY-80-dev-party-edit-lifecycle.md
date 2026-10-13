# CODE-QUALITY-80 — game Dev Panel 换队生命周期

Status: review
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 dev party ownership
Visual Verification Timing: functional-minimal

## 范围与停止线

第一阶段 game 网页游戏按 B 打开的 Dev Panel「队伍」页，非 Reforge 编辑器。只核队伍头像入队/离队 handler 与装备刷新；不接管任何 GLM 实现文件。CODE53 当前候选的同一文件仍由 Codex 单一写入。

## 前提真值门

- 一句话前提：队伍编辑必须维持 party、当前战斗队员与按队伍槽存储的毒状态一致；当前战中队伍编辑没有重建战斗状态。
- primary：`reference/sdlpal/script.c:2164-2197` 正式0x75换队先清毒再 `PAL_UpdateEquipments`；`global.c:1333-1369` 重放装备脚本；SDLPal没有本项目DOM Dev Panel，不能以SDL源码自动决定战中按钮策略。
- 一阶段当前：`packages/game/src/dev/dev-panel.ts:443-453` 在explore/battle都开放B面板；`:1467-1486` 点击角色只改party、清毒和sprite。`core/battle/battle-system.ts:285` 在新战斗启动时重算装备，`:287`再创建战斗状态；`battle-state.ts:817-831` 仅在创建时按party建players。
- 二阶段：N/A，本卡不动Reforge/editor/content。
- 本任务目标：探索换队对齐正式清毒→装备重建链；战斗期间保留 B 面板查看和状态调试，但禁止队伍入队/离队。
- 最强替代解释与可证伪点：也许handler之后由战斗tick同步队伍、或startBattle已间接刷新装备。后者已证实，因此撤回“applyFixture缺重建”的推断；前者未在handler中发生。DOM实际复现见下，后续若存在自动重建必须补直接caller证据，不能靠源码片段断言。

## 实际复现与候选取舍

`docs/ops/evidence/CODE-QUALITY-80/` 保存完整typed临时诊断源、source SHA、命令与观察JSON。2026-10-13真实调用 `applyFixture` 建立合法战斗，再通过B/队伍tab/Role1卡片点击：

1. fixture队伍[0,1]、battlePlayers[0,1]，角色0已装备寿葫芦269，563/564效果正确重建。此前CODE53的“fixture未重算装备”待核猜测已被反证；不要增加重复刷新。
2. 战斗中点Role1离队后party=[0]、battlePlayers仍[0,1]，寿葫芦仍装备但毒表为空。
3. 重建探索态[0,1]并走正式装备刷新后，同样点Role1离队，角色0仍装备269而563/564消失。

此探针仅记录现象，不是接受错误行为的回归，也未证明后续所有战斗tick影响。未修改生产实现或生成物；尚未执行浏览器视觉检查。

用户已于2026-10-13裁决 before→after：战斗中 B 面板仍可打开查看和调试状态，但头像入队/离队控件不可用；探索模式继续允许队伍编辑。该选择只约束第一阶段 Dev Panel，不改变正常游戏流程、Save/schema 或公共接口。

## 验收设计与剩余风险

已先写合法失败反例，再改 handler。定向回归验证战斗控件 disabled、点击不改 party，探索控件仍可切换；真实 fixture 验证探索换队清毒后重建仍装备角色的寿葫芦伪毒。额外反控分别省略战斗 disabled 和装备重建，各产生恰一个业务断言失败，恢复后同一测试通过。资源生命周期、observer/监听器、异步缩略图另留 pending，不因这两条修复关闭2299行整个 dev-panel。

本卡没有已闭合文件；CODE53继续build，不可合main。统一门等这一生命周期切片完成后集中运行，不为每个小文件重复全仓门。

## 当前模式推进记录

Codex：用户裁决已记录，前提与范围 verified；build allowed。实现 Owner 为 Codex，独立验收待本批质量门。没有使用历史三签要求阻塞。无下一位 Agent 提示词，继续由 Codex 负责。

## 2026-10-13 用户裁决后的实现记录

- 修改实现：`packages/game/src/dev/dev-panel.ts` 在队伍卡根据当前 mode 禁止战斗中非队首角色的入队/离队，标题明确显示“战斗中不可编辑队伍”；点击 handler 仍做 mode guard，防止面板打开后 mode 变化绕过控件状态。探索模式沿用原切换路径。
- 探索切队现在沿正式 SDLPal 0x75 顺序先清 `rgPoisonStatus`、再调用 `updateAllEquipments(gs, items)`；仍在队角色的装备脚本会重建伪毒/属性效果。没有新增 schema/save 字段或公共出口。
- 修改测试：`packages/game/src/dev/dev-panel.glm-next-wave.test.ts` 覆盖战斗控件 disabled、点击不改 party 与探索控件可切换；新增 `packages/game/src/dev/dev-panel-party-lifecycle.test.ts` 走真实 `applyFixture → startBattle` 和 DOM 队伍卡，覆盖真实战斗中的入队/离队、面板打开后再进入战斗的旧卡 guard，以及探索离队/入队后寿葫芦 563/564 伪毒按新队伍槽重建。
- 行为反例：先运行未实现候选，战斗用例在 `disabled` 断言失败；探索生命周期用例在 `rgPoisonStatus['0_0']` 断言失败。实现后两文件共 8 tests 通过。可重复的两个 post-implementation mutation control 及源/测试 hash 见 `docs/ops/evidence/CODE-QUALITY-80/implementation-controls.json`。
- 为满足全仓硬性零诊断，修正两个测试宿主边界：`packages/reforge/src/main.host-lifecycle-1.test.ts` 用可恢复的 `window.location` 外部 IO seam 观察零存档 reload，`packages/editor/src/ui/design-system/navigation.glm-leaf-wave.test.tsx` 显式提供 host `preventDefault` 策略；两处都不改变生产行为，消除了 jsdom navigation 诊断。
- 尚未关闭任何文件；dev-panel、两份测试及 CODE53 其它 review/pending 文件仍需逐文件验收。视觉层只保留功能性 DOM 证据，未声称浏览器截图验收。

## 2026-10-13 批次收口记录

- 最终定向：dev-panel 两份测试、CODE53 status/event 相邻回归共 4 files / 45 tests 通过；game typecheck exit0。
- 最终 `pnpm check` exit0：content 149/1498、shared 16/131、game 313/3545、pal-extract 70/423、reforge 359/8964、editor 631/4951、migrate 96/739；lint 4006 files，error/warning/info 全0。完整输出见 `docs/ops/evidence/CODE-QUALITY-80/gate-check-final.txt`。
- 官方 `pnpm coverage:ratchet` exit0；game statements 88.05%、branches 79.31%、lines 89.63%，TOTAL statements 89.85%、branches 83.60%、lines 91.72%；基线只升不降。protected fast 以 `origin/main` 为基线 exit0，见 `gate-ratchet-final.txt` 与 `gate-protected-final.txt`。
- `pnpm check:docs`、`pnpm lint`、`node scripts/quality/code-quality-ledger.mjs` 均 exit0；账本仍 3267 / 338 closed / 10 review / 2919 pending。没有把任何 dev-panel、测试、状态页或 battle 文件强行改为已验证。
- CODE80 从 `build` 进入 `review`：用户裁决、行为修复和本批门禁已完成，Codex 独立验收记录在本卡；剩余 dev-panel 的全局 listener disposer、picker IntersectionObserver 与异步 thumbnail 取消/关闭生命周期仍 pending，另需后续小批，不影响本批行为合同。
