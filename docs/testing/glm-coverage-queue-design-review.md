# TB-01～03：Codex设计收口与并行交接

2026-09-19，生产核对点`e58834f6`，接手main为`e22041a0`。
用户要求GLM返工TB-00同时，Codex推进后续三批设计。**三卡统一收敛为r2/draft，Codex已签前提/设计；尚待GLM差异确认及Kimi独立设计审查，不开放build。**
r1自签原文留历史，不把错误前提静默覆盖成已被三席认可的r2。此次不重开任何已done卡，也不新增产品范围。

| 队列 | 任务卡 | r2关键收口 |
|---|---|---|
| TB-01 | [内容合同残项](../ops/tasks/TEST-CONTENT-RESIDUAL-1-registered-gaps.md) | 当前结构守卫，不反向依赖运行时loader；已测/旧分片候选先分流 |
| TB-02 | [读取缓存与音效准备](../ops/tasks/TEST-REFORGE-ASSET-IO-1-read-cache-sfx.md) | HTTP/FSA分开，音频adapter复制与标记门分层；页选择疑点不写正确绿测 |
| TB-03 | [导入编码与工作线程](../ops/tasks/TEST-EDITOR-IMPORT-CODEC-1-workers-metadata.md) | 无产品导出的真实handler方案、真实transfer；媒体边界订正，已确认泄漏隔离 |

## 复核方式与已跑证据

Codex本人读三张卡、三个工作包及关键生产/旧测试；内部两路只读取证用于补充线索，**不作为GLM/Kimi席位**，
最终由本人再次核源码并复跑关键前提。使用Vitest/pnpm的当前仓库口径、Vite宿主边界；未新增正式测试、未改生产/官方覆盖。

- TB-01相关既有测试10文件/148项绿（命令列表含一个无同名直接文件的actor-reference过滤项；实际执行10文件，不能报11）。
- TB-02六既有测试文件/39项绿，证实sfx实际12项、file-source实际8项等去重事实。
- TB-03四既有直接文件/6项绿；没有把无同名worker测试推断为浏览器无法测试。
- 日志：`/tmp/type-pal-queue-design.Lh7r5P/tb01-existing.log`、`tb02-existing.log`、`tb03-existing.log`。
- [可重建只读前提探针](glm-coverage-queue-premise.mjs)：

```bash
node --import tsx docs/testing/glm-coverage-queue-premise.mjs
```

探针不写项目、资产、基线或正常存档；PNG生成/解析仅借用pal-extract已声明的pngjs工具依赖，不给content反向加依赖。
输出证明：合法unbound cue的精确AssetId边；合法外部Unicode TPFS索引逐像素恢复且UTF-8/JSON错误分开；
实际browserAdapter复制字节并走connect/start/stop/close；实际worker.onmessage的quantize/encode及真实transfer；
实际client发送副本detached而原buffer保持、terminate一次。
这些是非视觉宿主协议证据，**不是浏览器线程调度、PCM解码或画面验证**。
探针初次格式检查遇到forEach表达式回调规则，改为for-of后Biome通过；不存在候选产品修复或隐藏失败重跑取多数。

## TB-01的直接证据与收敛

1. `asset.ts:387–423`的入口名是`commandAssetTaggedReferencesAtNode`。`actor-reference.ts:244`的
   `collectDialoguePortraitReferences`刻意不扫unbound全局资产。原A1混名已订正；探针先`checkAuthorDialogueCue`，再钉完整where/asset/kind。
2. 原A2的`:282–287`是`palBattleSpriteAssetId`，不是相邻收集臂；实际caller在migrate/pal-battle-sprites.ts:53/63/116、pal-assets.ts:926。
   合法channel域和零/正数边界可独立补；不能造无消费者参数。
3. 表情rename已有editor/actor-dialogue-commands.boundaries.test.ts:149的全域/非目标/输入/invert强证据；默认登记已有，不强制第六测试文件。
4. `content/tsconfig.json`的ES2022/rootDir与依赖方向不允许为了结构正控反向引reforge/project-loader。
   r2改成本包现行结构guard+引用零issue基线；世界输入通过当前构造器。严格区分“结构合法”和“loader/保存重开已通过”。
