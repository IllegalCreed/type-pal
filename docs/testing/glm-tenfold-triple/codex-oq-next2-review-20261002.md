# O/Q NEXT2 独立验收（2026-10-02）

固定 O `f61c7cf6ec578458e8dba84f3b4e115443eda87c`（测试/证据 `b284163d060c454936d288f898edd6d8255bf182`）；
Q `566cbfe0f679485bcf57b4975abfb2bb4d7fdf22`（测试/证据 `3abe77196d83f4fdc71bb80063bdd1e2d1fd7814`）。
本地/远端真实对象一致、作者树干净；独占固定副本审核，作者树零写入。原派发/冻结不变。
**仅下列 NEXT2 项 counter/rework，已闭旧包保持；不把部分包等同 700 卡 done。**

[机器审核与八代表针](codex-oq-next2-review-20261002.json)、[完整原始报告/哈希导航](codex-oq-next2-evidence/README.md)。

## 已通过

O 新 12 与相邻合跑 84/84，Content 全包 1441/1441；Q 新 14 与相邻 48/48，Reforge 全包 2164/2164。
所属包 typecheck 零、完整根 lint O 3237/Q 3098 文件 0 errors/warnings/infos、docs 与 diff、716 冻结/范围 O 790/Q 838 通过。
Q 的 112 Reforge file×fullName×status 与独立全包逐条一致；旧 161 directed 身份/状态与旧账语义字段保持，新增恰 14，未丢旧证。
原 O64/Q71 反控档案与索引字节未变，不重采。四代表产品控制各波均实采有效：完整 84/48 身份、唯一指定 AssertionError、exit 0/1/0、支持文件不变、最终源恢复及重建变异 hash 一致。
某些尝试不满足严格单红或 reporter 错误首部条件，原文保留但不计有效针；见证据导航，不把失败尝试删掉改绿。

## O-NEXT2-R1-01：新夹具不能新增类型 ignore

`provider-ports.ts:6` 新增 `@ts-expect-error`。旧测试有同类写法不构成本卡豁免。
只改 next2 夹具，用独立 Node IO adapter `.mjs` 配 `.d.mts` 等局部真实类型桥承接 zlib，保持 Uint8Array 公开签名；
不要增加全局 node:zlib 声明使旧 ignore 失效，不改旧测试/tsconfig/package/产品，不用 unsafe 桥或另一个 ignore。

## O-NEXT2-R1-02：01/02/03 的 IO oracle 需要真实可观测轴

01/02 的 frame callback 未用 recordedProvider，`journal.frameReads===[]` 无论产品是否读帧都成立。
Codex 只在声明选中的 01/02 范围把 `await input.frame(0)` 放在元数据验证前：真实正/变/恢复都是 2/2 绿，证明零 frame IO 断言漏检。
修成真实记录/spy 的 frame port，逐非法 metadata 精确拒绝且 frame/deflate 均零调用，不仅检查未连接的数组。
03 的 baseProvider 默认只有一帧，不能证明“后续帧不发生”；用至少两帧合法 descriptors、第一帧短字节，精确读序 [0]/压缩 0，保留原 fullName 与合同 ID，不新增换数字例。
04～08 的相应跨块 IO 条件保留；不重做旧 provider 正常/首块故障证据。

## O-NEXT2-R1-03：09 必须完成真实压缩/解压往返

09 首块 release 的四个零字节并非 deflate，第二块直接返回原字节；只 parse/index/read-journal，没有 decode。
在最终冻结源上忠实复现，parse 确认 2 块，但真 inflate 分别报 unknown compression method / incorrect header check。
保留首 deflate deferred 背压：保存真实 raw，放行时真压缩，后块也真压缩，真 decoder 完整读取 33 帧并逐字节比独立输入。
不伪造 compressed payload、复制 XOR 算法或只改标题撤回派发要求，不扩 timeout。

## O-NEXT2-R1-04：12 是已有强证明，不补新例

旧 `frame-sequence.resource-boundaries.test.ts:83-106` 四条完整 fullName `TPFS invalid index %s rejects before any inflation` 已覆盖 -1/0.5/NaN/越界，
精确 public block/frame error、inflate 零调用、有效块回归。新 -1/0.5/越界一格是同合同，不因 block 数字变了算新。
12 保留为 existing-proof/cross-check，不计净新，不换范围补例。此次原 packet 漏排旧强证，由 Codex 承担范围/扣列裁决，不作为作者未达容量门。
O 472 执行保持；前次 Codex 旧信用上限是 286 而非作者 287，本批至多 11 净新，累计上限 **297/700，至少 403 未完**。
01/02/03/09 完整 oracle 仍待修，297 只是最终可能上限，不是其全部已 accept 或正式覆盖。

## Q-NEXT2-R1-01：02 必须独立判别 G 和 B

现两个候选 G/B 同时趋向索引 6，只要其中任一分量正常，结果仍 6。
Codex 分别删除 dg² 或 db²，完整新旧 48 身份均 48/48 绿，不能独立证明两个距离项。
按 packet 同一合同内放两个小像素/合法完整 256 表，各自能区分漏 G、漏 B；常量预期手算，不复制 nearest 算法。
保持一个 ID/fullName，不拆新例或扩大表/机制；修后仅该源/执行依赖影响的代表控制由 Codex 重采，作者不写新采样工具。

