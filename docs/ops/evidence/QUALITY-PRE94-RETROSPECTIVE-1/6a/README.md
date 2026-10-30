# 6a账本/清单工程切片复审

归[全量复审卡](../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)；基点bea19f80c、main=f98d0ddd8，单Agent/唯一3y分支。83卡队列中的6a仅partial，0新增关闭，历史done不升级成本轮accept。

## 逐文件直接证据

| 文件（scripts/quality/） | 实际完整读取 | caller/oracle、职责与结论 |
|---|---|---|
| code-quality-ledger.mjs | 原件142行全文 | 根package.json test:quality-tools→Node测试；CLI真实调用inventory，纯函数被专属测试直接调用。校验fence/重复/未知路径/计数/状态/空证据；CLI只有读取与exitCode，当前导入guard正确。没有发现对应生产缺陷，原关闭保留历史，本轮不重新accept。 |
| code-quality-ledger.test.mjs | 原123行与补证后136行全文 | 三路径合法fixture直接调用真实validator；原9例不能检出CLI导入副作用。补一个真实子进程安静导入合同，精确撤回本文件旧关闭为review。对象不变性有直接比较，不可变source自比不当作有效反控。 |
| code-quality-inventory.mjs | 原件216行全文 | git ls-files -z→当前tracked文本→静态依赖和re-export caller线索；模块URL固定root，--out显式写快照，否则stdout。单调caller集合有限收敛；词法关系不是运行时图或精确符号绑定。实现未修改；未来package范围扩展仍须专项核定。 |
| code-quality-inventory.test.mjs | 原48行与补证后64行全文 | 真实RLE生产caller/排除测试caller/生成物字段oracle；原deterministic标题却只跑一次且漏护--out。原例补临时--out字节等于stdout、无关cwd和安静出口，t.after清理；pending→review，未加弱用例。 |

全文还读原6a卡、根package.json、当前总纲与本卡；caller静态搜索限真实根script与专属测试。没有把RLE、tileset loader或全包barrel冒充本轮全文复验。四源before.gz保留旧字节，当前SHA与命令/cwd/exit/raw SHA见[test-proof.json](test-proof.json)。primary为本仓真实Node CLI/Git tracked输入及原卡合同；SDLPal与两阶段产品机制N/A。

## 两枚有效判别力反控

| 单一变异 | 原测试 | 补证后 | 恢复 |
|---|---|---|---|
| ledger仅删除最终import guard，无条件main | 9/9绿，导入打印CLI PASS | 9绿/1红，恰好安静导入例ERR_ASSERTION | 真模块10绿 |
| inventory仅把--out写入换成有效但错误的空JSON | 原1例绿 | 原例字节比较ERR_ASSERTION | 真模块1绿 |

同目录未追踪副本维持真实root/依赖，只调整复制测试的模块URL；实际工具始终未改。无name filter/skip，非setup或timeout红。恢复定向11/11、相邻quality-tools38/38，0fail/0skip/0cancelled。所有原始TAP、旧字节与精确变异描述保留。另进程[验证](verification.json)核raw SHA、唯一失败身份与failureType、当前源SHA和临时副本清除；不是第三方签字。inventory错误diff含完整源码字段，其中出现timeout字样属于断言数据，失败类型按Node原生结构字段核定。

## 质量与剩余范围

纯validator与CLI IO职责边界明确；两次spawn分别保护stdout和--out的不同出口，没有为少量表面重复另造泛化helper。未删测试身份，不新增ignore/exclude/强转，不改规则、公共出口、游戏行为、schema/save、资产或生成产品。

本片只补测试证据。全仓check/official ratchet/protected fast未重新运行，editor仍非零运行时诊断，禁止合main；baseline未手改。.mjs执行Node原生测试与全仓lint，本片无TypeScript实现变更，不虚报新typecheck。工程范围扩展/词法图局限不由字段全绿证明完备。6a整卡partial，本轮83卡accept仍0；下一片92真门原件/源码快照，再按模块逐文件继续。

[本检查点静态门](gates.md)：docs、lint-zero、ledger、diff-check均通过；lint4376文件，error/warning/info均0。定向11/相邻38与上述静态通过不代表统一运行时诊断清零。
