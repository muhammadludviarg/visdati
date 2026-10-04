"""
pengolahan_data.py
Membaca berkas mentah BPS (folder data/mentah/), membersihkan, menyamakan nama provinsi,
lalu menulis tabel olahan CSV ke data/olahan/.

Hasil:
  kabkota_kemiskinan_2025.csv      -> Scene 1 dan 3 (514 kabupaten/kota)
  provinsi_multivariat_2025.csv    -> Scene 2 dan 5 (38 provinsi x indikator)
  provinsi_pca_2025.csv            -> Scene 2 (koordinat dua komponen utama)
  provinsi_kemiskinan_deret_waktu.csv -> Scene 6
"""
import os
import re
import sys
from pathlib import Path

import pandas as pd
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler

MENTAH = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("data/mentah")
OLAHAN = Path("data/olahan")
OLAHAN.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# 0. Pemeriksaan awal: semua berkas mentah harus ada SEBELUM pengolahan dimulai.
# Alasan: tanpa ini, skrip baru gagal di tengah jalan dengan pesan galat Python yang panjang dan sulit dibaca.
# Pemeriksaan ini langsung memberi tahu berkas mana yang kurang dan apa yang sebenarnya ada di folder.
# ---------------------------------------------------------------------------
# Nama berkas BPS berbeda-beda tergantung cara mengunduhnya (mis. "PEB197_1.XLS" atau
# "Persentase Rumah Tangga ... Sumber Air Minum Layak ..., 2025.xlsx"). Maka berkas dikenali dari
# KATA KUNCI pada namanya, bukan dari nama persis. Nama kunci di bawah hanyalah pengenal internal.
# Tiap kunci punya beberapa alternatif; satu alternatif cocok bila SEMUA kata kuncinya ada di nama berkas.
def normal(teks):
    return " ".join(re.sub(r"[^a-z0-9]+", " ", teks.lower()).split())

ATURAN = {
    "p0_provinsi":   [("persentase penduduk miskin", "provinsi dan daerah")],
    "garis":         [("garis kemiskinan", "provinsi")],
    "p1":            [("kedalaman kemiskinan",)],
    "p2":            [("keparahan kemiskinan",)],
    "sekolah":       [("lama sekolah",)],
    "air":           [("air minum layak",), ("peb197",)],
    "sanitasi":      [("sanitasi layak",), ("persen 4",)],
    "pengeluaran":   [("pengeluaran per kapita",), ("rata r 2",)],
    "tpt":           [("pengangguran terbuka",), ("tingka",)],
    "p0_kabkota":    [("persentase penduduk miskin", "kabupaten kota")],
    "jumlah_kabkota": [("jumlah penduduk miskin", "kabupaten kota")],
    "deret_waktu":   [("beberapa tahun",)],
}

if not MENTAH.is_dir():
    sys.exit(f"Folder '{MENTAH}' tidak ditemukan. Jalankan skrip dari dalam folder uas-visdat "
             f"(folder saat ini: {Path.cwd()}).")
kandidat = [f for f in MENTAH.iterdir() if f.suffix.lower() in (".xlsx", ".xls")]
TERPETAKAN, hilang, ganda = {}, [], {}
for kunci_berkas, alternatif in ATURAN.items():
    cocok = [f for f in kandidat
             if normal(f.stem) == normal(kunci_berkas)            # nama pendek persis, mis. "air.xlsx"
             or any(all(k in normal(f.stem) for k in alt) for alt in alternatif)]
    if len(cocok) == 1:
        TERPETAKAN[kunci_berkas] = cocok[0]
    elif not cocok:
        hilang.append(kunci_berkas)
    else:
        ganda[kunci_berkas] = [f.name for f in cocok]
if hilang or ganda:
    print(f"Folder yang dibaca: {MENTAH.resolve()}")
    for k in hilang:
        print(f"  KURANG   : berkas untuk '{k}' (kata kunci: {ATURAN[k]})")
    for k, daftar in ganda.items():
        print(f"  GANDA    : '{k}' cocok dengan lebih dari satu berkas: {daftar}")
    print("Berkas Excel yang ada di folder itu:")
    for f in sorted(kandidat):
        print("  *", f.name)
    sys.exit("Perbaiki data\\mentah (lengkapi atau hapus berkas ganda), lalu jalankan ulang.")
print("Berkas yang dipakai:")
for k, f in TERPETAKAN.items():
    print(f"  {k:15} <- {f.name}")


# ---------------------------------------------------------------------------
# 1. Menyamakan nama provinsi.
# Alasan: tiap berkas BPS menulis nama berbeda ("KEP. RIAU" vs "Kepulauan Riau" vs "KEPULAUAN RIAU").
# Jika tidak disamakan, penggabungan tabel (merge) diam-diam menghasilkan baris kosong.
# Kunci yang dipakai: huruf besar semua, "KEP." diperluas menjadi "KEPULAUAN".
# ---------------------------------------------------------------------------
def kunci(nama):
    s = re.sub(r"\s+", " ", str(nama)).strip().upper()
    s = s.replace("KEP. ", "KEPULAUAN ")
    # Berkas kabupaten/kota BPS menulis "D I YOGYAKARTA" (berspasi), berkas lain "DI YOGYAKARTA"
    return "DI YOGYAKARTA" if s == "D I YOGYAKARTA" else s


