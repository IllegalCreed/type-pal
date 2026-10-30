# 批51:editor core 微/小件 74 文件（零整改批,editor 包开工）

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

原审计「批51:editor core 微/小件 74 文件（零整改批,editor 包开工）」的主题按原文时点保留(摘录:> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json))。

## 范围与证据

原报告含章节[批51:editor core 微/小件 74 文件（零整改批,editor 包开工）、结论(要点)、登记移交（无新增）、验证、原生附件无损迁移（Codex，2026-10-19）]、2个链接;固定main源2847B(SHA d3ecbe3c94e2)。当前存活入口:[codex-stage2-rework.json](../codex-stage2-rework.json)、[directed.json.gz](directed.json.gz)

## 发现

原文发现/计数/日期按原时点保留在保全块;本页不重算审计结论。

## 结论

原结论保持原时点;治理不改写审计判定,不撤销旧撤信,不恢复旧完成声明。

## 整改与复核

本治理候选仅覆盖文档角色与保全;整改事实以原文与后继卡为准;候选待Owner接收。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2847B / SHA-256 d3ecbe3c94e237c52fe7388ce1e285a4c73f0fe01409d815e0ab275c7a9009bf；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# 批51:editor core 微/小件 74 文件（零整改批,editor 包开工）

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

范围:`packages/editor/src/core/` 全部 ≤200 行生产文件 74 件(10-200 行,binary-signature 至 ui-review-samples)。全文读毕。八维审查（A–H）全部通过,零源码改动、零 diff。

## 结论(要点)

- **命令族纪律统一**:全部 Command 实现 apply 产新态/invert 还原、首次 apply 捕获旧值、structuredClone 防外泄引用;删除类命令(enemy/poison/item/skill/shop/ambience/enemy-team/world-variable/asset/stamp)每次 apply/redo 用 current-author 统一索引复核引用(InUseError 带结构化 references);invert 恢复按原索引并防 id 占用。patch 语义统一(undefined 值 = 删键)。
- **Command 环治理**:对 command-contract 仅 type import,commands.ts 运行期 re-export 无环(注释在每文件重复声明);CompositeCommand 逆序回滚。
- **保存/打开边界**:openLocalProject 只收当前 contentVersion(无版本分发);loadPlayProject 读锁夹验;project-read-lock 未注册目录持 discovery 锁防并发首保存;reconcileSaveCursor 崩溃恢复单不确定操作对账(EMPTY_FILE 半开流语义);observeProjectCopySource 逐文件签名防复制期间漂移;exportProjectZip 恢复子树跳过+catalog 逐资源 bytes/sha256/battle-sprite 全量校验。
- **图章(stamp)体系**:placement mutation 只校验受影响组(unchanged 复用 canonical 对象防全量重扫)+双所有权表(visual/collision)冲突检查;结构操作(lifecycle)默认 fail-loud,解组/删除整组与结构变化同 map 原子;模板从选区构建(局部坐标平移+NFKC 规范 id)。
- **派生 worker 协议**:editor-derived contract init/patch/advance + revision 门;worker runtime patch 缺记录 fail-loud。
- **杂项质量**:zip 零依赖打包器(DOS 时间恒零可复现/STORE 择优/无 zip64 清晰报错);mp4 音轨探测只扫 ISO BMFF box 层;ui-review-samples 显式命名空间注入且既有内容优先;isometric-brush/fill 双斜轴几何与 map-transform 一致;video-metadata/fourCc 边界安全。

## 登记移交（无新增）
本批无新清理候选。

## 验证
- 定向测试:src/core + src/__tests__ + play.test.ts 全量 2366/2366、numFailedTestSuites=0（directed.json）。
- 零 diff 批:无源码改动,不适用 body-invariance。


## 原生附件无损迁移（Codex，2026-10-19）

原directed.json超过现行1MiB检查边界；现以[原始JSON的无损gzip](directed.json.gz)保留，解压字节/SHA与冻结5af1b6372一致。 未放宽files.maxSize或新增ignore；迁移与失败/恢复身份见[当前回执](../codex-stage2-rework.json)。
```
<!-- incremental-original-source:end -->
