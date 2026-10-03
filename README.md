# Visualisasi Data dan Informasi

Repositori ini berisi tugas dan latihan mata kuliah **Visualisasi Data dan Informasi**
di Politeknik Statistika STIS, yang diampu oleh **Siti Mariyah, PhD.**

## Informasi

|                 |                                |
| --------------- | ------------------------------ |
| **Nama**        | Muhammad Ludvi Argorahayu      |
| **NIM**         | 222313248                      |
| **Kelas**       | 3SD1                           |
| **Mata Kuliah** | Visualisasi Data dan Informasi |
| **Dosen**       | Siti Mariyah, PhD.             |
| **Tahun**       | 2026                           |

# Wajah Kemiskinan Indonesia: Lensa Resolusi Multi-Skala

Cerita data interaktif (scrollytelling) tentang kemiskinan di Indonesia. Pada Maret 2026, persentase penduduk miskin turun menjadi 8,07 persen. Apakah itu berarti kemiskinan hampir teratasi? Jawabannya bergantung pada seberapa dekat angka itu dilihat. Proyek ini memeriksa satu angka yang sama melalui tiga lensa: bahasa negara, peta wilayah, dan dapur rumah tangga.

Dibuat sebagai tugas Ujian Akhir Semester mata kuliah Visualisasi Data dan Informasi, Politeknik Statistika STIS.

- Situs: https://wajah-kemiskinan-uas-visdati.vercel.app/
- Repositori: https://github.com/muhammadludviarg/visdati

## Isi cerita

Halaman terdiri dari tiga bab yang dibaca dengan menggulir ke bawah.

| Bab                                                    | Pertanyaan                                                                              | Visualisasi                                                                                         | Berkas                                |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Bahasa Negara dan Pembacaan Statistik Agregat          | Bagaimana negara menceritakan kemiskinan dan ke mana arah angkanya?                     | Awan kata dari Berita Resmi Statistik, grafik garis tren nasional                                   | `sceneMakro.js`                       |
| Menyingkap Disparitas Geospasial dan Paradoks Wilayah  | Di mana kemiskinan terkonsentrasi dan siapa yang menanggungnya?                         | Peta koroplet kabupaten/kota, grafik Marimekko, dumbbell plot desa dan kota                         | `scene1.js`                           |
| Ekosistem Pemampu dan Anatomi Pengeluaran Rumah Tangga | Faktor apa yang berjalan bersama kemiskinan dan ke mana uang rumah tangga miskin pergi? | Sebaran PCA, grafik radar, matriks korelasi Pearson, treemap, pohon hierarki yang bisa dibuka-tutup | `scene2.js`, `scene5.js`, `scene3.js` |

## Teknologi

- HTML, CSS, dan JavaScript murni (tanpa kerangka kerja dan tanpa proses build)
- D3.js versi 7 untuk seluruh grafik, ditambah `d3.layout.cloud` untuk awan kata
- Google Fonts: Plus Jakarta Sans untuk isi, Playfair Display untuk judul
- Formspree untuk formulir kontak di bagian footer
- Vercel untuk hosting, terhubung ke repositori GitHub

## Struktur folder

```
uas-visdat/
├── index.html                           # Titik masuk utama dan struktur narasi scrollytelling
├── css/
│   └── style.css                        # Tema gelap bergaya editorial (#141414, aksen teal/oranye), tata letak 2 kolom, responsif
├── js/
│   ├── main.js                          # Pengatur pusat (memuat CSV/JSON, state global `appData`, IntersectionObserver)
│   ├── sceneMakro.js                    # Bab 1: awan kata D3 dan grafik garis tren
│   ├── scene1.js                        # Bab 2: peta koroplet, grafik Marimekko, dumbbell plot
│   ├── scene2.js                        # Bab 3: sebaran PCA dan grafik radar perbandingan provinsi
│   ├── scene3.js                        # Bab 3: treemap dan pohon hierarki pengeluaran (garis kemiskinan)
│   ├── scene5.js                        # Bab 3: matriks korelasi Pearson (faktor penentu P0)
│   └── mobile-fit.js                    # Menyesuaikan ukuran semua grafik di layar HP (muat dulu, geser bila perlu)
└── data/
    └── olahan/
        ├── kemiskinan_historis_lengkap.csv  # Dataset induk historis (provinsi dan kabupaten/kota, 2004-2025)
        ├── tren_kemiskinan.csv              # Seri historis nasional (P0 dalam persen dan jumlah dalam juta jiwa)
        ├── desa_kota_historis.csv           # Disparitas P0 desa dan kota per provinsi
        ├── provinsi_multivariat.json        # Indikator ekonomi dan sosial per provinsi (PCA dan radar)
        ├── provinsi_simbol.json             # Matriks indikator multivariat
        ├── data_teks_kemiskinan.json        # Token kata dan teks naskah Berita Resmi Statistik
        ├── hierarki_kemiskinan.json         # Struktur anggaran dan program penanggulangan kemiskinan
        └── korelasi_indikator.json          # Matriks koefisien korelasi Pearson antar-indikator
```

