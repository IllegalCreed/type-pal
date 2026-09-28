# Kimi 编辑器十二组真实工作流补测

[任务卡](../../ops/tasks/TEST-KIMI-EDITOR-WORKFLOWS-1-twelve-groups.md) ·
[冻结目标与精确新增测试路径](targets.json) · [上级](../README.md)

2026-09-28 Codex 派发，**build allowed：测试实施，不是只交审计报告**。
当前模式为 Kimi 实施 / Codex 独立接收；作者自验不替代独立证据。A/B/C 各四组，连续交付。
已准备工作树 `/Users/zhangxu/.codex/worktrees/kimi-editor-workflows/type-pal`，
分支 `codex/kimi-editor-workflows-r1`。如缺依赖，按当前 lockfile 做 frozen 安装，不升级依赖；
gitignored 资产不随 worktree 创建复制，先按下文准备自包含 fixture / 临时工程，再判断环境问题。
预计足够容纳约 100–160 条有意义回归，但不以用例数量或百分比验收：已有合同不再复制，
同一参数化族如实计数；实际可达性和净覆盖增量优先。

## 冻结与统计口径

生产 `29e76fe62070fb03bf2459cf95dc2a70ba0f2a0b`，官方 fast 为 9,746 测试 / 730 生产文件；
全仓分支 47,678/63,398（75.20%）。20 目标合计分支 4,723/7,124、行 5,028/6,727，
**缺 2,401 臂 / 1,699 行是选题空间，不是承诺可补数量，更不是已增加的覆盖率**。
本次只读既有正式 LCOV，没有重新运行覆盖盘点。逐目标 source hash / 同名旧测试初始清单见 targets.json。
同名清单不是完整去重结论：还要搜索跨组件、命令、fixture、历史 GLM/Cursor 的调用和断言。

## 批次与具体工作

每组先读目标函数、真实消费者、同名旧测试，再选择下表中尚未被断言证明的合同。下列是调查/实施范围，
不是凭空预设所有分支都可达。已证族登记确切 file + title + assertion 行和不重复理由即可。

| 批/组 | 实际目标与起读锚（冻结行号） | 优先新增业务合同与鉴别点 |
|---|---|---|
| A/K01 | `BattleSpriteLibrary.tsx:791/989`；`BattleSpriteInlinePreview.tsx:104` | 真实源帧追加/替换与共享 consumer proof；缩帧拒绝或合法修复的两侧、入库/undo 后 bytes/catalog/profile 一致；拖放合法帧与非法载荷零提交；旧异步预览不能盖新选择。已有简单改名/删用途/缩略图重试不重抄。 |
| A/K02 | `WorldSpriteLibrary.tsx:352`；`SpriteResourceViewer.tsx:291` | resource proof/实际帧数与现有用途的绑定；帧编辑后真实 reader 重读、共享用途保全与 undo；迟到读取/失败/切资源的归属。测试当前 sprite 定义与资源，不增加角色换装机制。 |
| A/K03 | `SpriteActionEditor.tsx:204/338`；`core/world-sprite-behavior.ts:436/497/527` | 当前合法动作 pose 的添加/删除/重排/取消到实际 session 状态；预览 cycle/variants/unavailable 的合法 caller，自动脚本定义/实例引用边界；不把无法唯一预览的分支伪装成循环。已有 wave2 私有树遍历不得再造旧 schema 凑臂。 |
| A/K04 | `TilesetTab.tsx:182/265/514` | 真 PNG 切格→真实量化/编码/入库；分页缩减与选中状态；被引用删除/替换的 fail-closed 与可用正控，实际 state/bytes/undo。已有名字/分类改动两次 undo 与深链聚焦不重复。 |
| B/K05 | `ImageTab.tsx:209/233/378/502` | 实际像素/尺寸/摘要的导入替换链，选择切换/取消/失败不污染新目标；实际 viewer 缩放/拖拽/键盘与资源生命周期。已有 PNG 导入/非 PNG 拒绝/取消删除零读不重抄。 |
| B/K06 | `CutsceneTab.tsx:430/433/537/552` | 帧文件队列增删/重排与真实导入顺序；frame/video metadata 切换与读取失败；异步生命周期中实时引用变化的拒绝/成功正控。已有视频魔数守卫和简单弹窗取消不重抄；不重做 FrameAnimationEditor 已完成的帧编辑功能。 |
| B/K07 | `AudioAssetWorkbench.tsx:371/837`；调用 `MusicTab.tsx:83` / `SoundTab.tsx:80` | 两个真实 wrapper 的策略连接，播放/seek/切选/卸载与 transport 所有权后果；替换/删除失败后的 selection/catalog/blob 保全。硬件端口替身只能证明协议，不宣称音质/解码保真；如声称格式则真实 parser。`audio-preview-session` 4/4 已证，仅复用。 |
| B/K08 | `ProjectWorkbenchTab.tsx:955/1066/1147/1889/2523`；`ConnectedEditorPages.tsx:121` | 工程页的 startup/entrypoint 真命令路径、入口引用与默认入口联动；队伍/库存/资源行编辑与撤销；checking/stale/current/failed 的实际可用性及错误反馈。当前我方 1–3 人；不得发明第四人能力或重开全局保存机制。 |
| C/K09 | `SkillTab.tsx:896/1011/1048`；`LevelCurveEditor.tsx:21/28/56/114` | 技能用途/引用变化下的表单提交、失败保真与撤销；曲线绘图交互、缩放/改级数到实际数组的边界，与已有纯函数测试分开。两组件是同批独立子族，**LevelCurveEditor 当前由 ActorMode:527 调用，不宣称它嵌在 SkillTab 中**。 |
| C/K10 | `ItemTab.tsx:666/1150`；`ItemUseEffectEditor.tsx:211/1218/1499` | 物品当前私有脚本 owner/身份与效果链，增删重排、取消和完整输出；use/throw 非空合法正控，实际被消费输入深比较。旧前缀不得复活；已有配方自材料消耗守卫/默认效果纯逻辑不复制。 |
| C/K11 | `EnemyTab.tsx:539/738/753`；`EnemyTeamTab.tsx:104` | 敌定义编辑/删除引用证明、真实 callback/命令结果；敌队五语义槽空洞/重排/共享敌引用/删除失败与 undo，汇总依据实际敌人/奖励。保持敌方五槽、我方三人；不测一场实际战斗冒充表单合同。 |
| C/K12 | `MapMode.tsx:1327/1711/1901/2167/2619`；`SceneCanvas.tsx:494/592/615`；`scene-stage.ts:100/386/403` | 地图真实 UI 选区→预览→冲突拒绝/覆盖→undo；revision/permission 拒绝时完整地图/clipboard 保全与可提交正控；指针取消/anchor 移动、zoom/pan 坐标与迟到场景资源归属。以 editor 正常指针/按键为入口，不能只重复 Cursor 已证纯计划函数；不改运行时碰撞。 |

