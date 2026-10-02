# PRE-005-DEBT-1 — 005前当前边角与验收欠账收口

Status: build
Phase: ops
Owner: Codex Root
Coding Owner: 各独立包见白名单，Root统一接收
Reviewer: Codex Root
Visual Verification Owner: Codex
Visual Verification Timing: mixed
Branch: codex/pre-005-cleanup

## 用户范围（2026-10-02）

用户认可004连续演示后要求“先把边角都做完，清理掉欠债再继续005”。本轮明确选择
“先清当前边角，素材库按发布阶段推进”。005暂停，A1服务器版本化素材库保持既定发布阶段。
本批完成的是已知独立缺陷、已走001–004的验收/录制与历史收口；未定义的005以后剧情、完整Q1/Q2
和随其核实的后期脚本命名仍是后续范围，不伪装成已验证或为清表猜名。
6012原编辑器服务/页面保持；主树`.zcodeignore`属于用户。其它正在工作的贡献者checkout不按退休处理。

## 清单及责任

| 项目 | 本轮完成条件 | Owner |
| --- | --- | --- |
| 切场景朝向保持无法清除 | 三落点可去掉显式facing，其余继承/过渡/保存重开保持 | pre005_editor_edges |
| 地图清选通知残留 | 真正Esc清选和Inspector清空均给既有清空通知，其它Esc取消语义不变 | pre005_editor_edges |
| 深链预览伪造帧0 | 无真实采样不造帧；预算截断不伪装完整循环，当前真实资源UI可解释 | pre005_sprite_preview |
| 001–004录制与音轨 | 原声小样已核，按[E2E-CAPTURE-1](../archive/tasks/done/E2E-CAPTURE-1-local-001-004-media.md)建设正常剧情录制 | pre005_media_probe |
| 自动脚本引用定位 | 实际“编辑自动脚本”到auto方案，非错误交互页；[窄卡](../archive/tasks/done/EDITOR-AUTO-LOCATOR-1-current-script-target.md) | pre005_editor_edges |
| 已验收任务与过期文档 | 按用户批准/独立证据闭合对应卡；历史失败不改写，当前文档不再宣称仅001/002或旧版本 | Root |
| 旧证据/分支/worktree | 先保全真实checkpoint/trace/截图和来源，再仅清理确认退役的精确对象 | Root |

当前GLM补测独立队列保持自身Owner和反控，未接收/仍在写的包不因本批改成done或删除。
ARCH-SUPPORT已接收材料与实际产品实现分开核账；长期覆盖比例不变成本批前置。

## 已核前提与准入

本批三个编辑器问题的一阶段/原版N/A：均属新作者界面的字段覆写、操作反馈与静态预览解释。
当前Root直接读一手源码并与独立只读核验交叉确认：

- `command-form-world.tsx:585/693`默认实参将保持选择的undefined替回旧facing；`makeLoadScene`缺席字段表示无显式覆盖。
  运行时朝向解析优先级不改，“保持”不被扩大解释为所有落点都强制继承前场景。
- `MapMode.tsx:2646/3336`两个显式清选入口缺通知；鼠标完成及切平移已有“选区已清空”事实。
  底栏仍是操作通知，不改成新全局状态系统；补清选事件与两种可能语义都一致。
- `world-sprite-behavior.ts:612/988/995/1057/1103`预算截断后捏造默认0，单variant丢截断信息并称“检测到”；
  运行时可执行的17层链因此在编辑器伪报。复核纠正：WorldSpriteLibrary普通定义引用行消费detail，
  自动行为引用被前置过滤后走另一行，目前仍硬编码通用说明。须补真实自动引用行，旧mock-prop不是实际UI证据。

最强替代解释及反控分别写各子卡；用户新授权已足够处理这些保持既有合同的修复，不重复申请旧“待选项”。
Root `premise verified / design agree / build allowed`，限以下文件域。录制公共接口和生命周期待实际调查样本后单独准入。

### 单一写入白名单

- pre005_editor_edges：`command-form-world.tsx`、`CommandForm.current-scene.test.tsx`、`MapMode.tsx`、`MapMode.test.tsx`
  及确实必要的相邻保存/重开测试。只朝向选择回调显式makeLoadScene，其余rebuild继承不变；真清选共享回调
  更新通知，保留stamp/拖动/transform/menu/组编辑更高优先级Esc。禁止修改全局DiagnosticsBar/schema/runtime。
