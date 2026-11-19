---
testingSchema: 2
id: runtime-world-owners
evidence: domains/runtime/world/world-runtime/evidence.json
---

<!-- testing-meta
{"schemaVersion":2,"id":"runtime-world-owners","sourceRefs":[{"path":"packages/reforge/src/main.ts","lines":"444-456","anchor":"const motion = new WorldMotionRuntime","role":"caller","sha256":"0e51a001632f36bb50993d682fb24fb1f9f2f724f5cf83c313dacb00fa897b2a"},{"path":"packages/reforge/src/world-motion-runtime.ts","lines":"167-193","anchor":"export class WorldMotionRuntime","role":"contract","sha256":"a4088a8995b861377e03e98736ee8992fa018c57b031f377897fc9885dbdb2a6"},{"path":"packages/reforge/src/world-scene-presentation.ts","lines":"72-89","anchor":"export class WorldScenePresentation","role":"contract","sha256":"1ea1fe7be8d8e441db8537c9195dbee58e29531f6586c059b4d3e45d13a5e52b"},{"path":"packages/reforge/src/world-motion-runtime.test.ts","lines":"7-30","anchor":"describe('WorldMotionRuntime ownership'","role":"oracle","sha256":"2c8cf4c66b8e685b2a60abe43cf3bc55ce542f4e8dd8745987243cea26913559"},{"path":"packages/reforge/src/world-scene-presentation.test.ts","lines":"82-105","anchor":"describe('WorldScenePresentation sprite ownership'","role":"oracle","sha256":"2fa7b81e44587f618e64c0eef791e8c73be4ad59693cbe314ee314015ff4ae3b"},{"path":"packages/content/src/character.ts","lines":"169-171","anchor":"export const CONTENT_VERSION =","role":"version","sha256":"b3137cdeeb8077ab7d8bf8f352ce1661e8173fbd17e316399e11148dfaf0c432"}],"publicCallers":["bootGame → WorldMotionRuntime + WorldScenePresentation","advanceMoves → canonical endpoint/live position/touch","render → scene presentation snapshot"],"legalInputs":["当前 scene session/authority/runner lineage","production MotionRuntimeCoordinator 与合法 GridPos","typed scene/renderer draw snapshot"],"businessOracle":{"type":"runtime-world-owners","assertions":["endpoint 先落 canonical，live 提交后 touch，再唤醒 continuation","party/实体取消释放监听器与 waiter","每帧自身锚点与 frame priority/shake/wave 保留"]},"dedupe":{"result":"source-review-no-new-test-credit","against":["docs/testing/archive/legacy/ops/testing-records/architecture-continuation-integration.md","domains/runtime/world/world-runtime/history/report.md"],"notes":"MotionRuntimeCoordinator 仍拥有 authority/slot；WorldMotionRuntime 管外围节拍和生命周期。ActiveScene 拥有资源、presentation 拥有绘制状态，不能把两份报告重复算整场景 E2E。"},"revision":{"currentSha":"d02278dc0154dd73b5db24388a35c30bb096cc81","contentVersion":22,"minimumSaveVersion":11,"history":[{"revision":"d02278dc0154dd73b5db24388a35c30bb096cc81","date":"2026-10-04","action":"source-and-publication-audit","notRun":["runtime","E2E","coverage"]},{"date":"2026-11-06","action":"e2e-r4-runtime-source-bridge","base":"dccd4095fff93626f16c68f8d4aca3627ff6e8e7","previousSourceRefs":[{"path":"packages/reforge/src/main.ts","lines":"434-445","anchor":"const motion = new WorldMotionRuntime","role":"caller","sha256":"f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120"},{"path":"packages/reforge/src/world-scene-presentation.ts","lines":"71-88","anchor":"export class WorldScenePresentation","role":"contract","sha256":"e6edaddf9e78747a11e409f6058d6f3014f169b799cda182a225827cc700efa0"},{"path":"packages/reforge/src/world-scene-presentation.test.ts","lines":"82-105","anchor":"describe('WorldScenePresentation sprite ownership'","role":"oracle","sha256":"0925a2b288cab4ba75f054c6880845e5ef800d80ba07d8dc2bd04c5dc8f716cd"}],"scope":"WorldMotionRuntime 与 WorldScenePresentation 构造接线下移两行且字节相同。新增 static 明雷步态分支，原 directional fixture 及帧优先级、锚点和层几何断言保留。","evidence":"docs/tasks/evidence/E2E-R4-1-runtime-source-bindings-20261106.md"},{"date":"2026-11-07","action":"pal-shared-chest-source-bridge","base":"8f6c0033d7351454608f9507067db9dd75dc9c90","previousSourceRefs":[{"path":"packages/reforge/src/main.ts","lines":"434-445","anchor":"const motion = new WorldMotionRuntime","role":"caller","sha256":"ed8224efc4537a60b4a6c8a570ccbed78216604448b6b267024cc2a238f02654"}],"scope":"WorldMotionRuntime 的构造接线逐字相同，移动提交、生命周期和绘制所有权的来源和判据沿固定父。","evidence":"docs/tasks/evidence/PAL-SHARED-CHEST-1-source-applicability.md"},{"action":"content23-acquisition-source-rebinding","base":"0973c2c25795fd2aacf78daedebb8d8f2a5113fc","date":"2026-11-07","evidence":"docs/tasks/evidence/N6B-ITEM-FLOWS-1-source-applicability.md","previousSourceRefs":[{"path":"packages/content/src/character.ts","lines":"168-170","anchor":"export const CONTENT_VERSION =","role":"version","sha256":"8d3d592d75e78c9559986b5747e7b2395aaac010bf8dde9d6ea5f164bba29a93"}],"scope":"核 content23、四类取物及其真实 caller 的来源适用性；保留原执行版本、候选、状态、断言与附件，不把历史录制改记为本轮通过。本轮运行与编辑器验证独立见 N6B-ITEM-FLOWS-1。"},{"action":"q2-ordinary-defeat-source-rebinding","base":"f84bcd91dd71498e1099e7bf8f4b2d7900507090","date":"2026-11-13","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/main.ts","lines":"434-445","anchor":"const motion = new WorldMotionRuntime","role":"caller","sha256":"da7ffb6591f607b1950a179c61b2a5d4e0eaa34873f2ed78a699ed3cd39cb42c"}],"scope":"全灭流程与其测试变更后，绑定本项已存在且字节相同的调用或判据片段，保留原执行和主张。"},{"action":"q2-world-victory-source-rebinding","base":"11b5b8d8183147732b9ea30560b5eb2bec4b2d7f","date":"2026-11-14","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/main.ts","lines":"435-446","anchor":"const motion = new WorldMotionRuntime","role":"caller","sha256":"d2943ee30023947bc29861ee35f36ce14faac1832a93af75ad88ad7894905144"}],"scope":"Current source applicability for the fixed victory hold candidate; preserve prior source claims, execution identity, and published results."},{"action":"q2-world-battle-handoff-source-rebinding","base":"9f5f57d4df53ea122622ffda110807e39e0ec66e","date":"2026-11-14","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/main.ts","lines":"440-451","anchor":"const motion = new WorldMotionRuntime","role":"caller","sha256":"37b4798aba9621fb3530163469fa95b713c0bfe17d57b587e949bd277d4a6fb5"}],"scope":"世界运动构造的已刊范围逐字节对应。原主张和运行证据照原出版。"},{"action":"q2-project-victory-version-source-rebinding","base":"31cfe5387c5d555b05b05dc1987e7ed31022f3a3","date":"2026-11-14","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/content/src/character.ts","lines":"168-170","anchor":"export const CONTENT_VERSION =","role":"version","sha256":"0a67777ed9a2ee576a292cb7281936e4f5183542877fbb170be8c82d19249259"}],"scope":"工程明雷胜利默认值只新增类型引用和可选字段。内容与存档版本声明逐字节一致，已刊主张和执行照原记录。"},{"action":"q2-battle-lifecycle-source-rebinding","base":"2d17adc064409630aa74415dc8195080d2344d28","date":"2026-11-15","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/main.ts","lines":"441-452","anchor":"const motion = new WorldMotionRuntime","role":"caller","sha256":"03e13529a6eca097898efd7d77cdb390832cc34d80f5a3c7cfd87509fae5e86b"}],"scope":"依据当前冻结源码，保全旧候选、调用片段、原件与运行结果。新的行为只由战斗生命周期证据证明。"},{"action":"q2-battle-review-source-rebinding","base":"761bc57b8c2420413580b209088db0b87d060cc2","date":"2026-11-15","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/main.ts","lines":"441-452","anchor":"const motion = new WorldMotionRuntime","role":"caller","sha256":"64fff16b76d82e5bb4f3848f673f0ad88f5fa0fce7c94a018691a74fd408f11b"}],"scope":"按本轮固定引用片段核对原调用与判据，保留已出版执行、候选与原件。"},{"action":"q2-battle-closure-source-rebinding","base":"4b2692d65917034f3743a348ca161d2ffb447b97","date":"2026-11-16","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/main.ts","lines":"441-452","anchor":"const motion = new WorldMotionRuntime","role":"caller","sha256":"5af0d49fd26c095bb28f8c74b2e4c365febcf9881706fe6a25afa645f363d305"}],"scope":"相关完整锚点与冻结前驱字节一致，更新当前文件摘要与实际位置。旧命令及结论按原件复验。"},{"action":"q2-world-incense-source-rebinding","base":"5e3c1f59de533fa43ceed1ac052c9bcd84f1849b","date":"2026-11-19","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/main.ts","lines":"441-452","anchor":"const motion = new WorldMotionRuntime","role":"caller","sha256":"8c8472f7c6aab17d385537406fcd6fa79fa1e50ded49d31bf2660fc937725df6"},{"path":"packages/reforge/src/world-scene-presentation.ts","lines":"71-88","anchor":"export class WorldScenePresentation","role":"contract","sha256":"81af6d6d3582ecff255b2242b108ffb270b4c9e017bc015b687417b409d402d2"},{"path":"packages/reforge/src/world-scene-presentation.test.ts","lines":"82-105","anchor":"describe('WorldScenePresentation sprite ownership'","role":"oracle","sha256":"f18b1755bab15ad924c19700cc53f9c87d3a4712b44cd70ba7afbb35be719bf6"}],"scope":"核感知香候选后的七处现行片段。旧执行、原件、断言和发布身份按原记录。"},{"action":"q2-scene-item-exit-source-rebinding","base":"25b4d5430f7daa410cef5e91447ac02e1dc00c3d","date":"2026-11-19","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/main.ts","lines":"441-452","anchor":"const motion = new WorldMotionRuntime","role":"caller","sha256":"8a4af5f672f57bf901a7129645548fcf1f50541f5925f424a2e16987898d5db7"}],"scope":"核场景用物候选后的五处现行片段。旧执行、原件、断言和发布身份按原记录。"},{"action":"q2-story-presentation-source-rebinding","base":"759886346d091f3dc2c0b67f72547c6861b81b6a","date":"2026-11-19","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/main.ts","lines":"442-453","anchor":"const motion = new WorldMotionRuntime","role":"caller","sha256":"090dfdd1f275e9c00e6f94909b0ec91ee1433edb8b02649cf7c6b1791a9b7514"},{"path":"packages/reforge/src/world-scene-presentation.ts","lines":"72-89","anchor":"export class WorldScenePresentation","role":"contract","sha256":"213eebd6ee915b21baad7403e67ec5f9fb7810203e39cb2f1eafc1f616476b80"},{"path":"packages/reforge/src/world-scene-presentation.test.ts","lines":"82-105","anchor":"describe('WorldScenePresentation sprite ownership'","role":"oracle","sha256":"2dfb43293476c7f6d468320612871cc1943c81914a8309ec5189894c0a120a25"}],"scope":"重绑四组现行引用。旧执行按既有候选恢复，两处构造片段按震屏输出职责迁移逐字节核对。"},{"action":"q2-cliff-entry-source-rebinding","base":"abfc31fcfd9a4ef16380ef4ae054604ad6159762","date":"2026-11-19","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/main.ts","lines":"443-455","anchor":"const motion = new WorldMotionRuntime","role":"caller","sha256":"24c8c811af1b5d863dd45ca3346e93fa2a248f1aa0530589765c3bd9cb917a05"}],"scope":"核现行引用字节相同；仅将入场淡入与前景正文的并行能力接到现有呈现事务。旧执行保留原修订。"},{"action":"fragment-party-pose-source-rebinding","base":"aee2d69c439378a5be98b154c2b788fbfed0a594","date":"2026-11-19","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/main.ts","lines":"443-455","anchor":"const motion = new WorldMotionRuntime","role":"caller","sha256":"ac9ee1b342efa818b3f5ee98ac75c309570c473b347a26c0ef94f0fad86f38e7"},{"path":"packages/reforge/src/world-scene-presentation.ts","lines":"72-88","anchor":"export class WorldScenePresentation","role":"contract","sha256":"ccd2bd9a94e7b76c85320f2c86e890f2625d61b72c89477fb8d3d4227a8ab00e"}],"scope":"单次点名姿势落在当前队员实例。核主文件入口范围逐字等同；呈现宿主范围只增加队员临时姿势表，历史执行身份与 Q2 战斗结论原样保留。"},{"action":"q2-coverage-and-scene-fade-source-rebinding","base":"45e199287d99ed0e2e4ed3f0bb8dd716f6d9d335","date":"2026-11-19","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/main.ts","lines":"443-455","anchor":"const motion = new WorldMotionRuntime","role":"caller","sha256":"a8752599580032fc642a55272af92bff0ac2e4b0f7006424a07d8570a8e68ead"}],"scope":"核装备、原编队及场景淡出合入后的来源适用性。引用片段与固定前驱逐字相同，历史执行、输入与断言保留。"},{"action":"q2-placement-feedback-source-rebinding","base":"cb83b4f76a150915105121482cbef9e4edd58d58","date":"2026-11-19","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/main.ts","lines":"443-455","anchor":"const motion = new WorldMotionRuntime","role":"caller","sha256":"b4775126324865d875104f49c04c8794117393f2d2cb4bc2ad467dcf5692eb58"}],"scope":"核场景用物受阻修复后的来源适用性。原菜单所有权、测试入口、场景和战斗引用片段与前驱逐字节相同。"},{"action":"q2-peach-grove-source-rebinding","base":"b1d046a12de4ec4082a5acbae64be24253881990","date":"2026-11-20","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/main.ts","lines":"443-455","anchor":"const motion = new WorldMotionRuntime","role":"caller","sha256":"2c0b1b8dd4dfa65558dc01ad32d9d2387484643ced17494cee838a04e3fa6cc2"}],"scope":"桃花林沿用来源脚点和常规跟随状态。原场景、相机、战斗、世界动作及存档引用片段逐字相等。"},{"action":"q2-world-notice-source-rebinding","base":"0b315ffc89248b157112ca83ebf77d557d6224ad","date":"2026-11-20","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/main.ts","lines":"444-456","anchor":"const motion = new WorldMotionRuntime","role":"caller","sha256":"dd136bdc4e175f0273ba803cc3479ad3095455dae4585cd58f403a47f9b4441b"}],"scope":"战外定时叙述归并关闭入口。原场景、相机、战斗、世界动作及存档引用片段逐字相等。"},{"action":"q2-entry-auto-source-rebinding","base":"814bd6c6195232e432cd39ccbcd450e78b9e2f95","date":"2026-11-20","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/main.ts","lines":"444-456","anchor":"const motion = new WorldMotionRuntime","role":"caller","sha256":"f2cf272fba59ab7ec2a80126ec76a56dbd254c1a59d2978c86ba92d57718fcb2"}],"scope":"脚本换场收尾与已恢复自动等待按当前游标接线。原场景、相机、战斗、世界动作及存档引用片段逐字相等。"},{"action":"q2-yangzhou-rooftop-source-rebinding","base":"7488f2961b0ef59a6020b6fe8bf419ccda8f1bc9","date":"2026-11-20","evidence":"docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md","previousSourceRefs":[{"path":"packages/reforge/src/main.ts","lines":"444-456","anchor":"const motion = new WorldMotionRuntime","role":"caller","sha256":"26fc300b36ff338585b5af66c8d9acfe504496de5f4e38cdec97d19c3d882392"}],"scope":"剧情战共享实绘结算输入门，落步触发先落实跟随队形，追逐转弯保留离格方向。分屏器接入原场景起战。九个既有引用片段逐字节相等。"}]},"evidence":"domains/runtime/world/world-runtime/evidence.json"}
-->

