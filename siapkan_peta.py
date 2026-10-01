"""
siapkan_peta.py
Menyiapkan data peta untuk Scene 1 dan 3.

Masukan : batas wilayah digital (GeoJSON, bukan dari BPS) + data/olahan/kabkota_kemiskinan_2025.csv (BPS)
Keluaran: data/olahan/kabkota.geojson     peta + atribut + kelas kuantil + titik pusat
          data/olahan/peta_meta.json      batas kelas, label, dan kotak batas tiap kelompok wilayah
"""
import json
import sys
from pathlib import Path

import pandas as pd

GEOJSON_MASUK = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("data/mentah/batas_kabkota_sederhana.geojson")
OLAHAN = Path("data/olahan")
JUMLAH_KELAS = 6

# Berkas peta tidak mengisi kelompok pulau untuk lima wilayah DI Yogyakarta (nilainya kosong/NaN).
# NaN bukan JSON yang sah: JSON.parse di peramban akan gagal dan SELURUH peta tidak tampil.
# Maka diisi manual, dan keluaran diperiksa ketat di akhir skrip.
PULAU_MANUAL = {"DI YOGYAKARTA": "Jawa"}


def kunci(nama):
    s = " ".join(str(nama).upper().split())
    return "DI YOGYAKARTA" if s == "D I YOGYAKARTA" else s


# ---------------------------------------------------------------------------
# 1. Mencocokkan peta dengan data BPS.
# Mengapa pasangan (provinsi, nama)? Nama kabupaten/kota bisa kembar di provinsi berbeda,
# dan "Bekasi" (kabupaten) berbeda dari "Kota Bekasi". Pencocokan hanya lewat nama saja berisiko.
# Peta sudah membawa angka kemiskinan; angka itu DIPERIKSA terhadap berkas BPS olahan kita,
# bukan dipercaya begitu saja.
# ---------------------------------------------------------------------------
peta = json.load(open(GEOJSON_MASUK, encoding="utf-8"))
bps = pd.read_csv(OLAHAN / "kabkota_kemiskinan_2025.csv")
bps["kunci_prov"] = bps["provinsi"].map(kunci)
bps = bps.set_index(["kunci_prov", "nama"])
assert bps.index.is_unique, "Pasangan (provinsi, nama) di data BPS tidak unik"

# ---------------------------------------------------------------------------
# 2. Titik pusat tiap wilayah (untuk peta lingkaran di Scene 3).
# Dipakai pusat massa poligon terluas (rumus tali sepatu / shoelace). Pusat kotak batas dihindari
# karena untuk wilayah berbentuk bulan sabit atau berpulau-pulau titiknya bisa jatuh di luar wilayah.
# ---------------------------------------------------------------------------
def pusat_massa(cincin):
    a = cx = cy = 0.0
    for (x0, y0), (x1, y1) in zip(cincin, cincin[1:] + cincin[:1]):
        t = x0 * y1 - x1 * y0
        a += t
        cx += (x0 + x1) * t
        cy += (y0 + y1) * t
    a *= 0.5
    if abs(a) < 1e-12:
        return cincin[0][0], cincin[0][1], 0.0
    return cx / (6 * a), cy / (6 * a), abs(a)


def poligon_list(geom):
    return [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]


def bulatkan(geom, desimal=3):
    # 3 desimal ~ 110 m: cukup untuk peta nasional, ukuran berkas turun
    f = lambda p: [round(p[0], desimal), round(p[1], desimal)]
    if geom["type"] == "Polygon":
        geom["coordinates"] = [[f(p) for p in ring] for ring in geom["coordinates"]]
    else:
        geom["coordinates"] = [[[f(p) for p in ring] for ring in poly] for poly in geom["coordinates"]]
    return geom


