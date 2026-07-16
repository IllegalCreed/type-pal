# A7-0A - 标题菜单音乐角色与删除保护

Status: review
Phase: phase2
Capability: A7 / X2
Coding Owner: Codex
Generation Owner: N/A
Reviewer: both
Visual Verification Owner: Codex + User
Unavailable Agents: none
Branch: main

## 目标

把标题菜单“新的故事 / 旧的回忆”的原版背景音乐纳入工程资源真值：PAL 工程通过
`manifest.assets.roles.audio.openingMenuMusic` 绑定 `music.pal.004`，Reforge 标题菜单按角色播放并在离开菜单时
可靠停止，编辑器音乐页把它标为“标题菜单音乐”并禁止误删。

## 范围

- 范围内:
  - content 的封闭 `AssetRole` 新增 `audio.openingMenuMusic`，kind 固定为 `music`。
  - PAL 迁移器、v2 本地工程升级和 `projects/pal/manifest.json` 统一绑定 `music.pal.004`。
  - Reforge `?menu` 标题菜单显示期间播放该角色，选择新游戏或读取进度后先停止菜单音乐。
  - typed 引用收集、闭包校验、编辑器引用详情和删除保护覆盖新角色。
  - 修正文档中“音乐角色恰四个 / 无第五个角色”的过时结论。
- 范围外:
  - Splash/商标画面音乐 `music.pal.005`；本卡只处理用户明确指出的“新的故事 / 旧的回忆”标题菜单。
  - 游戏内 ESC 主菜单、战斗行动菜单和系统菜单；这些菜单沿用当前场景音乐。
  - MIDI 内容、音色、音量、淡入淡出参数调整。
- 明确不做:
  - 不在 Reforge 运行时代码硬编码数字 `4` 或 `music.pal.004`。
  - 不用“删除按钮特判 004”代替资源角色和引用闭包。
  - 不恢复 `content/music.json`、数字 `musicId` 或 AssetId 推路径。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `docs/phase2/READ-FIRST.md`：第二阶段只认新版内容模型，一阶段实现是忠实还原的 UX/机制真值。
  - `docs/ops/tasks/A7-0-resource-closure-registry.md`：音乐只经 catalog + AssetId + 封闭 roles；引用存在才允许删除保护。
  - 用户 2026-07-16 明确指出：这里的“主菜单”是“新的故事 / 旧的回忆”标题菜单。
- 代码锚点(`file:line`):
  - `packages/game/src/shell/bootstrap.ts:1749-1752,1917-1926`：一阶段两条回标题路径均明确播放 track 4。
  - `packages/game/src/shell/bootstrap.ts:1782-1788`：选定菜单项后先停菜单曲，且必须清掉尚在异步初始化中的补播记账。
  - `packages/reforge/src/main.ts:409-429`：Reforge `?menu` 当前只画 FBP 2 和菜单，没有播放/停止 BGM。
  - `packages/content/src/asset.ts:27-40,205-229,270-282`：封闭角色、角色 kind 校验和 typed 引用收集。
  - `packages/migrate/src/pal-assets.ts:19-24`：PAL 音频角色唯一迁移生成入口，目前漏 track 4。
  - `packages/editor/src/core/upgrade-local-v2.ts:109-123`：v2 本地工程升级角色映射，目前漏 track 4。
  - `packages/editor/src/ui/MusicTab.tsx`：音乐列表选中详情和角色中文标注；`02c980a9` 已落通用 UI。
- 已知坑 / 审计文档:
  - `docs/phase2/foundation/a7-resource-closure-audit.md:163-180,271-297` 当前报告把 13 个未引用曲目视为 warning，
    且示例只有四角色；`music.pal.004` 因此在编辑器中可删除。
  - A7-0 设计审查把 Reforge `bgm.play` 站点当作完整集合，却未反查一阶段标题菜单的 track 4；本卡作为勘误，
    不允许继续用“现有运行时没有第五个硬编码”证明标题音乐不存在。
  - `BgmPlayer.stop()` 会清除 `last`，这是防止 soundfont 异步就绪后在新游戏/视频中补播菜单曲的必要语义。
- 不得重新引入:
  - 运行时数字曲号、裸 MIDI 路径、应用根 fetch、未登记 AssetId、旧 `sys:music` 魔法槽。
  - 标题菜单音乐写入 `WorldState.audio.currentMusic`；它是应用壳临时音乐，不是存档持久场景音乐。
- 相关测试:
  - `packages/content/src/asset.test.ts`：角色封闭集、kind、缺角色和引用收集。
  - `packages/migrate/src/pal-project.test.ts`、`pal-migration-integration.test.ts`：角色物化、二跑零计划。
  - `packages/editor/src/core/open-local.test.ts` / v2 upgrade tests：升级后角色与保存重开。
  - `packages/reforge/src/opening-menu.ts` 当前没有配套测试；本卡必须新增音乐生命周期的自动测试边界。

## 验收条件

- 功能:
  - PAL manifest 存在 `audio.openingMenuMusic: music.pal.004`，typed 引用闭包把它计为 music 引用。
  - 6051 `?menu` 进入“新的故事 / 旧的回忆”后播放 004；选择任一项后先停止，场景/存档音乐随后正常接管。
  - 无音乐 catalog 的自有工程进入标题菜单仍可静默运行，不因缺角色抛错。
  - 6010 音乐页选中 004 时右栏显示“标题菜单音乐（新的故事 / 旧的回忆） / 工程清单”，删除键禁用并说明引用数。
  - 037 等已有战斗角色仍显示“默认战斗音乐 / 场景战斗音乐 / 战斗指令音乐”，无回归。
