/* ===== CSU 学习资源库 · 前端逻辑 ===== */
const REPO = "xyqmbyl/study-resources";
const $ = (sel) => document.querySelector(sel);
const state = { type: "all", folder: "", q: "", open: new Set() };
let MANIFEST = null, FUSE = null, TREE = null;

// 顶级科目：文件取路径首段（兼容旧 manifest 的 subject=父文件夹名），链接/书用 subject 字段
const topOf = (it) => (it.type === "file" && it.path ? it.path.split("/")[0] : it.subject || "其他");
const underFolder = (it, folder) =>
  it.type === "file" && it.path
    ? it.path === folder || it.path.startsWith(folder + "/") || (folder === "其他" && !it.path.includes("/"))
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
    if (!segs.length) segs.push("其他"); // 根目录散落文件归入「其他」，目录树里也要能看到
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
// 点击弹层外的空白遮罩关闭（拖拽中因指针被行捕获，松手在遮罩上也不会误关）
document.getElementById("navModal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("navModal")) document.getElementById("navModal").hidden = true;
});
// 拖拽磁吸排序：按住 ⠿ 上下拖，经过相邻行时整行让位（带过渡动画），松手落位；
// 指针接近弹窗可视区上下边缘时自动滚动，落点计算包含滚动量
(() => {
  const list = document.getElementById("navCustList");
  const box = document.querySelector("#navModal .modal-box"); // 实际滚动容器
  let row = null, startY = 0, startScroll = 0, h = 0, target = 0, curY = 0, raf = 0;
  const rows = () => [...list.children];
  const update = () => {
    if (!row) return;
    const dy = curY - startY + (box.scrollTop - startScroll); // 滚动量计入拖拽距离
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
  };
  // 指针停在边缘附近也要持续滚动，用 rAF 循环驱动
  const tick = () => {
    if (!row) return;
    const rect = box.getBoundingClientRect();
    const edge = 44;
    let v = 0;
    if (curY < rect.top + edge) v = -Math.min(14, (rect.top + edge - curY) * 0.4);
    else if (curY > rect.bottom - edge) v = Math.min(14, (curY - (rect.bottom - edge)) * 0.4);
    if (v) { box.scrollTop += v; update(); }
    raf = requestAnimationFrame(tick);
  };
  list.addEventListener("pointerdown", (e) => {
    const handle = e.target.closest(".drag-handle");
    if (!handle) return;
    e.preventDefault();
    row = e.target.closest(".navcust-row");
    startY = curY = e.clientY;
    startScroll = box.scrollTop;
    h = row.offsetHeight;
    target = rows().indexOf(row);
    row.classList.add("dragging");
    row.setPointerCapture(e.pointerId);
    raf = requestAnimationFrame(tick);
  });
  list.addEventListener("pointermove", (e) => {
    if (!row) return;
    curY = e.clientY;
    update();
  });
  const end = () => {
    if (!row) return;
    cancelAnimationFrame(raf);
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
  if (!hit.length) return FUSE.search(q).map((r) => r.item);
  // 相关性排序：文件名含完整查询 > 文件名含全部词元 > 仅科目/拼音等元数据命中；同分保持原有时间倒序（sort 稳定）
  const score = (it) => {
    const n = (it.name || "").toLowerCase();
    if (toks.every((t) => n.includes(t))) return n.includes(q) ? 3 : 2;
    return 1;
  };
  return hit.sort((a, b) => score(b) - score(a));
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
  // 下载中的 ✕ = 取消下载：中止当前请求
  if (e.target.closest(".dl-x")) {
    if (a._dlCtrl) { a._dlCtrl.__user = true; a._dlCtrl.abort(); }
    return;
  }
  if (a.dataset.busy) return;
  a.dataset.busy = "1";
  const name = a.dataset.name || decodeURIComponent(((a.href || "").split("/").pop() || "").split("?")[0]) || "download";
  const orig = a.innerHTML;
  // 迷你进度显示：直接画在按钮上（文字 + 底色填充 + 取消小叉号），不占卡片额外空间
  const fmtMB = (b) => b >= 1048576 ? (b / 1048576).toFixed(1) + "MB" : Math.max(1, Math.round(b / 1024)) + "KB";
  const fmtSpd = (s) => s >= 1048576 ? (s / 1048576).toFixed(1) + "MB/s" : Math.max(1, Math.round(s / 1024)) + "KB/s";
  const paint = (got, total, bps) => {
    a.style.fontSize = "11.5px";
    a.style.whiteSpace = "nowrap";
    a.style.overflow = "hidden";
    const txt = total
      ? `${Math.min(100, Math.round((got / total) * 100))}% ${fmtSpd(bps)}`
      : `${fmtMB(got)} ${fmtSpd(bps)}`;
    if (total) {
      const pct = Math.min(100, Math.round((got / total) * 100));
      a.style.backgroundImage = `linear-gradient(90deg, rgba(0,0,0,.22) ${pct}%, rgba(255,255,255,.18) ${pct}%)`;
    }
    a.innerHTML = `<span class="dl-t">${txt}</span><span class="dl-x" title="取消下载">✕</span>`;
  };
  const resetPaint = () => { a.innerHTML = orig; a.style.backgroundImage = ""; a.style.fontSize = ""; a.style.whiteSpace = ""; a.style.overflow = ""; };
  const saveBlob = (blob) => {
    const objUrl = URL.createObjectURL(blob);
    const tmp = document.createElement("a");
    tmp.href = objUrl;
    tmp.download = name;
    document.body.appendChild(tmp);
    tmp.click();
    tmp.remove();
    setTimeout(() => URL.revokeObjectURL(objUrl), 60000);
  };
  // 级联线路：主链接 → data-alts 里的备用线路，全失败才开新页面
  let candidates = [a.href];
  try { for (const x of JSON.parse(a.dataset.alts || "[]")) if (x && !candidates.includes(x)) candidates.push(x); } catch (err2) {}
  let ok = false, cancelled = false;
  a.style.fontSize = "11.5px"; a.style.whiteSpace = "nowrap"; a.style.overflow = "hidden";
  a.innerHTML = `<span class="dl-t">连接中…</span><span class="dl-x" title="取消下载">✕</span>`;
  // 每条线路给 20 秒首字节超时（线路被墙时常表现为长时间无响应），
  // 响应头到达后解除超时，慢线路（如代理几百 KB/s）也能完整下完
  for (const u2 of candidates) {
    const ctrl = new AbortController();
    a._dlCtrl = ctrl;
    const timer = setTimeout(() => ctrl.abort(), 20000);
    try {
      const resp = await fetch(u2, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      // 流式读取以显示进度；无流接口时退回整块 blob
      const total = +resp.headers.get("content-length") || 0;
      if (resp.body && resp.body.getReader) {
        const reader = resp.body.getReader();
        const chunks = []; let got = 0; const t0 = performance.now(); let lastPaint = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value); got += value.length;
          const now = performance.now();
          if (now - lastPaint > 150) { lastPaint = now; paint(got, total, got / Math.max(0.05, (now - t0) / 1000)); }
        }
        saveBlob(new Blob(chunks));
      } else {
        saveBlob(await resp.blob());
      }
      ok = true;
      break;
    } catch (err) {
      clearTimeout(timer);
      // 用户点了 ✕：不再换线路，直接退出
      if (ctrl.signal.aborted && ctrl.__user) { cancelled = true; break; }
      /* 否则换下一条线路 */
    }
  }
  resetPaint();
  if (!ok && !cancelled) window.open(candidates[0], "_blank", "noopener");
  delete a.dataset.busy;
});

