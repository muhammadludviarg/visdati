import os
import pandas as pd
import numpy as np

# 1. Setup Direktori
os.makedirs('data/olahan', exist_ok=True)
print("Memulai preprocessing data BPS...")

# ==========================================
# 2. PREPROCESSING DATA 1: TREN KEMISKINAN (1.xlsx)
# ==========================================
print("Memproses 1.xlsx (Tren Kemiskinan)...")

# Buka file Excel sekaligus agar bisa membaca banyak sheet
xls1 = pd.ExcelFile('data/mentah/Persentase dan Jumlah Penduduk Miskin Historis.xlsx')

# -- A. Ambil data Persentase dari Sheet 'Data 1' --
df1_pct = pd.read_excel(xls1, sheet_name='Data 1', header=None)
tahun = df1_pct.iloc[1, 1:].ffill() # Ambil header tahun dan isi sel gabungan (merged cells)
semester = df1_pct.iloc[2, 1:]
nasional_pct = df1_pct.iloc[5, 1:].replace('-', np.nan) # Baris indeks 5 adalah "Kota+Desa"

# -- B. Ambil data Jumlah (Juta Jiwa) dari Sheet 'Data 2' --
df1_abs = pd.read_excel(xls1, sheet_name='Data 2', header=None)
nasional_abs = df1_abs.iloc[5, 1:].replace('-', np.nan)

# Gabungkan menjadi satu dataframe
df_tren = pd.DataFrame({
    'tahun': tahun, 
    'semester': semester, 
    'persentase': nasional_pct,
    'jumlah_juta': nasional_abs
})

# Filter: Ambil hanya 'Semester 1 (Maret)' atau 'Tahunan' agar grafik tidak tumpang tindih
df_tren = df_tren[df_tren['semester'].isin(['Semester 1 (Maret)', 'Tahunan'])]
df_tren = df_tren.dropna(subset=['persentase']).drop_duplicates(subset=['tahun'], keep='first')

# Konversi ke tipe numerik
df_tren['tahun'] = df_tren['tahun'].astype(int)
df_tren['persentase'] = pd.to_numeric(df_tren['persentase'])
df_tren['jumlah_juta'] = pd.to_numeric(df_tren['jumlah_juta'])

# Tambahkan Anotasi untuk Scrollytelling
df_tren['anotasi'] = ""
df_tren.loc[df_tren['tahun'] == 1998, 'anotasi'] = "Krisis Moneter Asia"
df_tren.loc[df_tren['tahun'] == 2020, 'anotasi'] = "Pandemi COVID-19"

# Sortir dari tahun terlama ke terbaru lalu simpan
df_tren = df_tren.sort_values(by='tahun').reset_index(drop=True)
df_tren[['tahun', 'persentase', 'jumlah_juta', 'anotasi']].to_csv('data/olahan/tren_kemiskinan.csv', index=False)
print("  => Berhasil menyimpan: data/olahan/tren_kemiskinan.csv")


# ==========================================
# 3. PREPROCESSING DATA 2: DESA VS KOTA (2.xlsx)
# ==========================================
print("Memproses 2.xlsx (Desa vs Kota)...")
df2 = pd.read_excel('data/mentah/Persentase Penduduk Miskin Berdasarkan Provinsi dan Daerah Historis.xlsx', sheet_name='Data 1', header=None)

provinsi = df2.iloc[4:42, 0].str.strip()
wilayah = df2.iloc[1, :].ffill()
tahun_cols = df2.iloc[2, :].ffill()
semester_cols = df2.iloc[3, :]

# Cari otomatis indeks kolom untuk data Tahun 2024 Semester 1 (Maret)
idx_kota = df2.columns[(wilayah == 'Perkotaan') & (tahun_cols == 2024) & (semester_cols == 'Semester 1 (Maret)')].tolist()
idx_desa = df2.columns[(wilayah == 'Perdesaan') & (tahun_cols == 2024) & (semester_cols == 'Semester 1 (Maret)')].tolist()

if idx_kota and idx_desa:
    p0_kota = df2.iloc[4:42, idx_kota[0]].replace('-', np.nan)
    p0_desa = df2.iloc[4:42, idx_desa[0]].replace('-', np.nan)
    
    df_spasial = pd.DataFrame({
        'provinsi': provinsi,
        'p0_kota': pd.to_numeric(p0_kota),
        'p0_desa': pd.to_numeric(p0_desa)
    }).dropna(subset=['provinsi', 'p0_kota', 'p0_desa']) # Hapus baris kosong
    
    df_spasial.to_csv('data/olahan/desa_kota.csv', index=False)
    print("  => Berhasil menyimpan: data/olahan/desa_kota.csv")
else:
    print("  => Gagal menemukan kolom data untuk Tahun 2024 Semester 1.")

print("\nSelesai! File CSV siap dibaca oleh D3.js.")