# 世界移动提交与绘制状态所有权

Owner: Codex
Status: current（source/publication；未新增动态验收）
Last reviewed: 2026-10-15
Template: test-domain-report-v1 / 1.1.0

2026-10-27 当前 caller 索引维护：逐字节比较525656d2与dccd4095的本页 main.ts声明范围，全部原位相等；完整文件仅另含已核的载具步态/页动画所有权修复。同步当前文件 SHA，不变更历史 candidate/revision/versions、原执行结论、source pin 或 performed=false；本页不新增运行时/覆盖率信用。

2026-11-06 来源核验。呈现端新增 static 明雷的步态分支。原定向精灵的覆盖优先级、实际帧和每帧几何判据仍由既有 fixture 检查，普通明雷的新运行结论由 007 单独承接。[来源复核回执](../../../../../tasks/evidence/E2E-R4-1-runtime-source-bindings-20261106.md)记录前后指纹和核读范围。

## Domain scope

本报告范围为phase2/reforge。WorldMotionRuntime管外围节拍/生命周期，MotionRuntimeCoordinator管authority/slot，presentation管绘制；不能与ActiveScene重复计整场景E2E。
原revision、candidate与content/SAVE版本保持各次出版/执行范围；本次只迁移正文并修正文中已漂移的导航锚点。

