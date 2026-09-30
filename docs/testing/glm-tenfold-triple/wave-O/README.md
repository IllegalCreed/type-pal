# Wave O：当前供应链与内容守卫十倍包（部分交付，申请范围调整）

Owner GLM O；[任务卡](../../../ops/tasks/TEST-GLM-WAVE-O-1-supply-validation-tenfold.md)、
[共同协议](../README.md)、[冻结表](../targets.json)。分支 `codex/glm-wave-o-supply-validation-r1`
（自派发提交 `8b3ca062953b17a12178f8d1a9e36657971234b1` 建独立 worktree）。
生产冻结 `3ac9a2e2f6aba8a5cc97640c18fef8549d199380`；verify-targets --wave O 通过（白名单内 194 路径、冻结 hash 有效）。

## 交付状态：274/700 例、30/50 反控 —— 未达卡面规模，交证据申请 Codex 调整范围

按协议“找不到足够合法合同时交账并停受影响组，不凑数”：

| 批 | 领域 | 用例 | 反控 | 状态 |
|---|---|---:|---:|---|
| O01 | publication/transaction（migrate 比率门优先） | 74 | 5 | 完成 |
| O02 | 三方 merge/plan/project-io | 65 | 5 | 完成（附 DEFECT-O-1） |
| O03 | write-plan/journal 恢复/供应守卫残余 | 31 | 5 | 完成 |
| O04 | materialize/retirement/bake/声音与静态图语料 IO | 37 | 5 | 完成 |
| O05 | overlay/伤亡/窄消息/Store0/registry/alias/scheme | 48 | 5 | 完成 |
| O06 | content validate/manifest/startWorld/sprites/locale | 19 | 5 | 部分 |
| O07–O10 | author-script/script/item 系/frame-sequence/shared/CLI | 0 | 0 | 未开始 |

- [directed-vitest.json](directed-vitest.json)：274/274 全绿（最终代码实跑，含全部 file/fullName/status）。
- [counters.json](counters.json) + [counters/](counters/)：30 枚反控，全部“恰一目标 fullName 业务
  AssertionError 红”，一次性 detached worktree 注入、候选树零改动、三态 SHA256 + 可重建 patch。
- [coverage-delta.json](coverage-delta.json)：migrate 同分母（fast 口径）st +285、br +162、ln +242；
  **三项比率门全部反超旧比率**（82.753%/84.344%/82.458% vs 77.246%/75.667%/78.663%）。
  官方 baseline 未触碰；正式结算归 Codex。
- [receipt.json](receipt.json)：门禁全套（两包全量 test、双 typecheck 0 诊断、根 lint 2908 文件 0/0/0、
  git diff --check 干净、verifier 通过）。
- [defect-report.md](defect-report.md)：DEFECT-O-1（mergePages 数组洞守卫被 `Array.some` 跳过稀疏洞，
  产出 null 页条目而非冲突）；该轴停测，未修产品。

## 合成 typed 工程（本波核心资产）

[src/__tests__/glm-o/supply-fixture.ts](../../../../packages/migrate/src/__tests__/glm-o/supply-fixture.ts)
在纯合成数据上复刻真实 PAL 的全部 census 合同（49 方案/11 root/4 machine、商店 29 buy/6 sell、
伤亡 36 键 locale、51 别名锚点、636 精灵帧数表），使 publication/supply/守卫全套真实入口可在
unit 层（fast 覆盖口径）充分验证，不读真实工程、不写盘。

## 未完成范围与原因

O06 残余（validate-refs 的 inventory/condition/enemy-team 簇）与 O07–O10（author-script-core、
script.ts、item.ts、frame-sequence、shared rle/yj2、两个 CLI 脚本临时工程合同）未能在本轮会话内
完成建模。已交付部分不含任何凑数用例；请 Codex 按上表核定后续范围（续做或重划）。

不合 main、不标 done；done 准入仍按卡面 blocked。