- pre005_sprite_preview：`world-sprite-behavior.ts`和相邻真实公有API/当前caller测试；WorldSpriteLibrary实现
  仅在现有detail呈现不足时最小修改。不改runtime深度预算、作者内容、采样安全预算，不冒充完整概率/循环。
  原6条chance示例与截断提示保持，空预算采样不得默认#0；partial单variant不得丢失不完整语义。
- Root：本卡/子卡/看板/索引/当前文档/历史工具退役、独立验收、证据保全及git收口。贡献者不同时写这些文件。

### 测试异步警告窄包（2026-10-02）

pre005_editor_edges在未改main523cf97d上直接复现`MapMode.kimi-workflows.test.tsx`的65条React act警告；
不是本轮两个生产修复引入，但本批清当前测试欠账一并处理。Root准入只改该测试文件的真实异步等待边界，
等待资源ready、通知等已有完成见证并纳入act；保留五项业务断言，不改产品/fixture/规则，不屏蔽console。
本项没有新产品行为，原版/一阶段N/A；最强反例是仍有未等待的工作或测试在真实完成前通过。
独立提交，五例通过且无act警告后交Root复核；Coding Owner为pre005_editor_edges，build allowed。

### 朝向真实writer补证

Root浏览器已核三落点保持选择→完成→重开弹层，原落点/坐标/过渡保留。
pre005_sprite_preview追加唯一白名单`packages/editor/src/core/project-open-workflows.test.ts`，仅测试三落点
通过现行完整writer/授权/finishOpen保存重开，无facing保持缺席、显式facing仍存在。FSA/IDB仅宿主替身，
不得mock serializer/guard/writer/loader，不声称原生OS picker验证。Root准入build allowed，独立提交。

## 验收和退出条件

对应真实用户入口与有意义负例通过，最小功能浏览器验证、保存/重开范围按实际记录；
源改完执行必要定向与统一质量门，lint/格式/types等error/warning/info均零。材料记录不冒充新实跑。
既有用户认可的004演示可闭合体验；其它卡按各自已证范围收口，未证项先完成或如实登记依赖。
每个实现文件一Owner；隔离候选先自验，Root直接复核后集成。不得删除未接收代码或丢失ignored证据。

## 交接

三个独立包先在523cf97d基线上建立隔离分支，实施包读取本卡及自身子卡后按白名单执行，交冻结SHA并停写。
Root收齐后核当前真实入口和质量门，再统一合并推送。005在本批收口前不启动。

用户询问17层是否真实存在后，Root实际枚举PAL共享库与294场景及content全文：共享库为空，callScript零处；
17层是合成边界反控，不是当前剧情编排问题。修复不增加作者步骤限制；用户可见说明已改为无法推断/只能推断部分帧序。
本轮当前剧情重点仍为走位、对白、方案切换和已走片段连续性，不把合成边界当成实际剧情欠账。

原只读e2e004_phase1_premise已交独立前提，实施开始前因模型容量失败；无实现改动。
Root将唯一实现Owner交pre005_sprite_preview，保留原独立证据。entity_names同样只读阶段容量失败，
两表单/通知包由pre005_editor_edges重新直接核一手证据后承担。未更改固定席位政策或模型配置。

## 历史清理收据（2026-10-02）

12张已接收卡按既定范围done归档，004明确记录本次用户“非常好”；其它界面不补写逐项用户确认。
旧朝向诊断oracle两文件已退役，正式三落点回归接管，历史Git523cf97d可恢复。
现行E2E文档改为001–004/content21/SAVE10；9月准入审计保留历史日期/原计数，未宣称剩余全量矩阵已完成。
ARCH-SUPPORT只关闭已accept材料接收；其17张/tmp截图已不存在，原哈希/历史验收保留，未补造原件。

退役前独立审计8处均clean、无活服务；非祖先提交逐一stable patch-id与main接收提交相等。
七处build共703文件及e2e-opening coverage1672文件、合成媒体小样17文件已保全；editor-movement无build如实记missing。
稳定副本位于主树`build/evidence-archive/pre005-20261002/`，总2392文件/266664792字节。
Root独立重新读取源/目标每个字节核SHA全部一致；总清单`manifest-with-coverage.json`
SHA256=`f52d1bb9a7698b2e530c267f47016dcec4acce87f9c347e34c484cf53e03e638`。
9条分支完整Git历史bundle验证通过，`retired-branches.bundle` SHA256=
`51dc0cdd19154ebc2a220d618ad3ff246b8de285f98c6fb2e09ea2a1ae3974fc`。

