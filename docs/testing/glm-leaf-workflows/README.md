# GLM 三十二组叶层与小界面补测

[任务卡](../../ops/tasks/TEST-GLM-LEAF-WORKFLOWS-1-thirty-two-groups.md) · [冻结目标](targets.json) ·
[上级](../README.md) · [并行 Kimi 包](../kimi-editor-workflows/README.md)

**当前已 build allowed，直接写测试，不先花一轮只写审计。** 32 组分 A–H 八批，每批四组，
从边界清晰的叶层逐步推进。工作量以约 160–240 条有意义测试作规划参考，不设用例硬配额，
不得复制已证断言凑数量。每批单独固定候选并推送，后续可连续做，不等逐席签字。
已准备工作树 `/Users/zhangxu/.codex/worktrees/glm-leaf-workflows/type-pal`，
分支 `codex/glm-leaf-workflows-r1`；资源和依赖按下文先核，不借别人的工作树运行。

## 冻结、所有权与统计

生产冻结 `3925980cab8e1e62bb59cf560db756935fda7d05`，相对 `29e76fe6` 产品未变。
49 目标分支 4,459/5,584，行 4,500/5,161；**1,125 未命中臂 / 661 行只是选题空间**，不是全部可达，
也不是新缺陷数或保证增量。现有全仓 fast 为 9,746 测试 / 730 文件、分支 47,678/63,398（75.20%）。
targets.json 为 Codex 只读快照，含 source hash、公开入口行、同名旧测试和静态 import 示例。
它不是完整调用/去重证明；没有同名旧测试也要搜索 controls、命令、fixture 和其它跨组件测试。

Kimi 的 20 主目标和本包 49 主目标零交集，分别只新增自己的测试。不要改 Kimi fixture、复制其交付，
也不要把两个隔离 after 的增量简单相加；Codex 最终以正式集成并集计算。
`StampPlacementInspector.tsx` 没找到当前产品消费者，已经剔除；不造一个测试宿主使它“复活”。

## 八批明确任务

以下是**需要找出剩余合同的范围**，不是说列举的每项现在都没测过。先核旧断言，已有的引用确切
文件/title/断言行即可；确有新合同才建目标对应的 `.glm-leaf-wave.test.ts(x)`。
单组优先 4–10 个强断言测试；发现无合法新合同，短记 existing-proof/不可达并继续，不强行达到数量。
行号均为冻结时点，完整路径/候选文件见 targets.json。

