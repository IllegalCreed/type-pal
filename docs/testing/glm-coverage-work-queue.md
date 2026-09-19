# GLM非视觉补测长队列

2026-09-19，Codex根据用户“分批规划、让GLM持续有工作”的要求建立。
这是**候选工作队列，不是十张已获实施授权的任务卡**；不增加新的产品能力、不重开已done任务，
不修改正在审查的r1。队列由Codex维护顺序，GLM负责批次细化及获准后的测试实现，Codex独立接收，Kimi独立终审。

## 一眼看懂安排

现有一批11模块继续走原卡；另备十批78个互不重复的候选模块。每批都是可连续做的整包，
不是每写一个测试就请用户签字。GLM交一批、Codex审一批，同时提前准备后面的批次。

2026-09-19滚动状态：[TB-01～03的r2三签已齐并核准入](glm-coverage-queue-design-review.md)，
TB-01进入build，TB-02/03已准入待实施槽；按卡面条件依序领取，无需重复签字或等用户逐批点头。
TB-00三项残余返工优先，未接收实施包合计最多两批；TB-04～10仍是候选，不是十批已经实施完成。

| 顺位 | 批号 | 工作 | 模块数 | 冻结fast行命中 | 冻结fast分支命中 | 领取前的主要限制 |
|---|---|---|---:|---:|---:|---|
| 当前 | TB-00 | 运行时状态与作者元数据 | 11 | 576/657 | 475/639 | 沿用原卡；未开build不得实施 |
| 第一梯队 | TB-01 | 内容合同已登记的剩余边界 | 6 | 1289/1420 | 1042/1306 | 只补旧回执明确残项，先去重 |
| 第一梯队 | TB-02 | 资源读取、缓存与音效准备 | 6 | 374/397 | 195/252 | 不听音、不做视觉、不改保存/试放 |
| 第一梯队 | TB-03 | 编辑器导入、工作线程与视频元数据 | 7 | 94/257 | 61/199 | 合法二进制与真实编码链，非上传界面 |
| 第二梯队 | TB-04 | 原版表格、文本的自包含解析输入 | 9 | 0/204 | 0/54 | fast排除真实资产测试≠从未测试 |
| 第二梯队 | TB-05 | RLE、事件工具、字体和资源清单 | 9 | 424/484 | 269/374 | 原版格式一手证据；不碰YJ2未定政策 |
| 第二梯队 | TB-06 | 地图选区与组合模板纯数据 | 8 | 1083/1163 | 870/1040 | 不改碰撞/拖拽语义，不重复旧命令测试 |
| 第二梯队 | TB-07 | 脚本编辑、物品与敌人事件辅助 | 7 | 1202/1302 | 861/1135 | D-06/D-07等已知缺陷保持修复归属 |
| 第三梯队 | TB-08 | 第一阶段菜单导航与选择请求 | 9 | 352/374 | 276/382 | 先核一阶段真值和当前调用域 |
| 第三梯队 | TB-09 | 第一阶段宿主、隐私与计时状态 | 8 | 307/314 | 220/252 | 不接真实统计服务，不扩展未知重试政策 |
| 第三梯队 | TB-10 | 当前迁移边界与隔离文件系统 | 9 | 662/754 | 512/649 | A-08/A-09缺陷轴隔离，绝不操作真实工程 |

数字是**目标整文件的既有命中数**，不是本批拟补范围、保证提升值、新增测试数或独立bug数。
模块经候选筛选，但每条分支仍需细化时证明可达、合同明确且旧测试未覆盖；可据证据缩减/合并候选，不能凑固定数量。
十批不必等上一批全部done才能准备下一批；也不要求它们全部完成才能进E2E。

## 基线与完整文件台账

- 生产核对点：`e58834f6389a40ffe9f187e6a8051f552e964d79`；规划起点`7fe6fa3c`。
- 官方fast：7049项、617生产文件；基线生成时间`2026-09-18T17:25:47.519Z`。
- 全仓行49332/69119（71.37%）、语句54693/78971（69.26%）、函数10321/14520（71.08%）、分支39138/62045（63.08%）。
- [机器台账](glm-coverage-work-queue.json)列617个文件的四维分子/分母、批次或下一步归属；[生成器](glm-coverage-queue-census.mjs)校验基线、测试身份、报告分母、逐文件加总与生产零漂移。
- 这次是覆盖报告盘点和候选源码/调用域抽核，**不是重新逐行审计617个文件**，没有新增正式测试或提升覆盖率。
- `coverage/full`历史报告不与本次fast混算；PAL真实资源测试被fast排除的模块，零命中不表示没有已有回归。

