# TEST-CONTENT-CONTRACTS-1 · Codex独立接收复核

2026-09-18；候选`dbe579c5f7e8790d03d4ce1974449118537c021f`，分支codex/glm-content-contracts-r1，
接收主线/实施基点`5fd655ec5b0d958acec2dbd7b42456157ff258a3`；产品冻结7ab20689。
任务：[内容校验补测卡](../ops/tasks/TEST-CONTENT-CONTRACTS-1-content-validation-boundaries.md)。

## 结论：counter，定点返工，不合入

116项、原12负控和覆盖增量可以复算，但合法主载荷、断言鉴别力、负控判据及完成账仍有R1～R4阻断。
这是**交付测试包的问题**。下述六个错误是本席主动注入的坏实现，不是声称生产已有六个新bug。
没有修改GLM测试语义、合并测试或改官方基线；未跑接收后的全仓check/ratchet/strict-fast；r1设计不重签。
GLM原始回执/机器账/自验保留在候选树，读取`git show dbe579c5:docs/testing/glm-content-contracts.md`、
`git show dbe579c5:docs/testing/glm-content-contracts-evidence.json`及候选任务卡。主线不把未接收回执冒称完成。

## 已确认的有效部分

- main/origin同步5fd655ec；候选工作树干净，HEAD/remote ref/ls-remote同为dbe579c5。
- 实施增量20文件：13测试、1fixture、3诊断/机器账、回执、任务卡、看板。board属Owner状态联动，不当产品越界；
  产品/旧测试/原探针/依赖/官方基线/projects/data相对冻结零diff。基点内派发/签字文档不计本包贡献。
- 本席复跑13文件**116/116**、全content **55文件/673项**、typecheck均exit0。16个TS/MJS/MTS文件Biome零诊断；
  加入交付JSON则有formatter error，不能称全交付Biome绿（R4）。
- 原负控重建**6正控exit0＋12变异exit1**，逐日志确认AssertionError且本次没有TypeError/超时/未处理异常；产品hash不变。
  R3是长期判据不足，不抹掉此次真实业务红。
- 独立按入仓config绝对路径重测before42文件557项、after55文件673项；两边50个生产文件，分母相同。
  局部13模块：行1593/1842→1689/1842，语句1743/2089→1859/2089，函数323/359→340/359，分支1275/1743→1402/1743。
  全包：行4358/5183→4454/5183，语句4762/5854→4878/5854，函数748/829→765/829，分支3666/5016→3793/5016。
  原报+116语句/+127分支成立；执行覆盖不能替代合法输入/有效断言。

## R1 · “干净合法”主fixture被现行守卫拒绝

以下测试路径省略packages/content/src/，行号钉dbe579c5。

- `validate-refs.contracts.test.ts:18`保留退役scene.onEnter数组，AST抽取实际bundle调用validateAuthorScenes，
  拒绝`scenes[0].onEnter: current 作者态脚本必须位于 hooks.onEnter`。
- 同文件`:49`的SpriteDef缺label；validateSprites拒绝`sprites[0]: 缺键 "label"`。
  `:85-90`仅用validateReferences零issue不能证明结构合法——引用校验不代替结构校验。
- `asset-closure.contracts.test.ts:33-36`的page.body不是当前页字段；实际scene被validateAuthorScenes拒绝
  `scenes[0].entities[0].pages[0].body: 未知字段`。普通flag字符串应放在真实当前脚本域，不是非法页壳。
- 独立正控：同一F bundle仅去掉退役onEnter并补sprite.label，即通过AuthorScene/Sprite/Actor/BattleSprite守卫及零引用issue。
  没有指控该fixture的Actor/baseStats或battle profile拒绝；本席实测它们通过，不扩大结论。

返工：**实际进入受测函数的正常载荷**先过相应当前守卫，不能另造合法例替非法主例背书。
unknown/tag scanner的明确坏输入、纯Pick<layout|poses>计算的局部合法载荷不必强塞完整项目字段；
但声明完整当前场景/ContentBundle正控的值不能用as unknown as掩盖缺字段/旧形态。

## R2 · 六个坏实现仍被候选断言放行

重建：[content-contracts-review-witnesses.mjs](content-contracts-review-witnesses.mjs)，运行：
`node docs/testing/content-contracts-review-witnesses.mjs /Users/zhangxu/illegal/type-pal-glm-content-contracts`。

仅Vite内存替换、不写候选文件。每针附加一条审查专用执行检查，由Vitest JSON验证status=passed；
检查实际被污染对象、越界source或非零offset等，不只是load日志。此检查不计入GLM新增测试数。
四正常对照通过，六针均MISSED；对应原测试仍全绿且执行检查通过，产品hash不变。

| 见证 | 漏检及锚点 | 原候选测试结果（不含附加检查） |
|---|---|---|
| actor-input-pollution | author-dialogue.contracts.test.ts:72快照一次actors()、:75传另一次、:83比较第三次。污染真正传入Actor.spriteId不影响它比较的对象 | 对话7/7绿 |
| source-bound-masked | project-map.contracts.test.ts:84-90同时含越界source=1和tile非null/source=null；去掉来源上界门后仍因另一个错误抛出 | 地图5/5绿 |
| tpfs-view-offset-lost | frame-sequence.contracts.test.ts:91-99只验index帧数。payload忽略bytes.byteOffset但保留同长度，实际字节已错位仍不被发现 | 帧容器18/18绿 |
| levelup-severity-wrong | validate-refs.contracts.test.ts:122-128接受error或warn任一；把应warn的缺技能改成error仍绿 | F5/5绿 |
| entity-locator-wrong | 同文件:101只要求where包含entities；把.actor改成.wrongLeaf仍绿 | F5/5绿 |
| reference-extra-issue | 同文件:108-117只some命中；给ghost-scene多报一个不相关error仍绿 | F5/5绿 |

