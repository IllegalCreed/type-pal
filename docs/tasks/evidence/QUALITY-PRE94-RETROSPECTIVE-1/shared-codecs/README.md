# shared MKF/RNG/YJ2 收口窗口

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「shared MKF/RNG/YJ2 收口窗口」的治理候选页；证据原件为下方逐字节保全的固定main源（2522B，SHA ba62623d5da8）。原窗Owner为Codex，分支codex/code-quality-3y，基点bee8587f4f31c06f8eb3a4d158ae8195e9beb145。

## 来源与输入

当前CODE2/2b accept：11文件八维成立，6新关闭、5既有关闭不重复计数；固定83卡53accept/30partial，不扩展94–102。复用[README.md](../2/README.md)、[README.md](../2b/README.md)和GLM三个foundation八维记录，当前AST/SDLPal源/15个raw输入与native日志SHA匹配；未重跑2373chunks/1464frames/2626segments全量对拍。完整逐文件A–H、依赖与失效条件见[evidence.json](evidence.json)，完整原件在[raw.json.gz](https://github.com/IllegalCreed/type-pal/blob/159cd0e2f8753536800ba4635e896020a897fddc/docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/shared-codecs/raw.json.gz)。

## 断言与业务 oracle

本轮只补两个具体缺口：RNG后加8字节连续delta弱子集删除（同一skip清面变异失败集合4→3，恰少退休身份），完整320×200 MARK-plane例保留；YJ2增加独立树归约固定向量，禁用本轮归约时恰1个字节AssertionError、9个其它例保持绿，恢复后shared114/114，extract18、game RNG31相邻零stderr。YJ2算法正文未改，只纠正自适应/位偏移/脆弱引用等注释；精确退役表只登记17→16/双身份与当前SHA，谓词不变。[native-fixture.py](native-fixture.py)（独立fixture产生器）只在自有临时目录编译/执行：取未改SDLPal树函数，编码32600个A及随后424个(i*17+23)&255字面，原C decoder核全部33024字节，恰过一次权重归约；fixture不是TS自比，也不是新资产管线。

## 结果

O-5继续作为适用域限制登记：u32损坏头可请求大分配，未实际分配/未发明cap；固定raw cohort最大65536不等于格式上限，接入任意上传/外部资产前必须重新核支持尺寸与可信边界。RLE格式风险/混合RLE文件、shared类型与广域caller仍保持各自review。模块冻结后check20386、official ratchet19988、针对新baseline的protected fast19988全部零诊断；未降规则或基线。

## 限制与复核

未执行原PAL.EXE或视觉/E2E。快检（只读、不跑测试或coverage）：`node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/shared-codecs/verify.mjs`（见[verify.mjs](verify.mjs)）。定向：`pnpm --filter @type-pal/shared exec vitest run src/mkf.boundaries.test.ts src/rng.test.ts src/rng.boundaries.test.ts src/yj2.boundaries.test.ts --reporter=default`。相应源码/caller/依赖/输入域或oracle变化使相关claim待复核；只读快检验证身份与原件，不能证明设计质量。候选待Owner接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2522B / SHA-256 ba62623d5da80a71fcd89a6b34542b5c00ba9ecbce1eeb2c30fa1cc63cb38e79；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# shared MKF/RNG/YJ2 收口窗口

Owner: Codex；分支 `codex/code-quality-3y`；基点 `bee8587f4f31c06f8eb3a4d158ae8195e9beb145`。
当前CODE2/2b accept：11文件八维成立，6新关闭、5既有关闭不重复计数；固定83卡53accept/30partial，不扩展94–102。

[逐文件A–H/依赖与失效条件](evidence.json)、[完整原件](raw.json.gz)、[只读快检](verify.mjs)。
复用[CODE2](../2/README.md)、[CODE2b](../2b/README.md)和GLM三个foundation八维记录，
当前AST/SDLPal源/15个raw输入与native日志SHA匹配；未重跑2373chunks/1464frames/2626segments全量对拍。

本轮只补具体缺口：RNG后加8字节连续delta弱子集删除，完整320×200 MARK-plane例保留；
同一skip清面变异失败集合4→3，恰少退休身份。YJ2增加一个独立树归约固定向量，禁用本轮归约时恰1个字节AssertionError，
9个其它例保持绿；恢复后shared114/114。extract18、game RNG31相邻零stderr。
YJ2算法正文未改，只纠正自适应/位偏移/脆弱引用等注释；精确退役表只登记17→16/双身份与当前SHA，谓词不变。

[独立fixture产生器](native-fixture.py)只在自有临时目录编译/执行：取未改SDLPal树函数，
编码32600个A及随后424个`(i*17+23)&255`字面，原C decoder核全部33024字节，恰过一次权重归约。
fixture不是TS编码/解码自比，也不是新资产管线；正常测试不依赖C工具链。未执行原PAL.EXE或视觉/E2E。

O-5继续作为适用域限制登记：u32损坏头可请求大分配，未实际分配/未发明cap；
原卡排除任意上限，当前核过固定raw cohort最大65536不等于格式上限。
接入任意上传/外部资产前必须重新核支持尺寸和可信边界，当前不认证任意恶意输入安全。
RLE格式风险/混合RLE文件、shared类型与广域caller仍保持各自review。

快检（只读、不跑测试或coverage）：`node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/shared-codecs/verify.mjs`。
定向：`pnpm --filter @type-pal/shared exec vitest run src/mkf.boundaries.test.ts src/rng.test.ts src/rng.boundaries.test.ts src/yj2.boundaries.test.ts --reporter=default`。
相应源码/caller/依赖/输入域或oracle变化使相关claim待复核；只读快检验证身份与原件，不能证明设计质量。
模块冻结后check20386、official ratchet19988、针对新baseline的protected fast19988全部零诊断；未降规则或基线。末轮文档/静态与Git同步见同一回执。
```
<!-- incremental-original-source:end -->
