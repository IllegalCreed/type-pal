# 全仓测试质量审计（2026-10-03）

任务卡：[AUDIT-TEST-QUALITY-1](../../../../../ops/archive/tasks/done/AUDIT-TEST-QUALITY-1.md)。本审计以保护基线 `8efe048610fab7aa4a257a716b91ece30194eba8` 与有限测试接入后的冻结候选为对象；不以测试数量或覆盖率增长作为保留理由。

## 机器清点

AST 清点覆盖 1,701 个测试/fixture 文件、11,873 个 test/it 定义；其中包测试文件为 content 147、shared 19、game 293、pal-extract 63、reforge 298、editor 595、migrate 88。37 组完全相同函数体、173 个仅弱可见 matcher、458 个无可识别 matcher、232 个 `as unknown as`、147 个 `as never`、24 个 TS suppression、2 个 skip/only/todo 文件、36 个 IO/临时路径候选被列为待人工核验；这些数字是筛选器结果，不是删除判定。

分域细看：reforge 326 文件/2,035 定义、content 160/1,059、migrate 94/577；其中 migrate 的 22 个 IO 标记均需结合临时根 finally/真实 caller 审查，不能按“有 IO”判垃圾。promise/double/never/suppression 静态标签均未单独证明错误 oracle。

审计前全包 JSON 实跑无失败/待办：content 1,472、shared 154、game 3,231、pal-extract 381、reforge 8,017、editor 4,760、migrate 669，共 18,684 例。最终冻结树全包复跑通过：content 1,472、shared 113、game 3,224、pal-extract 377、reforge 8,017、editor 4,758、migrate 670，共 18,631 例，失败/待办/todo 均为 0。性能复核中，Editor 静态采用门约 62.9 秒、真实 PAL corpus 的不同 caller 最慢约 90.6 秒，均有独立 oracle，未因耗时直接删除。CLI 的共享 setup 可另作性能优化，不能以牺牲合同原子性换取合并数字。

## 已核语义裁决

### 删除/合并

- `packages/editor/src/ui/FrameAnimationEditor.c04.cursor-r1.test.tsx` 原 C04-G04-08 与 C04-G04-02 完全相同：同一 fixture、同一选择、同一删除、同一 `durationMs=80` oracle。已删除 C04-G04-08；C04-G04-02 保留并由现行文件实跑通过。该删除不改变独立输入轴或产品行为。
- `packages/shared/src/rle.test.ts:48-68` 与 `packages/pal-extract/src/resources/sprite.test.ts:24-45` 的单帧 `parseSpriteChunk` 合同完全相同，空帧 offset 轴亦在 shared:rle.test.ts:70-90 与 extractor:sprite.test.ts:47-67 完全相同。已删除 extractor 两例，shared 保留唯一 parser 合同；extractor 的 `framesToOut`/`extractCharacterSprites` 仍保留，调用层没有被删掉。
- `packages/game/src/framebuffer-ports.glm-q.test.ts` 四例全部被现行 `present/framebuffer.test.ts` 与 `framebuffer.glm-phase1-leaves.test.ts` 覆盖（默认/尺寸、越界写、clear、palette/缺色）；已删除整文件，保留 GLM leaves 的边界合同与既有 framebuffer 基础合同。
- `packages/shared/src/mkf.glm-o.test.ts` 的 3 例实际只重复 MKF 头/单 chunk/负越界合同，且注释声称的 count<0/空容器并未按声明实现；`mkf.boundaries.test.ts` 提供更完整的 count<0、非零 byteOffset、空 chunk 和索引边界。已删除整文件。
- `packages/shared/src/yj2-encode.glm-o.test.ts` 的 6 例包含弱确定性自比较、重复 RLE segment/tail 和 padding 边界，未提供独立业务 oracle；现行 RLE/YJ2 边界合同保留，已删除整文件。
- `packages/game/src/assets/tileset-load.grok-r1.test.ts:G02-C07` 原来对同一个损坏 gzip 调用两次、第二次只断言“不抛”；已改为一次调用捕获 TypeError，并核消息不是 fetch 层错误，避免重复 IO 和弱 oracle。
- `packages/editor/src/ui/AudioAssetWorkbench.glm-ui-wave.test.tsx` 的“非法 WAV”例最后使用恒真 `toEqual(expect.anything())`，没有验证 catalog 零新增；同合同已有 Cursor 更强真实 parser/history/error 断言，已删除该垃圾例。
- `packages/game/src/__tests__/e2e-battle.test.ts` 的条件 `it.skip` 与 `dev/dev-panel.test.ts` 的条件 `describe.skip` 均由真实 `data/extracted` 缺失触发，标为 conditional/blocked，不计覆盖信用；不是无条件垃圾 skip。
- `docs/testing/archive/legacy/batches/glm-architecture-regression-lab/candidates/content/g06-validation-crosscalls.test.ts` 是正式 `packages/content/src/validate-enemy-crosscalls.test.ts:1-292` 的隔离候选复制，生产 caller/oracle 完全相同且候选不参与 package runner；已删除，Git 保留历史。
- `docs/testing/archive/legacy/batches/glm-architecture-regression-lab/candidates/**` 仍有历史快照且不参与 package runner；本轮只删除上述已证明完全相同的 G06 文件，没有在缺少逐文件证据时整目录删除。
- `packages/game/src/core/command-bus.test.ts` 的剩余 PresentCommand 类型字面量 smoke 与 bus 行为无关，已删除；command-bus 运行时 emit/drain/complete 六例保留。shared schema 类型合同已移至 `packages/shared/src/__tests__/resources-types.ts` 的 compile-time `expectTypeOf`，不再占 runtime case。

