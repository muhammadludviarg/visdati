import pandas as pd
import json
import os
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA

# Pastikan folder output tersedia
os.makedirs('data/olahan', exist_ok=True)

def ekspor_data_ke_json():
    print("Mulai konversi data...")

    # --- A. Data Kabupaten/Kota (Scene 1 & 3) ---
    # Memuat gabungan persentase dan jumlah kemiskinan
    df_kabkota = pd.read_csv('data/olahan/kabkota_kemiskinan_2025.csv')
    df_kabkota.to_json('data/olahan/kabkota_kemiskinan.json', orient='records')
    print("- Data kabkota berhasil diekspor.")

    # --- B. Kalkulasi PCA dan Data Multivariat (Scene 2 & 5) ---
    df_prov = pd.read_csv('data/olahan/provinsi_multivariat_2025.csv')

    # Ganti string di dalam array ini dengan nama kolom sebenarnya di CSV Anda
    # Ganti string di dalam array ini dengan nama kolom sebenarnya di CSV Anda
    fitur_pca = [
        'p0',                # Persentase penduduk miskin
        'gk_kota',           # Garis kemiskinan perkotaan
        'gk_desa_diisi',     # Garis kemiskinan perdesaan (menggunakan data yang sudah ditangani untuk Jakarta)
        'lama_sekolah',      # Rata-rata lama sekolah
        'sanitasi_layak',    # Akses sanitasi layak
        'air_layak',         # Akses air minum layak
        'pengeluaran_total', # Pengeluaran per kapita
        'tpt',               # Tingkat pengangguran terbuka
        'tpak',              # Tingkat partisipasi angkatan kerja
        'porsi_makanan'      # Porsi pengeluaran untuk makanan
    ]

    # Standarisasi data (Z-score normalization)
    X = df_prov[fitur_pca]
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Kalkulasi PCA (2 Komponen)
    pca = PCA(n_components=2)
    komponen_pca = pca.fit_transform(X_scaled)

    # Masukkan hasil PCA kembali ke dataframe untuk diekspor
    df_prov['PC1'] = komponen_pca[:, 0]
    df_prov['PC2'] = komponen_pca[:, 1]
    df_prov.to_json('data/olahan/provinsi_multivariat.json', orient='records')

    # Ekspor bobot (loading factors) PCA untuk koordinat paralel
    loadings = pd.DataFrame(pca.components_.T, columns=['PC1', 'PC2'], index=fitur_pca)
    loadings.reset_index(inplace=True)
    loadings.rename(columns={'index': 'variabel'}, inplace=True)
    loadings.to_json('data/olahan/provinsi_pca_muatan.json', orient='records')
    print("- Kalkulasi PCA dan data provinsi berhasil diekspor.")

    # --- C. Data Deret Waktu (Scene 6) ---
    df_waktu = pd.read_csv('data/olahan/provinsi_kemiskinan_deret_waktu.csv')
    df_waktu.to_json('data/olahan/provinsi_kemiskinan_deret_waktu.json', orient='records')
    print("- Data deret waktu berhasil diekspor.")

    # --- D. Data Komoditas Kemiskinan (Scene 4) ---
    # Membaca data mentah komoditas karena tidak perlu diolah berat
    df_komoditas = pd.read_csv('data/mentah/04_komoditas_garis_kemiskinan_maret2026.csv', sep=';')
    df_komoditas.to_json('data/olahan/komoditas_kemiskinan.json', orient='records')
    print("- Data komoditas kemiskinan berhasil diekspor.")

    print("Semua proses ekspor JSON selesai!")

if __name__ == "__main__":
    ekspor_data_ke_json()