- 测试:
  - content 表驱动覆盖新角色合法、未知角色拒绝、kind 错拒绝、有音乐 catalog 缺新角色拒绝。
  - `collectAssetReferences` 对新角色产出 `expectedKind: music` 和精确 `where`。
  - PAL 迁移和 v2 升级都断言新角色为 004（缺 004 的非 PAL fixture 走既有确定性 fallback）。
  - 标题菜单音乐生命周期有自动测试：进入调用 `play(role)`，正常选择与异常退出均调用 `stop()`，禁止延迟补播泄漏。
  - MG2 二跑 `writes=0 deletes=0 conflicts=0`；全仓 `pnpm check` 与相关 build 全绿。
- 文档:
  - 更新 A7 资源闭包审计、内容 schema 示例和 A7-0 报告勘误：应用级音频角色由四个改为五个，并记录遗漏根因。
- 视觉 / 手工验证:
  - 6010 检查 004/037 的选中、引用类型、禁删 tooltip 和统一按钮样式。
  - 6051 实际听验标题菜单 004；点“新的故事”后不串音，进入 s000/s001 后由剧情/场景音乐正常接管。
  - 6051 从标题菜单读取存档后不串音，存档的 `WorldState.audio.currentMusic` 正常恢复。

## 推进签字

签字是阶段门禁。开卡任务必须集齐三方签字才能推进；缺签只能由用户明确豁免。`Status` 字段不能替代签字。

### 进入 build 前:设计签字

- Codex: **agree（2026-07-16）**。一阶段两条标题菜单路径都以 track 4 为真值；应新增封闭
  `audio.openingMenuMusic` 角色并由迁移边界绑定 004。Reforge 只读取角色，不得硬编码；菜单运行期临时播放，
  `finally` 停止且不写入 WorldState，编辑器引用闭包自然获得删除保护。
- Opus: **agree（2026-07-16,附 R1-R2 必改 + S1-S2 建议,见主审立场;含本人 A7-0 结论的公开修正）**。
  独立地面重验全部锚点:一阶段 bootstrap:1751 `wNumMusic=4`(注释引 uigame.c:114 RIX_NUM_OPENINGMENU)、
  :1787 选定后先停乐并**取消补播记账**(注释载 2026-06-12 真实用户 bug:32MB soundfont 未就绪时菜单曲
  挂 `last` 等补播,AVI 中途 ready 突然混入视频声轨);Reforge main.ts:411-429 `?menu` 只画背景+菜单,
  **零 BGM 调用**——漏播放坐实;`music.pal.004` 产物零引用 = 当前可删 bug 坐实;bgm.ts `last` 记账
  (:112/:122/:128 懒初始化/autoplay 解锁尾部补播)与 `stopPlayback` 清 `last`(:58)语义实证,且 :138-140
  音乐开关路径是"停播**留账**续播"的另一语义——与菜单 stop"**清账**"必须区分。fallback 机制实锚:
  `roleTrack(track)` = 优先 pal id、缺则 `musicIds[0]`、空表 fail-loud(upgrade-local-v2:110-115),
  新角色补齐可直接同构复用。**公开修正:A7-0 设计期我普查 bgm.play 全站点得出"roles 封闭集恰四个、
  无第五隐藏常量"——方法论缺陷:站点普查只能证明「现实现无第五常量」,而标题菜单在 Reforge 是漏实现
  的功能,其角色需求不可能出现在现有站点里;正确方法应反查一阶段全部播放位点(wNumMusic 赋值面)。
  本卡即该错误的勘误;与 M3 期"源悬空"、N1-1 期"R3 前提"同格式记录在案。**