完整台账的互斥路由如下。除显式选中的89文件外，部分路由是文件名/路径启发式，JSON中已逐条标明依据；
必须由接手者读当前调用域校正，不能据它认定缺陷、不可达或批准删除。

| 路由 | 文件数 | 含义与下一步 |
|---|---:|---|
| current-card | 11 | 当前TB-00；原卡控制准入 |
| planned-batch | 78 | 本文十批；先细化、后逐卡三签 |
| no-executable-counters | 20 | 四项分母均0；不是100%覆盖，不为类型/导出填无意义测试 |
| no-fast-metric-gap | 98 | 四项计数均已命中；业务断言可能仍有不足，但不为百分比重测 |
| current-consumer-review | 3 | 先查现行调用者；不是已证明死代码，更不是删除授权 |
| codex-ui-or-shell-triage | 148 | UI/主壳优先由Codex分解；纯逻辑可后续提案，视觉/E2E不能交GLM |
| contract-or-fix-first-triage | 87 | 保存、战斗、脚本、迁移等先确定合同与修复归属；不是87个缺陷 |
| glm-readonly-triage | 172 | 仍可继续只读盘点的池；尚未分配正式补测，不暗中默认可实施 |

复算（在本快照对应的官方报告仍在本地时执行）：

```bash
node docs/testing/glm-coverage-queue-census.mjs --check
```

省略`--check`只重建本文机器台账，不跑覆盖率、不写官方报告/基线。后续所列源文件、官方测试基线或报告范围变化时脚本会拒绝旧口径；
尚未进入报告的新文件仍须领取时重新扫描，旧快照不替代最新源码清单。
由Codex显式更新快照和队列、重新去重。不能删除一致性校验迁就新数字，也不能把历史快照冒称最新覆盖率。

## 持续领取方式

1. **返工优先**：有本人的counter先闭环，不能靠领新包绕过证据问题。当前TB-00仍按
   [原任务卡](../ops/tasks/TEST-RUNTIME-STATE-BOUNDARIES-1-state-and-metadata.md)与[39族工作包](glm-runtime-state-boundaries.md)推进；本队列不扩它的r1。
2. **准备队列不断档**：GLM先把TB-01～03细化为可审查工作包；以后保持至少两批有清楚合同、去重表、白名单和验收方法的候选。
   等设计签字/集成时可只读准备后续批次，不用等Codex重新想题目，也不必等十批都细化才交第一批。
3. **一次审整批**：候选按模板开draft卡，GLM为Coding Owner。卡内必须有上下文锚点、四向前提矩阵、替代解释、独立证据和可证伪条件。
   Codex与Kimi可并行审同一revision，GLM签自己实施前核验席位；需要用户转发时一次给齐提示词。
   三席premise/design齐且由Codex核定build后，整包按顺序连续做，组间不重复签字。
4. **允许错峰，不积压**：一批进入review后，可启动下一张**已独立获准build**的卡；每卡一个Coding Owner。
   同时最多两批未接收的实现成果。达到上限后做只读细化或处理counter，不继续堆无人复核的测试。
5. **分支隔离**：每批从最新已接收main创建独立`codex/`分支及worktree；不在主worktree检出GLM分支，不恢复stash，
   不把另一批尚未接收的候选合入作为基线。并行包不得共用可修改fixture/报告/输出目录；只读复用已有合同可以。
6. **验收逐批闭环**：GLM定向/相邻/本包typecheck/Biome/负控/私有覆盖对照后交付；Codex独立复核再集成，
   串行全仓check→官方ratchet→受保护单次strict-fast。未接收包不能一起混入官方门禁，失败不靠多数通过。
   GLM贡献必须披露，不充当自己测试的独立第三方；Kimi独立终审，Codex统一done，不代签。
