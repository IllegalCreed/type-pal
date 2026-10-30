# 批44:reforge audio 族（1 处代码整改 + 3 文件零整改）

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

范围：`packages/reforge/src/audio/` 全部生产文件——`bgm.ts`（297行）、`sfx.ts`（297行）、`sfx-readiness.ts`（377行）、`midi-preview.ts`（353行）；`spessa-browser-runtime.ts`（43行）已在批41覆盖。八维审查（A正确性/B注释/C内聚/D复用/E测试/F可读/G简单/H可测）。

## 整改（1 处,G 简单性）

**bgm.ts `inflightTarget` 只写死状态删除**（提交 b480d92f8）:
- 全仓 grep 证 8 处引用全为写入或条件写入,无一读取影响控制流;取消语义完全由 `requestSerial++` 的 `isCurrent(serial,...)` 门承担。K5 注释（"同曲守卫命中时用于取消换向其他曲的请求"）描述的能力实际不依赖该变量——失实注释随变量一并删除。
- body-invariance: `allEqual:false`（预期——纯代码删除 339B,方法 typescript@6.0.3 parse+createPrinter removeComments）,证据 `body-invariance.json`。
- audio 全族 95/95 通过、numFailedTestSuites=0;typecheck 0 错;scoped biome 零诊断;git diff --check 干净。

## 零整改文件结论

### sfx.ts（297行,零整改）
- readiness 与播放严格分离（未 prepare 绝不迟到补播）;`prepareQueue` 串行批次注释准确（两不相交批次并发 decode 会互相淘汰却都 resolve——队列保证前批 continuation 先行）;`generations` 失效链（作者替换 AssetId 后旧 buffer 与未完成 decode 一并作废）实现与注释一致;LRU touch/evict、`lastSfx` 同音抑制、`dispose` 期间解码结果丢弃全部正确。
- 四个 Error 子类语义分层清晰:Fatal(工作集无效)/Budget(超 64)/Collection(collector 不完整)/Resource(部分资源不可用,成功项仍 ready 可战斗降级)。

### sfx-readiness.ts（377行,零整改）
- 两屏障设计注释准确:base 只收固定队员音/合击/敌 BFS 闭包/roles/双侧活跃毒/遭遇脚本,普通已学技能与整包背包刻意不入(避免作者规模绑定进战工作集);turn 只收实际提交动作+当前活跃毒。
- `BattleSoundClosure` poison→grantItem→item→poison 走 walker 与 core 末 tick 重复语义对齐(`Math.min(seed.tickIndex, ticks.length-1)` 保超长 tickIndex 末项可达);use/throw 施毒目标侧分离有注释;敌偷取物只补本场敌闭包可得不扫全项目。
- 脚本收集:WeakSet 环检测、stable script id 去重、callScript 缺注册表 fail-loud。

### midi-preview.ts（353行,零整改）
- transport 状态机自洽:serial(选曲代)/playSerial(播放代)双代际门在 resume/ensureSequencer 前后各校验一次;`hasExplicitPosition` 语义(暂停/seek 置位、播放消费)贯穿 load/play/pause/stop/seek/snapshot 六入口一致;finished 快照检测要求 `loadedAsset===asset` 防串台。
- load 三态去重(同 key 完成态直返/同 key 在途复用/否则新请求);缓存活动 `cachedActivity` 通道避免重复解析;`bytes.slice(0)` 防 ArrayBuffer 转移。

## 验证
- 定向测试: `src/audio` 全族 95/95、numFailedTestSuites=0（directed.json）。
- typecheck 0 错;scoped biome 零诊断;git diff --check 干净。

## 登记移交（无新增）
本批无新清理候选。

## Codex 2026-10-20 当前有限裁定

BGM只写状态删除成立；本片仅补该源的逐文件依据，不接收其它三源整包八维。发现“无曲零开销”错注：AudioContext仍在构造时创建，现纠正。当前24BGM0stderr，原95只复用native，不补造历史console。 [逐文件依据与原件](../codex-dead-removals.json)。文件保持review，未授整卡/整包accept。
