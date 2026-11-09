#!/usr/bin/env python3
"""扫描科目文件夹 → .site/manifest.json（网站索引）。

- 文件条目: {type:"file", id, subject, name, ext, size, updated, path, urls:{jsd,jsd2,raw,proxy,proxy2}}
- 大文件(在 .gitignore 中、走 Releases): url 写入 urls，来源 release-assets.json
- 链接条目: 合并 .site/_data/*.json (type: link / book)
- 目录注释: 目录可放一个 _note.json {"note":..., "files":{文件名:说明}} → file 条目带 note 字段
"""
import json, hashlib, os, re, sys
from pathlib import Path, PurePosixPath
from datetime import datetime, timezone, timedelta
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / ".site"
REPO = os.environ.get("REPO", "xyqmbyl/study-resources")
BRANCH = "main"
JSDELIVR_MAX = 20 * 1024 * 1024  # jsDelivr 单文件上限 20MB
CN_TZ = timezone(timedelta(hours=8))

# 任意深度命中即整棵子树跳过：目录名以 . / _ 开头，或属于明确列出的非资料目录。
# 覆盖 .git/.github/.site/.scripts/.v2c/.zcode/.wpp_backup/.dsh* 、_PDF处理/_audit/ 等
SKIP_EXACT_DIRS = {"整理技术目录（非学习资料）", "node_modules", "__pycache__"}

def is_skip_dir(name: str) -> bool:
    return name.startswith(".") or name.startswith("_") or name in SKIP_EXACT_DIRS

SUBJECT_META = {  # 拼音首字母（检索用）与图标
    "C语言": ("cy", "🇨"), "JAVA": ("java", "☕"), "c++": ("cpp", "➕"),
    "web程序设计": ("web", "🌐"), "中南ppt模版": ("ppt", "📊"),
    "习概": ("xg", "📕"), "人工智能": ("rgzn", "🤖"), "军理": ("jl", "🎖️"),
    "思修": ("sx", "📘"), "操作系统": ("czxt", "🖥️"), "数据结构": ("sjjg", "🌲"),
    "汇编语言": ("hbyy", "⚙️"), "电路": ("dl", "🔌"), "线代": ("xd", "🧮"),
    "编译原理": ("byyl", "📜"), "英语": ("yy", "🔤"), "计算机体系结构": ("txjg", "🏛️"),
    "计算机组成原理": ("jczyl", "🔩"), "计算机网络(计科)": ("jjwl", "🌐"),
    "软件工程(计科)": ("rjgc", "🏗️"), "高数": ("gs", "∑"),
    "大学生心理健康": ("mooc", "🧠"),
}

# 科目名归一化：_data/*.json 与 Release 映射里的 subject 若写法不同，统一并到对应目录科目，
# 避免侧栏出现「JAVA/Java」「计算机网络(计科)/计算机网络」这类重复科目
SUBJECT_ALIASES = {
    "Java": "JAVA",
    "C++": "c++",
    "C": "C语言",
    "计算机网络": "计算机网络(计科)",
    "软件工程": "软件工程(计科)",
    "大学物理": "其他",
}

def canon_subject(name: str) -> str:
    return SUBJECT_ALIASES.get(name, name)

def stable_id(rel: str) -> str:
    return hashlib.sha1(rel.encode("utf-8")).hexdigest()[:10]

# ---- _note.json：目录级/文件级说明 -------------------------------------------
_note_cache: dict = {}  # 目录路径 -> 解析后的 dict 或 None

def load_note_json(d: Path) -> dict | None:
    """读取目录下的 _note.json（内存缓存），不存在或格式非法返回 None。"""
    key = str(d)
    if key not in _note_cache:
        data = None
        p = d / "_note.json"
        if p.is_file():
            try:
                raw = json.loads(p.read_text(encoding="utf-8"))
                if isinstance(raw, dict):
                    data = raw
            except Exception as e:
                print(f"warn: 解析 {p} 失败: {e}", file=sys.stderr)
        _note_cache[key] = data
    return _note_cache[key]

