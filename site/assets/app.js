/* ===== CSU 学习资源库 · 前端逻辑 ===== */
const REPO = "xyqmbyl/study-resources";
const $ = (sel) => document.querySelector(sel);
const state = { type: "all", subject: "", q: "" };
let MANIFEST = null, FUSE = null;

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

/* ---------- 加载与索引 ---------- */
async function loadManifest() {
  try {
    MANIFEST = await (await fetch("manifest.json", { cache: "no-cache" })).json();
  } catch (e) {
    document.getElementById("results").innerHTML = `<p class="empty">索引加载失败（本地预览请先运行 scripts/build_manifest.py）</p>`;
    return;
  }
  MANIFEST.items.forEach((it) => (it._s = [it.name, it.title, it.subject, it.note, it.author, it.py, ...(it.tags || [])].filter(Boolean).join(" ")));
  FUSE = new Fuse(MANIFEST.items, { keys: ["_s"], threshold: 0.35, ignoreLocation: true });

  const subs = Object.keys(MANIFEST.subjects).length;
  const nFile = MANIFEST.items.filter((x) => x.type === "file").length;
  const nLink = MANIFEST.items.filter((x) => x.type === "link").length;
  const nBook = MANIFEST.items.filter((x) => x.type === "book").length;
  $("#heroMeta").innerHTML = `<b>${subs}</b> 个科目 · <b>${nFile}</b> 份资料 · <b>${nLink}</b> 门视频 · <b>${nBook}</b> 本电子书&ensp;更新于 ${esc(MANIFEST.generated)}`;
  $("#upSubject").innerHTML = subs.map((s) => `<option>${esc(s)}</option>`).join("");
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

/* ---------- 侧栏 ---------- */
function renderSidebar() {
  const subs = Object.entries(MANIFEST.subjects);
  $("#sidebar").innerHTML =
    `<div class="subj-item ${state.subject === "" ? "active" : ""}" data-s=""><span>🏷️ 全部</span><span class="cnt">${MANIFEST.items.length}</span></div>` +
    subs.map(([name, m]) => `<div class="subj-item ${state.subject === name ? "active" : ""}" data-s="${esc(name)}" title="${esc(name)}"><span>${m.icon || "📁"} ${esc(name)}</span><span class="cnt">${m.count}</span></div>`).join("");
  document.querySelectorAll("#sidebar .subj-item").forEach((el) => (el.onclick = () => { state.subject = el.dataset.s; renderSidebar(); render(); }));
}

/* ---------- 列表 ---------- */
function render() {
  let items = MANIFEST.items;
  if (state.subject) items = items.filter((x) => x.subject === state.subject);
  if (state.type !== "all") items = items.filter((x) => x.type === state.type);
  if (state.q) items = FUSE.search(state.q).map((r) => r.item);
  const box = document.getElementById("results");
  if (!items.length) {
    box.innerHTML = `<p class="empty">${state.q ? "🔍 没找到「" + esc(state.q) + "」，换个关键词试试？" : "（空）"}</p>`;
    return;
  }
  const groups = {};
  items.forEach((it) => (groups[it.subject || "其他"] ??= []).push(it));
  box.innerHTML =
    (state.q ? `<p class="search-stat">「${esc(state.q)}」命中 ${items.length} 项</p>` : "") +
    Object.entries(groups)
      .map(([sub, arr]) => {
        const m = MANIFEST.subjects[sub] || {};
        return `<h2 class="group-title">${m.icon || "📁"} ${esc(sub)} <small>${arr.length}</small></h2><div class="grid">${arr.map(cardHTML).join("")}</div>`;
      }).join("");
}

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
    <div class="card-meta"><span>${esc(it.subject)}</span><span>${fmtSize(it.size || 0)}</span><span>${esc(it.updated || "")}</span></div>
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
  if (admin && TOKEN) { $("#adminLoginBox").hidden = true; $("#adminPanel").hidden = false; }
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
loadManifest();
route();
