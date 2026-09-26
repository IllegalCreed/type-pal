# B2 地图工作区会话所有权候选

后续统一门与当前集成状态见[统一回执](architecture-continuation-integration.md)；下文为分项候选时的验证快照，
其中“不合 main/未跑统一门”不代表后续集成状态。

Owner：Codex；基点 `1e15f64f`；实现 `3c3fccda`、`a2ea1dee`、`3a633ed7`；所属
[连续治理卡](../ops/archive/tasks/done/ARCH-CONTINUATION-1-remaining-queue.md)。本候选不合 main、不运行共享全仓
coverage 门；待原接收对话统一集成和执行 check/ratchet/strict。完整计数、命令和未证项见
[机账](map-workspace-sessions-refactor-evidence.json)。

## 所有权边界

- `MapPointerGestureSession` 独占单次画布交互的 stroke、painting/rect anchor、pan、selection drag/preview、
  hover 与 coordinate hover。pointerId 隔离、stroke 同格覆盖和一次性取走、pointer cancel/lost capture/window blur
  同步清场均在一个 owner 内；它只回调重绘失效，不接收 MapMode 总上下文，也不构造编辑命令。
- 既有 `mapWorkspaceReducer` 继续是正式选择、隐藏/锁定图层和组内选择的 owner；没有复制第二份选择真值。
  `useMapTransformSession` 独占 include-collision 偏好、内部剪贴板、paste/move intent、目标锁和覆盖确认。
  换地图保留 cell clipboard、释放带地图身份的 stamp placement clipboard；换 EditSession 释放全部工程态但保留
  include-collision 用户偏好。
- `useMapWorkspaceViewSession` 独占 grid/collision 显示、工具与 inspector、图章 palette/hover/recent、瓦片与
  tileset、画笔/显示高度、brush、focus、活动图层和“保存为组合”对话状态。滴管采样对瓦片源、两个高度和工具
  的更新仍是同一同步事件；工程会话重置只释放工程相关工具态，不把显示偏好误当内容。
- `useMapStampStructureSession` 独占删除图层/改尺寸前的 stale-snapshot 确认意图与返回焦点资源；刷新只替换
  revision/map/影响清单，保留原操作。MapMode 仍负责读取实时地图、权限、构造命令、revision-guarded dispatch、
  原子历史提交和完成后的活动图层选择。
- MapMode 继续拥有坐标/命中计算、工具与只读政策、paste/move/delete/stamp plan、命令标签与同步提交；四个新 owner
  只接收窄输入。`MapMode.tsx` 从本批当前基点的 3819 行降到 3734 行；公共出口、content20/SAVE8、地图格式、
  坐标/碰撞语义、资产约定和 UI 形态零改。

## 采样、提交与取消合同

- selection pointer-up 先按同一 pointer 完成 drag 并原子取走 preview，再向既有 reducer 提交正式 selection；painting
  同样先一次性取走 stroke，再构造单个 tile/collision patch。取消只丢弃预览与临时 stroke，不产生历史。
- paste/move/repeat 的 hover anchor 在请求时读取；锁定目标后权限、只读层和冲突规划仍由 MapMode 对实时地图执行。
  无冲突、覆盖确认和 unchanged 都经 session 的 complete 同步释放 preview/lock/overwrite；取消不改工程内容。
- 地图切换清 gesture/preview 和地图身份态，但保留普通 cell clipboard；EditSession 切换同步释放项目绑定的
  clipboard、组合确认、候选菜单与工作区 reducer。组合结构 revision 变化时只刷新影响清单并要求再次确认，
  本次不执行命令。

## 回归与反控

- 新增 21 项：pointer gesture 6、transform 7、view 4、stamp structure 4。地图/组合相邻批 33 文件/260 项通过；
  Editor 整包 332 文件/2868 项、TypeScript 与 production build 通过；build 仅保留既有大 chunk 提示。
  候选文件 Biome 无 error，最终四个 owner 定向 21/21 通过。
- [pointer 九针](map-pointer-gesture-mutants.mjs)覆盖 stroke 覆盖/取走、pointerId、selection 取走、cancel 重绘、
  pan 释放、coordinate reset、blur 与 lost-capture 接线；control 6/6，9 个坏实现均由指定候选测试的单一
  `AssertionError` 检出。最终临时机账：
  `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-map-pointer-gesture-mutants-NiFnKl/summary.json`。
- [会话十六针](map-workspace-sessions-mutants.mjs)覆盖 transform complete/返回调整/地图与会话 reset/nudge/组合分类/
  owner 接线，view reset/非法图章/滴管/初始 tileset，以及结构 focus/refresh/close/reset；control 15/15，
  16 个坏实现均被指定业务断言检出。最终临时机账：
  `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-map-workspace-sessions-mutants-5lW5Qf/summary.json`。
- 两个反控工具都要求精确 absolute test/fullName、只执行一个候选测试、exit 1、仅 AssertionError、唯一 loader
  marker 和全部产品 hash 不变；判据各 1 个正例/9 个反例。

## 隔离功能核验与未证项

Codex 在 6055、`VITE_PROJECT_ID=pal` 的隔离编辑器直达 `map/workspace/map-122`：地图、两层、工具栏和 inspector
正常；选择一格后通过画布语义菜单建立“重复”产生的粘贴预览，显示锚点 `r126:c33`、仅视觉、目标已锁定和
1 处覆盖冲突；Esc 取消后预览消失、选区保留、保存仍禁用，通知为“已取消地图变换预览。”，console
error/warning 为零。未调用保存、打开或目录选择，未读写正常工程/存档，不占 6010；页面关闭、服务停止。

浏览器自动化层会截获系统 copy/paste 并要求其虚拟剪贴板，因此本轮没有把实际 Cmd/Ctrl+C、Cmd/Ctrl+V 作为
视觉证据；同一内部 clipboard/transform 路径由 MapMode 既有回归、新 session 单测与菜单“重复”预览覆盖，
原生快捷键视觉仍列为未证。另未运行全仓 check、官方 coverage ratchet、受保护 strict、full/Q1/Q2 或远端 CI，
未更新官方 coverage 基线。B2 只在候选树四类边界齐备，须由原接收对话完成统一门并合 main 后才能正式标完成。
