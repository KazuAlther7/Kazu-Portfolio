# Kazu-Portfolio

## Admin Mode

Upload ke root repo: `index.html`, `admin.js`, `content.json`.
Hapus `Index.html` (versi lama, huruf besar). Sisakan `index.html`.

### Buat token (sekali)
GitHub → Settings → Developer settings → Fine-grained tokens → Generate.
- Repository access: hanya `Kazu-Portfolio`
- Permissions: Contents = Read and write
- Salin token (`github_pat_...`)

### Masuk
Buka salah satu:
- `kazualther7.github.io/Kazu-Portfolio/#admin`
- Tap 5x tulisan © di footer (HP/tablet)
- Ctrl+Shift+A (desktop)

Tempel token. Hanya token milik `@kazualther7` dengan izin tulis yang diterima.

### Pakai
- Klik teks mana pun (garis putus-putus) → ketik langsung.
- Karya / Prestasi / Review: tombol `+ Tambah`, ✎ edit, ↑↓ urut, ✕ hapus.
- Upload gambar karya: nama file, format, ukuran px, folder, nomor, tag, alt text, thumbnail terisi otomatis.
- Skill tags: klik area skill. Foto profil: tombol "Foto profil".
- `Publish` → satu commit ke GitHub. Live ±1–2 menit.

Data disimpan di `content.json`. Gambar baru di `works/` dan `reviews/`.
