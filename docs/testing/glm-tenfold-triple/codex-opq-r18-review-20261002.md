# P/O/Q r17交付独立复核（2026-10-02，Codex r18）

**P本轮窄项accept；O恢复与删重代码accept，但新增真账counter；Q两CLI合同accept，BA1业务反控counter。三原卡均仍partial/rework。**
不把作者完成回执当整卡done。原700与组/目标/流程目标不缩，未合main、未official门或85%正式结算。
用户发送下方代码提示词前手动选GLM-5.3；P未证视觉F14/F18另阶段用Flash。Codex不操作ZCode或代切模型。

## 固定对象与实跑

| 波 | 本地/远端固定HEAD | 新跑 | 最终本波身份 | 静态 |
|---|---|---|---|---|
| P | `0f588c3e9f1e4f01bd37156b7781c3196524f17b` | 定向相邻155/155；22判据；C02实际runner三态 | 98/98 | 2841文件完整0/0/0，Editor typecheck零 |
| O | `e5f53fe486b6463ed9d38162cb1f3952ba85c09c` | 定向相邻80/80；再判64/64 | 460/460 | 3233文件完整0/0/0，migrate typecheck零 |
| Q | `c1ec0482db1557a34dd5114888187431f7333c7a` | pal-extract全包365/365；三包typecheck零 | 145/145 | 3076文件完整0/0/0 |

固定对象有效、三作者树干净；差异只本波新测/工具/证据，产品/旧测/配置/依赖/官方baseline未改。
P测试b6209ef53→证据16052761b→receipt pin；O证据ee706dc3f→两receipt pin；Q测试证据210356180→receipt pin。
三候选docs/diff/716冻结过，P221/O786/Q796白名单路径，Owner不扩。
P docs818/4285链接、O815/4290、Q815/4277，均245任务、零问题。

**环境失败保留，不拿setup问题返工作者产品。** Reviewer offline --ignore-scripts缺Canvas原生binary，P首155为153绿+旧M两红；只向自有依赖复制同版本原生build后155全绿。
Q初始缺raw四业务红+三skip及collection缺口，仅258报告，不称365；首次复制误嵌套raw/raw仍失败，原报告保留。
修正只复制真实raw输入到自有Q副本，旧测试只读，最终365全绿/零skip。一个误用selector的2例trial单列，不冒作全包。
作者/main真实数据、产品或旧测未改。Q的CLI业务始终在mkdtemp合成工程里运行，不extract真实工程。

P98全来自新定向；O新变动53+未变407；Qextract8新跑+其它未变137，逐file×fullName×status对齐。
所有复用测试文件/包/依赖/配置Git对象与上轮逐字节相同；O content1429/shared154、Q Reforge2150旧独立完整报告hash复核，对game保留原187定向证据。
**未新跑Editor/migrate/game全包，也不把作者或旧3872/677/2812摘要当本次新全门。** 正式集成前另核所需整仓门。

## P：合法输入、G07与格式窄项关闭

开关例使用当前共享脚本，不复活chunks；空party/actor id例、chunks where例已撤回；C01 retired，indices17存档含1退休、active16。
引用目标hero/solo补齐，自coveredBy与details方向保留，levelUp伴随免删旧轴撤回。七enemy/team纯命令oracle与两针不重开。
G07真实buildBlankProject→作者IO→loader→toEditorState→assertProjectSaveValid，合法立绘/敌形与两精确where-label-locator通过；无测试侧双桥或新增接口。
相比旧actor-dialogue-commands.test只计五引用/表情数组，当前新增精确定位与公开投影路径，不把旧表情改写/免删合同再领。

原12格式清零。独立C02实际runner于自己副本/out目录执行：6绿→恰一目标红→6绿；新生成四JSON Biome完整0/0/0，未覆盖作者存档。
唯一judge22自测新跑全过；16活跃source/重建hash/最终执行集/三态退出/原文对应；旧14与C13原文件字节保持。

C01历史措辞需诚实：**四JSON对象值相同但字节因正常format已变；三raw字节没变**。
这次规范化按P-R17-01质量要求接收，不要求恢复坏格式；旧原对象仍在2cd548a8 Git。
撤回“JSON原字节保留”，随正常续批账维护，不再为措辞独交一轮。
当前98/25组/16活跃/18流程；至少602例/45组/34目标/F14-F18未完。代码窄项关闭，原700卡仍rework；继续合法余族，不只报返工完成。

