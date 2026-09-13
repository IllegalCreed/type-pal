# GLM 并行审计准备：整批回执

工作包：[r1范围与44项检查表](glm-pre-e2e-prep.md)。执行者GLM，接收复核Codex。
当前：GLM已交付候选028ad8667c0011160eaaed050071c17b75a62da7，Codex独立复核结论为 **counter，四组返工**。
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