def jalur_aman(berkas):
    """Windows menolak jalur berkas lebih dari 260 karakter (MAX_PATH), walaupun berkasnya ada.
    Folder proyek yang dalam (OneDrive + nama berkas BPS yang panjang) mudah melewati batas itu.
    Awalan \\\\?\\ pada jalur absolut meminta Windows melewati batas tersebut."""
    mutlak = Path(berkas).resolve()
    return Path("\\\\?\\" + str(mutlak)) if os.name == "nt" else mutlak


def baca(kunci_berkas):
    return pd.read_excel(jalur_aman(TERPETAKAN[kunci_berkas]), header=None)


def ambil_provinsi(df, kolom, nama):
    """Ambil baris yang kolom-0 nya berupa nama provinsi, lalu satu kolom nilai."""
    hasil = pd.DataFrame({"kunci": df[0].map(kunci), nama: pd.to_numeric(df[kolom], errors="coerce")})
    return hasil[hasil["kunci"] != "INDONESIA"].dropna(subset=["kunci"])


# Daftar 38 provinsi acuan = urutan berkas persentase penduduk miskin provinsi
p0_prov = baca("p0_provinsi")
# kolom 7 = Jumlah (perkotaan+perdesaan), Semester 1 (Maret)
p0 = ambil_provinsi(p0_prov.iloc[5:], 7, "p0")
p0 = p0[p0["kunci"].str.fullmatch(r"[A-Z .]+")].head(38)
ACUAN = set(p0["kunci"])
assert len(ACUAN) == 38, f"Provinsi acuan seharusnya 38, ditemukan {len(ACUAN)}"

tabel = {"p0": p0}
tabel["gk_kota"] = ambil_provinsi(baca("garis").iloc[5:], 1, "gk_kota")
tabel["gk_desa"] = ambil_provinsi(baca("garis").iloc[5:], 4, "gk_desa")
tabel["p1"] = ambil_provinsi(baca("p1").iloc[5:], 7, "p1")
tabel["p2"] = ambil_provinsi(baca("p2").iloc[5:], 7, "p2")
tabel["sekolah"] = ambil_provinsi(baca("sekolah").iloc[3:], 1, "lama_sekolah")
# Perhatian: isi berkas diidentifikasi dari JUDULNYA, bukan dari nama berkas.
#   PEB197_1.XLS = air minum layak ; PERSEN_4.XLS = sanitasi layak (kolom 3 = perkotaan+perdesaan)
tabel["air"] = ambil_provinsi(baca("air").iloc[4:], 3, "air_layak")
tabel["sanitasi"] = ambil_provinsi(baca("sanitasi").iloc[4:], 3, "sanitasi_layak")
tabel["pengeluaran"] = ambil_provinsi(baca("pengeluaran").iloc[1:], 3, "pengeluaran_total")
makanan = ambil_provinsi(baca("pengeluaran").iloc[1:], 1, "pengeluaran_makanan")
tabel["tpt"] = ambil_provinsi(baca("tpt").iloc[1:41], 1, "tpt")      # Februari
tabel["tpak"] = ambil_provinsi(baca("tpt").iloc[1:41], 3, "tpak")    # Februari

# Penggabungan bertahap, dengan pemeriksaan: setiap tabel harus berisi tepat 38 provinsi acuan
gabung = p0
for nama, t in list(tabel.items())[1:] + [("makanan", makanan)]:
    t = t[t["kunci"].isin(ACUAN)]
    kurang = ACUAN - set(t["kunci"])
    assert not kurang, f"Tabel '{nama}' kehilangan provinsi: {kurang}"
    gabung = gabung.merge(t, on="kunci", how="left", validate="one_to_one")

# Variabel turunan: porsi pengeluaran untuk makanan (indikator klasik kesejahteraan; Hukum Engel)
gabung["porsi_makanan"] = gabung["pengeluaran_makanan"] / gabung["pengeluaran_total"] * 100

# Keterbatasan data: DKI Jakarta tidak punya wilayah perdesaan, garis kemiskinan desanya kosong.
# Untuk PCA diisi sementara dengan garis kemiskinan perkotaannya (dicatat di makalah).
isi = gabung["gk_desa"].isna()
print("Garis kemiskinan perdesaan kosong untuk:", gabung.loc[isi, "kunci"].tolist())
gabung["gk_desa"] = gabung["gk_desa"].fillna(gabung["gk_kota"])
gabung["gk_desa_diisi"] = isi

gabung["provinsi"] = gabung["kunci"].str.title().str.replace("Dki", "DKI").str.replace("Di Yogyakarta", "DI Yogyakarta")
gabung.to_csv(OLAHAN / "provinsi_multivariat_2025.csv", index=False)

