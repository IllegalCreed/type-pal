# Wave O：当前供应链与内容守卫十倍包（部分交付，申请范围调整）

Owner GLM O；[任务卡](../../../ops/tasks/TEST-GLM-WAVE-O-1-supply-validation-tenfold.md)、
[共同协议](../README.md)、[冻结表](../targets.json)。分支 `codex/glm-wave-o-supply-validation-r1`
（自派发提交 `8b3ca062953b17a12178f8d1a9e36657971234b1` 建独立 worktree）。
生产冻结 `3ac9a2e2f6aba8a5cc97640c18fef8549d199380`；verify-targets --wave O 通过（白名单内 194 路径、冻结 hash 有效）。

## 交付状态（rework 第 2 轮）：401/700 例、44/50 反控

Codex 2026-10-01 counter 的 O-01/02/03 已闭合（见 [receipt.json](receipt.json).reworkFixes）：
lint/diff 零诊断、17 处类型桥改 typed 合法 fixture、44 枚反控补齐恢复后真实执行三态。
COMMON-01 按原范围继续推进，但本轮会话仍未到 700 —— 余量逐批如实列示，不凑数：

| 批 | 领域 | 用例 | 反控 | 状态 |
|---|---|---:|---:|---|
| O01 | publication/transaction（migrate 比率门优先） | 74 | 5 | 完成 |
| O02 | 三方 merge/plan/project-io | 65 | 5 | 完成（附 DEFECT-O-1） |
| O03 | write-plan/journal 恢复/供应守卫残余 | 31 | 5 | 完成 |
| O04 | materialize/retirement/bake/声音与静态图语料 IO | 37 | 5 | 完成 |
| O05 | overlay/伤亡/窄消息/Store0/registry/alias/scheme | 48 | 5 | 完成 |
| O06 | content validate/refs/manifest/startWorld/数据 guard | 56 | 7 | 补齐（item/poison 深域余量见下） |
| O07 | author-script-core 方言 + 运行态安全/游标 + script-library 分片 | 35 | 3 | 大部（script.ts 执行器深域余量） |
| O08 | 敌 AI 决策 + 战斗状态公式 | 16 | 2 | 部分（actor/item/poison 深域余量） |
| O09 | TPFS 编解码 + 数据 guard + 商店/精灵/对话/投掷/实例 | 58 | 4 | 大部（rich-text 深域余量） |
| O10 | shared RLE/YJ2 | 17 | 5 | 部分（CLI 临时工程入口余量） |

- [directed-vitest.json](directed-vitest.json)：401/401 全绿（最终代码实跑，含全部 file/fullName/status）。
- [counters.json](counters.json) + [counters/](counters/)：44 枚三态反控（control 全绿 → injected 恰一
  目标业务 AssertionError 红 → restored 恢复后真实重跑全绿；patch 以 --unidiff-zero 重建并
  校验字节 = mutatedSha；候选树零改动）。
- [coverage-delta.json](coverage-delta.json)：migrate 同分母（fast 口径）st 82.753% / br 84.344% /
  ln 82.458%，**三项比率门全部高于旧比率**（77.246/75.667/78.663）。官方 baseline 未触碰。
- [receipt.json](receipt.json)：全部门禁（三包全量 test、三 typecheck 0 诊断、根 lint 3036 文件
  0/0/0、docs 0 问题、git diff --check 干净、verifier --wave O 通过）。
- [defect-report.md](defect-report.md)：DEFECT-O-1 维持“疑似 generic-JSON 问题”降级表述
  （缺 canonical stable-id/cue 证据，不证明合法作者文档可达），不修产品。

## 剩余范围（未到 700 的如实账）

以下子域本轮会话未建模，非“不可合法构造”证明；后续按同法（typed 合法 fixture + 真实公开入口）
继续即可：item.ts 用途执行器深域、poison/actor-condition 语义轴、locale/rich-text 解析轴、
script.ts 执行器深域、editor CLI（author-project-check）mkdtemp 临时工程入口、
migrate pal-assets 真实语料 census 轴（loadPal* 需 extracted corpus，属 fast 排除域）。

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
