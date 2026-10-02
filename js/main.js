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
    provinsiSimbol: null,
    trenKemiskinan: null,
    desaKota: null,
    dataTeksKemiskinan: null
};

// Status pelacak inisialisasi render agar tidak dirender berulang kali
const sceneRendered = {
    makro: false,
    scene1Koroplet: false,
    scene1Bubble: false,
    scene2: false,
    scene3Treemap: false,
    scene3Tree: false,
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
            provinsiSimbolRes,
            trenRes,
            desaKotaRes,
            teksRes
        ] = await Promise.all([
            fetch('data/olahan/kabkota_kemiskinan.json' + cacheBuster),
            fetch('data/olahan/kabkota.geojson' + cacheBuster),
            fetch('data/olahan/provinsi_multivariat.json' + cacheBuster),
            fetch('data/olahan/provinsi_pca_muatan.json' + cacheBuster),
            fetch('data/olahan/komoditas_kemiskinan.json' + cacheBuster),
            fetch('data/olahan/provinsi_simbol.json' + cacheBuster),
            d3.csv('data/olahan/tren_kemiskinan.csv' + cacheBuster),
            d3.csv('data/olahan/desa_kota.csv' + cacheBuster),
            fetch('data/olahan/data_teks_kemiskinan.json' + cacheBuster)
        ]);

        appData.kabkota = await kabkotaRes.json();
        appData.geojson = await geojsonRes.json();
        appData.provinsiMultivariat = await multivariatRes.json();
        appData.provinsiPcaMuatan = await pcaMuatanRes.json();
        appData.komoditas = await komoditasRes.json();
        appData.provinsiSimbol = await provinsiSimbolRes.json();
        
        // Formating data tren CSV
        appData.trenKemiskinan = trenRes.map(d => ({
            tahun: +d.tahun,
            persentase: +d.persentase,
            jumlah_juta: +d.jumlah_juta,
            anotasi: d.anotasi || null
        }));

        // Formating data desa_kota CSV
        appData.desaKota = desaKotaRes.map(d => ({
            provinsi: d.provinsi,
            p0_kota: +d.p0_kota,
            p0_desa: +d.p0_desa
        }));

        appData.dataTeksKemiskinan = await teksRes.json();

        console.log("Semua data berhasil dimuat ke memori browser!", appData);

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
        rootMargin: "300px 0px 300px 0px",
        threshold: 0.01
    };

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const targetId = entry.target.id;

                // Bagian 1: Resolusi Makro (BRS Teks & Tren Line Chart)
                if ((targetId === "frame-teks-brs" || targetId === "frame-tren-kemiskinan") && !sceneRendered.makro) {
                    if (typeof renderMakroSection === 'function') {
                        renderMakroSection();
                        sceneRendered.makro = true;
                    }
                }

                // Bagian 2: Resolusi Spasial - Koroplet (Peta 1)
                if (targetId === "frame-scene1-koroplet" && !sceneRendered.scene1Koroplet) {
                    if (typeof initKoropletMap === 'function') {
                        initKoropletMap('#chart-map-koroplet');
                        sceneRendered.scene1Koroplet = true;
                    }
                }

                // Bagian 2: Resolusi Spasial - Bubble (Peta 2)
                if (targetId === "frame-scene1-bubble" && !sceneRendered.scene1Bubble) {
                    if (typeof initBubbleMap === 'function') {
                        initBubbleMap('#chart-map-bubble');
                        sceneRendered.scene1Bubble = true;
                    }
                }

                // Bagian 3: Multivariat PCA & Radar (Scene 2) serta Heatmap (Scene 5)
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

                // Bagian 3: Anatomi Garis Kemiskinan Treemap
                if (targetId === "frame-scene3-treemap" && !sceneRendered.scene3Treemap) {
                    if (typeof renderTreemapView === 'function') {
                        renderTreemapView('#chart-scene3-treemap');
                        sceneRendered.scene3Treemap = true;
                    }
                }

                // Bagian 3: Anatomi Garis Kemiskinan Collapsible Tree
                if (targetId === "frame-scene3-tree" && !sceneRendered.scene3Tree) {
                    if (typeof renderCollapsibleTreeView === 'function') {
                        renderCollapsibleTreeView('#chart-scene3-tree');
                        sceneRendered.scene3Tree = true;
                    }
                }

                obs.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Daftarkan frame visualisasi ke observer
    [
        "frame-teks-brs", 
        "frame-tren-kemiskinan", 
        "frame-scene1-koroplet", 
        "frame-scene1-bubble", 
        "frame-scene2", 
        "frame-scene3-treemap", 
        "frame-scene3-tree"
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
    });

    // Fallback: Jika me-refresh halaman pada posisi tertentu
    setTimeout(() => {
        if (!sceneRendered.makro && typeof renderMakroSection === 'function') {
            renderMakroSection();
            sceneRendered.makro = true;
        }
    }, 400);
}

// ── 3. RESIZE LISTENER DENGAN DEBOUNCE ─────────────────────────────────────
let resizeTimer;
window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (sceneRendered.makro && typeof renderMakroSection === 'function') {
            renderMakroSection();
        }
        if (sceneRendered.scene1Koroplet && typeof initKoropletMap === 'function') {
            initKoropletMap('#chart-map-koroplet');
        }
        if (sceneRendered.scene1Bubble && typeof initBubbleMap === 'function') {
            initBubbleMap('#chart-map-bubble');
        }
        if (sceneRendered.scene2 && typeof renderScene2 === 'function') {
            renderScene2();
        }
        if (sceneRendered.scene5 && typeof renderScene5 === 'function') {
            renderScene5();
        }
        if (sceneRendered.scene3Treemap && typeof renderTreemapView === 'function') {
            renderTreemapView('#chart-scene3-treemap');
        }
        if (sceneRendered.scene3Tree && typeof renderCollapsibleTreeView === 'function') {
            renderCollapsibleTreeView('#chart-scene3-tree');
        }
    }, 350);
});

// Jalankan inisialisasi saat DOM siap
document.addEventListener('DOMContentLoaded', initApp);