def lookup_note(f: Path) -> str | None:
    """从文件所在目录向上找最近的 _note.json：files[文件名] 优先，其次目录级 note。"""
    name = f.name
    d = f.parent
    while True:
        data = load_note_json(d)
        if data is not None:  # 最近的 _note.json 优先，不再继续向上
            fm = data.get("files")
            if isinstance(fm, dict):
                v = fm.get(name)
                if isinstance(v, str) and v.strip():
                    return v
            v = data.get("note")
            if isinstance(v, str) and v.strip():
                return v
            break
        if d == ROOT or d.parent == d:  # 到仓库根（或文件系统根）为止
            break
        d = d.parent
    return None

def file_entry(root: Path, f: Path, release_map: dict) -> dict | None:
    rel = f.relative_to(root).as_posix()
    try:
        size = f.stat().st_size
    except OSError:
        return None
    if "___" in rel or f.name.startswith("~$"):  # "___"=占位命名；~$=Office 锁文件（任何系统都排除，CI 上也会混入）
        return None
    if f.name in (".gitkeep", "_note.json"):  # 占位符/注释文件不算资源
        return None
    parts = PurePosixPath(rel).parts
    # subject = 顶级科目文件夹；folder = 科目下的子路径（多级目录导航用）
    subject = parts[0] if len(parts) > 1 else "其他"
    folder = "/".join(parts[1:-1])
    urls = {}
    in_git = True
    if rel in release_map:
        meta = release_map[rel]
        urls["dl"] = meta["url"] if isinstance(meta, dict) else meta
        # GitHub Release 附件在国内常被墙/504，加 ghproxy.net 代理作备用线路
        urls["proxy"] = f"https://ghproxy.net/{urls['dl']}"
        in_git = False
    else:
        if size <= JSDELIVR_MAX:
            urls["jsd"] = f"https://cdn.jsdelivr.net/gh/{REPO}@{BRANCH}/{rel}"
            # jsDelivr 官方多 CDN 域名，cdn 主域被限流/污染时通常 gcore 可达且更快
            urls["jsd2"] = f"https://gcore.jsdelivr.net/gh/{REPO}@{BRANCH}/{rel}"
        urls["raw"] = f"https://raw.githubusercontent.com/{REPO}/{BRANCH}/{rel}"
        urls["proxy"] = f"https://ghfast.top/https://raw.githubusercontent.com/{REPO}/{BRANCH}/{rel}"
        urls["proxy2"] = f"https://ghproxy.net/https://raw.githubusercontent.com/{REPO}/{BRANCH}/{rel}"
    mtime = datetime.fromtimestamp(f.stat().st_mtime, CN_TZ)
    e = {
        "type": "file",
        "id": stable_id(rel),
        "subject": subject,
        "folder": folder,
        "name": f.stem,
        "ext": f.suffix.lstrip(".").lower() or "文件",
        "size": size,
        "updated": mtime.strftime("%Y-%m-%d"),
        "ts": int(mtime.timestamp()),
        "path": rel,
        "urls": urls,
    }
    note = lookup_note(f)
    if note:
        e["note"] = note
    return e

def scan_dir(base: Path, release_map: dict, all_dirs: set, skip_counts: dict) -> list:
    """遍历一个科目目录：任意深度剪掉 SKIP 目录（计数），返回文件条目。"""
    out = []
    for dirpath, dirnames, filenames in os.walk(base):
        keep = []
        for dn in dirnames:
            if is_skip_dir(dn):
                skip_counts[dn] = skip_counts.get(dn, 0) + 1
            else:
                keep.append(dn)
        keep.sort()
        dirnames[:] = keep
        here = Path(dirpath)
        if here != base:  # 目录清单（含只有 .gitkeep 的空文件夹，前端文件管理器显示用）
            all_dirs.add(here.relative_to(ROOT).as_posix())
        for fn in sorted(filenames):
            e = file_entry(ROOT, here / fn, release_map)
            if e:
                out.append(e)
    return out