function cardHTML(it) {
  if (it.type === "link") return videoCard(it);
  if (it.type === "book") return bookCard(it);
  return fileCard(it);
}

// 可在线预览的类型：PDF/图片/文本代码由访客浏览器原生渲染（iframe 直接加载）；
// Word/PPT 走微软 Office Web Viewer（服务器端抓取公开 URL 渲染，对所有访客可用）
const PREVIEW_EXT = new Set(["pdf", "doc", "docx", "ppt", "pptx"]);
// 图片 / 音视频：浏览器 iframe 原生渲染
const IMG_EXT = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "ico", "avif", "mp4", "webm", "mp3", "wav", "ogg", "flac"]);
// 纯文本 / 代码：iframe 按 text/plain 渲染
const TEXT_EXT = new Set(["txt", "md", "log", "json", "csv", "tsv", "cpp", "c", "cc", "cxx", "h", "hpp", "py", "java", "js", "ts", "css", "html", "htm", "xml", "yml", "yaml", "sh", "bat", "ps1", "sql", "ini", "toml", "conf"]);
const canPreview = (ext) => PREVIEW_EXT.has(ext) || IMG_EXT.has(ext) || TEXT_EXT.has(ext);
// blob 预览时给 Blob 指定 MIME，否则图片/文本会被浏览器当二进制流下载而非渲染
const MIME_BY_EXT = { pdf: "application/pdf", svg: "image/svg+xml", jpg: "image/jpeg", jpeg: "image/jpeg" };
const previewMime = (ext) => MIME_BY_EXT[ext] || (IMG_EXT.has(ext) ? `image/${ext}` : (TEXT_EXT.has(ext) ? "text/plain" : ""));

