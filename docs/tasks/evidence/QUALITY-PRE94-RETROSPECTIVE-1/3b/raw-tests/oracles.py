# -*- coding: utf-8 -*-
"""Raw bytes and Python struct/strict GBK only; never import the TypeScript parser."""
import hashlib
import json
from pathlib import Path
import struct

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[5]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def digest(value):
    return sha(json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode())


def read_oracles():
    raw = (ROOT / 'data/raw/SSS.MKF').read_bytes()
    msg = (ROOT / 'data/raw/M.MSG').read_bytes()
    offsets = list(struct.unpack_from('<6I', raw))
    assert offsets[0] == 24 and offsets[-1] == len(raw)
    assert all(a <= b <= len(raw) for a, b in zip(offsets, offsets[1:]))
    chunks = [raw[a:b] for a, b in zip(offsets, offsets[1:])]
    assert all(len(b) % size == 0 for b, size in zip(chunks, [32, 8, 2, 4, 8]))
    eo = [list(struct.unpack_from('<hHHhHHh9H', chunks[0], i)) + [list(struct.unpack_from('<16H', chunks[0], i))] for i in range(0, len(chunks[0]), 32)]
    scenes = [list(struct.unpack_from('<4H', chunks[1], i)) + [list(struct.unpack_from('<4H', chunks[1], i))] for i in range(0, len(chunks[1]), 8)]
    objects = list(struct.unpack('<' + 'H' * (len(chunks[2]) // 2), chunks[2]))
    positions = list(struct.unpack('<' + 'I' * (len(chunks[3]) // 4), chunks[3]))
    assert positions[0] == 0 and positions[-1] == len(msg)
    assert all(a <= b <= len(msg) for a, b in zip(positions, positions[1:]))
    sss = {'inputSha256': sha(raw), 'eventObjects': len(eo), 'scenes': len(scenes), 'objectWords': len(objects), 'messageOffsets': len(positions), 'bytecodeInstructions': len(chunks[4]) // 8, 'eoDigest': digest(eo), 'sceneDigest': digest(scenes), 'objectDigest': digest(objects), 'offsetDigest': digest(positions), 'bytecodeDigest': sha(chunks[4])}
    samples = []
    for index in [0, 1, 100, 6757, 13512]:
        part = msg[positions[index]:positions[index + 1]]
        assert b'\0' not in part
        text = part.decode('gbk', errors='strict')
        assert not any(0xe000 <= ord(c) <= 0xf8ff for c in text)
        samples.append({'id': index, 'start': positions[index], 'end': positions[index + 1], 'hex': part.hex(), 'expected': text})
    return {'sss': sss, 'msg': {'msgSha256': sha(msg), 'sssSha256': sha(raw), 'offsets': len(positions), 'messages': len(positions) - 1, 'samples': samples}, 'notClaimed': 'Five fixed clean raw entries only; no exclusion/filter added to the runner and no full-text/fixup/native oracle.'}


if __name__ == '__main__':
    data = read_oracles()
    previous = json.loads((OUT.parent / 'raw-proof.json').read_text())
    assert {key: data['sss'][key] for key in previous['independentStructExpected']} == previous['independentStructExpected']
    (OUT / 'oracles.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'SSS': data['sss']['eventObjects'], 'messages': data['msg']['messages'], 'fixedSamples': len(data['msg']['samples'])}))
