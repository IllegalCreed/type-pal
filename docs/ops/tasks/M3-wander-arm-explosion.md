# M3 - 迁移器循环臂指数展开(巡逻 NPC 脚本爆炸)

Status: draft
Phase: phase2
Capability: M3(脚本迁移)
Coding Owner: 待定
Reviewer: 三方
Branch: main

## 问题(2026-07-13 发现,push 被 GitHub 100MB 限拒才暴露)

随机巡逻 autoScript(chance 25%→walk→goto 回环)被分支臂内联(MAX_ARM_DEPTH=6)
指数展开成 4^6 树:s019 单场景 549,435 个 stepEntity / 42,362 对 branch+chance,
15 个巡逻 NPC 每个 4.1MB(origin 版 44KB,94 倍),文件 173MB。s176/s186 同病。
**循环臂展开对行为零收益**:auto 反复重入,展开深度只决定"每次入场走几跳"。

## 临时解(已落 749c1ce3)

s019/s176/s186 的 34 个爆炸实体按 id+pos+sprite 对齐移植 origin 版巡逻树
(depth-3 时代产物,用户玩了数周的行为)。**次一级膨胀仍在**:s035 41MB /
s049 31MB(pretty,未超限未处理)。

## 根治方向(待设计三签)

- 迁移器臂内联加**循环检测**:臂目标 label 已在当前内联链上(回环)→ 立即截断
  (end/stopScript),靠 auto 重入循环,不展开。保留 depth-6 服务非循环深臂
  (2026-07-12 的 17 条合法深臂不回退)。
- 根治后全量重迁受影响场景 —— ⚠ 必须先解决**手工补丁保留**(s000/s001 的
  ditherScreen/speaker/李大娘两段式/center 等手工同步会被全量重迁клobber),
  方案:手工补丁清单化 + 重迁后重放,或迁移器吃 patch 层。
- 顺带评估 pretty→紧凑序列化(产物 4× 体积差,influence 运行时 fetch)。

## 验收

- 迁移 dry-run:s019 巡逻实体 ≤100KB/个;全产物无 >10MB 场景文件。
- 巡逻 NPC 行为回归:6051 抽查 s019 村民游走正常。
- 手工补丁全数保留(s000/s001 逐字段核对)。
