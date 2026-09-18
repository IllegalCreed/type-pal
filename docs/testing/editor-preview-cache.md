# 编辑器预览缓存 · E-03/E-04连续修复记录

Owner：Codex；2026-09-19。接续场景引用保护收口，GLM运行时补测在独立分支返工，不等待、不混合提交。
范围：FireEffectPreview与SpriteThumb的**私有呈现缓存**和回归；现有加载器、解码器、资源格式、跨包接口、UI形态与播放规则全部保持。
按AGENTS“同一Coding Owner同会话连续常规迭代可不开卡”执行，不新建签字卡、不扩成缓存框架/资产管线变更。
若需要改读取协议或跨包API，则停止扩大范围并另取准入。本记录不授权这些变更。

## 前提与边界（实现前）

| 真值面 | 证据 |
|---|---|
| 原版 / primary source | 原版创作编辑器N/A；资源身份以当前catalog/AssetResolver/EditorAssetReader为真源，不重裁FIRE播放速度/循环/声音公式 |
| 第一阶段 | 不搬旧缓存结构；harvest的X8并发请求共享、失败恢复是工程经验，本次用当前实际加载链验证 |
| 当前二阶段 | FireEffectPreview.tsx:15全局cache只按chunk，:28/30失败或空结果永久null；SpriteThumb.tsx:15/24只按projectId/asset/revision/frame全局强引用，:36-40失败永久null |
| 真实消费者 | SkillAnimationEditor.tsx:274展示FIRE；App.tsx:3745/3775/4099与SpriteImageViewer使用SpriteThumb；core/sprite-assets.ts的底层缓存已按reader隔离并允许失败恢复 |
| 目标 | 每个读取上下文及实际资源修订独立；成功结果/在途请求仍去重，失败后再次挂载可恢复，同Root换props时迟到结果不能覆盖当前图像 |

已读[工程审计E-03/E-04](../ops/audits/pre-e2e/engineering.md)、[取证包](glm-pre-e2e-prep-report.md)、上述源码与EnemyBattleSpriteThumbnail已用的失败驱逐惯例。
替代解释：两工程本来同内容、下层加载器出错、视口未触发、重试尚未完成、暖缓存零读被误判失败。
用合法catalog/真实gzip-RLE/真实SHA/标准色表、真实组件及加载器逐一排除；Canvas/IntersectionObserver仅为宿主边界替身。
失败注入必须实际发生，重试以绘制恢复为准，不要求下层已预热时重新读盘。私有缓存中没有schema/save/migration内容修改。

范围明确不含：新增自动轮询/重试按钮、修改音频异步策略、资源导入能力、pending FIRE读取协议、缓存容量/LRU或内存泄漏结论。
FIRE仍走传入AssetBase的现有读取合同；SpriteThumb仍走pending-aware EditorAssetReader；只修它们之上的身份/修订/失败缓存。
前期GLM取证贡献见上述已接收工作包；本轮正式回归、修复、负控与视觉验证由Codex执行，不把GLM取证或独立返工当作本修复终审签字。

## 实现与验证

实现只改两个生产组件：FIRE按AssetBase身份分区，缩略图按AssetBase与EditorAssetReader双身份分区；
缓存键包含真实精灵/特效记录与标准色表记录，资源修订触发effect；成功/在途结果仍共享，null结果仅在仍拥有该条目时驱逐。
保持已有alive收口、懒加载、播放/音效规则和JSX原样，没有新控件。

正式回归：`packages/editor/src/ui/preview-cache-boundaries.test.tsx` **15项**；
fixture在`packages/editor/src/ui/__tests__/preview-cache-fixture.ts`，catalog及角色映射先过现行守卫，
使用真实gzip-RLE/SHA/色表/解码器，只替换Canvas与IntersectionObserver宿主边界。加载器包装只记录并等待原Promise，不替换结果。

- 13项实现前先红：11个业务断言失败、2个正常对照通过；无TypeError/超时/未处理异常。
  随后补两个身份单轴回归：AssetBase相同而reader不同、reader相同而AssetBase不同；最终15项全绿。