- GLM: **agree（2026-07-16;见下）**。六项独立实测逐条：

  **(1) 一阶段播放位点穷举反查（修正方法：扫全 wNumMusic 赋值面）** ✅：
  - 穷举 `packages/game/src/` 全部 `wNumMusic` 赋值/播放位点。应用级硬编码音乐恰两条 track：
    - **track 4（标题菜单）**：bootstrap:1751 `returnToTitle` + :1917/:1925 post-splash 入 OpeningMenu（注释 RIX_NUM_OPENINGMENU uigame.c:114）——三站点一致。✅
    - **track 5（splash）**：bootstrap:1812 `playDosOpening` 内（注释 NUM_RIX_TITLE main.c:46 蝶恋）——**确属 DOS 商标/splash logo 屏**（palette 3 trademark + FBP 0x26/0x27 + crane/title sprite），非交互式"新的故事/旧的回忆"菜单。✅ 划出范围正确。
  - **无第六个应用级角色**：其余 wNumMusic 赋值全为 0（停：bootstrap:1442/1647/1787 + game-state:1458/1912）或数据驱动（0x43/0x45/0x77 opcode 读 operands）或 ending 脚本序列（bootstrap:1442 setMus faithfully port ending.c）。**track 4+5+四角色 = 全集。** ✅
  - **方法论确认**：Opus 公开修正成立——站点普查（扫现有 bgm.play）无法发现 Reforge **漏实现**的标题菜单功能；正确方法是反查一阶段 wNumMusic 赋值面全集。与 M3/N1-1 同格式方法论教训。

  **(2) 004 现状对账** ✅：
  - 独立重扫：`music.pal.004` 在 catalog（kind=music, path=`assets/migrated/music/004.mid`）但**全产物零引用**——不在任何 scene/script/manifest role。✅
  - 当前 manifest roles 恰四个（midiSoundfont/defaultBattleMusic:037/bossVictoryMusic:002/normalVictoryMusic:003），无 openingMenuMusic。✅
  - 004 在 13 unused warning 清单内 → 编辑器可删（bug 坐实）。新角色落地后 collectAssetReferences 计入 role 引用 → unused **13→12**。✅

  **(3) R1 测试形态** ✅：
  - **v3 缺角色补齐幂等**：已有五角色工程重开零改动 / 四角色工程打开边界补齐 openingMenuMusic→保存固化 / 无音乐 catalog 工程不写角色（hasAudio 门禁）。✅
  - **roleTrack(4) 三分支表驱动**：catalog 有 `music.pal.004` → 返回 004 / 缺 004 但有其他 music → fallback `musicIds[0]` / 无音乐 catalog → 不写角色。`roleTrack`（upgrade-local-v2:112-115）已泛化，零改动只需加一行 `'audio.openingMenuMusic': roleTrack(4)`。✅
  - **三处并行添加点**确认：asset.ts(ASSET_ROLES+AUDIO_ASSET_ROLES 类型门)+pal-assets.ts(PAL_AUDIO_ROLES 生成)+upgrade-local-v2.ts(roleTrack 映射)。✅

  **(4) R2 测试形态** ✅：
  - **补播竞态**：`play(role)` → init 未完 → `stop()` → init 完成（ensureInit:112 检查 `last`）→ `last` 已被 stopPlayback:58 清除 → **不补播**。测试 = mock init 延迟 + 断言完成不响。✅
  - **双语义分测**：音乐开关 setEnabled(false) **留 last**（:136-138 停播续播）vs 菜单 stop **清 last**（:58）——各自专测钉住，防重构误合并。✅
  - **读档序**：菜单 stop 先于 bootLoadSlot → savedMusic 接管 → `WorldState.audio.currentMusic` 不被菜单曲污染（菜单曲是应用壳临时态，不写持久）。✅

  **(5) 迁移/MG2 面** ✅：
  - PAL 重生成 manifest 五角色断言（pal-migration-integration.test 扩展 `openingMenuMusic: music.pal.004`）。✅
  - MG2 二跑零计划。✅
  - v2 升级（upgrade-local-v2.test）与 v3 补齐（独立 v3 normalizer 或扩展 upgrade）分别有集成测试。✅

  **(6) 文档勘误面** ✅：
  - A7 audit/闭包报告"四角色"→"五角色"，记录遗漏根因（站点普查≠需求普查）。✅
  - capability-map W5/X2 音乐资源生命周期事实更新（openingMenuMusic 角色）。✅

  **总结**：穷举反查确认无第六角色（track4 标题菜单 + track5 splash 划出 = 全集）；004 零引用可删 bug 坐实；R1/R2 测试形态全可落（roleTrack 已泛化三处并行加一行）；三处添加点确认；bgm last/stop 双语义精确对应一阶段；文档勘误方向正确。**agree**。

- counter / 分歧处理: Opus 无架构 counter;R1-R2 为设计必补,GLM 无 counter。Opus 公开修正方法论（站点普查≠需求普查）成立——GLM 独立穷举 wNumMusic 赋值面确认无第六角色。
- 缺签豁免: N/A
- build 准入结论: **三签齐（Codex agree + Opus agree + GLM agree），build allowed。** R1-R2 必改 + S1-S2 纳入 build 范围。

### 进入 done 前:审查签字

- Codex: **accept（2026-07-16，自验证）**。第五角色、PAL 004 绑定、旧 v3 打开边界补齐、标题菜单
  `try/finally` 停止和 BGM 异步取消均已落地；全仓 3,581 测试通过（另 1 skipped），MG2 连续两次
  `writes=0 deletes=0 conflicts=0`，写前闭包实测 `asset-refs=1327 asset-warnings=12`。6010 已确认 004
  仅一条标题菜单角色引用且禁删、037 原有三类引用无回归；6051 新游戏与读档两路均已离开菜单并由后续画面接管。
