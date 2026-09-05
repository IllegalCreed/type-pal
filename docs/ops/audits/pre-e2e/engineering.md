# E批 · 测试、工程与维护性审计

基线：`223a20f0`，产品代码与A–D批一致。Owner：Codex；内部并行只读取证，不代表Kimi/GLM签字。
本轮新增6项编号记录：4类功能/测试问题、1类开发期旧调用面残留、1项全仓质量门禁未绿。
不是6项全都阻断二阶段薄E2E，也不是又启动了6张修复卡。

## 摘要

| ID | 阶段/类别 | 级别 | 确认内容 |
|---|---|---|---|
| E-01 | 一阶段测试 | P2；跳过提示分支为P3 | 资源缺失时有零断言假通过；另有声明skip却在收集期读缺失文件而失败的分支 |
| E-02 | 一阶段缓存进度 | P2 | 404资源未缓存，却计入“已缓存”字节并显示100% |
| E-03 | 二阶段编辑器 | P2 | FIRE预览缓存只按chunk，跨工程显示前一个工程图片 |
| E-04 | 二阶段编辑器 | P2 | 缩略图首次失败被永久缓存为null，同修订资源恢复后不重试 |
| E-05 | 二阶段版本纪律 | P2，合同残留 | 已退役输入接口和历史翻译输出仍由旧测试维持，无生产消费者理由 |
| E-06 | 全仓门禁 | P2，工程基线 | 类型检查通过，但全仓lint仍失败；不能声明当前check全绿 |

## E-01 · 资源测试的前置条件与实际结果不一致

- `game/src/assets/sprite-blob-snapshot.test.ts:97-98`：物理命中特效文件不存在就return，
  用例仍被报告passed，没有断言。相邻enemy/player/fire样本循环也没有统一非空样本断言；
  本轮只对effect缺失做独立反例，不将所有循环都算已复现缺陷。
- `rng-blob-snapshot.test.ts:27-30`与`tileset-blob-snapshot.test.ts:49-52`：
  虽然describe.skipIf检查数据存在性，但suite回调在收集阶段仍读raw；缺文件时先ENOENT，根本没注册测试。
- 主Agent用**真实Vitest运行原测试文件**，仅在独立诊断setup中替换node:fs只读边界，不移除真实文件：
  - 只模拟effect.rle缺失：exit0、1 passed、该用例assertionCalls=0。
  - 正常文件对照：exit0、同一用例5条断言。
  - 模拟RNG/GOP原文件缺失：两suite失败、无测试，exit1；同时打印的skip警告不能当成真实跳过。
- 诊断setup同时替换named/default只读导出，以适配实际Vite内建模块互操作；
  初版只替named未生效的试跑已排除，不把它当缺资源测试证据。
- 限定：没有证据表明当前本地effect文件缺失；这是测试在坏资源条件下的覆盖缺口。
  根README已说明完整维护者门禁的迁移器需要PAL数据，因此**不据此声称整个根check承诺无raw也通过**。
  E-01主风险是零断言假通过；skip与收集期读取冲突是较低级别测试设置/告知问题。
- 修复方向：明确unit与真实源资源组的输入合同；缺必需输入fail-loud，可选组应显式skip且别先读取；
  实际样本/断言数量不能为0。不要让“退出码0”成为资源完整性的唯一证据。

## E-02 · 预缓存进度把404也计作已缓存

- `game/public/sw.js:120-124`中res.ok为false不cache.put，但仍bytes+=size；
  `:128-137`继续done++并发送precache-done。
  `game/src/main.ts:46`接入的`precache-ui.ts:123-131`把该值展示为“已缓存”。
- 原Worker全文在VM中运行，CacheStorage/fetch为内存边界，再调用真实createUnifiedProgressUi：
  两份各1MiB资源，正常200时缓存2份、显示“已缓存2/2MB”和100%、离线读第二份得到200；
  只将第二份改404，实际仅缓存1份，显示仍相同且发完成消息，内存离线读取失败。
- 反证：正常完整下载正确，网络按需请求仍能在在线且资源恢复时补取。
  不要求单文件失败必须阻止进入游戏；问题是**已缓存口径错误、完成回执不区分缺文件**。
  产品没有“离线就绪”字样，本报告不虚构该文案。未操作浏览器真实CacheStorage或断网现场。
- 后续一阶段缓存/离线测试应验实际缺失清单与可恢复重试，不仅看100%和precache-done；不直接阻断二阶段R4。

## E-03 · 特效预览缓存缺工程身份

- `editor/src/ui/FireEffectPreview.tsx:15-33`全局Map仅以chunk为key；
  `:66-75`虽在assetBase变化时重新请求，却命中之前工程的Promise。
  `editor/src/main.tsx:149-162`切工程是同页替换React状态，不会清模块缓存。