7. **主线照常推进**：Codex负责审计缺陷、技能试放及视觉验证。既定顺序仍是必要修复与R4 content20薄E2E→N6b content21→完整E2E；
   本队列和长期覆盖目标不成为薄E2E的新前置门。遇到N6b改动覆盖目标，暂停该轴并按新合同重定基线，不保留旧模型双测。

### 每批细化必须交付什么

- 当前HEAD/生产冻结、现行真实调用者与输入守卫锚点、旧测试精确标题、剩余族唯一ID；
  每族分类为新增候选/已有证据/待裁决/防御或无当前调用，不能把“看见一个else”当作需要一个测试。
- 新测试/薄fixture/诊断工具/回执/机器账的明确白名单与相互隔离路径；实现阶段不改生产、旧测试、公共fixture、全局配置、超时/排除、官方报告或资产。
- 合法正控先过**现行守卫或正式解析器**，反例只坏目标轴；同一输入的深快照、完整输出、真实保存字节/IO轨迹依合同取舍。
  不要求本来就会修改状态的API不变；不使用同一被测函数计算预期值。
- 异步用entered/deferred见证，宿主替身遵循事务/回调合同；不能用固定sleep或仅spy次数替代最终业务状态。
- 各独立保护族至少有代表性单点负控，具体针数在卡面确定，不为凑数机械“一模块一针”。正常实现先绿，隔离只去目标保护，
  精确钉新增测试的运行态failed和业务红因；环境错误、语法/类型错、未执行或别的用例红不算。突变后产品hash恢复/不变。
- 局部模块与全包覆盖都用官方testSelection口径、相同生产分母和资产排除，在各自`/tmp`目录做有/无本批测试对照。
  新增命中与之前批次重叠要单列，不能直接累计回执百分比。
- 不用`skip`/`test.fails`掩盖产品缺陷；发现合法业务合同失败，隔离诊断并交Codex对应修复卡。未定政策不能固化为正确绿测。
- 回执从**实际提交树**复算，带命令/退出码/候选SHA/失败记录/可重建负控/待证归属；不得复制旧测试文件再写另一套回执。

## 十批具体边界

以下路径均为对应包的`src/`下相对路径；完整路径和四维计数在机器台账。所列轴是待去重的合同候选，
不是全部已证可达的新增用例。正式卡要把原版/第一阶段/当前实现/目标分开核实，未知先停该轴，不推断产品政策。

### TB-01 · 内容合同残项（content，6模块）

目标：`asset.ts`、`actor-reference.ts`、`frame-sequence.ts`、`author-dialogue.ts`、`map-index.ts`、`validate-refs.ts`。

- 精确承接[上一包缺口分类](glm-content-contracts.md)：asset:409–421未绑定肖像直连；actor-reference:299–340表情重命名。
- **跨包去重**：editor的`core/actor-dialogue-commands.boundaries.test.ts:149`已覆盖表情重命名全部目标、非目标不变、深快照与invert；
  它们不是content fast局部报告能证明“从未测过”的空白。先核调用域和断言，不把相同业务测试搬包计为新增；无剩余价值时剔除该族。
- frame-sequence:116–152外部UTF8/索引JSON错误；不构造当前合法编码域不可达的103–112多字节encode臂。
- author-dialogue:60/141/149/157/164的行数、速度、自动推进、槽位、光标帧轴；map-index:41–55剩余拒绝边界。
- validate-refs的world appearance、onLose/onFlee、商店货单→物品、scriptChunks显式缺失、levelUp属主与optional缺席；
  合法整工程先过校验，再一轴改坏并钉实际路径/目标，不只断言有error。
- 已接收118项/43族先逐项对账；TextEncoder降级不存在，不补；D-06/D-07留修复卡，不复制整个旧包再声称新贡献。

### TB-02 · 读取、缓存与音效准备（reforge，6模块）

目标：`audio/sfx.ts`、`audio/sfx-readiness.ts`、`project-image-cache.ts`、`file-source.ts`、`fsa-source.ts`、`engine-chrome/registry.ts`。

- sfx的读取/RIFF/解码/播放分阶段失败、恢复、source生命周期与字节复制；只用窄WebAudio宿主替身，
  不把13字节假RIFF加mock decoder称作真实WAV验证，不听音。旧LRU/去重/旧ended/resume断言先去重。
