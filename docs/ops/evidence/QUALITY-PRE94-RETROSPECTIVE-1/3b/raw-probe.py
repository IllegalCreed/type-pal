# -*- coding: utf-8 -*-
"""Compare all raw SSS records with independent little-endian struct unpacking."""
import gzip
import hashlib
import json
from pathlib import Path
import struct
import subprocess

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[4]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def digest(value):
    return sha(json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode())


sss_path = ROOT / 'data/raw/SSS.MKF'
msg_path = ROOT / 'data/raw/M.MSG'
raw, msg = sss_path.read_bytes(), msg_path.read_bytes()
header_size = struct.unpack_from('<I', raw)[0]
assert header_size % 4 == 0
offsets = list(struct.unpack_from('<' + 'I' * (header_size // 4), raw))
assert len(offsets) == 6 and offsets[0] == header_size and offsets[-1] == len(raw)
assert all(a <= b <= len(raw) for a, b in zip(offsets, offsets[1:]))
chunks = [raw[a:b] for a, b in zip(offsets, offsets[1:])]
assert all(len(b) % width == 0 for b, width in zip(chunks, [32, 8, 2, 4, 8]))
eo = [list(struct.unpack_from('<hHHhHHh9H', chunks[0], i)) + [list(struct.unpack_from('<16H', chunks[0], i))] for i in range(0, len(chunks[0]), 32)]
scenes = [list(struct.unpack_from('<4H', chunks[1], i)) + [list(struct.unpack_from('<4H', chunks[1], i))] for i in range(0, len(chunks[1]), 8)]
objects = list(struct.unpack('<' + 'H' * (len(chunks[2]) // 2), chunks[2]))
message_offsets = list(struct.unpack('<' + 'I' * (len(chunks[3]) // 4), chunks[3]))
assert message_offsets[0] == 0 and message_offsets[-1] == len(msg)
assert all(a <= b <= len(msg) for a, b in zip(message_offsets, message_offsets[1:]))
expected = {'eoDigest': digest(eo), 'sceneDigest': digest(scenes), 'objectDigest': digest(objects), 'offsetDigest': digest(message_offsets), 'bytecodeDigest': sha(chunks[4])}
program = '''
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { parseSss } from './src/io/sss.ts'
import { parseMessages } from './src/io/msg.ts'
const sha = b => createHash('sha256').update(b).digest('hex')
const digest = v => sha(JSON.stringify(v))
const sssBytes = new Uint8Array(readFileSync('../../data/raw/SSS.MKF'))
const msgBytes = new Uint8Array(readFileSync('../../data/raw/M.MSG'))
const before = [sha(sssBytes), sha(msgBytes)]
const sss = parseSss(sssBytes)
const fields = ['vanishTime','x','y','layer','triggerScript','autoScript','state','triggerMode','spriteNum','nSpriteFrames','direction','currentFrameNum','scriptIdleFrame','spritePtrOffset','nSpriteFramesAuto','scriptIdleFrameCountAuto']
const messages = parseMessages(msgBytes, sss.messageOffsets)
console.log(JSON.stringify({
 eoDigest: digest(sss.eventObjects.map(o => [...fields.map(f => o[f]), Array.from(o.raw)])),
 sceneDigest: digest(sss.scenes.map(s => [s.mapNum,s.scriptOnEnter,s.scriptOnTeleport,s.eventObjectIndex,Array.from(s.raw)])),
 objectDigest: digest(Array.from(sss.objects)), offsetDigest: digest(Array.from(sss.messageOffsets)),
 bytecodeDigest: sha(sss.bytecode), messageCount: messages.length,
 rawSssSha256: before[0], rawMsgSha256: before[1], messageTextObservationDigest: digest(messages), inputsUnchanged: before[0] === sha(sssBytes) && before[1] === sha(msgBytes),
}))
'''
command = ['pnpm', '--filter', '@type-pal/pal-extract', 'exec', 'tsx', '--eval', program]
result = subprocess.run(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
assert result.returncode == 0 and result.stderr == b'', result.stderr.decode()
actual = json.loads(result.stdout)
assert all(actual[key] == value for key, value in expected.items())
assert actual['messageCount'] == len(message_offsets) - 1 and actual['inputsUnchanged']
assert actual['rawSssSha256'] == sha(raw) and actual['rawMsgSha256'] == sha(msg)
assert sss_path.read_bytes() == raw and msg_path.read_bytes() == msg
receipt = {'command': command, 'cwd': str(ROOT), 'exit': result.returncode, 'rawSssSha256': sha(raw), 'rawMsgSha256': sha(msg), 'chunkSizes': list(map(len, chunks)), 'eventObjects': len(eo), 'scenes': len(scenes), 'objectWords': len(objects), 'messageOffsets': len(message_offsets), 'bytecodeInstructions': len(chunks[4]) // 8, 'independentStructExpected': expected, 'actual': actual, 'stdoutSha256': sha(result.stdout), 'stderrSha256': sha(result.stderr), 'notClaimed': 'No native SDL execution or text codec oracle. Text digest is observation only; no assets regenerated.'}
(OUT / 'raw-proof.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
(OUT / 'raw-probe.stdout.gz').write_bytes(gzip.compress(result.stdout, mtime=0))
print(json.dumps({key: receipt[key] for key in ['eventObjects', 'scenes', 'objectWords', 'messageOffsets', 'bytecodeInstructions']}))
