# CODE3h 启动屏障测试与fixture复审

基点f2529c5fa，main=f98d0ddd8，唯一codex/code-quality-3y。三文件切片，只改两测试与test-only fixture；生产、资产、配置、规则、官方baseline保持。0新增关闭，全83卡仍13partial/70pending/0整卡accept，94–102/editor目标保留。

## 逐文件证据与未核域

完整/分段读取、SHA及限制见[读取边界](read-boundaries.json)。实际生产primary是bootstrap-resources.ts全文：soundfontData原始拒绝、soundfontSettled只settle、resourcesReady等待三端口且只将glyph失败降为undefined。bootstrap.ts:241–249先await资源，:469–479注入MIDI预取，:1874–1886再等音色库/可玩门；audio-midi.ts:143–152消费预取拒绝再走既定取数。main.ts先装retry再包boot fetch。第一阶段SDLPal无该浏览器启动API，N/A；本片不改第一阶段机制、音色库或二阶段。

| 实际修改文件 | 直接发现与当前处理 | 限制 |
|---|---|---|
| shell/bootstrap-resources.test.ts | 空对象强转并非LoadedAssets；“原始拒绝”只验消息。改为共用typed输入、原始Error身份及独立ready/settle；FM端口用可结局正控，所有实际deferred在finally收尾。4→3，glyph弱重复转Grok完整合同 | 仍review，不冒充完整bootstrap/浏览器可玩门验收 |
| shell/bootstrap-resources.grok-mid-1.test.ts | 原三gate同时释放，漏glyph独立屏障；两默认端口例各留下四个未结局fetch Promise。现在先结局assets/dialog、glyph最后释放；deferred注册与真实生产load的三Promise均在afterEach/finally消费，随后恢复globals/mocks。九身份保留 | 默认端口只证请求/Response及soundfont合同；收尾以scene 503结束真实loadAll，不声称默认资源全成功 |
| __tests__/grok-boot-mid-1/legal.ts | 原role空表无法由成功loadAll返回，event空段不能满足bootstrap后续前提；另有无必要空数组强转。补role0与首segment，移除那些强转，主测试复用同一fixture | 固定role字段是合法输入数据，不新增角色算法或公共helper；此端口token不是完整可玩游戏输入。其它palette/scene/chunk/PNG helper body不改，整域仍review |

loadAll在loader.ts:198–199直接拒绝缺role0，bootstrap.ts:306–307读首segment。角色/事件字段对照shared/tables.ts:482–597、events.ts:179–202；没有用强转补洞。共用helper实际caller还包括scene-cache/dialog-resources，两份全文读取、定向执行；不把其测试全绿自动算本轮文件接受。fetch-retry实现与三测试已读、尚待下一片：最后Error身份样本复用同一Error、GLM卸载例直接换新fetch等待核，未动实现或删除未知例。

## 两个补证及排重

[before-proof](before-proof.json)/[after-proof](after-proof.json)保存每轮完整两文件原生集合、身份/状态、源和临时副本SHA、命令/cwd/exit/signal/spawn与清理；正式生产源始终不变。

| 临时变异 | 原13例 | 新12例 | 判据 |
|---|---|---|---|
| 正常源 | 13绿 | 12绿 | 完整对照 |
| soundfont原错误换成同消息新Error | 13绿 | 11绿/1个主测试AssertionError | 真实原异常身份补证 |
| glyph与另外两资源race，后两者完成便可提早放行 | 13绿 | 11绿/1个Grok独立glyph屏障AssertionError | 真实gate已结局后仍必须等glyph；源变异完整公开，不是移除多重守卫 |
| 删glyph警告 | 11绿/2红 | 11绿/1个保留Grok例AssertionError | 原oracle 2→1转移，不是新缺口 |
| glyph失败返空table而非undefined | 11绿/2红 | 11绿/1个保留Grok例AssertionError | 原oracle 2→1转移，不是新缺口 |

保留的Grok降级例包含同一glyph异常路径、完整三输出引用/undefined、精确警告及额外双资源等待；原主例的值与warn断言是其弱子集。只删除这一已证重复，未批删其它待核用例。全部业务/转移失败真实default reporter均AssertionError，0skip/act/环境/stderr块。before原生五轮在fixture首次修改前已结束，[时间证据](before-fixture-timing.json)保留，未让新fixture混入旧对照。

## 实际请求收尾与失败隔离

[io-observation](io-observation.json)只在临时测试副本加透传fetch观测：真实调用Promise入表、finally结局时出表，恢复global时核表为空，不替换加载核心或Response读取。

- 旧两文件原13例仍被执行，观察hook在两条默认端口例各检出4个pending：原生11绿/2个AssertionError；其它七条Grok记录0。
- 新正式源码副本12例全绿，九条Grok记录全部0 pending。finally/afterEach先释放四端口并消费真实ready/font/settle，再恢复global。
- 对新两条默认例各故意插入失败断言，原生10绿/2个指定AssertionError；九条恢复时观测仍全0。这只是失败teardown诊断，不计产品针或新增正式测试。

收尾Response明确：glyphs空表合法、portrait空清单、真实RLE图标两帧；scene返回503使loadAll硬失败并被消费，防止再请求后续资源。没有静音console、skip、timeout延长或生产错误吞掉。这里观察的是测试Promise结局，不据此宣称存在真实网络/浏览器内存泄漏。

## 精确身份、历史差异与覆盖

[collection](collection.json)有三轮native list、两轮真实生产源V8。main及本片基点均为4+9；旧d4cf7f57d只有3+9（未加入后来FM例），原件独立保留。初版collector误要求所有历史字节相等而在任何native运行前退出，见[snapshot诊断](snapshot-diagnostic.json)；随后按真实旧快照另收list，没有改历史测试或跳过差异。

精确退役[retirement](retirement.json)只批准当前主测试4→3，旧identityDigest与现行官方baseline的4例记录一致，新digest/源SHA来自当前native list。表29/net64→30/net65，旧29项、matcher、全部拒绝合同不变；旧3y的3→3不同身份不混成同一次退役。baseline只读，未手写任何基线。

真实bootstrap-resources.ts局部V8旧/新保持：statements12/13、functions6/7、branches6/6、lines11/12；默认warn函数未执行，不称全覆盖，不为补百分比堆弱例。仅局部对照，不冒充官方ratchet/protected。

[verify.py](verify.py)另进程只读重建10业务/转移轮、3 IO轮、5 list/V8轮、源/测试/fixture副本、三历史快照、精确批准数据与清理。首次verifier不识别Vitest将两个相同hook失败列成相邻FAIL头/共用同一错误正文的格式，见[诊断](verify-diagnostic.json)；现在只允许已知失败头且原生failureMessages完全一致的组，随后仍须AssertionError，原raw未改、不重跑测试。不是独立第三方验收。

## 本片门与下一步

[测试回执](test-gates.json)：game相邻22文件129例、game typecheck、coverage工具75例通过，0失败/跳过/运行时诊断；两helper caller和真实loadAll装配均在实际集合。最终docs/lint-zero/ledger/diff见[gates](gates.md)实际原件。

三文件pending→review、0新增关闭；统一check/official ratchet/protected本片未新跑，editor最新全包诊断未清，不合main。57/CLI输出策略/RLE与event高风险卡保持原边界。下一片fetch-retry三测试：真实不同attempt错误身份、卸载/重新安装与Request/method/取消/退避合同；先旧绿新红，不改未裁定产品行为。无下一位Agent提示词，单Agent继续全83卡与原目标。
