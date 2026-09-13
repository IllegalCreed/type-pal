# GLM 并行审计准备：整批回执

工作包：[r1范围与44项检查表](glm-pre-e2e-prep.md)。执行者GLM，接收复核Codex。
当前：GLM三轮返工候选6deb390ccd1f4f998e05a62c4d0725f542a27016已复核，**两项主要鉴别力已通过；仅剩缓存前提失败仍报covered及机械对账收尾，原样接收仍counter**。
最新结论见文末“Codex三轮定点复核：6deb390c”；此前counter是历史，不代表已通过项目仍须返工。
候选原报告/四探针留在codex/glm-pre-e2e-prep分支，尚未合入main；下方GLM填写占位保留给经复核的接收版本，
不表示GLM尚未交付。D-01设计签字已先交623c592f，Kimi亦已签；批次counter不重开已证实的D-01前提/设计。

## 冻结树与实际范围（GLM填写）

- 分支/基点/最终SHA：待填。
- packages相对10c84238零diff、白名单外零diff：待核。
- 必要环境适配与限制：待填。

## 44项唯一ID总表（GLM填写）

按G-H01～16、G-R01～10、G-I01～08、G-C01～10逐项登记，不用组合ID行代替唯一账。
每行包含分类、caller/前提/正控、具名测试或探针、观察/可证伪条件、归属；禁止无证据“已完成”。

## 分组证据与命令回执（GLM填写）

- G-H：待执行。
- G-R：待执行。
- G-I：待执行。
- G-C：待执行。

## 归并、待证与建议回归（GLM填写）

待填；不得把44项检查表报为44个缺陷，或把取证完成报为产品修复完成。

## 最终机械对账（GLM填写）

- reproduced/covered/risk/blocked/N/A分类计数及总计44：待核。
- 每次命令/退出码/日志与环境失败：待填。
- 文件白名单、原探针零改、真实工程/浏览器零写、未跑全仓质量门：待核。
- 后续若采纳回归，GLM贡献须披露：已知约束，不作为独立自证。

## Codex接收复核

### 结论与冻结边界（2026-09-13）

**counter；不合入四个候选探针，不转正式回归，不改产品、不标done、不转Kimi。**
保留可采纳的撤销反例和7处配对入口清单；下面列明每项的接收边界。不是要求推翻全部工作或另增一批需求。

- main接手3f34c558，工作树净且origin同步；远端`ls-remote`与本地origin/codex/glm-pre-e2e-prep均为028ad866完整SHA。
- 候选基点59e03bdb；diff精确为本报告+四个`probe-glm-*-prep.mjs`。packages对10c84238零diff，原探针、
  scripts、生成数据等白名单外零diff。复跑在原冻结worktree `/Users/zhangxu/illegal/type-pal-glm-prep`，未改该工作树文件。
- 四条原交付命令由Codex独立复跑，均exit0；这只是诊断完成，不自动证明covered/reproduced分类正确。
- 44个唯一ID及12/23/9算术成立，但语义分类不成立；尤其G-H08/G-H11报告与现场probe标签相反。
- 代码级复核使用Vite无HTTP SSR加载、必要时AST执行实际产品函数；无浏览器/截图/声音/真实用户IO。
- 本轮不跑全仓check/coverage/ratchet；定向Biome检查四个新probe为exit1，4个format error、8个warning，不能原样合入。

以下候选文件锚点均指028ad866树（不是main上已接收的文件）。独立证据目录为
`/tmp/type-pal-glm-prep-review.d2dIGQ/`；不覆盖GLM的`/tmp/glm-prep-evidence/`。

### R1 · 场景删除被换成钩子删除，三条缺陷被错误判为covered

- `probe-glm-reference-prep.mjs:94–155`的target是`{kind:'scene-hook', ... hookId:'hook-c'}`，
  执行DeleteSceneHookCommand；工作包G-R01/02/04要核的是被命令/条件引用的**目标场景**能否删除。
  disabled/inherit不引用具体hook，不等于它们不引用目标SceneId。
- 候选报告:53–56把G-R01/02/04都记covered。当前
  [adapter](../../packages/editor/src/core/project-reference-adapters.ts)的canonicalCommandTargetEdges仍未接selectSceneHooks，
  组装只传commandVisits，transitionVisits没有进入场景目标边；content collector支持不等于editor已接上。
- Codex独立`reference-oracle.mjs`用真实blank seed建立source/target两个场景，四变体均先通过正式loader、
  loadAllAuthorScenes及保存序列化。删除**scene target**的结果（`reference-oracle.log`）：
  - disabled/inherit/transition currentScene：blockers=0，真实配对删除成功，随后保存拒绝“场景target不在scenes”；undo可恢复。
  - use：blockers=1，删除被拒，保存仍合法。原D-02三项缺陷没有消失。
- G-R09 `:187`检查的是hook-b仍在，而删除目标是hook-c；并且整份probe没有调用序列化函数。
  不能把它作为“目标保留→删除/撤销→序列化”闭环。
- G-R06“场景根级stages/machine命令不可见”不作为新D-02业务缺陷接收：当前
  [BaseSceneDef](../../packages/content/src/scene-core.ts)未定义这两个脚本根，脚本位于hooks。
  Codex实测loader会接受这两种额外字段，但未找到它们作为可执行脚本根的消费域；
  **loader接受额外字段不证明其有脚本语义**。当前最终probe也未保留该中间fixture，无法独立复算其原发现。

返工：恢复两场景、scene-target删除及真实保存/撤销正反控；补transition/all-any-not对应域。
钩子删除观察可保留但独立命名，不充场景删除通过。对根级字段提供当前类型/loader/runtime消费证据和最终fixture；
否则撤回“新引用漏边”，最多列输入严格性待证，不把风险升级成已确认根因。

### R2 · 缓存失败并未注入，替换与跨工程fixture不成立

- `probe-glm-cache-prep.mjs:130–155`先用G-C04预热starter同key，再置failSpriteOnce；G-C05直接命中成功缓存。
  Codex仅增加注入次数见证，`cache-witness.log`精确为 **injections=0 / stillArmed=true / reads=1→1**。
  因此该次没有首读失败，也不是失败null缓存复现。