### 复核范围与结论

旧正文中的不合 main/未统一门仅为候选时点；当前由 unified integration 收口。未读取 console 的原最小功能过程保持未证，不倒填 console 零错误；完整剧情观感仍另归 E2E。

本轮结论为当前源码接线与历史出版记录已核读。没有重跑运行时、旧反控、浏览器或覆盖率；历史证据不可因文档治理升级为当前动态验证。

## Claim matrix

以下为原业务合同的义务投影，source-backed和静态接线不转为本次runtime-backed。

| 合同义务 | 一手范围 | 本次判定边界 |
|---|---|---|
| canonical endpoint→live position→touch→continuation顺序 | 原sourceRefs、对应owner/test合同 | 只核来源/范围，未运行 |
| 替换/取消释放相应waiter/listener | 原sourceRefs、对应owner/test合同 | 只核来源/范围，未运行 |
| 每帧锚点/priority/shake/wave与实际绘制帧分开观察 | 原sourceRefs、对应owner/test合同 | 只核来源/范围，未运行 |

## Inputs and fixtures

输入仍限原typed/caller域，不造产品外fixture或改旧测试；每个sourceRef的当前hash/行号由真实配对consumer核验。
原正文列表中旧行号仅做下列有源更正，源Git blob与回执保留before→after，不改原业务结论。

