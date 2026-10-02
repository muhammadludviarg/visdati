// js/main.js - Berkas Global untuk Memuat Data Proyek Visualisasi Kemiskinan

// Objek global untuk menyimpan data yang sudah dimuat
const appData = {
    kabkota: null,
    geojson: null,
    provinsiMultivariat: null,
    provinsiPcaMuatan: null,
    provinsiDeretWaktu: null,
    komoditas: null
};

// Fungsi utama untuk memuat semua data secara asinkron (Async/Await)
async function initApp() {
    console.log("Memuat data aplikasi...");
    try {
        // Memuat file-file JSON dan GeoJSON dari folder data/olahan/
        const cacheBuster = "?v=" + new Date().getTime();
        const [
            kabkotaRes, 
            geojsonRes, 
            multivariatRes, 
            pcaMuatanRes, 
            deretWaktuRes, 
            komoditasRes,
            provinsiSimbolRes
        ] = await Promise.all([
            fetch('data/olahan/kabkota_kemiskinan.json' + cacheBuster),
            fetch('data/olahan/kabkota.geojson' + cacheBuster),
            fetch('data/olahan/provinsi_multivariat.json' + cacheBuster),
            fetch('data/olahan/provinsi_pca_muatan.json' + cacheBuster),
            fetch('data/olahan/provinsi_kemiskinan_deret_waktu.json' + cacheBuster),
            fetch('data/olahan/komoditas_kemiskinan.json' + cacheBuster),
            fetch('data/olahan/provinsi_simbol.json' + cacheBuster)
        ]);

        // Parsing hasil fetch ke format JSON
        appData.kabkota = await kabkotaRes.json();
        appData.geojson = await geojsonRes.json();
        appData.provinsiMultivariat = await multivariatRes.json();
        appData.provinsiPcaMuatan = await pcaMuatanRes.json();
        appData.provinsiDeretWaktu = await deretWaktuRes.json();
        appData.komoditas = await komoditasRes.json();
        appData.provinsiSimbol = await provinsiSimbolRes.json();

        console.log("Semua data berhasil dimuat ke memori browser!", appData);

        // Setelah data siap, kita picu fungsi render untuk masing-masing scene (jika sudah didefinisikan)
        if (typeof renderScene1 === 'function') renderScene1();
        if (typeof renderScene2 === 'function') renderScene2();
        if (typeof renderScene3 === 'function') renderScene3();
        if (typeof renderScene4 === 'function') renderScene4();
        if (typeof renderScene5 === 'function') renderScene5();
        if (typeof renderScene6 === 'function') renderScene6();

    } catch (error) {
        console.error("Terjadi kesalahan saat memuat data:", error);
    }
}

// Jalankan saat halaman selesai dimuat
document.addEventListener('DOMContentLoaded', initApp);