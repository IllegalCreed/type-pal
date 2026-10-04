# TEST-GLM-REFORGE-ASSET-RESOLVER-1 排重账（GLM r1）

排重域：`asset-resolver.ts`、`project-image-cache.ts` 的全部旧测
（`asset-resolver.test.ts`、`asset-resolver.io-boundaries.test.ts` D4-D6、
`project-image-cache.test.ts`、`project-image-cache.lifecycle.test.ts` B5/B7），
公开 caller 侧旧证据（`project-loader.test.ts` / `project-loader.current-boundaries.test.ts`
D1-D3、`battle-trial-assets.glm-n.test.ts` N05 快照、`opening-menu.*` 消费测、
`engine-chrome/registry.*` B10、`assets.battle-bg.residual.test.ts`）与全仓 fullName grep。
归档卡：TEST-REFORGE-RUNTIME-CONTRACTS-1（D4-D6）、TEST-REFORGE-ASSET-IO-1（B5/B7，
r2 明确把「在途 dispose 回填政策」隔离待证）。

## 新增合同（8 条；源锚 / caller / 合法输入 / oracle）

| # | fullName（节选） | 源锚 | 公开 caller | 合法输入 | oracle | 排重结论 |
|---|---|---|---|---|---|---|
| C1 | 非 Error 原因仍包装出上下文+同实例恢复 | asset-resolver.ts:96（String(error) 分支） | readBytes | source 抛裸字符串 `'disk-fault:raw'`（FileSource 未约束原因类型；unknown 边界注入判例） | 失败消息含 projectId/asset/kind/path/原因原文；修复后同实例重读成功（reads×2） | 旧测失败注入全为 Error 实例（D4 `boom-text`、D5 `url-for backend refused`、#2 `NotFound`），String 分支从未驱动 |
| C2 | source 未提供可选 dispose 时 no-op | asset-resolver.ts:84（`dispose?.()`） | dispose | 无 dispose 键的 FileSource（httpSource 真实形态：file-source.ts 返回对象无 dispose） | 不抛 TypeError，后续读取照常 | 旧 dispose 测试（asset-resolver.test.ts:83）的 source 带 dispose；可选分支未证 |
| C3 | 解码失败：消息上下文+不缓存+重试 | project-image-cache.ts:56-60 | load | createImageBitmap 一次拒绝（`bitmap factory offline`），平台边界替身 | 消息含工程/`解码 AssetId "portrait.a"`/原因；重试真实重读+重解码（reads×2、blobs×2、重试产出首个位图） | B6 只证 readBytes 失败不缓存；解码器失败分支未证（registry B10 是 engine-chrome 另一模块，battle-bg residual 是 assets.ts 另一链） |
| C4 | 解码输入保真：Blob mediaType+字节 | project-image-cache.ts:55 | load | 捕获式 createImageBitmap 替身 | blob.type===catalog `image/png`；blob.arrayBuffer() 与 readBytes 字节逐位相等 | 旧测从不检查传给解码器的 Blob 形态（lifecycle bitmap id 含 type 但零断言） |
| C5 | 支持的四种 image kind 正面枚举 | project-image-cache.ts:4-9（PROJECT_IMAGE_KINDS） | load | portrait/face/item-icon/battle-background 各一资产 | 四 kind 全部载入、四个不同位图、四条登记路径各读一次 | 旧测只用 portrait/face（B5/B6/`avatar`）；item-icon 与 battle-background 的正门从未打开（B5 只证 music 反门） |
| C6 | 在途 dispose：不取消+窗口内真重解码 | project-image-cache.ts:41-45（pending.clear） | load+dispose | deferred 解码门：load#1 在途→dispose→回填前 load#2 | 在途照常 resolve 出位图；load#2 触发第二次真实读取（reads×2）；二次 dispose 只关闭最后回填位图 | r2 明确隔离待证的取消轴；B7 只证完成态 dispose 与 dispose 后重载，无在途窗口 |
| C7 | 在途 dispose：回填命中零新 IO+二次关闭 | project-image-cache.ts:27-30+62（decoded 命中/回填） | load+dispose | deferred 解码门：load#1 在途→dispose→完成→load#2 | load#2 命中同一 bitmap（reads 恒 1）；二次 dispose 关闭它 | 同上；decoded 命中零读已被 B6 证（无 dispose 参与），本条钉「dispose 后回填仍可命中且可关闭」的组合政策 |
| C8 | loader 绑定 imageCache→同 catalog/source | project-loader.ts:444-456 | loadCurrentProjectFrom→imageCache.load | dProjectFiles+登记 PNG 字节（过 loadCurrentProjectFrom 全守卫） | resolver.record 与 cache 读取同 path；`bytes:assets/authored/portrait-default.png` 落在同一 memory source；二次 load 零新读 | loader 旧测不触碰 imageCache；opening-menu 消费用空 items（无图像 IO 见证）；绑定行未证 |