| 批/组 | 目标与真实入口 | 本组窄合同（不要向整条业务链扩张） |
|---|---|---|
| A/G01 | `design-system/select.tsx:126` DsSelect | 已选/缺项/空列表/禁用项的显示与键盘选择、搜索后结果、Escape 与外部值改变；检验实际 onChange 值/焦点，不仅打开状态。 |
| A/G02 | `multi-select.tsx:6` DsMultiSelect | labels/count 摘要，按 label/value/description 过滤，过滤后全选不加禁用项，取消/清空与外部 value 更新；不重复旧的基本勾选例。 |
| A/G03 | `number-inputs.tsx:297/405/452` | 草稿输入提交/取消/空值/上下界、disabled/readOnly、键盘/stepper；实际值与提交次数，标签/错误关联。不要自创小数或取整政策，按当前 props 合同。 |
| A/G04 | `list-header.tsx:25`、`media.tsx:17/73` | 溢出菜单首个可用动作/禁用/关闭后焦点；缩放边界、fit/1:1 与回调参数。菜单与缩放是两个子族，不冒充同一个消费者。 |
| B/G05 | `navigation.tsx:40/256/306` | menu/toolbar 的 disabled、字符查找修饰键过滤、无命中、分组/隐藏文字可访问名与真实 execute 调用；不重排产品导航。 |
| B/G06 | `virtual-list.tsx:89/246` | 合法短/长列表的可见区、selection/active item、增删后焦点与滚动边界；用可解释尺寸/Raf 端口，不能只数空 DOM。 |
| B/G07 | `reorder.tsx:48/77/1249/1306` | 限定 reorderDsItems、可序列化相等、移动按钮和 useDsReorderKeys 的增删/重复值身份/越界；真实组件按键回调。**不承包 1,400 行整套 pointer drag 状态机**。 |
| B/G08 | `overlays.tsx:177/234`、`add-picker.tsx:58` | dialog/drawer 的关闭/焦点恢复、picker 查询/空态/disabled 项/确认实际 id；共享 DOM 门户必须在 finally 卸载，不 mock 掉浮层逻辑。 |
| C/G09 | `ImageAssetPicker.tsx:14/21/76/153` | catalog 按 kind 过滤、label/id 退回、空态与选择/清除值、禁用项；缩略图只测真实合法小图的最小成功/报错，不重做 Kimi 图像导入替换链。 |
| C/G10 | `MusicPicker.tsx:17/96/103`、`SoundPicker.tsx:24/31/205` | 类型筛选、label、选中/清空/disabled、未知 id 的明确表现；预览按钮只测端口协议，不声明音质、真实播放完整或底层解码。 |
| C/G11 | `PortraitEditor.tsx:115`、`ProjectAudioPreviewButton.tsx:34` | 立绘选择/无立绘/合法未知资源诊断与值回传；试听按钮成功/可见失败/停止三态，真实 promise 入场与卸载释放。不是 Kimi 的资源工作台乱序总链。 |
| C/G12 | `PanelResizeHandle.tsx:41/49/61/72`、`IsometricEditorToolbar.tsx:197` | 存储解析 finite/clamp/default、键盘 resize 的上下界/方向/回调；toolbar pressed/disabled/tool/zoom 传值，最小界面操作不改布局。 |
| D/G13 | `editor-target.ts:10`、`editor-navigation.ts:450/482/494` | 合法 state 中各域目标存在/缺席、sprite asset/definition 区分；URL 标准化/不相关 query/hash 保留/非法路由回退。当前版本，不新增旧 URL 兼容。 |
| D/G14 | `map-selection-overlay.ts:36/62` | 重复点去重、相邻共享边消去/孔洞边界；四 tone、画布外裁剪与 pan/zoom 后路径坐标；Canvas spy 只证绘制协议，另用指定浏览器例看真实画面。 |
| D/G15 | `MapSelectionInspector.tsx:37`、`StampPlacementSelectionInspector.tsx:50` | 只测当前两组件：混合值/读禁态、数值/映射回调的完整输入、取消/无提交。把公开 callback 当其边界，不冒充 Kimi 的 MapMode 提交/undo 总链。 |
| D/G16 | `StampContentEditor.tsx:79`、`StampTemplateDialog.tsx:27` | 合法小图章的字段/锚点/映射编辑、预览与取消、完成回传完整模板；旧纯计划已证则不复制。只做表单合同，不扩世界碰撞/资源替换。 |
| E/G17 | `PoisonTab.tsx:353` | 选择/空态、当前中毒条目字段修改、非法输入拒绝与撤销；当前生产 guard 合法毒表，不能发明效果字段。 |
| E/G18 | `VarsTab.tsx:64` | flag/number 新增/编辑/引用阻止删除，name/id/initial 边界与 undo；sys: 保留规则按现行守卫；数值/布尔类型不能互相冒充。 |
| E/G19 | `ShopTab.tsx:77` | 库存增删/重复选择/顺序/空项和拒绝反馈；真实 session 或组件明示回调的完整对象，不运行买卖经济系统。 |
| E/G20 | `ItemAlchemyTab.tsx:81/479/483`、`ItemAlchemyEditors.tsx:93/216/237` | crafting 与 spirit-gourd 两入口、当前唯一 owner/无 owner 的展示；配方/奖励行增删重排与取消的真实数据。只测配置，不重新推导炼丹随机/战斗公式。 |
| F/G21 | `BattleFieldTab.tsx:105` | 稳定条目选择、新增/修改/引用删除拒绝，背景/音乐清除与实际命令输出；不启动战斗、不改场景默认规则。 |
| F/G22 | `CasualtyEditor.tsx:67` | friendDeath/dying 槽和 gate/fallback 的切换/增删/外部 undo 回显；概率/台词/效果合法值与完整 actor 更新。只测作者表单，不执行战斗伤亡时序。 |
| F/G23 | `ScriptSceneHookInspector.tsx:64`、`ScriptBehaviorInspector.tsx:48/112` | 合法 hook/behavior selection 的摘要、空态、启用/禁用和公开编辑回调；按当前 schema 不强造私有 slot，不重做 ScriptEditor/PreviewCanvas 播放。 |
| F/G24 | `enemy-defeated-events.ts:79/665/714/745` | 合法事件的中文摘要与跳转身份、可编辑奖励的查找/替换及其余分支保真；明确哪些只读显示，不将文本投影冒充执行器副作用。 |
| G/G25 | `asset-diagnostics.ts:30/88`、`video-metadata.ts:50` | 资源诊断 title/kind/owner/path 的精确值；MP4 box 正常 soun/无音轨/非 MP4、扩展长度/截断。此 API 只扫描 box，不能宣称播放器接受伪媒体。 |
| G/G26 | `command-asset-record.ts:18/31/42/53`、`battle-data-references.ts:294` | record 字段单点差异、kind/path/bytes/头部拒绝；合法工程的引用结果稳定排序/归属。record guard 不校验 gzip 解码或真实 digest，不冒称它证明了 SHA 正确。 |
| G/G27 | `item-references.ts:299/448/533`、`script-references.ts:81/110/343` | 当前 canonical caller 的引用添加/移除/嵌套分支与输入深快照，索引返回完整 domain/owner/path；旧兼容分支未有真实调用不造输入硬打。 |
| G/G28 | `stamp-ownership.ts:80/182/191/231`、`stamp-placement.ts:124/144/152` | 合法地图的视觉/碰撞 owner、相连/隔离 flood-fill、冲突计划与 ID/高度边界；规划前后同一地图和参数保真。缓存内部/历史路径已有则引用，不读私有 WeakMap。 |
| H/G29 | `frame-sequence.ts:173/567/593` | **限定** index 校验、resolveFrameSequencePlayback、frameSequenceFrameDurationMs：开始/结束范围、默认/覆盖 fps/时长、合法 TPFS 小资源的空/越界拒绝。编码/块缓存异步流水线不在本组。 |
| H/G30 | `script-library.ts:127/152/278/291/317/343` | 当前 shard/library 公开索引、owner/body 查找和 authored upsert/remove 合同；实际被消费 library/parts 的前后深比较。不要重测历史版本或旧私有 tag。 |
| H/G31 | `world-variable.ts:42/67/104`、`stamp.ts:31/71/75` | 变量 guard/初始 flags-vars 分域且不泄露引用；合法图章 parse/format 往返、anchor/视觉实例必需项。旧守卫单字段拒绝已经有的只登记。 |
| H/G32 | `migration-diagnostic.ts:44`、`map-index.ts:25/40/94`、`tileset.ts:23/58` | sidecar 元数据校验不是迁移执行；map 稳定 id/path 规范化冲突、tileset id→asset 解析与错误上下文。只调用纯 API，不执行任何迁移/写盘。 |