- `:159–188`G-C03将sha写成`v2-sha`，未计算有效新hash；路径starter-v2还触发上一例遗留的失败开关。
  见证为injections=1，独立真实loadEditorSprite随后拒绝“sha256不符”。**新路径读一次不等于成功载入替换资产。**
  本例同时换reader，亦不能冒称隔离证明“同reader记录修订失效”。
- `:193–252`FIRE基座的assetResolver只有readRoleText，缺真实loadFireSprite所需record/readBytes。
  实测直接调用报`base.assetResolver.record is not a function`；A的1次读取是失败的palette读取，不是FIRE资产成功读取。
  B没有合法成功正控，两次mountFire都传同一个assetReader，也没有构造不同workspace。
  G-C06没有把A修成可成功读取的基座，却写“修复后重挂载”。
- `:61`用固定20ms等待React/effect，不满足工作包的entered/deferred/明确完成信号要求。
  G-C07也没有在途A/B的动态控制，且“key双重隔离正确”与自身chunk-only结论矛盾。

返工：每个故障例用独立新鲜key/reader/缓存域，必须证明注入次数及真实失败结果；恢复后下层成功正控，
上层再验证是否仍被失败缓存阻断。有效新字节配真实SHA，保持需检验的其他轴不变。
FIRE用合法AssetBase/AssetResolver、合法同chunk不同内容及身份，分开身份问题与失败缓存策略。
改确定性完成信号，至少核真实加载/解码完成而非只计请求开始；不做视觉判图。

### R3 · 直接提交B不能证明最后选择，字节断言可放过坏数据

- `probe-glm-upload-prep.mjs:94–132`只构造A/B，然后直接调用AddSpriteCommand传B；没有执行pickFile、
  向导submit或A→B的选择过程。只能证明命令消费给定B，不能证明“最后选择获胜”。
- bytesMatch只比较长度，shaMatch只比较catalog里复制的hash。Codex单点把传入blob改为**同长度、保留gzip头的坏字节**，
  实际hash为922c07…而登记hash仍4aa3af…，probe仍输出G-I07 covered（`upload-witness-final.log`）。
  该单点只检验probe断言，没有调用正式writer；不据此报告坏字节已经落盘或新增保存缺陷。
- Codex重跑仓内原`probe-editor-sprite-upload.mjs`（零修改，`original-upload.log`）：真实pick/submit回调下，
  A后选B，完成A→B提交宽2的B；完成B→A却提交宽1的A，wrongImageImported=true。
  无浏览器也能用AST/受控解码取证，“无渲染环境”不能为虚假的最后选择正控提供依据。
- G-I08“失败无句柄可漏/covered”过宽：实际pickFile先取得bitmap，随后getContext失败或drawImage抛错时不调用close。
  `bitmap-witness.log`执行实际pickFile：成功close=1；no-context/draw-throws分别close=0且错误可见。
  此处只证明已取得句柄未显式close，不宣称已测浏览器泄漏/内存峰值。

返工：执行真实pick/submit（可AST/无界面组件），正向与逆序完成均列实际结果；独立检查实际存储字节的hash/逐字相等，
保留“同长度坏字节必须被断言抓到”的oracle自检。组件的重复提交/选择门与命令的重复ID检查分栏；
G-I06直接复用asset key只算命令侧对照，不冒称覆盖向导去重。G-I02/03/04未跑可如实保留risk，
不要为凑covered臆定关闭语义；G-I08收窄并登记上述资源释放边界。

### R4 · 分类/轨迹/计数要来自最终实际证据

- G-H03报告“无布局全对”与日志相反：P-mid、P-last、P-P的操作逆序正确；问题在P-first的混合排列。
  G-H02的redo是在4次undo之后，不是紧接第2次undo；报告必须保留实际操作顺序。
- G-H08 probe硬写covered并附“失败与no-op均不清redo”，现场却是noop=true/redo=false；报告又记reproduced。
  G-H11 probe硬写reproduced，但回滚后body=[]、双dirty=false、script undo=false，报告记covered。
- G-H08没有检查工作包指定的**返回同一state**的no-op。等值新引用观察可保留单列，不擅自加入D-01全面Command治理范围。
- G-H09建议用dispatch/undo/redo的historyVersion计全局序，与已签方案相反：它只能作为变化/失效信号，
  undo/redo本身不能冒充新作者提交。
- G-H10两次同对象dispatch后的undo轨迹为0→0，不是10→0；“两次调用不炸”不等于两次撤销语义正确。
  须核实际重复使用caller及合同，再分类，不因此扩张正式支持承诺。
- G-H14不能用leave-guard的卸载测试替代history coordinator的绑定/重挂载证据。
  G-H05/16引用整文件测试总数不等于给出具名用例/已复跑证据；静态census、设计建议和动态covered须分开。
- 四个probe的定向Biome为4个format error/8个warning（`probe-biome.log`）。无需跑整仓质量门，但交付文件须能过自身静态门。

返工：逐ID用真实观察或明确断言产生结论，若只打印轨迹就按轨迹核分类，不硬写与结果相反的verdict；
补足正控并将无法证明的部分标risk/blocked。重新生成唯一44项账与归属，不要求仍为12/23/9，
也不把“待证风险”作为第6个已确认根因组。回执正文合并纠正，另留本counter与返工说明。
统计仅取GLM最终总表区块，不把保留的Codex原文裁定表重复计数。

### 逐项接收裁定（44项，不取代GLM返工后的分类表）

“限定”表示仅接受列出的观察，不认可原行全范围covered；“待证”可保持risk，不要求为数量造测试。

