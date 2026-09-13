# GLM 并行审计准备：整批回执（r1 rework）

工作包：[r1范围与44项检查表](glm-pre-e2e-prep.md)。执行者GLM，接收复核Codex。
D-01设计签字已按节点一另交 main（623c592f，premise verified + design agree，无 counter），本轮不重签。
**本报告为卡前只读取证，不是修复授权；分类不是修复状态，不把44项检查表报为44个缺陷。**
本轮为 R1–R4 返工版：候选 028ad866 被 counter 后，四个探针重写/修正、44 项账按最终实际证据重算；
main 上 Codex 的接收复核原文完整附于文末（原样保留，GLM 不改写其裁定表）。

## 冻结树与实际范围

- 分支/基点：`codex/glm-pre-e2e-prep`，worktree `/Users/zhangxu/illegal/type-pal-glm-prep`，基点 **59e03bdb**；最终 SHA 见交付行。
- packages 相对 10c84238 **零 diff**；本分支自身提交只含 5 个白名单文件（本报告 + 四个 `probe-glm-*-prep.mjs`）。
  基点间唯一非文档变化是主线自身的 `scripts/coverage/baseline.fast.json`（leave-guard 官方 ratchet 生成，非本分支改动）。
- 原探针/正式测试/配置/覆盖率基线零改动；真实工程/浏览器零写；未跑全仓质量门；无浏览器/截图/视觉。
- 四探针定向 Biome：**0 error / 0 warning**（返工要求达成；过程见失败记录）。

## 复算入口与命令回执

```bash
node --import tsx docs/ops/audits/pre-e2e/probe-glm-history-prep.mjs    # exit 0
node --import tsx docs/ops/audits/pre-e2e/probe-glm-reference-prep.mjs  # exit 0
node --import tsx docs/ops/audits/pre-e2e/probe-glm-upload-prep.mjs     # exit 0
node --import tsx docs/ops/audits/pre-e2e/probe-glm-cache-prep.mjs      # exit 0
pnpm exec biome check docs/ops/audits/pre-e2e/probe-glm-*.mjs           # 0 error / 0 warning
```

日志：`/tmp/glm-prep-evidence/*-rework-final.log`。本轮过程失败（全部已修复、未改产品、未删证据）：
upload 探针 deferred 不支持 reject（G-I02 降为 risk 并注明窗口）；cache 探针 ArrayBuffer `.length`→
`byteLength`、fireBase 缺 color-table 角色（loadFrames 同基座读标准色，补齐合法 palette JSON 后成功）、
G-C06 注入计数含挂载期共 2 次（条件如实改 2）、waitFor 谓词曾被空文本提前命中（改为 canvas/失败文案
二选一的完成信号）；history 探针一次模板串缺右括号；G-I05 的 gzip 门一次写成 `await gateGzip`；
biome 未用变量经下划线/精简解构清零（含两次误删后复原）。

## 44项唯一ID总表（reproduced 18 / covered 15 / risk 11 / blocked 0 / N/A 0 = 44）

静/动分栏：〔动〕=本批探针动态执行；〔静〕=源码/清单/具名测试锚点，无本批动态。G-H08b、G-R09-hook 为
子见证行不计入 44。

### G-H 撤销与事务（reproduced 8 / covered 5 / risk 3）

| ID | 分栏 | 分类 | 证据 |
|---|---|---|---|
| G-H01 | 动 | reproduced | 真实 App undo/redo 回调：M/S/M 与 S/M/S 双向交错错序（u2 选错栈），D-01 |
| G-H02 | 动 | reproduced | P/M/S 拆半（u3/u4 各撤半笔、redo 在 4 次 undo 之后只恢复半笔）；实际操作序已按 counter 纠正写入 |
| G-H03 | 动 | reproduced | 四布局轨迹：P-mid/P-last/P-P 按操作逆序正确（对照）；错误集中于 P-first——按实际轨迹分类，撤回“无布局全对” |
| G-H04 | 静 | covered | `historyCoordinator.dispatch` 全 src 恰 7 处 census（ItemTab.tsx:1024/1152、App.tsx:1785/1807/1812/1893/2057）；静态清单，不叫动态验收 |
| G-H05 | 静 | risk | 场景族 caller=App.tsx:1785-1817/1893-1904（:1893 为实体删除已注明）；缺具名回归引用，待证 |
| G-H06 | 静 | covered | 实体增删入口清单（App.tsx:2057/:1893 族）；静态 census |
| G-H07 | 动 | reproduced | 脚本侧新提交后 main 单栈孤儿 redo=true；转正时须钉实际全局 App redo |
| G-H08 | 动 | reproduced | 【按现场改判，与首轮报告相反】等值新引用 dispatch 清 redo（next===previous 引用比较挡不住）；单列不扩 D-01；apply 失败对照不清 redo ✔；返回同一 state 的 no-op 另见 G-H08b=covered |
| G-H09 | 静 | covered | historyVersion 仅作变化/失效信号（undo/markSaved 通知同样改版本，不能冒充新作者提交——按 counter 纠正表述，与已签设计 3 一致）；hydrate 不增版本（edit-session.ts:509 起）、discardRedo 增版本属保守方向 |
| G-H10 | 动 | risk | 同对象两次 dispatch 轨迹 10→0→0（第二次 undo 无可撤，非两次完整撤销语义）；复用 caller 域未 census、合同未声明——待证，不扩张支持承诺 |
| G-H11 | 动 | covered | 【标签修正与报告一致】第二参与者失败 receipt 回滚（双 dirty=false、内容复原）；不外推元数据全保全 |
| G-H12 | 动 | reproduced | script 侧 undo 先 pop 后 invert，invert 失败项永久脱离双栈；main 侧先 invert 安全（不对称）；redo 失败独立回归待 D-01 |
| G-H13 | 动 | reproduced | pair 提交期间脚本侧订阅可见半状态 |
| G-H14 | 静 | risk | Root 仅 onOpened 成组新建双 session（main.tsx:122-147/158-176）静态事实；不替代 coordinator 绑定/重挂载生命周期验证（撤回引用 leave-guard 卸载测试充数的写法） |
| G-H15 | 动 | reproduced | 缺正文静默丢（序列化 ok）+空正文[]正控+齐备正控；未引用 canonical 记录分支未测（按裁定限定） |
| G-H16 | 静 | covered | 最小负控靶点 5 项（对应 D-01 H-11）；既有保护具名：editor-history-coordinator.test.ts（4 项简单配对）、project-leave-guard.test.ts:78/159（保守/discardRedo/hydrate）——不再引用整文件总数 |

