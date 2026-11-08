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
    document.getElementById("results").innerHTML = `<p class="empty">索引加载失败（本地预览请先运行 .scripts/build_manifest.py）</p>`;
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
  $("#folderList").innerHTML = [...new Set(MANIFEST.items.filter((x) => x.folder).map((x) => x.subject + "/" + x.folder))]
    .map((f) => `<option value="${esc(f)}">`).join("");
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

/* ---------- 导航自定义（只存本浏览器：顺序 + 隐藏顶级科目） ---------- */
let NAVCUST = null;
function navCust() {
  if (!NAVCUST) { try { NAVCUST = JSON.parse(localStorage.getItem("navCustom")) || {}; } catch (e) { NAVCUST = {}; } }
  if (!Array.isArray(NAVCUST.order)) NAVCUST.order = [];
  if (!Array.isArray(NAVCUST.hidden)) NAVCUST.hidden = [];
  return NAVCUST;
}
function saveNavCust() { localStorage.setItem("navCustom", JSON.stringify(NAVCUST || { order: [], hidden: [] })); }
const navTopOf = (it) => (it.type === "file" && it.path ? it.path.split("/")[0] : topOf(it));
const navHiddenTop = (it) => navCust().hidden.includes(navTopOf(it));
// 顶级「科目文件夹」= 文件路径的第一层目录 / 链接电子书的 subject；根目录散落文件不算
const navTopFolder = (it) => {
  if (it.type === "file" && it.path) { const d = it.path.split("/").slice(0, -1); return d[0] || null; }
  return topOf(it);
};
const navFolderTops = () => [...new Set(MANIFEST.items.map(navTopFolder).filter(Boolean))];
function navOrder(names) {
  const { order } = navCust();
  return [...names].sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b, "zh");
  });
}