| ID | Codex裁定 | 接收边界/归属 |
|---|---|---|
| G-H01 | 采纳 | 两方向交错错序，D-01正式回归候选 |
| G-H02 | 限定 | 拆半成立；纠正redo是在4次undo之后，D-01 |
| G-H03 | 纠正 | 区分错误P-first与三个正确控制排列 |
| G-H04 | 采纳 | 7处配对入口静态census，不叫7组动态验收 |
| G-H05 | 待证 | 场景caller清单可用，须给具名回归；1893是实体删除 |
| G-H06 | 采纳 | 实体增删入口清单，不扩成动态闭环 |
| G-H07 | 限定 | 单栈孤儿redo实证；转正时钉实际全局App redo |
| G-H08 | 纠正 | 返回同态no-op未测；等值新引用另列，不扩D-01 |
| G-H09 | 纠正 | historyVersion不能定义新作者提交顺序 |
| G-H10 | 待证 | 同对象实际回退0/0，复用合同与caller未证明 |
| G-H11 | 限定 | 失败后的内容/dirty回滚观察可用；修正probe标签，不外推元数据全保全 |
| G-H12 | 采纳 | script invert失败丢历史项；redo失败仍需独立回归 |
| G-H13 | 采纳 | 同步订阅半状态可见，D-01 |
| G-H14 | 限定 | Root新双session的静态事实；不替代history生命周期验证 |
| G-H15 | 限定 | 缺正文静默丢与空正文正控可用；未引用记录分支未测 |
| G-H16 | 限定 | 最小负控建议可用，既有用例需名字/证据而非总数 |
| G-R01 | 纠正 | 场景disabled依赖仍可误删，不是covered |
| G-R02 | 纠正 | 场景inherit依赖仍可误删，不是covered |
| G-R03 | 限定 | hook-c use边对照，不是父场景独立证明 |
| G-R04 | 纠正 | transition currentScene父场景漏边仍在 |
| G-R05 | 待证 | all/any/not等矩阵，原risk可保留 |
| G-R06 | 纠正 | 根级额外字段无已证脚本消费域，不立新D-02业务缺陷 |
| G-R07 | 限定 | 冷/暖caller存在；没有证明该依赖被覆盖 |
| G-R08 | 限定 | 钩子删除集合豁免观察，不替场景删除矩阵 |
| G-R09 | 纠正 | 查错保留对象、缺序列化，补场景闭环 |
| G-R10 | 限定 | hook use locator存在，场景漏边尚无locator |
| G-I01 | 纠正 | 旧probe当前复跑已给选择逆序反例，不能当管线最后选择正确 |
| G-I02 | 待证 | 保留风险，需真实错误时序证据 |
| G-I03 | 待证 | 保留风险，需真实成功/失败时序证据 |
| G-I04 | 待证 | 保留关闭/在途提交合同风险，不擅自产品裁决 |
| G-I05 | 限定 | 重复ID命令拒绝，不等于向导提交互斥 |
| G-I06 | 限定 | 指定同asset key的命令共享对照，不等于向导自动去重 |
| G-I07 | 纠正 | 手动提交B且坏同长度字节也过，不能转正 |
| G-I08 | 纠正 | 取得bitmap后部分失败不close，撤销宽泛covered |
| G-C01 | 待证 | 本fixture无合法FIRE加载，不接收跨工程成功结果证据 |
| G-C02 | 待证 | 未构造不同reader/workspace身份轴 |
| G-C03 | 纠正 | 旧失败开关串入+无效SHA；不是替换成功 |
| G-C04 | 限定 | 一次读取观察；补成功完成见证并与故障例隔离 |
| G-C05 | 纠正 | 故障注入次数实际为0 |
| G-C06 | 待证 | 没有真实修复后的成功基座正控 |
| G-C07 | 待证 | alive源码事实可留；在途动态保证和key正确性未证 |
| G-C08 | 待证 | 按E-03/04风险留存，不借坏G-C03证据报正确 |
| G-C09 | 采纳 | 容器静态census及不声称泄漏的限制 |
| G-C10 | 限定 | 设计建议；身份失效与失败缓存为两个机制，不当第6个已证根因 |

### 修复归属与回归转正决定

1. **D-01现有卡**：保留H01/H02/H07/H12/H13/H15的反例与7处入口census，修正后的正反控可在本卡实现时转正式回归。
   本轮不改正式测试；两席r1设计签字已齐且前提未被本批推翻，不要求重签。
2. **D-02**：原三条场景引用漏边仍是目标，使用上述两场景正式loader→删除→保存/撤销模型。
   hook生命周期正控可作相邻保护；根级额外字段另留输入严格性线索，不据此新建漏边修复卡。
3. **D-03**：pick/submit真实时序、关闭边界与bitmap释放一起在该域核；等关闭产品合同明确再裁缺陷，
   不能把直接AddSpriteCommand消费者测试当作选择流程闭环。
4. **E-03/E-04预览缓存**：可同一修复卡定义身份/修订隔离和失败重试，但分别验收两机制；
   FIRE/Thumb共享同类回归矩阵，不按组件数膨胀卡数。容量/内存泄漏仍待证，不混入功能修复授权。

原A–E审计的独立证据不因本批探针不合格而失效；本批观察也不等于产品已修或覆盖率上升。
整体接收待R1–R4返工；暂不合入候选，未来采纳时披露GLM贡献，不拿贡献者自测代替独立审查。

### 本席复算入口与收尾

- `history.log`/`reference.log`/`upload.log`/`cache.log`：原候选四probe独立复跑，均exit0。
- `reference-oracle.mjs/.log`：正式seed/loader四态场景删除对照与root额外字段观察，exit0。
- `cache-witness.mjs/.log`：只加注入次数/flag和直接下层加载见证，exit0，原错误仍如上。
- `upload-witness.mjs` + `upload-witness-final.log`：同长度坏blob仍被原oracle报covered，exit0；
  第一轮见证脚本因替换锚点非唯一而自行拒绝（`upload-witness.log`），修正唯一锚点后才计证据，未改候选。
- `bitmap-witness.mjs/.log`：实际pickFile的成功/no-context/draw-throws，exit0。
- `original-upload.log`：原上传探针零改复跑，两完成顺序正反对照，exit0；其像素数值只用于代码/字节来源断言，非视觉验收。
- 报告唯一44行/12、23、9机械计数成立；G-H08/G-H11的标签差异由最终日志与表逐ID复算。
- 四新probe定向Biome失败如上，不运行全仓质量门；主/GLM工作树产品和旧probe均零修改。

