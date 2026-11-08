/* ===== CSU 学习资源库 · 前端逻辑 ===== */
const REPO = "xyqmbyl/study-resources";
const $ = (sel) => document.querySelector(sel);
const state = { type: "all", folder: "", q: "", open: new Set() };
let MANIFEST = null, FUSE = null, TREE = null;

// 顶级科目：文件取路径首段（兼容旧 manifest 的 subject=父文件夹名），链接/书用 subject 字段
const topOf = (it) => (it.type === "file" && it.path ? it.path.split("/")[0] : it.subject || "其他");
const underFolder = (it, folder) =>
  it.type === "file" && it.path
    ? it.path === folder || it.path.startsWith(folder + "/")
    : !folder.includes("/") && topOf(it) === folder;

const typeNames = { all: "全部", file: "文件", link: "视频课程", book: "电子书" };
const extColor = (ext) => ({
  pdf: "ft-pdf", ppt: "ft-ppt", pptx: "ft-ppt", doc: "ft-doc", docx: "ft-doc",
  xls: "ft-xls", xlsx: "ft-xls", zip: "ft-zip", rar: "ft-zip", "7z": "ft-zip",
  svg: "ft-img", png: "ft-img", jpg: "ft-img",
}[ext] || "ft-misc");

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmtSize = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : n > 1024 ? (n / 1024).toFixed(0) + " KB" : n + " B");

/* ---------- 主题 ---------- */
function initTheme() {
  applyTheme(localStorage.getItem("theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
}
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  $("#btnTheme").textContent = t === "dark" ? "☀️" : "🌙";
}
$("#btnTheme").onclick = () => {
  const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("theme", t);
  applyTheme(t);
};

/* ---------- 壁纸（内置 3 张 + 本地自定义，自定义图压缩后存 IndexedDB） ---------- */
const WALLPAPERS = ["", "assets/wp-1.jpg", "assets/wp-2.jpg", "assets/wp-3.jpg", "@custom"]; // "" = 关闭, "@custom" = 自定义
const WP_LABELS = ["🖼️", "🖼️ 1", "🖼️ 2", "🖼️ 3", "🖼️ ★"];
let customWpUrl = "";

function wpDb() {
  return new Promise((res, rej) => {
    const rq = indexedDB.open("wallpaper", 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore("wp");
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
  });
}
async function saveCustomWp(blob) {
  const db = await wpDb();
  await new Promise((res, rej) => {
    const tx = db.transaction("wp", "readwrite");
    tx.objectStore("wp").put(blob, "custom");
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  });
}
async function loadCustomWp() {
  try {
    const db = await wpDb();
    const blob = await new Promise((res) => {
      const rq = db.transaction("wp").objectStore("wp").get("custom");
      rq.onsuccess = () => res(rq.result || null);
      rq.onerror = () => res(null);
    });
    if (blob) customWpUrl = URL.createObjectURL(blob);
  } catch (e) { /* 无痕模式等场景降级为无自定义壁纸 */ }
}

// 前端压缩：最长边压到 1600px、JPEG q0.75，控制存储体积
function compressWallpaper(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => (b ? res(b) : rej(new Error("压缩失败"))), "image/jpeg", 0.75);
    };
    img.onerror = () => rej(new Error("图片读取失败"));
    img.src = URL.createObjectURL(file);
  });
}

function pickWallpaper() {
  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = "image/*";
  inp.onchange = async () => {
    const f = inp.files[0];
    if (!f) return;
    try {
      const blob = await compressWallpaper(f);
      await saveCustomWp(blob);
      if (customWpUrl) URL.revokeObjectURL(customWpUrl);
      customWpUrl = URL.createObjectURL(blob);
      localStorage.setItem("wp", WALLPAPERS.length - 1);
      applyWallpaper();
    } catch (e) { alert("壁纸设置失败：" + e.message); }
  };
  inp.click();
}

