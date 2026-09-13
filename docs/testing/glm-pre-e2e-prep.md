# GLM 并行工作包：撤销与后续编辑器审计准备

Revision：r1，2026-09-13。分配者/接收复核：Codex；执行：GLM。
产品冻结：10c84238（本包创建时9fd32674之后只做文档收口/开卡，packages相同）。
取证分支固定起点：59e03bdb（已包含本包r1与D-01设计卡；不要从随后前进的活跃产品树取证）。
关联主线：[D-01任务卡](../ops/tasks/EDITOR-HISTORY-ORDER-1-global-undo-transactions.md)。
产出：[整批报告](glm-pre-e2e-prep-report.md)。用户明确要求“多给一些glm能并行处理的工作”。

## 分工与两个交付节点

这是四组共44项**只读取证/测试设计**，不是44个bug、不是44条必须新增的测试，也不是一批产品修复授权。
用户已允许审计/对账直接做；本包只支持卡前取证，不能用它绕过任何修复卡的设计门。

1. **先回D-01签字**：同步main、读主线r1，独立核前提/设计与G-H矩阵。将自己的premise verified/design agree
   或counter+证据写入D-01卡自己的块与日志，提交推送main。不读Kimi结论，不改共享准入/状态。
   这一步先交回，让Codex在两席齐后可以做主线；不要等整个44项批次结束。
2. **继续其余批次**：从固定59e03bdb建立独立worktree分支 `codex/glm-pre-e2e-prep`，核packages对10c84238零diff，
   记录完整SHA。若已有同名分支先核归属，不能reset/覆写或恢复旧stash。第一步main上的签字不必合入取证分支。
   即使main产品随后前进也不更换取证树；记录证据，不自行合并Codex实现。
   G-H结果归入总表，然后连续完成G-R/G-I/G-C，最后整批交Codex；独立组阻断不妨碍继续下一组。

Codex同时负责D-01方案/实现/集成、原生功能与视觉、全仓check/ratchet/严格fast。GLM不操作浏览器、不看截图、
不做像素/布局/音画判断。**不新增正式测试到packages，不修改产品**；未来转正式回归/修复由Codex决定。

## 必读与源码锚点

- `AGENTS.md`、`CLAUDE.md`、`docs/phase2/READ-FIRST.md`、D-01卡、
  [审计总表](../ops/audits/pre-e2e/summary.md)、[D批](../ops/audits/pre-e2e/editor-workflows.md)、
  [E批](../ops/audits/pre-e2e/engineering.md)。历史报告是待重新核的线索，不自动等于当前事实。
- G-H：`core/edit-session.ts`、`script-editor.ts`、`editor-history-coordinator.ts`、`script-editor-projection.ts`，
  `ui/App.tsx`、`ItemTab.tsx`，既有coordinator/commands/script-editor/App回归；先读真实caller再构造。
- G-R：`core/project-reference-adapters.ts`、`project-reference.ts`、`script-editor.ts`；
  `packages/content/src/command-target-reference.ts`；场景生命周期实际命令与App删除入口。
- G-I：`ui/SpriteUploadWizard.tsx`、`core/sprite-assets.ts`、`editor-asset-reader.ts`、上传/量化/编码/Command实际调用链。
- G-C：`ui/FireEffectPreview.tsx`、`SpriteThumb.tsx`、`StampPreviewCanvas.tsx`、
  `core/sprite-assets.ts`、`editor-asset-reader.ts` 与reforge资产加载/AssetResolver（按真实import定位，勿凭文件名臆造）。
- 已有诊断：`docs/ops/audits/pre-e2e/probe-editor-history.mjs`、`probe-editor-reference-delete.mjs`、
  `probe-editor-sprite-upload.mjs`、`probe-preview-cache.mjs`，只读，不能改原探针来证明原结论。

### 已知环境陷阱

- 原history探针的内存source把缺 `.type-pal/save-state.json` 抛通用assertion；当前loader要求NotFoundError。
  Codex已复核：只适配该边界与临时导入路径后，三个原历史反例仍成立。GLM须独立核调用/断言，
  不把原探针环境崩溃、缺module/资产或测试收集失败写成产品缺陷/修复证据。
- 诊断只调用真实产品函数；可用AST抽取当前函数或Vite无HTTP SSR加载，不手抄业务算法。
  环境适配与业务突变必须分开记录。不能在冻结源码上加入测试专用产品开关。
- 引用输入必须先经过当前正式loader/校验正控；一份本来就坏的工程不能用来证明删除守卫缺陷。
- 原版/一阶段不是二阶段架构模板；本包不修改战斗公式、版权资源或迁移策略。

## 44项检查清单

G-H为D-01设计阶段输入，不直接约定新实现的私有API；其他组是未来修复卡的前提材料。

### G-H：撤销与事务（16项）