- Opus: **accept（2026-07-16,实现/运行主审,零返工项）**。六项复核全过:
  1. **贯通与零硬编码**:`runOpeningMenuWithMusic(bgm, roles['audio.openingMenuMusic'], run)` 61 行包装
     (opening-menu.ts)——无角色静默直跑、有角色 `play(asset, true)`(循环=S2)→try/finally `stop()`,
    停止先于决策返回(= 新游戏/读档启动前);reforge 运行时零 `4`/`music.pal.004` 字面量(扫描净,
    命中皆无关 UI 常量);角色仅经 manifest.assets.roles 可选读取。
  2. **R1 v3 补齐全要件**:`completeLocalProjectV3AudioRoles`(upgrade-local-v2:181-220)——仅 v3、仅缺键
     (`role in roles` 即返回,**不覆盖自定义**)、优先 `palMusicAssetId(4)` 且校验 kind===music、缺则
     **排序后首条** music id 确定性回退、无音乐 catalog 返回 false 不写、`writeProject` 落盘固化;
     open-local.ts:38 打开边界调用;v2 路径同步加 `roleTrack(4)`。幂等 = 构造性(二开即缺键不成立)。
  3. **R2 代次取消**:`requestSerial` 在 `stopPlayback` 与 `playCurrent` 双点自增,`doPlay` 在
     **ctx.resume 后与 readBytes 后两个 await 边界**复查 `isCurrent`(serial+enabled+last 三重匹配)——
     后端初始化与 MIDI 在途读取期间 stop 均作废迟到播放;`setEnabled(false)` 也升代次但**留账**
     (:180-184),与菜单 stop"清账"双语义分离。测试三行齐:bgm.test :41(init 竞态)/:60(MIDI 在途)/
     :79(留账 vs 清账);opening-menu.test :5(循环+读档序+不污染 world)/:24(异常退出+无角色静默)。
  4. **产物与门禁**:manifest 五角色精确(openingMenuMusic: music.pal.004);dry-run 零计划且
     `asset-refs=1327 asset-warnings=12`(unused 13→12,GLM 预测吻合);定向套件 5+2+6+19 全绿。
  5. **6051 实走(听感代理:CDP 网络链+typed 状态)**:`?menu` 进入即完整点火
     **spessasynth_lib → soundfont.sf3 → 004.mid**(CDP 网络日志 reqid 1051-1053,均 catalog 工程路径);
     选"新的故事"→ 开场 → s001 后 `world.audio.currentMusic='music.pal.031'`(**非 004,零污染**),
     场景音乐接管;console 全程零错误零 404。真实扬声器听感与切换瞬间串音判定留用户
     (卡 Visual Owner 本含 User;自动化无法判定扬声器输出,不冒充)。
  6. **6010**:004 选中显示"标题菜单音乐（新的故事 / 旧的回忆）/ 工程清单",删除禁用
     ("有 1 处引用,不能删除");037 默认战斗+场景战斗多类引用无回归、仍禁删。
  方法论记录(诚实):我的 performance-timing 观察器三轮零取证一度指向"未起播",CDP 网络日志实锤
  起播正常——JS 性能缓冲(模块风暴淹没+时窗)不可靠,取证层级应为 **CDP 网络日志 > performance buffer**;
  与 N1-1 blur 探针教训同类,先证仪器再疑产品。
- GLM: **accept（2026-07-16;见下）**。六项独立实测 + 定向测试全绿。设计期六项全落地。

  **(1) 设计期六项落地验收** ✅：
  - **五角色 manifest**：独立重扫 manifest `audio.openingMenuMusic: music.pal.004` + 原四角色 = 恰五。✅
  - **004 unused 13→12**：004 现经 role 引用被 collectAssetReferences 计入；dry-run `asset-refs=1327 asset-warnings=12`（A7-0 时 1326/13，本次 +1 ref / -1 warning）。✅
  - **三处并行添加点**：asset.ts:32 `ASSET_ROLES` + :41 kind 映射 / pal-assets.ts:24 `palMusicAssetId(4)` / upgrade-local-v2.ts:124 `roleTrack(4)` + :193 `completeLocalProjectV3AudioRoles`。逐一确认。✅

  **(2) R1 测试矩阵（open-local.test 六用例）** ✅：
  - :170-172 优先 004（catalog 有 004 → `music.pal.004`）✅
  - :175-177 缺 004 回退排序首条（→ `music.pal.001` localeCompare）✅
  - :184-185 四角色工程补齐第五 + 保存 ✅
  - :187-189 五角色工程重开幂等零改动（`writes=[]`）✅
  - :193-197 已有自定义角色不覆盖（`music.pal.009` 保留，`customWrites=[]`）✅
  - :200-203 无音乐工程不写角色（`toBeUndefined()` + `silentWrites=[]`）✅

  **(3) R2 测试矩阵（bgm.test 三行 + opening-menu.test 两行）** ✅：
  - **bgm.test:41** init 竞态：play → init 未完 → stop → init resolves → backend.play **不调用** ✅
  - **bgm.test:60** MIDI 在途取消：readBytes deferred → stop → resolve → backend.play **不调用** ✅
  - **bgm.test:79** 留账 vs 清账：setEnabled(false→true) 重播(count=2) vs stop 后 toggle **不重播**(仍 2) ✅
  - **opening-menu.test:5** 循环+读档序：`play:music.menu:true`(loop) → menu → stop → load；`world.currentMusic` **不变** ✅
  - **opening-menu.test:24** 异常退出+无角色静默：异常路径 stop 一次；undefined role 零 play 零 stop ✅

  **(4) 迁移/MG2 面** ✅：
  - dry-run `writes=0 deletes=0 conflicts=0`，`asset-refs=1327 asset-warnings=12`（与 A7-0 报告勘误一致）。✅
  - pal-migration-integration 五角色断言 + 双跑零计划。✅

  **(5) 文档勘误面** ✅：
  - content-schema:225 "五个音频角色" / a7-0-closure-report:63,87 "五个具名角色"+"第五个封闭角色" / capability-map:124 "第五个封闭角色" / a7-audit:280 五角色 manifest 块——四处全更新齐，无残留"四角色"表述（任务卡历史文档保留属正确，记录发现缺口→修正过程）。✅

  **(6) 边界确认** ✅：
  - **splash 005 未被顺手实现**：opening-menu.ts / main.ts 零 005/splash/title music 引用。范围外正确。✅
  - **ESC/战斗/系统菜单未改动**：main.ts battle-track 逻辑（:1398-1399）pre-existing 未改；systemMenu(:2320) 不触 BGM 角色。零范围蔓延。✅

  **总结**：五角色全落地（manifest+三处源码+unused 13→12）；R1 六用例 + R2 五行断言逐条与规格一致；MG2 零计划 asset-refs=1327/warnings=12；四文档四→五角色更新齐；边界正确（无 005/无菜单蔓延）。定向套件 reforge 357 + editor 183 + migrate 192+1skip 全绿。**accept**。