def derive_name(item: dict) -> str:
    """link/book 兜底可读名称：urls.raw 末段(URL 解码、去扩展名) → title → id。"""
    raw = (item.get("urls") or {}).get("raw")
    if raw:
        seg = urlsplit(str(raw)).path.rstrip("/").rsplit("/", 1)[-1]
        seg = unquote(seg)
        if "." in seg:
            seg = seg.rsplit(".", 1)[0]
        if seg.strip():
            return seg.strip()
    return str(item.get("title") or item.get("id") or "").strip()

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
    rap = ROOT / ".scripts" / "release-assets.json"
    if rap.exists():
        release_map = json.loads(rap.read_text(encoding="utf-8"))

    subjects, files, all_dirs = {}, [], set()
    skip_counts: dict = {}
    for d in sorted(ROOT.iterdir()):
        if not d.is_dir():
            continue
        if is_skip_dir(d.name):
            skip_counts[d.name] = skip_counts.get(d.name, 0) + 1
            continue
        sub = canon_subject(d.name)  # 别名归一（幂等，不改磁盘目录名）
        meta = SUBJECT_META.get(sub, (sub[:4].lower(), "📁"))
        count = 0
        for e in scan_dir(d, release_map, all_dirs, skip_counts):
            e["subject"] = sub
            files.append(e)
            count += 1
        if sub in subjects:
            subjects[sub]["count"] += count
        else:
            subjects[sub] = {"py": meta[0], "icon": meta[1], "count": count}

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
            if not item.get("name"):  # link/book 补可读名称，保证 name 一定存在
                item["name"] = derive_name(item)
            files.append(item)
            sub = canon_subject(item.get("subject", "其他"))
            item["subject"] = sub
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
        parts = pp.parts
        subject = canon_subject(parts[0] if len(parts) > 1 else "其他")
        files.append({
            "type": "file", "id": stable_id(rel), "subject": subject,
            "folder": "/".join(parts[1:-1]),
            "name": pp.stem, "ext": pp.suffix.lstrip(".").lower(), "size": size,
            "updated": today, "ts": 0, "path": rel, "urls": {"dl": url},
        })
        if subject not in subjects:
            sm = SUBJECT_META.get(subject, (subject[:4].lower(), "📁"))
            subjects[subject] = {"py": sm[0], "icon": sm[1], "count": 0}
        subjects[subject]["count"] += 1

    # Release 通道大文件的目录在 CI 上没有本地文件，按映射补进目录清单
    for rel in release_map:
        for anc in PurePosixPath(rel).parents[:-1]:
            all_dirs.add(anc.as_posix())

    manifest = {
        "generated": datetime.now(CN_TZ).strftime("%Y-%m-%d %H:%M"),
        "repo": REPO,
        "subjects": subjects,
        "dirs": sorted(all_dirs),
        "items": files,
    }
    out = SITE / "manifest.json"
    out.write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"manifest.json: {len(files)} items, {len(subjects)} subjects, {out.stat().st_size//1024} KB")

    # 给 index.html 的静态资源打版本号（浏览器缓存破坏），每次构建都换新版本号
    tag = manifest["generated"].replace("-", "").replace(" ", "-").replace(":", "")
    html = (SITE / "index.html").read_text(encoding="utf-8")
    html = re.sub(r"assets/(app\.js|style\.css|fuse\.min\.js)(\?v=[\w-]+)?", rf"assets/\1?v={tag}", html)
    # 页脚可见构建号：用户一眼就能确认手机拿到的是哪个版本（排查缓存问题）
    html = re.sub(r'(<span id="buildTag">)[^<]*(</span>)', rf"\g<1>{tag}\g<2>", html)
    (SITE / "index.html").write_text(html, encoding="utf-8")

    # 构建自检
    note_n = sum(1 for x in files if x.get("type") == "file" and x.get("note"))
    noname = [x for x in files if not x.get("name")]
    skip_total = sum(skip_counts.values())
    detail = ", ".join(f"{k}={v}" for k, v in sorted(skip_counts.items(), key=lambda kv: (-kv[1], kv[0])))
    print(f"[自检] 科目数={len(subjects)} 条目数={len(files)} file有note={note_n} "
          f"缺name={len(noname)} 跳过目录={skip_total}")
    print(f"[自检] 跳过明细: {detail}")
    if noname:
        print(f"[自检] 警告: {len(noname)} 条条目缺 name", file=sys.stderr)

if __name__ == "__main__":
    main()