### 真实 caller、输入与业务 oracle

- `packages/reforge/src/main.ts:443-455`（caller；anchor `const motion = new WorldMotionRuntime`）
- `packages/reforge/src/world-motion-runtime.ts:167-193`（contract；anchor `export class WorldMotionRuntime`）
- `packages/reforge/src/world-scene-presentation.ts:72-88`（contract；anchor `export class WorldScenePresentation`）
- `packages/reforge/src/world-motion-runtime.test.ts:7-30`（oracle；anchor `describe('WorldMotionRuntime ownership'`）
- `packages/reforge/src/world-scene-presentation.test.ts:82-105`（oracle；anchor `describe('WorldScenePresentation sprite ownership'`）

公开调用链：bootGame → WorldMotionRuntime + WorldScenePresentation + ScreenShakePresentation；advanceMoves → canonical endpoint/live position/touch；render → scene presentation snapshot。合法输入：当前 scene session/authority/runner lineage；production MotionRuntimeCoordinator 与合法 GridPos；typed scene/renderer draw snapshot。

业务判据：endpoint 先落 canonical，live 提交后 touch，再唤醒 continuation；party/实体取消释放监听器与 waiter；每帧自身锚点、精灵选帧优先级与水波按原绘制合同处理，震屏由最终输出层按世界拍或帧动画推进。这里是对既有测试合同的核读，不是新增测试或历史运行真实性再认证。