- readiness只测非战斗脚本/场景声音集合：当前合法树、共享脚本递归、遗漏引用、additionalRoots/库存/当前页、取消、精确资源集合。
  相关入口`main.ts:783`；战斗闭包政策不在此批。
- image cache的工程身份隔离、pending复用、错误重试、kind错误零读取；已完成dispose关闭与重读。
  **在途dispose后能否回填**仍待合同判断，不把目前表现固化为要求。
- HTTP/FSA每个await前后取消、路径与JSON错误、URL创建/回收；保留现行读取合同，不动保存稳定读门/锁/恢复。
- chrome registry槽位/promise缓存与失败重试，仅资源身份和IO；不验图标外观、不接真实网络。
  锚点`project-loader.ts:455/461`、`menu/menu-box.ts:363`，以及editor的`core/open-local.ts`、`core/load-play-project.ts`调用域。

### TB-03 · 导入与编码工作线程（editor，7模块）

目标：`core/image-import.ts`、`core/battle-sprite-import.ts`、`core/frame-animation-images.ts`、
`core/frame-animation-codec.ts`、`core/frame-animation-worker-client.ts`、`core/frame-animation-codec.worker.ts`、`core/video-metadata.ts`。

- PNG签名→解码→尺寸/调色板→catalog字段/实际字节摘要；各阶段失败与释放。battle profile最少帧数、ID冲突/同摘要、kind与metadata单轴。
- 多图片排序/保持顺序、空列表、MIME/扩展名、第二帧尺寸错误、读取或bitmap失败收尾；不用浏览器或截图。
- Worker请求ID、失败消息/缺结果、terminate、独立请求与transfer拷贝；真实handler调用纯codec，不用mock掉整个被测模块。
- TPFS合法输入与真实重开：sourceFrame缺失/小数/越界、块复用、跨三块；已有基础编解码测试去重。
- BMFF的64位扩展长度、零长度、截断/边界、嵌套hdlr与meta偏移；独立构造合法最小输入，不依赖真实视频。
- 调用域：`ui/ImageTab.tsx:525`、`BattleSpriteLibrary.tsx:1269`、`FrameAnimationEditor.tsx:506/550/593`、`CutsceneTab.tsx:232/472/479/491`。
  上传选图归属已修，不重新编造旧竞态；此批不负责界面布局或动画观感。

### TB-04 · 自包含PAL表格与文本（pal-extract，9模块）

目标：`io/sss.ts`、`io/word.ts`、`io/msg.ts`、`resources/parsers/items.ts`、`stores.ts`、`battle-fields.ts`、
`enemy-teams.ts`、`data-misc.ts`、`resources/enemy-pos.ts`（四个短名均在`resources/parsers/`）。

- 真五chunk MKF、32/8字节记录、符号位与非零byteOffset；WORD完整565×10记录、尾空格/尾余字节、原始到语义映射。
- GBK消息半开offset与sentinel/空消息；非法offset的未定处理不由测试发明。
- item的六flag/六装备位与完整脚本字段、合法Dreamsnake例外、截断/子视图；商店首0/最多9项/多行；战场五有符号属性和无符号波纹。
- enemy team五槽、0/FFFF、当前OBJECT映射、原始身份与缺映射告警；**只测当前caller的mapped入口**，不延长无map旧模式寿命。
- data-misc成长/效果数组完整相等；enemy-pos用不对称100字节5×5位置矩阵，避免转置错误仍绿。
- 调用锚点`cli.ts:201–203/220/334–364`；读取格式一手定义及既有`io`/`tables`/`data-misc`测试。
  此批提供无资产的长期fast回归，不跑实际extract CLI、不提交raw/extracted。若只是把已有资产断言移成自包含，应如实记“输入解耦”，不能算新业务边界。

### TB-05 · RLE与提取工具（shared 2 + pal-extract 7模块）

目标：shared的`rle.ts`、`rle-encode.ts`；pal-extract的`events/disasm.ts`、`events/recompile.ts`、`events/annotate.ts`、
`events/slice.ts`、`resources/palette.ts`、`font/bdf-to-json.ts`、`resources/asset-manifest.ts`。

- RLE偏移/sentinel、透明与不透明、127长度run、pad、子视图；当前仍被使用的格式profile按真实消费者保留，不能见legacy字样就删。
  被构造保证挡住的编码器内部臂列防御，不乱造非法内部对象；旧bad-tail测试去重。调用`reforge/assets.ts:296`、`migrate/pal-assets.ts:908`。
