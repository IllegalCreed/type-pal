# Codex 当前命令弹层五组补测

[测试入口](../README.md) / [任务卡](../../ops/archive/tasks/done/TEST-CODEX-COMMAND-FORMS-1-current-dialogs.md) /
[机账](evidence.json) / [五针工具](mutants.mjs)（[配置](mutants.config.mjs)） /
[真实缺陷诊断](diagnostics.test.ts)（[隔离配置](diagnostics.config.mjs)）

起点7bd8f064，产品/旧测试/配置/资产零改。五文件51项全部由公开CanonicalScriptBodyEditor双击
真实命令行进入弹层→控件事件→完成；**不直接强转作者命令给旧CommandForm**。
现行消费者ScriptEditor.tsx:1710-1755/:3380-3425，排除CUSTOM_COMMANDS已接管的旧实体/branch/callScript等。
无浏览器像素或磁盘保存宣称；只证DOM交互与聚合数据合同。

## 合同与去重

| 组 | 新增 | 实证与旧证明区别 |
|---|---:|---|
| movement | 20 | 各真实字段回调、nested pos/to兄弟字段保真、姿势清除、只读事务token；不重做旧空字符串/方向fade提交例 |
| scene | 10 | 实际弹层切目标/命名/默认/临时坐标、三坐标、过渡撤销；旧makeLoadScene仅纯函数三例，无UI接线 |
| data | 8 | flag双字段聚合、number引用与负数、money delta、shop数值ID、物品ID/count；悬空变量仅修复态不宣称可保存 |
| identity | 4 | actor/sprite稳定ID、appearance可选覆写清除与打开定义；不重复旧状态菜单与立绘列表 |
| dialog | 9 | narration/unbound/actor转换、称谓、slot/cursor默认清除、autoAdvance零/显式/缺席、新行取消；旧重排/打字速度不重做 |

fixture复用现有battleTrialProjectFiles合法完整种子，正式loadCurrentProjectFrom二次读取；补充场景、
精灵、商店、变量各自过生产守卫。脚本输入/输出都过checkAuthorCommands。
实际消费body及context数据（含locale）取独立structuredClone快照；每例完成前零onChange、
完成后完整命令全等并复验同一输入没变。Node标准Blob仅补JSDOM压缩宿主，结束恢复。
不使用核心mock、私有反射、test.fails或timeout作负控。

定向51+既有CommandForm13/纯函数3/ScriptEditor24=91/91；editor typecheck exit0。
日志`/tmp/codex-forms-directed-final.{json,log}`。最终普通TS夹具复验本批51+两项静态门套件85=136/136，
`/tmp/codex-forms-gate-repair.log`；editor TC再次exit0：`/tmp/codex-forms-tc-repair.log`。
最终五正控+五反控全部通过精确file/fullName/exit1/逐failure AssertionError/拒混错和timeout，
源码hash不变；最终`/tmp/codex-forms-mutants-repair.log`及机账记录原始临时目录。

```sh
env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor exec vitest run src/ui/CommandForm.current-movement.test.tsx src/ui/CommandForm.current-scene.test.tsx src/ui/CommandForm.current-data.test.tsx src/ui/CommandForm.current-identity.test.tsx src/ui/CommandForm.current-dialog.test.tsx src/ui/CommandForm.current-characterization.test.tsx src/ui/CommandForm.test.ts src/ui/ScriptEditor.test.tsx
env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor typecheck
node docs/testing/codex-command-forms/mutants.mjs
```

## 真实失败与纪律

- 本席首版scene fixture/部分pos漏height，当前guard+TC拒绝，20项均在夹具入口失败；已补必填height，
  撤销“heightless正控”假设，不为分支制造非法项目。当前作者items与旧引用目录ItemData并非同型，
  使用这份无脚本item原始文件经validateItems取typed查询输入，不强转或mock。
- 第二轮44/51绿，7红全为本席source transition漏color/evidenceId；已按当前合同补全合成证明ID，
  不声称该合成时序来自原版；最终51绿。以上是本席夹具错误，不归为产品缺陷。
- 首次全仓check exit1：本席`.tsx`测试夹具被既有UI静态扫描当作产品页面，导致adoption文件数96≠95、
  boundary将查询字符串计为两个原生checkbox。改为普通`.ts`测试辅助文件并使用等价createElement；
  不改扫描器/既有测试/排除列表。原日志`/tmp/codex-forms-check.log`保留，修后完整门另行记录。
- 另有真实**loadScene朝向清除失败**：原树实际输出仍带left，预期缺席；`FORM_DIAGNOSTIC_FIX=true`
  仅在隔离Vite load中改保持选项调用，原断言转绿，源文件hash不变。保留普通失败诊断，
  不加入官方绿套件，也不改产品。修复归[独立卡](../../ops/tasks/EDITOR-SCENE-FACING-1-clear-override.md)。

```sh
# 应业务红：输出多出 facing:left
env -u NODE_COMPILE_CACHE pnpm exec vitest run --config docs/testing/codex-command-forms/diagnostics.config.mjs
# 隔离一行oracle应绿；不写源码
env -u NODE_COMPILE_CACHE FORM_DIAGNOSTIC_FIX=true pnpm exec vitest run --config docs/testing/codex-command-forms/diagnostics.config.mjs
```

## 全仓门

最终串行check9438→ratchet→保护7bd8f064的单次strict8946全部exit0。
日志`/tmp/codex-forms-check-repair.log`、`/tmp/codex-forms-ratchet.log`、`/tmp/codex-forms-strict.log`。
全仓分支45304→45477/63178（71.98233562315997%），净增173；语句+113、函数+64、行+110。
CommandForm目标分支113→234/540、行111→204/374、函数54→117/219；ScriptEditor分支628→629/1136。
以上目标局部数不冒充全套并集；其余消费者增量包含在editor包总量中。
生产701文件、各包sourceFiles/scopeDigest与所有分母不变，其它六包完整baseline对象不变。
最终诊断原红/一处隔离oracle绿再次通过；产品/旧测试/配置/资产零修改，缺陷卡仍draft。
本席实施自验accept，纯测试批done准入满足；无下一位Agent提示词，Codex提交推送并继续母目标。
