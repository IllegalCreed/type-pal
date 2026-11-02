# C02 宿主与删除生命周期证据

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「C02 宿主与删除生命周期证据」的治理候选页;原件按固定main源逐字节保全。任务见 [QUALITY-EDITOR-DIAGNOSTICS-2.md](../../cards/QUALITY-EDITOR-DIAGNOSTICS-2.md)。本片单一 Coding Owner=Codex,用户 2026-10-15 明确要求继续 BattleSpriteLibrary C02;仅三文件白名单(battle-sprite-harness.tsx、battle-sprite-ui.ts、BattleSpriteLibrary.c02-g04.cursor-r1.test.tsx),不改产品/schema/save/资产管线/UI。当前 build→review;不提前声明 accept 或关闭文件。

## 来源与输入

G04 原十例完整保留并做消融:baseline 404 条未包 act→仅宿主 340→宿主+驱动 234→再等待真实删除提交 0;每次完整 JSON 与 raw.gz 均保留(baseline.json/host-only.json/host-ui.json/lifecycle.json)。实际生产 caller 为 DataMode.tsx:693-720;私有 BattleSpriteAssetCache 默认 spy 透传,只观察当前 reader 的实际 Promise,未替换核心或另造 decode;色表观察来自当前 assetResolver.readRoleText,异常由真实 preview catch 渲染,不用 allSettled 代替错误 oracle。实际读取范围及未核 caller 见 read-boundaries.json:三白名单、BattleSpriteLibrary.tsx 1793 行、BattleSpriteInlinePreview.tsx、fixtures/oracle/kit/reader 及相邻 G05/G06 全文,cache/色表/session/命令链按调用段核验,不据此关闭依赖文件。存活入口:[QUALITY-EDITOR-DIAGNOSTICS-2.md](../../cards/QUALITY-EDITOR-DIAGNOSTICS-2.md) [window-review.md](window-review.md)。

## 断言与业务 oracle

精度与排重(当前候选):G04-03 改为合法未保存 snapshot(含真实上游字节,先证 blob 存在再走 UI 删除),替代原初始就不存在的虚弱断言;G04-07 精确核真实 sha 错误、原 state 身份与 preview 错误,同长度磁盘损坏仅作 IO 边界反例;G04-02 取消确认仅一次且 state 原引用;G04-05 补齐 undo 的 catalog 恢复并继承磁盘 blob SHA/目录/解码 oracle。G04-04 磁盘删除→undo 的全部业务 oracle 并入 G04-05,10→9;没有删除独立 pending-blob、取消、失败、引用 readiness、双删除历史或定义/资产两步轴(逐例合同:01 入口互斥、02 取消不变、03 初始 pending blob 删除与宿主焦点、05 磁盘 undo→真实解码→redo、06 stale 索引禁用及恢复、07 IO 错误拒绝/零污染、08 双删除双 undo 顺序、09 定义/资产两步 undo、10 真实内容引用阻止删除及引用计数)。final 两枚产品 mutant(删除改 void、错误泛化)使旧 oracle 各绿,新 oracle 各恰一指定 AssertionError;恢复 9/9、0skip、0诊断,原件见 oracle-final-proof.json,独立重建见 oracle-rebuild.json,oracle-proof.json 是精简前十例快照保留历史。retirement-proof.json 已与官方旧 baseline 的 10 例身份摘要匹配,只增精确 metadata。相邻 G05-04 只删定义不删资产、G05-06 替换字节、G05-09 追加收紧,均非本片磁盘删除历史;其余全库排重仍未知,不写'没有任何重复'。

## 结果

相邻 9 文件 79 例通过、535 条其它 act,不称统一门通过(adjacent.json/adjacent-final.json)。完整模块窗口见 [window-review.md](window-review.md):check/确认版 ratchet/普通 protected 数值均通过,G04 与 C01 在三门均 0 诊断;全仓仍 2049/2076/2081 条未包 act、577/584/584 环境、各 2 导航,严格零诊断门不通过,未合 main。源码五项冻结,所有 raw.gz 字节与 SHA 核实;正式 baseline 736 源文件/19861 测试且所有覆盖计数与其它包记录完全不变,只有 G04 10→9。三文件仍 review,0 关闭,3284/229 closed/51 review/3004 pending。检查点 ledger 首次失败(新增行误写不支持的'待审'状态)已改为工具支持的 review,未将失败算通过。

