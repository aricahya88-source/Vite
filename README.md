# Da Vinci Bridge - Three.js + Vite

Model 3D interaktif sederhana bergaya **Da Vinci bridge** menggunakan **Three.js** dan **Vite**.

## Fitur
- Orbit control (drag untuk rotasi, scroll untuk zoom)
- Slider jumlah modul
- Slider tinggi lengkung
- Slider kemiringan stick
- Tombol rakit ulang
- Hover highlight pada stick kayu

## Struktur Proyek
```text
.
├─ .github/
│  └─ workflows/
│     └─ deploy.yml
├─ index.html
├─ main.js
├─ style.css
├─ package.json
├─ vite.config.js
├─ .gitignore
└─ README.md
```

## Jalankan Lokal
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Upload ke GitHub
1. Extract file ZIP ini di komputer.
2. Buat repository baru di GitHub.
3. Upload **isi folder proyek**, bukan file ZIP-nya saja.
4. Pastikan branch utama bernama `main`.
5. Masuk ke **Settings > Pages** lalu pilih **GitHub Actions**.
6. Push perubahan ke branch `main`, lalu GitHub akan build dan deploy otomatis.

## Catatan
- Folder `node_modules` dan `dist` tidak perlu diunggah.
- Workflow sudah disiapkan untuk GitHub Pages.
- Konfigurasi `base: './'` di `vite.config.js` dipilih agar aset memakai path relatif.