# ---------------------------------------------------------------------------
# 2. PCA (Principal Component Analysis).
# Variabel punya satuan sangat berbeda (rupiah, persen, tahun). PCA menangkap variasi terbesar,
# sehingga variabel berskala besar (rupiah) akan mendominasi jika tidak distandarkan lebih dulu.
# StandardScaler mengubah tiap variabel menjadi rata-rata 0 dan simpangan baku 1.
# ---------------------------------------------------------------------------
VAR_PCA = ["p0", "gk_kota", "gk_desa", "lama_sekolah", "sanitasi_layak", "air_layak",
           "pengeluaran_total", "tpt", "tpak", "porsi_makanan"]
X = StandardScaler().fit_transform(gabung[VAR_PCA])
pca = PCA(n_components=2, random_state=0)
koord = pca.fit_transform(X)
pca_df = pd.DataFrame({"provinsi": gabung["provinsi"], "pc1": koord[:, 0], "pc2": koord[:, 1]})
pca_df.to_csv(OLAHAN / "provinsi_pca_2025.csv", index=False)
muatan = pd.DataFrame(pca.components_.T, index=VAR_PCA, columns=["pc1", "pc2"])
muatan.to_csv(OLAHAN / "provinsi_pca_muatan_2025.csv")
print("Ragam dijelaskan:", [round(v * 100, 1) for v in pca.explained_variance_ratio_],
      "total", round(pca.explained_variance_ratio_.sum() * 100, 1))
print("Korelasi p0 dengan p1 / p2:", round(gabung["p0"].corr(gabung["p1"]), 2), round(gabung["p0"].corr(gabung["p2"]), 2))
print(pca_df.sort_values("pc1").iloc[[0, 1, 2, -3, -2, -1]].round(2).to_string(index=False))

# ---------------------------------------------------------------------------
# 3. Kabupaten/kota. Berkas berurutan: baris provinsi (HURUF BESAR) diikuti kabupaten/kota-nya.
# Nama kabupaten/kota bisa kembar antarprovinsi, jadi provinsi disimpan untuk pencocokan peta.
# ---------------------------------------------------------------------------
def kabkota(nama_berkas, kolom):
    d = baca(nama_berkas).iloc[3:, :2].copy()
    d.columns = ["nama", kolom]
    d["nama"] = d["nama"].astype(str).str.strip()
    d[kolom] = pd.to_numeric(d[kolom], errors="coerce")
    adalah_prov = d["nama"].str.upper().map(kunci).isin(ACUAN) & (d["nama"] == d["nama"].str.upper())
    d["provinsi"] = d["nama"].where(adalah_prov).ffill().map(kunci)  # kunci sama dengan tabel provinsi
    return d[~adalah_prov].reset_index(drop=True)

kk_p = kabkota("p0_kabkota", "p0")
kk_j = kabkota("jumlah_kabkota", "jumlah_ribu")
assert (kk_p["nama"] == kk_j["nama"]).all() and (kk_p["provinsi"] == kk_j["provinsi"]).all()
kk = kk_p.merge(kk_j[["jumlah_ribu"]], left_index=True, right_index=True)
print("Kabupaten/kota:", len(kk), "| kosong:", int(kk[["p0", "jumlah_ribu"]].isna().any(axis=1).sum()),
      "| nama kembar:", int(kk.duplicated("nama", keep=False).sum()))
kk.to_csv(OLAHAN / "kabkota_kemiskinan_2025.csv", index=False)

# ---------------------------------------------------------------------------
# 4. Deret waktu: persentase penduduk miskin, kolom "Jumlah" (perkotaan+perdesaan), Semester 1 (Maret).
# Header berlapis (jenis daerah, tahun, semester) dirata menjadi satu nama kolom.
# ---------------------------------------------------------------------------
w = baca("deret_waktu")
daerah = w.iloc[1].ffill()
tahun = w.iloc[2].ffill()
semester = w.iloc[3]
baris = []
for j in range(1, w.shape[1]):
    if daerah[j] == "Jumlah" and str(semester[j]).startswith("Semester 1"):
        baris.append((j, int(tahun[j])))
seri = pd.DataFrame({"kunci": w.iloc[4:, 0].map(kunci)})
for j, th in baris:
    seri[th] = pd.to_numeric(w.iloc[4:, j], errors="coerce")
seri = seri[seri["kunci"].str.fullmatch(r"[A-Z .]+") & (seri["kunci"] != "INDONESIA")]
seri = seri.dropna(how="all", subset=[c for c in seri.columns if c != "kunci"])
print("Deret waktu (Semester 1/Maret): tahun terisi per kolom ->",
      {th: int(seri[th].notna().sum()) for _, th in baris if seri[th].notna().any()})
seri.to_csv(OLAHAN / "provinsi_kemiskinan_deret_waktu.csv", index=False)
print("Selesai. Berkas olahan ada di", OLAHAN)