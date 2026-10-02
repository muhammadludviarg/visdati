// js/main.js - Pemuatan Data dan Inisialisasi Bertahap Visual Journalism
// ──────────────────────────────────────────────────────────────────────────────
// Menangani pemuatan data asinkron dan memicu render visualisasi
// saat pengguna menggulir ke bagian artikel terkait (Intersection Observer).

const appData = {
    kabkota: null,
    geojson: null,
    provinsiMultivariat: null,
    provinsiPcaMuatan: null,
    komoditas: null,
    provinsiSimbol: null
};

// Status pelacak inisialisasi render agar tidak dirender berulang kali
const sceneRendered = {
    scene1: false,
    scene2: false,
    scene3: false,
    scene5: false
};

// ── 1. PEMUATAN DATA UTAMA (Async / Await dengan Promise.all) ─────────────
async function initApp() {
    console.log("Memuat data artikel visual kemiskinan...");
    try {
        const cacheBuster = "?v=" + new Date().getTime();
        const [
            kabkotaRes, 
            geojsonRes, 
            multivariatRes, 
            pcaMuatanRes, 
            komoditasRes,
            provinsiSimbolRes
        ] = await Promise.all([
            fetch('data/olahan/kabkota_kemiskinan.json' + cacheBuster),
            fetch('data/olahan/kabkota.geojson' + cacheBuster),
            fetch('data/olahan/provinsi_multivariat.json' + cacheBuster),
            fetch('data/olahan/provinsi_pca_muatan.json' + cacheBuster),
            fetch('data/olahan/komoditas_kemiskinan.json' + cacheBuster),
            fetch('data/olahan/provinsi_simbol.json' + cacheBuster)
        ]);

        appData.kabkota = await kabkotaRes.json();
        appData.geojson = await geojsonRes.json();
        appData.provinsiMultivariat = await multivariatRes.json();
        appData.provinsiPcaMuatan = await pcaMuatanRes.json();
        appData.komoditas = await komoditasRes.json();
        appData.provinsiSimbol = await provinsiSimbolRes.json();

        console.log("Data berhasil dimuat ke memori browser!", appData);

        // Siapkan observer untuk lazy-rendering setiap frame grafik saat di-scroll
        setupScrollObservers();

    } catch (error) {
        console.error("Terjadi galat saat memuat dataset:", error);
    }
}

// ── 2. INTERSECTION OBSERVER UNTUK LAZY-RENDERING GRAFIK ─────────────────
function setupScrollObservers() {
    const observerOptions = {
        root: null,
        rootMargin: "100px 0px 100px 0px", // Mulai render saat grafik hampir masuk layar
        threshold: 0.05
    };

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const targetId = entry.target.id;

                // Bagian 1: Peta Spasial (Scene 1)
                if (targetId === "frame-scene1" && !sceneRendered.scene1) {
                    if (typeof initMap === 'function') {
                        initMap();
                        updateMap('koroplet');
                        sceneRendered.scene1 = true;
                    }
                }

                // Bagian 2: Multivariat PCA & Radar (Scene 2) serta Heatmap (Scene 5)
                if (targetId === "frame-scene2" && !sceneRendered.scene2) {
                    if (typeof renderScene2 === 'function') {
                        renderScene2();
                        sceneRendered.scene2 = true;
                    }
                    if (typeof renderScene5 === 'function') {
                        renderScene5();
                        sceneRendered.scene5 = true;
                    }
                }

                // Bagian 3: Anatomi Garis Kemiskinan Treemap & Tree (Scene 3)
                if (targetId === "frame-scene3" && !sceneRendered.scene3) {
                    if (typeof renderScene3 === 'function') {
                        renderScene3();
                        sceneRendered.scene3 = true;
                    }
                }

                // Hentikan observasi pada elemen yang sudah dirender
                obs.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Daftarkan frame visualisasi ke observer
    ["frame-scene1", "frame-scene2", "frame-scene3"].forEach(id => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
    });

    // Fallback: Jika pengguna langsung me-refresh halaman pada posisi tengah
    setTimeout(() => {
        ["frame-scene1", "frame-scene2", "frame-scene3"].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const rect = el.getBoundingClientRect();
                if (rect.top < window.innerHeight && rect.bottom > 0) {
                    if (id === "frame-scene1" && !sceneRendered.scene1 && typeof initMap === 'function') {
                        initMap();
                        updateMap('koroplet');
                        sceneRendered.scene1 = true;
                    }
                    if (id === "frame-scene2" && !sceneRendered.scene2 && typeof renderScene2 === 'function') {
                        renderScene2();
                        sceneRendered.scene2 = true;
                        if (typeof renderScene5 === 'function') {
                            renderScene5();
                            sceneRendered.scene5 = true;
                        }
                    }
                    if (id === "frame-scene3" && !sceneRendered.scene3 && typeof renderScene3 === 'function') {
                        renderScene3();
                        sceneRendered.scene3 = true;
                    }
                }
            }
        });
    }, 400);
}

// ── 3. RESIZE LISTENER DENGAN DEBOUNCE ─────────────────────────────────────
let resizeTimer;
window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        // Render ulang elemen yang sudah pernah terbuka jika ukuran layar berubah signifikan
        if (sceneRendered.scene1 && typeof initMap === 'function') {
            initMap();
            if (typeof updateMap === 'function') {
                updateMap(mapState.currentMode || 'koroplet');
            }
        }
        if (sceneRendered.scene2 && typeof renderScene2 === 'function') {
            renderScene2();
        }
        if (sceneRendered.scene5 && typeof renderScene5 === 'function') {
            renderScene5();
        }
        if (sceneRendered.scene3 && typeof renderScene3 === 'function') {
            renderScene3();
        }
    }, 350);
});

// Jalankan inisialisasi saat DOM siap
document.addEventListener('DOMContentLoaded', initApp);