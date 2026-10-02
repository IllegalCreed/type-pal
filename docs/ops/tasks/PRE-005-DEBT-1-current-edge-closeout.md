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
| 深链预览伪造帧0 | 无真实采样不造帧；预算截断不伪装完整循环，当前真实资源UI可解释 | e2e004_phase1_premise |
| 001–004录制与音轨 | 对已验片段建设窄capture能力及原声/画面/语义回执；先交实际可行样本再冻结范围 | e2e004_runner，准入另补 |
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
  运行时可执行的17层链因此在编辑器伪报。当前WorldSpriteLibrary引用行消费detail，旧mock-prop不是实际UI证据。

最强替代解释及反控分别写各子卡；用户新授权已足够处理这些保持既有合同的修复，不重复申请旧“待选项”。
Root `premise verified / design agree / build allowed`，限以下文件域。录制公共接口和生命周期待实际调查样本后单独准入。

### 单一写入白名单

- pre005_editor_edges：`command-form-world.tsx`、`CommandForm.current-scene.test.tsx`、`MapMode.tsx`、`MapMode.test.tsx`
  及确实必要的相邻保存/重开测试。只朝向选择回调显式makeLoadScene，其余rebuild继承不变；真清选共享回调
  更新通知，保留stamp/拖动/transform/menu/组编辑更高优先级Esc。禁止修改全局DiagnosticsBar/schema/runtime。
- e2e004_phase1_premise：`world-sprite-behavior.ts`和相邻真实公有API/当前caller测试；WorldSpriteLibrary实现
  仅在现有detail呈现不足时最小修改。不改runtime深度预算、作者内容、采样安全预算，不冒充完整概率/循环。
  原6条chance示例与截断提示保持，空预算采样不得默认#0；partial单variant不得丢失不完整语义。
- Root：本卡/子卡/看板/索引/当前文档/历史工具退役、独立验收、证据保全及git收口。贡献者不同时写这些文件。

## 验收和退出条件

对应真实用户入口与有意义负例通过，最小功能浏览器验证、保存/重开范围按实际记录；
源改完执行必要定向与统一质量门，lint/格式/types等error/warning/info均零。材料记录不冒充新实跑。
既有用户认可的004演示可闭合体验；其它卡按各自已证范围收口，未证项先完成或如实登记依赖。
每个实现文件一Owner；隔离候选先自验，Root直接复核后集成。不得删除未接收代码或丢失ignored证据。

## 交接

三个独立包先在523cf97d基线上建立隔离分支，实施包读取本卡及自身子卡后按白名单执行，交冻结SHA并停写。
Root收齐后核当前真实入口和质量门，再统一合并推送。005在本批收口前不启动。