function applyWallpaper() {
  const i = Math.min(+(localStorage.getItem("wp") || 0), WALLPAPERS.length - 1);
  const el = $("#wallpaper");
  if (WALLPAPERS[i] === "@custom") el.style.backgroundImage = customWpUrl ? `url("${customWpUrl}")` : "";
  else if (WALLPAPERS[i]) el.style.backgroundImage = `url("${WALLPAPERS[i]}")`;
  else el.style.backgroundImage = "";
  const btn = $("#btnWallpaper");
  btn.textContent = WP_LABELS[i];
  btn.title = "点击切换壁纸（关/1/2/3/自定义），右键上传自定义壁纸";
}
$("#btnWallpaper").onclick = () => {
  const next = (+(localStorage.getItem("wp") || 0) + 1) % WALLPAPERS.length;
  if (next === WALLPAPERS.length - 1 && !customWpUrl) { pickWallpaper(); return; } // 切到自定义但还没传过 → 直接弹选图
  localStorage.setItem("wp", next);
  applyWallpaper();
};
$("#btnWallpaper").oncontextmenu = (e) => { e.preventDefault(); pickWallpaper(); }; // 右键随时上传/更换

/* ---------- 加载与索引 ---------- */
async function loadManifest() {
  try {
    MANIFEST = await (await fetch("manifest.json", { cache: "no-cache" })).json();
  } catch (e) {
    document.getElementById("results").innerHTML = `<p class="empty">索引加载失败（本地预览请先运行 scripts/build_manifest.py）</p>`;
    return;
  }
  MANIFEST.items.forEach((it) => (it._s = [it.name, it.title, it.subject, it.folder, it.note, it.author, it.py, ...(it.tags || [])].filter(Boolean).join(" ")));
  FUSE = new Fuse(MANIFEST.items, { keys: ["_s"], threshold: 0.35, ignoreLocation: true });

  const subNames = Object.keys(MANIFEST.subjects);
  const subs = subNames.length;
  const nFile = MANIFEST.items.filter((x) => x.type === "file").length;
  const nLink = MANIFEST.items.filter((x) => x.type === "link").length;
  const nBook = MANIFEST.items.filter((x) => x.type === "book").length;
  $("#heroMeta").innerHTML = `<b>${subs}</b> 个科目 · <b>${nFile}</b> 份资料 · <b>${nLink}</b> 门视频 · <b>${nBook}</b> 本电子书&ensp;更新于 ${esc(MANIFEST.generated)}`;
  $("#upSubject").innerHTML = subNames.map((s) => `<option>${esc(s)}</option>`).join("");
  $("#pathList").innerHTML = MANIFEST.items.filter((x) => x.path).map((x) => `<option value="${esc(x.path)}">`).join("");
  renderChips(); renderSidebar(); render();
}

/* ---------- 筛选 chips ---------- */
function renderChips() {
  const counts = { all: MANIFEST.items.length, file: 0, link: 0, book: 0 };
  MANIFEST.items.forEach((x) => counts[x.type] !== undefined && counts[x.type]++);
  $("#typeChips").innerHTML = Object.keys(typeNames)
    .map((t) => `<button class="chip ${state.type === t ? "active" : ""}" data-t="${t}">${typeNames[t]} <span>${counts[t]}</span></button>`).join("");
  document.querySelectorAll("#typeChips .chip").forEach((b) => (b.onclick = () => { state.type = b.dataset.t; renderChips(); render(); }));
}

/* ---------- 侧栏：多级目录树（复刻本地文件夹层级） ---------- */
function buildTree() {
  const root = { ch: new Map() };
  MANIFEST.items.forEach((it) => {
    const segs = it.type === "file" && it.path ? it.path.split("/").slice(0, -1) : [topOf(it)];
    let node = root;
    for (const s of segs) {
      if (!s) continue;
      if (!node.ch.has(s)) node.ch.set(s, { ch: new Map(), n: 0 });
      node = node.ch.get(s);
      node.n = (node.n || 0) + 1;
    }
  });
  return root;
}