每批四组完即提交推送，回执登记固定 SHA，继续下一批。不因某族政策未定或真 bug 暂停整个队列。
已验收批次的新测试语义不随意回改；若确需共享 fixture 修订，列受影响旧批并全复跑。

## 实施纪律（避免再做十轮材料返工）

1. **先读旧断言，再落新测试**。小表记录“旧 file/title/断言行 → 本族还缺什么 → 新 title/断言行”。
   不要先写长报告；用测试和证据更新一份现行回执，不保留互相矛盾的正文。
2. **真实入口**：组件 DOM/公开 hook/callback 必须到真实 EditSession/commands/reader；
   不能 mock 被证明的核心函数或读取私有栈。仅浏览器硬件端口可替换，明确观测范围。
3. **合法输入先行**：工程、catalog、script、sprite 用当前生产构造器/guard；合法路径无强转、
   无 ts-nocheck。PNG/RLE/gzip/WAV 使用真实可解码小资源；catalog SHA/bytes/尺寸须与实际内容一致。
   不能只写 PNG 签名或让 toBlob 固定返回与 canvas/putImageData 无关的假产物。
4. **同一输入/结果**：保真断言调用前深快照、调用后比较实际消费对象；表单本来允许 mutate 的
   draft 不硬造不变合同。assert 完整关键数组/对象、非空结果及 catalog/blob/undo，不仅 callback 次数。
5. **异步有进入和退出见证**：用 deferred 的真实 entered/read/dispatch 轨迹，严格区分未开始与在途；
   finally 放行并消费原 promise，保留最初异常身份。不能靠 timeout 证明取消、用不同 root 证明同实例归属。
6. **反控**：每组至少一个有意义单点；K01/K02/K04/K07/K12 优先两点。实际运行待证明的新用例，
   钉绝对文件、fullName、实际执行数、唯一注入命中与候选 AssertionError。恰 exit1 才是业务红；
   exit2/null、环境错误、混入普通 Error、timeout、未运行/skip 均 invalid。判据自测调用真实 judge，
   不另写“等价谓词”。注入仅用隔离 loader/临时副本，不临时改写工作树产品；前后 hash 一致。
7. **真缺陷**：正确预期的红例放本目录 diagnostics，由专用 config 显式运行，不能污染正式默认套件。
   回执写触发链、期望来源/实际值、最强替代解释；Codex 独立修产品。不能改预期/skip/ignore 来报绿。
8. **停止线**：新 schema、资源格式/保存政策、换装、游戏数值或产品取舍均未授权。
   `EDITOR-SCENE-FACING-1` 已知红另归 Codex；本卡不顺手修或重复报成新发现。

## 隔离视觉：发挥能力，但只做有用取证