## Results and gaps

- 旧最小浏览器未读取console，不倒填console零错误；119项定向记录属于原主任务，不代替本报告整体验收。
- save capture/restore、离场恢复与完整剧情另须真实任务证据；暂态命令frame不是实际renderer选帧。

原content22/minimumSave11为10-04出版revision，现行源常量content22/minimumSave12单列；源核读刷新不升级旧实跑。

### 排重和处理理由

MotionRuntimeCoordinator 仍拥有 authority/slot；WorldMotionRuntime 管外围节拍和生命周期。ActiveScene 拥有资源、presentation 拥有绘制状态，不能把两份报告重复算整场景 E2E。

保留唯一历史 report/evidence；当前索引与报告 supersede 原平面材料的导航和当前状态口径，原失败、warnings、计数和候选 SHA 均由 [历史报告](history/report.md) 和 [原始机账](history/evidence.json) 保留。


### 证据与 revision

[配对文档核读证据](evidence.json)记录 source hashes。原始材料迁移前 hash 在 [迁移计划](/docs/testing/archive/migrations/testing-domains-20261004.json)；2026-10-04 核读内容22/保存11，历史内容20/保存8不升级；本次 SAVE12 源核验范围见页首。

2026-10-04：基线 d02278dc0154dd73b5db24388a35c30bb096cc81，迁移+source audit；未重新执行产品，原作者验收与历史 counter 按旧记录保留。