### 保留但禁止合并

- shared/extractor 的两个相同最小 parser 轴已去重；extractor 仍保留 `extractCharacterSprites` 真实 caller/转换合同，shared 承担 parser 公共实现合同。其它不同 caller 的剩余测试不能仅因 fixture 相似合并。
- `packages/content/src/author-script-core.test.ts` 两个参数化拒收族 matcher 形似，但输入集合和错误域不同（退役命令/裸控制与 canonical unknown boundary）；保留原子输入轴。
- Cursor/Grok/GLM 的像素、宿主和 typed fixture 测试不按文件名或 suffix 去重；只有完整 file×fullName、源码条件、caller 与业务 oracle 同时相同才允许退役。
- `packages/pal-extract/src/cli-global-entries.glm-q.test.ts` 的 14 个 field/alias 合同各自通过真实 CLI，虽 setup 重复且约 9 秒，但每个字段轴有独立输出 oracle；本轮不把它们粗暴合并成一条。后续可在独立性能卡中共用一次 CLI 运行并保留每个字段断言，不在本轮改变证据身份。
- Editor 的 `ScriptEditor.coverage-workflows-2`、`ScriptTree.coverage-batch-2` 等“无可见 matcher”是 helper 内部完整断言的 AST 误报；`WorldSpriteLibrary` 旧 unsafe `assetBase as never` 已改为 `loadLegalUiProject().assetBase` 的真实 typed bridge，三条业务轴保留。

### 反控质量

- 已撤销 Q 历史 9 针“有效 AssertionError”信用：原始 mutant 事实为 promise resolved、普通 `Error` 或错误消息，不满足唯一业务 AssertionError；raw/JSON 已不再作为当前项目证据。
- P01-C03 的 mutant 同样是 Vitest `Error: promise resolved ... instead of rejecting`，不计合法红；原始输入保留 Git，当前证据不宣称有效反控。
- 当前 Kimi 两针与 Cursor 六针按完整身份集合、0→1→0、指定单红和恢复 hash 复核；不把历史 old-green/new-red 字段自动转成当前信用。
- O/Q 旧 counter 目录和命令转录已从工作树清理；它们的历史数字不再作为当前项目有效针或覆盖基准。剩余测试代码仍按普通业务回归实跑，不把缺少 command/cwd/spawn receipt 的旧 JSON重新包装成有效反控。

Game 域复核未发现 Grok 像素/宿主测试可直接删除；PNG/readback 见证改为每个进程独立临时目录，保留真实写入、重新打开、解码与像素断言，不再污染仓库。Q09 framebuffer 四例及 shared/extractor 重复 parser 轴已去重；YJ2 弱/重复候选文件已删除，现行边界合同保留。

## 未自动处理的候选

弱 matcher、强转/suppression、动态 test 名、长 setup、参数化族和跨包相似断言均需一手 caller/输入/完整 oracle 才能裁决。它们已写入机器清点与各域 subagent 报告；没有证据就不删，不用“覆盖率下降/上升”反推质量。真实产品缺陷、不可合法输入和用户可见行为变化停止在测试审计边界，另开产品卡。

## 新基准原则

审计后基准必须从最终保留测试集合重新实测生成，包含测试身份 digest、source/test scope、包级 statements/branches/functions/lines、测试总数与排除清单；只允许由正式 ratchet 工具更新，不能手工回填或为了数字回退门槛。删除重复测试后若某包比例变化，先补同一真实合同的高判别力原子测试或登记 existing-proof/unreachable，再决定是否接受新基准；绝不以弱断言、强转、ignore、扩大 timeout 或堆重复用例补齐。

Editor、Game、Reforge/Migrate 三域已完成机器清点与代表性语义复核；弱 matcher、真实 IO、跨域相似 caller 和 fixture typed bridge 的未裁决项仍明确保留，不能把静态标记当成全量垃圾判定。冻结树的完整 check、官方 ratchet、受保护 strict-fast 均已通过；main 合并、CI 与退休清理仍待完成。

最新 main 的脚本治理合入又暴露一处真实数据闭包错误：新增的 `s021/s034/s100/s131/s134/s262` 现行对白引用了 16 个已有原版 message index，但 locale 重导漏项。已依据 `data/extracted/events/all.json` 的一手 `showDialog` 文本恢复这 16 个 locale 条目（含 `dlg.2074` 的历史 “哼！”），没有修改对白断言或放宽迁移门；该修复需随最新 main 重新跑全包与覆盖门。

同一 main 合入只为 `script-world.test.ts` 的现有 typed host 增加 `entitiesNear: () => false`，测试身份与 15→12 精确退役账不变；保护账已更新为该实际文件 SHA，仍同时约束 old/current identityDigest、计数和字节哈希。

用户明确裁决 `projects/pal` 下资源不得 ignored；已移除 `.gitignore` 对 `assets/migrated`/`assets/runtime` 的规则并纳入 1,934 个二进制资源（约 70 MiB）。这些资产记录仍标为 `legacy-migrated`，但现在属于 canonical 工程闭包，fresh CI checkout 可直接读取；meal-shell 的 synthetic fixture 继续保留为独立 IO 合同，不替代正式工程资源。
