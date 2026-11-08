#!/usr/bin/env python3
"""扫描科目文件夹 → site/manifest.json（网站索引）。

- 文件条目: {type:"file", id, subject, name, ext, size, updated, path, urls:{fast,raw,mirror}}
- 大文件(在 .gitignore 中、走 Releases): url 写入 urls，来源 release-assets.json
- 链接条目: 合并 site/_data/*.json (type: link / book)
"""
import json, hashlib, os, sys
from pathlib import Path, PurePosixPath
from datetime import datetime, timezone, timedelta

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
REPO = os.environ.get("REPO", "xyqmbyl/study-resources")
BRANCH = "main"
JSDELIVR_MAX = 20 * 1024 * 1024  # jsDelivr 单文件上限 20MB
CN_TZ = timezone(timedelta(hours=8))

SKIP_DIRS = {".git", ".github", "site", "scripts", ".v2c"}
SUBJECT_META = {  # 拼音首字母（检索用）与图标
    "C语言": ("cy", "🇨"), "JAVA": ("java", "☕"), "c++": ("cpp", "➕"),
    "web程序设计": ("web", "🌐"), "中南ppt模版": ("ppt", "📊"),
    "习概": ("xg", "📕"), "人工智能": ("rgzn", "🤖"), "军理": ("jl", "🎖️"),
    "思修": ("sx", "📘"), "操作系统": ("czxt", "🖥️"), "数据结构": ("sjjg", "🌲"),
    "汇编语言": ("hbyy", "⚙️"), "电路": ("dl", "🔌"), "线代": ("xd", "🧮"),
    "编译原理": ("byyl", "📜"), "英语": ("yy", "🔤"), "计算机体系结构": ("txjg", "🏛️"),
    "计算机组成原理": ("jczyl", "🔩"), "计算机网络(计科)": ("jjwl", "🌐"),
    "软件工程(计科)": ("rjgc", "🏗️"), "高数": ("gs", "∑"),
    "大学生心理健康安全教育mooc期末考试答案（zxp版）.pdf": ("mooc", "🧠"),
}

def stable_id(rel: str) -> str:
    return hashlib.sha1(rel.encode("utf-8")).hexdigest()[:10]

def file_entry(root: Path, f: Path, release_map: dict) -> dict | None:
    rel = f.relative_to(root).as_posix()
    try:
        size = f.stat().st_size
    except OSError:
        return None
    if "___" in rel or os.name == "nt" and f.name.startswith("~$"):
        return None
    subject = f.parent.name if f.parent != root else ""
    urls = {}
    in_git = True
    if rel in release_map:
        meta = release_map[rel]
        urls["dl"] = meta["url"] if isinstance(meta, dict) else meta
        in_git = False
    else:
        if size <= JSDELIVR_MAX:
            urls["jsd"] = f"https://cdn.jsdelivr.net/gh/{REPO}@{BRANCH}/{rel}"
        urls["raw"] = f"https://raw.githubusercontent.com/{REPO}/{BRANCH}/{rel}"
        urls["proxy"] = f"https://ghfast.top/https://raw.githubusercontent.com/{REPO}/{BRANCH}/{rel}"
    mtime = datetime.fromtimestamp(f.stat().st_mtime, CN_TZ)
    return {
        "type": "file",
        "id": stable_id(rel),
        "subject": subject or "其他",
        "name": f.stem,
        "ext": f.suffix.lstrip(".").lower() or "文件",
        "size": size,
        "updated": mtime.strftime("%Y-%m-%d"),
        "ts": int(mtime.timestamp()),
        "path": rel,
        "urls": urls,
    }

def load_data(name: str) -> list:
    p = SITE / "_data" / name
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"warn: 解析 {p.name} 失败: {e}", file=sys.stderr)
    return []

def main():
    release_map = {}
    rap = ROOT / "scripts" / "release-assets.json"
    if rap.exists():
        release_map = json.loads(rap.read_text(encoding="utf-8"))

    subjects, files = {}, []
    for d in sorted(ROOT.iterdir()):
        if not d.is_dir() or d.name in SKIP_DIRS:
            continue
        meta = SUBJECT_META.get(d.name, (d.name[:4].lower(), "📁"))
        count = 0
        for f in sorted(d.rglob("*")):
            if f.is_file():
                e = file_entry(ROOT, f, release_map)
                if e:
                    files.append(e)
                    count += 1
        subjects[d.name] = {"py": meta[0], "icon": meta[1], "count": count}

    # 顶层散落文件
    for f in sorted(ROOT.iterdir()):
        if f.is_file() and f.suffix.lower() in {".pdf", ".docx", ".doc", ".pptx", ".zip"}:
            e = file_entry(ROOT, f, release_map)
            if e:
                e["subject"] = "其他"
                files.append(e)
    if "其他" not in subjects and any(x["subject"] == "其他" for x in files):
        subjects["其他"] = {"py": "qt", "icon": "📦", "count": 0}

    for name in ("cs-videos.json", "basic-videos.json", "books.json"):
        for item in load_data(name):
            item.setdefault("type", "book" if name == "books.json" else "link")
            item.setdefault("id", stable_id(item.get("url", item.get("title", ""))))
            files.append(item)
            sub = item.get("subject", "其他")
            if sub not in subjects:
                subjects[sub] = {"py": "", "icon": "🎬" if item["type"] == "link" else "📚", "count": 0}
            subjects[sub]["count"] += 1

    files.sort(key=lambda x: x.get("ts", 0), reverse=True)

    # Release 通道大文件：CI 服务器磁盘上没有这些文件，按映射补齐条目
    existing_paths = {x.get("path") for x in files}
    today = datetime.now(CN_TZ).strftime("%Y-%m-%d")
    for rel, meta in release_map.items():
        if rel in existing_paths:
            continue
        url = meta["url"] if isinstance(meta, dict) else meta
        size = meta.get("size", 0) if isinstance(meta, dict) else 0
        pp = PurePosixPath(rel)
        subject = pp.parent.as_posix()
        files.append({
            "type": "file", "id": stable_id(rel), "subject": subject,
            "name": pp.stem, "ext": pp.suffix.lstrip(".").lower(), "size": size,
            "updated": today, "ts": 0, "path": rel, "urls": {"dl": url},
        })
        if subject not in subjects:
            sm = SUBJECT_META.get(subject, (subject[:4].lower(), "📁"))
            subjects[subject] = {"py": sm[0], "icon": sm[1], "count": 0}
        subjects[subject]["count"] += 1

    manifest = {
        "generated": datetime.now(CN_TZ).strftime("%Y-%m-%d %H:%M"),
        "repo": REPO,
        "subjects": subjects,
        "items": files,
    }
    out = SITE / "manifest.json"
    out.write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"manifest.json: {len(files)} items, {len(subjects)} subjects, {out.stat().st_size//1024} KB")

if __name__ == "__main__":
    main()
