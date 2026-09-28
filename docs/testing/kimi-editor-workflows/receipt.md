# TEST-KIMI-EDITOR-WORKFLOWS-1 交付回执

状态：三批全部实施完成并推送候选，等待 Codex 独立验收与集成。
分支 `codex/kimi-editor-workflows-r1`；开工提交 `3925980c`；生产冻结 `29e76fe6`。
**20 个目标源 + audio-preview-session 共 21 个产品文件 sha256，开工核与收口核均与
[targets.json](targets.json) 冻结值一致（21/21），本卡全程零产品改动、零旧测试改动。**

> 2026-09-29 返工修订（对应卡面「Codex 独立审核返工项」四条）：
> 1. evidence.json 已按 Biome 格式化重建；`pnpm lint` 全仓 2443 文件 0 errors/0 warnings/0 infos。
> 2. 反控 runner 已修：模块名先按 cwd 再按本目录解析（卡面裸文件名命令可复跑）；判据抽为
>    `counter-control/judge.mjs` 唯一 `judgeRun`（新增：失败记录绑定声明测试文件绝对路径、
>    pending/todo/skip 拒绝、空 failureMessages 拒绝、AssertionError 首行 timeout/混错拒绝——
>    首行判定避免 vitest 定时器堆栈帧误伤）；`counter-control/selftest.mjs` 以同一判据做 17 例
>    方向自测（全过）。A/B/C 三模块全量复跑：**27 红 + 20 控制 = 47 全 valid、0 invalid**
>    （另有 2 枚初版惰性针按废弃登记，见批C节）。
> 3. B2 告警归因更正：来源是宿主 `browser-host/main.tsx` 的非法 JSX 属性 `class=`（非产品侧），
>    已改 `className` 并复开同页复核 console 0 errors/0 warnings（见批B节）。
> 4. 合法 fixture 类型安全化：`k10-fixtures.ts` 两条不必要桥接强转删除（CurrentAuthorContent 与
>    ScriptEditorState 字段类型本就一致）；`EnemyTeamTab.kimi-workflows.test.tsx` 两条 onDefeated
>    强转改为经生产守卫 `checkEnemyOnDefeatedCommands` 定型；kit/k05/k06 的 `@ts-expect-error`
>    Node 桥接改为显式端口声明 `__tests__/kimi-editor-workflows/node-port.d.ts`
>    （类型化 createRequire 映射取得 Blob/Buffer/webcrypto/canvas，零压制；刻意不声明
>    'node:buffer'/'node:crypto' 模块本体，既有旧测试桥接行不受影响）。无遗留公共类型债。

| 批次 | 范围 | 候选 SHA | 新测试 | 反控 | 浏览器闭环 |
|---|---|---|---|---|---|
| A | K01–K04 | `04ed4823` | 40 | 10 针 valid-red + 7 控制 | 2（宽/窄） |
| B | K05–K08 | `524d1930` | 34 | 8 针 valid-red + 4 控制 | 2（宽/窄） |
| C | K09–K12 | `e838ca30` | 43 | 9 针 valid-red + 9 控制（2 枚惰性初版针已废弃替换并标注） | 2（宽/窄） |

合计 117 例新测试，全部真实入口（组件 DOM/公开 callback → 真实 EditSession/commands/
EditorAssetReader/loader；无 vi.mock 被测核心、无私有栈、无 ts-nocheck、无「工程」字样），
全部合法 fixture（blank seed 真实装载链 + 生产构造器播种；catalog bytes/sha256 与实际字节
一致；PNG/RLE/gzip/WAV/MIDI 真实可解码）。机读证据：[evidence.json](evidence.json)。

## 统一静态门（三批复跑，cwd=工作树根）

- `env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor typecheck` → exit 0（零输出）。
- `pnpm exec biome check <全部新增测试与夹具> docs/testing/kimi-editor-workflows/` →
  error/warning/info 全零（多次复跑，最终 `Checked N files. No fixes applied.`）。
- `node scripts/docs/check.mjs` → `docs: PASS (0 issues)`。
- `git diff --check` → exit 0。
- 批末 editor 全包 `pnpm --filter @type-pal/editor test`：A/B/C 三次均**仅剩 2 个环境性旧例红**
  （`tests/world-sprite-behavior.pal.test.ts` 读 `projects/pal/assets/migrated/sprites/*.rle`，
  该 gitignored 资产不随 worktree 创建复制；与本卡 diff 无因果关系，主树有资产时不受影响）。
  三次全包测试数：3339 / 3373 / 3416（本卡 117 例全部在内且全绿）；2026-09-29 返工后复跑
  3414 通过、同样仅剩该 2 条环境性旧例。