function renderSidebar() {
  if (!TREE) TREE = buildTree();
  const zhSort = (a, b) => a[0].localeCompare(b[0], "zh");
  const rows = [];
  const walk = (node, path, depth) => {
    for (const [name, child] of [...node.ch.entries()].sort(zhSort)) {
      const p = path ? path + "/" + name : name;
      const open = state.open.has(p);
      const meta = MANIFEST.subjects[p];
      rows.push(
        `<div class="subj-item tree ${state.folder === p ? "active" : ""}" data-p="${esc(p)}" style="padding-left:${12 + depth * 15}px">` +
        `<span class="tw ${child.ch.size ? "" : "leaf"} ${open ? "open" : ""}" data-tw="${esc(p)}">▶</span>` +
        `<span>${esc((meta && meta.icon) || (child.ch.size ? "📂" : "📁"))} ${esc(name)}</span>` +
        `<span class="cnt">${child.n}</span></div>`);
      if (open) walk(child, p, depth + 1);
    }
  };
  walk(TREE, "", 0);
  $("#sidebar").innerHTML =
    `<div class="subj-item ${state.folder === "" ? "active" : ""}" data-p=""><span>🏷️ 全部</span><span class="cnt">${MANIFEST.items.length}</span></div>` +
    rows.join("");
}

$("#sidebar").addEventListener("click", (e) => {
  const row = e.target.closest("[data-p]");
  if (!row) return;
  const p = row.dataset.p;
  const tw = e.target.closest(".tw");
  if (tw && !tw.classList.contains("leaf")) {
    state.open.has(p) ? state.open.delete(p) : state.open.add(p);
    renderSidebar();
    return;
  }
  // 选中目录：展开其所有祖先层级
  if (p) {
    const segs = p.split("/");
    for (let i = 1; i <= segs.length; i++) state.open.add(segs.slice(0, i).join("/"));
  }
  state.folder = p;
  renderSidebar();
  render();
  scrollToResults();
});

/* ---------- 列表 ---------- */
// 滚到结果区第一个内容（面包屑/分组标题）上方一点，不回到页顶、侧栏不动
function scrollToResults() {
  const el = document.querySelector("#results .crumb, #results .group-title, #results .grid");
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - 76; // 76 ≈ 顶栏高度
  window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
}

/* ---------- 搜索：中文长词按 2 字拆分匹配 + 常用别名，无命中时 Fuse 兜底 ---------- */
const SEARCH_ALIAS = { "高数": "高等数学", "线代": "线性代数", "计网": "计算机网络", "计组": "计算机组成原理", "大物": "大学物理", "毛概": "毛泽东思想概论" };
const gramsOf = (t) => /^[a-z0-9]+$/.test(t) ? [t] : Array.from({ length: Math.ceil(t.length / 2) }, (_, i) => t.slice(i * 2, i * 2 + 2));
function smartSearch(q) {
  q = q.toLowerCase().trim();
  const toks = q.split(/\s+/).filter(Boolean);
  const alts = toks.map((t) => {
    const base = gramsOf(t);
    const a = SEARCH_ALIAS[t];
    return a ? [base, gramsOf(a.toLowerCase())] : [base]; // 别名是「或」的备选，不是追加
  });
  const hit = MANIFEST.items.filter((it) => {
    const s = (it._s || "").toLowerCase();
    return alts.every((pair) => pair.some((gs) => gs.every((g) => s.includes(g))));
  });
  return hit.length ? hit : FUSE.search(q).map((r) => r.item);
}

