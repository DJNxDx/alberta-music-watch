#!/usr/bin/env python3
"""Exercise audit Git recovery in disposable local repositories, without network."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


SCRIPTS = Path(__file__).resolve().parent


class AuditSyncTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="amw-sync-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.repo = self.root / "checkout"
        self.origin = self.root / "origin.git"
        self.env = dict(os.environ, GIT_AUTHOR_NAME="Audit test",
                        GIT_AUTHOR_EMAIL="audit@example.invalid",
                        GIT_COMMITTER_NAME="Audit test",
                        GIT_COMMITTER_EMAIL="audit@example.invalid",
                        GIT_CONFIG_NOSYSTEM="1", GIT_CONFIG_GLOBAL=os.devnull,
                        GIT_TERMINAL_PROMPT="0")
        self.repo.mkdir()
        self.git("init", "-b", "main")
        (self.repo / "scripts").mkdir()
        for name in ("sync-audit-main.sh", "clean-git-icon-refs.sh"):
            shutil.copyfile(SCRIPTS / name, self.repo / "scripts" / name)
        (self.repo / "data.txt").write_text("baseline\n")
        self.git("add", ".")
        self.git("commit", "-m", "baseline")
        self.git("init", "--bare", "-b", "main", str(self.origin))
        self.git("remote", "add", "origin", str(self.origin))
        self.git("push", "-u", "origin", "main")
        self.baseline = self.git("rev-parse", "HEAD")

    def run_command(self, *args, cwd=None, check=True):
        return subprocess.run(args, cwd=cwd or self.repo, env=self.env,
                              text=True, stdout=subprocess.PIPE,
                              stderr=subprocess.STDOUT, check=check)

    def git(self, *args, cwd=None):
        return self.run_command("git", *args, cwd=cwd).stdout.strip()

    def sync(self):
        return self.run_command("bash", "scripts/sync-audit-main.sh", check=False)

    def remote_commit(self, content=None):
        writer = self.root / "writer"
        self.git("clone", str(self.origin), str(writer))
        if content is not None:
            (writer / "data.txt").write_text(content)
            self.git("add", "data.txt", cwd=writer)
        self.git("commit", "--allow-empty", "-m", "remote update", cwd=writer)
        self.git("push", "origin", "main", cwd=writer)
        return self.git("rev-parse", "HEAD", cwd=writer)

    def test_fast_forward_and_repeat(self):
        remote = self.remote_commit("published update\n")
        for _ in range(2):
            result = self.sync()
            self.assertEqual(result.returncode, 0, result.stdout)
            self.assertEqual(self.git("rev-parse", "HEAD"), remote)
        self.assertEqual((self.repo / "data.txt").read_text(), "published update\n")

    def test_identical_trees_preserve_old_history(self):
        self.git("commit", "--allow-empty", "-m", "local duplicate history")
        old = self.git("rev-parse", "HEAD")
        remote = self.remote_commit()
        self.git("branch", "pending-audit")
        result = self.sync()
        self.assertEqual(result.returncode, 0, result.stdout)
        self.assertEqual(self.git("rev-parse", "HEAD"), remote)
        backups = self.git("for-each-ref", "--format=%(objectname)", "refs/heads/backup/")
        self.assertEqual(backups, old)
        self.assertEqual(self.git("rev-parse", "pending-audit"), old)

    def test_different_trees_do_not_reset(self):
        self.git("commit", "--allow-empty", "-m", "local history")
        old = self.git("rev-parse", "HEAD")
        self.remote_commit("different remote contents\n")
        result = self.sync()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("File trees differ", result.stdout)
        self.assertEqual(self.git("rev-parse", "HEAD"), old)
        self.assertEqual((self.repo / "data.txt").read_text(), "baseline\n")

    def test_dirty_worktree_is_preserved(self):
        (self.repo / "data.txt").write_text("unfinished work\n")
        result = self.sync()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("uncommitted", result.stdout)
        self.assertEqual(self.git("rev-parse", "HEAD"), self.baseline)
        self.assertEqual((self.repo / "data.txt").read_text(), "unfinished work\n")

    def test_failed_fetch_never_uses_stale_origin(self):
        self.git("commit", "--allow-empty", "-m", "local history")
        old = self.git("rev-parse", "HEAD")
        self.origin.rename(self.root / "offline.git")
        result = self.sync()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.git("rev-parse", "HEAD"), old)
        self.assertEqual(self.git("for-each-ref", "refs/heads/backup/"), "")

    def test_cleanup_exact_scope_and_nonempty_protection(self):
        refs = self.repo / ".git" / "refs"
        artifacts = [refs / "Icon\r", refs / "tags" / "Icon\r",
                     refs / "codex" / "nested" / "Icon\r"]
        for path in artifacts:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.touch()
        outside = self.repo / ".git" / "Icon\r"
        outside.touch()
        real_ref = refs / "heads" / "main"
        before = real_ref.read_bytes()
        result = self.sync()
        self.assertEqual(result.returncode, 0, result.stdout)
        self.assertTrue(all(not path.exists() for path in artifacts))
        self.assertTrue(outside.exists())
        self.assertEqual(real_ref.read_bytes(), before)
        bad = refs / "tags" / "Icon\r"
        bad.write_text("preserve this nonempty file\n")
        result = self.run_command("bash", "scripts/clean-git-icon-refs.sh", check=False)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(bad.read_text(), "preserve this nonempty file\n")
        bad.unlink()
        bad.symlink_to(outside)
        self.run_command("bash", "scripts/clean-git-icon-refs.sh")
        self.assertTrue(bad.is_symlink())
        self.assertTrue(outside.exists())


if __name__ == "__main__":
    unittest.main(verbosity=2)
