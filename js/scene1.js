// js/scene1.js - Render Peta Choropleth Sebaran Kemiskinan Kabupaten/Kota

function renderScene1() {
  console.log("Merender Scene 1: Peta Choropleth Kabupaten/Kota...");

  // Pastikan data geojson dan kabkota tersedia di appData (dari main.js)
  if (!appData.geojson || !appData.kabkota) {
    console.error("Data untuk Scene 1 belum siap!");
    return;
  }

  // Ambil array fitur dari GeoJSON
  const geojsonFeatures = appData.geojson.features;

  // Siapkan array untuk menampung lokasi (nama wilayah) dan nilai (p0)
  const locations = [];
  const zValues = [];
  const hoverTexts = [];

  // Petakan data BPS ke dalam format yang dibaca Plotly
  geojsonFeatures.forEach((feature) => {
    const props = feature.properties;
    const namaWilayah = props.WADMKK || props.nama;

    locations.push(namaWilayah);
    zValues.push(props.p0 || 0);
    hoverTexts.push(
      `<b>${namaWilayah}</b><br>Provinsi: ${props.provinsi_bps || "-"}<br>Penduduk Miskin (P0): ${props.p0 ? props.p0.toFixed(2) + "%" : "Data Kosong"}`,
    );
  });

  // Konfigurasi Trace untuk Peta Choropleth Plotly
  const trace = {
    type: "choropleth",
    locationmode: "geojson-id",
    geojson: appData.geojson,
    featureidkey: "properties.WADMKK", // Menyesuaikan kunci nama wilayah di GeoJSON kita
    locations: locations,
    z: zValues,
    text: hoverTexts,
    hoverinfo: "text",
    colorscale: "Viridis", // Palet warna sesuai rencana proyek
    reversescale: true,
    marker: {
      line: {
        color: "rgba(255,255,255,0.2)",
        width: 0.5,
      },
    },
    colorbar: {
      title: "Persentase Miskin (%)",
      titleside: "right",
      tickfont: { color: "#fff" },
      titlefont: { color: "#fff" },
    },
  };

  // Konfigurasi Layout Peta agar pas dan mendukung tema gelap
  const layout = {
    title: {
      text: "Sebaran Persentase Penduduk Miskin (P0) Kabupaten/Kota",
      font: { color: "#ffffff", size: 16 },
    },
    geo: {
      fitbounds: "locations",
      visible: false,
      bgcolor: "transparent",
    },
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    margin: { t: 50, b: 10, l: 10, r: 10 },
  };

  const config = {
    responsive: true,
    displayModeBar: false,
  };

  // Render grafik ke dalam div dengan id 'chart-scene1' di index.html
  Plotly.newPlot("chart-scene1", [trace], layout, config);
}
