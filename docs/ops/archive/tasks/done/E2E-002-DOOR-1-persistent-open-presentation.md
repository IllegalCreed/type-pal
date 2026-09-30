# E2E-002-DOOR-1 — 开门呈现的持久语义

Status: done
Phase: phase2
Capability: E2E-R4 / 002 / X1
Coding Owner: Codex Root
Generation Owner: N/A
Reviewer: e2e_002_runner（非作者只读复核） / Codex（冻结E2E独立验收）
Visual Verification Owner: Codex
Visual Verification Timing: e2e-consolidated
Contributor: e2e_002_runner（只读独立前提/压力审）
Branch: codex/e2e-002-r1

## 目标与范围

登记正式002恢复暴露的独立缺陷：三苗人进房后已打开的e73/e74门，正式读档后变成关闭帧。
修复应让持久门状态导出同一呈现意图，而不是把演出期间所有瞬态定帧自动持久化。
沿用现有Page选择持久化与SpriteActionBinding，不修改schema、SAVE9或通用瞬态定帧语义。

- 唯一实现Owner为Root。产品白名单：`projects/pal/content/scenes/s003.json`的两门页面及三处开门链、
  `projects/pal/content/sprites.json`的sprite53/54动作；回归白名单为`packages/reforge/src/pal-inn-door-save.test.ts`。
  全仓门发现PAL引用索引精确census随两个新页增长，Root准入`packages/editor/src/core/project-reference.pal.test.ts`
  的窄fixture同步：保留全部parity/删除阻挡与payload上限，精确核两条open动作和两条page行为引用。
- 工具白名单：`scripts/e2e/inn-trace-plugin.mjs`及`inn-contract.test.mjs`窄只读门动作观测、
  `inn-contract.mjs`补实际动作来源hash；不改成功条件、像素区域、恢复采样时刻或生产调度。
- 不恢复转换器、不重生成作者正文、不改一阶段、资产字节、NPC速度/路线或剧情奖励。
- 不过滤门区域、放宽Canvas hash/等待阈值，不把原档或candidate当实际恢复观测。
- 6012保持运行；不重跑同一失败视觉流程，先以现有证据与单测核修复层。

## 前提真值门

### 一句话前提

当前成功恢复的全量持久World相同，但开门仅依赖被恢复事务清除的瞬态frame override，
所以相同World不足以还原已打开的门画面。

| 维度 | 真值 / 边界 | 直接证据 |
|---|---|---|
| 原版 / primary source | L411先到门前、调L3739开门再进房隐藏；L3739对一基74/75调用L35644：state1＋gesture1 | `data/extracted/events/all.json:2911/2942/24051/233518`；`game/event-system.ts:4435`一基转零基73/74、`:4018`gesture置frame1/down；不由低层opcode推导现代通用保存字段 |
| 第一阶段 | 两门state1/scriptedFrame1/nSpriteFrames0真实入档；恢复后实际Canvas与结束帧同SHA `b66199d84496f4dc82a15478dd4e4c0be736dfd68303dd44b3ff7d1cebf6a194` | 正式`build/e2e/game-002-2026-09-30T09-06-32-906Z/{002.end.save.json,report.json}`；`game/core/save/api.ts:56–73`deepClone、`shell/bootstrap.ts:1642/845`恢复全gs再切片、`game-state.ts:2068`仅补undefined帧 |
| 当前二阶段 | end e73/e74 state1/visible/frame1；restore相同state/pos/sprite但frame0；frame仅在呈现Map，abortScript清除 | 正式`build/e2e/reforge-002-2026-09-30T15-29-25-294Z/{inn-trace.json,002-restored-trace.json,report.json}`；`main.ts:2200/4287/4683`；`world-scene-presentation.ts:72/88/104/120–151` |
| 本任务目标 | 已核持久开门意图在新上下文恢复后生成相同门画面；临时演出定帧仍不默认入SAVE | `script-world.ts:331–341`page写World且保留同有效行为cursor；`main.ts:2794–2814`重建页base动作；`entity-action-player.ts:315–318/365`完成后仍留末帧；SAVE9不变 |

### 反证与替代解释

- 最强替代解释：只是摄像机/资产差异、动画相位或过晚采样，并非缺少持久门意图。
  实际restore提交点全量World严格相同；两trace的门pos/state/sprite相同但frame1→0，
  Root已实际看结束图与失败图，且生产host只写瞬态Map、恢复调用abortScript确会清Map。
- runtime语义：区分World与WorldScenePresentation；`commitSceneSwitch`中的cinematic重置
  不是此门Map清除的直接锚，真正路径是restorePayload→abortScript→clearEntityFrames。
