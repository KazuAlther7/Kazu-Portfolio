# Kazu-Portfolio

## Admin Mode (token GitHub)

Upload ke root repo: `index.html`, `admin.js`, `content.json`. Hapus `Index.html` (huruf besar, versi lama).
Hapus juga `supabase-setup.sql` kalau sempat ter-upload.

### Buat token (sekali)
GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token.
- Resource owner: KazuAlther7
- Expiration: pilih Custom atau 1 tahun
- Repository access: Only select repositories → `Kazu-Portfolio`
- Permissions → Add permissions → **Contents** → Read and write
- Generate, salin `github_pat_...` (muncul sekali). Jangan dibagikan.

### Masuk
`kazualther7.github.io/Kazu-Portfolio/#admin`, atau tap 5x © di footer, atau Ctrl+Shift+A. Tempel token.

### Pakai
- Klik teks (garis putus-putus) → ketik.
- Karya / Prestasi / Review: `+ Tambah`, ✎ edit, ↑↓ urut, ✕ hapus.
- Prestasi: field "Foto bukti" (bisa banyak). Tampil "Bukti 1, 2…", klik untuk perbesar.
- Upload karya: nama file, format, ukuran, nomor, tag, alt, thumbnail terisi otomatis.
- `Publish` → satu commit ke GitHub, live ±1–2 menit.