## Menjalankan di komputer sendiri

Halaman memuat berkas CSV dan JSON dengan `fetch`. Peramban memblokir hal ini bila `index.html` dibuka langsung dengan klik ganda (alamat `file://`), jadi halaman perlu dilayani lewat server lokal. Dari folder proyek, jalankan:

```
python -m http.server 8000
```

Lalu buka `http://localhost:8000` di peramban.

## Deploy

Situs dipublikasikan di Vercel sebagai situs statis.

1. Impor repositori `visdati` di vercel.com (Add New, lalu Project).
2. Pilih Framework Preset **Other**. Kosongkan Build Command dan Output Directory.
3. Klik Deploy.

Setiap `git push` ke cabang `main` memicu pembangunan ulang otomatis, dan versi baru tayang biasanya dalam kurang dari satu menit. Push ke cabang lain hanya membuat alamat percobaan (preview) dan tidak mengubah situs utama.

## Pengaturan yang bisa diubah

- **Formulir kontak.** Di `index.html`, ganti `GANTI_DENGAN_ID_ANDA` pada atribut `action` formulir dengan ID formulir dari formspree.io. Pesan yang masuk diteruskan ke email yang Anda daftarkan di sana.
- **Ukuran grafik di HP.** Di bagian atas `js/mobile-fit.js`, objek `SKALA_MIN` menentukan seberapa kecil sebuah grafik boleh dikecilkan dari ukuran aslinya sebelum berhenti dan dibuat bisa digeser ke samping. Angka kecil berarti lebih muat di layar tetapi tulisan lebih kecil.
- **Font judul.** Variabel `--font-serif` di bagian atas `css/style.css`.

## Tampilan responsif

- Di layar lebar, dua visualisasi statis (awan kata dan disparitas desa-kota) memakai tata letak dua kolom: tiga perempat untuk visualisasi dan seperempat untuk teks. Grafik lain memakai susunan atas-bawah.
- Di layar HP, dua kolom menumpuk menjadi satu kolom. Setiap grafik diperkecil agar muat selebar layar. Bila pengecilan membuat tulisan terlalu kecil, grafik dapat digeser ke samping dan muncul petunjuk geser.

## Sumber data

Seluruh data diolah dari tabel dan publikasi Badan Pusat Statistik (BPS), yang bersumber dari Survei Sosial Ekonomi Nasional (Susenas) dan Survei Angkatan Kerja Nasional (Sakernas). Data tahun 2025, kecuali Berita Resmi Statistik yang berdata Maret 2026. Seluruh tautan diakses pada 28 September 2026. Pemetaan komponen utama dan korelasi Pearson dihitung ulang oleh penulis dari tabel-tabel di bawah ini.