- 原版/第一阶段：不把一阶段保存帧实现搬成二阶段通用持久字段；调用域/门状态含义需build前核齐。
- extractor/地图/数据：同scene/pos/sprite与同asset源恢复，不能因画面差异重迁地图。
- audit模型：9d15218b已核唯一成功tail、无await和真实提交只读取证；晚到e62正常循环另存，
  不影响门frame反例，不允许删游标或过滤画面。
- 推翻：门trace恢复仍frame1且同资源但画面关闭；或已有持久page/pose绑定被错误忽略。
  若出现这些观察须修正归因，不能坚持改作者页。

### 用户可见偏离

- 不主动偏离剧情：before→after为“读档后门关闭→保持已打开状态”。
- 代表s003/e73/e74；002既定结束画面恢复要求，不新增产品能力取舍。
- 如果需要新增通用schema/save能力或改变其它frame调用语义，另核风险/范围及用户裁决。

## 上下文锚点与已核设计

- [二阶段铁律](../../../../phase2/READ-FIRST.md)、[脚本系统](../../../../phase2/specs/script-system.md)、
  [存档系统](../../../../phase2/specs/save-system.md)、[002回执](../../../../testing/e2e-002.md)、
  [工具卡](E2E-002-1-inn-route-and-trio.md)。
- `author-script-core.ts:370` page animation与`sprite.ts:51` SpriteActionBinding；
  `projects/pal/content/sprites.json` sprite53/54为static、尚无open pose。
- `s003.json:11346/11435`两门当前default页，交互正文重复设置state/facing/frame；
  `:7822/7846`三人进房链设置frame1。需核全部跨场景引用、关门路径与state1/2含义。
- 全content JSON结构遍历含任意EntityAddress：共18条两门引用，只有e60.auto.legacy-003与
  两门default.trigger三处；均state1→facing down→frame1，无跨场景引用或真实关门路径。
- 保留default页ID/initialPage（默认关闭）；增加open页，同default trigger和interact/range1、无auto；
  sprite53/54各增加单帧frame1、100ms、无cue、nonloop的open动作；base完成后停留末帧。
- 仅在原六个frame1命令位置改selectEntityPage(use open)，不提前到state1，不改其它演出命令。
  state0/1/2的隐藏/可见不挡/可见挡语义与动画正交；不从state1推断open。
- 作者sprites由窄供应保留（`pal-world-sprite-semantic-alias.ts:207`返回currentSprites），两门不是role alias；
  因此本次直接维护作者数据，不改退役转换核或重生成资产。
- 工具旧frame字段只读瞬态Map，不包含page action。新增只读fallback至entityActions.frame并保留
  override优先；门为static且无gait/explicitAnimation。Canvas仍是实际呈现最终证据，不能拿trace替代像素。
- completion改动未修改setEntityFrame/呈现Map/abort清除路径，两门触发flow不是443fold目标；
  不把本缺陷回填成completed cursor失败，也不借修门改SAVE安全点。

## 验收条件与E2E登记

- build前读完门所有实际调用域/第一阶段对应行为，明确唯一Owner/修复白名单并补设计反控。
- 真实主壳回归：开门后保存→清瞬态→正式恢复，门保持开；未开门仍关，必要关门路径可恢复；
  普通人物临时定帧不因此永久化，不重跑奖励/触发/已完成auto。
- 执行入口：当前passed RF001 `15-05-01-983Z` → 正常路线002 → 正式生产barrier dumpSave →
  fresh IndexedDB restore。继续全量实际提交点相等及原Canvas断言，20正文/500文/三人时序保持。
- 证据保留`build/e2e/*002*`，剧情视觉只在冻结修复后的最终集中验收再跑一次。
- 硬性静态门零诊断，相关回归与完整检查；002通过前母卡不关闭。

## 当前模式推进记录

- 2026-10-01 Root：直接核实际门trace、原始档、成功restore调用域与两图；独立缺陷登记。
- 来源冻结9d15218b；实际结束Canvas SHA
  `90e49d7cc22b1a454d250a54ca7447fde8cefc3452c239e2b5320bcd72612400`，恢复末帧SHA
  `001bf25a53146cd9d53045d555de19ad98839a08c96bdf87825b6b992c13179c`。
- 2026-10-01 e2e_002_runner（非Coding Owner，只读）：独立读取原始L411/L3739/L35644、第一阶段真档与
  恢复调用域、全部18条引用、page选择与base动作完成留帧，签`premise verified / design agree`。
  最强反控：open页漏trigger/改complete导致再次交互消失和lease失效；提前选择/漏frame叶/动作增帧或cue
  改时序或画面。独立指出旧trace只看frame Map，不能作为页动作呈现证据；未改文件/未重跑浏览器。
