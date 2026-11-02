# TB-01～03：Codex设计收口与并行交接

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是覆盖率队列 TB-01～03 设计收口与并行交接记录（2026-09-19，生产对照点 `e58834f6`，接手 main `e22041a0`）：**当前状态（2026-09-21）TB00/TB01 候选 44b9b763 已三席 accept 齐并按用户授权 done 归档（见[收口记录](../../ops/testing-records/tb00-tb01-completion.md)），TB02/03 此前已收口**；旧 counter 与提示词保留原始设计证据不重新授权。

## Scope

- 三卡：TB-01 内容合同残项（当前结构守卫不反向依赖运行时 loader）、TB-02 读取缓存与音效准备（HTTP/FSA 分开、音频 adapter 复制与标记门分层）、TB-03 导入编码与工作线程（真实 handler 零产品导出、真实 transfer）。

## Execution and assertions

- **复核方式**：Codex 本人读三卡三工作包及关键生产/旧测试；内部两路只读取证补充线索不作为 GLM/Kimi 席位；TB-01 既有 10 文件/148 项绿（命令列表含一个无同名文件的 actor-reference 过滤项，实际 10 文件不能报 11）；TB-02 六文件/39 项（sfx 实际 12/file-source 实际 8 去重事实）；TB-03 四文件/6 项；可重建只读前提探针 coverage-queue-premise.mjs（不写项目/资产/基线/存档；PNG 借 pal-extract 已声明 pngjs）
- **TB-01 收敛**：asset.ts:387-423 入口名 commandAssetTaggedReferencesAtNode、actor-reference.ts:244 collectDialoguePortraitReferences 刻意不扫 unbound；A2 :282-287 是 palBattleSpriteAssetId（caller 在 migrate/pal-battle-sprites.ts:53/63/116、pal-assets.ts:926）；表情 rename 已有 boundaries.test.ts:149 强证据；content tsconfig ES2022/rootDir 不允许反向引 reforge/project-loader（r2 改现行结构 guard）；open-local.ts:77 scriptChunks={}、TPFS parse:255-278 外部字节先 UTF-8 再 JSON（探针用 Unicode 扩展键值证多字节 decode 可达）
- **TB-02 收敛**：file-source.ts:27-47 只透传 AbortSignal 给 fetch 无 FSA 式逐 await 门；fsa-source.ts:18-50 才有主动取消门（两套正反控分开）；sfx.ts:75 复制发生在产品 browserAdapter（新测试走实际 adapter 替 AudioContext 宿主，不能注入假 adapter）；assertWave:90-94 只查长度/RIFF/WAVE；main.ts:774-789 传 canonicalScene 无 additionalRoots、sfx-readiness.ts:168 固定 pages[0].animation（玩具 SceneDef 不能证 canonical initialPage 合同，本包移出「当前页选择正确」绿测主张）；Registry 模块级缓存与 ProjectImageCache 实例级缓存分开设计、禁跨例成功预热
- **TB-03 收敛**：TPFS 是工程格式、BMFF 属 ISO 标准容器体系（video-metadata.ts:49-52 只是窄音轨探测）；worker.ts:27-35 已把真实 handler 挂 self.onmessage 零产品导出；真实 encode 输出经正式 TPFS 解析像素 [4,5,6,255]/quantize [0,0,0,255] 非 mock codec；worker-client.ts:39-49/76-77 postMessage 前复制、structuredClone transfer 使传输副本 detach 调用者原四字节保持、terminate=1；官方 include 含 worker 0/13 不是被排除（解码入口 FrameAnimationEditor:506、MP4 入口 CutsceneTab:232）
- **新发现独立归属**：PNG 编码失败后位图未释放（image-import.ts 原 130-142 缺 finally，成功 close=1/toBlob=2、null 时 close=0/toBlob=1）→2026-09-20 用户授权 Codex 补统一 finally+18 项回归（check 7,766/strict 7,277）；canonical 场景页声音选择待证（collector 固定 pages[0] 而 main 传 canonicalScene，不把首页等同活动页）；ProjectImageCache 在途 dispose 回填政策未定保留待证；新增缺陷没有直接变成第三阶段功能、不借补测卡授权产品修改

## Results

- 推进规则：三卡 r2 原模块边界不变（三签 Codex f5cd23c0/GLM efe6b932/Kimi 61b79f1b）；未接收实施包最多两批；每卡独立 worktree、正式质量门 Codex 串行。
- GLM/Kimi 并行提示词（历史）全文在 quote。