| ID | 检查点 |
|---|---|
| G-H01 | 普通main→script→main与反向交错的当前结果/期望顺序 |
| G-H02 | pair→main→script连续undo的拆半反例与紧接redo恢复边界 |
| G-H03 | pair在开头/中间/末尾、连续两个pair的全局undo/redo矩阵 |
| G-H04 | 私有脚本增删的所有真实配对入口与当前一条use脚本模型 |
| G-H05 | 场景创建/复制/删除的配对caller与共享依赖 |
| G-H06 | 实体增删及剩余配对caller完整census，避免只列示例 |
| G-H07 | 任一侧新作者分支清另一侧redo的现状、孤儿风险 |
| G-H08 | 明确返回原state的no-op与失败dispatch是否破坏redo；语义相等但新引用单列，不扩大治理 |
| G-H09 | markSaved/hydrate/引用通知与作者提交的区别，哪些版本可以/不可以用于全局计序 |
| G-H10 | 同Command对象重复dispatch的现行合同与真实caller，不凭对象身份假设事务唯一性 |
| G-H11 | 第一参与者/第二参与者apply失败时状态、历史、dirty与元数据 |
| G-H12 | invert失败、redo失败的先pop/后apply次序与补偿边界 |
| G-H13 | 事务中同步订阅能否看见半状态；通知失败与提交失败不得混称 |
| G-H14 | Root/StrictMode/重挂载/单会话消费者与已有非空历史的实际可达域 |
| G-H15 | 保存有引用缺正文、空正文[]、被移除/未引用canonical记录的正反控制 |
| G-H16 | 现有history/derived-store/leave-guard回归如何保护上述边界，列最小新负控制靶点 |

### G-R：场景引用删除（10项）

| ID | 检查点 |
|---|---|
| G-R01 | selectSceneHooks disabled的typed语义、adapter边与合法输入正控 |
| G-R02 | selectSceneHooks inherit同上，不能靠use hook边偶然兜住 |
| G-R03 | selectSceneHooks use已正确覆盖的对照，确认父场景/具体hook语义 |
| G-R04 | stateMachine next/branch currentScene条件是否进同一引用图 |
| G-R05 | all/any/not与嵌套loop/branch内同类条件的覆盖来源，不另造第二walker |
| G-R06 | 其他场景目标命令/条件逐kind对账：typed collector与editor adapter相同/遗漏/不适用 |
| G-R07 | 冷引用图、暖缓存/失效后重算、删除按钮当前判断的真实调用链 |
| G-R08 | 删除单对象与同一删除集合内部引用的策略，避免全部引用一律阻断 |
| G-R09 | 拒删/可删→撤销→序列化的业务断言；缺错误不能当删除成功 |
| G-R10 | 稳定来源定位与去掉引用后允许删除的反向控制；不做实际界面视觉 |

### G-I：图片上传异步边界（8项）

| ID | 检查点 |
|---|---|
| G-I01 | A后选B，完成A→B/B→A两序的实际草稿归属 |
| G-I02 | 旧A失败晚于B成功，错误是否覆盖当前B结果 |
| G-I03 | 旧A成功晚于B失败，是否错误复活旧图 |
| G-I04 | 关闭向导/卸载后的成功与失败回调边界 |
| G-I05 | 连续选择、解码中提交/重复提交的门禁与成功正控 |
| G-I06 | 文件内容/尺寸与ID/名称各自归属；保留作者命名规则不要误报 |
| G-I07 | 真Command/编码/资产记录是否来自最后选择；优先核字节/SHA/尺寸，不做视觉判图 |
| G-I08 | Bitmap/临时资源释放与错误后再次选择是否可用；已证行为、风险、未证分开 |

### G-C：预览缓存身份与重试（10项）

| ID | 检查点 |
|---|---|
| G-C01 | FIRE同chunk不同工程的来源读取次数/AssetId/SHA/Promise身份，不凭画面颜色判定 |
| G-C02 | 同projectId的不同workspace/reader是否错误共用预览 |
| G-C03 | 当前工程同AssetId但revision/SHA变化的失效规则 |
| G-C04 | 同reader同revision成功请求的去重正控，不能为了重试禁掉全部缓存 |
| G-C05 | SpriteThumb首次失败后同reader同revision恢复的真实读取/缓存结果 |
| G-C06 | FIRE首次失败后的重试与空帧结果边界 |
| G-C07 | A在途切B，A迟到的resolve/reject能否影响B；key隔离与视图请求归属分栏 |
| G-C08 | 替换资源/undo回旧revision的复用与失效合同，不改undo保留策略 |
| G-C09 | 关闭工程/组件后的缓存引用与可释放对象census；无实测不得宣布泄漏/性能缺陷 |
| G-C10 | 与底层SpriteAssetCache/reader重复保护区分，给出最小正确层与未来回归设计 |

