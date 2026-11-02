"""Real Git oracles for the bounded immutable-source reader used by docs CLIs."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

MODULE = Path(__file__).resolve().with_name("git-document-snapshot.mjs")
NODE = shutil.which("node")
PRELUDE = """
import assert from 'node:assert/strict';
import {renameSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {cacheGitSnapshots, readGitDocumentSnapshot} = await import(pathToFileURL(process.argv[1]));
const c = JSON.parse(process.argv[2]);
let calls = 0;
const raw = (pin) => { calls++; return readGitDocumentSnapshot(c.root, pin); };
const one = {revision:c.revision,path:'docs/one.json'};
const two = {revision:c.revision,path:'docs/two.json'};
"""


class SnapshotCache(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="docs-source-cache-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.env = {k: v for k, v in os.environ.items() if not k.startswith("GIT_")}
        self.env.update(GIT_CONFIG_NOSYSTEM="1", GIT_CONFIG_GLOBAL="/dev/null")
        self.git("init", "-q")
        self.git("config", "user.name", "Owned source snapshot test")
        self.git("config", "user.email", "fixture@example.invalid")
        (self.root / "docs").mkdir()
        (self.root / "docs/one.json").write_bytes(b'{"a":1}\n')
        (self.root / "docs/two.json").write_bytes(b'{"b":2}\n')
        executable = self.root / "docs/run.json"
        executable.write_bytes(b'{}\n')
        executable.chmod(0o755)
        (self.root / "docs/link.json").symlink_to("one.json")
        self.git("add", "docs")
        self.git("commit", "--no-gpg-sign", "-qm", "owned immutable source")
        self.revision = self.git("rev-parse", "HEAD").strip()

    def git(self, *args):
        return subprocess.check_output(
            ["git", "-c", "core.hooksPath=/dev/null", "-C", str(self.root), *args],
            env=self.env, text=True, stderr=subprocess.PIPE,
        )

    def run_node(self, body, **extra):
        context = {"root": str(self.root), "revision": self.revision, **extra}
        run = subprocess.run(
            [NODE, "--input-type=module", "-e", PRELUDE + body, str(MODULE), json.dumps(context)],
            env=self.env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
        )
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertEqual(run.stderr, "")
        return json.loads(run.stdout)

    def test_real_source_is_reused_and_returned_metadata_and_bytes_are_independent(self):
        result = self.run_node("""
const read = cacheGitSnapshots(raw);
const first = read(one);
assert.equal(first.buffer.toString(), '{"a":1}\\n');
assert.equal(first.gitObject, c.object);
first.buffer.fill(0); first.path = 'poison'; first.gitObject = '0'.repeat(40);
const next = read({...one});
assert.equal(next.buffer.toString(), '{"a":1}\\n');
assert.equal(next.path, one.path); assert.equal(next.gitObject, c.object);
console.log(JSON.stringify({calls,bytes:next.buffer.toString()}));
""", object=self.git("rev-parse", self.revision + ":docs/one.json").strip())
        self.assertEqual(result, {"calls": 1, "bytes": '{"a":1}\n'})

    def test_different_commits_and_paths_keep_their_exact_frozen_bytes(self):
        (self.root / "docs/one.json").write_bytes(b'{"a":3}\n')
        self.git("add", "docs/one.json")
        self.git("commit", "--no-gpg-sign", "-qm", "different source revision")
        revision2 = self.git("rev-parse", "HEAD").strip()
        (self.root / "docs/one.json").write_bytes(b'{"a":99}\n')
        result = self.run_node("""
const read = cacheGitSnapshots(raw);
const values = [read(one), read({...one,revision:c.revision2}), read(two)];
console.log(JSON.stringify({calls,values:values.map(v=>v.buffer.toString())}));
""", revision2=revision2)
        self.assertEqual(result, {"calls": 3, "values": ['{"a":1}\n', '{"a":3}\n', '{"b":2}\n']})

    def test_a_missing_real_object_is_not_cached_as_a_permanent_miss(self):
        oid = self.git("rev-parse", self.revision + ":docs/two.json").strip()
        blob = self.root / ".git/objects" / oid[:2] / oid[2:]
        backup = self.root / "owned-object-backup"
        blob.rename(backup)
        result = self.run_node("""
const read = cacheGitSnapshots(raw);
assert.equal(read(two), undefined);
renameSync(c.backup, c.blob);
assert.equal(read(two).buffer.toString(), '{"b":2}\\n');
assert.equal(read(two).buffer.toString(), '{"b":2}\\n');
console.log(JSON.stringify({calls}));
""", blob=str(blob), backup=str(backup))
        self.assertEqual(result, {"calls": 2})

    def test_tags_executable_symlink_and_invalid_pins_keep_original_rejection(self):
        self.git("tag", "-a", "owned-tag", "-m", "not a commit pin")
        result = self.run_node("""
const read = cacheGitSnapshots(raw);
assert.equal(read(one).buffer.toString(), '{"a":1}\\n');
const bad = [{...one,revision:c.tag},{...one,path:'docs/run.json'},
 {...one,path:'docs/link.json'},{...one,path:'../one.json'},
 {...one,revision:'0'.repeat(40)},null,{...one,revision:Object(c.revision)}];
for(const pin of bad){assert.equal(read(pin),undefined);assert.equal(read(pin),undefined);}
console.log(JSON.stringify({calls}));
""", tag=self.git("rev-parse", "owned-tag").strip())
        self.assertEqual(result, {"calls": 15})

    def test_payload_budget_falls_back_to_the_real_reader_without_dropping_validation(self):
        result = self.run_node("""
const read = cacheGitSnapshots(raw, 8);
for(const pin of [one,one,two,two]) assert.equal(read(pin).mode,'100644');
assert.equal(calls,3);
const disabled = cacheGitSnapshots(raw,0);
assert.equal(disabled(one).buffer.toString(),'{"a":1}\\n'); disabled(one);
console.log(JSON.stringify({calls}));
""")
        self.assertEqual(result, {"calls": 5})

    def test_independent_reader_instances_do_not_share_sources_between_repositories(self):
        other = self.root / "other-repository"
        other.mkdir()
        subprocess.run(["git", "init", "-q", str(other)], env=self.env, check=True)
        result = self.run_node("""
const first = cacheGitSnapshots(raw); assert.equal(first(one).buffer.toString(),'{"a":1}\\n');
let otherCalls=0;
const second=cacheGitSnapshots(pin=>{otherCalls++;return readGitDocumentSnapshot(c.other,pin);});
assert.equal(second(one),undefined);assert.equal(second(one),undefined);
assert.equal(first(one).buffer.toString(),'{"a":1}\\n');
console.log(JSON.stringify({calls,otherCalls}));
""", other=str(other))
        self.assertEqual(result, {"calls": 1, "otherCalls": 2})


class CacheConfiguration(unittest.TestCase):
    def test_invalid_readers_or_budgets_reject_before_any_read(self):
        run = subprocess.run([NODE, "--input-type=module", "-e", """
import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
const {cacheGitSnapshots}=await import(pathToFileURL(process.argv[1]));
let calls=0;const read=()=>{calls++;};
for(const limit of [-1,1.5,NaN,Infinity,32*1024*1024+1])assert.throws(()=>cacheGitSnapshots(read,limit),TypeError);
assert.throws(()=>cacheGitSnapshots(null),TypeError);assert.equal(calls,0);
""", str(MODULE)], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertEqual(run.stderr, "")


if __name__ == "__main__":
    unittest.main()