- 事件用独立8字节向量，signed giveItem、消息、保留operand、标签、globalEntries/shared goto、循环/递归选择与输入不变。
  `cli.ts:263–286`及现有opcode矩阵为去重入口，不用recompile(disasm(x))自洽代替独立oracle。
- palette长度；小型合法BDF位/offset；asset-manifest只在mkdtemp夹具树校验递归过滤、排序、bytes和版本稳定性。
  现行版本键path+size不由本测试改成内容hash；symlink政策另归对应修复，字体不做屏幕视觉测试。
- 已done的MKF/RNG/YJ2大包不重开；YJ2两个后续问题见下方条件池。

### TB-06 · 地图与组合模板（editor，8模块）

目标：`core/map-selection.ts`、`map-transform.ts`、`map-patch.ts`、`stamp-draft.ts`、`stamp-placement.ts`、
`stamp-placement-mutation.ts`、`stamp-group-transform.ts`、`stamp-template.ts`（全部`core/`）。

- 选区clip/作用域/拥有关系/独立workspace；失败的完整issues、canApply与空patch，不在失败move时先清源。
- 视觉层数据和nullable碰撞数据的组合移动/resize边界；授权数据防御拷贝、原输入深快照；这是数据断言，不是新碰撞/走路语义。
- 图层映射、资源帧注册、provenance稳定ID、放置后正式validateProjectMap；删末项/upsert不污染其它拥有者。
- group cut/copy的ID、collision-only/visual-only；template相对高度、来源anchor、顺序与合法往返。
- 入口`ui/MapMode.tsx:663–690/727/1363/1602`及`StampContentEditor`/`StampTemplateDialog`。
  这些模块既有测试已很厚；commands.ts和上轮编辑器47项不重发，全部剩防御臂时停止本族，不造假fixture硬达标。

### TB-07 · 脚本与内容编辑辅助（editor，7模块）

目标：`core/author-command-edit.ts`、`script-editor.ts`、`script-editor-projection.ts`、`script-reference-catalog.ts`、
`item-authoring.ts`、`item-alchemy.ts`（前六均`core/`），以及`ui/enemy-defeated-events.ts`（纯数据辅助，非视觉组件）。

- 真实嵌套then/else/body/onNo/onLose/onFlee/onFail路径；复制时仅新副本去重复稳定ID，深快照实际传入对象，no-op依合同保留引用。
- behavior/hook CRUD的身份/引用守卫、初始项和标签顺序；projection正文与shell字段分离、删shell不复活脚本正文；catalog稳定顺序/标签/路径。
- alchemy错误kind、no-op与独立fallback；item-authoring的ID分配重复后缀。后者只有很少未命中臂，不强求额外文件/数量。
- 敌人战败事件模式识别、只替换选中区域、顺序/概率0与100/终止路径、当前合法对话引用。
- 入口`ui/ScriptEditor.tsx:3313/3318/3326`、`ConnectedEditorPages`、`ItemAlchemyTab.tsx:152/160`、`EnemyTab.tsx:691`。
  D-01全局历史/保存缺正文已完成，不重演；D-06新增物品canonical缺项、D-07共享/私有脚本前缀歧义留修复，不用当前错误作预期。

### TB-08 · 第一阶段菜单选择（game，9模块）

目标：`core/menu/`下`primitives.ts`、`inventory-menu.ts`、`item-select.ts`、`magic-select.ts`、`in-game-magic-menu.ts`、
`shop-menu.ts`、`sell-menu.ts`、`equip-menu.ts`、`in-game-menu.ts`。

- 空/单项/disabled、cursor与page offset；真实flag/in-use数量过滤、缺定义、精确MP边界、稳定ID排序与输入保真。
- phase导航→请求内容，错误phase不出动作、刷新后选中项消失；目标roleId与完整payload；商店money恰等于价格、卖物在用数量和禁用格。
- 只测选择意图，不执行战斗效果/伤害/装备数值、保存，不验颜色或绘制。
- 生产域`core/menu/menu-driver.ts`及`bootstrap.ts:1260/1262`、`core/scene-system.ts:543`；先读[一阶段工程经验](../phase1/engineering-notes.md)、
  [机制真值](../phase1/game-mechanics.md)及对应primary-source锚点，再确认交互合同，不能只拿TS现状自证。