function fileCard(it) {
  const u = it.urls || {};
  const dl = u.dl || u.jsd || u.proxy || u.raw || "#";
  const purl = u.jsd || u.jsd2 || u.raw;
  // Office 文件由微软服务器抓取源 URL 渲染：jsDelivr 源偶尔被微软拒收（An error occurred），raw 最稳；
  // PDF 是访客浏览器直接加载 iframe：jsDelivr 国内可达优先；>20MB 无 jsd，raw 国内常被墙，
  // 改为点击后经级联代理线路 fetch 成 blob 再渲染（data-blob），保证国内访客也能预览大 PDF
  const isOffice = ["doc", "docx", "ppt", "pptx"].includes(it.ext);
  // PDF 无 jsDelivr 线路（>20MB）时不给 iframe 源，强制走下方 data-blob 级联
  const ourl = isOffice ? (u.raw || purl) : (u.jsd || u.jsd2);
  const ou = ourl ? officeUrls(it.ext, ourl) : null;
  // 仅 git 内文件（有 raw 线路）可 blob 预览：代理线路对 Release 附件不带 CORS 头，页面内 fetch 会被拦
  const blobAlts = !isOffice && !u.jsd && u.raw
    ? JSON.stringify([u.proxy, u.proxy2, u.raw].filter(Boolean)) : "";
  // manifest 的 name 是去扩展名的 stem，落盘必须带真实扩展名，否则浏览器会按二进制流补 .txt
  const fname = it.ext && it.name && !it.name.toLowerCase().endsWith("." + it.ext)
    ? `${it.name}.${it.ext}` : (it.name || "file");
  const read = canPreview(it.ext) && (ou || blobAlts)
    ? `<a class="btn-read" href="javascript:void(0)" data-preview="1"${ou ? ` data-embed="${esc(ou.embed)}" data-view="${esc(ou.view)}"` : ` data-blob="${esc(blobAlts)}" data-mime="${esc(previewMime(it.ext))}" data-fname="${esc(fname)}"`} data-title="${esc(it.name || "")}">在线预览</a>` : "";
  // Release 通道链接自带附件头可直接下；jsd/proxy/raw 是跨域的，download 属性无效，交给统一 blob 下载（级联线路）
  const dlCh = u.dl && !u.raw;
  // 级联顺序：gcore（jsDelivr 备用域，cdn 被限流/污染时通常可达且快）→ ghfast 代理 → ghproxy.net 代理 → raw
  const alts = JSON.stringify([u.jsd2, u.proxy, u.proxy2, u.raw].filter(Boolean));
  const dlAttrs = dlCh ? `target="_blank" rel="noopener"` : `download data-dl="1" data-name="${esc(fname)}" data-alts='${esc(alts)}'`;
  const altAttrs = dlCh ? `download` : `download data-dl="1" data-name="${esc(fname)}" data-alts='${esc(alts)}'`;
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

/* ---------- 文档在线预览 ---------- */
// Word/PPT 由微软 Office Web Viewer 渲染：embed 供弹层 iframe 内嵌，view 供「新窗口打开」；
// 微软服务器端抓取文件公开 URL，访客浏览器无需直接访问仓库，所有人可用。PDF 由浏览器原生渲染。
function officeUrls(ext, url) {
  if (["doc", "docx", "ppt", "pptx"].includes(ext)) {
    return {
      embed: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`,
      view: `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`,
    };
  }
  return { embed: url, view: url }; // PDF
}
window.openPreview = (embed, view, title) => {
  $("#previewTitle").textContent = title || "文档预览";
  $("#previewOpen").href = view || embed;
  $("#previewFrame").src = embed;
  $("#previewModal").hidden = false;
  document.body.style.overflow = "hidden";
};
// 大文件（>20MB 无 jsDelivr 线路的 PDF/图片/文本）预览：raw 直连国内常被墙导致 iframe 白屏，
// 改为经级联代理线路（与下载同一套备用线路）fetch 成 blob 再交给 iframe 渲染；
// mime 交给 Blob 以便 iframe 正确渲染，fname 用于「新窗口打开」时的落盘文件名
let _previewBlobUrl = "";
window.openBlobPreview = async (title, urls, mime, fname) => {
  $("#previewTitle").textContent = `${title || "文档预览"}（加载中…）`;
  $("#previewOpen").href = "#";
  $("#previewFrame").src = "about:blank";
  $("#previewModal").hidden = false;
  document.body.style.overflow = "hidden";
  const fmtMB = (b) => b >= 1048576 ? (b / 1048576).toFixed(1) + "MB" : Math.max(1, Math.round(b / 1024)) + "KB";
  for (const u of urls) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000); // 首字节 20 秒超时，同下载级联
    try {
      const resp = await fetch(u, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const total = +resp.headers.get("content-length") || 0;
      let blob;
      if (resp.body && resp.body.getReader) {
        const reader = resp.body.getReader();
        const chunks = []; let got = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value); got += value.length;
          const pct = total ? ` ${Math.round((got / total) * 100)}%` : "";
          $("#previewTitle").textContent = `${title || "文档预览"}（加载中${pct}）`;
        }
        blob = new Blob(chunks, mime ? { type: mime } : undefined);
      } else {
        blob = await resp.blob();
      }
      if (_previewBlobUrl) URL.revokeObjectURL(_previewBlobUrl);
      _previewBlobUrl = URL.createObjectURL(blob);
      $("#previewTitle").textContent = title || "文档预览";
      $("#previewOpen").href = _previewBlobUrl;
      $("#previewOpen").download = fname || title || "document.pdf";
      $("#previewFrame").src = _previewBlobUrl;
      return;
    } catch (err) { clearTimeout(timer); /* 换下一条线路 */ }
  }
  $("#previewTitle").textContent = `${title || "文档预览"}（加载失败，请下载后查看）`;
};
window.closePreview = () => {
  $("#previewModal").hidden = true; $("#previewFrame").src = "about:blank"; document.body.style.overflow = "";
  if (_previewBlobUrl) { URL.revokeObjectURL(_previewBlobUrl); _previewBlobUrl = ""; }
};
$("#previewModal").onclick = (e) => { if (e.target.id === "previewModal") closePreview(); };
// 事件委托：文件卡是动态渲染的，统一在 document 上接管预览按钮点击
document.addEventListener("click", (e) => {
  const a = e.target.closest("[data-preview]");
  if (!a) return;
  e.preventDefault();
  if (a.dataset.blob) openBlobPreview(a.dataset.title, JSON.parse(a.dataset.blob || "[]"), a.dataset.mime, a.dataset.fname);
  else openPreview(a.dataset.embed, a.dataset.view, a.dataset.title);
});

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
// 远端 main 在读取 HEAD 与写入之间被并发推进（如 Actions 重建索引）时会 422
// "not a fast forward"，此处自动重读 HEAD 重试（blob sha 内容寻址，可直接复用）
async function commitChanges(changes, message, dest = { repo: REPO, branch: "main" }) {
  for (let attempt = 1; ; attempt++) {
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
    try {
      await ghApi(`/repos/${dest.repo}/git/refs/heads/${dest.branch}`, { method: "PATCH", body: { sha: nc.sha } });
      return nc.sha;
    } catch (e) {
      // HEAD 被并发推进：基于最新 HEAD 重来，最多 3 次
      if (attempt < 3 && String(e.message).startsWith("GitHub API 422")) continue;
      throw e;
    }
  }
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
  // 刷新后恢复上次的管理台位置：科目/文件夹/标签页/列表滚动
  const lastFm = UISAVE.fm || {};
  fmState = { subject: lastFm.subject || "", folder: lastFm.folder || "" };
  $("#fmSubject").value = fmState.subject;
  const lastTab = document.querySelector(`.tab[data-tab="${UISAVE.tab || "fm"}"]`);
  if (lastTab) lastTab.click();
  renderFm();
  $("#fmList").scrollTop = UISAVE.fmY || 0;
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
  // manifest.dirs：索引生成的目录清单，补上只有 .gitkeep 占位符的空文件夹
  for (const d of MANIFEST.dirs || []) {
    if (!d.startsWith(prefix)) continue;
    const rest = d.slice(prefix.length);
    if (rest && !rest.includes("/")) dirs.set(rest, true);
  }
  return { dirs: [...dirs.keys()], files };
}

function renderFm() {
  const { dirs, files } = fmList();
  fmSel.clear(); fmSelAnchor = null;
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
  const base = [fmState.subject, fmState.folder].filter(Boolean).join("/");
  const ops = (it) => CAN_WRITE
    ? `<span class="fm-ops">
        <button class="fm-op" data-act="mv" data-id="${it.id}">移动/改名</button>
        <button class="fm-op" data-act="rep" data-id="${it.id}">替换</button>
        <button class="fm-op danger" data-act="rm" data-id="${it.id}">删除</button>
      </span>` : "";
  $("#fmList").innerHTML =
    dirs.map((d) => {
      const p = base ? `${base}/${d}` : d;
      return `<div class="fm-row" draggable="true" data-type="dir" data-dir="${esc(d)}" data-key="d:${esc(p)}"><span class="fm-ico">📁</span><span class="fm-name" title="${esc(p)}">${esc(d)}</span><span class="fm-meta">文件夹</span></div>`;
    }).join("") +
    files.map((it) => {
      const dl = it.urls?.dl && !it.urls?.raw;
      return `<div class="fm-row" draggable="true" data-type="file" data-id="${it.id}" data-key="f:${esc(it.path)}"><span class="fm-ico">📄</span>
        <span class="fm-name" title="${esc(it.path)}">${esc(it.name)}.${esc(it.ext)}</span>
        <span class="fm-meta">${dl ? `<span class="badge dl">Release ${fmtSize(it.size || 0)}</span>` : fmtSize(it.size || 0)}</span>
        ${ops(it)}</div>`;
    }).join("") || `<div class="empty" style="padding:30px 0">（空目录）</div>`;
  paintSel();
}

/* --- 多选（Windows 资源管理器语义：单击选中、Ctrl 加减选、Shift 范围、Ctrl+A 全选、Esc 清空） --- */
const fmSel = new Set(); // 行标识："d:目录全路径" / "f:文件path"
let fmSelAnchor = null;
let fmMultiMode = false; // 多选模式：单击即加选/减选，无需按住 Ctrl（触控板 Ctrl+click 易失灵的兜底）
let fmSelDone = 0; // 鼠标已在 pointerdown 完成选中，click 里跳过（防止拖拽吞掉 click 导致选不中）
let fmPendKey = null; // pointerdown 命中已选中行：暂不收起选区，等未拖动的 click 再收起/反选（这样拖起任一选中行都是整组拖动）
let fmPendToggle = false;

function paintSel() {
  $("#fmList").querySelectorAll(".fm-row").forEach((r) => r.classList.toggle("sel", fmSel.has(r.dataset.key)));
}

// 选区 → 操作项：文件返回 manifest 条目，文件夹展开为 {__dir: 路径}
function fmSelItems() {
  const out = [];
  for (const r of $("#fmList").querySelectorAll(".fm-row.sel")) {
    if (r.dataset.type === "dir") out.push({ __dir: r.dataset.key.slice(2) });
    else {
      const it = MANIFEST.items.find((x) => x.id === r.dataset.id);
      if (it) out.push(it);
    }
  }
  return out;
}

// Windows 语义选中：mousedown 即生效（真实资源管理器就是按下就选中，
// 这样轻微手抖触发拖拽也不会吞掉选中）
function fmSelApply(e, row) {
  const key = row.dataset.key;
  if (e.shiftKey && fmSelAnchor) {
    const rows = [...$("#fmList").querySelectorAll(".fm-row")];
    const i1 = rows.findIndex((r) => r.dataset.key === fmSelAnchor), i2 = rows.indexOf(row);
    if (i1 >= 0 && i2 >= 0) {
      if (!e.ctrlKey && !e.metaKey) fmSel.clear();
      for (let i = Math.min(i1, i2); i <= Math.max(i1, i2); i++) fmSel.add(rows[i].dataset.key);
    }
  } else if (e.ctrlKey || e.metaKey || fmMultiMode) {
    if (fmSel.has(key)) fmSel.delete(key); else fmSel.add(key);
    fmSelAnchor = key;
  } else {
    fmSel.clear(); fmSel.add(key); fmSelAnchor = key;
  }
  paintSel();
  fmSelDone = Date.now();
}

// 鼠标按下：先选中，再让浏览器决定是点击还是拖拽
$("#fmList").addEventListener("pointerdown", (e) => {
  if (e.pointerType !== "mouse") return;
  const row = e.target.closest(".fm-row");
  if (!row || e.target.closest("[data-act]")) return;
  if (e.button === 2 && fmSel.has(row.dataset.key)) return; // 右键已选中项：保留整个选区
  if (e.button === 0 && !e.shiftKey && fmSel.has(row.dataset.key)) {
    // 已选中行：先保留整个选区（Windows 语义，支持整组拖动），未拖动的 click 再收起/反选
    fmPendKey = row.dataset.key;
    fmPendToggle = e.ctrlKey || e.metaKey || fmMultiMode;
    fmSelDone = Date.now();
    return;
  }
  if (e.button === 0 || e.button === 2) fmSelApply(e, row);
});

$("#fmList").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-act]");
  if (btn) {
    const it = MANIFEST.items.find((x) => x.id === btn.dataset.id);
    if (it) {
      if (btn.dataset.act === "rm") fmRemove(it);
      else if (btn.dataset.act === "mv") fmMoveDialog(it);
      else if (btn.dataset.act === "rep") fmReplace(it);
    }
    return;
  }
  if (fmPendKey) { // pointerdown 时命中已选中行：未拖动才走到这里，收起/反选
    const key = fmPendKey;
    fmPendKey = null;
    if (Date.now() - fmSelDone < 500) {
      if (fmPendToggle) { if (fmSel.has(key)) fmSel.delete(key); }
      else { fmSel.clear(); fmSel.add(key); fmSelAnchor = key; }
      paintSel();
    }
    return;
  }
  if (Date.now() - fmSelDone < 500) return; // 鼠标选中已在 pointerdown 处理
  const row = e.target.closest(".fm-row");
  if (!row) { fmSel.clear(); fmSelAnchor = null; paintSel(); return; }
  fmSelApply(e, row); // 触摸/笔等无 pointerdown 选中路径的输入
});

// 双击：进入文件夹 / 打开文件（Windows 语义）
$("#fmList").addEventListener("dblclick", (e) => {
  if (e.target.closest("[data-act]")) return;
  const row = e.target.closest(".fm-row");
  if (!row) return;
  if (row.dataset.type === "dir") return fmEnterDir(row.dataset.dir);
  const it = MANIFEST.items.find((x) => x.id === row.dataset.id);
  if (it) {
    const u = it.urls || {};
    const url = u.jsd || u.jsd2 || u.raw || u.dl;
    if (url) window.open(url, "_blank");
  }
});

function fmEnterDir(d) {
  if (!fmState.subject) { fmState.subject = d; $("#fmSubject").value = d; }
  else fmState.folder = fmState.folder ? fmState.folder + "/" + d : d;
  renderFm();
}

/* --- 键盘快捷键（仅文件管理 tab 生效，输入框聚焦时不拦截） --- */
window.addEventListener("keydown", (e) => {
  if ($("#tab-fm").hidden) return;
  const t = e.target;
  if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
  if (!$("#moveModal").hidden || !$("#previewModal").hidden) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
    e.preventDefault();
    for (const r of $("#fmList").querySelectorAll(".fm-row")) fmSel.add(r.dataset.key);
    paintSel();
  } else if (e.key === "Escape") {
    fmSel.clear(); fmSelAnchor = null; paintSel(); hideCtx();
  } else if (e.key === "Delete" && CAN_WRITE) {
    const items = fmSelItems();
    if (items.length) fmDeleteItems(items);
  } else if (e.key === "F2" && CAN_WRITE) {
    const items = fmSelItems();
    if (items.length === 1 && !items[0].__dir) fmMoveDialog(items[0]);
  }
});

/* --- 橡皮筋框选（空白处按下拖出选框，与行矩形求交；仅鼠标；左键=替换选区，Ctrl+左键=加选，右键拖=选完弹菜单） --- */
let fmRubberEnd = 0;
let fmRightDrag = false; // 右键刚拖完框选：吞掉随之而来的 contextmenu，改为弹选区菜单
$("#fmList").addEventListener("pointerdown", (e) => {
  if (e.pointerType !== "mouse" || (e.button !== 0 && e.button !== 2)) return;
  if (e.target.closest(".fm-row")) return;
  const list = $("#fmList");
  const listRect = list.getBoundingClientRect();
  const sx = e.clientX, sy = e.clientY, btn = e.button;
  if (btn === 0 && !e.ctrlKey) { fmSel.clear(); fmSelAnchor = null; paintSel(); } // 左键空白按下=清除（Windows 语义）
  const baseSel = new Set(fmSel);
  let box = null;
  const onMove = (ev) => {
    if (!box) {
      if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
      box = document.createElement("div");
      box.id = "fmRubber";
      list.appendChild(box);
    }
    const x1 = Math.min(sx, ev.clientX), y1 = Math.min(sy, ev.clientY);
    const x2 = Math.max(sx, ev.clientX), y2 = Math.max(sy, ev.clientY);
    Object.assign(box.style, {
      left: x1 - listRect.left + list.scrollLeft + "px",
      top: y1 - listRect.top + list.scrollTop + "px",
      width: x2 - x1 + "px", height: y2 - y1 + "px",
    });
    if (btn === 0 && !ev.ctrlKey) { fmSel.clear(); for (const k of baseSel) fmSel.add(k); }
    for (const r of list.querySelectorAll(".fm-row")) {
      const b = r.getBoundingClientRect();
      if (b.right > x1 && b.left < x2 && b.bottom > y1 && b.top < y2) fmSel.add(r.dataset.key);
      else if (btn === 0 && !ev.ctrlKey && !baseSel.has(r.dataset.key)) fmSel.delete(r.dataset.key);
    }
    paintSel();
  };
  const onUp = (ev) => {
    window.removeEventListener("pointermove", onMove);
    if (!box) return;
    box.remove();
    fmRubberEnd = Date.now();
    if (btn === 2) { // 右键拖选：松手弹菜单（同 Windows 右键拖动）
      fmRightDrag = true;
      setTimeout(() => (fmRightDrag = false), 600);
      if (CAN_WRITE) fmCtxShow(ev.clientX, ev.clientY);
    }
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp, { once: true });
});

/* --- 右键菜单 --- */
const ctxMenu = document.createElement("div");
ctxMenu.id = "ctxMenu";
ctxMenu.hidden = true;
document.body.appendChild(ctxMenu);
let ctxItems = [];
const hideCtx = () => { ctxMenu.hidden = true; };

function showCtx(items, x, y) {
  ctxItems = items;
  ctxMenu.innerHTML = items.map((it, i) =>
    it === "-" ? `<div class="ctx-sep"></div>` :
    `<button class="ctx-i${it.danger ? " danger" : ""}" data-ci="${i}">${esc(it.label)}${it.hint ? `<span class="ctx-hint">${esc(it.hint)}</span>` : ""}</button>`
  ).join("");
  ctxMenu.hidden = false;
  const r = ctxMenu.getBoundingClientRect();
  ctxMenu.style.left = Math.max(4, Math.min(x, innerWidth - r.width - 6)) + "px";
  ctxMenu.style.top = Math.min(y, innerHeight - r.height - 6) + "px";
}
ctxMenu.addEventListener("click", (e) => {
  const b = e.target.closest("[data-ci]");
  if (!b) return;
  const fn = ctxItems[+b.dataset.ci]?.fn;
  hideCtx();
  fn && fn();
});
document.addEventListener("click", hideCtx);
window.addEventListener("blur", hideCtx);
window.addEventListener("resize", hideCtx);
window.addEventListener("scroll", hideCtx, true);
document.addEventListener("contextmenu", (e) => { if (!e.target.closest("#fmList")) hideCtx(); });

// 按当前选区构建并显示右键菜单：多选→批量操作；单选→单项操作；空白→目录菜单
function fmCtxShow(x, y) {
  const sel = fmSelItems();
  const items = [];
  if (sel.length > 1) {
    items.push(
      { label: `移动 ${sel.length} 项…`, fn: () => fmBatchMoveDialog(sel) },
      { label: `删除 ${sel.length} 项`, hint: "Del", danger: true, fn: () => fmDeleteItems(sel) },
    );
  } else if (sel.length === 1) {
    const want = sel[0].__dir ? `d:${sel[0].__dir}` : `f:${sel[0].path}`;
    const row = [...$("#fmList").querySelectorAll(".fm-row")].find((r) => r.dataset.key === want);
    if (row && row.dataset.type === "dir") {
      const p = row.dataset.key.slice(2);
      items.push(
        { label: "进入", fn: () => fmEnterDir(row.dataset.dir) },
        { label: "在此文件夹内新建文件夹", fn: () => fmNewFolderAt(p) },
        "-",
        { label: "移动到…", fn: () => fmBatchMoveDialog([{ __dir: p }]) },
        "-",
        { label: `删除文件夹（含全部内容）`, danger: true, fn: () => fmDeleteItems([{ __dir: p }]) },
      );
    } else if (sel[0].path) {
      const it = sel[0];
      if (!isDl(it)) items.push({ label: "打开 / 预览", fn: () => { const u = it.urls || {}; const url = u.jsd || u.jsd2 || u.raw || u.dl; url && window.open(url, "_blank"); } });
      items.push({ label: "移动 / 改名", hint: "F2", fn: () => fmMoveDialog(it) });
      if (!isDl(it)) items.push({ label: "替换…", fn: () => fmReplace(it) });
      items.push("-", { label: "删除", hint: "Del", danger: true, fn: () => fmDeleteItems([it]) });
    }
  } else {
    items.push(
      { label: "新建文件夹", fn: () => fmNewFolderAt([fmState.subject, fmState.folder].filter(Boolean).join("/")) },
      { label: "上传文件到当前目录…", fn: () => fmUpFile.click() },
      "-",
      { label: "全选", hint: "Ctrl+A", fn: () => { for (const r of $("#fmList").querySelectorAll(".fm-row")) fmSel.add(r.dataset.key); paintSel(); } },
      { label: "刷新", hint: "F5 也行", fn: () => renderFm() },
    );
  }
  if (items.length) showCtx(items, x, y);
}

$("#fmList").addEventListener("contextmenu", (e) => {
  if (!CAN_WRITE) return;
  e.preventDefault();
  e.stopPropagation();
  if (fmRightDrag) return; // 右键拖选松手时已弹过菜单（onUp 里）
  const row = e.target.closest(".fm-row");
  if (row && !(fmSel.size > 1 && fmSel.has(row.dataset.key))) {
    fmSel.clear();
    fmSel.add(row.dataset.key);
    fmSelAnchor = row.dataset.key;
    paintSel();
  }
  fmCtxShow(e.clientX, e.clientY);
});

// 右键菜单专用的多文件上传入口（选择后直接提交到当前目录，单 commit）
const fmUpFile = document.createElement("input");
fmUpFile.type = "file";
fmUpFile.multiple = true;
fmUpFile.hidden = true;
document.body.appendChild(fmUpFile);
fmUpFile.onchange = () => { fmUploadFiles([...fmUpFile.files]); fmUpFile.value = ""; };

/* --- 拖拽移动（HTML5 DnD）：行拖到文件夹/面包屑 = 批量移动；OS 外部文件拖入 = 上传 --- */
const clearDropHover = () => document.querySelectorAll(".drop-hover").forEach((x) => x.classList.remove("drop-hover"));

$("#fmList").addEventListener("dragstart", (e) => {
  const row = e.target.closest(".fm-row");
  if (!row || !CAN_WRITE) { e.preventDefault(); return; }
  fmPendKey = null; // 拖动已选中行：保留整个选区一起拖
  if (!fmSel.has(row.dataset.key)) { fmSel.clear(); fmSel.add(row.dataset.key); fmSelAnchor = row.dataset.key; paintSel(); }
  e.dataTransfer.setData("application/x-fm", "1");
  e.dataTransfer.setData("text/plain", "fm-selection");
  e.dataTransfer.effectAllowed = "move";
  $("#fmList").querySelectorAll(".fm-row.sel").forEach((r) => r.classList.add("dragging"));
  const n = $("#fmList").querySelectorAll(".fm-row.sel").length;
  if (n > 1) { // 默认拖影只有按下那一行，加个数量幽灵提示整组在拖
    const ghost = document.createElement("div");
    ghost.textContent = `📦 移动 ${n} 项`;
    ghost.style.cssText = "position:fixed;top:-200px;left:0;padding:5px 12px;border-radius:6px;background:var(--accent);color:#fff;font-size:13px";
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 12, 12);
    setTimeout(() => ghost.remove(), 0);
  }
});
$("#fmList").addEventListener("dragend", () => {
  fmPendKey = null;
  $("#fmList").querySelectorAll(".dragging").forEach((r) => r.classList.remove("dragging"));
  clearDropHover();
});
$("#fmList").addEventListener("dragover", (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  clearDropHover();
  const row = e.target.closest('.fm-row[data-type="dir"]');
  if (row) row.classList.add("drop-hover");
  else if (e.dataTransfer.types.includes("Files")) $("#fmList").classList.add("drop-hover");
});
$("#fmList").addEventListener("drop", (e) => {
  e.preventDefault();
  clearDropHover();
  const row = e.target.closest('.fm-row[data-type="dir"]');
  const dest = row ? row.dataset.key.slice(2) : fmState.subject || fmState.folder ? [fmState.subject, fmState.folder].filter(Boolean).join("/") : "";
  if ([...e.dataTransfer.types].includes("application/x-fm")) {
    const items = fmSelItems();
    if (items.length) fmDoMove(items, dest);
  } else if (e.dataTransfer.files.length) {
    fmUploadFiles([...e.dataTransfer.files], dest);
  }
});

// 面包屑也可作为放置目标（拖到上级目录）
$("#fmCrumb").addEventListener("dragover", (e) => {
  const a = e.target.closest("a[data-p]");
  if (!a) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  clearDropHover();
  a.classList.add("drop-hover");
});
$("#fmCrumb").addEventListener("dragleave", (e) => {
  const a = e.target.closest("a[data-p]");
  if (a) a.classList.remove("drop-hover");
});
$("#fmCrumb").addEventListener("drop", (e) => {
  const a = e.target.closest("a[data-p]");
  if (!a) return;
  e.preventDefault();
  clearDropHover();
  if ([...e.dataTransfer.types].includes("application/x-fm")) {
    const items = fmSelItems();
    if (items.length) fmDoMove(items, a.dataset.p);
  } else if (e.dataTransfer.files.length) {
    fmUploadFiles([...e.dataTransfer.files], a.dataset.p);
  }
});

// 批量移动/文件夹移动/改名：一次拉取 git tree 建 path→sha 映射，mv 不再逐文件 GET
async function fmTreeMap() {
  const ref = await ghApi(`/repos/${REPO}/git/ref/heads/main`);
  const head = await ghApi(`/repos/${REPO}/git/commits/${ref.object.sha}`);
  const t = await ghApi(`/repos/${REPO}/git/trees/${head.tree.sha}?recursive=1`);
  const m = {};
  for (const en of t.tree || []) if (en.type === "blob") m[en.path] = en.sha;
  return m;
}

// 把选区移动到 dest（完整目录路径，"" = 仓库根目录）；rename 仅单选改名时提供
async function fmDoMove(items, dest, rename) {
  const dl = items.filter(isDl);
  if (dl.length) return log(`✗ 选区含 ${dl.length} 个 Release 通道大文件，不支持批量移动（请逐个用「移动/改名」）`, "#fmLog");
  const base = dest ? dest + "/" : "";
  const changes = [];
  try {
    for (const x of items) {
      const name = rename && !x.__dir ? rename : (x.__dir ? x.__dir.split("/").pop() : x.path.split("/").pop());
      if (x.__dir) {
        const pref = x.__dir + "/";
        const toDir = (base + name).replace(/\/+$/, "");
        if (x.__dir === toDir) continue;
        if (toDir.startsWith(pref)) { log("✗ 不能把文件夹移动到它自己内部", "#fmLog"); return; }
        for (const it of MANIFEST.items) {
          if (it.type === "file" && it.path.startsWith(pref) && !it.path.endsWith("/.gitkeep"))
            changes.push({ op: "mv", from: it.path, to: toDir + "/" + it.path.slice(pref.length) });
        }
      } else {
        const to = base + name;
        if (to !== x.path) changes.push({ op: "mv", from: x.path, to });
      }
    }
  } catch (err) { log("✗ " + err.message, "#fmLog"); return; }
  // manifest 只含资源文件，文件夹里的 .gitkeep 占位符（含空子目录）从 git 树补齐，否则空文件夹移动后会"消失"
  const tm = changes.length || items.some((x) => x.__dir) ? await fmTreeMap() : {};
  for (const x of items) {
    if (!x.__dir) continue;
    const pref = x.__dir + "/";
    const toDir = (base + x.__dir.split("/").pop()).replace(/\/+$/, "");
    for (const p of Object.keys(tm)) {
      if (!p.startsWith(pref)) continue;
      const to = toDir + "/" + p.slice(pref.length);
      if (to === p || changes.some((c) => c.from === p)) continue;
      changes.push({ op: "mv", from: p, to });
    }
  }
  if (!changes.length) return;
  const dup = changes.filter((c) => MANIFEST?.items?.some((x) => x.type === "file" && x.path === c.to));
  if (dup.length && !confirm(`以下 ${dup.length} 个目标位置已有同名文件，将被覆盖：\n${dup.map((c) => c.to).join("\n")}`)) return;
  try {
    log(`⇄ 移动 ${changes.length} 个文件（单 commit）…`, "#fmLog");
    for (const c of changes) c.sha = tm[c.from];
    await commitChanges(changes, `move: ${changes.length} 个文件${dest ? " → " + dest : " → 根目录"}`);
    log(`✔ 移动完成，索引重建约 1 分钟`, "#fmLog");
    fmSel.clear();
    renderFm();
  } catch (e) { log("✗ " + e.message, "#fmLog"); }
}

// 外部文件拖入 / 右键上传：直接传到当前目录（单 commit）
async function fmUploadFiles(files, base) {
  if (!files.length) return;
  if (!CAN_WRITE) return log("✗ 投稿模式请在「上传/投稿」标签操作", "#fmLog");
  const dir = base !== undefined ? base : [fmState.subject, fmState.folder].filter(Boolean).join("/");
  const changes = [];
  for (const f of files) changes.push({ op: "put", path: (dir ? dir + "/" : "") + f.name, content: await fileB64(f) });
  const conflicts = changes.filter((c) => MANIFEST?.items?.some((x) => x.path === c.path));
  if (conflicts.length && !confirm(`以下 ${conflicts.length} 个文件已存在，将被覆盖：\n${conflicts.map((c) => c.path).join("\n")}`)) return;
  try {
    log(`⬆ 上传 ${changes.length} 个文件到 ${dir || "根目录"}（单 commit）…`, "#fmLog");
    await commitChanges(changes, `upload: ${changes.length} 个文件到 ${dir || "根目录"}`);
    log("✔ 上传成功，索引重建约 1 分钟", "#fmLog");
    renderFm();
  } catch (e) { log("✗ " + e.message, "#fmLog"); }
}

$("#fmNewFolder").onclick = () => fmNewFolderAt([fmState.subject, fmState.folder].filter(Boolean).join("/"));

// 多选模式：开启后单击即加选/减选（等价于一直按着 Ctrl），再点一次关闭恢复正常
$("#fmMulti").onclick = () => {
  fmMultiMode = !fmMultiMode;
  $("#fmMulti").classList.toggle("active", fmMultiMode);
  $("#fmMulti").textContent = fmMultiMode ? "✅ 多选中（单击=加选/减选）" : "☑ 多选模式";
};

function fmNewFolderAt(base) {
  const name = prompt(`新文件夹名称（将在 ${base || "根目录"} 下创建）：`);
  if (!name) return;
  mkdir(base ? `${base}/${name}` : name);
}

async function mkdir(rel, sel = "#fmLog") {
  try {
    await commitChanges([{ op: "put", path: `${rel}/.gitkeep`, content: "" }], `mkdir: ${rel}`);
    log(`✔ 已创建 ${rel}/，索引重建约 1 分钟`, sel);
    renderFm();
  } catch (e) { log("✗ " + e.message, sel); }
}

/* --- 删除（支持批量：文件/文件夹混合，git 部分单 commit，Release 附件逐个删） --- */
// 展开选区里的文件夹：manifest 文件 + git 树里的 .gitkeep（manifest 不含占位符）
async function fmExpandDirs(items) {
  const dirs = items.filter((x) => x.__dir);
  const out = items.filter((x) => !x.__dir);
  if (!dirs.length) return items;
  const tm = await fmTreeMap();
  for (const d of dirs) {
    const pref = d.__dir + "/";
    for (const p of Object.keys(tm)) {
      if (!p.startsWith(pref)) continue;
      const it = MANIFEST.items.find((x) => x.type === "file" && x.path === p);
      if (it) { if (!items.includes(it)) items.push(it); }
      else if (p.endsWith("/.gitkeep")) items.push({ path: p, __keep: true });
    }
  }
  return items;
}

async function fmDeleteItems(items) {
  const names = items.map((x) => (x.__dir ? x.__dir + "/" : x.path)).join("、");
  if (!confirm(`确定删除 ${items.length} 项：${names}？\n文件夹会连同其中全部文件一起删除，此操作直接提交到仓库。`)) return;
  try {
    const all = await fmExpandDirs([...items]);
    const dlItems = all.filter((x) => !x.__keep && isDl(x));
    const gitChanges = all.filter((x) => x.__keep || !isDl(x)).map((x) => ({ op: "rm", path: x.path }));
    let map = null;
    for (const it of dlItems) {
      const info = await releaseAssetInfo(it);
      if (info.asset) await ghApi(`/repos/${REPO}/releases/assets/${info.asset.id}`, { method: "DELETE" });
      delete info.map[it.path];
      map = info.map;
    }
    if (map) await saveReleaseMap(map, `release: 删除 ${dlItems.length} 个附件`);
    if (gitChanges.length) await commitChanges(gitChanges, `delete: ${gitChanges.length} 个文件`);
    log(`✔ 已删除 ${all.length} 个文件，索引重建约 1 分钟`, "#fmLog");
    fmSel.clear();
    renderFm();
  } catch (e) { log("✗ " + e.message, "#fmLog"); }
}

function fmRemove(it) { fmDeleteItems([it]); }

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

/* --- 移动 / 改名（单选可改名；多选/文件夹只选目标位置，文件名保持不变） --- */
let mvItems = [];
function fmMoveDialog(it) {
  mvItems = [it];
  const dl = isDl(it);
  $("#mvNameRow").hidden = false;
  $("#mvFrom").textContent = it.path + (dl ? " · Release 通道大文件，改名会同步修改附件名与下载映射" : " · 可改科目/子文件夹/文件名，单 commit 完成，不限文件大小");
  $("#mvSub").value = it.folder || "";
  $("#mvName").value = it.name + (it.ext && it.ext !== "文件" ? "." + it.ext : "");
  $("#mvSubject").value = it.subject;
  $("#mvLog").textContent = "";
  $("#moveModal").hidden = false;
}
// 批量移动 / 文件夹移动：只选目标位置
function fmBatchMoveDialog(items) {
  const dl = items.filter((x) => !x.__dir && isDl(x));
  const git = items.filter((x) => x.__dir || !isDl(x));
  if (!git.length) return log("✗ 选区全是 Release 通道大文件，不支持批量移动（请逐个用「移动/改名」）", "#fmLog");
  mvItems = git;
  $("#mvNameRow").hidden = true;
  $("#mvFrom").textContent = `已选 ${git.length} 项，将移动到目标位置（文件名保持不变）` +
    (dl.length ? `；${dl.length} 个 Release 大文件已跳过` : "");
  $("#mvSub").value = "";
  $("#mvSubject").value = fmState.subject || Object.keys(MANIFEST.subjects)[0] || "";
  $("#mvLog").textContent = "";
  $("#moveModal").hidden = false;
}
$("#mvOk").onclick = async () => {
  if (!mvItems.length) return;
  const subject = $("#mvSubject").value;
  const sub = relOf($("#mvSub").value);
  const dest = `${subject}${sub ? "/" + sub : ""}`;
  try {
    if (mvItems.length === 1 && !mvItems[0].__dir) {
      const it = mvItems[0];
      const name = $("#mvName").value.trim();
      if (!name || name.includes("/")) return log("文件名不能为空或含 /", "#mvLog");
      const to = `${dest}/${name}`;
      if (isDl(it)) {
        // Release 通道：改名同步改附件名 + 更新映射
        const info = await releaseAssetInfo(it);
        if (info.asset && name !== info.asset.name) await ghApi(`/repos/${REPO}/releases/assets/${info.asset.id}`, { method: "PATCH", body: { name } });
        const url = `https://github.com/${REPO}/releases/download/${info.tag}/${name}`;
        delete info.map[it.path];
        info.map[to] = typeof info.meta === "string" ? url : { ...info.meta, url };
        await saveReleaseMap(info.map, `release: ${it.path} 改名为 ${name}`);
        log("✔ Release 附件已改名并更新映射，索引重建约 1 分钟", "#fmLog");
        $("#moveModal").hidden = true;
        renderFm();
        return;
      }
      if (to === it.path) { $("#moveModal").hidden = true; return; }
      await commitChanges([{ op: "mv", from: it.path, to }], `move: ${it.path} → ${to}`);
      log(`✔ 已移动到 ${to}，索引重建约 1 分钟`, "#fmLog");
      $("#moveModal").hidden = true;
      fmSel.clear();
      renderFm();
      return;
    }
    const n = await fmDoMove(mvItems, dest);
    if (n === null) return; // 用户取消覆盖
    $("#moveModal").hidden = true;
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


/* ---------- 刷新保持界面状态（sessionStorage，本标签页内刷新不丢位置） ---------- */
let UISAVE = {};
try { UISAVE = JSON.parse(sessionStorage.getItem("ui_state") || "{}"); } catch (e) { UISAVE = {}; }
function saveUI() {
  try {
    sessionStorage.setItem("ui_state", JSON.stringify({
      tab: document.querySelector(".tab.active")?.dataset.tab || "fm",
      fm: fmState, type: state.type, folder: state.folder, open: [...state.open], q: state.q,
      y: window.scrollY, fmY: $("#fmList").scrollTop,
    }));
  } catch (e) {}
}
window.addEventListener("beforeunload", saveUI);

/* ---------- 启动 ---------- */
// 恢复上次界面状态（正文：搜索词/类型筛选/目录树选中与展开；管理台在 enterAdmin 里恢复）
if (typeNames[UISAVE.type]) state.type = UISAVE.type;
if (typeof UISAVE.folder === "string") state.folder = UISAVE.folder;
if (Array.isArray(UISAVE.open) && UISAVE.open.length) state.open = new Set(UISAVE.open);
if (UISAVE.q) { state.q = UISAVE.q; $("#searchInput").value = UISAVE.q; }
window.addEventListener("hashchange", route);
window.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    if (location.hash) location.hash = "";
    $("#searchInput").focus();
  }
  if (e.key === "Escape") {
    if (!$("#previewModal").hidden) closePreview();
    if (!$("#videoModal").hidden) closeModal();
  }
});
let _deb;
$("#searchInput").addEventListener("input", (e) => {
  clearTimeout(_deb);
  _deb = setTimeout(() => { state.q = e.target.value.trim(); render(); }, 120);
});

initTheme();
loadCustomWp().then(applyWallpaper); // 先取本地自定义壁纸再应用，避免闪烁到空背景
loadManifest().then(() => { // 索引渲染完再恢复正文滚动位置
  if (location.hash !== "#admin" && UISAVE.y > 0) window.scrollTo(0, UISAVE.y);
});
route();