- `pnpm lint`（scripts/quality/lint-zero.mjs）：2026-09-29 复跑 **2443 文件 0 errors/0 warnings/0 infos**。

## 批A K01–K04（候选 04ed4823）

**K01 BattleSpriteLibrary.kimi-workflows.test.tsx（6）+ BattleSpriteInlinePreview.kimi-workflows.test.tsx（3）**
当前调用与 guard：DataMode 战斗精灵库 → commitRawFrames（源帧编码/gzip/sha/ReplaceBattleSpriteAssetCommand
含 proof/repairs）、replaceAsset 缩帧 fail-closed、onPlayerStageDrop 载荷校验、InlinePreview alive 归属 +
proof 绑 asset+sha256。旧断言：同名 .test 全程 mock InlinePreview/Uploader + `{} as never` reader
（L576 已证合法拖放到草稿、L654 mock 缩帧收紧、L664 敌人分段文本）；glm 已证改名+undo、删除用途命令。
新增（缺口）：真实 PNG 图集导入精确落账（catalog/bytes/sha/定义+undo/redo 对称）；新增用途过真实解码门
+替换单帧双用途 proof（confirm 取消零提交）；追加帧真实切格量化与双用途保全；删除帧敌人分段 ABI 修复
（取消零提交）；替换共享帧源缩帧拒绝/增帧原子替换；非法载荷三例零提交+合法落槽提交。
InlinePreview：迟到解码不盖新选择（gatedFileSource 磁盘闸门进出双见证）；record 缺失/kind 不符
fail-loud 不冒充加载中；profile 期望不符真实拒绝与空态。
反控：k01-alive-guard（InlinePreview alive 闸）、k01-shrink-repairs-dropped（缩帧 repairs 掏空）均 valid-red。

**K02 WorldSpriteLibrary.kimi-workflows.test.tsx（6）+ SpriteResourceViewer.kimi-workflows.test.tsx（5）**
旧断言：库 .test/glm 用 mock proof=20（四向永不禁用、默认帧数恒 3）+ mock viewer；viewer .test 全程
mock loadEditorSprite/bakeFrame。新增：proof 绑真实帧数（在途禁用/floor(帧数/4)）；不足 4 帧四向禁用与
定格用途不动 catalog；布局编辑+源帧追加串联重读（max 绑新帧数、过期 proof 被命令层拒绝）；迟到读取归属
（库级与 viewer 级两条）；磁盘字节损坏 fail-loud 与缓存驱逐重试；删除未使用源资源磁盘捕获 undo 字节；
追加/替换/删除源帧共享用途逐字段保全与姿势修复事务原子提交；四向前缀删帧被真实规划器阻断。
反控：k02-framesperdir-ceil、k02-append-drops-existing 均 valid-red。

**K03 SpriteActionEditor.kimi-workflows.test.tsx（7）+ world-sprite-behavior.kimi-workflows.test.ts（7）**
旧断言：Dialog 系列只走 onCommitPoses 覆盖路径/焦点标题；wave2 已证私有树遍历（不重复）。新增：
空用途连续新建落 session（越界回退帧 0）；删除 confirm 取消零提交与 order 重排；前后移边界禁用；
循环开关/起点、步骤插入删除迁移 loopFrom；同步音效 cue 增改删不动 catalog；真实引用边（实体页
animation）阻断删除与查看引用。core 侧：同资产多定义分组与帧序合并计数、六类引用 owner 归属边界、
无 auto 布局分类（loop/directional）、缺实际帧数不伪装 cycle、chance 超预算截断披露、canonical 投影
边界、未知 actor 跳过。反控：k03-delete-confirm-bypassed / instance-count-not-merged /
bounded-note-dropped 均 valid-red（另附独立脚本 k03-mutants.mjs）。

**K04 TilesetTab.kimi-workflows.test.tsx（6）**
旧断言：.test/glm 均 vi.mock 掉 palette/tileset loader 与 canvas，未触上传链；阻断用合成 mock 地图。
新增：真 PNG 切格量化编码入库（record 全字段/逐帧 toEqual/undo/redo）；130 帧分页与缩减夹回首页、
取消零提交；真实 scanner 下被引用删除 fail-closed+未引用移除正控；替换越界缩帧双重 fail-closed 与
增帧正控；共享定义替换 confirm 两侧；替换竞态守卫（磁盘闸门在途改写 → fail-closed 保草稿，重试成功）。
反控：k04-page-clamp-dropped / oob-map-guard-opened / replace-race-guard-dropped 均 valid-red。

