# Da Vinci Popsicle Bridge – Vite + Three.js

Model interaktif jembatan stik es krim bergaya *Leonardo Da Vinci bridge*.

## Jalankan lokal

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Fitur

- Bentuk stik menyerupai *popsicle stick* dengan ujung membulat
- Jumlah segmen bisa ditambah atau dikurangi
- Nilai lengkung atap, kemiringan kaki, dan lebar jembatan bisa diatur
- Highlight saat kursor diarahkan ke stik
- Cocok dijadikan dasar untuk GitHub Pages

## Catatan GitHub Pages

Kalau ingin dipasang di repo GitHub Pages biasa, ubah `base` di `vite.config.js` menjadi:

```js
base: '/NAMA-REPO/'
```
