// Fungsi bersama untuk semua scene.
// Prinsip: berkas ini TIDAK menghitung apa pun yang berat. Semua hitungan (PCA, korelasi, dsb.)
// sudah dikerjakan Python dan disimpan sebagai JSON di folder data/olahan/.

const WARNA = {
  latar: "#242424",
  teks: "#f2f2f2",
  redup: "#b9b9b9",
  garis: "#4a4a4a",
  aksen: "#2ec4b6",
  aksenGelap: "#14625b",
  // Palet kategorik ramah buta warna (Okabe-Ito)
  kategori: ["#E69F00", "#56B4E9", "#009E73", "#F0E442", "#0072B2", "#D55E00", "#CC79A7", "#999999"],
};

// Memuat satu berkas JSON dari folder data/olahan/. Mengembalikan null bila gagal,
// supaya satu scene yang rusak tidak mematikan scene lain.
async function muatJSON(nama) {
  try {
    const respons = await fetch(`data/olahan/${nama}`);
    if (!respons.ok) throw new Error(`HTTP ${respons.status}`);
    return await respons.json();
  } catch (galat) {
    console.error(`Gagal memuat ${nama}:`, galat);
    return null;
  }
}

// Format angka gaya Indonesia: titik sebagai pemisah ribuan, koma sebagai desimal.
const formatAngka = (nilai, desimal = 0) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: desimal, maximumFractionDigits: desimal }).format(nilai);

// Tata letak dasar Plotly bertema gelap; tiap scene menimpa bagian yang perlu.
function tataLetakDasar(judul) {
  return {
    title: { text: judul, font: { color: WARNA.teks, size: 16 }, x: 0.02, xanchor: "left" },
    paper_bgcolor: WARNA.latar,
    plot_bgcolor: WARNA.latar,
    font: { family: "Archivo, system-ui, sans-serif", color: WARNA.teks },
    margin: { l: 55, r: 20, t: 55, b: 50 },
    xaxis: { gridcolor: WARNA.garis, zerolinecolor: WARNA.garis },
    yaxis: { gridcolor: WARNA.garis, zerolinecolor: WARNA.garis },
  };
}

// Opsi Plotly: responsif untuk ponsel, tanpa logo dan tombol yang tidak perlu.
const OPSI_PLOTLY = {
  responsive: true,
  displaylogo: false,
  modeBarButtonsToRemove: ["select2d", "lasso2d", "autoScale2d"],
};

// Placeholder sementara agar kotak chart yang belum dibangun tidak tampak kosong.
function tampilkanBelumAda(idElemen, pesan) {
  const el = document.getElementById(idElemen);
  if (el) {
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.justifyContent = "center";
    el.style.color = WARNA.redup;
    el.textContent = pesan;
  }
}
