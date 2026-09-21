# MIGRATION-WRITE-GUARD-1 · 实施与验证

Owner：Codex；设计r1，冻结生产14257da7，三席准入在deb4f363落盘。
任务卡：[迁移规划快照与二进制路径保护](../ops/tasks/MIGRATION-WRITE-GUARD-1-planned-snapshot-and-paths.md)。
本记录随实施更新；未取得同候选三席终审前不标done，不代签。

## 实现

- CLI把规划时真实`ProjectMigrationSnapshot`传给write-plan；普通project写删携带原始字节hash或显式null，
  未纳入快照/存在正文但缺hash拒绝，不以JSON重序列化或提交时重新采样猜旧值。
- TransactionChange对project强制期望旧值；全量前提先于第一个staging写，每个操作staging前再次核验，journal v2.previousHash保留规划值。
  baseline/manifest原合同及退役资源hash保留，旧project调用者没有静默fallback；恢复/manifest-last使用原规则。
- 内部`migration-path.ts`规范相对路径、可信repo根realpath、逐级lstat，拒绝父链/叶/悬空链接与非文件目标；
  JSON现有链接检查复用它，避免existsSync漏悬空链接。
- 资源物化全量预检先检查所有catalog路径及本次临时路径；实际mkdir/临时写/rename前再核路径。
  随机命名临时文件以`wx`独占创建，不删除重用别人的临时文件；写失败关fd，只有原inode且路径仍安全才清理。
  父链变更时保留原错误，不沿新链接做清理；成功输出字节/作者接管/无变化零写保持。

边界保持：不是多writer事务锁或OS沙箱，最后检查与syscall之间的外部恶意换链不在保证内；迁移期间仍禁止编辑器同时保存。
二进制不是整批回滚事务，中途错误可能留下此前合法写入的内部资源；没有承诺所有失败都回到批前状态。
staging中途发现后位冲突时可留下本次staging而不发布journal，不把这些未发布文件当作恢复授权，也不扫掉其它事务目录。

## 正式回归与反控

新增3测试文件36项：规划hash/时窗13项，物化路径/清理14项，路径函数9项；两个专用fixture位于`src/__tests__/`，不进入生产覆盖分母。
旧write-plan两文件仅用薄fixture在真实磁盘捕获快照；旧transaction两文件显式补null或实际旧hash。原测试标题/业务断言保留。

- A-08首批10项在未修实现上8红/2绿，修后10绿；随后补后位staging换值、格式变化/删除、快照缺域/缺hash与输入不变。
  `/tmp/type-pal-mwg-a08-red.log`、`/tmp/type-pal-mwg-a08-green.log`。
- A-09初次夹具两处origin/path不匹配及注入路径受macOS `/var`别名影响，已修正夹具、过正式catalog guard、规范化自有tmp根；
  初次失败**不全算产品反例**。最终14项通过隔离load使用冻结14257da7的pal-assets正文复算：13红/1正常绿，
  `/tmp/type-pal-mwg-a09-valid-old.log`。只替换加载视图，不还原工作树产品文件。
- 真实原生symlink只创建于自有mkdtemp根，包含同根outside哨兵；快照记录文件字节、目录、链接且不跟随链接。
  物化只验证opaque源字节/catalog合同，WAV/视频编码器不是这些微型fixture的被测对象。
- [隔离配置](migration-write-guard.config.mjs)与[负控入口](migration-write-guard-mutants.mjs)：
  1对照+5单点针（重采样授权/去整批预检/去路径检查/漏读后mkdir前复核/清理外来inode）。
  钉唯一替换点、实际加载标记、精确测试名failed、JSON断言的AssertionError起始类型；混合Error自测拒绝，产品hash不变。
  初次全6跑通过；最终代码/格式化后再跑6/6通过，对照36项绿、五针各精确1项业务红。
  最终输出`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-mwg-mutants-jk2fGN/`，摘要日志`/tmp/type-pal-mwg-mutants-receipt.log`。