- 每批至少两条与新合同对应的闭环（例如替换→保存于临时项目→重读、取消→状态不变、修改→undo），
  不是只打开页面截图。至少覆盖一次宽工作区与一次窄工作区（建议 viewport 1440×900 / 1000×720，
  同时报面板实际宽度）；看焦点/错误提示、禁用态、选中项、溢出和操作完成后的画面。
- 用自己的 dev server、独立 browser profile 和临时项目副本。先核端口，建议 6062–6065 中空闲端口，
  strictPort；不能杀别人的服务，不碰 6010、6005、6050 或 E2E 专用服务。
  不往源 `projects/pal`、data/raw/extracted、迁移基线写盘。资源不足可从主树**只读复制**到临时副本，
  不用可写符号链接把临时工程写回主树。
- 允许在本目录搭小型浏览器宿主，但须挂真实组件/当前 guard 合法工程和真实 commands；
  记录直接组件宿主还是完整 App 入口，不能冒充另一种证据。
- 截图/短视频保留于 `/tmp/type-pal-kimi-editor-workflows/`，回执记录完整 SHA256、尺寸、URL、
  候选 SHA、动作/预期/实际、console 错误。实际看图后才写结论；缺浏览器能力/资源则如实 blocked。
  AI 生图、UI 重设计、音频听感、完整 360 主壳/剧情 E2E 不在本卡范围。

## 本地验证与覆盖频率

遵循仓库 pnpm/Vitest 当前配置，不升级依赖。环境需要去掉 agent 注入缓存时使用 `env -u NODE_COMPILE_CACHE`，
不更改全局 Node 设置。下面命令从仓库根执行，测试相对路径取 targets.json 的 newTest 去掉 packages/editor/。

```sh
env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor exec vitest run <本批测试相对路径> --maxWorkers=2 --reporter=json --outputFile=/tmp/kimi-editor-A.json
# 相邻测试按真实旧调用域单独列；每批末完整 editor 包，不与其它重门并发
env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor test
env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor typecheck
pnpm exec biome check <本批新增测试与fixture> docs/testing/kimi-editor-workflows
node scripts/docs/check.mjs
git diff --check
```

所有静态门必须 error/warning/info 全零；不能以 exit0 或“既有警告”当通过。
反控脚本必须有单针模式，成功/invalid 都输出机读 summary；JSON 数量从新鲜执行报告重建，不手填。

**不逐例跑覆盖率。** A/B/C 三批全做完后统一一次本包 before/after：复用
`scripts/coverage/config.mjs` 的 editor source include/exclude 和 `testSelection(editor, 'fast')`；
before 仅排除本卡新增测试，after 包含它们，两侧产品相同、既有测试相同、生产分母相同、exit0。
并列 20 目标小计与 editor 全包增量，不能用所有测试口径同官方 fast 硬减。
本目录可放独立对照 config/脚本，报告输出 /tmp；不写官方 coverage 基线，不用 stash 删除旧测试。
冻结 LCOV 仅选题，不直接拿作未来候选的 before；同时列新增合同数和真实净增分支，拆开视觉证据。

全仓 check、官方 ratchet、受保护 strict-fast、最终基线并集归 Codex，Kimi 不补跑。

## 交付结构与白名单

- 精确新测试 20 路径：见 targets.json 的 newTest，允许只在确有新合同的目标创建文件。
- fixture：`packages/editor/src/ui/__tests__/kimi-editor-workflows/**`；仅本卡辅助，不引入第二套产品实现。
- 本目录：新增 `receipt.md`、`evidence.json`、反控/对照工具与必要专属 fixture/browser host；
  子目录 Markdown 须有 README。targets.json 不改，主 README 的派发要求不改；现行交付登记可追加。
- 产品、旧测试、共享配置/依赖/锁/基线、任务卡/看板/公共索引不改；需要扩范围先交具体理由给 Codex。

回执逐族只保留必要字段：组/当前调用与 guard/旧标题和断言/新标题和业务断言/正控与针/结果/归属。
机器账须能从 JSON 找到每个新测试的 fullName/file/status；既有证据、不可达、未定政策、真缺陷、视觉未证分开。
每批提供候选 SHA、完整命令与 cwd/退出码、零诊断、生产 hash、图片 hash 与剩余项。
最终发给 Codex 的接收提示只需指出卡、候选、批范围、新风险和复跑命令，不要求用户手工验证。

## 交付登记

| 批次 | 范围 | 候选 | Kimi 自验 | Codex 独立验收 |
|---|---|---|---|---|
| A | K01–K04 | pending | pending | pending |
| B | K05–K08 | pending | pending | pending |
| C | K09–K12 | pending | pending | pending |

Kimi 只更新候选和自己的自验列，不能代填 Codex 结论或标 done。无需 Kimi/GLM/Grok 互审或恢复三席。
