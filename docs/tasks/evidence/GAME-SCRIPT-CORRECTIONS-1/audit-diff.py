"""Read-only inventory of the supplied Win translation data vs the local raw baseline.

Run from the repository root. Optional positional output path; never edits inputs.
This inventories differences, not automatic bug attribution or runtime acceptance.
"""
import collections
import difflib
import hashlib
import json
from pathlib import Path
import struct
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[4]
RAW = ROOT / 'data/raw'
PATCH = ROOT / 'data/en/win_files'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def read_mkf(path):
    data = path.read_bytes()
    first = struct.unpack_from('<I', data)[0]
    if first % 4 or first < 8 or first > len(data):
        raise ValueError('invalid MKF offset table')
    offsets = struct.unpack_from('<' + 'I' * (first // 4), data)
    if offsets[-1] != len(data) or list(offsets) != sorted(offsets):
        raise ValueError('invalid MKF chunk bounds')
    return data, [data[a:b] for a, b in zip(offsets, offsets[1:])]


def change_id(start):
    ranges = [
        (3923, 3924, 'D01'), (7568, 7570, 'D02'), (12910, 12911, 'D03'),
        (14461, 14487, 'D04'), (14972, 14996, 'D05'),
        (16390, 16475, 'D06'), (27448, 27449, 'D07'), (28423, 28424, 'D08'),
        (30946, 31048, 'D09'), (34025, 35093, 'D10'), (35394, 35395, 'D11'),
        (36936, 37849, 'D12'), (39352, 39353, 'D13'), (39471, 39497, 'D14'),
        (39700, 39701, 'D15'), (40190, 40392, 'D16'), (43041, 43056, 'D17'),
        (43134, 43135, 'D18'), (43503, 43504, 'APPEND'),
    ]
    return next((key for a, b, key in ranges if a <= start < b), 'UNCLASSIFIED')


def parse_slf(path):
    groups = []
    words = {}
    state = None
    start = None
    body = []
    for number, line in enumerate(path.read_text(encoding='utf-8-sig').splitlines(), 1):
        if line.startswith('[BEGIN MESSAGE]'):
            start = int(line.split(']', 1)[1])
            body = []
            state = 'message'
        elif line.startswith('[END MESSAGE]'):
            groups.append((start, int(line.split(']', 1)[1]), body))
            state = None
        elif line == '[BEGIN WORDS]':
            state = 'words'
        elif line == '[END WORDS]':
            state = None
        elif state == 'message':
            body.append(line)
        elif state == 'words' and line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            words[int(key)] = value
    return groups, words


def main():
    raw_bytes, raw = read_mkf(RAW / 'SSS.MKF')
    patch_bytes, patch = read_mkf(PATCH / 'Sss.mkf')
    before = list(struct.iter_unpack('<4H', raw[4]))
    after = list(struct.iter_unpack('<4H', patch[4]))
    regions = []
    for tag, a, b, c, d in difflib.SequenceMatcher(None, before, after, autojunk=False).get_opcodes():
        if tag == 'equal':
            continue
        regions.append({
            'region': len(regions) + 1, 'dispositionId': change_id(a), 'kind': tag,
            'rawRange': [a, b], 'patchRange': [c, d],
            'before': before[a:b], 'after': after[c:d],
        })
    scenes = list(struct.iter_unpack('<4H', raw[1]))
    fields = ['vanishTime', 'x', 'y', 'layer', 'triggerScript', 'autoScript', 'state',
              'triggerMode', 'spriteNum', 'nSpriteFrames', 'direction', 'currentFrameNum',
              'scriptIdleFrame', 'spritePtrOffset', 'nSpriteFramesAuto', 'scriptIdleFrameCountAuto']
    event_changes = []
    for i, (a, b) in enumerate(zip(struct.iter_unpack('<16H', raw[0]), struct.iter_unpack('<16H', patch[0]))):
        if a == b:
            continue
        event_changes.append({
            'eventIdZeroBased': i, 'eventIdOneBased': i + 1,
            'sceneIdZeroBased': next((j for j in range(len(scenes)-1) if scenes[j][3] <= i < scenes[j+1][3]), None),
            'dispositionId': {2984: 'D07', 4841: 'D10'}.get(i, 'UNCLASSIFIED'),
            'fields': [{'field': fields[k], 'before': x, 'after': y} for k, (x, y) in enumerate(zip(a, b)) if x != y],
        })
    groups, words = parse_slf(PATCH / 'm_eng.slf')
    keys = {(a, b) for a, b, _ in groups}
    native_ranges = []
    i = 0
    while i < len(before):
        if before[i][0] != 0xffff:
            i += 1
            continue
        start = last = before[i][1]
        j, beginning = i, True
        if j+1 < len(before) and before[j+1][0] == 0xffff and before[j+1][1] != last+1:
            j += 1
        else:
            while j < len(before) and ((before[j][0] == 0xffff and (beginning or before[j][1] == last+1)) or before[j][0] == 0x8e):
                if before[j][0] == 0xffff:
                    last = before[j][1]
                j += 1
                beginning = False
        native_ranges.append((start, last, i, j))
        i = j
    input_paths = [RAW / 'SSS.MKF', RAW / 'M.MSG', RAW / 'WORD.DAT',
                   PATCH / 'Sss.mkf', PATCH / 'M.msg', PATCH / 'Word.dat', PATCH / 'm_eng.slf',
                   ROOT / 'data/en/readme.txt']
    sources = [{'path': str(p.relative_to(ROOT)), 'bytes': p.stat().st_size, 'sha256': digest(p.read_bytes())} for p in input_paths]
    cjk = lambda text: any('\u4e00' <= ch <= '\u9fff' for ch in text)
    result = {
        'schemaVersion': 1, 'task': 'GAME-SCRIPT-CORRECTIONS-1', 'kind': 'read-only-binary-inventory',
        'baselineGit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
        'producer': str(Path(__file__).relative_to(ROOT)), 'sources': sources,
        'limits': ['Static binary inventory is not proof of a bug, author intent, original executable behavior, E2E, visual acceptance or coverage.',
                   'Patch-local raw/en inputs remain untracked and must be supplied separately to reproduce.'],
        'chunks': [{'chunk': i, 'same': a == b, 'beforeBytes': len(a), 'afterBytes': len(b),
                    'beforeSha256': digest(a), 'afterSha256': digest(b)} for i, (a, b) in enumerate(zip(raw, patch))],
        'scriptCounts': {'before': len(before), 'after': len(after), 'addedNet': len(after)-len(before),
                         'differentPositionsInSharedPrefix': sum(a != b for a, b in zip(before, after)), 'diffRegions': len(regions)},
        'regions': regions, 'eventObjectChanges': event_changes,
        'appendedBlockOwnership': [
            {'range': [43503, 43507], 'dispositionId': 'D10'},
            {'range': [43507, 43511], 'dispositionId': 'D07'},
            {'range': [43511, 43514], 'dispositionId': 'D04'},
            {'range': [43514, 43534], 'dispositionId': 'D05'},
            {'range': [43534, 43538], 'dispositionId': 'D08'},
        ],
        'language': {'groups': len(groups), 'nativeBlocks': len(native_ranges),
                     'matchingNativeRanges': sum((a, b) in keys for a, b, _, _ in native_ranges),
                     'nonmatchingNativeRanges': [{'messageRange': [a, b], 'scriptRange': [i, j]} for a, b, i, j in native_ranges if (a, b) not in keys],
                     'words': len(words), 'originalWordEntriesWithCjk': sum(k <= 564 and cjk(v) for k, v in words.items()),
                     'groupsContainingCjk': sum(cjk('\n'.join(ls)) for _, _, ls in groups)},
    }
    serialized = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
    if len(sys.argv) > 1:
        destination = Path(sys.argv[1]).resolve()
        if destination in [p.resolve() for p in input_paths]:
            raise ValueError('refuse to overwrite an input')
        destination.write_text(serialized)
    else:
        print(serialized, end='')
    print(json.dumps({'scriptCounts': result['scriptCounts'], 'objectChanges': len(event_changes),
                      'unclassifiedRegions': [r['region'] for r in regions if r['dispositionId'] == 'UNCLASSIFIED'],
                      'regionsByDisposition': dict(collections.Counter(r['dispositionId'] for r in regions))}, ensure_ascii=False), file=sys.stderr)


if __name__ == '__main__':
    main()