- `item-select`只选现行matchesFilter；未发现生产调用的createItemSelectMenu，以及primitives部分pageUp/pageDown/Triple/Confirm/Switch辅助先查caller，
  不为补覆盖复活无消费者API。二阶段TB-00菜单包不混入此批贡献。

### TB-09 · 第一阶段宿主与计时（game，8模块）

目标：`shell/fetch-retry.ts`、`shell/input.ts`、`shell/audio-volume.ts`、`analytics/analytics-consent.ts`、
`analytics/google-analytics.ts`、`tools/speedrun/timer.ts`、`detectors.ts`、`time-format.ts`（后二均`tools/speedrun/`）。

- fetch method/init优先级、GET大小写、非GET不重试、502/503/504、最后response、退避数组/原错误；AbortError当前通用重试是否合理只诊断，不能固化未定政策。
- 键盘detach、未知keyup、Set防别名、多键/方向状态；未发现生产构造的Replay/Recording输入源暂不补。
- 音量显式0/默认0/静音各通道、apply/storage轨迹；NaN和存储异常降级若无已定合同先分类。
- consent宿主getter/read/write/event异常、GPC/DNT、偏好与unsubscribe；GA事件/ID/UTM清洗只接fake gtag/DOM，不联系真实Google，不改部署设置。
- speedrun idle/finished/pause、相同now、reset和独立内存、一次标志、best splits、detector前态null与边界、59/60时间格式；
  不发明倒退时钟或超大数溢出政策，不测overlay/store/真实战斗胜利。
- 入口`bootstrap.ts:471/1092/1098/1104`、`analytics/install-analytics.ts`、`tools/speedrun/index.ts`与`checkpoints.ts`；先查现行caller再定宿主替身。

### TB-10 · 迁移当前合同（migrate，9模块；晚于第一梯队）

目标：`migration-project-io.ts`、`migration-transaction.ts`、`migration-write-plan.ts`、`project-map-converter.ts`、
`project-map-audit.ts`、`source-facts.ts`、`pal-authored-overlays.ts`、`pal-item-scheme-labels.ts`、`pal-store-boundary.ts`。

- 文件系统测试仅mkdtemp自有夹具根：当前journal坏字段、拒绝时字节/凭据保真、同journal恢复、manifest最后发布、完整IO序列。
  不操作真实projects/data/baseline，不运行真正migrate-content，不构造旧版本发现fallback。
- map重复编号/原输入保真/行列sub ID/合法形状；不改变碰撞模型。writer计划顺序、退休hash与保护目标按当前合同去重。
- 当前publication的overlay/label/store使用合法守卫fixture，只坏一轴；作者内容保留、稳定消息/hook闭包与顺序。
- 调用`scripts/migrate-content.ts:12–24/66–82/114–143`、`pal-migration.ts:393`、`pal-current-publication.ts:181–209/316/357`。
  source-facts若只有窄间接调用或无真实缺口，登记已有/防御即可。
- A-08 snapshot→journal并发窗口、A-09 materialize父目录symlink为已知修复归属，**不得用错误现状做绿测**；
  E-05旧接口清理先行的轴等待清理。大规模pal-assets/真实资源重迁不在本包。

## 条件池与明确不下放的工作

- **YJ2后续**：weight 0x8000树缩减需独立且有界的向量；空窗口back-reference的格式政策未定。
  [基础补测回执](glm-foundation-coverage-receipt.md)已有139项不再批发重复；GLM可只读搜证，不能推断语义后做绿测。
- **当前DSL/解释器**：author-script-core、enemy-script、script、script-runner、script-world、script-project-core等仍可有大批非视觉工作；
  先从172文件只读池和87文件合同池筛选，扣掉已接收包及修复卡覆盖，提出TB-11以后的候选，不在本轮假称已细化。