### 给GLM的返工提示词

```text
在 /Users/zhangxu/illegal/type-pal 返工 GLM pre-e2e-prep r1，候选028ad866，分支codex/glm-pre-e2e-prep，固定基点59e03bdb/产品10c84238。
先读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、docs/testing/glm-pre-e2e-prep.md，以及main上docs/testing/glm-pre-e2e-prep-report.md的Codex R1–R4 counter。
本轮不是修复授权：产品/正式测试/覆盖率基线/原探针不动，不跑浏览器/视觉，不转Kimi、不代签、不标done；D-01原设计签字不重签。
R1恢复scene-target两场景删除矩阵，钩子删除不充场景通过；补transition与保存/撤销，检查正确目标。根级stages/machine先证当前执行语义，否则撤回新漏边。
R2用独立新鲜fixture证明错误确实注入；有效字节和真实SHA、下层成功正控、真实FIRE基座/身份轴；不以读取开始计数替代加载完成，去掉20ms概率等待。
R3执行真实pick/submit时序；验证实际blob哈希/字节，相同长度坏blob必须被oracle抓到；收窄bitmap释放/重复提交/自动去重结论，未证项可如实risk。
R4纠正H03轨迹、H08/H11报告-probe矛盾、historyVersion计序建议及同对象undo语义；静态清单与动态covered分栏，重算44项与根因归并，修定向Biome错误。
独立反证/日志在/tmp/type-pal-glm-prep-review.d2dIGQ，可读取或按文档重建。把main报告的Codex区原样附入你的报告并保留，GLM正文合并纠正；不要合并或拣选整个main文档提交（含白名单外主卡/看板），更不要合入主线产品实现。
完成后整批提交推送，给Codex完整SHA、逐R闭环、44项账、命令/退出码/日志/正控与白名单零diff。可采纳观察保留，无需无意义重做全部；Codex统一复核后决定接收与回归转正。
```

## Codex返工复核：e5dba719（最新，2026-09-13）

结论：**counter，整批暂不合入/转正式回归**。本轮有明确改善，已解决部分保持有效，不要求整批推倒重做；
只处理下述R2/R3剩余证据阻断和R4文字/分类纠正。D-01前提/设计签字仍有效；不改产品、不标done、不转Kimi。

### 冻结与复跑

- main接手bdc5728b，工作树净、origin同步。候选远端、本地跟踪分支、GLM worktree HEAD均为完整e5dba719；
  基点59e03bdb，packages对10c84238零diff。候选仅报告+四探针，原探针、产品/配置/覆盖率零改。
- 四个候选probe由Codex独立复跑均exit0；定向Biome检查4文件exit0、零error/warning。
- 仅统计GLM最新表（不重复统计附录Codex旧表）：44个唯一ID，18 reproduced/15 covered/11 risk的算术成立。
  但其中G-C05/G-C07/G-I03/G-I07语义分类尚不能接受，故不采纳该分布为审核通过结论。
- 候选附录确实逐字保留了bdc5728b的Codex counter全区；本轮不改GLM候选文件。
- 独立证据在`/tmp/type-pal-glm-prep-rereview.nr2T5k/`。Vite无HTTP SSR/AST与必要jsdom宿主，
  不做浏览器/视觉；未跑全仓check/coverage，不改变正式测试或基线。

### R1：通过，恢复值由本席补强复算

- 新reference probe确实使用两个场景及`{kind:'scene',id:'target'}`，不是以hook删除充场景删除。
  disabled/inherit/transition三态漏边、删除成功后保存拒绝，与use正控拒删/保存合法均复现。
- 候选只记录undo返回值，未再次核目标/保存；本席在`witness.mjs reference`追加观察与断言，
  三个反例undo后**主/脚本两侧均恢复target，且再次正式序列化通过**（`witness-reference.log`）。
  因此场景域事实可接收；转正式回归时把这些显式断言纳入，不能写“undo文案即验收”。
- 钩子域已分栏；root stages/machine已撤回“新漏边”并降输入严格性待证，符合前轮要求。
- G-R05组合条件、G-R07暖链未测继续保留risk，不要求本次额外补齐。

### R2：合法fixture已修，重试/在途完成证据仍有阻断

可保留：G-C01合法FIRE基座与A/B直载正控；G-C02同projectId不同source/resolver的对照（不冒称原生工作区切换）；
G-C03同reader真实字节/真实SHA修订；G-C04新鲜成功去重；G-C06真实失败注入、修复后下层成功、上层仍失败。
这些较首轮已实质修复，不重做旧的无效基座/坏SHA批评。

**R2a 剩余阻断：G-C05第二次挂载根本没执行。**

- 候选`probe-glm-cache-prep.mjs:227–231`等待式为
  `reads > before || draws > before || true`，永远立即满足，接着卸载。
- 只读见证`witness-cache.log`：卸载前retryChildren=0、retryHtml为空、reads=2→2、drawDelta=0。
  当前失败注入次数1及下层成功是真实的；但零重读/零绘制来自未渲染，不是上层失败缓存挡住了重试。
- **单点反证**：`witness.mjs cache-fixed`在Vite隔离变换中只添加“失败null后删除thumbCache条目”，
  没改磁盘产品。修掉该失败缓存机制后，原G-C05仍报reproduced；补一个真正等绘制完成的正控则reads=1/draws=1，
  已能恢复。见`witness-cache-fixed.log`，说明原oracle不能区分缺陷存在与已修。

最小修法：先证明目标canvas已经commit、进入视口、loadThumb的回调完成，再判draw/读取。
例如按**该目标canvas的clearRect调用**见证loadThumb的then已执行（正常/失败都会清画布），再看drawImage是否发生；
或执行真实loadThumb并明确await其Promise。不要只等canvas存在（SpriteThumb本身就返回canvas），
不得用恒真谓词或额外固定sleep。保留单点“删除失败缓存”反控，它应改变业务结果。

**R2b 剩余阻断：G-C07没有在途A。**