### G-R 场景引用删除（reproduced 3 / covered 4 / risk 3）

| ID | 分栏 | 分类 | 证据 |
|---|---|---|---|
| G-R01 | 动 | reproduced | 【返工核心】两场景 scene-target 矩阵：disabled 选择仍指向目标场景，blockers=0、成对删除成功、保存拒“场景 target 不在 scenes”、undo 恢复——D-02 漏边仍在（撤回首轮用钩子删除充数的 covered） |
| G-R02 | 动 | reproduced | inherit 同上：误删+保存拒绝+undo 恢复 |
| G-R03 | 动 | covered | 〔钩子域分栏〕use hook-c 命令边 blockers=1（select-hook@…hook-b.flow…）；不充父场景证明 |
| G-R04 | 动 | reproduced | transition currentScene 条件：blockers=0、删除成功、保存拒绝、undo 恢复——状态机条件引用的目标场景漏边仍在 |
| G-R05 | 静 | risk | all/any/not 嵌套矩阵未逐一动态核；保留 risk |
| G-R06 | 静 | risk | 【撤回“新引用漏边”主张】根级 stages/machine 字段 loader 接受（观察复现）但 BaseSceneDef 未定义脚本根、无已证消费域——降为输入严格性待证，不立 D-02 新缺陷；中间 fixture 未保留之批评接受 |
| G-R07 | 静 | risk | 冷/暖 caller 存在（App.tsx:1707-1716、:1736-1738/1841-1869）；本批动态核的是冷链 oracle，UI 实际消费覆盖未采集 |
| G-R08 | 动 | covered | 〔钩子域〕单删 blockers=1、与来源场景同删 blockers=0（集合内部豁免机制可复用于场景修复） |
| G-R09 | 动 | covered | 场景域闭环：use 有边时删除拒+保存合法（正控）；disabled/inherit/transition 反例的“删除后保存拒绝+undo 恢复”闭环在 G-R01/02/04 行；〔钩子域子行〕命令级守卫 throw+清引用可删+undo 恢复 |
| G-R10 | 动 | covered | 〔钩子域〕use 边 locator 稳定可复算；场景漏边尚无 locator 可列（分栏明示） |

### G-I 图片上传异步边界（reproduced 3 / covered 3 / risk 2）

| ID | 分栏 | 分类 | 证据 |
|---|---|---|---|
| G-I01 | 动 | reproduced | 【返工核心】AST 抽取真实 pickFile/submit：用户选择序恒 A后选B——完成序 B→A 时提交宽=1（wrongImageImported=true，A 复活覆盖 B）；完成序 A→B 提交宽=2（正确）。最后完成者胜，非最后选择者胜 |
| G-I02 | 静 | risk | deferred 宿主仅 resolve，迟到失败覆盖未动态执行；保留 risk（:147/171-173 时序窗口），未臆定关闭语义 |
| G-I03 | 动 | reproduced | B 先成功 A 迟到成功 → 提交 A（宽1/像素100），B 被静默丢弃；实际存储字节 gunzip→解析→真实 sha 双向核验；同长度坏字节自检=true（oracle 必须抓到，已 assert） |
| G-I04 | 静 | risk | 真实时序事实：submit 越过门禁后 gzip 完成即入历史（取消关闭≠取消提交）；是否缺陷属产品裁决，未擅自关闭 |
| G-I05 | 动 | covered | 〔向导级〕首笔在 compressGzip 挂起时二次 submit：sprites=1、onDone=1（submittingRef 早退）；命令级重复 ID 拒绝（commands.ts:3398）分栏 |
| G-I06 | 动 | covered | 〔向导级〕同字节两次真实 submit：sprites=2、资源路径数=1（:202-205 按 SHA 复用 asset 键）；id/label 派生与字节归属分列 |
| G-I07 | 动 | covered | 提交产物归属=最后完成者：存储字节哈希=catalog.sha256、宽度/像素来自实际解码；坏同长度字节必被抓到。“最后选择获胜”不成立（见 G-I01/03） |
| G-I08 | 动 | reproduced | 【收窄改判】真实 pickFile 三态：成功 close=1；getContext 失败 close=0、drawImage 抛错 close=0（错误均可见）——取得句柄后非成功路径不 close（:150-156）；只证句柄未显式释放，不宣称浏览器泄漏/内存峰值 |

