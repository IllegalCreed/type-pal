# C09：K02 Viewer真实编辑工作流

2026-10-16，单Owner Codex，唯一分支codex/code-quality-3y，基点c858f4840，main=f98d0ddd8，0behind。归属[当前任务卡](../../../tasks/QUALITY-EDITOR-VIEWER-DIAGNOSTICS-1.md)；不改产品、格式/schema、资源管线、规则或生成物。两个源文件仅review，0新增关闭。

## 读取、caller与输入

reads.json逐项记录原始全文SHA/行数，两个修改文件的原件分别无损gzip。全文包括目标K02测试、共享upload-harness/upload-ui、产品Viewer、两套合法fixture、硬件/磁盘gate kit、glm通用交互kit、reader/sprite-assets和Kimi历史卡；实际行数以reads.json为准。WorldSpriteLibrary:770-875与DataMode:710-775只核caller段，不记整文件完成。

Primary：[React act官方文档](https://react.dev/reference/react/act)要求把异步渲染/交互交付包含在await act内，并保持测试环境标记启用；本片按实际promise见证实现。

生产World父页按session提供catalog revision/consumers并给稳定回调；Viewer真实加载sprite与palette，revision变化后重读，退出的effect通过alive拒绝迟到结果。编辑经PNG解码、量化、gzip、SHA与ReplaceSpriteAssetCommand实际提交，通知是可观察的完成/错误出口。K02与Cursor项目结构相同，均经过blank seed、正式loader和保存校验；保留真实量化色块、catalog/blob/undo与姿势断言，无强转桥接。硬件端口只补jsdom能力，磁盘gate只延迟真实IO。

## 根因消融与最终改动

基线五例全绿但56act；只复用共享宿主后44act，证明首次加载只占部分根因。实际PNG解码、异步命令提交及revision重读仍越出act。最终等待透传createImageBitmap结果、实际通知及cache/palette返回promise，五例全绿、0skip/0act/0环境/0导航。baseline/shared-host-only/owned-final/final原始runner与stdout/stderr均保留，不改历史计数。

删除目标内重复ViewerHarness、根节点与reader/session构造。共享等待器默认仍只等当前资产；仅新增显式asset参数，用于释放A后等A的真实解码完成，同时B仍是选择。去掉空Promise、双setTimeout及11处对已完成结果的轮询，独立断言proof归属/帧数，不把错误结果一直等成timeout。取消补proof/帧交付零增加，undo/redo补真实重读；切回A补无第二次磁盘读，兑现原缓存注释。五条身份全部保留，不新增用例或退役记录。

## 判别力与回归

counter-run.py在临时源副本分别注入“追加后错误选回0”和“允许退出effect交付迟到结果”。旧/新完整五例分别均4绿1指定AssertionError，0skip，无TypeError/timeout混错；新版本反控均0诊断，完整恢复5绿。原产品和实际工作树不受变异影响。counter.json保留实际file×fullName/status/failure、执行源/测试SHA和raw/runner SHA；counter-input-files.json.gz记录隔离输入，临时目录已删除。counter-split-verification.json由另进程在删除后重构recipe与全部SHA/身份。首次已通过反控的测试随后只修一条过期消息注释，原件留counter-first，再按最终字节完整复跑，两轮事实均保留。

11相邻文件80例通过，包括共享helper全部直接测试caller、旧Viewer/规划器/reader及World工作流；仍63act来自未处理的Wizard/Uploader，不据此宣称模块统一零诊断。editor两份typecheck通过。完整editor包631文件/4945例全绿、0skip，但759act/243环境，另1条只读表单告警（number-inputs.glm-leaf-wave.test.tsx），严格零诊断仍不通过；package-diagnostic-census.json保留其它stderr首行供续核。docs/lint-zero/ledger通过。全仓check/official ratchet/两父protected fast尚未在本片完成，禁止合main。

ledger只将目标pending→review，shared helper保持review；3287 inventory /223 closed /199 review /2865 pending。下一片先核Wizard/Uploader剩余63act及本包最新诊断分布，未知重复、公共输入与其它逐文件域继续待核。