## 证据、计数和完成合同

总表44个唯一ID，每项仅一个最终分类：`reproduced`（当前缺陷实证）、`covered`（已有正确行为具名证据）、
`risk`（有路径/静态风险但缺业务反例）、`blocked`（具体环境/前提阻断）、`N/A`（已证不适用）。
这些分类不是修复状态；不同ID同根必须归并到原D-01/D-02/D-03/E-03/E-04，不膨胀缺陷数量。

每行至少：冻结commit、真实caller file:line、输入是否合法及正控、实测或具名现有测试、业务观察、
缺口/可证伪条件、归属。不得填“已覆盖”而只有源码搜索/退出码0/无断言测试；无法复现就如实risk/blocked。
同一测试覆盖多行可引用，不为每行机械复制一个测试。所有报告数字由最终提交树/日志现场复算。

- 可运行定向既有测试或诊断（串行、限定文件）；不运行全仓check/coverage/ratchet，不改变并发/超时/排除门槛。
- 只替身文件源、时序、绘制呈现边界等必要宿主；不得mock被审的身份/选择/引用/缓存策略本身。
  Canvas呈现若必须替身应明示，不能把stub输出当视觉事实；不启动浏览器或进行截图/像素/声音验收。
- 使用entered/deferred等确定性信号，不用sleep碰概率；判因以真正业务结果为准。
- 若probe或临时工具失败，逐次记录命令/退出码/原因；修环境不改产品，不删除失败证据。
- 不读写用户工程/真实浏览器存储，不运行迁移写盘；缺gitignored资产只登记或使用合法内存seed，严禁追踪data/extracted。
- 原审计探针零改。新探针明确“旧错误特征复现不是修复绿色”，可从仓内命令重建运行，日志留临时证据目录。

## 写入白名单与交付

第一节点在main只改D-01卡自己的设计签字/日志，按三席协议同步提交推送，保留Kimi等他席改动。
第二节点分支仅允许：

- `docs/testing/glm-pre-e2e-prep-report.md`（只写GLM报告，不改本工作包范围）
- `docs/ops/audits/pre-e2e/probe-glm-history-prep.mjs`
- `docs/ops/audits/pre-e2e/probe-glm-reference-prep.mjs`
- `docs/ops/audits/pre-e2e/probe-glm-upload-prep.mjs`
- `docs/ops/audits/pre-e2e/probe-glm-cache-prep.mjs`
- 必要时一个共用 `docs/ops/audits/pre-e2e/probe-glm-prep.config.mts`；无必要不创建占位脚本。

只git add精确白名单；packages/、scripts/、projects/、data/、reference/、锁文件/正式配置/既有探针必须零diff。
不恢复旧stash、不改主线产品、不合入Codex正在构建的D-01源文件；报告只对冻结树成立，接收时由Codex适配最新树。

最终输出：分支/完整SHA/基点、实际文件清单、44项分类数相加等于44、按根因归并的问题与待证、
每组命令/退出码/日志/正控、建议转正式回归的最小集合、所有白名单外零diff证据。
整批提交推送后交给Codex；不代签、不改任务状态、不标done、不自行转Kimi。
若后续采用本包探针/测试设计，必须披露GLM贡献，不以同一贡献者的自测代替独立终审。

## 给GLM的提示词

与D-01卡同一r1提示；先交签字，再自行连续推进剩余组，无需每组向用户申请“继续”。

```text
在 /Users/zhangxu/illegal/type-pal 执行 docs/testing/glm-pre-e2e-prep.md 的 r1 工作包（44项、四组，连续完成）。
先读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md和工作包；D-01卡为 docs/ops/tasks/EDITOR-HISTORY-ORDER-1-global-undo-transactions.md，draft/r1，产品冻结10c84238。
先独立完成D-01前提/矩阵设计审查，自己的premise/design签字与日志直接提交推送main；不要等其余三组做完，不读Kimi结论，不改状态或产品。
随后按工作包从59e03bdb建立独立worktree与codex/glm-pre-e2e-prep分支，核产品对10c84238零漂移，连续完成引用删除、上传乱序、预览缓存的只读取证。
只能改工作包白名单报告/诊断探针；不改packages、scripts、生成数据、正式测试、正式配置或覆盖率基线；不跑浏览器/截图/视觉/声音验收，不整仓check/coverage与Codex争抢资源。
每项给真实调用证据、合法正控、反例或待证原因；probe环境失败不能算产品缺陷，禁止跳过伪绿。已证实项可引用复跑，不堆无意义用例数。
不必每小组问继续；阻断独立登记后继续其他组。最后整批提交推送并给Codex分支/SHA、44项唯一ID账、命令/退出码/日志和复算入口。
这批是卡前取证，不是修复授权；不代签、不标done、不自行转Kimi。Codex统一审查和决定后续实现。
```
