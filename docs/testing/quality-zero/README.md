# QUALITY-ZERO-1 实施与保真验证

[任务卡](../../ops/archive/tasks/done/QUALITY-ZERO-1-static-diagnostics.md) / [原始诊断账](../quality-zero-inventory.json)。
用户要求静态硬质量门0error/0warning/0info；本包清存量并收紧CLI，不继续覆盖率目标、不改两贡献者候选。

## 实施范围

- 基点89485589，隔离codex/quality-zero；原biome.json规则、override、include/exclude、lockfile保持原样。
- [源码字面量机械转换](literal-equivalence.mjs)：50个入库字符串改为转义模板字面量，逐文件全部静态字符串
  求值序列完全相等；临时未跟踪工具另有5处，主树同步时单独保真处理，不入库也不删除。
- 去掉确实未使用的类型导入/局部声明/参数、runtime-script死函数、无效旧suppression；
  测试只移除未使用上下文参数/透明空fragment，不降低断言。
- callback签名分别表达无结果通知与返回接受结果的函数，异步picker保留Promise<void>。
  [编译保真](callback-emission.mjs)逐字比较六文件运行期JavaScript，原调用者/false拒绝/异常均不变。
  不加包装器、不用any/unknown强转、不改旧测试的异步时序。
- CSS按基础→高specificity组织；checked-label的reduced-motion覆盖保留；visually-hidden去掉important，
  不删无障碍标签，不用display:none代替屏幕阅读器文本。
- 新`scripts/quality/lint-zero.mjs`严格核完整Biome JSON报告：非零error/warning/info、跳过、截断、空扫描、
  malformed报告或子进程失败均拒绝；`pnpm lint`统一走该入口，`check/check:fast/test`接入27项工具自测。

## 验证记录（已通过）

- 原始85warning+7info入库范围，另5warning是主工作树未跟踪临时工具；不是改范围减数。
- 零诊断工具27/27，含真实Biome清洁/warning/info/syntax四种隔离进程，不只喂人工JSON。
- 定向Editor设计系统/相邻41文件353项通过；最终树完整check通过：七包9712项/972文件，
  docs37/coverage30/quality27工具测试另列，七包TC与2217文件严格lint零诊断。
- 官方ratchet最终通过：9220项/728生产文件。六包完整基线对象不变，content只因未用record函数退役
  减少分母S3/B5/F1/L3；七包覆盖命中数不变。全仓B46046/63283、L57684/70846，非补测贡献。
  保护89485589的单次strict-fast9220/9220通过，七包指标与ratchet精确相同。
- 中间方案将旧void转发规范化为`?? undefined`，TC通过但首轮ratchet明确拒绝额外分支带来的下降。
  此方案已完整撤销，改为纯函数签名区分；原18文件53调用点全部零diff，不降低覆盖门。
- `http://localhost:6017`专用Design Lab：RF-14 72节点、RF-17 373节点、RF-23 101节点的几何和15项
  computed-style清理前后相等；独立原生label/legend/hidden file input四对象的尺寸/裁剪/显示状态一致。
  首次RF14采样命中indeterminate复选框初始化transition，静稳后颜色与基线一致；不是取多数放行。
  浏览器导航控件一次未改变页面，改用实际已列出的URL直达后核真页面；未把未跳转状态当作对应fixture。
- RF14前后截图逐字节一致，SHA256 `ca35043c8cafb2e5ac8bbd3b1718dcf26368284d2f0d3e860f9e2fe5fa5e35b4`。
  原始PNG与样式机账已备份主树build/quality-zero-evidence/；独立6017已关闭，用户环境未动。
- 代表反控复跑：guard-leaf 91对照/六针/10判据自测，content-resources 65对照/五针均通过；
  原生产错误在变异树仍被候选自身AssertionError抓住，字符串清理没有改变针的业务含义。
- 最小验证按[界面指南](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md)
  保留可访问标签、焦点提示与减少动态效果；不宣称完成全编辑器视觉/E2E审计。用户6010未操作。

本包done；完整质量门与保真检查通过，由Codex统一提交推送与归档。无下一位Agent提示词。
不将旧exit0追认为零诊断，不计入暂停的+5pp补测贡献，不冒充full/E2E/Q1/Q2或远端CI证据。

最终日志（另有主树build/quality-zero-evidence备份）：

- `/tmp/codex-quality-check-final.log`：完整check、七包TC、27项零诊断自测与全仓零诊断。
- `/tmp/codex-quality-ratchet-final.log` / `/tmp/codex-quality-strict-final.log`：同树串行防回退。
- `/tmp/codex-quality-callback-emission.json`：六文件编译JS逐字一致。
- `/tmp/codex-quality-literal-equivalence.json` / `/tmp/codex-quality-untracked-literal-equivalence.json`：55字面量保真。
- `/tmp/codex-quality-needle-guard.log` / `/tmp/codex-quality-needle-resources.log`：六针+五针仍业务红。