## 登记未证但不新增（同 caller/同 oracle 或组合轴，按「少而精」）

- **C7 无独立单点针**：其组成线（decoded 命中 27-30、dispose 关闭 41-45、回填写 62）各自被
  B6/B7 或 C6 针覆盖；「dispose 后回填命中」是组合轴，无只杀它的单点变异，登记不单独设针。
- **缺 id 经 cache.load**：与 `record('missing')`（asset-resolver.test.ts:73）同 caller 链
  （load→resolver.record）同 oracle（`catalog 无此记录`），变异会同时杀旧测（failed-total>1），
  按排重删除。
- **urlFor/readText 的 kind 门**：两入口与 readBytes 共用 `this.record(asset, expectedKind)`
  （asset-resolver.ts:42/51/60 同一 caller），D6 已钉 readText/readBytes 臂；urlFor 臂仅是
  第三次调用同一行，换包装不算新合同。
- **readRoleBytes/readRoleText 的 IO 失败包装**：角色链 = assetForRole（D5 已证缺失角色）
  + readBytes/readText（#2/D4 已证失败包装），组合无新单点。
- **在途失败 × dispose 组合**：= C3（失败不缓存）× C6（dispose 不改写在途结局）的笛卡尔积，
  无独立可变异点，登记不堆叠。
- **resolver.dispose 委托带 dispose 的 source**：asset-resolver.test.ts:83 已证（calledOnce）。
- **trial 快照 urlFor 一律拒绝 / catalog 字节校验**：battle-trial-assets.glm-n.test.ts N05
  已证，属另一模块（battle-trial-assets.ts），不在本卡重复。
- **engine-chrome registry 网络失败 vs 解码失败带 slot**：registry.lifecycle / glm-runtime-resource
  （ASSET-IO B10）已证，模块不同（URL slot registry 非 ProjectImageCache）。

## 现行政策登记（交 Codex 复核，本卡不改产品）

- **C6 观察到的泄漏形现行行为**：dispose 早于在途完成、且回填前又有新 load 时，两次解码都
  完成后 decoded 槽被最后完成者占据，先完成者的位图失去 close 通道（`firstBitmap.closed`
  恒 false），只能等 GC。battle-trial 的 abort→dispose 路径（battle-trial-assets.ts:136-141）
  到达此窗口时泄漏有界（整个 trial cache 随后丢弃）。若认为应改为「dispose 后完成的位图
  直接 close / 不回填」，属产品决策，须另开卡；本卡按现行行为钉住并在此登记。

## 判例

- **针-断言对齐**：C3 初版只断言 `bitmap factory offline`，把 `解码 AssetId` 改成
  `解码资产` 的针杀不死它——包装消息前缀必须显式断言。修法：补
  `toContain('解码 AssetId "portrait.a" 失败')`。
- **AssertionError 口径 vs 同步门抛错**：C5/C8 的失败最初以产品 Error 形态冒出
  （load() 的 kind/catalog 门同步 throw，expect 包装不上）——反控判 INVALID。修法：把
  load 结果收进 outcomes/outcome 值再整体断言（`toEqual`/`toBe`），变异下红相位落成
  业务 AssertionError，且顺带钉住「kind 门是同步抛错」这一公开语义。
- **针的精确命中要跨旧测核**：N4（mediaType 硬编码）初版会同时杀 C8（loader 替身里的
  blob.type 顺带断言）——C8 的 mediaType 断言与 C4 同 oracle，删除 C8 侧冗余断言保
  failed-total=1。
- **deferred 解码门取门时机**：load() 先 `await readBytes` 再调 createImageBitmap，
  同步取门会拿不到在途解码（`没有在途解码` 假红）。修法：宏任务边界 flush 后再取门；
  重读见证断言放在取门之前，让针先撞 AssertionError。