- [Persentase Penduduk Miskin (P0) Menurut Kabupaten/Kota](https://www.bps.go.id/id/statistics-table/2/NjIxIzI=/persentase-penduduk-miskin--p0--menurut-kabupaten-kota--persen-.html)
- [Persentase Penduduk Miskin (P0) Menurut Provinsi dan Daerah](https://www.bps.go.id/id/statistics-table/2/MTkyIzI=/persentase-penduduk-miskin--p0--menurut-provinsi-dan-daerah--persen-.html)
- [Jumlah Penduduk Miskin (Ribu Jiwa) Menurut Provinsi dan Daerah](https://www.bps.go.id/id/statistics-table/2/MTg1IzI=/jumlah-penduduk-miskin--ribu-jiwa--menurut-provinsi-dan-daerah.html)
- [Indeks Kedalaman Kemiskinan (P1) Menurut Provinsi dan Daerah](https://www.bps.go.id/id/statistics-table/2/NTAzIzI=/indeks-kedalaman-kemiskinan--p1--menurut-provinsi-dan-daerah--persen-.html)
- [Indeks Keparahan Kemiskinan (P2) Menurut Provinsi dan Daerah](https://www.bps.go.id/id/statistics-table/2/NTA0IzI=/indeks-keparahan-kemiskinan--p2--menurut-provinsi-dan-daerah--persen-.html)
- [Rata-rata Pengeluaran per Kapita Sebulan Makanan dan Bukan Makanan Menurut Provinsi](https://www.bps.go.id/id/statistics-table/3/V1ZKMWVrSTNOek5ZZUZOcVZEZGFValJvV0hWalFUMDkjMyMwMDAw/rata-rata-pengeluaran-per-kapita-sebulan-makanan-dan-bukan-makanan-di-daerah-perkotaan-dan-perdesaan-menurut-provinsi--rupiah-.html?year=2025)
- [Rata-Rata Lama Sekolah Penduduk Umur 15 Tahun ke Atas Menurut Provinsi](https://www.bps.go.id/id/statistics-table/2/MTQyOSMy/rata-rata-lama-sekolah-penduduk-umur-15-tahun-ke-atas-menurut-provinsi.html)
- [Akses terhadap Sanitasi Layak Menurut Provinsi dan Klasifikasi Desa](https://www.bps.go.id/id/statistics-table/2/ODM0IzI=/persentase-rumah-tangga-yang-memiliki-akses-terhadap-sanitasi-layak-menurut-provinsi-dan-klasifikasi-desa--persen-.html)
- [Akses terhadap Sumber Air Minum Layak Menurut Provinsi dan Klasifikasi Desa](https://www.bps.go.id/id/statistics-table/2/ODU0IzI=/persentase-rumah-tangga-yang-memiliki-akses-terhadap-sumber-air-minum-layak-menurut-provinsi-dan-klasifikasi-desa--persen-.html)
- [Tingkat Pengangguran Terbuka dan Tingkat Partisipasi Angkatan Kerja Menurut Provinsi](https://www.bps.go.id/id/statistics-table/3/V2pOVWJWcHJURGg0U2pONFJYaExhVXB0TUhacVFUMDkjMyMwMDAw/tingkat-pengangguran-terbuka--tpt--dan-tingkat-partisipasi-angkatan-kerja--tpak--menurut-provinsi.html?year=2025)
- [Berita Resmi Statistik: Profil Kemiskinan di Indonesia Maret 2026](https://www.bps.go.id/id/pressrelease/2026/08/05/2594/persentase-penduduk-miskin-maret-2026-turun-menjadi-8-07-persen-.html)

## Istilah dan singkatan

| Istilah          | Kepanjangan dan arti                                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BPS              | Badan Pusat Statistik                                                                                                                                                     |
| Susenas          | Survei Sosial Ekonomi Nasional                                                                                                                                            |
| Sakernas         | Survei Angkatan Kerja Nasional                                                                                                                                            |
| P0               | Persentase penduduk miskin (head count index): berapa persen penduduk berada di bawah garis kemiskinan                                                                    |
| P1               | Indeks kedalaman kemiskinan: seberapa jauh rata-rata pengeluaran penduduk miskin dari garis kemiskinan                                                                    |
| P2               | Indeks keparahan kemiskinan: seberapa timpang pengeluaran di antara penduduk miskin                                                                                       |
| Garis Kemiskinan | Nilai rupiah pengeluaran minimum untuk memenuhi kebutuhan pangan setara 2.100 kkal per hari dan kebutuhan dasar bukan makanan (perumahan, sandang, pendidikan, kesehatan) |
| TPT              | Tingkat Pengangguran Terbuka                                                                                                                                              |
| TPAK             | Tingkat Partisipasi Angkatan Kerja                                                                                                                                        |
| PCA              | Principal Component Analysis (Analisis Komponen Utama): meringkas banyak indikator menjadi beberapa sumbu utama                                                           |
| Koroplet         | Peta yang wilayahnya diwarnai menurut nilai suatu ukuran                                                                                                                  |
| Pearson r        | Koefisien korelasi linear, bernilai -1 sampai 1                                                                                                                           |