- 候选`:490–509`只是调用root.render后立即unmount，没有entered/deferred。
  本席同轮见证aReads=0、aChildren=0（`witness-cache.log`），A尚未开始加载，故没有迟到resolve可被alive挡住。
- 应先等A真实请求entered并挂起，再切B/卸载，等B完成后释放A，核B最终的身份/帧信息或状态仍正确；
  可用移除alive守卫的反控证明断言有鉴别力。若本次不执行该矩阵，改risk并撤回“动态covered”，不要重复用B能显示证明A已被保护。

### R3：真实流程已接入，但校验仍未成为断言，且G-I03测错组合

可保留：G-I01两种完成顺序确实走实际pick/submit；G-I05在gzip挂起期间第二submit被门控；
G-I06实际向导同SHA复用；G-I08成功/失败close计数已复现并收窄。G-I02/G-I04保持risk可以接受。

**R3a 剩余阻断：实际shaMatch只是打印，不会挡住坏产物。**

- 候选`probe-glm-upload-prep.mjs:198–238`计算shaMatch、宽度匹配等，未assert；
  G-I07仍硬编码covered，唯一坏字节assert只是另造一份bad的hash不等于catalog。
- 本席`witness.mjs upload`仅在诊断的内存产物上改变gzip头的MTIME字节：长度不变、CRC数据段不变，
  gunzip/解析仍成功、解码宽度/像素也不变，但实际字节不再匹配catalog SHA。
  两序shaMatch均false，badSameLengthDetected仍true，G-I07仍covered，进程exit0（`witness-upload.log`）。
  这只反证probe检查失效，没有调用正式writer，不报告新增产品坏字节落盘漏洞。
- 将真实产物的hash、预期宽/像素或逐字节值接入assert/失败判定；正常完整数据对照通过，
  MTIME这种可解码的同长度篡改也必须被**同一验证入口**拒绝，不只验证另造bad对象的hash不相等。
  删除未调用的`_verifyStored`占位helper（含假的shaOk）和`_expectedPixel`等未用检查，勿用下划线代替真正验证。

**R3b 分类纠正：G-I03原任务是B失败、旧A迟到成功。**

候选`:228–232`重复使用B成功/A成功的G-I01轨迹，不覆盖指定的失败/成功组合。
扩展deferred真实reject并测该组合，或如实将G-I03降risk；不要求为保留18/15/11强行凑已复现。
GI04的模拟没有真正unmount，只能保留“提交开始后完成”的观察，不能升格关闭后正确性保证。

### R4：已改主体标签，仍须纠正三处文字并重算

- H03三个正确布局已纠正，H08/H11报告与probe分类已对齐，返回同一state的H08b正控已补；Biome0/0通过。
- H02新文案仍与数值相反：u2是`[20,wait1]→[20,[]]`（pair脚本半边），
  u3才是20→10（M20），u4是10→0（pair主半边）。不是u2撤M20、u3/u4两半；redo确在4次undo之后。
- H10只记录了价格10→0→0，实际调用的是返回void的App undo；没有采集false返回。
  不得写“第二次undo无可撤/返回false”，内容不变不等于历史为空。按实际canUndo/栈变化记录或删去这句推断。
- H09要区分notify version和historyVersion：markSaved更新通知版本，不递增historyVersion；
  现有“不作为新作者提交顺序”的结论保持。
- 修正G-I03、G-C07及尚未证实项后重算44行；本次不认可18/15/11为最终语义分布。
  “五组根因”仍仅为GLM分组方式；工程排期维持D-01、D-02、D-03、E-03/E-04同卡分别验收，不按组件数膨胀卡数。

### 接收与回归转正决定

1. R1场景矩阵事实、上述已修的合法缓存/真实上传观察可作为后续回归材料，保留GLM贡献。
2. **不原样合入整批或复制成正式测试**：先关闭R2a/R3a两个鉴别力阻断，纠正R2b/R3b/R4分类文字。
   风险项可如实留risk；不要求重做已经复核通过的部分。
3. D-01已有设计不重签，本批不是任何产品实现授权；不代签、不改任务状态、不标done、不转Kimi。
4. 本轮证据：四原probe日志与Biome均exit0；witness的cache/cache-fixed/upload/reference四模式亦exit0，
   其assert用于**证明上述反证观察**，不是产品正确性通过。GLM原工作树保持干净，主线仅更新接收文档。

### 给GLM的剩余返工提示词

```text
在 /Users/zhangxu/illegal/type-pal 继续返工GLM pre-e2e-prep r1，候选e5dba719，分支codex/glm-pre-e2e-prep，基点59e03bdb/产品10c84238不变。
先读AGENTS.md、CLAUDE.md、READ-FIRST、工作包，以及main的docs/testing/glm-pre-e2e-prep-report.md最新“Codex返工复核：e5dba719”。R1及已确认部分保持通过，不重做整批，不重签D-01设计。
R2a修G-C05恒真等待：目标重试尚未render就unmount，不能用零读判缓存阻断。用目标canvas clearRect/真实loadThumb Promise等实际完成信号；隔离删除失败缓存条目的反控必须改变结果。
R2b对G-C07先等A真实entered再切B、完成B后释放A并核最终状态；不做则降risk，撤回动态covered。
R3a把真实产物sha/宽度/像素或字节校验接入assert/失败判定。当前改变gzip MTIME后两序shaMatch=false仍covered/exit0；这种可解码同长度篡改必须由同一校验入口拒绝。删除未用占位校验。
R3b的G-I03要测B失败+A迟到成功；目前复制了两次成功的G-I01，未测则降risk。更正H02实际u2/u3/u4含义、H10臆造false返回、H09两类version区分，并重新核44项分类，不固定原计数。
证据/可重建见证在/tmp/type-pal-glm-prep-rereview.nr2T5k。原counter和本轮Codex区原样保留，GLM正文合并纠正；只取文档，不合并或拣选含主卡/看板的main整提交，不合入产品。
白名单仍仅报告+四probe；不改产品/正式测试/基线/原探针，不跑浏览器/视觉或全仓质量门，不代签、不标done、不转Kimi。定向复跑+Biome0/0后整批推送，交完整SHA、逐项闭环及真实日志给Codex复核。
```

