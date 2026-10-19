# 批52:editor core 中件 38 文件（零整改批）

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

范围:`packages/editor/src/core/` 201-600 行生产文件 38 件(author-save-plan 至 map-transform)。全文读毕(六段拼读 12.5k 行)。八维审查（A–H）全部通过,零源码改动、零 diff。

## 结论(要点)

- **保存恢复计划(author-save-plan/receipt/journal 支撑)**:恢复计划不可变校验(键集精确/UUID/NFC 别名冲突检测/父目录完整链/写入必须双态);savePrefix 只认已授权前缀;reconcileSaveCursor 对账单不确定操作(EMPTY_FILE 半开流语义);receipt 表按 phase(state machine)约束 completed/issued 组合,blobs 路径与签名尾 64 位互锁;IndexedDB durability:strict + 事务边界语义(abort/complete 才是边界)注释准确。
- **handle-store/workspace 身份**:Web Locks 序列化 discovery/registration 双锁(浏览器跨 tab)+ Promise 链 fallback(测试环境);同 entry 拒绝二次登记;ensurePermission query/request 手势纪律。
- **作者磁盘基线(author-disk-baseline)**:observeAuthorSource 捕获 loader 实际字节(非重序列化);mutation 的 wrote() 按写入方精确编码记期望(绝不通过迟到重读采纳外部改动);资源哈希走 catalog 派生不逐次重算。
- **历史协调(EditorHistoryCoordinator)**:单一提交时间线;transact 防重入;commitNew 跨会话事务(脚本侧 preview 引用清理自动并入 Composite);undo/redo 侧序(undo 先主后脚本,redo 反之)保持两侧公开状态完整旧态直到 commit。
- **投影合并(script-editor-projection)**:主会话 shell/脚本会话 canonical 的唯一合并点(保存边界拒私有脚本正文缺失;UI 投影允许半态);projectCurrentAuthorReferenceSlices 只拷三切片避免深拷大表。
- **地图 patch 体系(map-patch/map-edit-commands/map-transform/stamp-*)**:W8 预检三域(坐标/层权限/值)+ 三种 ownership scope(ordinary/stamp-group-members/stamp-group-transform);「ownership 必须在 no-op 折叠前检查」防写回同值借机触碰组成员;map-transform 相对偏移用 u=2col+parity 防奇偶行 16px 漂移;nudge 沿菱形边;剪贴板 offset 语义(cut 保 id/copy 新 id 预留集);失败计划不给可提交 patch(只供幽灵预览)。
- **stamp-ownership OverlayLookupMap**:不可变差分索引深度上限 64 有界压实;二分查 canonicalPlacementById(placements 按 id 排序前提声明为 @internal 契约)。
- **引用扫描族(battle-data/actor/entity-address/world-variable-references/script-references)**:只识别明确 kind 判别字段绝不猜同名属性;调用图 DFS 环检测(仅报告含 authored 脚本的环);loadScene.entry 退役字段迁移检查。
- **movement-preview**:静态无副作用轨迹图;mergeStates 合并知识不合并执行(分叉臂不虚构下一起点);10000 命令上限+共享脚本递归 32 深上限。
- **命令族(tileset/sprite/battle-sprite/scene/map-asset/actor/stamp-commands)**:共享资源替换 proof 机制(SHA+帧数+消费者快照;缩帧必须显式修复全部消费者且 profile 类型不可变);上传路径唯一性三重检查(id/asset/path owner);删除走 current 引用索引;invert 恢复字节(previousBytes/persistedBytes)。
- **battle-trial-launch/receive**:同源 MessageChannel 握手(一次性 launchId/ready→check→config→ack/restart 轮换 id);源 token/revision 双核验;刷新重用拒绝。

## 登记移交（无新增）
本批无新清理候选。

## 验证
- 定向测试:src/core 全量 2331/2331、numFailedTestSuites=0（directed.json）。
- 零 diff 批:无源码改动,不适用 body-invariance。


## 原生附件无损迁移（Codex，2026-10-19）

原directed.json超过现行1MiB检查边界；现以[原始JSON的无损gzip](directed.json.gz)保留，解压字节/SHA与冻结5af1b6372一致。 未放宽files.maxSize或新增ignore；迁移与失败/恢复身份见[当前回执](../codex-stage2-rework.json)。
