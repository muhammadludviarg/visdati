import os
import pandas as pd
import numpy as np

# 1. Setup Direktori
os.makedirs('data/olahan', exist_ok=True)
print("Memulai pengolahan data historis Kabupaten/Kota & Provinsi...")

def clean_province_name(name):
    s = str(name).strip().upper()
    s = s.replace("KEP. ", "KEPULAUAN ")
    if s == "D I YOGYAKARTA":
        return "DI YOGYAKARTA"
    return s.title().replace("Dki", "DKI").replace("Di Yogyakarta", "DI Yogyakarta")

def process_file(filepath, val_col):
    df = pd.read_csv(filepath, header=None)
    # Ambil baris tahun (di baris indeks ke-1)
    years = df.iloc[1, 1:].ffill().values
    
    melted = []
    current_prov = "Indonesia"
    
    for i in range(2, len(df)):
        name = str(df.iloc[i, 0]).strip()
        if pd.isna(name) or name == 'nan' or name.startswith('Catatan'): 
            continue
        
        # Deteksi Provinsi vs Kab/Kota berdasarkan huruf kapital (UPPERCASE)
        # BPS menulis nama Provinsi dengan HURUF BESAR SEMUA
        if name.upper() == name:
            current_prov = clean_province_name(name)
            tingkat = 'provinsi'
            area_name = current_prov
        else:
            tingkat = 'kabkota'
            # Ubah nama kab/kota jadi UPPERCASE agar mudah dicocokkan dengan GeoJSON peta
            area_name = name.upper() 
            
        row_data = df.iloc[i, 1:].values
        
        for y, val in zip(years, row_data):
            val_str = str(val).strip()
            # Jika strip atau kosong, ubah jadi NaN agar tidak eror di web
            if val_str == '-' or pd.isna(val) or val_str == 'nan':
                val_num = np.nan
            else:
                try:
                    val_num = float(val)
                except ValueError:
                    val_num = np.nan
                    
            melted.append({
                'provinsi': current_prov,
                'nama_daerah': area_name,
                'tingkat': tingkat,
                # PERBAIKAN DI SINI: Ubah string menjadi float dulu, baru ke int
                'tahun': int(float(str(y).strip())),
                val_col: val_num
            })
            
    return pd.DataFrame(melted)

print("Membaca data Persentase (P0)...")
# Sesuaikan nama file mentah di bawah ini dengan nama file di laptop Anda
df_p0 = process_file('data/mentah/Persentase Penduduk Miskin (P0) Menurut KabupatenKota.csv', 'p0')

print("Membaca data Absolut (Jumlah)...")
df_abs = process_file('data/mentah/Jumlah Penduduk Miskin (Ribu Jiwa) Menurut KabupatenKota.csv', 'jumlah_ribu')

# Gabungkan data
print("Menggabungkan data...")
df_final = pd.merge(df_p0, df_abs, on=['provinsi', 'nama_daerah', 'tingkat', 'tahun'], how='outer')

# Simpan ke CSV final
output_path = 'data/olahan/kemiskinan_historis_lengkap.csv'
df_final.to_csv(output_path, index=False)
print(f"Selesai! Data berhasil disimpan ke: {output_path}")