from __future__ import annotations

from pathlib import Path
import shutil
import subprocess

from .config import Settings
from .store import copy_static_site


def run(cmd: list[str], cwd: Path) -> None:
    subprocess.run(cmd, cwd=str(cwd), check=True)


def publish(settings: Settings) -> None:
    if not settings.publish_remote_url:
        raise ValueError("PUBLISH_REMOTE_URL is required when publishing")

    work_dir = settings.data_dir / "publish-work"
    site_dir = work_dir / "site"
    if work_dir.exists():
        shutil.rmtree(work_dir)
    work_dir.mkdir(parents=True)
    copy_static_site(settings.web_dir, site_dir)

    if settings.gh_preflight and shutil.which("gh"):
        subprocess.run(["gh", "auth", "status"], cwd=str(site_dir), check=False)

    run(["git", "init"], site_dir)
    run(["git", "checkout", "-B", settings.publication_branch], site_dir)
    run(["git", "config", "user.name", settings.git_author_name], site_dir)
    run(["git", "config", "user.email", settings.git_author_email], site_dir)
    run(["git", "remote", "add", "origin", settings.publish_remote_url], site_dir)
    run(["git", "add", "."], site_dir)
    run(
        [
            "git",
            "commit",
            "--allow-empty",
            "-m",
            "Publish directory nodes monitor snapshot",
        ],
        site_dir,
    )
    run(
        [
            "git",
            "push",
            "--force",
            "origin",
            f"HEAD:{settings.publication_branch}",
        ],
        site_dir,
    )