浏览器闭环（宿主 :6062，直接组件宿主+真实 writeProject 序列化链，证据 hash 见 evidence.json）：
- A1 宽 1440×900 `?component=battle-sprite-library`：真实浏览器 PNG 解码 10 帧 → 导入落账
  （authored record/bytes/sha + 定义）→ 保存 17 文件 → 重读持久化 → undo 移除 → redo 恢复。
  截图 loopA1-imported-wide.png。
- A2 窄 1000×720 `?component=tileset`：真实切格向导（将切出 4 块瓦片）→ 入库 → 保存/重读 →
  移除未引用新集（确认移除）→ undo 还原。截图 loopA2-tileset-wizard-narrow.png /
  loopA2-tileset-restored-narrow.png。console 仅 favicon 404。

## 批B K05–K08（候选 524d1930）

**K05 ImageTab.kimi-workflows.test.tsx（9）**
旧断言：glm U3b 已证导入/非 PNG 拒绝/取消删除（假 PNG 字节+mock 2×2 解码），不重复。
新增：真实像素/尺寸/摘要导入与 undo/redo；同字节 -2 后缀与真实资源间切换零提交；替换链保留 label
真实换字节与撤销物化可解码；损坏 PNG/尺寸守卫失败不污染；战场背景评审链（索引图合同 R=G=B、
色盘重映射、object URL 回收）；viewer fit 几何/键盘/滚轮/工具条缩放与拖拽平移；切选迟到解码归属
+bitmap/URL 零泄漏；删除真实资源 undo 字节级还原。
反控：k05-replace-label-dropped、k05-pan-direction-inverted 均 valid-red。

**K06 CutsceneTab.kimi-workflows.test.tsx（8）**
旧断言：视频魔数守卫/简单弹窗取消已证（不重复）；FrameAnimationEditor 一律 mock。新增：乱序帧队列
自然排序+按钮重排/排除后创建 TPFS（帧序=队列序可鉴别）；空选择不开窗/排除到空自关窗零提交；尺寸不齐
创建失败保真与重试；替换帧动画同 AssetId 换字节+量化生效+undo 还原旧字节；视频 metadata 真实容器
解析与切换在途重置（音轨有/无、objectURL 建立回收）；读取失败只伤当前资源；删除在途实时引用
fail-closed 与解除后删除；真实 FrameAnimationEditor metadata 进检查器互切。
反控：k06-queue-order-dropped、k06-delete-in-use-bypassed（命令层单点）均 valid-red。

**K07 AudioAssetWorkbench.kimi-workflows.test.tsx（8）**
旧断言：AudioAssetWorkbench.test/glm 全 mock transport；audio-preview-session 4/4 仅复用。
新增：MusicTab/SoundTab 真实 wrapper 策略连接（空目录接线/accept）；真实 .mid 解析时间轴（spessasynth
parser）+undo/redo+无硬件降级；-2 后缀与非法拒绝选择保全；真实 .wav 经真实 RIFF/PCM 解析出峰值时间轴；
播放/时钟/seek/暂停/自然结束协议后果与单一预览所有权转移；播放中切选停止不销毁 transport、卸载 dispose；
替换非法 WAV 全保全零提交；删除生命周期（取消/引用阻断禁用/解除后成功+undo 字节级）；删除在途磁盘
读取失败错误身份透传。硬件端口替身仅协议级（注释声明，不宣称音质）。
反控：k07-music-id-collision、k07-previous-bytes-dropped 均 valid-red。

**K08 ProjectWorkbenchTab.kimi-workflows.test.tsx（9）**
旧断言：ProjectWorkbenchTab.test 只证行 DOM/打开动作，从未触发命令链；ConnectedEditorPages 从未渲染
ConnectedProjectWorkbench。新增：startup 角色绑定/解绑真命令与计数联动；entrypoint 标签/起始场景/
入口视频原子提交；新增入口默认深拷与删除回选；队伍/金钱/种子 HP/开局状态/移出重加单命令可撤销
（blank 仅 hero，不发明第四人）；库存/世界资源行增删改过保存门；概览改名空名守卫；诊断三态与
入口视频联动（悬空角色绑定问题计数+保存门 toThrow）；advanced 三态不冒充健康；ConnectedProjectWorkbench
derived 发布驱动 checking→current→stale→failed→恢复。
反控：k08-entry-patch-dropped（4 例同区域红）、k08-derived-issues-emptied 均 valid-red。