## 固定做法：让大量小任务也可验收

每族按下面顺序走，**不要先写几千行故事型报告**：

1. 找当前公开入口和现有精确旧 title/断言。已有则一句 existing-proof；有差异才新增。
2. 用当前生产构造器/guard 先证合法正控；负输入由合法输入单点修改，或传入 API 声明的 unknown。
   不用 `as unknown as` / `any` / ts-nocheck / ignore 把非法业务 fixture 变“合法”。
3. 调用真实函数/组件。纯函数比较完整结果；输入保真对**实际消费的具名对象**先 structuredClone 后比较；
   原地可变合同要断言正确修改而非捏造不变。数组含非空哨兵，不只 length/truthy/callback 次数。
4. 表单到 session 的族用真实 EditSession/commands；组件只承诺 callback 的族可记录完整 callback 参数，
   必须标明只是委派边界，不冒称已保存入库。禁止 mock 被证明的核心实现/上游守卫或读私有状态。
5. 图像/音频资源正控必须可解码；窄 MP4 box 扫描器等单独明确解析层，不冒充可播放资产。
   异步小例用 entered + deferred，finally 释放实际 promise；不能以超时红、手写清理布尔当证据。
6. 若实际业务违反有依据的预期，把红例放本目录专用 diagnostics config（默认包测试不扫描），
   写正确预期/实际值/复跑命令/根因线索。交 Codex 修，不改预期凑绿；不阻塞其它独立组。

