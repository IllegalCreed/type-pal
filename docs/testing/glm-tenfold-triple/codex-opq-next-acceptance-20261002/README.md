# 本轮独立验收原始证据

对应[独立裁决](../codex-opq-next-acceptance-20261002.md)与[汇总机器证据](../codex-opq-next-acceptance-20261002.json)。

- GE-*五个目标各original/mutated/restored三相：run.json是真实命令/exit/signal/spawn/hash元数据，
  vitest.json为JSON格式视图，反控stdout/stderr.txt为原始未改字节；patch可重建唯一cli.ts产品变异。
- `*.vitest.json.raw.txt`保留Vitest原始JSON报告逐字节；json视图仅机械格式化，
  对象值未改。[文件哈希与视图对照](file-manifest.json)分别记录两者SHA256和对象相等性。
- 三份q-typecheck*.stdout.raw.json以Base64+SHA逐字节保留pnpm输出（含原末尾空行）；
  对应stdout.txt仅移除末尾重复空行作为显示视图，避免diff门诊断；不改原始退出或诊断。
- q-input-proof.json直接使用最终fixture与公开parseEnemies/parseEnemyObjects，证明enemyId1不存在。
- q-full首跑为副本缺忽略资产的失败尝试，q-full-assets为只读复制资产后381绿；两次都保留。
- O重建/再判/判据自测、O/Q/P静态/docs/freeze及三包typecheck的真实stdout/stderr/退出元数据保留。
  o/q/p-lint.complete.json保存完整Biome JSON，不只退出码。全业务console零不在主张中。

元数据cwd/hash路径是当时独占副本，不代表作者或main运行。旧O64/Q71业务变异未重放，P未重拍。
本轮结束后只移除自有O/Q/P临时副本，原始父目录辅助脚本与日志保留，作者树不清理。