浏览器闭环：
- B1 宽 1440×900 `?component=image`：真实 PNG 导入立绘（mediaType/bytes 精确）→ 保存/重读 →
  viewer 800% 缩放（工具条/适合/1:1）→ undo。截图 loopB1-image-imported-wide.png。
- B2 窄 1000×720 `?component=sound`：真实 WAV 导入 → 真实 AudioContext 解码（0:00.50 时长、
  PCM 波形渐弱可见）→ 播放时钟走到 0:00.27 → 保存/重读 → undo。截图 loopB2-sound-playing-narrow.png。
  初版 console 曾有 favicon 404；集成时宿主补内联空 favicon 后消失。曾观察到一条 React `Invalid DOM property 'class'`——初版回执误记为
  产品侧；一手来源实为宿主 `browser-host/main.tsx` 的 `<div id="kimi-workbench" class="body">`
  非法 JSX 属性。已改 `className` 并在 2026-09-28 复开同页复核：console 0 errors / 0 warnings。

## 批C K09–K12（候选 e838ca30）

**K09 SkillTab.kimi-workflows.test.tsx（4）+ LevelCurveEditor.kimi-workflows.test.tsx（5）**
旧断言：SkillTab.test/glm 已证无引用删除+undo 与 canonical learnSkill 阻断；LevelCurveEditor.test/
ui.test 只断 length 与渲染。新增：引用在途面板真实字段+删除禁用+表单照提交+真实命令解除后放行；
渲染期索引落后时 live oracle 阻断精确 notice 与保全；新建 prompt 取消/空白零提交与 id 递增缺省落账；
删除选中回退两方向+undo 索引还原。曲线侧：拖点在途草稿/松手单命令恰一步；钳 0 警告/外推扩量程/
回拖原值与无移动零提交；滚轮锚点缩放与平移只调视窗（canonical 零变化）；改级数外推/截断/越界守卫；
按增量生成与点选精调、学技能标记。反控：k09-delete-fallback-reversed、k09-commit-double-dispatched
（4 例同区域红）均 valid-red。（初版 k09-noop-drop-committed 惰性：commit 等值守卫先短路，已替换。）

**K10 ItemTab.kimi-workflows.test.tsx（4）+ ItemUseEffectEditor.kimi-workflows.test.tsx（5）**
旧断言：配方自材料消耗守卫/默认效果纯逻辑已证（不复制）；链操作只到回调捕获。新增：能力开关合法
默认 UseSpec/ThrowSpec 深值与保存门；删除确认取消零提交；添加私有脚本的壳 runtime ref/canonical 身份/
通知/序列化落盘全输出与配对撤销、缺协调器拒绝；双物品 owner 隔离；关闭使用配对删除私有脚本+通知；
效果链增/改类/字段/重排/删除逐步落库；独占场景钩子锁 target 与 battleOnly 摘除；可复用脚本 runtime ref
消费；解毒/施毒改选；投掷字段族耦合与末条删除守卫。旧前缀未复活（__author-item-private-runtime 全等断言）。
反控：k10-private-script-leftover、k10-scene-target-unlocked 均 valid-red。

**K11 EnemyTab.kimi-workflows.test.tsx（6）+ EnemyTeamTab.kimi-workflows.test.tsx（6）**
旧断言：EnemyTab.test/glm 已证创建存在/改名、live oracle 阻断；EnemyTeamTab.test 只键盘 swap 与静态
totals。新增：无 enemy profile 禁用守卫+CompositeCommand 模板深值与递增；共享槽位计数→逐处解除→
删除回退链；AI 规则行全字段每步单命令；UI 创建变身/召唤实时引用联动删除门禁；战斗音效 SoundPicker
选择/清除/打开回调；击败后奖励编辑保留旁事件与摘要刷新。敌队侧：空洞保留/尾部裁剪/汇总联动；上移下移
按钮交换与通报、首槽边界；新建预选 id 与空/重名守卫 notice；场景引用阻断→解除→删除回退→undo 全链；
结算汇总跟踪真实敌人变更；目录搜索。敌方五槽、我方 hero 单角色现状未改。
反控：k11-new-enemy-template-drift、k11-trailing-slot-kept（2 例同区域红）均 valid-red。