5. 当前open-local.ts:77返回scriptChunks={}，其它旧migrate构造分片不等于当前发布工程消费。
   A12非空scriptChunks/scriptIndex先证明当前consumer，否则归旧接口/待清理，不为臂数保活。
6. TPFS parse:255–278外部字节先UTF-8再JSON；validator容许未消费扩展字段，探针用Unicode扩展键值证明多字节decode可达。
   encoder生成的当前元数据仍是ASCII，不因此补不可能的encode分支或引入新字段政策。
7. author-dialogue:125–168的speed/autoAdvance允许0及非整数非负有限数；map-index原重复ID/路径/自身保护已有强测试，r2先扣重。

## TB-02的直接证据与收敛

1. `file-source.ts:27–47`只透传AbortSignal给fetch并原样消费Response；没有FSA式逐await门，也没有统一JSON错误包装。
   `fsa-source.ts:18–50`才存在主动取消门；两套正反控必须分开。
2. `sfx.ts:75`复制发生在产品browserAdapter；SfxPlayer向注入adapter直接传reader bytes。
   新测试要走实际browserAdapter并替AudioContext宿主，不能注入假adapter后要求它接到复制品。
3. `assertWave:90–94`只检查长度/RIFF/WAVE标记；完整WAV正控有意义，但mock decodeAudioData不是PCM解码证明。
4. 旧sfx 12项已覆盖decode/read/play失败、resume重试、dispose旧prepare、错误上下文。registry.test.ts:24–40已有503重试。
   r2各族只补独立余轴，禁止重命名这些既有断言后计算新增。
5. `main.ts:774–789`给collector传canonicalScene且无additionalRoots；`sfx-readiness.ts:168`固定pages[0].animation。
   旧测试的玩具SceneDef不能证明canonical initialPage/当前活动页合同，故本包移出“当前页选择正确”的绿测主张。
6. AdditionalRoots可作为公开helper可选接口分类，不冒称main覆盖；库存/动作/shared脚本闭包均先过对应现行guard。
   Registry模块级缓存与ProjectImageCache实例级缓存分开设计，禁跨例成功预热；在途dispose回填仍待证。

## TB-03的直接证据与收敛