```sh
pnpm --filter @type-pal/migrate exec vitest run src/migration-path.test.ts src/migration-write-guard.test.ts src/pal-assets-paths.test.ts
node docs/testing/migration-write-guard-mutants.mjs
MWG_MUTANT=old-paths pnpm --filter @type-pal/migrate exec vitest run --config "$PWD/docs/testing/migration-write-guard.config.mjs"
```

第三条是修前对照，**预期exit1**，不是常规check入口；不能为使其绿而回退保护。
原审计探针零改；其旧调用签名或旧缺陷期望失配不作为新实现通过证据。

## 隔离实际发布

[可重建发布见证](migration-write-guard-publish.mjs)创建自有临时repo，物理复制current PAL和baseline、migrate源码/CLI；
原始/extracted/宿主soundfont及依赖仅只读引用。只在副本构造一个合法的较旧WAV（改一个PCM数据位，headers/长度不动），
同步旧catalog与baseline/_state哈希，迫使真实CLI实际写JSON和一个二进制，而非只跑无变化路径。
第一遍必须恢复为冻结工程/baseline全部文件字节（含非托管文件）；第二个独立CLI进程必须零变更，来源工程也保持原样。

```sh
node docs/testing/migration-write-guard-publish.mjs
```

第一次验证宿主漏提供`packages/reforge/public/soundfont.sf3`，CLI以ENOENT停止，无产品结论；
日志`/tmp/type-pal-mwg-publication.log`、临时根`type-pal-mwg-publication-VFJQcb`。补只读宿主路径后，最终两次独立CLI均exit0：
第一遍managed537/writes1/deletes0/conflicts0，物化1934资源中的1个，transaction-changes3；
第二遍writes0/deletes0/conflicts0、资源written0、transaction-changes0。两遍内部replay均零差异。
2474工程文件与315 baseline文件均恢复为冻结字节，来源副本也零改；source-backed样本为`sound.pal.001`。
输出根`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-mwg-publication-j9rQr4/`，含两次原始日志/摘要回执；`/tmp/type-pal-mwg-publication2.log`。
闭包检查294场景/223地图/1934资源，reference-warnings0；既有asset-warnings182保留，未声称清零或修改源内容压告警。
不运行主树迁移CLI，不修改真实作者恢复输入；本卡无生成语义变化，不以更新黄金文件吞内容差异。

## 质量门

- 新增三文件36项、migrate全包69文件515项和typecheck通过，日志`/tmp/type-pal-mwg-package-check.log`。
- 完整check **8029项exit0**（`/tmp/type-pal-mwg-full-check.log`）：shared115/content709/pal-extract299/migrate515/reforge1329/game2375/editor2687；既有47warning/6info不增，改动文件Biome干净。
- 官方ratchet exit0（`/tmp/type-pal-mwg-ratchet.log`），随后在普通CI彩色报告环境（仅清子进程Agent报告检测标记，不改变权限）执行保护14257da7的**单次strict-fast 7538项exit0**（`/tmp/type-pal-mwg-strict-fast.log`）。
- 633生产文件，新增migrate内部路径helper1个；迁移fast48→51测试文件、361→397项。全部48个旧测试fileEntries（含身份/计数）保持，其他六包完整baseline对象零变，原审计probe零diff。
- migrate行3569/6724（53.08%）、语句3980/7712（51.61%）、函数610/1165（52.36%）、分支2940/6436（45.68%）；全仓行51220/70420（72.74%）、语句56853/80452（70.67%）、函数10757/14914（72.13%）、分支40592/63149（64.28%）。本轮有生产分母变化，不冒称纯补测或达成90%/85%长期目标。
- 当前内容仍content20/SAVE8、journal v2；未动editor/reforge公共接口、旧版本分支、原探针、全局配置/排除/超时。
- 无视觉变化；R4/N6b/full/Q1/Q2未执行，本卡不改变其它欠账的归属。

旧版本兼容审查：pass。project输入收紧后所有生产/正式测试调用已适配，无旧签名fallback；journal v2磁盘格式不变，没有新增upgrader；E-05候选仍另卡，不借本修复保留/删除相邻历史分支。
隔离工作树的raw、PAL二进制为本地验证补齐，extracted/baked是只读来源链接，不进Git；本轮无主树作者工程写入。
