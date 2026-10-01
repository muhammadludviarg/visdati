import json

print("Membaca file GeoJSON baru...")
# Pastikan nama file sudah sesuai dengan yang Anda simpan
with open('data/mentah/batas_kabkota.geojson', 'r', encoding='utf-8') as f:
    geojson_data = json.load(f)

# Mengambil properti dari wilayah pertama di dalam peta
contoh_properti = geojson_data['features'][0]['properties']

print("\n--- HASIL INTIP GEOJSON ---")
print(f"Kunci (Keys) yang tersedia: {list(contoh_properti.keys())}")
print(f"Contoh isi datanya: {contoh_properti}")
print("-" * 30)