# 保存恢复：接收侧未覆盖分支台账

父卡：[EDITOR-SAVE-RECOVERY-1](../ops/tasks/EDITOR-SAVE-RECOVERY-1-interrupted-author-save.md)。
本表由Codex在接收GLM preflight-r1时重建，用来替代[原回执](editor-save-recovery-glm-preflight.md)中不可靠的覆盖/可达性分类。

## 口径与未完成边界

- 代码：4b72e492生产树（preflight-r1未改生产）；测试输入候选193f4adf/fae10e55及Codex接收侧小幅断言补证。
- 初始数据：GLM cov5的coverage-final.json；源码条件与函数/回调由TypeScript AST重新定位，非手写猜测。Codex随后在集成树运行单次严格fast，LCOV的零命中branchId/arm已与本清单逐臂核对一致（82+37），详见[统一质量门回执](editor-save-recovery-glm-preflight.md#codex-fae10e55接收结论2026-09-12)。
- 本表只列命中数为0的臂：workspace-persistence 82 + project-io 37 = **119**；没有任何一臂可在本口径标成“已有覆盖”。
- branchId/arm是本次V8报告定位键，不能作为产品稳定ID；源码改动/工具升级后必须重生成，不盲用旧编号。
- 条件为源码节选，归一化空白及模板引号，长行以省略号显示；它不是可达性证明。if/三元的臂含义以报告原locations为准。
- **E0（118臂）=待确认**：当前只证报告未命中和对应源码位置，未证每个臂的真实生产caller/前置守卫/合法输入。下一责任人Codex；后续须给出真实入口/正控/反例后再改分类。
- **E1（1臂）=可达待补**：wp 130/0。Codex已通过真实目录JSON→inspectWorkspaceMetadata→公开authorizeBoundWorkspaceTarget证明双marker合法解析后冲突拒绝；暂未加常驻测试，因此本覆盖报告仍为0。
  证据见[返工复核](editor-save-recovery-glm-preflight.md#codex-preflight-r1返工复核fd0fcc4f2026-09-12counter)，临时bothMarkers oracle可重建。
- 此处不把“难构造”判为不可达，不接受用相邻路径通过数代替当前分支证据。原C组的20/49/10/3、9/10/4/4+10结论**不获接收背书**。
- 119臂是待核覆盖位置，不是119个已确认bug，也不是本任务全部剩余工作；合法JSON及当前作者状态的边界仍需逐条核实。原生/性能/终审另按父卡执行。

## 当前清单

### workspace-persistence.ts

来源：packages/editor/src/core/workspace-persistence.ts；源码SHA-256：f4cea61c2ae532945e9d707e73cf9def2ed98bc22a1b17cd19dd95eb0b3553b0。未覆盖82臂。

| 分支/臂 | 行 | 所在函数/回调 | 条件/子表达式（按报告编号） | 当前分类 |
|---|---:|---|---|---|
| 3/1 | 127 | readJsonState | cond-expr：error instanceof Error | 待确认（E0） |
| 4/0 | 147 | writeJsonSidecar | if：!dir | 待确认（E0） |
| 9/0 | 172 | assertDirectoryEmpty → visit | if：![...allowed.keys()].some((file) => file.startsWith('${path}/')) | 待确认（E0） |
| 10/0 | 177 | assertDirectoryEmpty → visit | if：!signature \|\| (await binarySnapshotSignature( await (await (handle as FileSystemFileHandle).getFile()).arrayBuffer(), )) !== signature | 待确认（E0） |
| 20/0 | 234 | authorizedSaveScope | if：!state?.active \|\| state.dataFinalized | 待确认（E0） |
| 25/0 | 257 | authorizedSaveScope → reconcileRecovery | if：state.active | 待确认（E0） |
| 26/0 | 260 | authorizedSaveScope → reconcileRecovery | if：!plan | 待确认（E0） |
| 35/0 | 304 | sealAuthorizedSavePlan | if：state.privateOperationId !== plan.operationId \|\| Object.keys(plan.before).length !== before.size \|\| Object.entries(plan.before).some( ([path, value]) => !before.has(path) \|\| before.get(path) !== value, ) | 待确认（E0） |
| 42/0 | 337 | allowAuthorizedSavePrivateFile | if：!state?.active \|\| state.dataFinalized | 待确认（E0） |
| 45/0 | 341 | allowAuthorizedSavePrivateFile | if：path !== '.type-pal/save-state.json' && suffix !== 'plan.json' && !/^blobs\/[0-9a-f]{64}$/.test(suffix) | 待确认（E0） |
| 47/0 | 347 | allowAuthorizedSavePrivateFile | if：state.privateOperationId && state.privateOperationId !== operationId | 待确认（E0） |
| 50/0 | 360 | completeAuthorizedWorkspaceData | if：!state?.active | 待确认（E0） |
| 71/0 | 485 | recordAuthorizedWorkspaceWriteCompleted | if：!state?.active \|\| state.dataFinalized | 待确认（E0） |
| 77/0 | 492 | recordAuthorizedWorkspaceWriteCompleted | if：value instanceof ArrayBuffer \|\| ArrayBuffer.isView(value) | 待确认（E0） |
| 80/1 | 499 | recordAuthorizedWorkspaceWriteCompleted | cond-expr：typeof value === 'string' | 待确认（E0） |
| 82/0 | 510 | planAuthorizedWorkspacePaths | if：!state?.active \|\| state.dataFinalized | 待确认（E0） |
| 85/0 | 520 | recordAuthorizedWorkspaceRemoveCompleted | if：!state?.active \|\| state.dataFinalized | 待确认（E0） |
| 88/0 | 532 | registerAuthorizedWorkspaceMutation | if：!state?.active | 待确认（E0） |
| 89/0 | 534 | registerAuthorizedWorkspaceMutation | if：targetContext.workspaceId !== context.workspaceId \|\| targetContext.projectId !== context.projectId \|\| targetContext.mode !== context.mode \|\| targetContext.source !== context.source | 待确认（E0） |
| 91/0 | 542 | registerAuthorizedWorkspaceMutation | if：state.dataFinalized && !pending | 待确认（E0） |
| 93/0 | 543 | registerAuthorizedWorkspaceMutation | if：pending && (pending.context !== context \|\| pending.name !== name) | 待确认（E0） |
| 96/0 | 553 | beginAuthorizedWorkspaceMutation | if：!state?.active \|\| state.dataFinalized | 待确认（E0） |
| 99/0 | 568 | assertSandboxIdentity | if：metadata.palDevelopment.kind !== 'missing' | 待确认（E0） |
| 100/0 | 570 | assertSandboxIdentity | if：metadata.sandbox.kind !== 'valid' | 待确认（E0） |
| 101/0 | 573 | assertSandboxIdentity | cond-expr：metadata.sandbox.kind === 'invalid' | 待确认（E0） |
| 101/1 | 574 | assertSandboxIdentity | cond-expr：metadata.sandbox.kind === 'invalid' | 待确认（E0） |
| 104/0 | 590 | assertPalDevelopmentTarget | if：context.mode !== 'pal-development' \|\| !context.palProof | 待确认（E0） |
| 106/0 | 592 | assertPalDevelopmentTarget | if：metadata.sandbox.kind !== 'missing' | 待确认（E0） |
| 107/0 | 594 | assertPalDevelopmentTarget | if：metadata.palDevelopment.kind !== 'valid' | 待确认（E0） |
| 108/0 | 597 | assertPalDevelopmentTarget | cond-expr：metadata.palDevelopment.kind === 'invalid' | 待确认（E0） |
| 108/1 | 598 | assertPalDevelopmentTarget | cond-expr：metadata.palDevelopment.kind === 'invalid' | 待确认（E0） |
| 109/0 | 601 | assertPalDevelopmentTarget | if：sentinel.workspaceId !== context.workspaceId \|\| sentinel.projectId !== context.projectId | 待确认（E0） |
| 113/0 | 613 | palDevelopmentTargetFingerprint | if：context.mode !== 'pal-development' \|\| !context.palProof | 待确认（E0） |
| 115/0 | 617 | palDevelopmentTargetFingerprint → 回调@615 | if：text === undefined | 待确认（E0） |
| 116/0 | 622 | palDevelopmentTargetFingerprint → 回调@615 | cond-expr：error instanceof Error | 待确认（E0） |
| 116/1 | 622 | palDevelopmentTargetFingerprint → 回调@615 | cond-expr：error instanceof Error | 待确认（E0） |
| 117/0 | 632 | readPalDevelopmentTargetValues | if：context.mode !== 'pal-development' \|\| !context.palProof | 待确认（E0） |
| 119/0 | 637 | readPalDevelopmentTargetValues | if：text === undefined | 待确认（E0） |
| 120/0 | 642 | readPalDevelopmentTargetValues | cond-expr：error instanceof Error | 待确认（E0） |
| 120/1 | 642 | readPalDevelopmentTargetValues | cond-expr：error instanceof Error | 待确认（E0） |
| 121/1 | 646 | readPalDevelopmentTargetValues | binary-expr： | 待确认（E0） |
| 122/0 | 648 | readPalDevelopmentTargetValues → 回调@647 | if：!values.has(path) | 待确认（E0） |
| 123/0 | 651 | readPalDevelopmentTargetValues | if：actual !== expected | 待确认（E0） |
| 124/0 | 660 | fingerprintPalExpectedValues | if：context.mode !== 'pal-development' \|\| !context.palProof | 待确认（E0） |
| 126/0 | 663 | fingerprintPalExpectedValues → 回调@662 | if：!values.has(path) | 待确认（E0） |
| 130/0 | 689 | assertNoInvalidMetadata | if：metadata.sandbox.kind === 'valid' && metadata.palDevelopment.kind === 'valid' | 可达待补（E1） |
| 132/0 | 698 | assertBoundWorkspaceIdentity | if：!record | 待确认（E0） |
| 133/0 | 699 | assertBoundWorkspaceIdentity | if：record.projectId !== context.projectId \|\| record.mode !== context.mode \|\| record.source !== context.source | 待确认（E0） |
| 138/0 | 718 | assertBoundWorkspaceIdentity | if：metadata.sandbox.kind !== 'missing' \|\| metadata.palDevelopment.kind !== 'missing' | 待确认（E0） |
| 143/0 | 737 | assertCompatibleExistingBinding | if：record.projectId !== context.projectId \|\| record.mode !== context.mode \|\| record.source !== context.source | 待确认（E0） |
| 145/1 | 743 | assertCompatibleExistingBinding | if：!(await record.handle.isSameEntry(requestedDir)) | 待确认（E0） |
| 149/0 | 760 | preflightFirstSaveTarget | if：opts.resumesInterruptedAttempt && metadata.sandbox.kind === 'valid' | 待确认（E0） |
| 150/1 | 760 | preflightFirstSaveTarget | binary-expr：metadata.sandbox.kind === 'valid')  | 待确认（E0） |
| 158/0 | 775 | preflightFirstSaveTarget | if：entryBinding && entryBinding.workspaceId !== context.workspaceId | 待确认（E0） |
| 159/1 | 775 | preflightFirstSaveTarget | binary-expr： | 待确认（E0） |
| 162/0 | 803 | authorizeFirstSaveTarget | cond-expr：context.mode === 'pal-development' | 待确认（E0） |
| 164/2 | 805 | authorizeFirstSaveTarget | binary-expr： | 待确认（E0） |
| 165/0 | 808 | authorizeFirstSaveTarget | if：!authorBaseline | 待确认（E0） |
| 169/0 | 823 | authorizeFirstSaveTarget → verifyWorkspace | if：metadata.sandbox.kind === 'invalid' \|\| metadata.palDevelopment.kind !== 'missing' | 待确认（E0） |
| 172/1 | 842 | authorizeFirstSaveTarget → 回调@840 | if：metadata.sandbox.kind === 'missing' | 待确认（E0） |
| 173/0 | 843 | authorizeFirstSaveTarget → 回调@840 | if：metadata.palDevelopment.kind !== 'missing' | 待确认（E0） |
| 175/0 | 889 | contextFromRecord | if：record.mode === 'sandbox' | 待确认（E0） |
| 176/0 | 890 | contextFromRecord | if：record.source !== 'ui-samples' && record.source !== 'sandbox-copy' && record.source !== 'review-copy' | 待确认（E0） |
| 176/1 | 890 | contextFromRecord | if：record.source !== 'ui-samples' && record.source !== 'sandbox-copy' && record.source !== 'review-copy' | 待确认（E0） |
| 177/0 | 891 | contextFromRecord | binary-expr： | 待确认（E0） |
| 177/1 | 892 | contextFromRecord | binary-expr： | 待确认（E0） |
| 177/2 | 893 | contextFromRecord | binary-expr： | 待确认（E0） |
| 178/1 | 898 | contextFromRecord | if：record.mode === 'local-project' | 待确认（E0） |
| 182/1 | 916 | assertExpectedWorkspaceIdentity | if：context.workspaceId !== expected.workspaceId \|\| context.projectId !== expected.projectId \|\| context.mode !== expected.mode \|\| context.source !== expected.source | 待确认（E0） |
| 183/1 | 918 | assertExpectedWorkspaceIdentity | binary-expr： | 待确认（E0） |
| 183/2 | 919 | assertExpectedWorkspaceIdentity | binary-expr： | 待确认（E0） |
| 183/3 | 920 | assertExpectedWorkspaceIdentity | binary-expr： | 待确认（E0） |
| 185/0 | 940 | resolveOpenedWorkspaceContext | if：hint && hint.projectId !== projectId | 待确认（E0） |
| 190/0 | 953 | resolveOpenedWorkspaceContext | if：marker.projectId !== projectId | 待确认（E0） |
| 192/0 | 957 | resolveOpenedWorkspaceContext | if：context.mode !== 'sandbox' \|\| context.workspaceId !== marker.workspaceId | 待确认（E0） |
| 196/0 | 963 | resolveOpenedWorkspaceContext | if：existing.mode !== 'sandbox' \|\| existing.projectId !== marker.projectId \|\| existing.source !== marker.source | 待确认（E0） |
| 199/0 | 974 | resolveOpenedWorkspaceContext | if：hint && hint.mode !== 'pal-development' | 待确认（E0） |
| 200/1 | 974 | resolveOpenedWorkspaceContext | binary-expr： | 待确认（E0） |
| 202/0 | 980 | resolveOpenedWorkspaceContext | if：!(await existing.handle.isSameEntry(dir)) | 待确认（E0） |
| 203/0 | 982 | resolveOpenedWorkspaceContext | if：existing.mode !== 'pal-development' \|\| existing.projectId !== context.projectId \|\| existing.source !== 'dev-http' | 待确认（E0） |
| 206/0 | 993 | resolveOpenedWorkspaceContext | if：hint.mode !== 'local-project' | 待确认（E0） |
| 208/0 | 1000 | resolveOpenedWorkspaceContext | if：existing.projectId !== projectId | 待确认（E0） |

### project-io.ts

来源：packages/editor/src/core/project-io.ts；源码SHA-256：4f592fc9611038c4f7acbd7c248675e1cd7929a6495357e6083b1e9fba8a996d。未覆盖37臂。

| 分支/臂 | 行 | 所在函数/回调 | 条件/子表达式（按报告编号） | 当前分类 |
|---|---:|---|---|---|
| 2/0 | 82 | toEditorState | if：project.manifest.content.stamps && stamps === undefined | 待确认（E0） |
| 7/0 | 152 | resumeOwnProjectSave | if：!snapshot | 待确认（E0） |
| 8/0 | 153 | resumeOwnProjectSave | cond-expr：result.cleanupWarning | 待确认（E0） |
| 13/0 | 220 | serializeProject | if：diagnostics.warnings.length | 待确认（E0） |
| 15/0 | 233 | serializeProject | if：!content.worldVariables | 待确认（E0） |
| 18/1 | 239 | serializeProject | binary-expr：'content/scenes/'). | 待确认（E0） |
| 20/0 | 246 | serializeProject | if：scene.id !== asset.id | 待确认（E0） |
| 23/0 | 264 | serializeProject | if：asset.path === mapIndexRel | 待确认（E0） |
| 26/0 | 275 | serializeProject | if：orphanIds.length | 待确认（E0） |
| 22/1 | 277 | serializeProject | if：mapIndexRel | 待确认（E0） |
| 29/0 | 287 | serializeProject | if：!chunk | 待确认（E0） |
| 30/1 | 299 | serializeProject | binary-expr： | 待确认（E0） |
| 31/1 | 300 | serializeProject | binary-expr： | 待确认（E0） |
| 32/1 | 301 | serializeProject | binary-expr： | 待确认（E0） |
| 33/1 | 302 | serializeProject | binary-expr： | 待确认（E0） |
| 34/1 | 304 | serializeProject | binary-expr： | 待确认（E0） |
| 35/1 | 305 | serializeProject | binary-expr： | 待确认（E0） |
| 36/1 | 306 | serializeProject | binary-expr：[] | 待确认（E0） |
| 37/1 | 309 | serializeProject | binary-expr：[]). | 待确认（E0） |
| 38/1 | 314 | serializeProject | binary-expr：{} | 待确认（E0） |
| 40/1 | 322 | serializeProject | if：content.sharedScripts !== undefined | 待确认（E0） |
| 48/0 | 404 | writeFile → 回调@393 | cond-expr：snapshot instanceof ArrayBuffer | 待确认（E0） |
| 50/1 | 427 | readTextFileIfPresent | if：error instanceof DOMException && error.name === 'NotFoundError' | 待确认（E0） |
| 65/1 | 512 | writeProject → 回调@499 | if：catalogPath && files[catalogPath] | 待确认（E0） |
| 71/0 | 523 | writeProject → 回调@499 | if：!write.includes(catalogPath) | 待确认（E0） |
| 79/1 | 560 | writeProject → 回调@499 → rememberWrite | binary-expr：value instanceof ArrayBuffer ? await binarySnapshotSignature(value)  | 待确认（E0） |
| 80/0 | 561 | writeProject → 回调@499 → rememberWrite | cond-expr：value instanceof ArrayBuffer | 待确认（E0） |
| 80/1 | 562 | writeProject → 回调@499 → rememberWrite | cond-expr：value instanceof ArrayBuffer | 待确认（E0） |
| 82/1 | 592 | writeProject → 回调@499 | binary-expr：{} | 待确认（E0） |
| 84/1 | 604 | writeProject → 回调@499 | binary-expr：0 | 待确认（E0） |
| 88/1 | 609 | writeProject → 回调@499 | binary-expr： | 待确认（E0） |
| 91/1 | 620 | writeProject → 回调@499 | binary-expr：0 | 待确认（E0） |
| 93/1 | 626 | writeProject → 回调@499 | binary-expr：0 | 待确认（E0） |
| 96/1 | 629 | writeProject → 回调@499 | binary-expr：0 | 待确认（E0） |
| 114/1 | 702 | preflightProjectWriteSet | cond-expr：cause instanceof Error | 待确认（E0） |
| 116/1 | 712 | preflightProjectWriteSet | cond-expr：cause instanceof Error | 待确认（E0） |
| 118/1 | 722 | preflightProjectWriteSet | cond-expr：cause instanceof Error | 待确认（E0） |