- counter / 返工处理: 无(Opus 零返工项,GLM 无 counter)。
- 缺签豁免: N/A
- done 准入结论: **三方 done 前审查签字齐（Codex + Opus + GLM accept）。交用户真实扬声器听验（004 曲目正确性 + 切换瞬间串音）与验收，用户点头方 done。**

## Draft: 设计与风险

### 设计结论

1. `audio.openingMenuMusic` 是 catalog 上的封闭应用级角色，语义为标题菜单临时 BGM；PAL 迁移/升级层才知道
   track 4，content schema、Reforge 和编辑器只知道 AssetId。
2. 对已有音乐族的工程，新角色与现有四角色一样是完整切片必填项；无音乐 catalog 的工程允许角色缺省，
   Reforge 标题菜单静默运行。运行时直接读取可选 role，存在才播放。
3. 音乐生命周期包住 `runOpeningMenu`：背景成功载入且真正进入菜单时 `play(role)`；无论正常选择还是抛错都在
   `finally` 调 `stop()`。停止发生在启动新游戏/读取存档之前，避免异步 soundfont 就绪后的迟到补播。
4. `collectAssetReferences` 已枚举封闭 `ASSET_ROLES`，新增角色后自动进入闭包；编辑器仅补中文语义标签，不写
   004 特判。删除能力继续只取 typed references。
5. A7 文档增加勘误：此前“现有 Reforge 站点无第五个硬编码”只描述了缺陷后的实现，不是原版完整需求证据。

### 已知风险

- 风险: 新增必填角色会让旧 v3 本地工程加载失败。
- 缓解: 在合法升级边界为旧 v3 补角色，或明确把本次 schema 变化纳入 v3 normalizer；不得在运行时长期兼容缺键。
- 风险: `stop()` 时机过晚会让 004 与开场视频/场景音乐串音。
- 缓解: `runOpeningMenu` 外层 `try/finally`，自动测试覆盖正常/异常两路，手工听验新游戏与读档。
- 风险: 为“无音乐工程静默”放宽所有现有角色完整性。
- 缓解: 只沿用当前 `hasAudio` 门禁；有音乐 catalog 时五角色仍全量必填，无音乐时不创建播放器输入。

### 主审立场

- Reviewer: Opus（schema/跨包/运行时生命周期主审）+ GLM（迁移覆盖/产物/测试矩阵复核）
- 结论(Opus,2026-07-16): **agree — 五问逐项裁定**:
  1. **新增封闭角色**:成立。复用既有封闭联合 + AUDIO_ASSET_ROLES kind 映射(kind=music 机械校验),
     迁移/升级层独知 track 4、schema/runtime/编辑器只知 AssetId——与 A7-0 四角色同构,零新机制。
  2. **v3 升级边界**:方向对但须钉死(R1)。第五角色对音乐工程必填 ⇒ 既有 v3 工程(用户本地 FSA 克隆)
     缺角色会 fail-loud;补齐必须发生在打开边界、幂等、保存固化,运行时零兼容分支。
  3. **无音乐工程静默**:成立。沿用既有 `hasAudio` 门禁(有音乐 ⇒ 五角色全量必填;无音乐 ⇒ 角色可缺),
     runtime 读可选 role 存在才播 = 双保险;不为静默放宽有音乐工程的完整性,正确。
  4. **生命周期**:成立,附 R2。play(role) 在背景载成真正进入菜单后;正常/异常统一 try/finally stop();
     stop 清 `last`(bgm.ts:58 实证)= 一阶段 :1782-1788 取消补播记账语义的精确对应(含真实用户 bug
     教训);菜单曲不写 `WorldState.audio.currentMusic` = 应用壳临时态,与战斗临时曲/RNG 呈现态同一
     "呈现态不落持久态"法理。stop 时机在新游戏/读档启动**之前** = 一阶段 uigame.c:157-158 真值。
  5. **删除保护**:成立。`collectAssetReferences` 枚举封闭 ASSET_ROLES ⇒ 新角色自动进引用闭包,
     004 获引用即禁删,零 UI 特判——正是 A7-0 "删除能力只取 typed references" 契约的自然延伸。
- 必改项(R,设计层面补明,build 必落):
  - **R1 v3 缺新角色的补齐边界钉死**:位置 = 与 v2→v3 同一打开/迁移边界(upgrade-local-v2 扩展为
    "v2→v3 + v3 角色补全"或独立 v3 normalizer,归 content/editor 既有升级层,不得进 runtime);
    规则 = `roleTrack(4)` 同构(catalog 有 `music.pal.004` → 004,缺则既有确定性 fallback 首条 music
    记录,无音乐 catalog 则不写角色);幂等(已有角色的工程重开零改动);保存后固化,运行时不留
    "缺键容忍"分支。PAL 工程由迁移器重生成直接产五角色,不走此路径。
  - **R2 补播竞态与双语义专测**:(a) 竞态行——`play(role)` 于 soundfont 初始化未完成期 → `stop()` →
    初始化完成 → 断言**不补播**(`last` 已清,bgm.ts:58);(b) 语义区分行——音乐开关的"停播留账续播"
    (:138-140)与菜单 stop 的"清账"是两个不同语义,各自专测钉住,防未来重构误合并;(c) 序列行——
    菜单读档:stop 先于 bootLoadSlot,载入后 `savedMusic` 接管,菜单曲不得写入或污染
    `WorldState.audio.currentMusic`。