/* ---------- 侧栏：多级目录树（复刻本地文件夹层级） ---------- */
function buildTree() {
  const root = { ch: new Map() };
  MANIFEST.items.forEach((it) => {
    if (navHiddenTop(it)) return; // 用户隐藏的顶级科目不进目录树
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
  const rows = [];
  const walk = (node, path, depth) => {
    for (const [name, child] of navOrder([...node.ch.keys()]).map((k) => [k, node.ch.get(k)])) {
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

/* ---------- 导航自定义弹窗 ---------- */
function openNavModal() {
  navCust();
  $("#navCustList").innerHTML = navOrder(navFolderTops())
    .map((n) => {
      const meta = MANIFEST.subjects[n];
      const off = NAVCUST.hidden.includes(n);
      return `<div class="navcust-row ${off ? "off" : ""}" data-n="${esc(n)}">
        <label><input type="checkbox" data-chk="${esc(n)}" ${off ? "" : "checked"}> ${esc((meta && meta.icon) || "📁")} ${esc(n)}</label>
        <span class="drag-handle" title="拖动排序">⠿</span></div>`;
    }).join("");
  document.getElementById("navModal").hidden = false;
}
$("#navCustomBtn").addEventListener("click", openNavModal);
// 拖拽磁吸排序：按住 ⠿ 上下拖，经过相邻行时整行让位（带过渡动画），松手落位
(() => {
  const list = document.getElementById("navCustList");
  let row = null, startY = 0, h = 0, target = 0;
  const rows = () => [...list.children];
  list.addEventListener("pointerdown", (e) => {
    const handle = e.target.closest(".drag-handle");
    if (!handle) return;
    e.preventDefault();
    row = e.target.closest(".navcust-row");
    startY = e.clientY;
    h = row.offsetHeight;
    target = rows().indexOf(row);
    row.classList.add("dragging");
    row.setPointerCapture(e.pointerId);
  });
  list.addEventListener("pointermove", (e) => {
    if (!row) return;
    const dy = e.clientY - startY;
    row.style.transform = `translateY(${dy}px)`;
    target = Math.max(0, Math.min(rows().length - 1, Math.round(dy / h) + rows().indexOf(row)));
    rows().forEach((r, i) => {
      if (r === row) return;
      const from = rows().indexOf(row);
      // 向下拖：中间行整体上移；向上拖：中间行整体下移（方向相反，不可统一用 -h）
      let off = 0;
      if (from < target && i > from && i <= target) off = -h;
      else if (target < from && i >= target && i < from) off = h;
      r.style.transform = off ? `translateY(${off}px)` : "";
    });
  });
  const end = () => {
    if (!row) return;
    const moved = row;
    const t = target;
    row = null;
    moved.classList.remove("dragging");
    rows().forEach((r) => (r.style.transform = ""));
    if (t !== rows().indexOf(moved)) {
      const seq = rows();
      seq.splice(seq.indexOf(moved), 1);
      seq.splice(t, 0, moved);
      seq.forEach((r) => list.appendChild(r));
      navCust().order = seq.map((r) => r.dataset.n); // 完整显示顺序入库
      saveNavCust(); TREE = null; renderSidebar(); render();
    }
  };
  list.addEventListener("pointerup", end);
  list.addEventListener("pointercancel", end);
})();
$("#navCustList").addEventListener("change", (e) => {
  const chk = e.target.closest("[data-chk]");
  if (!chk) return;
  const n = chk.dataset.chk;
  const { hidden } = navCust();
  chk.checked ? NAVCUST.hidden = hidden.filter((x) => x !== n) : hidden.push(n);
  saveNavCust(); TREE = null;
  if (state.folder && NAVCUST.hidden.includes(state.folder.split("/")[0])) state.folder = "";
  renderSidebar(); render(); openNavModal();
});
$("#navCustReset").onclick = () => {
  NAVCUST = null; localStorage.removeItem("navCustom");
  TREE = null; state.folder = ""; renderSidebar(); render(); openNavModal();
};

/* ---------- 侧栏拖拽分隔条（宽度存本浏览器） ---------- */
(() => {
  const saved = +localStorage.getItem("sbw");
  if (saved) document.documentElement.style.setProperty("--sbw", Math.min(480, Math.max(160, saved)) + "px");
  const sp = document.querySelector(".splitter");
  if (!sp) return;
  let startX = 0, startW = 0;
  sp.addEventListener("pointerdown", (e) => {
    startX = e.clientX;
    startW = document.querySelector(".sidebar").getBoundingClientRect().width;
    sp.classList.add("dragging");
    sp.setPointerCapture(e.pointerId);
  });
  sp.addEventListener("pointermove", (e) => {
    if (!sp.classList.contains("dragging")) return;
    const w = Math.min(480, Math.max(160, startW + e.clientX - startX));
    document.documentElement.style.setProperty("--sbw", w + "px");
  });
  const end = (e) => {
    if (!sp.classList.contains("dragging")) return;
    sp.classList.remove("dragging");
    const w = Math.min(480, Math.max(160, startW + e.clientX - startX));
    localStorage.setItem("sbw", w);
  };
  sp.addEventListener("pointerup", end);
  sp.addEventListener("pointercancel", end);
})();

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
  items = items.filter((x) => !navHiddenTop(x)); // 隐藏科目的资料在「全部」里也不出现（搜索除外则保留——此处统一隐藏）
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

// 下载拦截：download 属性对跨域链接无效（浏览器会直接打开预览页），
// 改为 fetch 成 blob 再落盘，文件名取自资料本身；失败时兜底开原链接
$("#results").addEventListener("click", async (e) => {
  const a = e.target.closest("a[data-dl]");
  if (!a) return;
  e.preventDefault();
  if (a.dataset.busy) return;
  a.dataset.busy = "1";
  const url = a.href;
  const name = a.dataset.name || decodeURIComponent((url.split("/").pop() || "").split("?")[0]) || "download";
  const orig = a.textContent;
  a.textContent = "下载中…";
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    const blob = await resp.blob();
    const objUrl = URL.createObjectURL(blob);
    const tmp = document.createElement("a");
    tmp.href = objUrl;
    tmp.download = name;
    document.body.appendChild(tmp);
    tmp.click();
    tmp.remove();
    setTimeout(() => URL.revokeObjectURL(objUrl), 60000);
    a.textContent = orig;
  } catch (err) {
    a.textContent = orig;
    window.open(url, "_blank", "noopener");
  } finally {
    delete a.dataset.busy;
  }
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
  // Release 通道链接自带附件头可直接下；jsd/proxy/raw 是跨域的，download 属性无效，交给统一的 blob 下载拦截
  const dlCh = u.dl && !u.raw;
  const dlAttrs = dlCh ? `target="_blank" rel="noopener"` : `download data-dl="1" data-name="${esc(it.name || "file")}"`;
  const altAttrs = dlCh ? `download` : `download data-dl="1" data-name="${esc(it.name || "file")}"`;
  return `<div class="card">
    <div class="card-top">
      <span class="ftag ${extColor(it.ext)}">${esc((it.ext || "?").toUpperCase().slice(0, 4))}</span>
      <div class="card-title">${hl(it.name)}</div>
    </div>
    <div class="card-meta"><span>${esc(it.folder || it.subject)}</span><span>${fmtSize(it.size || 0)}</span><span>${esc(it.updated || "")}</span></div>
    <div class="card-actions">
      <a class="btn-dl" href="${esc(dl)}" ${dlAttrs}>⬇ 下载</a>
      ${read}
      <a class="btn-alt" href="${esc(u.proxy || u.raw || dl)}" ${altAttrs} title="备用线路">备</a>
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
  if (admin && TOKEN()) enterAdmin();
}

/* ---------- 管理台 ---------- */
const TOKEN = () => localStorage.getItem("admin_token");
const auth = (t) => ({ Authorization: `Bearer ${t}` });
let CAN_WRITE = false;

// 通用 GitHub API 封装：失败时抛出带状态码与错误信息的异常
async function ghApi(path, opts = {}) {
  const r = await fetch("https://api.github.com" + path, {
    method: opts.method || "GET",
    headers: { ...auth(TOKEN()), "Content-Type": "application/json", ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = r.status === 204 ? null : await r.json().catch(() => null);
  if (!r.ok) throw new Error(`GitHub API ${r.status}${data?.message ? "：" + data.message : ""}`);
  return data;
}

const fileB64 = (file) => new Promise((res, rej) => {
  const fr = new FileReader();
  fr.onload = () => res(fr.result.split(",")[1]);
  fr.onerror = () => rej(new Error("读取文件失败"));
  fr.readAsDataURL(file);
});

// Git Data API：把一批变更（上传/替换/移动/删除）打包成单个 commit，避免逐文件提交
// change: {op:"put", path, content(b64)} | {op:"rm", path} | {op:"mv", from, to}
// dest: 提交目标，默认本仓库 main；投稿模式传 {repo:"用户名/study-resources", branch:"submit-xxx"}
async function commitChanges(changes, message, dest = { repo: REPO, branch: "main" }) {
  const ref = await ghApi(`/repos/${dest.repo}/git/ref/heads/${dest.branch}`);
  const head = await ghApi(`/repos/${dest.repo}/git/commits/${ref.object.sha}`);
  const tree = [];
  for (const ch of changes) {
    if (ch.op === "put") {
      const b = await ghApi(`/repos/${dest.repo}/git/blobs`, { method: "POST", body: { content: ch.content, encoding: "base64" } });
      tree.push({ path: ch.path, mode: "100644", type: "blob", sha: b.sha });
    } else if (ch.op === "mv") {
      const sha = ch.sha || (await ghApi(`/repos/${dest.repo}/contents/${encodeURI(ch.from)}`)).sha;
      tree.push({ path: ch.to, mode: "100644", type: "blob", sha });
      tree.push({ path: ch.from, mode: "100644", type: "blob", sha: null });
    } else if (ch.op === "rm") {
      tree.push({ path: ch.path, mode: "100644", type: "blob", sha: null });
    }
  }
  if (!tree.length) return null;
  const nt = await ghApi(`/repos/${dest.repo}/git/trees`, { method: "POST", body: { base_tree: head.tree.sha, tree } });
  const nc = await ghApi(`/repos/${dest.repo}/git/commits`, { method: "POST", body: { message, tree: nt.sha, parents: [ref.object.sha] } });
  await ghApi(`/repos/${dest.repo}/git/refs/heads/${dest.branch}`, { method: "PATCH", body: { sha: nc.sha } });
  return nc.sha;
}

/* --- 投稿模式（无写权限）：自动 Fork 本仓库到用户账号并创建投稿分支 --- */
let MY_LOGIN = null;
async function ensureForkAndBranch(logSel = "#upLog") {
  if (!MY_LOGIN) MY_LOGIN = (await ghApi("/user")).login;
  const name = REPO.split("/")[1];
  let fork = `${MY_LOGIN}/${name}`;
  try {
    await ghApi(`/repos/${fork}`);
  } catch {
    log(`你的账号还没有本仓库的 Fork，正在创建（约几秒到 1 分钟）…`, logSel);
    let f;
    try {
      f = await ghApi(`/repos/${REPO}/forks`, { method: "POST", body: {} });
    } catch (e) {
      throw new Error(`创建 Fork 失败（${e.message}）。常见原因：Token 的 Repository access 没选 All repositories。可到本仓库页面手动点 Fork 后重试。`);
    }
    fork = f.full_name;
    let ok = false;
    for (let i = 0; i < 60; i++) {
      try { await ghApi(`/repos/${fork}`); ok = true; break; }
      catch { await new Promise((r) => setTimeout(r, 2000)); }
    }
    if (!ok) throw new Error(`Fork 创建超时，请稍后重试，或先手动 Fork 本仓库再投稿`);
  }
  const upstream = await ghApi(`/repos/${REPO}/git/ref/heads/main`);
  const branch = "submit-" + Date.now().toString(36);
  try {
    await ghApi(`/repos/${fork}/git/refs`, { method: "POST", body: { ref: "refs/heads/" + branch, sha: upstream.object.sha } });
  } catch (e) {
    if (String(e.message).startsWith("GitHub API 422")) {
      // 分支名撞车（极小概率）：换一个再试
      const b2 = "submit-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      await ghApi(`/repos/${fork}/git/refs`, { method: "POST", body: { ref: "refs/heads/" + b2, sha: upstream.object.sha } });
      return { repo: fork, branch: b2, owner: MY_LOGIN };
    }
    throw new Error(`在 Fork 中创建投稿分支失败（${e.message}）。若提示 403/404，多半是 Token 的 Repository access 只选了本仓库——投稿需要能访问你自己账号下的 Fork，请重建 Token 选 All repositories。`);
  }
  return { repo: fork, branch, owner: MY_LOGIN };
}

const decodeB64Text = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, "")), (c) => c.charCodeAt(0)));const encodeB64 = (str) => btoa(String.fromCharCode(...new TextEncoder().encode(str)));
const relOf = (v) => String(v || "").trim().replace(/^\/+|\/+$/g, "");
const isDl = (it) => it.urls?.dl && !it.urls?.raw; // Release 通道大文件（不在 git 里）

function log(msg, sel) { const el = $(sel); el.textContent += msg + "\n"; el.scrollTop = el.scrollHeight; }

/* --- 登录 / 权限 --- */
$("#adminLogin").onclick = async () => {
  const token = $("#adminToken").value.trim();
  if (!token) return;
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}`, { headers: auth(token) });
    if (!r.ok) return alert("✗ Token 无效或被撤销（" + r.status + "）");
    CAN_WRITE = !!((await r.json()).permissions || {}).push;
    localStorage.setItem("admin_token", token);
    enterAdmin();
  } catch (e) { alert("网络错误：" + e.message); }
};
$("#adminLogout").onclick = () => { localStorage.removeItem("admin_token"); location.hash = ""; location.reload(); };

async function enterAdmin() {
  $("#adminLoginBox").hidden = true;
  $("#adminPanel").hidden = false;
  // 刷新权限（Token 可能已过期/降权）
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}`, { headers: auth(TOKEN()) });
    CAN_WRITE = r.ok ? !!((await r.json()).permissions || {}).push : false;
  } catch { CAN_WRITE = false; }
  for (let i = 0; i < 100 && !MANIFEST; i++) await new Promise((r) => setTimeout(r, 100));
  $("#adminMsg").hidden = false;
  $("#adminMsg").textContent = CAN_WRITE
    ? "✔ 管理员模式：可上传 / 替换 / 移动 / 删除 / 新建文件夹，单 commit 直接提交到仓库。"
    : "📮 投稿模式：你的 Token 没有仓库写权限，可以在「⬆ 投稿」标签上传资料——系统会自动 Fork 本仓库到你的 GitHub 账号、提交并创建 PR，管理员合并后即上线（约 1 分钟建索引）。删除与文件夹管理仅限管理员。";
  document.querySelector('.tab[data-tab="up"]').textContent = CAN_WRITE ? "⬆ 上传" : "⬆ 投稿";
  document.querySelectorAll('.tab[data-tab="nf"],#fmNewFolder').forEach((el) => (el.style.display = CAN_WRITE ? "" : "none"));
  if (!MANIFEST) return log("索引未加载完成，请稍后刷新", "#fmLog");
  const subs = Object.keys(MANIFEST.subjects);
  $("#fmSubject").innerHTML = `<option value="">全部科目</option>` + subs.map((s) => `<option>${esc(s)}</option>`).join("");
  $("#upSubject").innerHTML = subs.map((s) => `<option>${esc(s)}</option>`).join("");
  $("#mvSubject").innerHTML = subs.map((s) => `<option>${esc(s)}</option>`).join("");
  $("#folderList").innerHTML = [...new Set(MANIFEST.items.filter((x) => x.folder).map((x) => x.subject + "/" + x.folder))]
    .map((f) => `<option value="${esc(f)}">`).join("");
  fmState = { subject: "", folder: "" };
  renderFm();
}

/* --- 标签页 --- */
document.querySelectorAll(".tab").forEach((t) => (t.onclick = () => {
  document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("active", x === t));
  document.querySelectorAll(".tabpane").forEach((p) => (p.hidden = p.id !== "tab-" + t.dataset.tab));
}));

/* --- 文件管理器 --- */
let fmState = { subject: "", folder: "" };
$("#fmSubject").onchange = (e) => { fmState = { subject: e.target.value, folder: "" }; renderFm(); };

function fmList() {
  const prefix = fmState.subject ? fmState.subject + (fmState.folder ? "/" + fmState.folder : "") + "/" : "";
  const dirs = new Map(), files = [];
  for (const it of MANIFEST.items) {
    if (it.type !== "file" || !it.path || !it.path.startsWith(prefix)) continue;
    const rest = it.path.slice(prefix.length);
    if (!rest || rest === ".gitkeep") continue;
    const slash = rest.indexOf("/");
    if (slash === -1) files.push(it);
    else dirs.set(rest.slice(0, slash), true);
  }
  return { dirs: [...dirs.keys()], files };
}

function renderFm() {
  const { dirs, files } = fmList();
  const parts = [fmState.subject, ...fmState.folder.split("/")].filter(Boolean);
  let acc = "";
  $("#fmCrumb").innerHTML =
    `<a data-p="">🏠 全部</a>` +
    parts.map((p) => { acc = acc ? acc + "/" + p : p; return ` <i>/</i> <a data-p="${esc(acc)}">${esc(p)}</a>`; }).join("");
  $("#fmCrumb").querySelectorAll("a").forEach((a) => (a.onclick = () => {
    const p = a.dataset.p;
    if (!p) { fmState = { subject: "", folder: "" }; }
    else { fmState.subject = p.split("/")[0]; fmState.folder = p.includes("/") ? p.slice(fmState.subject.length + 1) : ""; }
    $("#fmSubject").value = fmState.subject;
    renderFm();
  }));
  const ops = (it) => CAN_WRITE
    ? `<span class="fm-ops">
        <button class="fm-op" data-act="mv" data-id="${it.id}">移动/改名</button>
        <button class="fm-op" data-act="rep" data-id="${it.id}">替换</button>
        <button class="fm-op danger" data-act="rm" data-id="${it.id}">删除</button>
      </span>` : "";
  $("#fmList").innerHTML =
    dirs.map((d) => `<div class="fm-row"><span class="fm-ico">📁</span><a class="fm-name" data-dir="${esc(d)}">${esc(d)}</a><span class="fm-meta">文件夹</span></div>`).join("") +
    files.map((it) => {
      const dl = it.urls?.dl && !it.urls?.raw;
      return `<div class="fm-row"><span class="fm-ico">📄</span>
        <span class="fm-name" title="${esc(it.path)}">${esc(it.name)}.${esc(it.ext)}</span>
        <span class="fm-meta">${dl ? `<span class="badge dl">Release ${fmtSize(it.size || 0)}</span>` : fmtSize(it.size || 0)}</span>
        ${ops(it)}</div>`;
    }).join("") || `<div class="empty" style="padding:30px 0">（空目录）</div>`;
}

$("#fmList").addEventListener("click", async (e) => {
  const dir = e.target.dataset.dir;
  if (dir !== undefined && dir !== null) {
    if (!fmState.subject) { fmState.subject = dir; $("#fmSubject").value = dir; }
    else fmState.folder = fmState.folder ? fmState.folder + "/" + dir : dir;
    return renderFm();
  }
  const btn = e.target.closest("[data-act]");
  if (!btn) return;
  const it = MANIFEST.items.find((x) => x.id === btn.dataset.id);
  if (!it) return;
  if (btn.dataset.act === "rm") fmRemove(it);
  else if (btn.dataset.act === "mv") fmMoveDialog(it);
  else if (btn.dataset.act === "rep") fmReplace(it);
});

$("#fmNewFolder").onclick = async () => {
  const name = prompt("新文件夹名称（将在当前目录下创建）：");
  if (!name) return;
  const base = [fmState.subject, fmState.folder].filter(Boolean).join("/");
  await mkdir(base ? `${base}/${name}` : name);
};

async function mkdir(rel, sel = "#fmLog") {
  try {
    await commitChanges([{ op: "put", path: `${rel}/.gitkeep`, content: "" }], `mkdir: ${rel}`);
    log(`✔ 已创建 ${rel}/，索引重建约 1 分钟`, sel);
    renderFm();
  } catch (e) { log("✗ " + e.message, sel); }
}

/* --- 删除 --- */
async function fmRemove(it) {
  const dl = it.urls?.dl && !it.urls?.raw;
  if (!confirm(`确定删除「${it.path}」？${dl ? "（会同时删除 Release 附件）" : "此操作直接提交到仓库。"}`)) return;
  try {
    if (dl) {
      const info = await releaseAssetInfo(it);
      if (info.asset) await ghApi(`/repos/${REPO}/releases/assets/${info.asset.id}`, { method: "DELETE" });
      delete info.map[it.path];
      await saveReleaseMap(info.map, `release: 删除 ${it.path}`);
      log("✔ Release 附件已删除，映射已更新", "#fmLog");
    } else {
      await commitChanges([{ op: "rm", path: it.path }], `delete: ${it.path}`);
      log(`✔ 已删除，索引重建约 1 分钟`, "#fmLog");
    }
    renderFm();
  } catch (e) { log("✗ " + e.message, "#fmLog"); }
}

/* --- 替换 --- */
let fmRepTarget = null;
function fmReplace(it) { fmRepTarget = it; $("#fmFile").click(); }
$("#fmFile").onchange = async (e) => {
  const f = e.target.files[0], it = fmRepTarget;
  e.target.value = "";
  if (!f || !it) return;
  const dl = it.urls?.dl && !it.urls?.raw;
  if (!confirm(`用「${f.name}」替换「${it.path}」？`)) return;
  try {
    log("提交替换中…", "#fmLog");
    if (dl) {
      const info = await releaseAssetInfo(it);
      if (info.asset) await ghApi(`/repos/${REPO}/releases/assets/${info.asset.id}`, { method: "DELETE" });
      const up = await releaseUpload(f, info.rel.id);
      delete info.map[it.path];
      info.map[it.path] = typeof info.meta === "string"
        ? up.browser_download_url
        : { ...info.meta, url: up.browser_download_url, size: up.size };
      await saveReleaseMap(info.map, `release: 替换 ${it.path}`);
      log("✔ Release 附件已替换，索引重建约 1 分钟", "#fmLog");
    } else {
      await commitChanges([{ op: "put", path: it.path, content: await fileB64(f) }], `update: ${it.path}`);
      log(`✔ 替换成功，索引重建约 1 分钟`, "#fmLog");
    }
    renderFm();
  } catch (e) { log("✗ " + e.message, "#fmLog"); }
};

/* --- 移动 / 改名 --- */
let mvItem = null;
function fmMoveDialog(it) {
  mvItem = it;
  const dl = it.urls?.dl && !it.urls?.raw;
  $("#mvFrom").textContent = it.path + (dl ? " · Release 通道大文件，改名会同步修改附件名与下载映射" : " · 可改科目/子文件夹/文件名，单 commit 完成，不限文件大小");
  $("#mvSub").value = it.folder || "";
  $("#mvName").value = it.name + (it.ext && it.ext !== "文件" ? "." + it.ext : "");
  $("#mvSubject").value = it.subject;
  $("#mvLog").textContent = "";
  $("#moveModal").hidden = false;
}
$("#mvOk").onclick = async () => {
  if (!mvItem) return;
  const subject = $("#mvSubject").value;
  const sub = relOf($("#mvSub").value);
  const name = $("#mvName").value.trim();
  if (!name || name.includes("/")) return log("文件名不能为空或含 /", "#mvLog");
  const to = `${subject}${sub ? "/" + sub : ""}/${name}`;
  try {
    if (isDl(mvItem)) {
      // Release 通道：改名同步改附件名 + 更新映射
      const info = await releaseAssetInfo(mvItem);
      if (info.asset && name !== info.asset.name) await ghApi(`/repos/${REPO}/releases/assets/${info.asset.id}`, { method: "PATCH", body: { name } });
      const url = `https://github.com/${REPO}/releases/download/${info.tag}/${name}`;
      delete info.map[mvItem.path];
      info.map[to] = typeof info.meta === "string" ? url : { ...info.meta, url };
      await saveReleaseMap(info.map, `release: ${mvItem.path} 改名为 ${name}`);
      log("✔ Release 附件已改名并更新映射，索引重建约 1 分钟", "#fmLog");
    } else {
      if (to === mvItem.path) { $("#moveModal").hidden = true; return; }
      await commitChanges([{ op: "mv", from: mvItem.path, to }], `move: ${mvItem.path} → ${to}`);
      log(`✔ 已移动到 ${to}，索引重建约 1 分钟`, "#fmLog");
    }
    $("#moveModal").hidden = true;
    renderFm();
  } catch (e) { log("✗ " + e.message, "#mvLog"); }
};