## Q-NEXT2-R1-02：06/14 扣列，由 Codex 接收口径，不补量

06 的 view 外哨兵确实合法，但 typed-array 越界写本身静默忽略；移除产品 output min 项后 48/48 绿。
它只算平台/view cross-check，不宣称独立证明产品循环容量臂。不得用 Proxy/私有状态/新机制强造可观察性，不要求替换新例。
14 直接 cancel(reason) 的身份/active-null 已被本批 12 matching cancelOwned→真实 cancel 的同样 matcher 覆盖；保留 direct API cross-check，不重复净新。
Q 175 执行保持；旧 room0 已扣，不二扣，净新上限 **172/700，至少 528 未完**；02 尚未修时不把其完整 G/B 合同当已闭。
只更新 next2 逐合同分类/README/receipt 的准确口径，旧 161 字段不重生、不改旧针。
receipt 里“Q-NEXT-01/02 五针仍待重采”已过时，上一批五针已独立关闭，更新为保留已闭，不重开该项。

## 下一位 GLM O 提示词

用户在发出前手动选择 **GLM-5.3 文本模型**；本批无需视觉。

```text
继续 TEST-GLM-WAVE-O-1，仅闭 NEXT2 本次合并清单。原树 /Users/zhangxu/.codex/worktrees/glm-wave-o/type-pal，分支 codex/glm-wave-o-supply-validation-r1，固定 f61c7cf6ec578458e8dba84f3b4e115443eda87c。先只读审核根 /Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal 的 O 卡顶部与 docs/testing/glm-tenfold-triple/codex-oq-next2-review-20261002.md/json。一次修齐 O-NEXT2-R1-01～04：新 provider-ports 的 ts-expect-error 删除，用局部真实 Node IO 类型桥（可 next2 mjs+d.mts）且不影响旧测试；01/02 frame port 接真实记录/spy，逐非法 metadata frame/deflate 零调用；03 用至少两合法帧证明首短 RGBA 后零后读/零压缩；09 deferred 放行后两块真 deflate+真实 decoder 完整33帧逐字节往返，不假压缩/复制算法。12 保留 existing-proof/cross-check，不计新不补例；472执行、旧信用≤286、本批≤11、累计≤297/700，至少403未完，未修四oracle不报全accept。只写现有 next2 新测/专属fixture与next2证据及本波README/receipt准确口径，产品/旧测/旧fixture/旧针/配置/全局类型/其它Owner/共享文档只读，冻结派发不变；禁止 ignore/unsafe桥/扩timeout/核心mock。Codex已有84/1441绿、四代表针有效，作者不做工具返工/新采样/重采旧64；保持其它闭合项/fullName。定向相邻+content全包/typecheck、最终lint完整0/0/0/docs/diff/verifier，更新真实JSON/分类后一次完整40位SHA推原分支。仅本有限修复，不泛化续700，不main/done/官方门/清树；交付后停，等Codex验收。
```

## 下一位 GLM Q 提示词

用户在发出前手动选择 **GLM-5.3 文本模型**；本批无需视觉。

```text
继续 TEST-GLM-WAVE-Q-1，仅闭 NEXT2 本次合并清单。原树 /Users/zhangxu/.codex/worktrees/glm-wave-q/type-pal，分支 codex/glm-wave-q-runtime-residual-r1，固定 566cbfe0f679485bcf57b4975abfb2bb4d7fdf22。先只读审核根 /Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal 的 Q 卡顶部与 docs/testing/glm-tenfold-triple/codex-oq-next2-review-20261002.md/json。Q-NEXT2-R1-01：02 同一ID/fullName内改两个合法小像素/完整256表，分别独立区分去掉G²和B²，手算常量oracle，不复制nearest算法、不拆例。Q-NEXT2-R1-02：06 output容量只列平台/view cross-check、14直接cancel列本批12已证cross-check，两例保留不计净新、不补新例；175执行/净新≤172/至少528未完，room0不二扣。仅next2账/README/receipt同步真实口径；上一批Q-NEXT-01/02和五针已闭，撤回receipt仍待重采误记，不重开旧项。产品/旧161合同与测试/旧fixture/旧71针/配置/其它Owner/共享文档只读，派发冻结不变，只写next2新测/专属fixture/证据及本波README/receipt；禁止桥/ignore/timeout扩张/核心mock/私有态/真实数据/剧情。Codex已实跑48/2164与四代表针，作者不写采样工具或重采旧71；其它已闭oracle保持。定向相邻+Reforge全test/typecheck、最终lint完整0/0/0/docs/diff/verifier，准确file×fullName×status和本次分类，一次完整40位SHA推原分支。只本有限修复，不泛化续700、不main/done/官方门/清树，交付后停等Codex验收。
```

P 仍按其已派 NEXT2 执行，不重复投喂。本轮未执行 main 集成/官方 check/ratchet/protected、未作正式覆盖结算。
Vitest 技能影响逐合同排重、严格单红与真往返复核；pnpm 技能用于冻结依赖与完整零诊断门。
