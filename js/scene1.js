// scene1.js - Peta choropleth persentase penduduk miskin, 514 kabupaten/kota
// Masukan: data/olahan/kabkota.geojson dan data/olahan/peta_meta.json (keduanya dari siapkan_peta.py)

// Menghitung pusat dan tingkat perbesaran peta agar sebuah kotak batas (lon, lat) muat di wadah.
// Ukuran petak peta Mapbox 512 piksel, dan proyeksinya Mercator (jarak lintang melar ke arah kutub).
function hitungPandangan(kotak, lebar, tinggi) {
  const mercatorY = function (lat) {
    return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 180 / 2));
  };
  const balikMercator = function (y) {
    return ((2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180) / Math.PI;
  };
  const bentangLon = kotak.lon[1] - kotak.lon[0];
  const yBawah = mercatorY(kotak.lat[0]);
  const yAtas = mercatorY(kotak.lat[1]);
  const bentangY = yAtas - yBawah; // dalam radian
  const zoomLon = Math.log2((lebar * 360) / (512 * bentangLon));
  const zoomLat = Math.log2((tinggi * 2 * Math.PI) / (512 * bentangY));
  return {
    center: {
      lon: (kotak.lon[0] + kotak.lon[1]) / 2,
      lat: balikMercator((yBawah + yAtas) / 2),
    },
    zoom: Math.min(zoomLon, zoomLat),
  };
}

(async function () {
  // Pembantu lokal: bagian ini sengaja tidak bergantung pada isi main.js, karena
  // muatJSON di main.js Anda sudah menambahkan awalan 'data/olahan/' sendiri.
  const VIRIDIS_6 = [
    "#fde725",
    "#7ad151",
    "#22a884",
    "#2a788e",
    "#414487",
    "#440154",
  ];
  const KONFIGURASI_PLOTLY = {
    responsive: true,
    displaylogo: false,
    scrollZoom: false,
  };
  const formatAngka = function (nilai, desimal) {
    return Number(nilai).toLocaleString("id-ID", {
      minimumFractionDigits: desimal,
      maximumFractionDigits: desimal,
    });
  };
  const ambil = async function (alamat) {
    const respons = await fetch(alamat);
    if (!respons.ok)
      throw new Error("Gagal memuat " + alamat + " (" + respons.status + ")");
    return respons.json();
  };

  try {
    const [geo, meta] = await Promise.all([
      ambil("data/olahan/kabkota.geojson"),
      ambil("data/olahan/peta_meta.json"),
    ]);
    const fitur = geo.features;
    const jumlahKelas = meta.label_kelas.length;

    // Skala warna bertahap: setiap kelas (1 sampai 6) mendapat satu warna tegas, tanpa gradasi
    const skalaWarna = [];
    VIRIDIS_6.forEach(function (warna, k) {
      skalaWarna.push([k / jumlahKelas, warna]);
      skalaWarna.push([(k + 1) / jumlahKelas, warna]);
    });

    const jejak = {
      type: "choroplethmapbox",
      geojson: geo,
      featureidkey: "properties.kode",
      locations: fitur.map(function (f) {
        return f.properties.kode;
      }),
      z: fitur.map(function (f) {
        return f.properties.kelas;
      }),
      zmin: 0.5,
      zmax: jumlahKelas + 0.5,
      colorscale: skalaWarna,
      marker: { line: { width: 0.3, color: "#ffffff" }, opacity: 0.9 },
      customdata: fitur.map(function (f) {
        const p = f.properties;
        return [
          p.nama,
          p.provinsi,
          formatAngka(p.p0, 2),
          formatAngka(p.jumlah_ribu, 2),
        ];
      }),
      hovertemplate:
        "<b>%{customdata[0]}</b><br>%{customdata[1]}<br>" +
        "Penduduk miskin: %{customdata[2]}%<br>" +
        "Jumlah: %{customdata[3]} ribu jiwa<extra></extra>",
      colorbar: {
        title: { text: "Penduduk miskin (%)" },
        tickmode: "array",
        tickvals: meta.label_kelas.map(function (_, k) {
          return k + 1;
        }),
        ticktext: meta.label_kelas,
        len: 0.8,
        thickness: 14,
      },
    };

    const wadah = document.getElementById("s1-peta");
    const awal = hitungPandangan(
      meta.kelompok["Seluruh Indonesia"],
      wadah.clientWidth,
      wadah.clientHeight,
    );

    const tata = {
      mapbox: { style: "carto-positron", center: awal.center, zoom: awal.zoom },
      margin: { l: 0, r: 0, t: 36, b: 0 },
      title: {
        text: "Persentase penduduk miskin menurut kabupaten/kota, Maret 2025",
        font: { size: 14 },
      },
      font: { family: "Archivo, sans-serif" },
    };
    await Plotly.newPlot(wadah, [jejak], tata, KONFIGURASI_PLOTLY);

    // Dropdown: nilai "semua" berarti seluruh Indonesia; sisanya diisi dari kunci peta_meta.json
    const pilihan = document.getElementById("s1-wilayah");
    Object.keys(meta.kelompok)
      .filter(function (k) {
        return k !== "Seluruh Indonesia";
      })
      .forEach(function (nama) {
        const opsi = document.createElement("option");
        opsi.value = nama;
        opsi.textContent = nama;
        pilihan.appendChild(opsi);
      });

    function terapkanPilihan() {
      const kunci =
        pilihan.value === "semua" ? "Seluruh Indonesia" : pilihan.value;
      const p = hitungPandangan(
        meta.kelompok[kunci],
        wadah.clientWidth,
        wadah.clientHeight,
      );
      Plotly.relayout(wadah, {
        "mapbox.center": p.center,
        "mapbox.zoom": p.zoom,
      });
    }
    pilihan.addEventListener("change", terapkanPilihan);

    // Saat ukuran jendela berubah (laptop ke ponsel), sesuaikan ulang perbesaran
    let penunda;
    window.addEventListener("resize", function () {
      clearTimeout(penunda);
      penunda = setTimeout(terapkanPilihan, 200);
    });
  } catch (galat) {
    console.error(galat);
    document.getElementById("s1-peta").innerHTML =
      '<p style="padding:1rem;color:#a00">Peta gagal dimuat: ' +
      galat.message +
      "</p>";
  }
})();
