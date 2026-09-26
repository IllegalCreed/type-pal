# TEST-CODEX-FRAME-EDITOR-1 — 当前帧动画编辑五组工作流

Status: build
Owner: Codex
Phase: phase2
Visual Verification Timing: N/A（真实DOM与RGBA交付合同；宿主几何是显式夹具，不宣称浏览器布局验收）

## 准入与前提

2026-09-27用户优先级调整：本批暂停实施。已有未完成测试/fixture留在主工作树，不提交正式测试、
不计覆盖、不删除；Codex转[E2E讨论](E2E-R4-1-route-and-checkpoint-foundation.md)。
Status保留build表示未完成，本节暂停指令优先于下文原连续实施计划。

2026-09-26 Codex build allowed，基点26479604，属于[持续覆盖队列](TEST-COVERAGE-PLUS5-1-continuous-batches.md)。
现行消费者CutsceneTab.tsx:713-721渲染FrameAnimationEditor；目标FrameAnimationEditor.tsx。
当前官方目标B120/286、L238/412、F58/103。不是把未渲染旧入口转成覆盖。
原版/第一阶段N/A：这是新编辑器的数据编辑合同，不裁决剧情表现、玩法或资源格式。
最强替代解释为重做已有codec/draft纯函数或reorder三例；本批只从真实组件事件证实际接线和产物，
旧重排/虚拟窗口/忙时拖拽保留existing-proof，不作为新增；底层纯函数不复制旧断言。

## 五组与边界

1. 正式TPFS载入、元数据、像素交付、失败/换源/卸载生命周期。
2. 数值与选帧、复制/删除、本地撤销重做、未保存输入保真。
3. 实际播放器定时推进、逐帧时长、循环/暂停/终点与卸载清理。
4. 缩放/平移键盘与指针接线，显式几何宿主；不冒称物理布局或截图验收。
5. 保存/量化经真实worker降级纯核、UpsertAssetCommand/EditSession、正式TPFS重新解码逐字节核验及错误恢复。

新增ui/FrameAnimationEditor.{loading,editing,playback,viewport,save}.test.tsx、
ui/__tests__/frame-editor-fixture.ts、docs/testing/codex-frame-editor/**；产品/旧测试/配置/资产不改。
完整合法空白工程经正式loader，TPFS由正式编码器构建，真实reader与EditSession；
宿主替身仅补JSDOM的Canvas/ResizeObserver/几何/指针端口，不能mock核心reader/codec/command。
实际消费输入深快照，真实session仅保存时改变；异常留可复验红诊断、不修改预期固化bug。
整批定向/相邻/TC/Biome及代表单点反控后，统一串行check→ratchet→保护基点单次strict。
不等待贡献者，不改其文件；无下一位Agent提示词，Codex独立实施与收口。