function render() {
  let items = MANIFEST.items;
  if (state.q) items = smartSearch(state.q); // 先搜索，再让目录/类型筛选继续生效
  if (state.folder) items = items.filter((x) => underFolder(x, state.folder));
  if (state.type !== "all") items = items.filter((x) => x.type === state.type);
  const box = document.getElementById("results");
  if (!items.length) {
    box.innerHTML = `<p class="empty">${state.q ? "🔍 没找到「" + esc(state.q) + "」，换个关键词试试？" : "（空）"}</p>`;
    return;
  }
  // 分组：选中目录时按下一级子文件夹分（本层文件排最前），否则按顶级科目
  const groups = {};
  items.forEach((it) => {
    let g;
    if (it.type === "file" && it.path) {
      const dirs = it.path.split("/").slice(0, -1);
      if (state.folder) {
        const base = state.folder.split("/").length;
        g = dirs.length > base ? dirs[base] : "• 本层文件";
      } else g = dirs[0] || "其他";
    } else g = it.subject || "其他";
    (groups[g] ??= []).push(it);
  });
  const keys = Object.keys(groups);
  if (state.folder) keys.sort((a, b) => (a === "• 本层文件" ? -1 : b === "• 本层文件" ? 1 : a.localeCompare(b, "zh")));
  const crumb = state.folder
    ? `<div class="crumb">📂 ` +
      state.folder.split("/").map((s, i, a) => `<a data-c="${esc(a.slice(0, i + 1).join("/"))}">${esc(s)}</a>`).join(" <i>/</i> ") +
      `</div>`
    : "";
  box.innerHTML =
    (state.q ? `<p class="search-stat">「${esc(state.q)}」命中 ${items.length} 项</p>` : "") + crumb +
    keys.map((sub) => {
      const m = MANIFEST.subjects[sub] || {};
      const isTop = !state.folder;
      return `<h2 class="group-title">${isTop ? (m.icon || "📁") : "📁"} ${esc(sub)} <small>${groups[sub].length}</small></h2><div class="grid">${groups[sub].map(cardHTML).join("")}</div>`;
    }).join("");
}

// 面包屑点击 → 跳到对应层级
$("#results").addEventListener("click", (e) => {
  const a = e.target.closest(".crumb a");
  if (!a) return;
  state.folder = a.dataset.c;
  renderSidebar();
  render();
  scrollToResults();
});

function cardHTML(it) {
  if (it.type === "link") return videoCard(it);
  if (it.type === "book") return bookCard(it);
  return fileCard(it);
}

function fileCard(it) {
  const u = it.urls || {};
  const dl = u.dl || u.jsd || u.proxy || u.raw || "#";
  const read = it.ext === "pdf" && (u.jsd || u.raw)
    ? `<a class="btn-read" href="${esc(u.jsd || u.raw)}" target="_blank" rel="noopener">在线阅读</a>` : "";
  return `<div class="card">
    <div class="card-top">
      <span class="ftag ${extColor(it.ext)}">${esc((it.ext || "?").toUpperCase().slice(0, 4))}</span>
      <div class="card-title">${hl(it.name)}</div>
    </div>
    <div class="card-meta"><span>${esc(it.folder || it.subject)}</span><span>${fmtSize(it.size || 0)}</span><span>${esc(it.updated || "")}</span></div>
    <div class="card-actions">
      <a class="btn-dl" href="${esc(dl)}" download>⬇ 下载</a>
      ${read}
      <a class="btn-alt" href="${esc(u.proxy || u.raw || dl)}" download title="备用线路">备</a>
    </div></div>`;
}

function videoCard(it) {
  const bv = (it.url.match(/BV\w+/) || [])[0];
  return `<div class="card link-card" ${bv ? `onclick="openVideo('${bv}')" style="cursor:pointer"` : ""}>
    <div class="card-top">
      <span class="ftag ft-video">▶</span>
      <div class="card-title">${hl(it.title || it.name)}</div>
    </div>
    <div class="card-note">${esc(it.note || "")}</div>
    <div class="card-meta"><span class="badge bili">▶ ${esc(it.author || "视频")}</span><span>${esc(it.subject)}</span>
      <a href="${esc(it.url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="margin-left:auto">原站 ↗</a>
    </div></div>`;
}

function bookCard(it) {
  return `<div class="card book-card">
    <div class="card-top">
      <span class="ftag ft-book">📖</span>
      <div class="card-title">${hl(it.title || it.name)}</div>
    </div>
    <div class="card-note">${esc(it.note || "")}</div>
    <div class="card-meta"><span>${esc(it.author || "")}</span><span>${esc(it.subject)}</span>
      <a class="btn-dl" style="margin-left:auto;padding:4px 14px" href="${esc(it.url)}" target="_blank" rel="noopener">获取 →</a>
    </div></div>`;
}

