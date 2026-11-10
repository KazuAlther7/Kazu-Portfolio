/* Kazu Admin Mode
   Dimuat HANYA saat dibuka (#admin, 5x tap © di footer, atau Ctrl+Shift+A).
   Keamanan: semua penulisan lewat GitHub API memakai token milik @OWNER.
   Orang lain tidak punya token = tidak bisa mengubah apa pun. */
(() => {
  "use strict";
  const S = window.SITE;
  if (!S) return;
  if (window.KazuAdmin) return window.KazuAdmin.open();

  const OWNER = "kazualther7", REPO = "Kazu-Portfolio", TKEY = "kazu_admin_token";
  const API = "https://api.github.com", RP = "/repos/" + OWNER + "/" + REPO;
  const LABEL = { poster: "Poster", esports: "Esports", type: "Typography", other: "Others" };
  const AUTO = { poster: "Poster Design", esports: "Esports", type: "Typography", other: "Digital Art" };

  let tok = localStorage.getItem(TKEY) || "";
  let branch = "main", user = "", draft = null, dirty = false, active = false;
  let files = {};              /* path -> Blob, menunggu dipublish */
  const removed = new Set();   /* path di repo yang akan dihapus */
  let bar, toastEl;

  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const html = (s) => { const t = document.createElement("template"); t.innerHTML = s.trim(); return t.content.firstChild; };

  /* ---------- styles ---------- */
  const css = document.createElement("style");
  css.textContent = `
  .adm-bar{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:9000;display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center;max-width:calc(100% - 24px);padding:10px 12px;border:1px solid #3a3a3a;border-radius:16px;background:rgba(18,18,18,.92);backdrop-filter:blur(14px);box-shadow:0 10px 40px rgba(0,0,0,.6);font:600 12px/1.2 Arial,sans-serif;color:#f5f5f5}
  .adm-bar b{color:#d5ff55;letter-spacing:.14em}
  .adm-bar span{color:#999;font-weight:400}
  .adm-bar span.dirty{color:#ffb454}
  .adm-bar button,.adm-b{font:inherit;color:#f5f5f5;background:#222;border:1px solid #3a3a3a;border-radius:10px;padding:9px 13px;cursor:pointer}
  .adm-bar button.p,.adm-b.p{background:#d5ff55;color:#0b0b0b;border-color:#d5ff55;font-weight:700}
  .adm-bar button:disabled{opacity:.45;cursor:default}
  .adm [data-k]{outline:1px dashed rgba(213,255,85,.4);outline-offset:3px;cursor:text}
  .adm [data-k]:focus{outline:2px solid #d5ff55}
  .adm .skills{outline:1px dashed rgba(213,255,85,.4);outline-offset:6px;cursor:pointer}
  .adm .ach,.adm .review{position:relative}
  .adm-tools{position:absolute;top:8px;right:8px;z-index:40;display:flex;gap:6px}
  .adm-tools button{width:34px;height:34px;border-radius:9px;border:1px solid #3a3a3a;background:rgba(18,18,18,.92);color:#f5f5f5;cursor:pointer;font-size:14px}
  .adm-tools .dg{color:#ff7a7a}
  .adm-add{display:block;margin:0 0 18px;padding:12px 16px;border:1px dashed #d5ff55;border-radius:12px;background:transparent;color:#d5ff55;font:700 13px Arial,sans-serif;cursor:pointer}
  .adm-ov{position:fixed;inset:0;z-index:9500;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.72);overflow:auto}
  .adm-m{width:min(520px,100%);max-height:calc(100vh - 32px);overflow:auto;padding:22px;border:1px solid #333;border-radius:18px;background:#141414;color:#f5f5f5;font:14px/1.5 Arial,sans-serif}
  .adm-m h3{margin-bottom:14px;font-size:18px}
  .adm-l{display:block;margin-bottom:14px}
  .adm-l>span{display:block;margin-bottom:5px;color:#bbb;font-size:12px;letter-spacing:.06em;text-transform:uppercase}
  .adm-l small{display:block;margin-top:4px;color:#777;font-size:12px}
  .adm-l input:not([type=checkbox]),.adm-l textarea{width:100%;padding:11px 12px;border:1px solid #333;border-radius:10px;background:#0e0e0e;color:#f5f5f5;font:inherit}
  .adm-c{display:inline-flex;gap:6px;align-items:center;margin:0 14px 4px 0}
  .adm-row{display:flex;gap:10px;justify-content:flex-end;margin-top:6px}
  .adm-err{margin-bottom:10px;color:#ff7a7a;font-size:13px}
  .adm-toast{position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:9600;max-width:calc(100% - 24px);padding:12px 16px;border-radius:12px;background:#d5ff55;color:#0b0b0b;font:700 13px Arial,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.5)}
  .adm-toast.err{background:#ff7a7a}`;
  document.head.appendChild(css);

  /* ---------- helpers ---------- */
  function toast(msg, err, sticky) {
    if (toastEl) toastEl.remove();
    if (!msg) return;
    toastEl = html(`<div class="adm-toast${err ? " err" : ""}">${esc(msg)}</div>`);
    document.body.appendChild(toastEl);
    if (!sticky) setTimeout(() => toastEl && toastEl.remove(), err ? 6000 : 3500);
  }

  async function gh(path, opt = {}) {
    const r = await fetch(API + path, {
      ...opt,
      headers: { Authorization: "Bearer " + tok, Accept: "application/vnd.github+json", ...(opt.body ? { "Content-Type": "application/json" } : {}), ...(opt.headers || {}) },
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.message || "HTTP " + r.status);
    return j;
  }

  const setPath = (o, p, v) => { const k = p.split("."); const last = k.pop(); k.reduce((a, x) => (a[x] = a[x] || {}), o)[last] = v; };

  function mark() {
    dirty = true;
    if (bar) { $("#adm-st", bar).textContent = "● Ada perubahan belum dipublish"; $("#adm-st", bar).className = "dirty"; $('[data-b="pub"]', bar).disabled = false; }
  }

  function put(path, blob) { files[path] = blob; S.preview[path] = URL.createObjectURL(blob); }
  function drop(path) { if (!path) return; if (files[path]) delete files[path]; else removed.add(path); }

  /* resize gambar di browser: versi penuh + thumbnail, tanpa tool tambahan */
  async function img(file, max, q, type = "image/jpeg") {
    const bmp = await createImageBitmap(file);
    const sc = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * sc), h = Math.round(bmp.height * sc);
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const x = c.getContext("2d");
    if (type === "image/jpeg") { x.fillStyle = "#0b0b0b"; x.fillRect(0, 0, w, h); }
    x.drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise((r) => c.toBlob(r, type, q));
    return { blob, w, h };
  }

  const b64 = (blob) => new Promise((r) => { const f = new FileReader(); f.onload = () => r(String(f.result).split(",")[1]); f.readAsDataURL(blob); });

  /* ---------- generic form modal ---------- */
  function form(title, fields, vals = {}) {
    return new Promise((res) => {
      const m = html(`<div class="adm-ov"><form class="adm-m" autocomplete="off"><h3>${esc(title)}</h3><div class="adm-f"></div><div class="adm-err" hidden></div><div class="adm-row"><button type="button" class="adm-b" data-x>Batal</button><button class="adm-b p">Simpan</button></div></form></div>`);
      const box = $(".adm-f", m);
      fields.forEach((f) => {
        const v = vals[f.k] ?? "";
        let inp, tag = "label";
        if (f.t === "area") inp = `<textarea name="${f.k}" rows="4">${esc(v)}</textarea>`;
        else if (f.t === "cats") { tag = "div"; inp = Object.keys(LABEL).map((c) => `<label class="adm-c"><input type="checkbox" name="${f.k}" value="${c}" ${(vals[f.k] || []).includes(c) ? "checked" : ""}> ${LABEL[c]}</label>`).join(""); }
        else if (f.t === "file") inp = `<input type="file" name="${f.k}" accept="image/*">`;
        else inp = `<input name="${f.k}" type="${f.t || "text"}" ${f.t === "number" ? 'min="0" max="5" step="0.5"' : ""} value="${esc(v)}">`;
        box.insertAdjacentHTML("beforeend", `<${tag} class="adm-l"><span>${esc(f.l)}</span>${inp}${f.hint ? `<small>${esc(f.hint)}</small>` : ""}</${tag}>`);
      });
      const done = (v) => { m.remove(); res(v); };
      $("[data-x]", m).onclick = () => done(null);
      $("form", m).onsubmit = (e) => {
        e.preventDefault();
        const out = {};
        for (const f of fields) {
          const els = [...m.querySelectorAll(`[name="${f.k}"]`)];
          if (f.t === "cats") out[f.k] = els.filter((x) => x.checked).map((x) => x.value);
          else if (f.t === "file") out[f.k] = els[0].files[0] || null;
          else if (f.t === "number") out[f.k] = Math.min(5, Math.max(0, parseFloat(els[0].value) || 0));
          else out[f.k] = els[0].value.trim();
          if (f.req && !(f.t === "cats" ? out[f.k].length : out[f.k])) {
            const er = $(".adm-err", m); er.hidden = false; er.textContent = "Wajib diisi: " + f.l; return;
          }
        }
        done(out);
      };
      document.body.appendChild(m);
      const first = m.querySelector("input,textarea"); if (first) first.focus();
    });
  }

  /* ---------- editors ---------- */
  async function editWork(i) {
    const nw = i < 0, cur = nw ? { cats: [] } : draft.works[i];
    const v = await form(nw ? "Tambah karya" : "Edit karya", [
      { k: "file", l: "Gambar" + (nw ? "" : " (kosongkan = tetap)"), t: "file", req: nw, hint: "JPG/PNG/WebP. Versi penuh + thumbnail dibuat otomatis." },
      { k: "title", l: "Judul", hint: "Kosong = diambil dari nama file" },
      { k: "sub", l: "Subjudul", hint: "Kosong = otomatis dari kategori" },
      { k: "cats", l: "Kategori", t: "cats" },
      { k: "alt", l: "Alt text", hint: "Kosong = otomatis" },
    ], cur);
    if (!v) return;
    const w = nw ? {} : { ...cur };
    if (v.file) {
      toast("Memproses gambar…", false, true);
      try {
        const full = await img(v.file, 2000, 0.9), th = await img(v.file, 800, 0.82);
        const n = 1 + Math.max(0, ...draft.works.map((x) => +((x.file || "").match(/work-(\d+)/) || [])[1] || 0));
        const id = "work-" + String(n).padStart(2, "0");
        if (!nw) { drop(cur.file); drop(cur.thumb); }
        w.file = `works/${id}.jpg`; w.thumb = `works/${id}-thumb.jpg`;
        put(w.file, full.blob); put(w.thumb, th.blob);
        Object.assign(w, { w: full.w, h: full.h, format: "JPEG" });
        toast("");
      } catch (e) { toast("Gambar gagal diproses: " + e.message, true); return; }
    }
    w.cats = v.cats.length ? v.cats : ["other"];
    const base = (w.file || "").split("/").pop().replace(/\.\w+$/, "");
    w.title = v.title || w.title || base.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    w.sub = v.sub || w.cats.map((c) => AUTO[c]).join(" / ");
    w.alt = v.alt || w.title + " — " + w.sub;
    if (nw) { w.added = new Date().toISOString().slice(0, 10); draft.works.unshift(w); } else draft.works[i] = w;
    commit();
  }

  async function editAch(i) {
    const nw = i < 0, cur = nw ? {} : draft.achievements[i];
    const v = await form(nw ? "Tambah prestasi" : "Edit prestasi", [
      { k: "year", l: "Tahun", req: 1 }, { k: "title", l: "Nama penghargaan / prestasi", req: 1 },
      { k: "org", l: "Penyelenggara / event" }, { k: "desc", l: "Deskripsi", t: "area" },
      { k: "tag", l: "Label", hint: "Contoh: Award, Competition, Milestone" },
    ], cur);
    if (!v) return;
    if (nw) draft.achievements.unshift(v); else draft.achievements[i] = v;
    commit();
  }

  async function editReview(i) {
    const nw = i < 0, cur = nw ? { rating: 5 } : draft.reviews[i];
    const v = await form(nw ? "Tambah review" : "Edit review", [
      { k: "name", l: "Nama client", req: 1 }, { k: "role", l: "Jabatan · Brand / Tim" },
      { k: "text", l: "Testimoni", t: "area", req: 1 }, { k: "rating", l: "Rating (0–5)", t: "number" },
      { k: "tag", l: "Label", hint: "Contoh: Esports, Poster" },
      { k: "avatar", l: "Foto client (opsional)", t: "file", hint: "Kosong = inisial nama otomatis" },
    ], cur);
    if (!v) return;
    const r = { ...cur, name: v.name, role: v.role, text: v.text, rating: v.rating, tag: v.tag };
    if (v.avatar) {
      try {
        const a = await img(v.avatar, 240, 0.85);
        drop(cur.avatar);
        r.avatar = "reviews/avatar-" + Date.now().toString(36) + ".jpg";
        put(r.avatar, a.blob);
      } catch (e) { toast("Foto gagal diproses: " + e.message, true); return; }
    }
    if (nw) draft.reviews.unshift(r); else draft.reviews[i] = r;
    commit();
  }

  async function editSkills() {
    const v = await form("Skill tags", [{ k: "s", l: "Skill (pisahkan dengan koma)", t: "area" }], { s: (draft.about.skills || []).join(", ") });
    if (!v) return;
    draft.about.skills = v.s.split(",").map((x) => x.trim()).filter(Boolean);
    commit();
  }

  async function changePhoto(file) {
    try {
      toast("Memproses foto…", false, true);
      const r = await img(file, 1000, 0.88, "image/webp");
      put("about-photo.webp", r.blob);
      draft.about.photo = "about-photo.webp";
      draft.about.photoV = Date.now();
      commit();
      toast("");
    } catch (e) { toast("Foto gagal diproses: " + e.message, true); }
  }

  const editors = { works: editWork, achievements: editAch, reviews: editReview };

  function commit() { S.render(draft); mark(); }

  function act(kind, i, a) {
    const arr = draft[kind];
    if (a === "e") return editors[kind](i);
    if (a === "x") {
      if (!confirm("Hapus item ini?")) return;
      const it = arr[i];
      if (kind === "works") { drop(it.file); drop(it.thumb); }
      if (kind === "reviews") drop(it.avatar);
      arr.splice(i, 1);
    } else {
      const j = a === "u" ? i - 1 : i + 1;
      if (j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    commit();
  }

  /* ---------- decorate DOM saat Admin Mode aktif ---------- */
  function decorate() {
    document.body.classList.add("adm");
    document.querySelectorAll("[data-k]").forEach((el) => {
      if (el._adm) return;
      el._adm = 1;
      el.contentEditable = "plaintext-only";
      if (el.contentEditable !== "plaintext-only") el.contentEditable = "true";
      el.spellcheck = false;
      el.addEventListener("input", () => {
        const k = el.dataset.k, v = el.textContent;
        setPath(draft, k, v);
        document.querySelectorAll(`[data-k="${k}"]`).forEach((o) => { if (o !== el) o.textContent = v; });
        mark();
      });
      el.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); el.blur(); } });
      el.addEventListener("paste", (e) => { e.preventDefault(); document.execCommand("insertText", false, (e.clipboardData || window.clipboardData).getData("text/plain")); });
    });
    document.querySelectorAll(".adm-tools,.adm-add").forEach((n) => n.remove());
    [[".sheet", "works"], [".ach", "achievements"], [".review", "reviews"]].forEach(([sel, kind]) =>
      document.querySelectorAll(sel).forEach((el) =>
        el.insertAdjacentHTML("afterbegin", `<div class="adm-tools" data-kind="${kind}" data-i="${el.dataset.i}"><button type="button" data-a="e" aria-label="Edit">✎</button><button type="button" data-a="u" aria-label="Naik">↑</button><button type="button" data-a="d" aria-label="Turun">↓</button><button type="button" data-a="x" class="dg" aria-label="Hapus">✕</button></div>`)));
    $(".filters").insertAdjacentHTML("afterend", '<button type="button" class="adm-add" data-add="works">+ Tambah karya</button>');
    $(".achievements").insertAdjacentHTML("beforebegin", '<button type="button" class="adm-add" data-add="achievements">+ Tambah prestasi</button>');
    $("#reviews").insertAdjacentHTML("beforebegin", '<button type="button" class="adm-add" data-add="reviews">+ Tambah review</button>');
  }

  document.addEventListener("site:render", () => { if (active) decorate(); });

  document.addEventListener("click", (e) => {
    if (!active) return;
    const t = e.target.closest(".adm-tools button");
    if (t) { e.preventDefault(); e.stopPropagation(); const p = t.parentNode; act(p.dataset.kind, +p.dataset.i, t.dataset.a); return; }
    const a = e.target.closest(".adm-add");
    if (a) { e.preventDefault(); editors[a.dataset.add](-1); return; }
    if (e.target.closest(".skills")) { editSkills(); return; }
    if (e.target.closest("a[data-href]")) e.preventDefault();
  }, true);

  /* ---------- publish: satu commit atomik (gambar + content.json) ---------- */
  async function publish() {
    if (!dirty) return toast("Tidak ada perubahan.");
    const btn = $('[data-b="pub"]', bar);
    btn.disabled = true;
    try {
      toast("Mempublish…", false, true);
      const head = (await gh(`${RP}/git/ref/heads/${branch}`)).object.sha;
      const base = (await gh(`${RP}/git/commits/${head}`)).tree.sha;
      const tree = [];
      for (const [path, blob] of Object.entries(files)) {
        const b = await gh(`${RP}/git/blobs`, { method: "POST", body: JSON.stringify({ content: await b64(blob), encoding: "base64" }) });
        tree.push({ path, mode: "100644", type: "blob", sha: b.sha });
      }
      removed.forEach((path) => { if (!files[path]) tree.push({ path, mode: "100644", type: "blob", sha: null }); });
      const j = await gh(`${RP}/git/blobs`, { method: "POST", body: JSON.stringify({ content: JSON.stringify(draft, null, 2) + "\n", encoding: "utf-8" }) });
      tree.push({ path: "content.json", mode: "100644", type: "blob", sha: j.sha });
      const nt = await gh(`${RP}/git/trees`, { method: "POST", body: JSON.stringify({ base_tree: base, tree }) });
      const nc = await gh(`${RP}/git/commits`, { method: "POST", body: JSON.stringify({ message: "Admin Mode: update portfolio", tree: nt.sha, parents: [head] }) });
      await gh(`${RP}/git/refs/heads/${branch}`, { method: "PATCH", body: JSON.stringify({ sha: nc.sha }) });
      files = {}; removed.clear(); dirty = false;
      $("#adm-st", bar).textContent = "✓ Terpublish. Live ±1–2 menit."; $("#adm-st", bar).className = "";
      toast("Terpublish. Situs live dalam ±1–2 menit.");
    } catch (e) {
      btn.disabled = false;
      toast("Gagal publish: " + e.message, true);
    }
  }

  function buildBar() {
    bar = html(`<div class="adm-bar"><b>ADMIN</b><span id="adm-st">Tersambung · @${esc(user)}</span><button type="button" data-b="photo">Foto profil</button><button type="button" class="p" data-b="pub" disabled>Publish</button><button type="button" data-b="out">Keluar</button><input type="file" accept="image/*" hidden></div>`);
    const fi = $("input", bar);
    fi.onchange = () => { if (fi.files[0]) changePhoto(fi.files[0]); fi.value = ""; };
    bar.addEventListener("click", (e) => {
      const b = e.target.closest("[data-b]"); if (!b) return;
      if (b.dataset.b === "photo") fi.click();
      if (b.dataset.b === "pub") publish();
      if (b.dataset.b === "out") {
        if (dirty && !confirm("Ada perubahan belum dipublish. Keluar tanpa menyimpan?")) return;
        if (confirm("Hapus token dari perangkat ini juga?")) localStorage.removeItem(TKEY);
        dirty = false;
        location.href = location.pathname;
      }
    });
    document.body.appendChild(bar);
    window.addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });
  }

  /* ---------- login ---------- */
  async function open() {
    if (active) return;
    try {
      if (!tok) {
        const v = await form("Masuk Admin Mode", [{ k: "t", l: "GitHub token", t: "password", req: 1,
          hint: "GitHub → Settings → Developer settings → Fine-grained tokens. Repo: " + REPO + " saja, izin Contents: Read and write." }]);
        if (!v) return;
        tok = v.t;
      }
      toast("Memverifikasi…", false, true);
      const u = await gh("/user");
      if (u.login.toLowerCase() !== OWNER.toLowerCase()) throw new Error("Token milik @" + u.login + ", bukan @" + OWNER);
      const r = await gh(RP);
      if (!r.permissions || !r.permissions.push) throw new Error("Token tidak punya izin tulis ke " + REPO);
      branch = r.default_branch; user = u.login;
      localStorage.setItem(TKEY, tok);
      try { draft = await gh(`${RP}/contents/content.json?ref=${branch}`, { headers: { Accept: "application/vnd.github.raw+json" } }); }
      catch (e) { draft = S.data ? JSON.parse(JSON.stringify(S.data)) : null; }
      if (!draft) throw new Error("content.json tidak ditemukan di repo");
      toast("");
      active = true; S.editing = true;
      buildBar();
      S.render(draft);
      toast("Admin Mode aktif. Klik teks untuk edit, lalu Publish.");
    } catch (e) {
      tok = ""; localStorage.removeItem(TKEY);
      toast("Login gagal: " + e.message, true);
    }
  }

  window.KazuAdmin = { open };
  open();
})();