## Evidence

- 证据路径：本回执正文（quote 保全）；/tmp 探针日志按原文时点。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| 设计收口+交接 | 2026-09-19 | 三卡 r2 收敛+探针+归属表 | TB01-03 全部后续收口 done | 无 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy quality/quality-gates 的队列设计收口记录；固定来源与 source SHA 见下方保全节。

## 原始结论

TB-01～03 r2 设计三签+直接证据收敛+三项新发现独立归属；九批统一接收另见 glm-nine-intake-review。

## 当时证据

三卡收敛证据表、新发现归属表与两席提示词在 quote 保全。

## 当前有效性

historical。设计与交接按当时点；各卡后续收口见各自完成卡。

## 继任文档

当前结论归 TB-01/02/03 完成卡与 tb00-tb01-completion。

## 原文保全

固定源 revision `b6b32d2ac3c0276357e43eee8658c50da8da695b`，source SHA `6c6d6ab8ead7fba4c7a78a93cf645d097333cfcd6ca147035b51c1be13486822`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # TB-01～03：Codex设计收口与并行交接
>
> **当前状态（2026-09-21）**：本文为设计/首轮接收历史。TB00/TB01候选44b9b763已分别三席accept齐并按用户授权done归档，见[收口记录](../../ops/testing-records/tb00-tb01-completion.md)；TB02/03此前已收口。下方旧counter与提示词不重新授权实施或重复返工，保留原始设计证据。
>
> 2026-09-19，生产核对点`e58834f6`，接手main为`e22041a0`。
> 用户要求GLM返工TB-00同时，Codex推进后续三批设计。**三卡r2设计三签保持；TB-01另排，TB-02/03已按用户先行授权交付，本轮接收counter/rework。**
> 2026-09-19补充：[九批统一接收](../../ops/testing-records/glm-nine-intake-review.md)中TB02/03均有counter，设计不重签；先行实施为用户批准的本轮排期例外，未合并。以下保留较早TB00/01交接记录。
>
> 2026-09-19此前接收：TB-00的6d34ad5a仅剩[D6 sequence实际收尾](../../runtime/engine-boundaries/runtime-state-review.md)，TB-01的0e49db91有[CR-R1～R4](../../content/authoring-and-runtime/content-residual-review.md)。两包独立返工，本轮未释放实施槽；下文设计证据及历史开工交接不授权绕过当前counter。
> 本轮九批按用户先行授权接收；未来未获例外的新批仍按卡面顺序及目标未漂移/无新counter/未接收包≤2领取，不重复已有设计签字。
> r1自签原文留历史，不把错误前提静默覆盖成已被三席认可的r2。此次不重开任何已done卡，也不新增产品范围。
>
> | 队列 | 任务卡 | r2关键收口 |
> |---|---|---|
> | TB-01 | [内容合同残项](../../../../../ops/archive/tasks/done/TEST-CONTENT-RESIDUAL-1-registered-gaps.md) | 当前结构守卫，不反向依赖运行时loader；已测/旧分片候选先分流 |
> | TB-02 | [读取缓存与音效准备](../../../../../ops/archive/tasks/done/TEST-REFORGE-ASSET-IO-1-read-cache-sfx.md) | HTTP/FSA分开，音频adapter复制与标记门分层；页选择疑点不写正确绿测 |
> | TB-03 | [导入编码与工作线程](../../../../../ops/archive/tasks/done/TEST-EDITOR-IMPORT-CODEC-1-workers-metadata.md) | 无产品导出的真实handler方案、真实transfer；媒体边界订正，已确认泄漏隔离 |
>
> ## 复核方式与已跑证据
>
> Codex本人读三张卡、三个工作包及关键生产/旧测试；内部两路只读取证用于补充线索，**不作为GLM/Kimi席位**，
> 最终由本人再次核源码并复跑关键前提。使用Vitest/pnpm的当前仓库口径、Vite宿主边界；未新增正式测试、未改生产/官方覆盖。
>
> - TB-01相关既有测试10文件/148项绿（命令列表含一个无同名直接文件的actor-reference过滤项；实际执行10文件，不能报11）。
> - TB-02六既有测试文件/39项绿，证实sfx实际12项、file-source实际8项等去重事实。
> - TB-03四既有直接文件/6项绿；没有把无同名worker测试推断为浏览器无法测试。
> - 日志：`/tmp/type-pal-queue-design.Lh7r5P/tb01-existing.log`、`tb02-existing.log`、`tb03-existing.log`。
> - [可重建只读前提探针](../../../../domains/quality/quality-gates/tools/coverage-queue-premise.mjs)：
>
> ```bash
> node --import tsx docs/testing/domains/quality/quality-gates/tools/coverage-queue-premise.mjs
> ```
>
> 探针不写项目、资产、基线或正常存档；PNG生成/解析仅借用pal-extract已声明的pngjs工具依赖，不给content反向加依赖。
> 输出证明：合法unbound cue的精确AssetId边；合法外部Unicode TPFS索引逐像素恢复且UTF-8/JSON错误分开；
> 实际browserAdapter复制字节并走connect/start/stop/close；实际worker.onmessage的quantize/encode及真实transfer；
> 实际client发送副本detached而原buffer保持、terminate一次。
> 这些是非视觉宿主协议证据，**不是浏览器线程调度、PCM解码或画面验证**。
> 探针初次格式检查遇到forEach表达式回调规则，改为for-of后Biome通过；不存在候选产品修复或隐藏失败重跑取多数。
>
> ## TB-01的直接证据与收敛
>
> 1. `asset.ts:387–423`的入口名是`commandAssetTaggedReferencesAtNode`。`actor-reference.ts:244`的
>    `collectDialoguePortraitReferences`刻意不扫unbound全局资产。原A1混名已订正；探针先`checkAuthorDialogueCue`，再钉完整where/asset/kind。
> 2. 原A2的`:282–287`是`palBattleSpriteAssetId`，不是相邻收集臂；实际caller在migrate/pal-battle-sprites.ts:53/63/116、pal-assets.ts:926。
>    合法channel域和零/正数边界可独立补；不能造无消费者参数。
> 3. 表情rename已有editor/actor-dialogue-commands.boundaries.test.ts:149的全域/非目标/输入/invert强证据；默认登记已有，不强制第六测试文件。
> 4. `content/tsconfig.json`的ES2022/rootDir与依赖方向不允许为了结构正控反向引reforge/project-loader。
>    r2改成本包现行结构guard+引用零issue基线；世界输入通过当前构造器。严格区分“结构合法”和“loader/保存重开已通过”。
> 5. 当前open-local.ts:77返回scriptChunks={}，其它旧migrate构造分片不等于当前发布工程消费。
>    A12非空scriptChunks/scriptIndex先证明当前consumer，否则归旧接口/待清理，不为臂数保活。
> 6. TPFS parse:255–278外部字节先UTF-8再JSON；validator容许未消费扩展字段，探针用Unicode扩展键值证明多字节decode可达。
>    encoder生成的当前元数据仍是ASCII，不因此补不可能的encode分支或引入新字段政策。
> 7. author-dialogue:125–168的speed/autoAdvance允许0及非整数非负有限数；map-index原重复ID/路径/自身保护已有强测试，r2先扣重。
>
> ## TB-02的直接证据与收敛
>
> 1. `file-source.ts:27–47`只透传AbortSignal给fetch并原样消费Response；没有FSA式逐await门，也没有统一JSON错误包装。
>    `fsa-source.ts:18–50`才存在主动取消门；两套正反控必须分开。
> 2. `sfx.ts:75`复制发生在产品browserAdapter；SfxPlayer向注入adapter直接传reader bytes。
>    新测试要走实际browserAdapter并替AudioContext宿主，不能注入假adapter后要求它接到复制品。
> 3. `assertWave:90–94`只检查长度/RIFF/WAVE标记；完整WAV正控有意义，但mock decodeAudioData不是PCM解码证明。
> 4. 旧sfx 12项已覆盖decode/read/play失败、resume重试、dispose旧prepare、错误上下文。registry.test.ts:24–40已有503重试。
>    r2各族只补独立余轴，禁止重命名这些既有断言后计算新增。
> 5. `main.ts:774–789`给collector传canonicalScene且无additionalRoots；`sfx-readiness.ts:168`固定pages[0].animation。
>    旧测试的玩具SceneDef不能证明canonical initialPage/当前活动页合同，故本包移出“当前页选择正确”的绿测主张。
> 6. AdditionalRoots可作为公开helper可选接口分类，不冒称main覆盖；库存/动作/shared脚本闭包均先过对应现行guard。
>    Registry模块级缓存与ProjectImageCache实例级缓存分开设计，禁跨例成功预热；在途dispose回填仍待证。
>
> ## TB-03的直接证据与收敛
>
> 1. TPFS是工程格式；BMFF属于ISO标准容器体系，不是工程自定格式。[W3C说明](https://www.w3.org/TR/mse-byte-stream-format-isobmff/)
>    `video-metadata.ts:49–52`只是窄音轨探测；识别头失败undefined、未找到/畸形box多数false、找到soun为true。
> 2. `worker.ts:27–35`已把真实handler挂到self.onmessage，无需新增导出或worker_threads包装产品；独立self后import即可捕获。
>    真实encode输出经正式TPFS解析/解码，像素[4,5,6,255]；quantize为[0,0,0,255]，不是mock codec。
> 3. `worker-client.ts:39–49/76–77`在postMessage前复制source/frames。探针实际structuredClone transfer使传输副本detach，调用者原四字节保持，terminate=1。
>    Node只验证消息合同，浏览器线程调度另归Codex；不添加产品导出，不回落为“宿主不可达所以不测”。
> 4. 官方include含worker，0/13不是被排除；解码图片入口为FrameAnimationEditor:506，:593是encode；MP4实际入口是CutsceneTab:232。
> 5. battle-sprite-import的新输入frameCount/bytes由正式Uploader提供；复用分支才做已有资源真实读取解码。不得要求helper承担不存在的重复校验。
>
> ## 新发现/待证的独立归属（不混入本包正确绿测）
>
> | 项 | 证据 | 归属与处理 |
> |---|---|---|
> | PNG编码失败后的位图未释放（修前已复现） | image-import.ts原130–142缺finally；同一完整320×200 PNG+合法palette，成功close=1/toBlob=2；只让toBlob返回null，抛正确错误但close=0/toBlob=1。主Agent探针已独立复算 | 2026-09-20用户授权后Codex已补统一finally和18项回归，见[修复回执](../../migration/supply-and-import/image-import-cleanup.md)；check7766/官方ratchet/受保护单次strict-fast7277已通过。TB03历史探针/已done范围不改，不固化错误绿测 |
> | canonical场景页声音选择（待证） | collector固定pages[0]而main传canonicalScene，未携world活动页；尚未完成正式场景运行验证 | Codex另核端到端语义/必要时开修复；本包不把首页等同活动页，不宣称产品缺陷已修 |
> | ProjectImageCache在途dispose回填（已知待证） | dispose清map，decode完成会set；政策未定 | 原待证归属保留，只测已完成load后的dispose |
>
> 新增缺陷没有直接变成“增加第三阶段功能”，也没有借补测卡授权产品修改；本文件是持久交接入口，后续修复要带回归和真实收尾验证。
>
> ## 当前推进规则
>
> 三卡r2原6/6/7模块及只新增测试边界不变；GLM已在efe6b932补充确认，Kimi已在61b79f1b独立签字，Codex原签为f5cd23c0。
> 2026-09-19用户告知签齐后，Codex核同r2/冻结及零生产漂移，核定当前实施与后续领取条件。
> TB-00当前三项残余返工优先，不与新包共享可修改fixture或混合覆盖报告。
> 未接收实施包最多两批；若两包都在等接收，其余只做准备。每卡一Coding Owner、独立worktree，正式质量门由Codex串行执行。
>
> ## 当前GLM实施交接
>
> ```text
> 在 /Users/zhangxu/illegal/type-pal 按已签r2队列连续推进：
> docs/ops/archive/tasks/done/TEST-CONTENT-RESIDUAL-1-registered-gaps.md（TB-01，已build）
> docs/ops/archive/tasks/done/TEST-REFORGE-ASSET-IO-1-read-cache-sfx.md（TB-02，设计准入已过，待槽）
> docs/ops/archive/tasks/done/TEST-EDITOR-IMPORT-CODEC-1-workers-metadata.md（TB-03，设计准入已过，待槽）
> 先同步main、检查工作树，读AGENTS/CLAUDE/READ-FIRST、三卡当前准入与对应工作包、docs/testing/archive/legacy/quality/quality-gates/glm-coverage-work-queue.md。
> 三席r2已齐（Codex f5cd23c0、GLM efe6b932、Kimi 61b79f1b），无counter，不重签。TB-00先按8ca74aac处理三项残余；未接收实施包合计最多两批，当前可并行推进TB-01。TB-02/03依序等槽；有空位、目标产品/合同未漂移且无新counter时，按卡面预授权同步状态/看板/索引后自行开工，不再等用户逐批点头；目标漂移则停对应批交Codex确认。
> 每批独立codex/分支/worktree，只新增该卡白名单测试/fixture/诊断/本人回执；不在主树切分支、不恢复stash、不混用未接收测试基线。逐族去重、合法输入先过当前guard，负控必须候选自身AssertionError业务红，超时/STACK_TRACE_ERROR或独立oracle红不能冒充。已知PNG失败泄漏、活动页声音选择及在途回填维持隔离，不改产品，不写错绿。
> 定向/相邻/全包/tc/Biome、私有同口径覆盖、真实计数/失败记录/逐族账完成后交Codex独立接收。全仓check/官方ratchet/strict-fast由Codex串行执行。GLM测试贡献须披露，不代签、不标done，不直接转Kimi终审。手头满两批时继续TB-04～10只读细化，不越门写正式测试。
> ```
>
> ## 两席并行提示词（历史，r2设计审查已完成）
>
> ### GLM · 同时确认r2设计差异（不影响TB-00返工优先）
>
> ```text
> 在 /Users/zhangxu/illegal/type-pal 并行确认前三批r2设计，生产冻结e58834f6：
> docs/ops/archive/tasks/done/TEST-CONTENT-RESIDUAL-1-registered-gaps.md
> docs/ops/archive/tasks/done/TEST-REFORGE-ASSET-IO-1-read-cache-sfx.md
> docs/ops/archive/tasks/done/TEST-EDITOR-IMPORT-CODEC-1-workers-metadata.md
> 均draft，Codex已签r2，未开build；原r1自签保留历史。先同步分支并读AGENTS/CLAUDE/READ-FIRST、三卡、对应glm-content-residual.md / glm-reforge-asset-io.md / glm-editor-import-codec.md，以及docs/testing/archive/legacy/quality/quality-gates/glm-coverage-queue-design-review.md。
> 重点直接核r2差异：content无反向loader依赖/合法当前fixture/旧分片先分类；HTTP只透传与FSA主动取消分开；实际browserAdapter复制而非假adapter；声音当前页待证不固化；worker原handler零产品导出、真实transfer；PNG编码失败泄漏隔离归Codex。
> 可复跑 node --import tsx docs/testing/domains/quality/quality-gates/tools/coverage-queue-premise.mjs；其证据是协议级，不是浏览器/视觉/听感。不要读取或复述Kimi结论。三卡分别在本人r2席位补充premise verified/design agree及直接锚点/可证伪条件，或counter；只改本人签字/日志并提交推送，不改他席/状态、不开始实施、不标done。
> TB-00既有返工优先；新批只有同r2三签齐且Codex核定build才开，原测试目的不扩张，不要求重签历史done卡。后续按最多两批未接收的队列限制错峰。
> ```
>
> ### Kimi · 三卡同批独立设计审查
>
> ```text
> 在 /Users/zhangxu/illegal/type-pal 独立设计审查以下三卡r2/draft，冻结e58834f6：
> docs/ops/archive/tasks/done/TEST-CONTENT-RESIDUAL-1-registered-gaps.md
> docs/ops/archive/tasks/done/TEST-REFORGE-ASSET-IO-1-read-cache-sfx.md
> docs/ops/archive/tasks/done/TEST-EDITOR-IMPORT-CODEC-1-workers-metadata.md
> 先同步检查工作树，读AGENTS/CLAUDE/READ-FIRST、三卡前提/方案、三个对应工作包和docs/testing/archive/legacy/quality/quality-gates/glm-coverage-queue-design-review.md，再直接核一手代码和旧测试；不读取或复述GLM签字结论。
> 重点压力测试current fixture/跨包去重/无反向依赖；HTTP-FSA、WebAudio标记门-真正宿主解码的合同分层；canonical活动页待证隔离；Node worker宿主既能调用真实handler和codec，又不冒称浏览器线程验证；PNG泄漏已确认且不准被GLM反写为绿测。可复跑只读前提探针，三卡独立裁决，一个counter不阻塞其他无依赖卡。
> 分别在本人r2席位写带源码锚点和可证伪观察的premise verified/design agree，或明确counter。直接写本人日志、提交推送；不改他席/任务状态/产品/测试，不代签、不标build/done。与GLM差异确认可并行，落盘前同步保留对方改动。Codex收齐后核准入。
> ```
>
<!-- original-source-quote:end -->
