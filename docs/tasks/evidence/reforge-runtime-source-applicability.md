# Reforge 场景与菜单调用来源适用性

Status: recorded
Owner: Codex
Last reviewed: 2026-11-26
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

在同一治理分支比较基点 `c749075e5ae84004789de2fcce0345279dddc7e7` 与源码提交 `f0d9847cfe96621e5e886496218c48d169a06005`。本回执供已有测试目录、报告和机器证据复用。

## 来源与输入

| 源码 | 旧行 → 新行 | 旧文件 SHA-256 | 新文件 SHA-256 |
|---|---|---|---|
| `packages/reforge/src/main.ts` | 6009 → 6009，418-425 → 417-424，457-464 → 456-463，442-454 → 441-453，1300-1398 → 1300-1398 | `962c751ddd278930d4517ad3b9624dfe0cc2cc81e3096ce49ff794df415dfcb7` | `c56d6e4e580d1d3407f22290f2e511bdb5f0b54398245bf87a7965bdb62d9c37` |
| `packages/reforge/src/menu/menu-session.ts` | 108-132 → 107-130 | `890602823f1aced9eeb228a88352f4f6938735ce278317d86911d41028a47213` | `261e69f6f75051d4f01cb0ae9f5fe5c9d8b2c71aa3798fd649d01bdb883ad05b` |
| `packages/reforge/src/menu/menu-box.ts` | 169 → 169 | `870f9701257c7d70c3bd91a381303b47ecb03989a8d38deda0079ae8ba9af1c4` | `42e20a18fb4a46d1cf1cc13bfdc274f6e413148dfb7447e0c55033fe17b568f4` |

## 断言与业务 oracle

场景、镜头、世界动作、战斗宿主和菜单数值样式的已刊片段逐字节一致。菜单会话构造片段只删去从未写入有值状态、也不驱动任何选项的占位字段。复核它的写入和读取可从旧候选的 MenuSession、主装配器与系统菜单绘制三个调用点反查。

## 结果

五条目录记录和对应双载体同步现行源码。保留原 `previousSourceRefs` 的先前事件、业务主张、执行身份、版本、运行与附件阈值。来源章节的五处旧正文行号同改为当前核对范围。

## 限制与复核

用固定 Git 提交读出上列整文件和声明范围，核摘要、只删字段差异与最新来源事件。音效、菜单和启动的本轮定向执行取[既有治理原件归档](QUALITY-POST-GAME-ACCEPTANCE-AUDIT-1.tar.gz)中的 `review-11/`。本回执只负责旧测试报告的来源适用性。

## 2026-11-26 世界操作与菜单批次后的引用

基点为 #78 合并提交 `c409a1654b010543dc84d2ad71e692c8b9f07433`，源码为 `d6e4af0461a22080e96696fcdc726b9acec22aca`。六条目录记录及对应报告和证据的旧业务主张取原执行时点。此处只续接下列逐字节相同的引用范围。

| 源码 | 原行 → 当前行 | 旧文件 SHA-256 | 新文件 SHA-256 |
|---|---|---|---|
| `packages/reforge/src/main.ts` | 417-424 → 417-424，456-463 → 456-463，1300-1398 → 1300-1398，441-453 → 441-453，6009 → 6009 | `c56d6e4e580d1d3407f22290f2e511bdb5f0b54398245bf87a7965bdb62d9c37` | `f4425aeed4a9c2ee82ae05305f13ec159eaf73ce5c135f3aa52aaa61adee27b3` |
| `packages/reforge/src/battle/battle-session.ts` | 251-253 → 251-253，426-438 → 426-438，1312-1321 → 1312-1321 | `c1040936e18650009554b1f33b982d9ad6c96f2b39edbbba5faf4c87d15522c2` | `aa9d485618f765b1c168d1732db3f857ff06fa4c1d9b46efa5d07fece79e0d2d` |
| `packages/reforge/src/menu/menu-session.ts` | 107-130 → 108-131 | `261e69f6f75051d4f01cb0ae9f5fe5c9d8b2c71aa3798fd649d01bdb883ad05b` | `1129a966426a9aa9154e9e119dac7e363e2e11ae63e75eb966a7d09202b988ba` |
| `packages/reforge/src/menu/menu-session.test.ts` | 10-33 → 11-34 | `cb9e2df86bd00944e3628a669b739f75579daa51da4ec419f361c812ffa286ab` | `d35a71a1717a05132160072e9392fdcfb54fc5ccaf42494b07d1bca403fa87b6` |
| `packages/reforge/src/menu/item-use-session.test.ts` | 5-22 → 5-22 | `ea7a12e2c05ab142446625025181b6cece0e4e3d2858b3c14100d44099f0c72f` | `86c6e84884ee7637889d335f79164e3e185bfd8d8f4493eca7327cca887e504b` |

运行记录和新回归在[世界操作与菜单批次](../cards/QUALITY-REFORGE-WORLD-CONTROLS-1.md)。这里保留旧候选和计数，未签发新的剧情或视觉结论。