### 反控只做代表性强针，共用工具

每批选 2–3 个真正新增合同（全包约 16–24 针）；优先：A 禁用过滤/提交取消，B 边界移动/关闭恢复，
C 类型筛选/失败状态，D 同实参保真/预览坐标，E 引用拒绝/唯一 owner，F actor 更新/奖励替换保真，
G record 比较/规划保真，H 合法边界/分域不泄露。具体以当前源码和新测试为准，不能照表假造有该判断。

复用已接收的严判据形状，参考 [state-commands 工具](../glm-state-commands/tools/state-commands-mutants.mjs)
和 [Codex playback 工具](../codex-playback/mutants.mjs)；不得改这些原工具。
本目录可放一个批次/单针参数化 runner，避免八套重复判据。对照 exit0，反控必须恰 exit1、
指定绝对 test file/fullName 真执行、运行态唯一注入命中、候选业务 AssertionError；混错、timeout、
exit2/null、skip/零执行都 invalid。判据自测调用**同一个实际 judge**，不是另写近似谓词。
在隔离 loader/临时副本注入，不临时覆写 checkout 里的产品；产品 hash 前后不变。

## 六条简单视觉任务（A–F 各一条，G/H 不强行视觉）

使用自己的浏览器 profile、自己的端口与临时工程；测试资源先合法。可以在本目录建最小组件宿主，
需导入真实产品组件/样式/命令，记录是直挂组件还是完整 App，不互相冒充。
建议探测空闲 6066–6069 并 strictPort；不碰用户 6010、Kimi 6062–6065、游戏/E2E 服务，也不杀别人的进程。
资源缺失只读复制到临时副本，不用可写 symlink 指回主工程；不写源 projects/pal 或 data 目录。

| 批 | 精确操作小闭环 | 必须实际观察 |
|---|---|---|
| A | 多选框搜索一个非空词 → 全选过滤结果 → Escape → 重开；同时保留一个禁用项 | 结果/计数对应，禁用项未新选、焦点合理、弹层不裁切；不以截图猜内部数组 |
| B | 打开 picker → 键盘选可用项 → 关闭回触发器；再打开无结果搜索 | 值正确、空态、焦点/Tab 可用，无孤立浮层 |
| C | 图片选择一张合法小图 → 清除；拖/键盘缩放一条 panel handle 到边界 | 图像不是加载错误占位，选择和清除可见，分栏没有反向或溢出 |
| D | 图章表单修改锚点 → 预览 → 取消重开；overlay 的 selected/locked 用同一小选区 | 取消保留原值，轮廓/颜色/缩放视觉可辨；不声称完整 MapMode 提交已证 |
| E | 新增一个 number 变量 → 改初始值 → undo；flag 变量分别展示 | 实际 session 回显正确，字段布局和错误反馈无遮挡 |
| F | casualty 切 friendDeath/dying → 新增/取消或删除一门 → undo 回显 | 槽/选中/台词表单对应当前 actor，没有串槽；不是战斗触发验收 |

每条在 1440×900 和 1000×720 两种 viewport 看一次实际面板宽度，保留操作前后必要图即可。
截图/短视频存 `/tmp/type-pal-glm-leaf-workflows/`，回执保存全 SHA256、尺寸、URL、候选 SHA、
步骤/预期/实际及 console 错误。没有看图不得写“视觉通过”；环境确实不可用就如实登记 blocked。
不要求全主壳 360/mobile、不走剧情、不测音质、不生成替代美术，也不自作主张修 UI。

