# Codex 帧动画编辑器五组工作流

[测试入口](../README.md) / [任务卡](../../ops/archive/tasks/done/TEST-CODEX-FRAME-EDITOR-1-current-workflows.md)

2026-09-28用户恢复本卡，Codex在当前主线e8710f87上继续45421fdf中途检查点。
帧编辑功能原已存在于资源→过场素材；本批完成其测试工作流，并按用户追加授权修复已复现的业务错误。
正式空白工程经当前loader与EditSession，TPFS经生产编码器/reader；核心组件、编码器、
读取器和保存命令均运行真实实现。JSDOM只补Canvas/ResizeObserver/指针/几何宿主端口。

| 组 | 新文件 | 项数 | 直接证据 |
|---|---|---:|---|
| 载入 | `FrameAnimationEditor.loading.test.tsx` | 6 | TPFS元数据与主图/缩略图RGBA；失败提示/切源恢复；迟到旧载入、卸载和草稿切换；坏payload可见错误与零未处理拒绝 |
| 编辑 | `FrameAnimationEditor.editing.test.tsx` | 5 | Shift/Ctrl/Meta稳定帧选择；复制删除实际像素顺序；撤销重做及分支清redo；全局帧率/逐帧时长；导航及dirty |
| 播放 | `FrameAnimationEditor.playback.test.tsx` | 3 | 实际组件40/70/40ms定时链；循环/非循环终点；暂停和卸载清实际计时器 |
| 视口 | `FrameAnimationEditor.viewport.test.tsx` | 3 | 键盘/工具条驱动Canvas尺寸；滚轮指针锚定；捕获指针/外来指针与取消释放 |
| 保存 | `FrameAnimationEditor.save.test.tsx` | 7 | 真TPFS重编码/摘要/路径、全局undo/redo、最近色/误差扩散/整组量化及半透明；读盘/编码/调色板失败后的同实例恢复 |
| 异步归属修复 | `FrameAnimationEditor.async-ownership.test.tsx` | 9 | 导入成功正控/切源后迟到成功与失败、量化切源和新旧finally交错、保存切源/卸载、忙态锁定，以及保存期间改名保真 |

共33项；六份测试与专用fixture为本卡新增产品目录文件。旧重排测试文件内三项
重排/虚拟窗口/忙时拖拽保持existing-proof；纯draft/codec/Worker传输旧测试不重复统计为新增。
不替代浏览器布局、音轨或剧情验收；本批验证的是DOM事件、时间线和真实存储产物合同。

## 已复现并修复的业务错误

- 量化/图片导入在切源后继续提交旧草稿，旧操作catch/finally也会污染新资源的错误/忙态。
  真实父层CutsceneTab允许无脏改时直接切源、有脏改时“放弃并继续”；本次引入来源与操作token，
  切源/卸载使旧token失效，只有当前操作可提交草稿、错误和busy收尾。
- 保存最后hash等待中离开，旧结果仍会执行UpsertAssetCommand；五个异步所有权回归在旧产品上全部业务红。
  保存每个异步边界后核来源/当前revision，最后hash后也核定，避免已丢弃保存进入会话。
- 保存期间草稿修改控件仍可改动，保存旧闭包会丢弃后来编辑。保存/量化/导入期间锁定草稿写控件，
  来源切换后立即释放旧忙态；预览/导航继续可用。
- 损坏TPFS的缩略图拒绝未被捕获；解码Error.message为空时主预览也无可见提示。
  缩略图和主预览统一上报非空错误，过期读取不会上报；可切到合法资源恢复。
- 保存期间用当前UpdateAssetLabelCommand改名，旧record展开会回写旧名称；新增精确名称回归先红。
  现在保存读取当前同revision record，保存及撤销都保留期间独立完成的名称修改。

初始反例日志：`/tmp/codex-frame-editor-business-red.log`（6断言红、3未处理拒绝）和
`/tmp/codex-frame-editor-label-red.log`（精确名称断言红）。修复局限于FrameAnimationEditor.tsx；
TPFS格式、reader/codec、资源命令及既有测试均未修改。

## 反控与定向

`node docs/testing/codex-frame-editor/mutants.mjs`：十绿对照+十红针，分别破坏
当前名称读取、操作来源门、旧finally门、最后hash后提交门、迟到载入门、复制源帧、
计时器清理、pointerId门、保存时长和全量量化索引。
每针单点虚拟替换，钉精确fullName/物理文件，仅接受自身AssertionError，拒绝超时或其它错误；
源FrameAnimationEditor.tsx的SHA-256前后保持。终次20跑均通过，输出目录
`codex-frame-editor-czdma6`，总日志`/tmp/codex-frame-editor-final-mutants.log`。

新六文件及相邻draft/codec/worker/images/重排/过场/资源标签共19文件90项通过；editor typecheck零诊断，
本批代码Biome零诊断。修复后的完整仓库check→官方ratchet→保护e8710f87的单次strict-fast
严格串行并全部exit0：check **10,176项**，fast **9,715项/730生产文件**；全仓lint
扫描2,391文件且error/warning/info均0。日志分别为
`/tmp/codex-frame-editor-repaired-check.log`、`/tmp/codex-frame-editor-final-ratchet.log`、
`/tmp/codex-frame-editor-final-strict.log`。较早23项纯测试候选的完整check也曾通过，
随后新增业务反例发现问题，最终只采信修复后的同树结果。

| 口径 | 合入前 | 最终 | 变化 |
|---|---:|---:|---|
| 全仓分支 | 47,489/63,323 | 47,637/63,361（75.18%） | +148命中/+38分母 |
| editor分支 | 21,445/28,416 | 21,593/28,454（75.89%） | +148命中/+38分母 |
| FrameAnimationEditor分支 | 120/286 | 266/324（82.10%） | +146命中/+38分母 |
| FrameAnimationEditor行 | 238/412 | 432/445（97.08%） | +194命中/+33分母 |
| FrameAnimationEditor函数 | 58/103 | 105/109（96.33%） | +47命中/+6分母 |

产品修复与补测合并统计，未宣称全部增量来自纯测试。其他六包基线对象保持，生产文件清单和
统计选择不变。Codex核本卡done并归档；分支在合入推送后退役，E2E工作目录继续复用。