baris = []
for fitur in peta["features"]:
    p = fitur["properties"]
    kunci_baris = (kunci(p["provinsi"]), p["kabupaten_kota"])
    assert kunci_baris in bps.index, f"Tidak cocok dengan data BPS: {kunci_baris}"
    b = bps.loc[kunci_baris]
    assert abs(b["p0"] - p["persen_penduduk_miskin"]) < 0.005, f"Persentase berbeda: {kunci_baris}"
    assert abs(b["jumlah_ribu"] - p["jumlah_penduduk_miskin_ribu"]) < 0.005, f"Jumlah berbeda: {kunci_baris}"

    fitur["geometry"] = bulatkan(fitur["geometry"])
    terluas = max((poly[0] for poly in poligon_list(fitur["geometry"])), key=lambda c: pusat_massa(c)[2])
    lon, lat, _ = pusat_massa(terluas)
    baris.append({"kode": p["kode_wilayah"], "nama": p["kabupaten_kota"], "provinsi": p["provinsi"].title()
                  .replace("Dki", "DKI").replace("D I ", "DI "), "jenis": p["jenis"],
                  "pulau": p.get("kelompok_pulau") or PULAU_MANUAL[kunci(p["provinsi"])], "p0": b["p0"], "jumlah_ribu": b["jumlah_ribu"],
                  "lon": round(lon, 3), "lat": round(lat, 3)})
assert len(baris) == 514

# ---------------------------------------------------------------------------
# 3. Kelas kuantil: 6 kelompok berisi jumlah wilayah hampir sama.
# Mengapa kuantil, bukan rentang sama lebar? Sebaran persentase miskin condong ke kanan
# (median 8,75 tetapi maksimum 42,56), jadi rentang sama lebar menaruh hampir semua wilayah
# di 1-2 warna terendah. Kuantil menjaga perbedaan antarwilayah tetap terbaca.
# ---------------------------------------------------------------------------
df = pd.DataFrame(baris)
df["kelas"] = pd.qcut(df["p0"], JUMLAH_KELAS, labels=False, duplicates="drop") + 1
tepi = [df["p0"].min()] + [df.loc[df["kelas"] == k, "p0"].max() for k in range(1, JUMLAH_KELAS + 1)]
fmt = lambda x: f"{x:.2f}".replace(".", ",")
label = [f"{fmt(tepi[k])} – {fmt(tepi[k + 1])}" for k in range(JUMLAH_KELAS)]
for k in range(JUMLAH_KELAS):
    print(f"Kelas {k + 1}: {label[k]}  ({int((df['kelas'] == k + 1).sum())} wilayah)")

for fitur, (_, r) in zip(peta["features"], df.iterrows()):
    fitur["properties"] = {k: (v.item() if hasattr(v, "item") else v) for k, v in r.to_dict().items()}

# ---------------------------------------------------------------------------
# 4. Kotak batas tiap kelompok wilayah: dipakai dropdown untuk memperbesar peta.
# Dihitung di sini (Python) supaya JavaScript tinggal memakainya tanpa menghitung ulang.
# ---------------------------------------------------------------------------
def kotak(subset_fitur, jarak=0.06):
    xs, ys = [], []
    for f in subset_fitur:
        for poly in poligon_list(f["geometry"]):
            for x, y in (p[:2] for p in poly[0]):
                xs.append(x)
                ys.append(y)
    px, py = (max(xs) - min(xs)) * jarak, (max(ys) - min(ys)) * jarak
    return {"lon": [round(min(xs) - px, 2), round(max(xs) + px, 2)],
            "lat": [round(min(ys) - py, 2), round(max(ys) + py, 2)]}


kelompok = {"Seluruh Indonesia": kotak(peta["features"])}
for nama in ["Sumatera", "Jawa", "Bali dan Nusa Tenggara", "Kalimantan", "Sulawesi", "Maluku dan Papua"]:
    kelompok[nama] = kotak([f for f in peta["features"] if f["properties"]["pulau"] == nama])

OLAHAN.mkdir(parents=True, exist_ok=True)
keluaran = {"type": "FeatureCollection", "features": peta["features"]}
json.dump(keluaran, open(OLAHAN / "kabkota.geojson", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
json.dump({"label_kelas": label, "kelompok": kelompok}, open(OLAHAN / "peta_meta.json", "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)
print("Ukuran kabkota.geojson: %.2f MB" % ((OLAHAN / "kabkota.geojson").stat().st_size / 1e6))

# Pemeriksaan akhir: tolak NaN/Infinity (bukan JSON sah) dan pastikan setiap wilayah punya kelompok pulau
def _tolak(konstanta):
    raise ValueError(f"Keluaran memuat {konstanta}, bukan JSON yang sah")

hasil = json.load(open(OLAHAN / "kabkota.geojson", encoding="utf-8"), parse_constant=_tolak)
assert all(f["properties"]["pulau"] in kelompok for f in hasil["features"]), "Ada wilayah tanpa kelompok pulau"
print("Pemeriksaan JSON: lolos")