/* --- Release 大文件辅助 --- */
async function releaseAssetInfo(it) {
  const r = await ghApi(`/repos/${REPO}/contents/${encodeURI(".scripts/release-assets.json")}`);
  const map = JSON.parse(decodeB64Text(r.content));
  const meta = map[it.path];
  if (!meta) throw new Error("release-assets.json 中找不到该文件的映射");
  const url = typeof meta === "string" ? meta : meta.url;
  const tag = (url.match(/releases\/download\/([^/]+)\//) || [])[1] || "v1.0";
  const rel = await ghApi(`/repos/${REPO}/releases/tags/${encodeURIComponent(tag)}`);
  const asset = rel.assets.find((a) => a.name === decodeURIComponent(url.split("/").pop()));
  return { map, meta, url, tag, rel, asset };
}
async function saveReleaseMap(map, message) {
  await commitChanges([{ op: "put", path: ".scripts/release-assets.json", content: encodeB64(JSON.stringify(map, null, 2)) }], message);
}
// 附件直传走 uploads.github.com；浏览器可能被 CORS 拦，失败时提示手动到 Release 页上传
async function releaseUpload(file, releaseId) {
  const r = await fetch(`https://uploads.github.com/repos/${REPO}/releases/${releaseId}/assets?name=${encodeURIComponent(file.name)}`, {
    method: "POST", headers: { Authorization: `Bearer ${TOKEN()}` }, body: file,
  });
  if (!r.ok) throw new Error(`Release 附件上传失败（${r.status}）：浏览器直传被拦时请到 GitHub Release 页手动上传`);
  return r.json();
}

/* --- 上传 --- */
let upQueue = []; // {file, rel} rel = 相对目标科目的路径
const drop = $("#dropZone");
drop.onclick = () => $("#upFile").click();
$("#upDirBtn").onclick = () => $("#upDir").click();
drop.ondragover = (e) => { e.preventDefault(); drop.classList.add("over"); };
drop.ondragleave = () => drop.classList.remove("over");
drop.ondrop = (e) => {
  e.preventDefault();
  drop.classList.remove("over");
  addUpFiles([...e.dataTransfer.files].map((f) => ({ f, rel: f.name })));
};
$("#upFile").onchange = (e) => {
  addUpFiles([...e.target.files].map((f) => ({ f, rel: f.name })));
  e.target.value = "";
};
$("#upDir").onchange = (e) => {
  // 整目录上传：保留相对路径；顶层不是已有科目时并入所选科目
  const subs = new Set(Object.keys(MANIFEST?.subjects || {}));
  addUpFiles([...e.target.files].map((f) => {
    const rel = f.webkitRelativePath || f.name;
    if (subs.has(rel.split("/")[0])) return { f, rel };
    return { f, rel: rel.split("/").slice(1).join("/") || f.name };
  }));
  e.target.value = "";
};

function addUpFiles(list) {
  for (const item of list) {
    if (!item.rel || item.rel.split("/").pop() === ".gitkeep") continue;
    if (!upQueue.some((x) => x.rel === item.rel && x.f.size === item.f.size)) upQueue.push(item);
  }
  renderUpList();
}
function renderUpList() {
  const subject = $("#upSubject").value;
  const sub = relOf($("#upSub").value);
  $("#upList").innerHTML = upQueue.map((it, i) => {
    const p = `${subject}${sub ? "/" + sub : ""}/${it.rel}`;
    const dup = MANIFEST?.items?.some((x) => x.path === p);
    return `<div class="up-item">
      <span class="up-path" title="${esc(p)}">${esc(p)}${dup ? ' <b class="badge dl">覆盖已有</b>' : ""}</span>
      <span class="fm-meta">${fmtSize(it.f.size)}</span>
      <button class="fm-op danger" data-i="${i}">✕</button></div>`;
  }).join("") || `<div class="empty" style="padding:14px 0">尚未选择文件</div>`;
  const verb = CAN_WRITE ? "开始上传" : "开始投稿";
  $("#upBtn").textContent = upQueue.length ? `${verb}（${upQueue.length} 个文件）` : verb;
}
$("#upSubject").onchange = renderUpList;
$("#upSub").oninput = renderUpList;
$("#upList").onclick = (e) => {
  const b = e.target.closest("[data-i]");
  if (b) { upQueue.splice(+b.dataset.i, 1); renderUpList(); }
};

$("#upBtn").onclick = async () => {
  if (!upQueue.length) return log("请先拖入或选择文件", "#upLog");
  const subject = $("#upSubject").value;
  const sub = relOf($("#upSub").value);
  const base = `${subject}${sub ? "/" + sub : ""}/`;
  const changes = [];
  for (const { f, rel } of upQueue) changes.push({ op: "put", path: base + rel, content: await fileB64(f) });
  const conflicts = changes.filter((c) => MANIFEST?.items?.some((x) => x.path === c.path));
  if (conflicts.length && !confirm(`以下 ${conflicts.length} 个文件已存在，将被覆盖：\n${conflicts.map((c) => c.path).join("\n")}`)) return;
  try {
    $("#upBtn").disabled = true;
    if (CAN_WRITE) {
      log(`⬆ 打包上传 ${changes.length} 个文件（单 commit）…`, "#upLog");
      await commitChanges(changes, `upload: ${changes.length} 个文件到 ${base}`);
      log("✔ 上传成功，索引重建约 1 分钟后生效", "#upLog");
    } else {
      log(`⬆ 打包投稿 ${changes.length} 个文件（自动 Fork + PR）…`, "#upLog");
      const dest = await ensureForkAndBranch("#upLog");
      await commitChanges(changes, `投稿: ${changes.length} 个文件到 ${base}`, dest);
      const files = changes.map((c) => `- ${c.path}`).join("\n");
      const pr = await ghApi(`/repos/${REPO}/pulls`, {
        method: "POST",
        body: {
          title: `投稿：${changes.length} 个文件到 ${base.replace(/\/$/, "")}`,
          head: `${dest.owner}:${dest.branch}`,
          base: "main",
          body: `通过网站管理台投稿。\n\n## 文件清单\n${files}\n\n- [ ] 文件放进了正确的科目文件夹\n- [ ] 文件名无特殊字符\n- [ ] 遵守版权红线：只上传有权分享的学习资料`,
        },
      });
      log(`✔ 投稿成功！已自动创建 PR：\n${pr.html_url}\n等管理员合并后即可在网站看到；合并前可在你的 Fork 同一分支继续 commit 补充，会自动并入这个 PR。`, "#upLog");
    }
    upQueue = [];
    renderUpList();
  } catch (e) { log("✗ " + e.message, "#upLog"); }
  finally { $("#upBtn").disabled = false; }
};

/* --- 新建文件夹 --- */
$("#nfBtn").onclick = async () => {
  const p = relOf($("#nfPath").value), name = $("#nfName").value.trim();
  if (!name || name.includes("/")) return log("请填写合法的文件夹名（不含 /）", "#nfLog");
  await mkdir(p ? `${p}/${name}` : name, "#nfLog");
};


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
