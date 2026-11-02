"""Restore retained bytes only. No execution, extraction scripts or new acceptance."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
import shlex
import subprocess
import sys
import tarfile
import threading
import time
import uuid

REPOSITORY = "github.com/IllegalCreed/type-pal"
TAG = "evidence-e2e006-20261027"
ASSET = "e2e006-20261027.tar.gz"
ARCHIVE_PATH = "build/evidence-archive/e2e006-20261027/" + ASSET
DESCRIPTORS_SHA256 = "d79a29113da7fde5bbdaa290267cb34694d628666f8a5611ac68c9d45748529a"
LOCK = ".e2e-evidence-restore.lock"
CHUNK = 1024 * 1024
CHECK_COMMANDS = (
    "pnpm test:docs-tools",
    "node scripts/docs/check.mjs",
    "node scripts/docs/check-document-model.mjs",
    "pnpm check:testing-docs",
    "node scripts/docs/check-phase-lore-governance.mjs",
    "node scripts/docs/check-content-review.mjs --strict",
    "node scripts/docs/report-governance-progress.mjs",
)
CI_STAGES = ("tools", "structure", "completeness", "all")
DOCS_TEST_SCRIPT = "node --test scripts/docs/*.test.mjs"


def demand(ok, message):
    if not ok:
        raise ValueError(message)


def components(path):
    demand(isinstance(path, str) and path.startswith("build/"), "build artifact required")
    parts = path.split("/")
    demand(all(p not in ("", ".", "..") for p in parts), "unsafe artifact component")
    demand("\\" not in path and not any(ord(c) < 32 for c in path), "unsafe artifact name")
    return parts


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        demand(key not in result, "duplicate JSON field")
        result[key] = value
    return result


def contract(root):
    raw = (root / "docs/testing/e2e/evidence/e2e-006-current.json").read_text(encoding="utf8")
    data = json.loads(raw, object_pairs_hook=unique_object,
                      parse_constant=lambda value: demand(False, "nonfinite JSON: " + value))
    entries = data["artifacts"]
    digest = hashlib.sha256(json.dumps(entries, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    demand(len(entries) == 8 and digest == DESCRIPTORS_SHA256, "frozen eight-artifact contract changed")
    return entries


class Tree:
    """All publication uses directory FDs; parent symlinks cannot redirect IO."""
    def __init__(self, root):
        self.root = root.resolve(strict=True)
        self.fd = os.open(self.root, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)

    def close(self):
        os.close(self.fd)

    def directory(self, parts, create=False):
        fd = os.dup(self.fd)
        try:
            for part in parts:
                demand(part not in ("", ".", "..") and "/" not in part, "bad directory component")
                if create:
                    try:
                        os.mkdir(part, 0o755, dir_fd=fd)
                    except FileExistsError:
                        pass
                child = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
                os.close(fd)
                fd = child
            return fd
        except BaseException:
            os.close(fd)
            raise

    def artifact(self, entry):
        parts = components(entry["path"])
        try:
            parent = self.directory(parts[:-1])
        except FileNotFoundError:
            return False
        try:
            try:
                fd = os.open(parts[-1], os.O_RDONLY | os.O_NOFOLLOW, dir_fd=parent)
            except FileNotFoundError:
                return False
            try:
                verify_fd(fd, entry)
            finally:
                os.close(fd)
            return True
        finally:
            os.close(parent)


def identity(st):
    return (st.st_dev, st.st_ino, st.st_mode, st.st_size, st.st_mtime_ns, st.st_ctime_ns)


def verify_fd(fd, entry):
    before = os.fstat(fd)
    demand(stat.S_ISREG(before.st_mode) and before.st_size == entry["bytes"], "artifact type/size differs")
    digest = hashlib.sha256()
    os.lseek(fd, 0, os.SEEK_SET)
    while True:
        chunk = os.read(fd, CHUNK)
        if not chunk:
            break
        digest.update(chunk)
    demand(identity(before) == identity(os.fstat(fd)), "artifact changed while reading")
    demand(digest.hexdigest() == entry["sha256"], "artifact SHA256 differs: " + entry["path"])


def write_all(fd, data):
    remaining = memoryview(data)
    while remaining:
        count = os.write(fd, remaining)
        demand(count > 0, "short artifact write")
        remaining = remaining[count:]


def exists(fd, name):
    try:
        os.stat(name, dir_fd=fd, follow_symlinks=False)
        return True
    except FileNotFoundError:
        return False


def save_recovery(fd, recovery):
    temporary = "recovery-" + uuid.uuid4().hex
    output = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=fd)
    try:
        write_all(output, (json.dumps(recovery, sort_keys=True) + "\n").encode())
        os.fsync(output)
    finally:
        os.close(output)
    os.replace(temporary, "recovery.json", src_dir_fd=fd, dst_dir_fd=fd)


def fetch_archive(stage, target, entry, local):
    output = os.open(target, os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=stage)
    try:
        if local:
            source = os.open(local, os.O_RDONLY | os.O_NOFOLLOW)
            try:
                verify_fd(source, entry)
                os.lseek(source, 0, os.SEEK_SET)
                while True:
                    chunk = os.read(source, CHUNK)
                    if not chunk:
                        break
                    write_all(output, chunk)
                verify_fd(source, entry)
            finally:
                os.close(source)
        else:
            error_fd = os.open("download.stderr", os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=stage)
            try:
                process = subprocess.Popen(["gh", "release", "download", TAG, "--repo", REPOSITORY,
                                            "--pattern", ASSET, "--output", "-"],
                                           stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=error_fd)
                started = time.monotonic()
                activity, killed = [started], []
                stop = threading.Event()

                def watch():
                    while not stop.wait(1):
                        now = time.monotonic()
                        if now - activity[0] > 45 or now - started > 900:
                            killed.append("idle45s" if now - activity[0] > 45 else "total900s")
                            process.kill()
                            return

                watchdog = threading.Thread(target=watch, daemon=True)
                watchdog.start()
                try:
                    size = 0
                    while True:
                        chunk = os.read(process.stdout.fileno(), CHUNK)
                        if not chunk:
                            break
                        size += len(chunk)
                        activity[0] = time.monotonic()
                        demand(size <= entry["bytes"], "release download exceeds frozen size")
                        write_all(output, chunk)
                    status = process.wait()
                    # CI logs are the durable failure stream; a runner's local
                    # staging directory alone is not permanent evidence.
                    os.lseek(error_fd, 0, os.SEEK_SET)
                    while True:
                        diagnostic = os.read(error_fd, CHUNK)
                        if not diagnostic:
                            break
                        sys.stderr.buffer.write(diagnostic)
                    sys.stderr.flush()
                    demand(status == 0, "release download failed; exit=%s received=%s watchdog=%s; original stderr retained" % (status, size, killed))
                finally:
                    stop.set()
                    watchdog.join()
                    if process.poll() is None:
                        process.kill()
                    process.wait()
                    process.stdout.close()
            finally:
                os.close(error_fd)
        os.fsync(output)
        verify_fd(output, entry)  # Authenticate the entire compressed input BEFORE parsing.
        return output
    except BaseException:
        os.close(output)
        raise


def unpack_declared(stage, archive_fd, entries, archive_entry):
    wanted = {"recording/" + row["path"]: (index, row)
              for index, row in enumerate(entries) if row != archive_entry}
    found, names = {}, set()
    declared_bytes = 0
    os.lseek(archive_fd, 0, os.SEEK_SET)
    with os.fdopen(os.dup(archive_fd), "rb") as raw, tarfile.open(fileobj=raw, mode="r|gz") as archive:
        for member in archive:
            name = member.name
            parts = name.rstrip("/").split("/")
            demand(not name.startswith("/") and "\\" not in name and
                   all(p not in ("", ".", "..") for p in parts), "unsafe tar member")
            demand(name not in names and len(names) < 1000, "duplicate/excess tar members")
            names.add(name)
            demand(member.isfile() or member.isdir(), "tar link/device/special member rejected")
            declared_bytes += member.size
            demand(0 <= member.size and declared_bytes <= 2_000_000_000, "tar expansion exceeds bound")
            if name not in wanted:
                continue
            index, entry = wanted[name]
            demand(member.isfile() and member.size == entry["bytes"], "declared tar artifact size/type differs")
            key = "entry-" + str(index)
            output = os.open(key, os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=stage)
            try:
                with archive.extractfile(member) as source:
                    while True:
                        chunk = source.read(CHUNK)
                        if not chunk:
                            break
                        write_all(output, chunk)
                os.fsync(output)
                verify_fd(output, entry)
            finally:
                os.close(output)
            found[entry["path"]] = key
    demand(len(found) == len(wanted), "required tar artifacts missing")
    return found


def restore_set(root, entries, archive_path=ARCHIVE_PATH, local=None):
    """Bounded IO primitive. CLI supplies only the frozen native descriptor set."""
    demand(len(entries) >= 2 and len({row["path"] for row in entries}) == len(entries), "distinct artifact set required")
    for entry in entries:
        components(entry["path"])
        demand(type(entry["bytes"]) is int and 0 <= entry["bytes"] <= 200_000_000 and
               len(entry["sha256"]) == 64 and all(c in "0123456789abcdef" for c in entry["sha256"]), "invalid artifact descriptor")
    archive_entry = next(row for row in entries if row["path"] == archive_path)
    tree = Tree(Path(root))
    build = stage = lock_fd = archive_fd = None
    lock_released = False
    stage_name = ".e2e-evidence-restore-" + uuid.uuid4().hex
    recovery = {"state": "staging", "installed": [], "archiveSha256": archive_entry["sha256"], "stage": stage_name}
    try:
        try:
            build = tree.directory(["build"])
            demand(not exists(build, LOCK), "active evidence restore lock")
        except FileNotFoundError:
            pass
        present = sum(tree.artifact(entry) for entry in entries)
        if present == len(entries):
            demand(build is not None and not exists(build, LOCK), "active evidence restore lock")
            return {"mode": "already-restored", "verified": present, "written": 0, "runtimeCredit": 0}
        if build is None:
            build = tree.directory(["build"], create=True)
        lock_fd = os.open(LOCK, os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=build)
        lock_bytes = (json.dumps(recovery, sort_keys=True) + "\n").encode()
        write_all(lock_fd, lock_bytes)
        os.fsync(lock_fd)
        lock_identity = identity(os.fstat(lock_fd))
        os.mkdir(stage_name, 0o700, dir_fd=build)
        stage = os.open(stage_name, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=build)
        save_recovery(stage, recovery)
        archive_fd = fetch_archive(stage, "archive", archive_entry, local)
        staged = unpack_declared(stage, archive_fd, entries, archive_entry)
        staged[archive_path] = "archive"
        for entry in entries:
            check = os.open(staged[entry["path"]], os.O_RDONLY | os.O_NOFOLLOW, dir_fd=stage)
            try:
                verify_fd(check, entry)
            finally:
                os.close(check)
        recovery["state"] = "installing"
        save_recovery(stage, recovery)
        for entry in entries:
            if tree.artifact(entry):
                continue
            parts = components(entry["path"])
            parent = tree.directory(parts[:-1], create=True)
            try:
                try:
                    os.link(staged[entry["path"]], parts[-1], src_dir_fd=stage, dst_dir_fd=parent, follow_symlinks=False)
                except FileExistsError:
                    demand(tree.artifact(entry), "target appeared with invalid bytes")
                    continue
                recovery["installed"].append(entry["path"])
                save_recovery(stage, recovery)
                os.fsync(parent)
            finally:
                os.close(parent)
        demand(all(tree.artifact(entry) for entry in entries), "final artifact set incomplete")
        recovery["state"] = "verified"
        save_recovery(stage, recovery)
        current_build = tree.directory(["build"])
        try:
            demand(os.fstat(current_build).st_ino == os.fstat(build).st_ino and
                   os.fstat(current_build).st_dev == os.fstat(build).st_dev, "build parent replaced")
        finally:
            os.close(current_build)
        demand(identity(os.stat(LOCK, dir_fd=build, follow_symlinks=False)) == lock_identity, "restore lock changed")
        expected_stage = set(staged.values()) | {"recovery.json"} | ({"download.stderr"} if local is None else set())
        demand(set(os.listdir(stage)) == expected_stage, "unknown staged member; cleanup refused")
        os.unlink(LOCK, dir_fd=build)
        lock_released = True
        os.fsync(build)
        for name in os.listdir(stage):
            demand(stat.S_ISREG(os.stat(name, dir_fd=stage, follow_symlinks=False).st_mode), "unexpected staged cleanup member")
            os.unlink(name, dir_fd=stage)
        os.rmdir(stage_name, dir_fd=build)
        return {"mode": "restored", "verified": len(entries), "written": len(recovery["installed"]), "runtimeCredit": 0}
    except BaseException as error:
        detail = {"stage": stage_name if stage is not None else None,
                  "ownedLockRetained": lock_fd is not None and not lock_released,
                  "lockReleased": lock_released, "error": str(error)}
        raise ValueError("evidence restore failed: " + json.dumps(detail, sort_keys=True)) from error
    finally:
        for fd in (archive_fd, stage, lock_fd, build):
            if fd is not None:
                os.close(fd)
        tree.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--archive", type=Path)
    parser.add_argument("--ci-stage", choices=CI_STAGES)
    args = parser.parse_args()
    commands = None
    if args.ci_stage:
        package = json.loads((args.root / "package.json").read_text(encoding="utf8"))
        commands = ci_commands(package["scripts"], args.ci_stage, args.root)
    result = restore_set(args.root, contract(args.root), local=args.archive)
    print(json.dumps(result, sort_keys=True), flush=True)
    if commands is not None:
        run_ci_commands(args.root, commands, args.ci_stage)
        print(json.dumps({"ciStage": args.ci_stage, "status": "passed", "newRuntimeCredit": 0}), flush=True)


def ci_commands(scripts, stage, root=None):
    """Refuse an unassigned gate when check:docs changes; never silently omit it."""
    demand(scripts.get("check:docs") == " && ".join(CHECK_COMMANDS), "documentation command graph changed; explicit stage ownership required")
    demand(stage in CI_STAGES, "unknown documentation CI stage")
    if stage == "all":
        demand(scripts.get("test:docs-tools") == DOCS_TEST_SCRIPT, "documentation test command changed; explicit ownership required")
        demand(root is not None and any(root.glob("scripts/docs/*.test.mjs")), "complete nonempty documentation test inventory required")
        commands = [shlex.split(command) for command in CHECK_COMMANDS]
        commands[-1].append("--require-complete")
        return commands + [["python3", "-B", "scripts/docs/git-document-snapshot-cache.test.py"],
                           ["python3", "-B", "scripts/docs/documentation-ci-plan.test.py"], ["pnpm", "lint"]]
    selected = {"tools": CHECK_COMMANDS[:1], "structure": CHECK_COMMANDS[1:5],
                "completeness": CHECK_COMMANDS[5:]}[stage]
    commands = [shlex.split(command) for command in selected]
    if stage == "tools":
        commands.append(["pnpm", "lint"])
    if stage == "completeness":
        commands[-1].extend(["--json", "--require-complete"])
    return commands


def run_ci_commands(root, commands, stage="all"):
    """One environment and evidence restore; any assigned gate failure aborts the job."""
    for command in commands:
        print(json.dumps({"ciStage": stage, "argv": command}), flush=True)
        completed = subprocess.run(command, cwd=root, check=False)
        demand(completed.returncode == 0, "documentation CI child failed with exit " + str(completed.returncode))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