## Codex二轮返工复核：c69947f8（最新，2026-09-13）

结论：**counter，整批暂不接收，不原样转正式回归**。两个关键判定仍未闭环，但不能继续沿用旧的
“重试未渲染”“A读取未发生”“G-I03测了两次成功”的批评：这些具体问题本轮已有实质修正。
剩余返工限定为下面的R2a判定、R3a实际断言，以及R2b/R4收窄和文档对账，不扩大测试清单。

### 冻结、复跑与已通过部分

- main接手f33469eb，工作树干净、与origin同步；远端ls-remote、origin跟踪分支及GLM工作树HEAD均为
  `c69947f8fdb1e0acdc68bd6d2d4623d6ca7d5bc6`。固定基点59e03bdb，packages相对10c84238零diff。
- 整个候选仅报告+四probe；本轮相对e5dba719只改cache/history/upload与报告，reference零diff。
  scripts/projects/data/reference、原审计探针、正式测试/配置/覆盖率均零改。旧版本兼容审查：pass，本轮未引入转换器或兼容产品路径。
- Codex独立复跑四probe均exit0，定向Biome四文件exit0、0 error/0 warning。
  44个唯一ID机械复算确为19 reproduced/15 covered/10 risk；**算术通过不等于语义分类通过**。
- GLM附录的两段Codex审查正文保持；严格字节比较exit1，仅因两节之间少一空行，逐节trim后完全相等。
  不是他席结论被改写，不立实质返工项；后续保留章节分隔即可。
- **R1保持通过**：本轮reference未改，四态场景矩阵复跑与上轮一致；上轮本席补强的双侧目标恢复+正式序列化证据继续有效。
- **R3b通过实际组合核验**：G-I02确为B成功后A迟到失败，错误变为“解码失败A”、草稿仍B；G-I03确为B失败后A迟到成功，草稿复活为A，实际提交宽1/像素100。
  但A成功时B错误仍在（日志`被清空=false`）；submit起始清错不能倒写成A成功清错。该叙述及产物校验声明需按下文纠正。
- **R4主体纠正通过**：H02的u1/u2/u3/u4含义已正确；H10不再臆造App undo返回false，继续保留risk。
- Vite技能用于无HTTP隔离加载与单点反证，canvas为调用计数替身；本轮无浏览器/视觉验收、真实工程/存储写入。
  未跑全仓check/coverage/ratchet，没有新覆盖率成果；GLM贡献者身份保留，未来转正须披露。

### R2a：等待已修，原判定仍无法区分“重试成功”

锚点为候选`probe-glm-cache-prep.mjs:224–242`及`:286–306`。

1. 原树G-C05复跑：故障注入1、下层直载成功，重试children=1、clearRect确实执行、读增量0/绘制增量0。
   因而**失败缓存阻断重试的观察本身本轮已成立**，不再说重试没有挂载。
2. G-C05b隔离修复的正控也真实：读增量1/绘制增量1。但它没有G-C05的下层直载预热，且使用另一份判定式，
   不能据此称“同一oracle鉴别力已闭环”。
3. 本席将相同单点修复——只在`thumbCache.set`后加入null结果删除条目——施加到**原G-C05加载的组件**，
   保留原fixture、下层成功正控、完成等待及分类式。结果：**children=1、读增量0、绘制增量1，G-C05仍报reproduced**。
   见`witness-thumb-fixed.log`；本席断言正是用于钉住该误判，进程exit0不代表产品/探针通过。
4. 原因：`:239`只检查retryReads===0，遗漏实际retryDraws。下层直载已预热成功缓存，修复后完全可以
   **不新增源读取而成功绘制**；零读不是失败。`:303`的G-C05b另判读>=1/绘制>=1，不能替原判定补证明。

最小返工：统一这两组的重试业务判定/输入步骤；用回调完成后的实际绘制区分失败与成功，明确下层暖缓存允许零读。
原实现应判“重试被阻断”，仅删除失败缓存后应判“重试恢复”；正常数据、注入及完成信号是前提，不满足须失败/待证，不能统一落进covered。
不要求改产品，不要求增加第三套场景。

### R3a：回执所说的断言与MTIME验证仍未落盘（阻断）

锚点为候选`probe-glm-upload-prep.mjs:182–215`、`:244–251`；不是只差一个文案。

- `shaMatch`仍只是记录字段，宽度匹配也只记录，`_expectedPixel`仍未使用；真实产物没有相应assert。
  唯一坏字节assert仍是另拷一份bad、改变末字节后核hash不等于catalog。
- `mtimeTamperCaught`在整个probe中只出现在`:215`的输出字符串；没有这个变量或MTIME篡改验证调用。
  G-I03也没有所宣称的“同一sha/宽/像素assert入口”。删除旧占位helper不等于实现了校验。
- 本席原样复用上轮MTIME见证：只在内存实际产物读取后改变gzip头byte4，先核无header CRC，保留长度和可解码数据。
  两序解码仍为宽2/像素200及宽1/像素100，**实际shaMatch均false；G-I07仍covered、进程exit0**。
  其输出甚至同时写“sha断言=false”与“mtimeTamperCaught两序均真”。见`witness-upload.log`。
- 这说明候选仍会漏报坏产物，不证明正式writer允许坏资源落盘；本席没有调用writer或改变产品。

最小返工：真实产物和MTIME反控必须调用同一个实际校验函数，核catalog SHA与预期宽度/像素；
合法产物通过、可解码同长度篡改被该入口拒绝。把该函数实际用于两种完成序及G-I03；回执由最终提交树/实际日志生成。
应能对外部注入到真实产物的MTIME篡改exit1，不能只让另造bad对象的hash比较变真。

### R2b与R4：限定观察，不再补做无关矩阵

