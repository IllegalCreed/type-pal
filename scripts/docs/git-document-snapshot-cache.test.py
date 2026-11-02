"""Real Git oracles for the bounded immutable-source reader used by docs CLIs."""
import json
import base64
import hashlib
import os
from pathlib import Path
import shutil
import shlex
import subprocess
import tempfile
import unittest

MODULE = Path(__file__).resolve().with_name("git-document-snapshot.mjs")
NODE = shutil.which("node")
PRELUDE = """
import assert from 'node:assert/strict';
import {renameSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {cacheGitSnapshots, readGitDocumentSnapshot, createGitDocumentSnapshotReader} = await import(pathToFileURL(process.argv[1]));
const c = JSON.parse(process.argv[2]);
let calls = 0;
const indexed = createGitDocumentSnapshotReader(c.root);
const raw = (pin) => { calls++; return indexed(pin); };
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
        (self.root / "docs/large.json").write_bytes(b'{"larger":123456}\n')
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

    def commit_raw_docs_tree(self, entries):
        def run(args, data):
            return subprocess.check_output(
                ["git", "-C", str(self.root), *args], input=data,
                env=self.env, stderr=subprocess.PIPE,
            ).decode().strip()
        content = b"".join(b"100644 " + name + b"\0" + bytes.fromhex(oid) for name, oid in entries)
        # Only this owned corruption fixture bypasses Git's object-write checks.
        # Git 2.56 rejects duplicate tree entries before the readers can see them.
        docs = run(["hash-object", "--literally", "-w", "-t", "tree", "--stdin"], content)
        self.assertEqual(subprocess.check_output(
            ["git", "-C", str(self.root), "cat-file", "tree", docs],
            env=self.env, stderr=subprocess.PIPE,
        ), content)
        tree = run(["hash-object", "-w", "-t", "tree", "--stdin"], b"40000 docs\0" + bytes.fromhex(docs))
        return run(["commit-tree", tree], b"Owned malformed-tree boundary fixture\n")

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

    def test_unindexable_utf8_names_fall_back_without_aliasing_another_path(self):
        oid = self.git("rev-parse", self.revision + ":docs/one.json").strip()
        revision = self.commit_raw_docs_tree([(b"bad\xff.json", oid), (b"one.json", oid)])
        self.run_node("""
const read=createGitDocumentSnapshotReader(c.root);
const good={...one,revision:c.badTree};
assert.equal(read(good).buffer.toString(),'{"a":1}\\n');
assert.deepEqual(read(good),readGitDocumentSnapshot(c.root,good));
const aliased={...good,path:'docs/bad\\ufffd.json'};
assert.equal(read(aliased),undefined);assert.equal(readGitDocumentSnapshot(c.root,aliased),undefined);
console.log('{}');
""", badTree=revision)

    def test_duplicate_tree_entries_cannot_become_one_indexed_success(self):
        oid1 = self.git("rev-parse", self.revision + ":docs/one.json").strip()
        oid2 = self.git("rev-parse", self.revision + ":docs/two.json").strip()
        revision = self.commit_raw_docs_tree([(b"one.json", oid1), (b"one.json", oid2)])
        self.run_node("""
const pin={...one,revision:c.badTree};
assert.equal(createGitDocumentSnapshotReader(c.root)(pin),undefined);
assert.equal(readGitDocumentSnapshot(c.root,pin),undefined);
console.log('{}');
""", badTree=revision)

    def test_unicode_line_separator_paths_keep_the_original_reader_rejection(self):
        for marker in ["\u2028", "\u2029"]:
            (self.root / "docs" / ("line" + marker + ".json")).write_bytes(b'{}\n')
        self.git("add", "docs")
        self.git("commit", "--no-gpg-sign", "-qm", "owned original path-domain boundary")
        revision = self.git("rev-parse", "HEAD").strip()
        self.run_node("""
const read=createGitDocumentSnapshotReader(c.root);
for(const path of ['docs/line\\u2028.json','docs/line\\u2029.json']){
 const pin={path,revision:c.separators};
 assert.equal(readGitDocumentSnapshot(c.root,pin),undefined);
 assert.equal(read(pin),undefined);
}
console.log('{}');
""", separators=revision)

    def test_real_git_trace_indexes_a_commit_once_but_reads_every_requested_blob(self):
        binary = self.root / "trace-bin"
        binary.mkdir()
        trace = self.root / "git-command-trace"
        real_git = shutil.which("git", path=self.env["PATH"])
        wrapper = binary / "git"
        wrapper.write_text("#!/bin/sh\nprintf '%s\\n' \"$1:$2\" >> " + shlex.quote(str(trace)) +
                           "\nexec " + shlex.quote(real_git) + " \"$@\"\n")
        wrapper.chmod(0o755)
        self.env["PATH"] = str(binary) + os.pathsep + self.env["PATH"]
        self.run_node("""