/* ---------- 高亮 ---------- */
function hl(t) {
  t = String(t ?? "");
  if (!state.q) return esc(t);
  const i = t.toLowerCase().indexOf(state.q.toLowerCase());
  if (i < 0) return esc(t);
  return esc(t.slice(0, i)) + "<mark>" + esc(t.slice(i, i + state.q.length)) + "</mark>" + esc(t.slice(i + state.q.length));
}

/* ---------- 弹层 ---------- */
window.openVideo = (bv) => {
  $("#videoFrame").innerHTML = `<iframe src="https://player.bilibili.com/player.html?bvid=${bv}&high_quality=1" allowfullscreen scrolling="no"></iframe>`;
  $("#videoModal").hidden = false;
  document.body.style.overflow = "hidden";
};
window.closeModal = () => {
  $("#videoModal").hidden = true; $("#videoFrame").innerHTML = ""; document.body.style.overflow = "";
};
$("#videoModal").onclick = (e) => { if (e.target.id === "videoModal") closeModal(); };

/* ---------- 路由 ---------- */
function route() {
  const admin = location.hash === "#admin";
  $("#viewHome").hidden = admin;
  $("#viewAdmin").hidden = !admin;
  if (admin && TOKEN()) { $("#adminLoginBox").hidden = true; $("#adminPanel").hidden = false; }
}

/* ---------- 管理台 ---------- */
const TOKEN = () => localStorage.getItem("admin_token");
const auth = (t) => ({ Authorization: `Bearer ${t}` });
$("#adminLogin").onclick = async () => {
  const token = $("#adminToken").value.trim();
  if (!token) return;
  const r = await fetch(`https://api.github.com/repos/${REPO}`, { headers: auth(token) });
  if (!r.ok) return alert("✗ Token 无效或无仓库权限（" + r.status + "）");
  localStorage.setItem("admin_token", token);
  $("#adminLoginBox").hidden = true;
  $("#adminPanel").hidden = false;
};
$("#adminLogout").onclick = () => { localStorage.removeItem("admin_token"); location.hash = ""; location.reload(); };

$("#upBtn").onclick = async () => {
  const files = [...$("#upFile").files], subject = $("#upSubject").value;
  if (!files.length) return log("请先选择文件", "#upLog");
  for (const f of files) {
    log(`⬆ ${f.name} 上传中…`, "#upLog");
    log((await putFile(`${subject}/${f.name}`, f, null)) ? `✓ ${f.name}` : `✗ ${f.name} 失败`, "#upLog");
  }
  log("✔ 完成，索引重建约需 1 分钟", "#upLog");
};

$("#rpBtn").onclick = async () => {
  const path = $("#rpPath").value.trim(), file = $("#rpFile").files[0];
  if (!path || !file) return log("请填写路径并选择文件", "#rpLog");
  const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${encodeURI(path)}`, { headers: auth(TOKEN()) });
  if (!r.ok) return log("✗ 仓库中未找到该路径", "#rpLog");
  const sha = (await r.json()).sha;
  log("提交替换中…", "#rpLog");
  log((await putFile(path, file, sha)) ? "✔ 替换成功，索引重建中…" : "✗ 提交失败", "#rpLog");
};

async function putFile(path, file, sha) {
  const b64 = await new Promise((res) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result.split(",")[1]);
    fr.readAsDataURL(file);
  });
  const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${encodeURI(path)}`, {
    method: "PUT",
    headers: { ...auth(TOKEN()), "Content-Type": "application/json" },
    body: JSON.stringify({ message: `upload: ${path}`, content: b64, sha }),
  });
  return r.ok;
}
function log(msg, sel) { const el = $(sel); el.textContent += msg + "\n"; el.scrollTop = el.scrollHeight; }

/* ---------- 启动 ---------- */
window.addEventListener("hashchange", route);
window.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    if (location.hash) location.hash = "";
    $("#searchInput").focus();
  }
});
let _deb;
$("#searchInput").addEventListener("input", (e) => {
  clearTimeout(_deb);
  _deb = setTimeout(() => { state.q = e.target.value.trim(); render(); }, 120);
});

initTheme();
loadCustomWp().then(applyWallpaper); // 先取本地自定义壁纸再应用，避免闪烁到空背景
loadManifest();
route();