已退休：002-feedback、party-occlusion、e2e-opening、editor-movement、opening-handoff、e2e-003-runner、
e2e-004-content目录（原presentation-clock分支）、e2e-004-runner目录（原case-split分支）。
其中3处managed用archive_worktree保存可恢复快照，5处标准git worktree remove；9本地分支删除，远端对应ref均不存在。
资源实拷贝逐文件与主树相同，链接仅指主树未动其目标；不删除唯一作者输入。
原报告里的绝对来源不重写，复制后的前驱仍由report相邻save读取，映射/每文件哈希在上述清单。
Root/current pre005和外部GLM/Cursor/Grok/未知counter工作树不在退休范围。原6012 PID88523继续监听；主树仅用户.zcodeignore未跟踪。

遗漏复查再退3条未挂载且为main祖先的本地分支：codex/e2e-003@6d126ea976f0aa7632975bbb031187f5670e1d1f、
codex/e2e-004@554b8a0552db30294a9050b4466659c4a14549f8、codex/e2e-004-continuity@523cf97d0a33768dbb91b345ddece7fb26b7c7d6。
三者远端ref不存在，提交仍在main历史，可按原SHA恢复分支；SCRIPT-AUTHOR-2改记Root当前工作分支，母治理不关闭。
本轮此时累计8工作树、12本地分支退休；不含尚在验收的新pre005包。

## 编辑器四项最终接收

本轮完整`pnpm check`通过：七包10989项（1255/128/2773/357/2239/3785/452）、七包types、
docs37/覆盖工具30/质量工具27/E2E工具136及严格lint2758文件0 error/warning/info。
日志`build/pre005/full-check.log`；保留JSDOM一条“不实现跨Document导航”的宿主提示，不称测试stdout/stderr绝对空，
静态硬门确为零诊断。追加自动方案定位`fcada709a`后Root独立48项无stderr、editor两段types零诊断；
后续录制接入后的E2E工具174、严格lint2762文件0/0/0、docs821文档/4344链接/260任务0问题。
普通004 verify补跑`reforge-004-story-2026-10-02T09-09-41-529Z`passed，不受capture选项影响。

四编辑器卡按既定目标技术done归档：真实三朝向弹层/完整writer、两清选入口、实际帧序说明和自动方案定位
均已独立验证；没有新产品取舍或未解counter。临时6014及合成工程链接已清理，真实6012不关闭。
本轮没有改任何PAL正文、NPC路线或剧情方案，17层仅边界测试；普通作者编排保持原样。

## 用户磁盘约束与后续收尾

用户已删除录像并说明磁盘紧张；Root不恢复已删除视频，报告/哈希保留为删除前历史而非现存素材证明。
用户要求继续后，Root明确不补录整段，只准入E2E-CAPTURE-1的首部代码修复与限5MiB、几秒级验完即删样本。
大型证据不再复制；代码与存档、小型回执保留。磁盘约束不用于把已知片头缺失伪报为已修；
录制整片交付不再作为本轮实物产物，完整系列capture-ready仍未宣称。

Root按磁盘约束删除自身14个旧合成/探针音视频（均在两个已核/tmp专属目录，可按需重新生成，不是游戏素材），
以及92MB重复Git bundle。删除前先为9个原tip创建并逐一验证`refs/archive/pre005-20261002/codex/*`，
原提交树仍可达，可以`git branch <恢复名称> <归档引用>`恢复；不是丢弃原分支历史。
本次释放103689500字节（约99MiB），精确路径、字节/哈希和恢复引用见主树
`build/evidence-archive/pre005-20261002/storage-cleanup.json`。旧bundle哈希保留为历史，当前恢复方式改为这些引用。
指向用户已删录像的临时HTML播放器索引也已移除，测量JSON保留为历史，不展示不存在的影片。

### 编辑器先行交付

主树磁盘清理任务曾有board草稿，整批ff被Git拒绝，未覆盖或stash。Root改用仅含13个editor文件的
`codex/pre005-editor-release@198b3c6f8`，与已独立验收fcada709a的editor目录逐字零diff。
用户告知磁盘清理已结束后，main已包含其f913ac454；Root合入为d786ca900并成功推送origin/main。
合并前后board、OPS-CURSOR-TEMP-CLEANUP-1原件及用户.zcodeignore SHA逐项不变；磁盘清理归另一任务，不计为本卡释放量。
6012更新前真实DOM保存disabled/底栏已保存；HMR后仍s003同URL、已保存，原服务保留。
未验收的录制首部代码没有随编辑器先行包发布。Root工作分支已合入main，保留双方提交与文档。