- 建议项(S,不阻塞):
  - S1 A7-0 卡已 done 不回改;其"恰四个"结论的勘误由本卡 + audit/闭包报告承载(卡文档节已列),
    我的方法论自认见设计签字行。
  - S2 菜单曲循环语义:一阶段 track 4 为循环播放,`play(role, loop)` 的 loop 参数在测试中显式断言,
    防默认值漂移。
- 是否建议进入 build: **待 GLM 复核(迁移覆盖/测试矩阵);R1-R2 纳入 build 范围后 build**。

### 三方争议记录(按需)

- Codex: 采用新增封闭 role + PAL 迁移绑定 + 菜单临时生命周期，不采用 UI 特判或运行时曲号。
- Opus: **agree**。五问全立(封闭角色同构/升级边界须钉死/静默沿用 hasAudio 门禁/生命周期与一阶段
  取消补播语义精确对应/删除保护零特判);附 R1(v3 补角色边界:打开边界+roleTrack(4) 同构+幂等+
  保存固化)/R2(补播竞态+开关"留账"vs 菜单"清账"双语义+读档序三组专测)+S1-S2。**公开修正本人
  A7-0"恰四角色"结论——站点普查证明不了漏实现功能的角色需求,应反查一阶段播放位点全集。**
- GLM: **agree**。穷举 wNumMusic 全赋值面确认**无第六角色**——track 4 标题菜单(3 站点)+track 5 splash(确属 logo 屏非菜单)+0 停+数据驱动 opcode+ending 脚本=全集；004 零引用可删 bug 坐实(catalog 有 004.mid 全产物零引用在 13 unused)；R1 roleTrack(4) 已泛化三处并行加一行(asset.ts/pal-assets.ts/upgrade-local-v2.ts)；R2 bgm last/stop 双语义精确( stop 清 last:58 vs setEnabled 留 last:136-138)；Opus 公开修正方法论成立(站点普查≠需求普查,GLM 独立穷举确认)。
- 用户拍板: 用户已明确目标菜单；其余待三方设计签字。

## 额度 / 代班记录(如适用)

- 缺席 Agent: none
- 缺席原因: N/A
- 代班 Agent: N/A
- 代班范围: N/A
- 风险: N/A
- 是否需要补审: N/A
- 用户裁决: N/A

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件:
  - `packages/content/src/asset.ts` / `asset.test.ts`
  - `packages/migrate/src/pal-assets.ts` / `pal-migration-integration.test.ts`
  - `packages/editor/src/core/upgrade-local-v2.ts` / `open-local.ts` / `open-local.test.ts`
  - `packages/editor/src/ui/MusicTab.tsx`
  - `packages/reforge/src/audio/bgm.ts` / `bgm.test.ts`
  - `packages/reforge/src/opening-menu.ts` / `opening-menu.test.ts` / `main.ts`
  - `projects/pal/manifest.json` 与 A7/能力地图相关中文真值文档
- 实现摘要:
  - 新增封闭角色 `audio.openingMenuMusic: music`，PAL 迁移源与工程清单绑定 `music.pal.004`；typed
    walker 自动建立引用，编辑器只补中文语义标签，没有 004 删除特判。
  - v2 升级补 `roleTrack(4)`；旧 v3 音乐工程在本地打开边界幂等补键并保存，优先 004，否则按排序后的
    首个 music AssetId 确定性回退；已有自定义角色不覆盖、无音乐工程不写。
  - 标题菜单实际显示期间按角色循环播放，正常新游戏、读档和异常退出都在结果返回前 `finally stop()`；
    菜单曲不进入 `WorldState.audio.currentMusic`。
  - BGM 后端抽出可控测试适配器，并加入请求代次；`stop()` 同时取消初始化尾部补播和在途 MIDI 读取，
    `setEnabled(false)` 仍保留当前曲记账供恢复，两个语义没有合并。
  - A7 审计口径修为五角色、1,327 引用、12 warning，并记录“现实现站点扫描不能发现漏实现需求”的根因。
- 运行命令:
  - `pnpm --filter @type-pal/content test -- asset.test.ts`
  - `pnpm --filter @type-pal/editor test -- open-local.test.ts`
  - `pnpm --filter @type-pal/reforge test -- bgm.test.ts opening-menu.test.ts asset-resolver.test.ts`
  - `pnpm --filter @type-pal/migrate test`
  - `pnpm --filter @type-pal/migrate run migrate:content`（连续两次，均零计划）
  - `pnpm check`
  - `pnpm --filter @type-pal/editor build`
  - `pnpm --filter @type-pal/reforge build`
- 浏览器 / 手工检查:
  - 6010：筛选并选中 004，右栏显示“标题菜单音乐（新的故事 / 旧的回忆）/ 工程清单 / 引用 1 处”，
    删除按钮禁用；037 显示默认战斗、场景战斗、战斗指令音乐共 39 处，删除仍禁用。
  - 6051 `?menu`：标题菜单正常显示；Enter 选择“新的故事”进入开场 s000；另一新会话进入“旧的回忆”，
    显示现有存档并成功载入场景。两路都没有停留或返回标题菜单画面。
- 跳过的检查及原因: 当前自动化会话不能对扬声器输出作听觉判定；004 曲目听感及切换瞬间是否有极短串音，
  仍需 Opus 或用户实际听验。调用顺序、循环参数、清账竞态和读档前 stop 已由自动测试覆盖。

## 资源生成记录(如适用)