## O：代码关闭，新41行真账仍需实读

incoming-only新文件精确进入writes已恢复；旧delete/summary不恢复、C4删除针退役保持。
旧next-wave:59-71两资产前置同合同删除合理；fixture卫生一例明确不计产品净新。
四O01针因publication最终执行集变化真重采，60其它与C4退休原字节相同；64三态source/hash/实际执行集/退出对应、唯一judge再判64/64。
不重新要求map、恢复目录、快照或全部64业务重放。

### O-R18-01：新旧证明不能再套一份错模板

新41 override中38行统一引用“pal-current-publication.pal.test.ts:33+一个it、条件差新轴”。
**实际该文件有三it**，第二例:88起覆盖大量完整保留/分区断言，第三例拒收非法毒定义。
新actor例`pal-current-publication.glm-o.test.ts:62-86`只证六生成ID及一个作者尾对象；
旧`pal-current-publication.pal.test.ts:179-191`已精确整九ID顺序、原作者尾与custom对象deepEqual，条件更强。
该整例移净新为existing-proof，可保留**fast cross-check**；full-only不等于没有旧合同，不为700重复领。

其它混合例逐子轴判断，不一刀全删：

- 新shop:121-129，1..20/no0已有旧:226-228，货单items另核真实未证轴。
- 新268/270价/字段保留与窄消息，对照旧:217-225完整正文；maxRoll等可能未证，不能统一判全旧/全新。
- 新catalog所谓“全部托管写入”目前只断言assets/index与actors两键，真账如实限这两键，别夸全表oracle。
- 实际未知守卫/漂移/错误条件可保留候选，不因最近邻一句“full PAL acceptance”自动归新或旧。

这是真账counter，不是恢复已删两前置或重做供应fixture。源行区/caller也须真实逐条件，不再整域同一:33模板。
当前460执行，作者扣herb/诊断pending/fixture后上限457；再扣角色已证例后**上限≤456、缺口≥244**，其余语义尚未全核。
新账310空condition/174 token锚仍未完；原700/60组/50有效目标不缩，直接连续真实合法深域。
纯分类/锚点登记不改source/执行集时64针保留；实际改标题/代码才重采受影响针。

## Q：两新CLI合同关闭，BA1同分区输入/golden错配

两真实合成CLI入口走到exit0+done：F/ABC解压gzip、raw回退保真、manifest顺序/空chunk排除；FBP有效PNG签名/IHDR320×200、ids与坏尺寸warn/不落盘。
旧CLI全管线仅F/ABC空与FBP全空skip；不是仅换数值。YJ2字面量编码器原证据与合法MAP/GOP上游沿用，正向输入真实进入产品。
不声称图像色彩/完整原版资源或剧情实测；当前只接收测试实际oracle。

### Q-R18-01：BA1业务判据不成立

BA1将raw chunk2B→3B，expected仍`new Uint8Array(2)`；两者同在YJ2失败/raw回退域，正确产品应保留各自输入。
红来自输入与固定golden不匹配，不能称产品保真坏。独立把输入和相应expected均改3B，正确产品**2/2绿**；随后测试源精确恢复。
BA2从100B改64000B跨过尺寸门，属于已接受的合法输入分区对照，当前不误判其为产品源变异。

为确认原正控确有新业务判别力，Codex另做自己的最小产品变异：仅CLI raw fallback附加一字节。
旧CLI6+新2同场，控制8/8、变异**旧6绿+新背景1绿，仅新raw保真1红**、恢复8/8；exit0/1/0、完整身份相同，失败精确Uint8Array3 vs2。
产品/source与测试均逐字节HEAD恢复。这是Reviewer证据，不冒作GLM BA1，不替作者历史日志。
BA1可退役/改非业务辅助，或重新采真正产品源变异；已有≥50不要求补数量针。
若改新测试源/oracle，仅重采同文件受影响BA1/BA2，未变旧67保持；原meta/JSON/raw保留历史，不改成新的有效采样。

