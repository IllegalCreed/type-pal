# CODE-QUALITY-80 — game Dev Panel 换队生命周期

Status: blocked
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 dev party ownership
Visual Verification Timing: functional-minimal

## 范围与停止线

第一阶段 game 网页游戏按 B 打开的 Dev Panel「队伍」页，非 Reforge 编辑器。只核队伍头像入队/离队 handler 与装备刷新；不接管任何 GLM 实现文件。CODE53 当前候选的同一文件仍由 Codex 单一写入，授权前本卡只读，不新增产品实现。

## 前提真值门

- 一句话前提：队伍编辑必须维持 party、当前战斗队员与按队伍槽存储的毒状态一致；当前战中队伍编辑没有重建战斗状态。
- primary：`reference/sdlpal/script.c:2164-2197` 正式0x75换队先清毒再 `PAL_UpdateEquipments`；`global.c:1333-1369` 重放装备脚本；SDLPal没有本项目DOM Dev Panel，不能以SDL源码自动决定战中按钮策略。
- 一阶段当前：`packages/game/src/dev/dev-panel.ts:443-453` 在explore/battle都开放B面板；`:1467-1486` 点击角色只改party、清毒和sprite。`core/battle/battle-system.ts:285` 在新战斗启动时重算装备，`:287`再创建战斗状态；`battle-state.ts:817-831` 仅在创建时按party建players。
- 二阶段：N/A，本卡不动Reforge/editor/content。
- 本任务目标：探索换队对齐正式清毒→装备重建链；战斗中的入队/离队行为需要明确产品策略后再实现。
- 最强替代解释与可证伪点：也许handler之后由战斗tick同步队伍、或startBattle已间接刷新装备。后者已证实，因此撤回“applyFixture缺重建”的推断；前者未在handler中发生。DOM实际复现见下，后续若存在自动重建必须补直接caller证据，不能靠源码片段断言。

## 实际复现与候选取舍

`docs/ops/evidence/CODE-QUALITY-80/` 保存完整typed临时诊断源、source SHA、命令与观察JSON。2026-10-13真实调用 `applyFixture` 建立合法战斗，再通过B/队伍tab/Role1卡片点击：

1. fixture队伍[0,1]、battlePlayers[0,1]，角色0已装备寿葫芦269，563/564效果正确重建。此前CODE53的“fixture未重算装备”待核猜测已被反证；不要增加重复刷新。
2. 战斗中点Role1离队后party=[0]、battlePlayers仍[0,1]，寿葫芦仍装备但毒表为空。
3. 重建探索态[0,1]并走正式装备刷新后，同样点Role1离队，角色0仍装备269而563/564消失。

此探针仅记录现象，不是接受错误行为的回归，也未证明后续所有战斗tick影响。未修改生产实现或生成物；尚未执行浏览器视觉检查。

需用户裁决的before→after：目前战斗中能点头像改队伍但战斗成员未同步。推荐战斗期间禁用入队/离队，仍可查看状态、探索期间正常编辑；另一方案是支持战中换人，同时定义新成员动作、已排队动作和退队状态处理，范围显著扩大。此选择改变开发面板可感知行为，按用户治理停止线必须先裁决；不把新的产品选择混作既有SDLPal授权。

## 验收设计与剩余风险

裁决后先写合法失败反例，再改handler；探索场景验证清除旧真毒并重建仍装备角色的伪毒；战斗策略按选定合同验证。防面板打开后模式变化绕过保护。资源生命周期、observer/监听器、异步缩略图另留pending，不因这两条修复关闭2299行整个dev-panel。

本卡没有已闭合文件；CODE53继续build，不可合main。统一门等这一生命周期切片完成后集中运行，不为每个小文件重复全仓门。

## 当前模式推进记录

Codex只读核验：上述DOM状态变化verified；完整战中换人策略unknown。build blocked，等待用户产品裁决；没有使用历史三签要求阻塞。无下一位Agent提示词，继续由Codex负责。