**K12 MapMode.kimi-workflows.test.tsx（5）+ SceneCanvas.kimi-workflows.test.tsx（4）+ scene-stage.kimi-workflows.test.ts（4）**
旧断言：MapMode.test/catalog-coverage 已证整组移动弹窗与 mock 资产族；纯计划函数族（map-transform/
stamp-group-transform）未经 UI；SceneCanvas glm 一律 layers.entries:false 且 zoom mock；scene-stage.test
mock loader。新增：cells 选区→复制→粘贴预览→越界拒绝→冲突弹窗返回调整→覆盖粘贴→undo 全链（视觉+
碰撞通道精确、源格不动、选区跟随、剪贴板复用正控）；预览中锁定/隐藏层 Enter permission 拒绝零写+
剪贴板保全+解锁可提交；组合放置 plan 级层锁拒绝与解锁放置；整组移动预览期间外部改写过期拒绝与重做；
Cmd+A 真实计数/Delete/不变粘贴分支/指针 cancel 零提交。画布侧：默认/命名落点拖动提交真实命令与取消
零提交；真实解码精灵帧命中盒拖动 MoveEntityCommand；滚轮缩放锚格不变与平移后坐标精确、下限夹回；
磁盘回退迟到归属；stage 侧滚轮精数/预览模式/useSceneAssets live 引用换与 catalog 换字节重载/磁盘回退
失败 error 态。反控：k12-zoom-floor-raised、k12-pointer-cancel-committed（2 例同区域红）、
k12-overwrite-bypassed（3 例同区域红）均 valid-red。（初版 k12-stage-alive-guard 惰性：第三次同资源
effect 顺序完成已覆盖迟到结果，已替换。）

浏览器闭环：
- C1 宽 1440×900 `?component=map`：选择工具拖框 3 视觉槽 → Cmd+A 全选 288 计数真实 → 全图粘贴
  越界拒绝零写 → 小选区粘贴预览锚点 r10:c5 · 3 处冲突 → 冲突弹窗 → 覆盖并粘贴入账（历史前进、
  通知精确）→ undo。截图 loopC1-map-pasted-wide.png（等距地图真实渲染+选区高亮+所选内容缩略图）。
- C2 窄 1000×720 `?component=levelcurve`：拖点向上在途历史不变 → 松手单命令物化 expTable
  （[0,5365,55,…]）→ 回落警告真实显示 → undo 复原 → redo 重现。截图 loopC2-curve-warning-narrow.png。

## 统一 before/after 覆盖对照

工具：[coverage-compare/compare.mjs](coverage-compare/compare.mjs)（复用 `scripts/coverage/config.mjs`
的 editor include/exclude 与 `testSelection(editor,'fast')`；before 仅额外排除
`**/*.kimi-workflows.test.*`，after 原样含本卡测试；`TYPE_PAL_COVERAGE_PROFILE=fast`、v8、
均 exit 0；不写官方基线）。两侧运行：before 383 文件 / 3137 测试全绿；after 403 文件 / 3254 测试全绿；
生产文件 census 两侧 0 缺失 0 越界。**before 侧 20 目标小计与冻结 LCOV 完全一致**
（5028/6727 行、4723/7124 分支），口径互证成立。

| 口径 | before | after | 增量 |
|---|---|---|---|
| 20 目标行 | 5028/6727 | 5857/6727 | **+829**（选题空间 1699 的 48.8%） |
| 20 目标分支 | 4723/7124 | 5474/7124 | **+751**（选题空间 2401 的 31.3%） |
| editor 全包行 | 24623/28827 | 25623/28827 | **+1000** |
| editor 全包分支 | 21621/28484 | 22483/28484 | **+862** |

逐文件增量见 /tmp/type-pal-kimi-editor-workflows/coverage-compare.json（全部 20 文件行/分支双正增；
最高 BattleSpriteLibrary +117 行 +81 臂、TilesetTab +89/+79、ImageTab +90/+78、SceneCanvas +76/+71）。
117 例新合同与净增行/分支对应；视觉证据与覆盖增量分列（见上各批节与 evidence.json）。

## 剩余项与边界声明

- 2 个 `tests/world-sprite-behavior.pal.test.ts` 旧例在本 worktree 因缺 gitignored 迁移资产而红，
  与本卡无关；主树/Codex 环境不受影响。
- ~~sound 场景一条 `Invalid DOM property 'class'` console 警告~~：来源已查明为本卡宿主 JSX 的
  `class=` 属性（非产品侧），已修 `className` 并复核 console 归零（见批B节）。
- 浏览器宿主为**直接组件宿主**（非完整 App 入口）；磁盘为内存 FSA 端口替身；壳层授权/journal
  属平台原生持久化件（核心保存测试亦以 store mock 覆盖），宿主取证组件→serialize→写盘→重读段。
- 未发现真缺陷；diagnostics/ 未创建。无 skip/无改预期凑绿。
- 官方全仓 check、ratchet、strict-fast、基线更新与 main 集成均由 Codex 执行；本卡不代签不标 done。