- 这不是共享引擎chrome：`reforge/src/assets.ts:422-447`实际按工程AssetResolver查effect-sprite、读字节、核SHA。
  `SkillAnimationEditor.tsx:274`为实际预览入口。
- 原cache/loadFrames函数＋真实AssetResolver、encode/decode/bake：A/B都有chunk7，真实像素分别10/20；
  A先预览后B预览，B仍像素10、复用同一frames数组、B预览读取次数0；
  直接loadFireSprite(B,7)读出20，排除底层加载器拿错源或两工程本来同内容。
- 边界：仅Canvas和内存FileSource为桩，不是浏览器完整组件切工程截图；
  同资源字节的项目或整页刷新会掩盖问题。未改任何项目资源。
- 修复方向：缓存按工程/reader及实际资源修订隔离；工程切换、替换资源、失败重试的生存期一起定义。
  回归用同chunk、不同SHA工程，而不是两个恰好引用相同PAL资源的副本。

## E-04 · 缩略图把失败当作永久缓存结果

- `SpriteThumb.tsx:24-40`以projectId/asset/revision/frame为key，但catch返回null并永久存入Map；
  `:96`遇到null只清画布。重新挂载/同修订再预览也复用这个null。
- 原loadThumb/cache函数→真实loadEditorSprite/AssetResolver：首次内存读失败得到null；
  同reader同SHA恢复可读后第二次预览仍null、总读取次数仍1；
  直接调用底层加载器已能读出像素30，第三次上层预览却仍null。
- 反证：底层`core/sprite-assets.ts:5-21`使用按reader隔离的SpriteAssetCache，失败后能恢复；
  换revision或重载页面会换key/清缓存。本条不是“所有资源缓存永远无法恢复”。
- 修复方向：失败结果可重试、删除失败Promise或显式失效，保持成功资源去重；
  同一工程资源短暂不可读→恢复→重开预览应纳入功能性界面测试。

## E-05 · 开发期旧调用面/历史生成分支未退役

静态调用链审计；**当前正式loader、工程与保存入口只消费content20/SAVE8，无旧存档upgrader发现**。
本条是删除纪律未完全落实，不是“当前迁移正在生成旧工程”。

| 残留 | 当前调用与边界 |
|---|---|
| `battle-core.ts:293-296,323`的v11 dense `enemies`参数及fallback | 唯一生产caller `battle-session.ts:400`已传enemySlots；旧输入只剩测试，保留测试语义改传当前槽即可 |
| `battle-anim.ts:518,529,534`的旧targetIdx/damage参数 | 唯一生产caller `battle-session.ts:2118`已传hits；三个旧动画测试维持兼容入口 |
| `migrate/src/translate-events.ts:198-204`历史R13/legacy引用选项，`:1793,1932`旧输出分支 | 当前唯一PAL核`pal-migration.ts:391,416,499`固定current-r13-6b与stable-id；显式历史选择仅查到测试调用 |

依据`AGENTS.md`开发期版本纪律与`ARCH-CURRENT-ONLY-1-retention-ledger.md:17,74-80`：
只保留直接raw→current producer，不为历史开发输出和旧fixture长期保留转换路径；没有批准此类converter例外。
ledger当时content16是历史任务上下文，**不是把当前content20降回16**。
本轮21条current-only静态门禁仍通过，说明仅匹配文件名/符号/特定版本字面量不能证明整个调用面已清理。

明确不删：当前局部ProjectMap4/AssetCatalog1/ScriptChunkV1、ScriptRef投影；
legacy-migrated来源标签、被批准的源精灵坏尾解码；IndexedDB onupgradeneeded和平台/媒体兼容。
这些都有明确当前用途，不能按legacy字样批量删。

修复应另按跨包/迁移风险开卡，先钉当前行为并复跑当前发布证明；不是本审计直接删代码。

## E-06 · 当前全仓质量门禁并未全绿

- 实跑`pnpm typecheck`：7包全部通过。
- 实跑`pnpm lint --max-diagnostics=2`：在本轮诊断文件已单独格式/检查通过后，
  仍有**238条error级诊断、50 warning、13 info**，exit1。产品文件未改，属于现存门禁基线问题。
  代表：content/author-dialogue.test导入/格式、author-enemy导入顺序、author-script.ts:94回调规则等。
  **238条诊断不是238个运行缺陷**，不据此夸大业务风险；未在审计中自动格式化产品源码。
- 根`package.json:6`的check会在包检查后跑lint；`:7`check:fast同样跑全包test及lint。
  因此类型/选定测试通过不足以声称当前根check全绿。本轮没有运行完整pnpm check，也未运行全仓全部测试。
- 设计系统门禁单独实跑通过：92文件、2条带证据例外（其中实际AST门禁由adoption.test接入，
  不误报为完全游离于测试）。它证明静态组件接入约束，不代替像素/浏览器布局验收。