- **保存/作者恢复/迁移CLI**：已有高强度专项；残臂必须证明合法可达与真实价值，不用测试替身绕过授权门，不引入旧content/SAVE模型。
- **战斗与Q2**：已知C组缺陷、N6b会动的成长数值另卡处理；GLM能做矩阵和获准的纯代码测试，不能以自己实现公式作oracle或宣称音画已验收。
- **无当前调用待核**：`content/src/enemy-team-reference.ts`、`content/src/script-library.ts`、`reforge/src/script-chunk-store.ts`。
  是调用域复核候选，不表示整文件废弃，不授权删除，也不为了覆盖率让它们常驻。
- **Codex保留**：main/bootstrap/App/ScriptEditor/MapMode主壳集成、实际布局、原生句柄交互、视觉/音画、薄及完整E2E。
  可以由GLM提出可隔离的纯helper，但不能擅自改产品抽函数；AST调用链测试不冒充整页或浏览器覆盖。
- **技能试放隔离**：main/boot、SkillTab/App/play URL、试放窗口、BattleSession入口及world→player输入构造保留给
  [Codex当前卡](../ops/tasks/EDITOR-SKILL-TRIAL-1-isolated-battle.md)；本队列不抢修改权。E-02等已有缺陷即使行覆盖满也仍需修复。

## 可直接交给GLM的总提示词

```text
在 /Users/zhangxu/illegal/type-pal 持续推进非视觉测试队列。先读 AGENTS.md、CLAUDE.md、
docs/phase2/READ-FIRST.md、docs/ops/agent-workflow.md、当前看板，
再完整读 docs/testing/glm-coverage-work-queue.md 与机器台账；以最新main核当前任务状态。

当前 TEST-RUNTIME-STATE-BOUNDARIES-1 按原r1继续，不扩范围、不重签已有效设计。
若尚未build allowed，不实施。先准备TB-01～03三批，之后按队列持续细化，始终留下至少两批可审候选。
每批先做真实caller/合法输入/已有测试去重与剩余族分类，形成独立draft卡和工作包：
前提矩阵、证据锚点、最强替代解释、可证伪观察、白名单、负控方案、同口径覆盖复算与完成条件。
候选并非已批准实施；正式测试必须等本卡三席设计齐且Codex核定build。不要一次铺十张空卡；
逐批提交有内容的准备结果，直接给Codex/Kimi并行审查提示词，让审查与下一批只读细化错峰。

已有counter先返工。一批送review后，可做下一张已独立获准build的卡；未接收实施包最多两批，
满额时只读细化，不堆积未审测试。每批独立codex/分支/worktree，基于最新已接收main，
不要在主worktree检出、不要恢复stash、不要提交gitignored资产或使用别批未接收候选作基线。
领取前重新核对本批目标是否因Codex修复/N6b变化，变化则只调整对应轴，不擅自扩大签字范围。

仅改卡面新增测试、薄fixture和本批诊断/回执；不改产品/旧测试/全局配置/官方覆盖基线。
发现真实缺陷或未定政策隔离登记，不skip、不test.fails、不把错误现状冻结成正确预期。
异步须entered/deferred，fixture先合法，快照比较实际输入，负控须钉新增测试业务失败。
定向/相邻/typecheck/Biome/负控/私有同口径覆盖对照完成后，按实际提交树写清命令、退出码、
失败记录、净增与重叠、待证归属。Codex负责接收、全仓check/官方ratchet/受保护strict-fast；
你不补跑官方门、不做浏览器/截图/视觉/听音、不代签、不标done。

十批只是持续补测队列，不是E2E前置清单，不承诺固定新增测试数；无有效缺口就如实缩减。
你是测试贡献者，终审须披露；所有结论和下一位提示词落仓，不要求用户搬运审查正文。
```

这次仅规划，无需另开“规划的三签”。真正实施时沿用现行卡制度；本文件的排班与候选范围不是任何席位的accept。

## 本次规划验证

Codex：`pnpm check:docs`（含20项文档工具测试）、两个机器文件的Biome、census `--check`、
独立617唯一文件/78候选模块/批次归属及总数复算、`git diff --check`均通过。
相对生产核对点的`packages/`与`scripts/coverage/`零diff；未运行或冒称新增全仓测试/覆盖率。
首次生成器核验遇到报告保留完整identities、基线只保留摘要的格式差别，已改为逐项比较基线全部身份字段，
不是忽略身份校验；随后生成与复算通过，官方基线未改。内部Codex只读复核补齐了跨包去重和路径勘误，不冒充GLM/Kimi签字。