## 限制与复核

定制 source 可能有意挂起,默认保留其 pending 语义,显式等待由 caller 控制;异常清理无独立故障用例,历史 pending Promise 导航域待反证;G01/G02/G05 仍合计 535 条 act 待下一卡。统一零诊断门不通过前不合 main,不宣布 94–102 或全仓治理完成;用户后续明确要求把 94、95、97–102 已发现问题全部修妥,原产品停止线保持。下一可直接继续范围(C02 共用驱动与 G01/G02/G05)及只读准备见 next-read-boundaries.json。未重跑原命令/浏览器/测试;历史结论保持原时点;候选待 Owner 接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3469B / SHA-256 4515b8259811c8709f368bb1ff0b1dafaa889eabf4fc9a0a29cd53ddb4178dc4；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# C02 宿主与删除生命周期证据

任务见[QUALITY-EDITOR-DIAGNOSTICS-2](../../tasks/QUALITY-EDITOR-DIAGNOSTICS-2.md)。
当前build；G04原始执行与JSON保存在baseline.raw.gz、baseline-tests.json.gz，元数据baseline.json。
后续逐文件结论、消融、oracle与统一门在本目录更新；不提前声明accept或关闭文件。

G04原十例完整保留：baseline404、仅宿主340、宿主+驱动234、再等待真实删除提交0；每次完整JSON与raw.gz均保留。
实际生产caller DataMode.tsx:693-720；私有cache默认spy透传，只观察当前reader的实际Promise，未替换核心或另造decode。
色表观察来自当前assetResolver.readRoleText；异常由真实preview catch渲染，不用allSettled代替错误oracle。
相邻9文件79通过、535条其它act；不称统一门通过。实际读取范围及未核caller见read-boundaries.json。
三文件列review，0关闭。下一步核G04 oracle/重复，再集中完整门。

检查点ledger首次失败：新增行误写不支持的“待审”状态，已改为工具支持的review；未将失败算通过。

## 精度与排重（当前候选，完整门待续）

- G04-03：合法未保存snapshot含真实上游字节，先证blob存在，再走UI删除；替代原初始就不存在的虚弱断言。
- G04-07：同长度磁盘损坏仅为IO边界反例；精确sha错误、原state身份与preview错误均核，未混成合法业务输入。
- G04-02：取消确认仅一次且state原引用；G04-05：补齐undo的catalog恢复并继承磁盘blob SHA/目录/解码oracle。
- G04-04并入G04-05，10→9；没有删除独立pending-blob、取消、失败、引用readiness、双删除历史或定义/资产两步轴。
- final-oracle-*：两个产品mutant使旧oracle各绿，新oracle各恰一指定AssertionError；恢复9/9、0skip、0诊断。
  原件/执行集合/命令/cwd/源与test SHA/精确清理见oracle-final-proof.json；独立重建见oracle-rebuild.json。
  oracle-proof.json是精简前十例快照，保留历史；不当最终九例恢复证据。
- retirement-proof.json已与官方旧baseline的10例身份摘要匹配；只增精确metadata，判据/拒绝测试不变。

逐例合同：01入口互斥；02取消不变；03初始pending blob删除与宿主焦点；05磁盘undo→真实解码→redo；
06 stale索引禁用及恢复；07 IO错误拒绝/零污染；08双删除双undo顺序；09定义/资产两步undo；10真实内容引用阻止删除及引用计数。
04/05均为authored无用途磁盘源；3/4帧在删除/undo命令不分支，04所有业务oracle已进入05。
相邻G05-04只删除定义，未删资产；G05-06替换字节，G05-09追加收紧，均非本片磁盘删除历史。
主BattleSpriteLibrary测试已读fail-closed/live provider段；registry已读pending真实caller。其余全库排重仍未知，不写“没有任何重复”。

## 完整模块窗口（当前）

[逐文件裁定与统一门](window-review.md)：check/确认版ratchet/普通protected数值均通过，G04与C01在三门均0诊断；
全仓仍2049/2076/2081条未包act、577/584/584环境、各2导航，严格零诊断门未通过，未合main。
源码五项冻结，所有raw.gz字节与SHA核实；正式baseline736/19861且所有覆盖计数与其它包记录完全不变。
三文件仍review，0关闭，3284/229closed/51review/3004pending。完整实际原件见window-proof.json与scope-proof.json。
```
<!-- incremental-original-source:end -->