- Generation Owner: N/A
- 生成目的 / 替换对象: N/A（复用已登记 MIDI 004，不生成新资源）
- 提示词要点 / 风格约束: N/A
- 输出路径: N/A
- 尺寸 / 格式 / 透明背景 / 调色约束: N/A
- 资源登记位置: `projects/pal/manifest.json` 的 assets role
- 验证方式: typed closure + MIDI 听验

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex + User
- 验证方式: 6010 编辑器引用详情 + 6051 标题菜单新游戏/读档两路浏览器检查
- 截图 / 像素检查路径: Codex 浏览器会话内截图目视，未写入仓库
- 结论: UI 引用、禁删、菜单显示、新游戏接管与读档接管均通过
- Opus 独立复验(2026-07-16): 通过,方法独立于 Codex(CDP 网络日志+typed 状态取证)。6051 `?menu` 起播链
  实锤:spessasynth_lib → soundfont.sf3 → **004.mid** 三连请求(均 catalog 工程路径);选"新的故事"后
  进世界 `currentMusic='music.pal.031'`(非 004,菜单曲零污染),场景音乐接管;console 零错误零 404。
  6010:004 显示"标题菜单音乐（新的故事 / 旧的回忆）/ 工程清单"且禁删("有 1 处引用");037 多类战斗
  引用无回归。代次取消/双语义/读档序由 bgm.test(:41/:60/:79)与 opening-menu.test(:5/:24)五行专测钉住。
- 未完成项: 真实扬声器听感(004 曲目正确性与切换瞬间串音)留**用户**最终听验——自动化环境无法判定
  扬声器输出,不冒充完成。

## Review: 审查与返工

- Reviewer: Opus + GLM
- 审查结论: Codex 自验证 accept；**Opus 实现/运行主审 accept(2026-07-16,证据见 done 前签字 Opus 行)**;
  GLM pending。
- 必须返工项: 无(Opus)。
- Accept / rework: Opus **accept**;待 GLM 覆盖/迁移终审与用户听验。

## 用户验收

- 用户结论: pending
- 后续任务: pending

## 交接日志

- 2026-07-16 Codex: 完成缺陷确认、UI 通用引用详情（提交 `02c980a9`）和 A7-0A 设计；确认一阶段标题菜单
  track 4、Reforge `?menu` 漏播放、manifest 漏角色、004 因零引用可删除。Evidence: 本卡上下文锚点与
  6010 004/037 浏览器复验。Next: Opus 做 schema/跨包/生命周期设计主审并签 agree/counter；不得开始实现。
- 2026-07-16 Opus: 设计主审签 **agree + R1-R2 必改 + S1-S2 建议,含本人 A7-0 结论公开修正**。
  独立重验:一阶段 wNumMusic=4(:1751)与选定停乐+取消补播记账(:1787,载真实用户 bug 教训)、
  Reforge ?menu 零 BGM(:411-429)、004 产物零引用、bgm `last` 记账/stop 清账(:58/:112/:128)与音乐
  开关"留账"(:138-140)双语义、roleTrack fallback(upgrade-local-v2:110-115)全部坐实。五问全立:
  封闭角色同构/升级边界须钉死/静默沿 hasAudio/生命周期精确对应一阶段/删除保护零特判。
  **公开修正:A7-0"roles 恰四个"系站点普查方法论缺陷——普查现有 bgm.play 站点无法发现漏实现功能
  (标题菜单)的角色需求,应反查一阶段播放位点全集**。R1=v3 补角色边界(打开边界/roleTrack(4) 同构/
  幂等/保存固化/运行时零兼容);R2=补播竞态+双语义区分+读档序三组专测。Evidence: 主审立场+锚点
  实证。Next: GLM 迁移覆盖/测试矩阵复核;三签齐后 Codex build;不得抢跑实现。未改实现文件。
- 2026-07-16 GLM: 设计复核签 **agree**。六项独立实测：(1)穷举 wNumMusic 全赋值面——应用级硬编码仅 track 4(标题菜单 bootstrap:1751/1917/1925 三站点)+track 5(splash bootstrap:1812 确属 DOS logo 屏 palette3+FBP0x26/27+crane/title sprite 非交互菜单)+0(停)+数据驱动(0x43/45/77)+ending 脚本(setMus port ending.c),**无第六角色**；Opus 公开修正方法论成立(站点普查≠需求普查)。(2)004 catalog 有(kind=music 004.mid)全产物零引用在 13 unused,manifest 恰四角色无 openingMenuMusic,新角色后 unused 13→12。(3)R1 roleTrack(4) 已泛化(upgrade-local-v2:112-115),三处并行加一行(asset.ts ASSET_ROLES+pal-assets.ts PAL_AUDIO_ROLES+upgrade-local-v2 roleTrack),三分支表驱动(有004/缺004有music fallback musicIds[0]/无音乐不写)。(4)R2 bgm last/stop 双语义(stopPlayback:58 清 last vs setEnabled:136-138 留 last)+补播竞态(ensureInit:112 检查 last,stop 后已清不补播)+读档序(stop 先 bootLoadSlot,savedMusic 接管,currentMusic 不污染)。(5)迁移五角色断言+MG2 双跑零计划+v2/v3 集成测试。(6)文档勘误四→五角色+根因。Evidence: 设计签字 GLM 行。Next: 三签齐已 build allowed,交 Codex build。未改实现文件。
- 2026-07-16 Codex: 完成 build 与自验证并签 **accept**。第五角色/004 绑定、旧 v3 幂等补齐、菜单
  `try/finally stop`、初始化与 MIDI 在途取消、开关留账语义均有专测；全仓 3,581 pass、MG2 双跑零计划，
  闭包 1,327/12；6010 004/037 与 6051 新游戏/读档两路通过。Evidence: Build/视觉记录。Next: Opus 做
  实现与运行主审并实际听验，签 accept/counter；不得标 done，随后交 GLM 覆盖终审。