- **G-C07的A确实entered并挂起**，此项修正认可；但先卸载A的React root，再创建B的另一root，
  不等于同一组件A→B时的旧请求归属回归。源读取计数2也不是loadFrames.then完成信号。
  本席给实际then加只读完成见证并await，再分别保留/只移除`if (alive)`：两树均报G-C07 covered，
  B仍canvas。见`witness-fire-control.log`与`witness-fire-no-alive.log`。
  所以撤回“已动态证明alive丢弃”因果结论；可保留“不同root卸载/新挂载未串状态”的限定观察，
  将完整G-C07（同实例切换及迟到reject）留risk，后续缓存卡转正。**本次不要求再新增该矩阵**。
- G-I03只证明旧A复活；其B错误在A成功后未清空，不能写“旧成功复活+错误覆盖双证实”。G-I02才是迟到失败覆盖错误的实证。
- H09的markSaved/version区分已纠正，但“hydrate两者都不增”仍不对：
  `edit-session.ts:542/566/571`会notify，`:815`递增通知version；historyVersion不增。保留“不以普通通知计作者操作”的设计结论。
- 总表G-I02已reproduced，根因/待证段仍把它列risk（枚举11项，表中10项），须同步清理。
  G-C06失败null缓存与chunk身份键是不同机制，根因段不要仅因同属FIRE就混为一个键缺陷。
- “保存拒绝+undo文案即验收”须改为双方目标/内容实际恢复、再正式序列化通过，沿用本席上轮证据，
  不要求重新走UI。日志目录改到本轮真实`*-rere-final.log`，标题R2a/R2a重复等随文档一并纠正。
- 44项账待上述校验及分类纠正后再算，不强保19/15/10，不把risk当作新增产品缺陷。

### 接收与回归转正决定、复算入口

- 继续接收已核实的**观察材料**：R1、撤销轨迹、合法缓存基座、G-C05失败事实与修复后可绘制的正控、G-I02/03真实错序。
  修复归属仍为D-01、D-02、D-03、E-03/E-04同组分别验收，不另增卡数。
- 整批暂不合入/原样转正；只关闭上述剩余判定及叙述问题。D-01 r1设计不重签；不把本轮取证返工写成D-01产品返工或修复授权。
- 本席证据目录`/tmp/type-pal-glm-prep-round2.vTUvvG/`：四probe日志、biome.log、report-census.log；
  `cache-witness.mjs`在只读源码上以Vite load钩子替换，命令为
  `node --import tsx /tmp/type-pal-glm-prep-round2.vTUvvG/cache-witness.mjs thumb-fixed|fire-control|fire-no-alive`
  （末项逐个传入），三次均exit0、断言上述判定失效事实。
- 上传复算原入口`node --import tsx /tmp/type-pal-glm-prep-rereview.nr2T5k/witness.mjs upload`，
  本轮输出另存`witness-upload.log`。实际业务改动仅gzip无header CRC时的MTIME byte4异或1；
  root/依赖改绝对URL仅为临时data-URL导入适配，不改任何候选磁盘文件。
- 主线只更新本席接收文档；文档工具20项通过，docs检查415 Markdown/1,987本地链接/142任务、content20 SAVE8、0 issues，diff whitespace检查通过。
  不代签、不改产品任务Status、不标done、不转Kimi。

### 给GLM的定点返工提示词

```text
在 /Users/zhangxu/illegal/type-pal 返工GLM pre-e2e-prep r1，分支codex/glm-pre-e2e-prep，候选c69947f8，固定基点59e03bdb/产品10c84238。
先读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、工作包docs/testing/glm-pre-e2e-prep.md，以及main报告docs/testing/glm-pre-e2e-prep-report.md最新“Codex二轮返工复核：c69947f8”。本批counter；R1、真实完成等待、G-I02/03指定时序及已通过部分不重做，D-01设计不重签。
R2a只修判定：原G-C05下层已预热；隔离删除失败缓存后读0/绘制1仍报reproduced。把原树/单点修复树送入同一场景和判定，实际绘制恢复必须改变结论，允许下层成功缓存零源读取；前提失败不得当covered。G-C05b另一套读>=1判定不能代证。
R3a实际落盘：shaMatch/宽度仍只记录，_expectedPixel未用，mtimeTamperCaught仅字符串。真实两序产物与G-I03须调用同一sha/宽度/像素assert入口；合法正控通过，gzip MTIME同长度可解码篡改由该入口拒绝，外部注入实际产物时exit1。报告按提交树/运行结果生成，不能只改输出文字。
G-C07保留已证entered/不同root观察，撤回alive因果保证，完整同实例切换/reject矩阵列risk留后续，不要求新增矩阵。更正G-I03未清B错误、hydrate通知version会增、G-I02残留risk枚举、失败缓存与身份键根因分栏、undo需核内容/序列化而非文案，重算44项并核日志路径。
证据在/tmp/type-pal-glm-prep-round2.vTUvvG，上传见证入口仍为/tmp/type-pal-glm-prep-rereview.nr2T5k/witness.mjs upload；可直接复跑/独立重建。保留main全部Codex复核正文，只取报告区，不合入主线产品或白名单外文档提交。
白名单仍仅报告+四probe；不改产品/正式测试/配置/基线/原探针，不跑浏览器/视觉/全仓check/coverage，不代签、不标done、不转Kimi。定向四probe+Biome后推送完整SHA、真实反控输出与逐项回执；交Codex复核，GLM贡献继续披露。
```

## Codex三轮定点复核：6deb390c（最新，2026-09-13）

**R3a通过、R2a主要鉴别力通过、R2b收窄通过；原样接收仍counter，仅剩一个前提守卫和报告收尾。**
不再要求重做已经成立的缓存重试/上传篡改证明。取证事实可以采用，探针尚不能原样当作正式正确性回归；
本轮不合入候选、不改产品、不代签、不标done、不转Kimi，D-01设计不重签。

### 冻结及复跑

- main接手3b76f524，工作树净、与origin同步；候选远端、跟踪分支及GLM worktree HEAD均为
  `6deb390ccd1f4f998e05a62c4d0725f542a27016`。基点59e03bdb/产品10c84238，packages零diff。
  整个候选只有报告+四probe，本轮仅cache/upload+报告；history/reference及白名单外均零diff。
