#!/usr/bin/env python3
"""TEST-GLM-GAME-EVENT-CONTROL-FLOW-1 数据面可达性审计(只读)。

回答两个排重问题:
  1) 全库 autoScript(自身 autoLabel + 任何 0x24 setAutoScript 装载目标)是否有可达 0x7F;
  2) 0x7F[cx=0,cy=0,*] 的 op2 分布([0,0,0xFFFF] 豁免组合的真实数据实例)。

跳转语义照抄 pal-extract packages/pal-extract/src/events/opcodes.ts 的
JUMP_TARGET_OPERAND(29 个条件跳转 opcode 的目标 operand 序号)+ 0xA2 随机跳 [i+1,i+op0]
全收 + 0x06 无 label 恒等回退;BFS 同时跟随 0x04 call / 0x24 / 0x25 装载目标(过近似,只多不漏)。
"""

import json
import os

REPO = os.environ.get('TYPE_PAL_REPO', '/Users/zhangxu/illegal/type-pal')

JUMP = {0x04: 0, 0x24: 1, 0x25: 1, 0x58: 2, 0x5D: 1, 0x5E: 1, 0x61: 0, 0x64: 1, 0x74: 0,
        0x79: 1, 0x81: 2, 0x83: 2, 0x86: 2, 0x94: 2, 0x95: 1,
        0x06: 1, 0x1E: 1, 0x20: 2, 0x2E: 2, 0x33: 0, 0x34: 0, 0x38: 0, 0x3A: 0,
        0x68: 0, 0x84: 2, 0x91: 0, 0x9C: 1, 0x9E: 2}


def load():
    with open(f'{REPO}/data/extracted/events/all.json') as f:
        cmds = json.load(f)['segments'][0]['commands']
    with open(f'{REPO}/data/extracted/data/event-objects.json') as f:
        objs = json.load(f)['eventObjects']
    label_idx = {c['label']: i for i, c in enumerate(cmds) if c.get('label')}
    return cmds, objs, label_idx


def reachable(cmds, label_idx, start):
    seen = set()
    stack = [start]
    hits_7f = []
    while stack:
        i = stack.pop()
        if i is None or i in seen or not 0 <= i < len(cmds):
            continue
        seen.add(i)
        c = cmds[i]
        if c['op'] == 'goto':
            stack.append(i + 1)
            t = label_idx.get(c.get('to'))
            if t is not None:
                stack.append(t)
        elif c['op'] == 'end':
            if c.get('reset') is not None and c.get('resetTo') is not None:
                t = label_idx.get(f"L_{c['resetTo']}")
                if t is not None:
                    stack.append(t)
        elif c['op'] == 'raw':
            op = c.get('opcode')
            o = c.get('operands') or [0, 0, 0]
            if op == 0xA2:
                for k in range(1, (o[0] or 0) + 1):
                    stack.append(i + 1 + k)
            if op in JUMP:
                j = JUMP[op]
                tgt = o[j] if j < len(o) else 0
                if tgt:
                    t = label_idx.get(f"L_{tgt}")
                    if t is not None:
                        stack.append(t)
                    elif op == 0x06 and tgt < len(cmds):
                        stack.append(tgt)
            stack.append(i + 1)
            if op == 0x7F:
                hits_7f.append((i, tuple(o)))
        else:
            stack.append(i + 1)
    return hits_7f


def main():
    cmds, objs, label_idx = load()
    auto_bad = 0
    for o in objs:
        lab = o.get('autoLabel')
        if not lab:
            continue
        start = label_idx.get(lab)
        if start is None:
            continue
        if reachable(cmds, label_idx, start):
            auto_bad += 1
    targets = set()
    for i, c in enumerate(cmds):
        if c['op'] == 'raw' and c.get('opcode') == 0x24:
            o = c.get('operands') or [0, 0, 0]
            if o[1]:
                targets.add(label_idx.get(f"L_{o[1]}", o[1]))
    setauto_bad = sum(1 for t in sorted(targets)
                      if 0 <= t < len(cmds) and reachable(cmds, label_idx, t))
    zero_zero = [(i, c['operands']) for i, c in enumerate(cmds)
                 if c.get('op') == 'raw' and c.get('opcode') == 0x7F
                 and (c.get('operands') or [0, 0, 0])[:2] == [0, 0]]
    exempt = [(i, o) for i, o in zero_zero if len(o) > 2 and o[2] == 0xFFFF]
    print(f'total 0x7F commands: {sum(1 for c in cmds if c.get("op") == "raw" and c.get("opcode") == 0x7F)}')
    print(f'auto entries reaching 0x7F: {auto_bad}')
    print(f'0x24 setAutoScript targets: {len(targets)}; targets reaching 0x7F: {setauto_bad}')
    print(f'0x7F[0,0,*]: {len(zero_zero)}; [0,0,0xFFFF] exempt instances: {exempt}')


if __name__ == '__main__':
    main()
