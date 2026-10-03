# Cursor 中包返工验收（2026-10-02）

固定候选 `ad10eaf88608fe84c35f08cb5d0a2c7c1fcae685`，内容提交 `d31f12430fb1fcdb6941d813171bfe9bd6a3f2be` 后仅 receipt pin，本地/远端一致、作者树干净。
**Codex code/evidence accept：R4-01/02 关闭，任务转 review，等待 Codex 统一接入；不再给 Cursor 返工或加量。**

## 独立验证

- R4-01：真实 JS `ReferenceError: AssertionError is not defined` stack 放入明确标注的派生单叶报告，现唯一 judge 拒收；TypeError/Error 仅含该词也拒收，真正 AssertionError 正样本接受。此前真实 Vitest afterEach 复合报告仍拒收。
- R4-02：Codex 自造 Git IO add 失败、同路径换 inode 哨兵，创建回滚拒删，原对象及替换物都存在；代码中 Git 状态未知/remove 失败不再 rm 兜底。仅退休本次合成哨兵，未触作者/用户数据。
- 新跑唯一 judge 自测、六针原字节重判 6/6、清理自测 10 项通过。正/变/恢复与原 old-green/new-red 三针数据未变，不重采业务。
- 新跑根 lint：2856 文件完整 0 errors / 0 warnings / 0 infos；12 冻结与 141 白名单路径、候选 diff 通过。候选 docs 仅共享父目录缺 cursor 导航 1 项，归 Codex 集成时登记，不转派作者。
- packages/scripts/patches/依赖及根配置 Git 对象与前次独立审核完全相同，明确复用定向相邻 53、Editor 全包 3801/typecheck 零；不冒称本轮重新全测。

[机器门禁与对象证明](codex-cursor-r5-review-20261002.json)、[两项独立反例结果](codex-cursor-r5-probe-20261002.json)。
原始运行日志和 helper 保留 `/private/tmp/codex-oq-next2-review.ydLzy0`；仅退休本轮固定副本。

34 执行 / 33 净新（C4-03 cross-check）/ 6 有效业务针保持。N/A 视觉，未测正式覆盖率，未 main/done、未执行官方 check/ratchet/protected。
无下一位 Cursor 提示词，等待 Codex 统一接入与质量门；旧大卡不由本中包替代。
Vitest 技能用于错误类型/完整执行证据复核，pnpm 技能用于冻结依赖与零诊断门。