69存档三态hash/index/meta/最终身份/退出全部结构对应，但业务上限68；不同存档目标60、有效目标上限59、净新有效目标上限58分列。
145执行、结构净新上限144、至少556例；原700/50组/50目标/10流程仍部分。继续Q07/Q08/Q10合法余族，不把两例续批当整卡完成。

## 证据与边界

[实跑/身份/复用及独立反证](codex-opq-r18-review-20261002.json)、[149存档结构/历史保护分表](codex-opq-r18-counters-20261002.json)。
完整raw、报告与helper在`/private/tmp/codex-opq-r18-review.EAKbEx`；只回收本次三个自有detached副本，作者树不改。
新版main中包登记f5c7f904已独立派给Grok/Kimi/Cursor，不改变本三卡冻结/旧Owner边界，本轮不追加其它会话或模型操作。
未合main/done/正式覆盖并集或85%主张；固定SHA不重复未变重门。

审核分支轻门：lint2804文件完整0/0/0、docs856 Markdown/4615链接/251任务零问题、diff零；
逐针分表parsed-data摘要复算匹配。自有三个copy已恢复精确HEAD/干净后仅回收copy，父目录原报告与helper保留。

## 下一位GLM P提示词（代码阶段；用户手动转发）

```text
继续TEST-GLM-WAVE-P-1，唯一P Owner，原树/Users/zhangxu/.codex/worktrees/glm-wave-p-editor-residual/type-pal，分支codex/glm-wave-p-editor-residual-r1，固定已审0f588c3e9f1e4f01bd37156b7781c3196524f17b。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/ops/tasks/TEST-GLM-WAVE-P-1-editor-residual-tenfold.md最新段及同树docs/testing/glm-tenfold-triple/codex-opq-r18-review-20261002.md/json和counter分表。P-R17合法共享输入、空id/chunks撤回、自援护/details、G07公开loader→投影→保存校验及格式窄项accept，不再重做；新155定向相邻全绿、98身份对应/typecheck零/22判据过/2841文件静态完整0/0/0，C02实际runner三态6→单红→6和新生成四JSON零诊断通过。旧14/C13原字节保持；16活跃和17索引存档含C01退休分清，不重采不存在目标。C01四JSON仅机械格式改变、对象值不变，三raw原字节相同；随正常账撤回“JSON原字节保留”措辞，Git保留2cd548a8原对象，不恢复坏格式、不另交纯措辞轮。98执行/25工作组/16活跃/18流程仍partial，至少602例/45组/34针/F14-F18缺口；原700/70组/50有效不同目标/20流程不缩。直接连续P02残余/P04-G07余族/P05-P10和逐合同真账，不只报窄修完成；新合法公共投影要排旧全部oracle，不复制旧unsafe状态。旧fullEditor3872等摘要仅历史，未变报告不能替代变更后新全包，随末批更新真实口径。避让Cursor74及新中包范围，纯代码阶段不浏览器，F14/F18另阶段Flash。派发8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变；不擅迁main的content21/SAVE10。只原Owner白名单新测/fixture/本波证据可写，产品/旧测/配置/baseline/真实数据/共享文档/其它Owner只读。每批定向相邻/typecheck提交推送后继续下一合法组；源或执行集真变仅重采受影响活跃针。最终回执/SHA编辑后根lint完整0/0/0、docs/diff/verifier，末批按原卡全包验证、真实40位SHA和准确余账。不合main、不done、不official ratchet/protected、不清原树或共享临时树，不跑PAL剧情/抢6012。
```

## 下一位GLM O提示词（代码阶段；用户手动转发）