### G-C 预览缓存身份与重试（reproduced 4 / covered 3 / risk 3）

| ID | 分栏 | 分类 | 证据 |
|---|---|---|---|
| G-C01 | 动 | reproduced | 【返工核心】真实 AssetBase/AssetResolver+合法 effect-sprite 内容：直载正控 A=1帧/B=3帧；A 挂载 canvas 成功；换 B 工程挂载 B 读取增量=0 且仍渲染 canvas——chunk-only 键复用 A 缓存（FireEffectPreview.tsx:15-18） |
| G-C02 | 动 | reproduced | 身份轴：同 projectId 不同内容基座 B 读取增量=0——键不含 reader/workspace/内容身份（与 G-C01 同根） |
| G-C03 | 动 | covered | 同 reader（对象不变）：记录换真实新字节+真实 SHA（92c380→b00f47）：v1 读=1 v2 读=1、下层直载 frames=1——双层失效正确；撤回旧 fixture 的无效 SHA/换 reader 做法 |
| G-C04 | 动 | covered | 独立新鲜 asset 双挂载：均完成绘制、读取=1（去重生效；无预热） |
| G-C05 | 动 | reproduced | 新鲜 asset 注入=1（真实抛错、首挂载未绘制）；修复后下层直载成功（frames=1）；再挂载新增读取=0、绘制=0——thumb 层失败 null 缓存吞重试（:36-38），下层不缓存失败（assets.ts:236-239） |
| G-C06 | 动 | reproduced | 新鲜 chunk9：注入=2（直载预检+挂载各一次真实抛错）、挂载“无法加载”；修复后直载成功但重挂载仍“无法加载”且读取增量=0——失败 null 永久缓存 |
| G-C07 | 动 | covered | A 挂载即卸载后挂 B：B 独立完成渲染（canvas）；迟到 A resolve 被 alive=false 丢弃（:66-75）；同 chunk 在途共享 Promise 属缓存语义；“key 正确性”仅 chunk 维度（身份缺陷归 G-C01，不再自相矛盾） |
| G-C08 | 静 | risk | FIRE 键无 revision/内容维度——与 G-C01 同根（E-03/04）；Thumb 换 revision 已由 G-C03 同 reader 实证 |
| G-C09 | 静 | risk | 容器 census（强引用 Map vs WeakMap）；无实测不宣布泄漏 |
| G-C10 | 静 | risk | 身份失效与失败缓存为两个机制，分别验收；不作为第 6 个已证根因 |

## 归并、待证与建议回归

已确认根因组（5，不膨胀）：①D-01（G-H01/02/03/07/12/13/15 + G-H08 等值新引用单列观察）；
②D-02 场景引用漏边（G-R01/02/04——本轮已按两场景模型实证）；③FIRE 缓存键根因（G-C01/02/06/08）；
④Thumb 失败缓存（G-C05）；⑤上传向导过期令牌缺失（G-I01/03 及同根 G-I02 risk）。
待证 risk（G-H05/10/14、G-R05/06/07、G-I02/04、G-C08/09/10）不列为已证根因。

建议转正式回归最小集合（Codex 决定）：D-01 收 G-H16 五靶点+G-H01/02/07/12/13/15 场景；D-02 收两场景
四态删除矩阵（保存拒绝+undo 文案即验收）；缓存卡收 G-C01/05/06（跨基座零读+失败重试）双机制分别验收；
上传卡收 G-I01/03 真实时序+坏字节 oracle；G-I08 的 close 路径并入 D-03 域核。

## 最终机械对账

- 分类计数：reproduced 18 + covered 15 + risk 11 + blocked 0 + N/A 0 = **44**（G-H08b/G-R09-hook 子见证不计）。
- 命令/退出码：四探针 exit0、biome 0/0；过程失败清单见上；未删失败证据。
- 白名单：仅本报告 + 四探针；packages/scripts/projects/data/reference/锁文件/正式配置与测试/基线/原探针零 diff（提交时 git 复核）。
- 采纳观察保留：原“可采纳”的撤销反例与 7 处配对 census 未无意义重做；本轮新增/重写的动态矩阵以 counter 要求为准。
- GLM 为测试贡献者；采纳须披露，不以自测代独立终审。

---

（以下为 main 上 Codex 接收复核原文，GLM 原样附入保留，不作改写；其裁定表与本报告返工后分类的差异
以本报告“44项唯一ID总表”为 GLM 立场，最终接收由 Codex 复核。）

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
