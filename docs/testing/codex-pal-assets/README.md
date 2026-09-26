# 自包含PAL资源加载与所有权回归

[任务卡](../../ops/archive/tasks/done/TEST-CODEX-PAL-ASSETS-1-loader-and-ownership.md) / [持续队列](../coverage-plus5/README.md)

基点2838df42，八组sound-metadata/sound-closure/palette/portraits/items/backgrounds/ownership/retirements。
真实公开loader/materializer/retirement入口；合成合法PNG/WAV及隔离文件树，不依赖未跟踪PAL资产。
不声称合成提取树是原盘内容，不写实际迁移产物，不更改产品或固定资源数量。

旧full-only的真实PAL世界/战斗精灵census、头像映射及链接/临时文件竞态保持原位；
本批补metadata与目录独立闭包、真实解码像素、同长坏摘要、所有权拒绝与实际输入保真等缺口。
验证/反控和最终官方增量整批落证，不逐小组跑coverage。

## 八组与当前验证

| 组 | 新增 | 独立合同 |
|---|---:|---|
| sound-metadata | 12 | 505段/形状/身份/size/空段旗标，非空完整来源与报告 |
| sound-closure | 13 | manifest与目录别名/缺多项、三侧独立长度、RIFF/WAVE |
| palette | 11 | 真PNG烘焙/透明像素与颜色表拒绝矩阵 |
| portraits | 7 | 稀疏提取稳定ID、合法count与解码后总量 |
| items | 8 | 不依赖源顺序、零哨兵/唯一块/缺图 |
| backgrounds | 6 | 原索引字节不烘焙、独立宽高/色通道/透明度 |
| ownership | 21 | 受控字段、文件/内存坏源首写前拒绝、catalog-only所有权、authored不读源、同长旧目标替换 |
| retirements | 6 | 稳定双键排序/别名、缺文件、同长坏摘要、目标路径复用及非迁移所有权 |

新增84项；相邻加旧PAL16/路径14共114/114，TC exit0。
首跑83绿1红是macOS大小写不敏感目录中45.WAV覆盖已有45.wav的fixture错误；
改用46.WAV并断言真实目录成员，产品未改。六处严格下标类型错误已补显式非空读取。
测试标题改具名axis，最终无重复fullName。未把fixture错误记为产品缺陷。

```sh
env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/migrate exec vitest run src/pal-assets. src/pal-assets-paths.test.ts
env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/migrate typecheck
env -u NODE_COMPILE_CACHE node docs/testing/codex-pal-assets/mutants.mjs
```

[八针runner](mutants.mjs) / [隔离加载配置](mutants.config.mjs)：按Vite技能只在内存load单点替换，
每针独立正控、精确file/fullName、唯一替换、exit1/AssertionError/拒混错超时、源hash不变。
首轮item-order锚点匹配三处被唯一性门拒绝（未算detected）；已限定itemChunks上下文。
随后background-alpha的参数化标题少了Vitest生成的单引号，零执行被判据拒绝；已按新鲜JSON钉正。
source-hash针预期从首写前拒绝退化为后置闭包失败，不夸称所有后层也被绕过。
最终八对照绿/八针候选AssertionError，源hash不变，runner exit0；目录
`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/codex-pal-assets-mutants-iUMv6k`。
定向JSON `/tmp/codex-pal-assets-adjacent.json`，TC `/tmp/codex-pal-assets-tc-final.log`；
11新代码/工具文件Biome零诊断，docs/diff通过。

## 统一收口

Codex accept / done；[机器账](evidence.json)。同一shell严格串行check9272→ratchet→
保护2838df42的单次strict8780，全部exit0；日志 `/tmp/codex-pal-assets-{check,ratchet,strict}.log`。
产品/旧测试/正式统计配置零改，官方ratchet生成baseline；根lint保留62 warning/6 info，本批零新增。

| 指标 | 前 | 后 | 净增 |
|---|---:|---:|---:|
| 全仓B | 44891/63178 | 44993/63178 | +102 |
| 全仓L | 56368/70600 | 56507/70600 | +139 |
| 全仓S | 62674/80643 | 62837/80643 | +163 |
| 全仓F | 11524/15058 | 11546/15058 | +22 |

全仓分支71.21624616163854%，migrate4730/6436B、5045/6724L、5664/7712S、784/1165F，
798 fast/93测试文件/51生产文件；全仓701生产文件。其它六包完整baseline对象、全部生产清单与分母不变。
母目标累计+1575B/+376测试（约+2.49pp），距46577尚差1584B，不能把本批done称为总目标完成。
未纳入未验收Cursor/GLM候选；未跑视觉/E2E/full覆盖，不关闭相应欠账。
