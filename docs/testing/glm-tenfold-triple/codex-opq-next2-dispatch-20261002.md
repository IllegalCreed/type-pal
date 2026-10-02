# O/P/Q NEXT2：下一有限实施批（2026-10-02）

用户明确要求三原卡继续。本批不是又一次窄返工，也不以“继续700”替代实施清单。
**build allowed：仅本文件和[精确候选/源hash/白名单](codex-opq-next2-packet-20261002.json)指定NEXT2。**
三个原700目标保持；候选处置数不是保证净新例数，强旧证明/无合法输入只登记，不换数值补配额。

| 槽 | 原树固定起点 | 本批范围 | 候选合同 / 新例上限 | 用户手动模型 |
|---|---|---|---|---|
| O | ad6efd3141da47011508ba7aa310e360f3339f7a | TPFS完整帧提供器、压缩背压/失败、解码所有权与取消 | 12 / 20 | GLM-5.3文本 |
| P | d18f9075724df1fc855b539a82effd0cf9de8cef | Map引用扫描权限、缓存、专用通知、进度及真实失败恢复 | 12 / 20 | GLM-5.3文本 |
| Q | 3f5791a2ed4ddf2f4cc2bd21f8390d84eb7343ab | RGBA溶解最近色/索引身份、输出容量与view/grid、effect所有权 | 14 / 24 | GLM-5.3文本 |

保留三个原工作树/分支/单Owner，不新建第四个写入者。主源分别为content/frame-sequence、
editor/core/edit-session、reforge/dither-transition，三者当前main d2e09b5a与原冻结字节完全一致，
不在Cursor74/Grok46主合同源，也不在Kimi/Cursor中包主源；依赖只读，不擅改源冻结/派发或迁版本。
全为phase2程序化合同，N/A浏览器视觉，不跑P受阻F14/F18或PAL故事/现有6012，不改UX/产品/机制。

## 前提与排重

前提：这三个仍在使用的公开API有可独立观察的IO顺序/所有权/颜色计划与输出边界，测试不改变行为。
primary是当前公开源码及实际caller；一阶段机制N/A（不裁决原版/玩法），UI形态N/A（不改界面）；
二阶段遵守READ-FIRST与当前RG​BA/稳定id。最强替代解释是旧强matcher已覆盖、需要非法输入或没有当前caller。
发现该情况只停对应id，给具体证据，不扩到另一个源码池或新产品机制。

实际caller：O editor/core/frame-animation-codec.ts:85提供完整帧/压缩port、reforge/frame-animation-player.ts:82解压block；
P TilesetTab.tsx:299-304/466/532、StampLibraryTab.tsx:98-103/333使用专用引用通知与current permission；
Q main.ts:1407/2124/5166/5189负责effect入口、256色RGB计划和RGBA输出，不引入内容palette状态。
Q先读harvest A2/A3（历史风险背景，不照搬旧LUT架构）。

机器清单每id列准确条件、oracle和旧证明限制。对main、自己最终候选、固定L/M/N及其它候选旧完整fullName/全部matcher再查一遍，
遇到更强旧证登记existing-proof，不复制旧unsafe输入，所有id一次完整处置后提交，不只交两例完成回执。
38个候选是Codex核过的有限域，不是38净新承诺；每id不得拆成十个换数字标题，不补到硬上限。

## O：只写一个新文件及专属next2 fixture/evidence