### 历次核读记录（原日期与范围）

以下日期段按原文保留；其中“当前”“本轮”指各原段落时点，不作为今天新执行或演出验收。


2026-10-10 当前源码核读：重新读取 WorldMotionRuntime / presentation 真实 bootGame 接线。ride 的 preserveFacing 仅属于暂态 slot，不进入 save schema；同 script authority 下的单步 gait 保留至显式 release/pose/收尾边界。119 项当前定向 native/author/runtime 检查见主任务卡，不替代本报告的历史整体验收。



2026-10-06 SAVE12 源核验：当前版本常量为 content22 / minimumSave12，源文件 SHA 以本次核读的集成工作树为准；revision / candidateSha / versions / history 与既有 runtimeExecution 仍记录原核读或实跑，不升级为 SAVE12 通过。本次未执行运行时、E2E 或覆盖率；新 SAVE12 的 001–006 独立双轨及连续链仍待生成和验收。 已核 main 的 canonical endpoint → live position → touch → deferred continuation 顺序，motion 的取消释放和 presentation 的定帧优先级。新增 captureEntity/restoreEntity 保存步态、显式动画与 move 节拍；旧 owner 测试不因此覆盖 SAVE12 保存/离场恢复。

2026-10-06：重新核读本页 sourceRefs 的实际 caller、合法输入及断言，并更新当前工作树的哈希/行号。此项只是源码证据刷新，不把历史执行升级为当前全量通过；本轮独立录制、帧差异与连续验收状态统一见 E2E-CONTINUOUS-001-006 任务卡。


## Quality gate

本批只运行文档合同/链接/索引、source SHA、真实publication配对与全仓静态门；产品、旧测试、coverage只读。
原warnings、counter、缺raw、视觉/console限制均保留。后续质量或动态任务须独立核caller、合法输入、oracle与有效反控，
不能由模板或publication绿色替代；当前已核的source refs不是整个实现或旧测试质量的重新accept。
