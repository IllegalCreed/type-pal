# TEST-CURSOR-PURE-WAVE-1 首轮独立接收

候选 `codex/cursor-pure-wave-r1@fd870c877fd2a0ac373e8d0991376e1d6dd654d8`，
基点 `76c6f5be`；Codex 判 **counter / rework**。作者自验和绿色测试不能替代合法输入与现行消费者的证明。

## 已核正面证据

- 相对基点的 Git 增量只含白名单测试/薄fixture/本包工具与回执，十二目标源 SHA-256
  与冻结表逐一一致；没有改生产、旧测试、官方范围或基线。
- 独立定向：content 4/4、Reforge 2/2、editor 2/2（日志
  `/tmp/codex-cursor-pure-{a,b,c}-directed.log`）。新增测试/fixture/反控工具的 Biome
  `12 files / 0 error/warning/info`。
- 抽验作者共用负控的 A01/C01：绿对照后单点坏实现令确切新增业务断言红，命中与源 hash
  未改，日志 `/tmp/codex-cursor-pure-mutant-{a01,c01}.log`。其它四针未由本席复跑，
  不能把作者六针自验称为 Codex 的独立结论。
- C01/C02 正例确实调用 loader 与 `assertProjectSaveValid`；未见其两条断言方向反转。

## R1：A01 的正控不是正式可解码帧序列

`packages/content/src/frame-sequence.cursor-boundaries.test.ts:10-20` 将 identity 函数作为
`encodeFrameSequenceSync` 的 `deflate` 参数，文件索引却声明 `deflate-rgba8-xor-v1`。
`parseFrameSequence` 只证容器/索引，不证明该 block 可由正式播放器解压；
生产格式的既有正控 `frame-sequence.contracts.test.ts:33` 使用 `deflateSync`。
本卡明定二进制从合法生产编码链来。请改用当前真实 deflate，再独立解码并核 RGBA；
保留 [5]/[7] 单轴篡改及同字节正控、输入深快照，复跑 A01 原针。

## R2：A02 的错桶回退输入不可作为当前业务正例

`script-library.cursor-boundaries.test.ts:20-43` 手造 `shared/user/misplaced-a`，将作者脚本体
放在非 `deriveScriptChunk` 所属的另一个 chunk，`index.chunks` 的 bytes 也固定写 8。
正式 `checkScriptLibrary` 对 bytes 和作者 id 派生所属均 fail-loud
（`packages/content/src/script-library.ts:382-414`）；现行产品在包内没有
`getScriptBody` 调用者（`rg getScriptBody\\( packages --glob '!*.test.*'` 仅定义本身）。
不应为一个开发期不可接受、无现行消费的错桶 fallback 新增“正确行为”测试或保留反控。
请撤回 A02 及其针，重新分类为无当前消费者/非法输入；若能找到有当前消费且合法的 A02
差异合同，可换成真实链路和相应反控。A 包仍须有两针，可从 A03/A04 的确实可达单轴选择。

## R3：B04 的脚本正控同时错桶与错字节

`script-chunk-store.cursor-boundaries.test.ts:24-51` 的作者 id
`shared/user/open-door-a1b2c3d4` 在 shards=2 下由现行 `deriveScriptChunk` 得
**`shared/c01`**（本席实调用已核），候选却把正文放 `shared/c00` 并以这个旧 ref 读取。
该 `c00` chunk `JSON.stringify` UTF-8 实为 **123 字节**，`index.chunks.c00.bytes`
却填 80；完整 canonical `checkScriptLibrary` 会拒绝。`ScriptChunkStore` 的宽松读取接口
能返回 body，不能把此输入变成正式可接受项目。
请从派生 owner 创建真实 chunk/ref，metadata bytes 按实际序列化字节数生成，
先让 `checkScriptLibrary` 接受整个 index/chunks，再核二次 resolve 缓存命中、旁 chunk 零读取
和独立 lease 收尾；重新跑 B04 单点针与相邻测试。

三项修正后更新最终树四行账和 candidate SHA。Codex 再独立复跑定向、六针、typecheck/
Biome，接收通过后才合 main 并统一跑全仓 check、官方 ratchet 与受保护 strict-fast。
作者工作树的 untracked node_modules symlink 与 `/private/tmp/main-check` 独立检出暂不清理，
均未计入候选 Git diff。