assert.equal(indexed(one).buffer.toString(),'{"a":1}\\n');
assert.equal(indexed(two).buffer.toString(),'{"b":2}\\n');
assert.equal(indexed(one).buffer.toString(),'{"a":1}\\n');
console.log('{}');
""")
        self.assertEqual(trace.read_text().splitlines(),
                         ["cat-file:-t", "ls-tree:-r", "cat-file:blob", "cat-file:blob", "cat-file:blob"])

    def test_payload_budget_keeps_recent_sources_and_revalidates_evicted_sources(self):
        result = self.run_node("""
const read = cacheGitSnapshots(raw, 8);
for(const pin of [one,one,two,two]) assert.equal(read(pin).mode,'100644');
assert.equal(calls,2);
assert.equal(read(one).buffer.toString(),'{"a":1}\\n');
console.log(JSON.stringify({calls}));
""")
        self.assertEqual(result, {"calls": 3})

    def test_oversized_payloads_and_disabled_cache_keep_the_original_reader(self):
        result = self.run_node("""
const read = cacheGitSnapshots(raw, 8);
assert.equal(read(one).buffer.toString(),'{"a":1}\\n');
const large={...one,path:'docs/large.json'};
for(let i=0;i<2;i++)assert.equal(read(large).buffer.toString(),'{"larger":123456}\\n');
assert.equal(read(one).buffer.toString(),'{"a":1}\\n');
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


class FixedIncrementalPool(unittest.TestCase):
    def setUp(self):
        self.root = MODULE.parents[2]
        admission = (MODULE.parent / "incremental-review-admission.mjs").read_text()
        import re
        self.revision = re.search(r"sourceRevision: '([a-f0-9]{40})'", admission)[1]
        self.pins = []
        self.expected = []
        for path in ["docs/README.md", "docs/phase-governance/templates/registry.json", "docs/ops/README.md"]:
            raw = subprocess.check_output(["git", "show", self.revision + ":" + path], cwd=self.root)
            oid = subprocess.check_output(["git", "rev-parse", self.revision + ":" + path], cwd=self.root, text=True).strip()
            self.pins.append({"path": path, "revision": self.revision, "gitObject": oid,
                              "sha256": hashlib.sha256(raw).hexdigest()})
            self.expected.append(base64.b64encode(raw).decode())

    def run_node(self, body):
        context = {"root": str(self.root), "pins": self.pins, "expected": self.expected}
        prelude = """
import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
const c=JSON.parse(process.argv[2]);
const {createIncrementalGitSourceReader}=await import(pathToFileURL(process.argv[1]));
"""
        run = subprocess.run([NODE, "--input-type=module", "-e", prelude + body,
                              str(MODULE.with_name("incremental-git-source.mjs")), json.dumps(context)],
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertEqual(run.stderr, "")

    def test_real_fixed_git_pool_preserves_bytes_identity_isolation_and_unknown_path_fallback(self):
        self.run_node("""
let calls=0;const read=createIncrementalGitSourceReader(c.root,()=>{calls++;return c.pins.slice(0,2)});
assert.equal(read({...c.pins[0],revision:'0'.repeat(40)}),undefined);assert.equal(calls,0);
for(let i=0;i<3;i++){
 const pin=c.pins[i],actual=read(pin);
 assert.equal(actual.path,pin.path);assert.equal(actual.revision,pin.revision);
 assert.equal(actual.mode,'100644');assert.equal(actual.gitObject,pin.gitObject);
 assert.deepEqual(actual.buffer,Buffer.from(c.expected[i],'base64'));
 actual.buffer.fill(0);actual.path='poison';
 assert.deepEqual(read(pin).buffer,Buffer.from(c.expected[i],'base64'));
}
assert.equal(calls,1);
assert.equal(read({path:'docs/not-an-admitted-or-existing-file.json',revision:c.pins[0].revision}),undefined);
""")

    def test_a_corrupt_or_out_of_revision_pool_cannot_become_a_successful_source(self):
        self.run_node("""
const badSha=createIncrementalGitSourceReader(c.root,()=>[{...c.pins[0],sha256:'0'.repeat(64)}]);
assert.throws(()=>badSha(c.pins[0]),/fixed source SHA256 differs/);
const badRevision=createIncrementalGitSourceReader(c.root,()=>[{...c.pins[0],revision:'0'.repeat(40)}]);
assert.throws(()=>badRevision(c.pins[0]),/bounded fixed-main source pool required/);
const oversized=createIncrementalGitSourceReader(c.root,()=>Array(1917).fill(c.pins[0]));
assert.throws(()=>oversized(c.pins[0]),/bounded fixed-main source pool required/);
const noPool=createIncrementalGitSourceReader(c.root,()=>undefined);
assert.deepEqual(noPool(c.pins[0]).buffer,Buffer.from(c.expected[0],'base64'));
""")


if __name__ == "__main__":
    unittest.main()