- 建议先恢复可解释的绿基线，区分机械格式与可能需要判断的lint修改，不以关闭规则或豁免存量换绿色。
  根CLAUDE的旧“lint不在check”说明也应随此批校正；真正执行合同以package.json为准。

## 性能/结构建议：不新增运行缺陷计数

1. 缓存容量与释放合同：SpriteThumb全局Map与StampPreviewCanvas按revision缓存没有明确上界；
   旧修订可能为Undo复用，不能仅凭Map增长宣布内存泄漏或卡顿。应测切工程、长编辑、撤销窗口后的保留量，
   再定LRU/工程关闭清理策略。E-03/04身份与失败恢复是已证实缺陷，容量策略是另一个问题。
2. 复用既有derived-reference benchmark和worker增量索引，先测真实工程/大列表再优化；
   不因看到一次O(n)遍历就额外堆缓存。敌队大目录虚拟滚动仍按已定第二阶段队列实施。
3. 影子实现候选：BaseScriptProjectRuntime（script-project-core.ts:317）无实例化调用；
   App已要求ScriptEditSession却仍保留ScriptDrawer fallback（App.tsx:3005）。应按真实依赖收口，
   保留当前使用的BaseProjectScriptRuntimeHost，不因类名相近一并删除。
4. `check:fast`当前并未选择migrate的unit-only项目；可明确“快速检查/完整维护者检查”的真实边界，
   配套固定文件/用例数量与skip回执。是否调整默认命令另定，不在审计时偷减测试。
5. 测试文件里“e2e”不等于浏览器E2E：game/src/e2e.test用headless tickN，e2e-battle用直接填动作的tickBattle，
   源码已说明无RAF/真实画面。保留它们的集成价值，R4/Q1/Q2另建可执行浏览器/运行回执。
   许多包的passWithNoTests也要求定向测试时主动核文件/用例数量，不能只记录exit0。

## 已排除与部署边界

- `scripts/deploy.sh`是第一阶段发布路径，本轮只读和bash -n，未运行SSH/CDN/nginx/build/deploy。
  最初怀疑data分支`check_extracted && deploy_data`屏蔽errexit，隔离Bash控制流反例表明deploy_data在&&末项，
  rsync桩返回23时正确退出23、未刷新或宣告完成；该候选撤回，不计缺陷。
  这不是全脚本故障注入证明，不能外推所有发布原子性都已验证。
- 二阶段A1/A8本来安排最终发布收口；dev/preview访问仓库目录不是独立发行可用的证据，
  但也不把“尚无A8干净环境构建证明”重复登记成新bug。版权替换仍属第三阶段。
- 无生产部署/实际浏览器离线/内存峰值/帧时延测量；诊断只有所列边界与控制，不宣称线上已经损坏。

## 验证回执

三组最终探针由主Agent独立复跑；测试门禁探针再调用原测试文件，setup只模拟只读资源边界：

```sh
node docs/ops/audits/pre-e2e/probe-test-gates.mjs
node --import tsx docs/ops/audits/pre-e2e/probe-precache-progress.mjs
node --import tsx docs/ops/audits/pre-e2e/probe-preview-cache.mjs
```

probe-test-gates成功表示复现了“缺raw两suite失败／缺effect零断言passed／正常effect五断言passed”，
不表示原门禁在所有条件下成功。直接用其config/setup手动跑missing-raw时应exit1，这是预期反例回执。
Vite不启HTTP/HMR监听，ws=false；只允许正常模块缓存，不操作用户工程、存档或真实CacheStorage。
修复后须用正确行为正式测试取代这些断言旧结果的证据脚本。

普通正向测试记录（各组命令均为对应包`exec vitest run <文件> --no-file-parallelism`）：

| 执行方/包 | 文件 | 结果 |
|---|---|---|
| 主Agent/game | `src/e2e.test.ts`、`src/__tests__/e2e-battle.test.ts`、`src/shell/{precache-client,precache-ui}.test.ts` | 4 files / 17 tests |
| 主Agent/game | `src/assets/{rng-blob-snapshot,tileset-blob-snapshot,sprite-blob-snapshot}.test.ts`，本地数据齐全 | 3 / 23 |
| 主Agent/migrate | `src/current-only-product-boundary.test.ts --project unit` | 1 / 21 |
| 内部资源分工/editor | `src/ui/{EnemyBattleSpriteThumbnail,StampPreviewCanvas}.test.tsx`、`src/core/{audio-preview,editor-asset-reader}.test.ts` | 4 / 15 |

共12个独立文件/76条普通测试。缓存分工另跑的precache两文件14条包含在17中，不重复累加。
错误注入回执不计入普通绿色测试数；全仓类型检查、静态设计门禁通过，全仓lint仍红。

五批本轮审计至此收口，风险归并与建议顺序见[总收口](summary.md)。未开始实现修复、未改已验收能力状态。
