# TEST-GROK-BOOT-RESOURCES-MEDIUM-1 · Grok 证据

分支 `codex/grok-boot-medium-r1`。BASE `f5c7f904a3f623e3ca5b413ab43f78029d99fe11`。源码冻结 `554b8a0552db30294a9050b4466659c4a14549f8`。排重候选 `f4665f7ac51b80cae5620e4c08bd62f607881f73`。本目录只记录本波新测、专属 fixture 与反控。Codex 尚未验收。固定样本没有全部标成 verified。

## 数量

| 项 | 数 |
|---|---|
| 新执行 | 19 |
| 净新 | 19 |
| 旧证明 | 6 |
| 未单独成例 | 2 |
| 不可构造 | 1 |
| 阻塞 | 1 |
| 预算 | 24–32，上限 36 |
| 主反控 | 4，四枚 accepted |

19 低于预计下限。每条未写成新例的条件都在 [contracts.json](contracts.json) 的 `dispositions`。没有改数字凑满 24。

## 导航

- [合同账](contracts.json)
- [定向 vitest](directed-vitest.json)
- [回执](receipt.json)
- [judge](judge.mjs)
- [judge 拒收自测](judge.selftest.mjs)
- [反控 runner](run-counters.mjs)
- [反控索引](counters/index.json)

四枚针的三态 JSON、stdout、stderr、patch 与 meta 在 `counters/C1-assets-identity/`、`counters/C2-settle-order/`、`counters/C3-icon-index/`、`counters/C4-protect-snapshot/`。

## 四枚不同 oracle

| 针 | 组 | 同场旧文件 | 唯一新红 |
|---|---|---|---|
| C1-assets-identity | G1 | `bootstrap-resources.test.ts` 3 绿 | loadAssets 拒绝保持原错误对象 |
| C2-settle-order | G1 | 同上 3 绿 | soundfont 先 settle 时 resourcesReady 仍等待 |
| C3-icon-index | G4 | `dialog-assets.glm-phase1-leaves.test.ts` 2 绿 | 图标第 0 帧像素 |
| C4-protect-snapshot | G5 | `loader.test.ts` 7 绿 | protect 切换后原先受保护场景被淘汰 |

四枚都是旧绿、仅新红。正控与恢复为 0，变异为 1，signal 均为 null。

## 未完账

- 父导航：本 README 写入后，`docs/testing/medium-triple-20261002/README.md` 仍未链接 `grok/`。该文件属 Codex，本波不改。docs check 因此留下「子目录未进入导航」。原文见 [receipt.json](receipt.json)。
- game 全包环境红：`src/dev/dev-panel.test.ts` 打开 `data/extracted/data/enemy-teams.json` 得到 ENOENT。该目录被 gitignore。结果是 1 failed | 241 passed | 4 skipped（246 files）；2764 passed | 13 skipped（2777 tests）。13 条跳过来自 `e2e-battle` 1、`tileset-blob-snapshot` 6、`sprite-blob-snapshot` 5、`rng-blob-snapshot` 1。本波未复制真实数据。
- G3 默认端口的完整 loadAll 解码登记为 blocked。本波只证明真实 Response 字节与真实加载器已发请求。
- `dialog-assets.ts` 外层 `all assets failed` 不可达。
- assets 与 dialog 同时拒绝、glyph 失败后再等 assets 拒绝，两条已分别证明，未再合成一例。
- 未合 main，未标 done，未跑官方门，未跑剧情或 E2E。候选 SHA 是包含本证据的那一次提交，文件内不预写该 SHA。