```text
继续TEST-GLM-WAVE-O-1，唯一O Owner，原树/Users/zhangxu/.codex/worktrees/glm-wave-o/type-pal，分支codex/glm-wave-o-supply-validation-r1，固定已审e5f53fe486b6463ed9d38162cb1f3952ba85c09c，证据ee706dc3f。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/ops/tasks/TEST-GLM-WAVE-O-1-supply-validation-tenfold.md最新段及同树docs/testing/glm-tenfold-triple/codex-opq-r18-review-20261002.md/json和counter分表。O-R17 incoming-only writes恢复、两preconditions旧例删重、fixture卫生扣列和四受影响针重采accept，新80相邻绿/460身份/64再判和hash/静态完整0/0/0，旧60及C4退休原字节保持，不重做map/恢复目录/旧针。只闭O-R18-01并连续真账：publication新41行的38个“旧pal.test只有一个it/条件差新轴”模板错误，实际三it；角色分区新例:62-86已由pal.test第二例:179-191整九ID顺序+作者对象deepEqual更强直证，移净新为existing-proof，可保留fast cross-check，不因full-only就重领合同。商店混合轴:121-129中ID1..20/no0旧:226-228已证，货单oracle另核；268/270字段保留/窄消息旧:217-225按子轴比，不整例一刀删。新catalog账只断言assets/actors两托管键，别夸全部写入；逐合同读旧完整fullName和所有matcher/真实源守卫与caller，修精确锚，不换成另一模板。声明旧证明没覆盖的拒收臂不自动全判旧。当前460执行/原净新上限457，扣角色旧合同后≤456/至少244例，310空condition与174 token旧锚仍未完；700/60组/50合法目标不缩。保持历史/当前口径和64存档/62目标，纯登记或分类变不重采；真改代码/标题执行集才重采受影响四针。修账后直接连续原合法深域，不只删除/工具/完成数字轮。CLI只mkdtemp合成工程，不触真实migrate含dry-run。派发8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变；不擅迁main的content21/SAVE10。只原Owner白名单新测/fixture/本波证据可写，产品/旧测/配置/baseline/真实数据/共享文档/其它Owner只读。每批定向相邻/typecheck提交推送后继续下一合法组；源或执行集真变仅重采受影响活跃针。最终回执/SHA编辑后根lint完整0/0/0、docs/diff/verifier，末批按原卡全包验证、真实40位SHA和准确余账。不合main、不done、不official ratchet/protected、不清原树或共享临时树，不跑PAL剧情/抢6012。
```

## 下一位GLM Q提示词（代码阶段；用户手动转发）

```text
继续TEST-GLM-WAVE-Q-1，唯一Q Owner，原树/Users/zhangxu/.codex/worktrees/glm-wave-q/type-pal，分支codex/glm-wave-q-runtime-residual-r1，固定已审c1ec0482db1557a34dd5114888187431f7333c7a，测试证据210356180。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/ops/tasks/TEST-GLM-WAVE-Q-1-runtime-residual-tenfold.md最新段及同树docs/testing/glm-tenfold-triple/codex-opq-r18-review-20261002.md/json和counter分表。新两CLI F/ABC gzip/raw/manifest与FBP有效PNG尺寸/ids/尺寸门窄合同accept，新extract全包365绿/145身份/typecheck×3/3076文件静态完整0/0/0。旧67原字节保持，BA2合法尺寸分区接受；只闭Q-R18-01：BA1把raw2B→3B但expected仍new Uint8Array(2)，两者同在fallback域、正确产品返回3B，红是输入/golden错配不是保真坏。Codex输入与expected同3B时2/2绿；最小产品变异在catch对raw附加一字节时旧CLI6绿、仅新保真1红、恢复8绿，源精确恢复。BA1退役/改非业务对照，或按真实产品变异重新采针；保留原meta/JSON/raw为历史，不改原文冒作有效重跑，不为50数量再凑针。若新测试源/oracle改动，仅重采该文件受影响BA1/BA2，旧67不重采。69存档机械结构齐但业务活跃上限68/有效不同目标上限59/净新目标上限58；145执行/结构净新144/至少556例仍partial，原700/50组/50目标/10流程不缩。闭此窄项后连续Q07/Q08合法typed生命周期和Q10合成公共CLI、逐合同真实源条件/caller/合法输入/旧完整fullName-matcher/全部oracle，不再小批完成回执。避让Grok46和新中包范围，game/extract与Reforge分阶段，D-Q01-1仍独立产品draft，不新机制/世界后门。派发8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变；不擅迁main的content21/SAVE10。只原Owner白名单新测/fixture/本波证据可写，产品/旧测/配置/baseline/真实数据/共享文档/其它Owner只读。每批定向相邻/typecheck提交推送后继续下一合法组；源或执行集真变仅重采受影响活跃针。最终回执/SHA编辑后根lint完整0/0/0、docs/diff/verifier，末批按原卡全包验证、真实40位SHA和准确余账。不合main、不done、不official ratchet/protected、不清原树或共享临时树，不跑PAL剧情/抢6012。
```