## 验证节奏：不要再次反复跑覆盖率

每组仅定向新增/相邻；每批结束时 typecheck、精确新增文件 Biome、docs/diff。
**D 结束**：editor 全包 + A–D 一次局部覆盖 before/after。
**H 结束**：editor/content 全包 + E–H 增量及 A–H 总并集的一次统一对照批次。
before/after 都用同源码及既有测试，两侧只差指定新增测试，不运行 Kimi 候选；
复用 `scripts/coverage/config.mjs` 的 package include/exclude 与 `testSelection(package, 'fast')`，
两侧 exit0、同分母，报告仅写 /tmp；配置/脚本可入本目录，官方统计配置/基线不动。
不把全包普通 test 与 fast 数量混减，不将 before 快照跨源码复用。

仓库根命令（替换明确文件列表/包名；不运行空文件过滤）示例：

```sh
env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor exec vitest run <本批包内相对路径> --maxWorkers=2 --reporter=json --outputFile=/tmp/glm-leaf-A.json
env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor typecheck
pnpm exec biome check <本批新增测试与fixture> docs/testing/glm-leaf-workflows
node scripts/docs/check.mjs
git diff --check
# D/H 批末才全包，H 涉及 content 也分别 test/typecheck
env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor test
```

缺依赖按 lockfile frozen 安装，不升级工具链。maxWorkers 控制在 1–2，勿与 Kimi/Codex 重门并发压机器。
lint/格式/typecheck **error/warning/info 全零**；已有诊断也不能报统一门通过，但无产品写权限时交 Codex 集中处理。
全仓 check、官方 ratchet、受保护 strict-fast、基线更新和集成收口由 Codex 执行，GLM 不补跑。

## 白名单与交付

- targets.json 的 49 个精确 newTest（只有确有新增合同才创建）。
- `packages/editor/src/ui/__tests__/glm-leaf-workflows/**`、`packages/content/src/__tests__/glm-leaf-workflows/**`。
- 本目录专属工具/fixture/browser host/diagnostics、`receipt.md`、`evidence.json`；targets.json 只读。
  README 的派发边界不改，仅在下方登记自己的交付。子目录含 Markdown 时补自己的 README。
- 禁止改任务卡/看板/公共索引、产品/旧测试、官方配置/依赖/基线、其他 Agent 新测试与 fixture。

回执不追求篇幅：每族一行“旧 title/断言 → 新差异/断言 → 正控/反控 → 归属”，已有/不可达/未证/真缺陷
明确分列。所有新标题/file/status 从新鲜 Vitest JSON 重建，不手填总数；实际视觉单独计，不混算单测。
每批给完整候选 SHA、基点、范围、复跑命令/cwd/退出码/零诊断、源 hash、截图 hash 和剩余事项。
发现单族难以确认，交最小反例后继续下组，不等用户帮跑；四组一个交付点，不等八批全完才报告。

## 交付登记

| 批 | 组 | 候选 | GLM 自验 | Codex 独立验收 |
|---|---|---|---|---|
| A | G01–04 | `codex/glm-leaf-workflows-r1` 248295eb（回执/登记见同分支下一提交） | 自验通过：定向 25/25、相邻 361/361、typecheck/Biome/docs 零诊断、判据自测 10 类+control 绿+2 针业务红、隔离视觉 3 图（端口 6066，已停） | pending |
| B | G05–08 | pending | pending | pending |
| C | G09–12 | pending | pending | pending |
| D | G13–16 | pending | pending | pending |
| E | G17–20 | pending | pending | pending |
| F | G21–24 | pending | pending | pending |
| G | G25–28 | pending | pending | pending |
| H | G29–32 | pending | pending | pending |

GLM 只填候选和本人自验列，不代填 Codex 结论、不合 main、不标 done；Codex 验收后统一集成推送及清理。