- 2026-10-01 Root：直接读上述原始链、第一阶段真档73/74与报告两Canvas、Save/load/静态补帧代码，
  全作者调用域与现有page/播放器/实际渲染优先级，核`premise verified / design agree`。
  `build allowed`：现有模型作者修复＋窄只读取证；Root唯一写入Owner。先红绿主壳回归，冻结后正式002。

## 下一位Agent提示词

无下一位Agent提示词。非作者复核、冻结正式002与完整质量门通过并收口，不需要用户转发。

## 实现与开发期验证

- Root逐一替换六个原frame叶，并只新增两门open页及sprite53/54单帧动作；schema/runtime/save代码无改动。
- 红例`build/e2e/door-20261001/regression-red-v2.log`：未开门1项绿；e73/e74/e60三个实际作者
  开门正文经真实主壳F5/F9均实际render输入frame1→0失败，作者合同项失败（4红/1绿）。
  早先harness调试红例另保留，不冒充产品反控。
- 绿例`regression-green-v2.log`：门7项＋邻接46项共53通过；实际frame选择spy不替换实现，
  legal小地图适配几何/scene地址，并把两个sprite asset重接11帧合成RLE（保留真实action/layout）；
  e60只抽其完整六条开门段、由fixture trigger调用，不覆盖原auto前后移动/时拍/隐藏或PAL像素。
  全离场链、实际资源与Canvas另由正式002验，不冒称fixture只是地址/几何改动。
  验未开/开/隐藏/回default、两门再次交互、完整script树恢复、一次性setup奖励不重放、
  普通临时定帧仍清除；hidden/closed回归是现有模型测试，不新增作者关门剧情。
- 工具反控`observer-red.log`原Map-only对page base1报0失败；修后`observer-green.log`26项绿，
  override0仍优先于base1。补sprites/实际帧选择/动作播放器hash，Canvas/全World断言未松动。
- `lint.log`2704文件0 error/warning/info、`typecheck.log`零诊断；`author-check.log`当前pal
  294场景/223地图/1934资源闭包通过。完整质量门、正式002和独立代码复核仍待执行，不提前done。
- 独立只读代码复核e2e_002_runner：4fc15826 `accept`，门7/7和工具26/26独立通过；未改文件/
  服务/浏览器。直接核同有效行为page/CAS保留、单帧base完成留帧、恢复清Map后重建与静态门帧优先级。
  指出并已补正上述asset/invocation adapter口径，完整正式World/Canvas门保持。
- Root在冻结4fc15826运行正式RF002 `16-31-19-969Z` passed；49源hash与当前字节逐一相同，
  002原档SHA `42ac15aff0719f8f11b3f59d6001266c59e2075c715d616f5c75985bcfb0136f`，真实restore提交
  全量openingSaveView严格相同；结束/恢复1280×800 Canvas SHA均
  `90e49d7cc22b1a454d250a54ca7447fde8cefc3452c239e2b5320bcd72612400`（723264非黑像素）。
  Root实际看两图，两门frame1/page open，三人completed、500文保持；正式门未放宽。
  实际解码053/054各2帧、无跳尾、资产hash与catalog同；原结束画面SHA与先前失败轮结束SHA亦同。
- 第一次完整`check-final.log` exit1：editor 3691绿/1红，仅旧open-action引用385→387；
  在完整parity前更新精确census并加两门引用身份断言，不能把本轮宣布完整门通过。重新冻结后重跑。
- 窄同步`editor-reference-green-v1.log` 1/1通过；`editor-typecheck.log`零诊断，
  `lint-v2.log`2704文件零诊断、`docs-v2.log`零问题。正文/runtime/观测工具未再改动，
  正式002仍锚定4fc15826；完整质量门另重跑，不用窄门替代。
- 3feb5a77非作者独立只读accept：两门新页直接核收集器，每页1 action＋1 trigger binding，
  两action各加1父sprite alias，精确+4 rows/+6 targetEdgeIds；删除阻挡4374/旧collector全量parity、
  worker 2500000字节上限与完整snapshot相等均未放宽。未改文件/服务/浏览器，无counter。
- 完整`pnpm check`冻结3feb5a77 exit0：10655包测试全绿（Reforge2031含新增7项）、E2E工具57项，
  docs/coverage/quality工具门通过；lint2704文件0 error/warning/info。
  日志`build/e2e/door-20261001/check-final-v2.log`，历史红例/首次census失败原样保留。
  Root最终accept / done allowed；作者意图修复、正式World/Canvas恢复闭合，不改schema/SAVE9或普通瞬态Map。
