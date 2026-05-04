from __future__ import annotations

import os
import re
import subprocess
from pathlib import Path
from typing import Mapping


ROOT = Path(__file__).resolve().parents[1]


class PublicUrlError(RuntimeError):
    """Raised when a public URL cannot be resolved."""


def normalize_public_url(url: str) -> str:
    cleaned = url.strip()
    if not cleaned:
        raise PublicUrlError("PUBLIC_URL が空です。公開URLを指定してください。")
    if not re.match(r"^https?://", cleaned):
        raise PublicUrlError("PUBLIC_URL は http:// または https:// から始めてください。")
    return cleaned.rstrip("/") + "/"


def parse_github_remote(remote_url: str) -> tuple[str, str] | None:
    cleaned = remote_url.strip()
    patterns = (
        r"^https://github\.com/([^/\s]+)/([^/\s]+?)(?:\.git)?/?$",
        r"^git@github\.com:([^/\s]+)/([^/\s]+?)(?:\.git)?$",
        r"^ssh://git@github\.com/([^/\s]+)/([^/\s]+?)(?:\.git)?/?$",
    )
    for pattern in patterns:
        match = re.match(pattern, cleaned)
        if match:
            owner, repo = match.groups()
            return owner, repo
    return None


def get_origin_remote(root: Path = ROOT) -> str:
    result = subprocess.run(
        ["git", "remote", "get-url", "origin"],
        cwd=root,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise PublicUrlError(
            "PUBLIC_URL が未設定で、git remote origin も取得できませんでした。"
        )
    return result.stdout.strip()


def infer_github_pages_url(remote_url: str) -> str:
    parsed = parse_github_remote(remote_url)
    if not parsed:
        raise PublicUrlError(
            "git remote origin から GitHub Pages URL を推定できませんでした。"
        )
    owner, repo = parsed
    return f"https://{owner}.github.io/{repo}/"


def resolve_public_url(
    root: Path = ROOT,
    environ: Mapping[str, str] | None = None,
) -> str:
    env = os.environ if environ is None else environ
    public_url = env.get("PUBLIC_URL")
    if public_url:
        return normalize_public_url(public_url)

    remote_url = get_origin_remote(root)
    return infer_github_pages_url(remote_url)


def main() -> None:
    try:
        print(resolve_public_url())
    except PublicUrlError as exc:
        raise SystemExit(f"公開URLを解決できません: {exc}") from exc


if __name__ == "__main__":
    main()