- 2026-07-16 Opus: review 主审签 **accept,零返工项**。代码面:包装器精确(无角色静默/loop=true/
  finally stop 先于决策返回)、运行时零 4/004 字面量、R1 补齐全要件(仅缺键不覆盖/优先 004+kind 校验/
  排序首条回退/无音乐不写/写盘固化,open-local:38 调用)、R2 代次取消(stop 与 playCurrent 双点自增+
  doPlay 两 await 边界复查,setEnabled 留账与 stop 清账分离)。测试面:R2/S2 五行专测点名齐
  (bgm :41/:60/:79 + opening-menu :5/:24)。产物面:manifest 五角色、dry-run 零计划 1327/12
  (unused 13→12 吻合)。运行面:6051 CDP 网络实锤起播链 spessasynth_lib→soundfont.sf3→004.mid,
  选定后 currentMusic=031 零污染、场景接管、console 零错;6010 004 角色引用+禁删、037 无回归。
  方法论记录:performance buffer 三轮零取证系仪器伪影(模块风暴淹没),CDP 网络日志才是地面真值——
  先证仪器再疑产品(N1-1 blur 探针同课)。真实扬声器听感留用户终验。Evidence: done 前签字 Opus 行+
  视觉记录。Next: GLM 覆盖/迁移终审;齐签后交用户听验/验收;不得标 done。未改实现文件。
- 2026-07-16 GLM: done 前覆盖终审签 **accept**。六项独立实测+定向套件全绿：(1)五角色 manifest(openingMenuMusic:004)+三处并行(asset.ts:32/pal-assets.ts:24/upgrade-local-v2:124+193)+unused 13→12(dry-run asset-refs=1327 warnings=12)。(2)R1 open-local.test 六用例逐行核对——:170-172优先004/:175-177缺004回退首条/:184-185补齐保存/:187-189幂等零改动/:193-197不覆盖自定义/:200-203无音乐不写。(3)R2 bgm.test:41 init竞态/:60 MIDI在途取消/:79留账vs清账 + opening-menu.test:5 循环读档序不污染/:24 异常退出无角色静默,五行断言与规格逐条一致。(4)MG2 writes=0 asset-refs=1327 warnings=12。(5)四文档四→五角色更新齐(content-schema/a7-0-report/capability-map/a7-audit)。(6)边界——splash 005 未实现,ESC/battle/system 菜单未改动。reforge 357/editor 183/migrate 192+1skip 全绿。Evidence: done 准入 GLM 行。Next: 三签齐,交用户真实扬声器听验(004曲目+切换串音)与验收。未改实现文件。

## 下一位 Agent 提示词

```text
接手任务:A7-0A 标题菜单音乐角色与删除保护,覆盖/迁移/测试矩阵终审(GLM)
任务卡:docs/ops/tasks/A7-0A-opening-menu-music-role.md
当前状态:review;done 前 Codex accept + Opus accept(实现/运行主审,零返工项),GLM pending(最后一签);不得标 done
你的角色:GLM,覆盖面/迁移/测试矩阵终审;只改任务卡,不得改实现文件
先读:AGENTS.md、docs/phase2/READ-FIRST.md、本卡全部(重点 done 前签字三行与你设计期六项)、packages/editor/src/core/upgrade-local-v2.ts:181-220、packages/reforge/src/audio/bgm.test.ts、packages/reforge/src/opening-menu.test.ts
请重点复核(数据/测试面,与 Opus 的实现/运行面互补):
1. 你设计期六项的落地验收:五角色 manifest(重扫)、004 引用 unused 13→12(独立重扫对账)、roleTrack(4) 三处并行添加点(asset.ts/pal-assets.ts/upgrade-local-v2.ts)逐一确认;
2. R1 测试矩阵:open-local.test 六用例是否覆盖 幂等重开零改动/四角色补齐保存固化/无音乐不写/优先004/缺004回退排序首条/非法值不修正交 validator——逐行核对;
3. R2 测试矩阵:bgm.test :41(init 竞态)/:60(MIDI 在途取消)/:79(留账 vs 清账)与 opening-menu.test :5(loop+读档序+不污染)/:24(异常退出+无角色静默)五行断言逐一读文本确认与规格一致;
4. 迁移/MG2 面:pal-migration-integration 五角色断言、MG2 双跑零计划、asset-refs=1327/warnings=12 口径与 A7-0 报告勘误一致;
5. 文档勘误面:A7 audit/闭包报告/content-schema/capability-map 四→五角色更新齐,遗漏根因(站点普查≠需求普查)记录在案;
6. 边界确认:splash 005 未被顺手实现(范围外);ESC/战斗/系统菜单未被改动。
已验证(勿重复,可抽查):Opus 已做零硬编码扫描、R1/R2 代码全要件实证、6051 CDP 网络起播链(spessasynth_lib→soundfont.sf3→004.mid)+选定后 currentMusic=031 零污染、6010 004 禁删/037 无回归、定向套件+dry-run 重跑
不要做:不改实现文件;不重生成 PAL;不得标 done——GLM 签后仍需**用户真实扬声器听验**(004 曲目正确性+切换瞬间串音)与验收
输出要求:在本卡 GLM review 签字行写 accept 或 counter+理由,补交接日志并提交;三签齐后 done 准入结论改为"等用户听验/验收"
```
