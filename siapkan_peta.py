import json
import pandas as pd

print("--- MENYIAPKAN PETA FINAL UNTUK PLOTLY ---")

# 1. Load GeoJSON dan CSV BPS
with open('data/mentah/batas_kabkota.geojson', 'r', encoding='utf-8') as f:
    geojson_data = json.load(f)

df_kabkota = pd.read_csv('data/olahan/kabkota_kemiskinan_2025.csv')

# 2. Kamus Penyelaras Ejaan (BPS -> Nama di Peta GeoJSON)
# Berdasarkan sampel perbedaan, kita buat kamus pemetaan dasarnya di sini:
mapping_ejaan = {
    "KOTA JAKARTA PUSAT": "KOTA ADMINISTRASI JAKARTA PUSAT",
    "KOTA JAKARTA UTARA": "KOTA ADMINISTRASI JAKARTA UTARA",
    "KOTA JAKARTA BARAT": "KOTA ADMINISTRASI JAKARTA BARAT",
    "KOTA JAKARTA SELATAN": "KOTA ADMINISTRASI JAKARTA SELATAN",
    "KOTA JAKARTA TIMUR": "KOTA ADMINISTRASI JAKARTA TIMUR",
    "KOTA BANJAR BARU": "KOTA BANJARBARU",
    "KOTA PEMATANG SIANTAR": "KOTA PEMATANGSIANTAR",
    "KOTA PAREPARE": "KOTA PARE PARE",
    "KOTA LUBUKLINGGAU": "KOTA LUBUK LINGGAU",
    "MAMUJU UTARA": "PASANGKAYU",
    "TOBA SAMOSIR": "TOBA",
    "MUKOMUKO": "MUKO MUKO",
    "TULANGBAWANG": "TULANG BAWANG",
    # Tambahkan penyesuaian lain jika nanti masih ada yang tidak sinkron
}

# Terapkan mapping ke dataframe BPS
df_kabkota['nama_bersih'] = df_kabkota['nama'].astype(str).str.upper().str.strip()
df_kabkota['nama_bersih'] = df_kabkota['nama_bersih'].replace(mapping_ejaan)

# Ubah CSV menjadi dictionary agar mudah disuntikkan ke GeoJSON berdasarkan nama
data_kemiskinan_dict = df_kabkota.set_index('nama_bersih').to_dict(orient='index')

# 3. Suntikkan data BPS ke dalam properti setiap fitur GeoJSON
matched_count = 0
unmatched_features = []

for feature in geojson_data['features']:
    nama_peta = str(feature['properties']['WADMKK']).upper().strip()
    
    if nama_peta in data_kemiskinan_dict:
        # Ambil data BPS dan masukkan ke properties GeoJSON
        info_bps = data_kemiskinan_dict[nama_peta]
        feature['properties']['p0'] = info_bps.get('p0')
        feature['properties']['jumlah_ribu'] = info_bps.get('jumlah_ribu')
        feature['properties']['provinsi_bps'] = info_bps.get('provinsi')
        matched_count += 1
    else:
        unmatched_features.append(nama_peta)
        # Berikan nilai default agar tidak eror di peta
        feature['properties']['p0'] = 0
        feature['properties']['jumlah_ribu'] = 0

print(f"Berhasil mencocokkan dan menyuntikkan data ke {matched_count} wilayah peta.")
if unmatched_features:
    print(f"Peringatan: {len(unmatched_features)} wilayah di peta belum ada padanannya di BPS:", unmatched_features[:5])

# 4. Simpan hasil akhir ke folder data/olahan/
output_path = 'data/olahan/kabkota.geojson'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(geojson_data, f, ensure_ascii=False)

print(f"File GeoJSON final berhasil disimpan di: {output_path}")
print("--- TAHAP PERSIAPAN PIPA DATA SELESAI ---")