返工：

1. 保存并快照**真正传入**的actor字典，调用后核同一对象；排查同类重复factory/自比较。未使用的expectInputUnchanged不能替实际断言背书。
2. 来源越界例只坏一个轴，其它格保持tiles/sources匹配；核对应错误路径，并有同基线合法修正正控。
3. C5对**该非零offset视图**完整解码比较全部帧/像素，不能借零offset用例背书；输入不变与输出别名声明分别落实。
4. F核完整Issue多重集合：确定severity、完整where、目标id和无额外issue；未声明顺序可排序，但不可Set吞重复。
   levelUp缺技能为warn（validate-refs.ts:1661），不是“error或warn按合同”；scene.mapId悬空也不应称物理路径悬空。
5. 六针返工后应detected，执行检查本身仍须passed。抽取fixture若需适配名称/结构须报告Codex，不删见证或改产品躲避。

## R3 · 负控判据把模块加载当执行，且会接受污染日志

`glm-content-contracts-mutants.mjs:220-226`只在Vite load打印MUTATION_HIT，不能单独证明坏分支执行。
`:244-255`只要求该标记/任意AssertionError、排除四类启动错误，未排除TypeError、ReferenceError、timeout、Unhandled Errors。
本席AST抽出其真实判据，输入混合MUTATION_HIT＋AssertionError＋TypeError＋Test timed out＋Unhandled Errors，仍被接受；
工具输出`mixedFailureAccepted: true`。不声称其原12针此次有这些故障——本席已逐日志确认此次确为业务红。

返工：增加源码点运行态见证或测试JSON执行检查，钉本组新增断言的实际业务失败；拒绝宿主错误/超时/未处理异常混入。
给判据本身补正常/混合坏日志正反控；若改脚本结构，保留可重建等价自测，不能把缺见证改成跳过。

## R4 · 完成账、待证归属与交付卫生

- “唯一未实施B4，其余各族均有新增”不成立：F4共享/item-private/enemy正文、F5可见world均未在5个F用例出现；
  C4未调用encodeFrameSequenceFromProvider，deflate回调不能代替帧提供器；C1/C2若干UTF-8/JSON/index轴也未新增。
  可以有已有证据或明确后续归属，但不可全记新增完成；按**43族A1～F8**逐项给caller、实际测试全名、正反控与分类，机器账需同样可对账。
- 原报E组的`actor-reference.test.ts`不存在。B4已有`project-map.test.ts:91`正控及`packages/editor/src/core/map-reference-facts.ts:73`真实消费；
  本席不强制现在新增，可保留后续，但需正确已有证据与剩余归属，不能以“有caller再补”作未查证的空白理由。
- C8提及的TextEncoder宿主切换在当前frame-sequence.ts不存在：:98为固定手写encodeUtf8；合法编码元数据经prepare/finish后为ASCII字段。
  不要求造不存在的降级测试；应明确N/A/防御依据并区分encode/decode输入域，不能笼统记已新增或可达未测。
- 标题与断言对齐：地图“返回原引用”其实只toEqual且实现重建对象；C5“编码往返”只parse索引；F的完整级别/非目标保持尚未钉住。
  不得为了旧标题去改正确产品行为。
- 交付JSON的Biome formatter error、文档工具“任务索引与卡片顶部状态不一致”均可复现。
  允许机械更新任务index匹配阶段；不格式化其它文件。5fd已记build allowed但主线顶部/board仍draft，本次由Codex统一转rework。
- 机器账原命令`pnpm --filter @type-pal/content exec vitest ... --config docs/testing/...`不可复制执行：cwd已在packages/content，
  本席得到UNRESOLVED_ENTRY；改绝对路径或../../docs/testing/才成功。补完整before/after命令、exit、日志、源码hash和失败记录。
- 增量实际8提交（A+B合一，再C/D/E/F/负控/config/回执），不再写“六组各一、7个”；保留真实历史，不倒改SHA凑账。

## 证据与接续

- `/tmp/codex-content-contracts-r1.zoMriZ/`：directed/content/typecheck/biome-source绿；biome含JSON及docs红；
  mutants为本席原6+12复跑；coverage-before/after为同树临时覆盖；receipt-command保留不可执行原命令。
- `witnesses-verified.log`包含四正控、六MISSED、实际fixture守卫结果与污染判据自测。
  自建工具首版stdout见证未取得，不计证据，后改Vitest JSON执行检查；一次辅助AST提取误用statement已改thenStatement，亦不计产品失败。
- 候选工作树未变，主线产品/旧测试/基线未动；本席只提交复核/见证。GLM保留有效用例及counter，按原白名单返工，不重签设计、不代签、不标done、不转Kimi。
- 通过接收后才由Codex统一串行check→ratchet→受保护strict-fast。本轮不让GLM补跑这三项。