- 四个probe独立复跑exit0，定向Biome四文件0 error/0 warning。未跑全仓check/coverage，不宣称覆盖率增加。
  Vite技能用于无HTTP隔离加载/单点反证，canvas仅调用计数；无视觉验收或真实工程/浏览器存储写入。
  旧版本兼容审查：pass，本轮无产品/转换器/版本路径修改。GLM为取证/测试贡献者，后续转正须披露。
- 本席证据目录：`/tmp/type-pal-glm-prep-round3.AZZ62X/`。旧见证失败的类型均核过，不拿任意exit1充修复证明。

### 已闭环项

1. **R2a主要鉴别力**：G-C05/G-C05b确实复用`runRetryCase`，包含相同的下层直载步骤；两处分类式逐字相同，
   使用retryDraws。原树注入1/下层成功/children1/绘制0，反控绘制1，分类相反。
   本席旧`cache-witness.mjs thumb-fixed`单点修复原G-C05后，实测**零读/绘制1/covered**；
   旧断言要求reproduced，因此exit1（`old-thumb-fixed.log`）。这是原误判消除，不是等待或加载失败。
   GLM的隔离组件另带自己的下层模块缓存，故其G-C05b本轮读增量1；本席原模块反控才直接证明暖缓存零读亦可恢复，不混淆两组读数。
2. **R3a全部核心断言**：`verifyArtifact`真实用于两序与G-I03，实际SHA/宽/像素均assert。
   原MTIME见证现在直接在`ab: 存储字节 sha…≠catalog…`处exit1（`old-upload.log`），实际gunzip/解析已通过，排除环境失败。
   本席再单独移除SHA assert，内置MTIME反控在“篡改未被同一校验入口拒绝”处exit1；
   单独改宽度/像素期望为99，各自在对应assert exit1（`upload-no-sha-guard.log`、`upload-width.log`、`upload-pixel.log`）。
   因此不再重开上轮“只有输出文字/占位helper”的counter。
3. **R2b/R4收窄**：G-C07已降risk、撤alive因果保证；G-I03明确A成功后B错误仍在、错误覆盖实证归G-I02；
   H09补了hydrate通知version；undo验收改为内容/目标恢复+正式序列化。这些通过，不要求再补同实例矩阵。

### 唯一剩余代码项：前提失败仍被当covered

候选`probe-glm-cache-prep.mjs`的G-C05/G-C05b两处仍为
`injections===1 && !drewDuringFail && lowerOk && children>0 && retryDraws===0 ? reproduced : covered`。
这修好了绘制判定，但前提任一不成立也会进入covered，仍未满足上轮明确的“前提失败不得当covered”。

- 本席`witness.mjs cache-no-injection`只删除原G-C05的`box.arm(path) // 注入一次性失败`，不改产品或分类式。
  实测**注入0、首挂载已绘制、G-C05仍covered、进程exit0**（`cache-no-injection.log`）。
  该见证assert用于证明前提失效仍误放行；不是新产品缺陷，也不推翻正常fixture下已确认的观察。
- 最小修法：在唯一`runRetryCase`内先assert注入恰1、首挂载未绘制、下层成功、重试canvas已提交且回调完成，
  再返回绘制结果；或前提不成立显式risk/失败。两树共用，不再把前提混进“失败/成功”的二选一。
  原树/修复树正常对照保持；移除注入时必须因前提拒绝，不允许covered。**无需新增业务场景或改产品。**

### 机械收尾与接收决定

- 仅统计GLM最新44行：**19 reproduced / 14 covered / 11 risk**。表内四组和risk枚举均支持此数；
  标题/总计18/14/12错误（上轮19/15/10只将G-C07降risk，应是19/14/11）。见`report-census.log`，不为凑数改已证分类。
- 候选把“Codex二轮返工复核：c69947f8”全文附了两次；本席逐份核实均与main正文相同，非他席结论改写。
  只留一份、原文不动。日志入口仍指旧`*-rework-final.log`，应指本轮`*-r3-final.log`。
- 根因段仍把G-C06失败null缓存放入“FIRE缓存键根因”；将G-C06与G-C05放在失败重试机制下，
  G-C01/02为身份键机制，G-C08保留待证；不因同组件而混机制，不要求新开卡。
- **不再重开R1/R3a/R2b或扩张返工范围**。关闭这一个前提守卫并对账后即可接收取证包；
  正式回归仍按D-01/D-02/D-03/E-03/E-04实施时转正，不把诊断exit0当产品修好。
- 所有反证可从本席目录`witness.mjs`的上述四个模式重建；旧入口仍在前两轮目录。
  主线只更新本席报告/工作包/看板/审计进度，不改变产品任务Status。
  文档工具20项通过；docs为415 Markdown/1,987本地链接/142任务、content20 SAVE8、0 issues；diff whitespace检查通过。

### 给GLM的最后定点收尾提示词

```text
在 /Users/zhangxu/illegal/type-pal 收尾 GLM pre-e2e-prep r1，分支codex/glm-pre-e2e-prep，候选6deb390c，基点59e03bdb/产品10c84238不变。
先读AGENTS.md、CLAUDE.md、READ-FIRST、工作包及main的docs/testing/glm-pre-e2e-prep-report.md最新“Codex三轮定点复核：6deb390c”。R3a、R2a主要鉴别力、R2b收窄已通过，不重做、不重签D-01。
只剩代码项：在统一runRetryCase先assert注入1/首挂载未绘制/下层成功/重试真实完成，再分类绘制是否恢复；前提失败不得covered。Codex witness cache-no-injection只移除原G-C05的box.arm后仍covered/exit0，修后须因前提拒绝；原树/单点修复树正常对照保持。
报告按44行改正为19 reproduced/14 covered/11 risk；c699 Codex复核重复块只留一份且不改原文；日志更新*-r3-final或实际新日志；G-C06归失败缓存机制而非身份键。证据在/tmp/type-pal-glm-prep-round3.AZZ62X/。
白名单仍仅报告+四probe；保留Codex复核，只取报告不合入主线其他提交。不改产品/正式测试/基线/原探针，不跑视觉或全仓质量门，不代签、不标done、不转Kimi。定向四probe+Biome后推送完整SHA与真实回执，交Codex接收。
```