1. TPFS是工程格式；BMFF属于ISO标准容器体系，不是工程自定格式。[W3C说明](https://www.w3.org/TR/mse-byte-stream-format-isobmff/)
   `video-metadata.ts:49–52`只是窄音轨探测；识别头失败undefined、未找到/畸形box多数false、找到soun为true。
2. `worker.ts:27–35`已把真实handler挂到self.onmessage，无需新增导出或worker_threads包装产品；独立self后import即可捕获。
   真实encode输出经正式TPFS解析/解码，像素[4,5,6,255]；quantize为[0,0,0,255]，不是mock codec。
3. `worker-client.ts:39–49/76–77`在postMessage前复制source/frames。探针实际structuredClone transfer使传输副本detach，调用者原四字节保持，terminate=1。
   Node只验证消息合同，浏览器线程调度另归Codex；不添加产品导出，不回落为“宿主不可达所以不测”。
4. 官方include含worker，0/13不是被排除；解码图片入口为FrameAnimationEditor:506，:593是encode；MP4实际入口是CutsceneTab:232。
5. battle-sprite-import的新输入frameCount/bytes由正式Uploader提供；复用分支才做已有资源真实读取解码。不得要求helper承担不存在的重复校验。

## 新发现/待证的独立归属（不混入本包正确绿测）

| 项 | 证据 | 归属与处理 |
|---|---|---|
| PNG编码失败后的位图未释放（已复现） | image-import.ts:130–142缺finally；同一完整320×200 PNG+合法palette，成功close=1/toBlob=2；只让toBlob返回null，抛正确错误但close=0/toBlob=1。主Agent探针已独立复算 | Codex后续修复。GLM可记录只读反例，不改产品，不把“不close”写成正确绿测；其余七模块独立轴继续 |
| canonical场景页声音选择（待证） | collector固定pages[0]而main传canonicalScene，未携world活动页；尚未完成正式场景运行验证 | Codex另核端到端语义/必要时开修复；本包不把首页等同活动页，不宣称产品缺陷已修 |
| ProjectImageCache在途dispose回填（已知待证） | dispose清map，decode完成会set；政策未定 | 原待证归属保留，只测已完成load后的dispose |

新增缺陷没有直接变成“增加第三阶段功能”，也没有借补测卡授权产品修改；本文件是持久交接入口，后续修复要带回归和真实收尾验证。

## 当前推进规则

三卡r2原6/6/7模块及只新增测试边界不变，但修正了会导致假绿的前提/宿主方案；因此GLM对r2补充确认，Kimi首次独立审r2。
Codex已签同一r2/冻结；两席完成后再核build。TB-00的R1–R4返工优先，不与新包共享可修改fixture或混合覆盖报告。
未接收实施包最多两批；若两包都在等接收，其余只做准备。每卡一Coding Owner、独立worktree，正式质量门由Codex串行执行。

## 两席并行提示词

### GLM · 同时确认r2设计差异（不影响TB-00返工优先）

```text
在 /Users/zhangxu/illegal/type-pal 并行确认前三批r2设计，生产冻结e58834f6：
docs/ops/tasks/TEST-CONTENT-RESIDUAL-1-registered-gaps.md
docs/ops/tasks/TEST-REFORGE-ASSET-IO-1-read-cache-sfx.md
docs/ops/tasks/TEST-EDITOR-IMPORT-CODEC-1-workers-metadata.md
均draft，Codex已签r2，未开build；原r1自签保留历史。先同步分支并读AGENTS/CLAUDE/READ-FIRST、三卡、对应glm-content-residual.md / glm-reforge-asset-io.md / glm-editor-import-codec.md，以及docs/testing/glm-coverage-queue-design-review.md。
重点直接核r2差异：content无反向loader依赖/合法当前fixture/旧分片先分类；HTTP只透传与FSA主动取消分开；实际browserAdapter复制而非假adapter；声音当前页待证不固化；worker原handler零产品导出、真实transfer；PNG编码失败泄漏隔离归Codex。
可复跑 node --import tsx docs/testing/glm-coverage-queue-premise.mjs；其证据是协议级，不是浏览器/视觉/听感。不要读取或复述Kimi结论。三卡分别在本人r2席位补充premise verified/design agree及直接锚点/可证伪条件，或counter；只改本人签字/日志并提交推送，不改他席/状态、不开始实施、不标done。
TB-00既有返工优先；新批只有同r2三签齐且Codex核定build才开，原测试目的不扩张，不要求重签历史done卡。后续按最多两批未接收的队列限制错峰。
```

### Kimi · 三卡同批独立设计审查

```text
在 /Users/zhangxu/illegal/type-pal 独立设计审查以下三卡r2/draft，冻结e58834f6：
docs/ops/tasks/TEST-CONTENT-RESIDUAL-1-registered-gaps.md
docs/ops/tasks/TEST-REFORGE-ASSET-IO-1-read-cache-sfx.md
docs/ops/tasks/TEST-EDITOR-IMPORT-CODEC-1-workers-metadata.md
先同步检查工作树，读AGENTS/CLAUDE/READ-FIRST、三卡前提/方案、三个对应工作包和docs/testing/glm-coverage-queue-design-review.md，再直接核一手代码和旧测试；不读取或复述GLM签字结论。
重点压力测试current fixture/跨包去重/无反向依赖；HTTP-FSA、WebAudio标记门-真正宿主解码的合同分层；canonical活动页待证隔离；Node worker宿主既能调用真实handler和codec，又不冒称浏览器线程验证；PNG泄漏已确认且不准被GLM反写为绿测。可复跑只读前提探针，三卡独立裁决，一个counter不阻塞其他无依赖卡。
分别在本人r2席位写带源码锚点和可证伪观察的premise verified/design agree，或明确counter。直接写本人日志、提交推送；不改他席/任务状态/产品/测试，不代签、不标build/done。与GLM差异确认可并行，落盘前同步保留对方改动。Codex收齐后核准入。
```