- 源SHA与色表修订分开验证，source-only变更明确断言色表SHA未变。
- 相同元数据跨读取身份必须真正触发B的IO，不让A的暖缓存掩盖B故障。
- 故障注入见证、底层成功预热、重挂载绘制恢复；允许暖底层零读，不将零读误判为失败。
- 在途去重用entered/deferred确认首次真实读取尚未结束；同React root A挂起→B完成→A完成仍显示B。
- 最初测试宿主出现React act告警，改成观察真实Promise并在act内flushSync/等待，不以告警版为最终证据；
  source/palette轴与在途前提也在最终红树前修正。日志保留各次现场，不倒填为一次通过。

可重建命令：

```sh
pnpm --filter @type-pal/editor exec vitest run src/ui/preview-cache-boundaries.test.tsx src/ui/EnemyBattleSpriteThumbnail.test.tsx src/ui/SkillTab.test.tsx --no-file-parallelism
node docs/testing/editor-preview-cache-mutants.mjs
pnpm --filter @type-pal/editor run typecheck
```

[负控工具](editor-preview-cache-mutants.mjs)：1正控+7单点负控全通过期望；每针只在Vite隔离加载中改一个连续片段，
原生产文件hash前后不变。三针独立破坏FIRE上下文/缩略base/缩略reader身份，两针保留失败null，两针忽略元数据修订。
每针必须有函数运行态见证、15项实际执行、指定新测试AssertionError且无环境错误，拒绝混合失败；不只依赖模块加载标记或exit1。
日志：`/tmp/type-pal-preview-cache.L3KoVm/`；负控明细：`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/editor-preview-cache-mutants-uhN9Pn/`。

## 最小浏览器验证（Codex，2026-09-19）

[可重建隔离入口](editor-preview-cache-visual.mjs)：运行`node docs/testing/editor-preview-cache-visual.mjs`，
复用editor开发服务打开`http://localhost:6010/build/preview-cache-verify.html`。
只生成gitignored build入口、内存fixture，不读写用户工程；测试按钮不是新增产品UI。

实际浏览器Canvas与正式组件/样式：A红色→同ID同特效号B蓝色→同base/reader色表更新绿色，两图均符合；
故障计数恰2时FIRE显示原有“无法加载”且缩略图空白；底层预热后同修订重挂载，两图恢复蓝色。
原生截图逐步查看（会话工具证据，未虚构本地截图文件），控制台warn/error为空。没有剧情视觉E2E或声音验证声明。
浏览器只读DOM桥不支持Canvas getContext，未用桥读取像素作证明；实际截图与单测真实烘焙RGBA断言分别证明视觉与数值。

## 统一质量门

已串行完成完整`pnpm check`（7包**7457项**，editor **2518项/241文件**；20 docs-tools、17 coverage-tools另计）
与官方`pnpm coverage:ratchet`（**6969项/617生产文件**，editor **2359项/222测试文件/219生产文件**）。
check的lint exit0，保留既有48 warning/11 info，不声称零诊断；本轮改动文件Biome干净。
受保护**单次严格fast通过**：`TYPE_PAL_COVERAGE_BASE_REF=1647d2e1 pnpm coverage:fast`，
6969项全绿，与ratchet的所有指标完全一致（提升0/下降0）；未以多次重跑取多数。

独立对账：221个旧editor测试文件的identity/计数逐项原样、其它六包完整基线对象逐字相同、全仓生产清单/scopeDigest相同。
只新增一个15项文件，没有缩统计范围或降低阈值。全仓行49258/69119（71.27%）、语句54609/78971（69.15%）、
函数10308/14520（70.99%）、分支39065/62045（62.96%）；editor行22346/27865（80.19%）、
语句24828/31878（77.88%）、函数6174/8110（76.13%）、分支19264/27593（69.81%）。
本轮同时修产品，分母新增31行/33语句/4函数/14臂，命中净增120/133/24/69，不将覆盖提升冒称纯补测贡献。
未跑full/E2E，未把GLM运行时返工测试混入；最终全仓90%/85%目标仍未完成。
2026-09-19本次常规连续修复完成，由Codex统一提交收口。无下一位Agent提示词；无需再次三签。
E-03/E-04按上述私有缓存范围关闭，其余审计缺陷及完整E2E保持原归属。