`packages/content/src/frame-sequence-provider-next2.glm-o.test.ts`、`src/__tests__/glm-o/next2/**`、wave-O/next2/**。
O-NEXT2-01～12按机器清单执行：provider尺寸/默认时长在IO前拒收；首次/第二block短RGBA；
前一block已压缩后的provider故障；压缩AbortError身份/第二压缩失败禁止第三block读；
deferred provider串行和deferred deflate禁止read-ahead；真实decode结果与原raw/其它帧无别名；
inflate取消身份、非法公开block索引零IO。
旧35帧正常/UTF8/provider首块Error/同步空deflate/同步宽度/bad-payload/正常roundtrip均不重领。
不造GB级数组、非Uint8Array的typed跳板、稀疏frame表、未知color union或不可达内部索引分支；返回短字节是声明外部IO违反返回长度的拒收域。
使用真实encoder/parser/decoder，压缩/解压是声明port，可用真实zlib+记录/deferred/failure；不复制XOR算法或同时改oracle造红。

## P：合法项目、公开会话，不写UI或旧kit

`packages/editor/src/core/map-reference-session-next2.glm-p.test.ts`、`src/__tests__/glm-p/next2/**`、wave-P/next2/**。
P-NEXT2-01～12：foreign state权限拒收；专用unsubscribe/订阅域隔离；markSaved引用snapshot稳定；
双scanner共享生命周期；默认不重试失败/明确retry成功清失败/nonError IO原因；第8完成时进度与第9未完；
单worker释放只启动一个排队read；卸掉引用UI订阅不打断扫描；缺loader的scan fail-closed。
使用seed→memoryAuthorDirectory→公开loader→toEditorState合法项目；多地图工厂也需合法index/body/tileset并走公开loader，
maps={}仅作为真实懒加载工作副本，不丢默认场景/入口来伪造合法工程。读取公开batch/version/history/dirty和实际IO，不手改私有缓存或brand。
允许声明loadMap port的deferred/拒绝；真实EditSession必须运行。需要改索引时用现有公开命令；无现行合法调用链只登记停该id。
六worker cap、旧path-success迟到、scan+hydrate共享、旧删除proof/redo、失败undo原子性均已有旧证，不重复领。
P12缺loader只断言公开scan失败结果，不虚构可保存的坏工程；counter只用真实合法seed和公共失败域。

## Q：真实RGBA数组，不需要读图模型

`packages/reforge/src/dither-next2.glm-q.test.ts`、`src/__tests__/glm-q/next2/**`、wave-Q/next2/**。
Q-NEXT2-01～14：重复exact RGB取首索引、nearest G/B与同距稳定、nonexact零索引缓存、palette snapshot；
output/真实plan容量、各自nonzero-offset视图、不同对象同端点buffer拒收、零像素预算；
width5×height5/scale2的垂直逻辑格与ragged边（固定step3、手算完整25格mask）；matching owner取消、snapshot故障不抢旧effect、显式Error身份。
Palette须真实完整256条合法RGB tuple，无短板/holes/假Partial/伪造plan。plan只能调用真实build函数产出；
controller仅调用公开begin/finish/cancel/cancelOwned，不手置active内部phase。预期是独立常量/手算小图，禁止复制生产nearest/grid算法。
旧72步顺序、source/target不变、正常square4×、普通supersede、旧owner false/defaultAbortError都不计新。

## 门、证据与一次交付

每波只改精确新test/专属next2 fixture/evidence；旧tests/kit/原反控、产品、其它Owner、共享docs、配置/baseline/真实数据只读。
自己的wave README/receipt可仅加next2导航/实际累计，不把旧历史重生；共享导航/卡面由Codex处理。
各id完整source/caller/合法输入/旧SHA-fullName-matcher/完整expected/分类，实际定向JSON与相邻结果、源hash及准确未完账。
先定向+相邻/typecheck，最后所属包全test（O content、P editor、Q reforge）/typecheck、根lint完整0/0/0、docs/diff/原verifier，最后pin后再lint/diff。
不扩timeout/ignore/核心mock/强转，不吞异常或把未选中叶改passed；宿主错误真实记录，不强迫补数量。

**本次各波四个代表产品控制由Codex在最终固定候选统一实采**，作者不再写采样工具或重采旧64/19/71；
既有总反控目标不免除，但本批不为数量凑针。新增文件不改变旧文件执行集，旧证保留，真变依赖才由Codex裁决受影响范围。
最后一次完整包交真实40位SHA+区间+准确交付/净新/旧证/blocked，推原分支；原700总目标保持，不main/done/官方门/清树。

## 准入小样

Codex独占副本真实Vitest：provider frame32故障且先压缩1块、public seed+loader构造session拒收同值foreign state、nearest同距取索引5，3/3绿。
[实际报告](codex-opq-next2-preflight-20261002.json)只证明这三个小样可运行，不冒称38候选已交或所有新旧oracle已独立验收。
普通tsx对P宿主的两次尝试分别遇到错误导出路径/未变import.meta.glob，随后用真实Vitest正确宿主跑通；不是产品缺陷或假绿。
Vitest/pnpm技能用于排重与可执行小样/原包门；未测覆盖，不把私有百分比相加或承诺85%。
