// js/scene1.js
// Bagian 2: Peta Spasial Kemiskinan Indonesia (Koroplet & Bubble Terpisah - Stacked)
// ──────────────────────────────────────────────────────────────────────────────
// Fitur:
// 1. Peta Koroplet (Persentase P0) di kontainer #chart-map-koroplet
// 2. Peta Bubble (Jumlah Absolut Ribu Jiwa) di kontainer #chart-map-bubble
// 3. Click-to-Zoom dengan bounding box otomatis & click neighbor to pan/zoom.
// 4. Tombol / klik latar belakang untuk reset zoom.
// 5. [BARU] Time Slider: updateKoropletYear(tahun) & updateBubbleYear(tahun)
//    mengubah warna/radius secara smooth berdasarkan data historis provinsi.

// Skala warna kemiskinan: hijau muda (rendah) -> oranye -> oranye tua (tinggi)
const interpolasiKemiskinan = d3.interpolateRgbBasis([
  "#C5E1A5",
  "#FF9A00",
  "#B34700",
]);

let koropletState = {
  svg: null,
  gMain: null,
  pathsGroup: null,
  projection: null,
  path: null,
  colorScale: null,
  tooltip: null,
  zoomBehavior: null,
  activeFeature: null,
  width: 0,
  height: 0,
  currentYear: 2025,
};

let bubbleState = {
  svg: null,
  gMain: null,
  pathsGroup: null,
  bubblesGroup: null,
  projection: null,
  path: null,
  radiusScale: null,
  tooltip: null,
  zoomBehavior: null,
  activeFeature: null,
  width: 0,
  height: 0,
  currentYear: 2025,
};

function _cleanName(str) {
  let s = (str || "").toUpperCase();
  if (s === "KOTABARU" || s === "KOTA BARU") return "KOTABARU";
  return s
    .replace(/KOTA\s+ADMINISTRASI\s+/g, "")
    .replace(/KOTA\s+/g, "")
    .replace(/KABUPATEN\s+/g, "")
    .replace(/KEPULAUAN\s+/g, "")
    .replace(/SIDEMPUAN/g, "SIDIMPUAN")
    .replace(/[\s\-\.]/g, "");
}

const _nameAliases = {
  TANIMBAR: "MALUKUTENGGARABARAT",
  PASANGKAYU: "MAMUJUUTARA",
  PANGKAJENEKEPULAUAN: "PANGKAJENEDANKEPULAUAN",
  PANGKAJENE: "PANGKAJENEDANKEPULAUAN",
  TOBA: "TOBASAMOSIR",
};

let _kabkotaMapCache = null;

function _buildKabkotaMapCache() {
  if (_kabkotaMapCache) return _kabkotaMapCache;
  const data = appData.kemiskinanHistorisLengkap;
  if (!data || !data.length) return null;

  const map = new Map();
  data
    .filter((d) => d.tingkat === "kabkota")
    .forEach((d) => {
      const cleanKey = _cleanName(d.nama_daerah);
      map.set(`${cleanKey}_${d.tahun}`, d);
    });

  _kabkotaMapCache = map;
  return map;
}

function _getKabkotaHistorisValue(rawGeoName, tahun) {
  const map = _buildKabkotaMapCache();
  if (!map) return null;

  let key = _cleanName(rawGeoName);
  if (_nameAliases[key]) key = _nameAliases[key];

  return map.get(`${key}_${tahun}`) || null;
}

function _getHistorisValue(featureOrD, tahun) {
  if (!featureOrD) return null;
  const props = featureOrD.properties || featureOrD;
  const rawName = props.WADMKK || props.NAMOBJ || props.nama_daerah || "";
  return _getKabkotaHistorisValue(rawName, tahun);
}

// ══════════════════════════════════════════════════════════════════════════
// 1. INIT PETA KOROPLET (PERSENTASE P0)
// ══════════════════════════════════════════════════════════════════════════
function initKoropletMap(containerId = "#chart-map-koroplet") {
  const container = d3.select(containerId);
  if (container.empty()) return;

  container.selectAll("*").remove();

  const node = container.node();
  const width = node.getBoundingClientRect().width || 1080;
  const height = Math.max(Math.min(window.innerHeight * 0.72, 640), 460);
  koropletState.width = width;
  koropletState.height = height;

  const dataGeo = appData.geojson;
  if (!dataGeo || !dataGeo.features) return;

  // Canvas SVG
  const svg = container
    .append("svg")
    .attr("width", "100%")
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("display", "block")
    .style("background", "transparent")
    .style("cursor", "grab");
  koropletState.svg = svg;

  // Proyeksi & Path Generator
  const projection = d3.geoMercator().fitSize([width, height], dataGeo);
  const path = d3.geoPath().projection(projection);
  koropletState.projection = projection;
  koropletState.path = path;

  // Skala Warna (Persentase P0) — domain tetap 0–40 agar konsisten lintas tahun
  const colorScale = d3.scaleSequential(interpolasiKemiskinan).domain([0, 40]);
  koropletState.colorScale = colorScale;

  // Tooltip
  d3.selectAll(".d3-tooltip.map-tooltip-koroplet").remove();
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "d3-tooltip map-tooltip-koroplet");
  koropletState.tooltip = tooltip;

  // Zoom Behavior
  const gMain = svg.append("g").attr("class", "map-zoom-group");
  koropletState.gMain = gMain;

  const zoom = d3
    .zoom()
    .scaleExtent([1, 14])
    .on("zoom", (event) => {
      gMain.attr("transform", event.transform);
    });
  koropletState.zoomBehavior = zoom;
  svg.call(zoom);

  // Background rect reset zoom
  svg
    .insert("rect", ":first-child")
    .attr("width", width)
    .attr("height", height)
    .style("fill", "transparent")
    .on("click", () => resetKoropletZoom());

  const pathsGroup = gMain.append("g").attr("class", "layer-polygons");
  koropletState.pathsGroup = pathsGroup;

  // Tentukan tahun awal dari slider jika tersedia
  const sliderEl = document.getElementById("map-year-slider");
  const initYear = sliderEl ? +sliderEl.value : 2025;
  koropletState.currentYear = initYear;

  // Render Poligon Kabupaten / Kota
  pathsGroup
    .selectAll("path.kabupaten-path")
    .data(dataGeo.features)
    .enter()
    .append("path")
    .attr("class", "kabupaten-path")
    .attr("d", path)
    .attr("fill", (d) => _getFillKoroplet(d, initYear))
    .attr("fill-opacity", 0.9)
    .style("stroke", "rgba(255, 255, 255, 0.16)")
    .style("stroke-width", 0.4)
    .style("cursor", "pointer")
    .on("mouseover", function (event, d) {
      d3.select(this).style("stroke", "#F2F2F2").style("stroke-width", 1.4);
      _showKoropletTooltip(event, d, koropletState.currentYear);
    })
    .on("mousemove", (event) => moveMapTooltip(event, koropletState.tooltip))
    .on("mouseleave", function () {
      const isSelected = koropletState.activeFeature === this;
      d3.select(this)
        .style("stroke", isSelected ? "#FF9A00" : "rgba(255, 255, 255, 0.16)")
        .style("stroke-width", isSelected ? 1.8 : 0.4);
      hideMapTooltip(koropletState.tooltip);
    })
    .on("click", function (event, d) {
      event.stopPropagation();
      zoomToKoropletFeature(this, d);
    });

  // Legenda Koroplet
  const legWidth = 220;
  const legHeight = 10;
  const defs = svg.append("defs");
  const gradId = "gradient-peta-koroplet";
  const grad = defs
    .append("linearGradient")
    .attr("id", gradId)
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "0%");

  for (let i = 0; i <= 10; i++) {
    grad
      .append("stop")
      .attr("offset", i * 10 + "%")
      .attr("stop-color", interpolasiKemiskinan(i / 10));
  }

  const legendKoroplet = svg
    .append("g")
    .attr("class", "legend-koroplet")
    .attr("transform", `translate(${width - legWidth - 25}, ${height - 40})`);

  legendKoroplet
    .append("rect")
    .attr("width", legWidth)
    .attr("height", legHeight)
    .style("fill", `url(#${gradId})`)
    .style("rx", 3);

  legendKoroplet
    .append("text")
    .attr("x", 0)
    .attr("y", -6)
    .attr("fill", "#F2F2F2")
    .style("font-size", "10px")
    .style("font-weight", "600")
    .text("Persentase Penduduk Miskin (P0)");

  // Legenda abu-abu untuk no-data
  legendKoroplet
    .append("rect")
    .attr("x", 0)
    .attr("y", legHeight + 18)
    .attr("width", 10)
    .attr("height", 10)
    .attr("fill", "#5A5A5A")
    .attr("rx", 2);
  legendKoroplet
    .append("text")
    .attr("x", 14)
    .attr("y", legHeight + 27)
    .attr("fill", "#BDBDBD")
    .style("font-size", "9px")
    .text("Data tidak tersedia (wilayah pemekaran)");

  legendKoroplet
    .append("text")
    .attr("x", 0)
    .attr("y", legHeight + 12)
    .attr("fill", "#BDBDBD")
    .style("font-size", "9px")
    .text("0%");

  legendKoroplet
    .append("text")
    .attr("x", legWidth)
    .attr("y", legHeight + 12)
    .attr("text-anchor", "end")
    .attr("fill", "#BDBDBD")
    .style("font-size", "9px")
    .text("40%+");
}

// ── Helper: hitung fill warna koroplet berdasarkan tahun ──
function _getFillKoroplet(featureOrD, tahun) {
  const hist = _getHistorisValue(featureOrD, tahun);
  if (!hist || isNaN(hist.p0)) return "#5A5A5A"; // no-data → abu-abu netral
  return koropletState.colorScale(hist.p0);
}

// ── Helper: tooltip koroplet dengan data historis ──
function _showKoropletTooltip(event, d, tahun) {
  const props = d.properties;
  const hist = _getHistorisValue(d, tahun);
  const p0Text =
    hist && !isNaN(hist.p0)
      ? `${hist.p0.toFixed(2)}%`
      : "Tidak ada data (Pemekaran)";
  const jmText =
    hist && !isNaN(hist.jumlah_ribu) && hist.jumlah_ribu > 0
      ? `${hist.jumlah_ribu.toLocaleString("id-ID")} ribu jiwa`
      : "—";

  koropletState.tooltip
    .html(
      `
        <div style="font-weight:700;font-size:12px;color:#F2F2F2;margin-bottom:2px">${props.WADMKK || "Wilayah"}</div>
        <div style="font-size:10px;color:#BDBDBD;margin-bottom:5px">${hist ? hist.provinsi : props.provinsi_bps || "-"} · Tahun ${tahun}</div>
        <div style="font-size:11px;color:#F2F2F2">Persentase (P0): <b style="color:var(--aksen)">${p0Text}</b></div>
        <div style="font-size:11px;color:#F2F2F2">Beban Absolut: <b style="color:#599CDE">${jmText}</b></div>
    `,
    )
    .style("opacity", 1)
    .style("left", event.pageX + 15 + "px")
    .style("top", event.pageY - 30 + "px");
}

// ── Update Koroplet berdasarkan tahun (dipanggil slider) ──
function updateKoropletYear(tahun) {
  if (!koropletState.pathsGroup) return;
  koropletState.currentYear = tahun;

  koropletState.pathsGroup
    .selectAll("path.kabupaten-path")
    .transition()
    .duration(400)
    .ease(d3.easeCubicInOut)
    .attr("fill", (d) => _getFillKoroplet(d, tahun));
}

function zoomToKoropletFeature(element, d) {
  if (!koropletState.svg || !koropletState.path) return;

  if (koropletState.activeFeature === element) {
    return resetKoropletZoom();
  }

  if (koropletState.activeFeature) {
    d3.select(koropletState.activeFeature)
      .style("stroke", "rgba(255, 255, 255, 0.16)")
      .style("stroke-width", 0.4);
  }

  koropletState.activeFeature = element;

  d3.select(element).style("stroke", "#FF9A00").style("stroke-width", 2);

  const [[x0, y0], [x1, y1]] = koropletState.path.bounds(d);
  const dx = x1 - x0;
  const dy = y1 - y0;
  const x = (x0 + x1) / 2;
  const y = (y0 + y1) / 2;
  const width = koropletState.width;
  const height = koropletState.height;

  const scale = Math.max(
    2,
    Math.min(10, 0.85 / Math.max(dx / width, dy / height)),
  );
  const translate = [width / 2 - scale * x, height / 2 - scale * y];

  koropletState.svg
    .transition()
    .duration(850)
    .ease(d3.easeCubicOut)
    .call(
      koropletState.zoomBehavior.transform,
      d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale),
    );
}

function resetKoropletZoom() {
  if (!koropletState.svg || !koropletState.zoomBehavior) return;

  if (koropletState.activeFeature) {
    d3.select(koropletState.activeFeature)
      .style("stroke", "rgba(255, 255, 255, 0.16)")
      .style("stroke-width", 0.4);
    koropletState.activeFeature = null;
  }

  koropletState.svg
    .transition()
    .duration(800)
    .ease(d3.easeCubicOut)
    .call(koropletState.zoomBehavior.transform, d3.zoomIdentity);
}

// ══════════════════════════════════════════════════════════════════════════
// 2. INIT GRAFIK MARIMEKKO (VARIABLE WIDTH BAR CHART PER PROVINSI)
// ══════════════════════════════════════════════════════════════════════════
let marimekkoState = {
  svg: null,
  gMain: null,
  xScale: null,
  yScale: null,
  colorScale: null,
  tooltip: null,
  width: 0,
  height: 0,
  currentYear: 2025,
};

function initMarimekkoChart(containerId = "#chart-marimekko") {
  const container = d3.select(containerId);
  if (container.empty()) return;

  container.selectAll("*").remove();

  const node = container.node();
  const W = node.getBoundingClientRect().width || 1080;
  const H = 460;
  const margin = { top: 40, right: 30, bottom: 65, left: 58 };

  const innerW = W - margin.left - margin.right;
  const innerH = H - margin.top - margin.bottom;

  marimekkoState.width = innerW;
  marimekkoState.height = innerH;

  const svg = container
    .append("svg")
    .attr("width", "100%")
    .attr("height", H)
    .attr("viewBox", `0 0 ${W} ${H}`)
    .style("display", "block")
    .style("background", "transparent");

  marimekkoState.svg = svg;

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  marimekkoState.gMain = g;

  marimekkoState.colorScale = d3
    .scaleSequential(interpolasiKemiskinan)
    .domain([0, 35]);

  d3.selectAll(".d3-tooltip.marimekko-tooltip").remove();
  marimekkoState.tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "d3-tooltip marimekko-tooltip");

  const sliderEl = document.getElementById("map-year-slider");
  const initYear = sliderEl ? +sliderEl.value : 2025;
  marimekkoState.currentYear = initYear;

  marimekkoState.yScale = d3.scaleLinear().domain([0, 35]).range([innerH, 0]);
  marimekkoState.xScale = d3.scaleLinear().range([0, innerW]);

  // Grid
  g.append("g")
    .attr("class", "grid-lines-y")
    .selectAll("line")
    .data(marimekkoState.yScale.ticks(6))
    .enter()
    .append("line")
    .attr("x1", 0)
    .attr("x2", innerW)
    .attr("y1", (d) => marimekkoState.yScale(d))
    .attr("y2", (d) => marimekkoState.yScale(d))
    .style("stroke", "rgba(255,255,255,0.06)")
    .style("stroke-dasharray", "3,3");

  // Y Axis
  g.append("g")
    .attr("class", "y-axis")
    .attr("transform", "translate(-8,0)")
    .call(
      d3
        .axisLeft(marimekkoState.yScale)
        .tickFormat((d) => d + "%")
        .ticks(6)
        .tickSize(0),
    )
    .call((g2) => g2.select(".domain").remove())
    .call((g2) =>
      g2.selectAll("text").style("fill", "#BDBDBD").style("font-size", "10px"),
    );

  // X Axis placeholder
  g.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${innerH + 8})`);

  // Axis labels
  svg
    .append("text")
    .attr("x", margin.left + innerW / 2)
    .attr("y", H - 14)
    .attr("text-anchor", "middle")
    .style("fill", "#BDBDBD")
    .style("font-size", "11px")
    .text(
      "Kumulatif Jumlah Penduduk Miskin (Juta Jiwa) → Lebar Balok = Beban Absolut",
    );

  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(margin.top + innerH / 2))
    .attr("y", 16)
    .attr("text-anchor", "middle")
    .style("fill", "#BDBDBD")
    .style("font-size", "11px")
    .text("Persentase Miskin (P0) → Tinggi Balok");

  // Bars layer
  g.append("g").attr("class", "bars-layer");

  // Pastikan data sudah siap sebelum render
  _renderMarimekkoWithData(initYear, false);
}

function _renderMarimekkoWithData(tahun, animate) {
  // Ambil data dari sumber mana saja yang tersedia
  let dataAll = appData.kemiskinanHistorisLengkap;

  if (!dataAll || !dataAll.length) {
    // Fallback ke kemiskinanHistorisProvinsi
    const provData = appData.kemiskinanHistorisProvinsi;
    if (provData && provData.length) {
      // Tambahkan tingkat='provinsi' jika tidak ada
      dataAll = provData.map((d) => ({ ...d, tingkat: "provinsi" }));
    }
  }

  if (!dataAll || !dataAll.length) {
    // Last resort: load langsung dari CSV
    d3.csv("data/olahan/kemiskinan_historis_lengkap.csv")
      .then((rows) => {
        appData.kemiskinanHistorisLengkap = rows.map((d) => ({
          provinsi: d.provinsi,
          nama_daerah: d.nama_daerah,
          tingkat: (d.tingkat || "").trim(),
          tahun: +d.tahun,
          p0: !d.p0 || isNaN(+d.p0) ? NaN : +d.p0,
          jumlah_ribu:
            !d.jumlah_ribu || isNaN(+d.jumlah_ribu) ? NaN : +d.jumlah_ribu,
        }));
        _doRenderMarimekko(tahun, animate, appData.kemiskinanHistorisLengkap);
      })
      .catch((err) => {
        console.error("[Marimekko] Gagal load CSV:", err);
      });
    return;
  }

  _doRenderMarimekko(tahun, animate, dataAll);
}

function _doRenderMarimekko(tahun, animate, dataAll) {
  if (!marimekkoState.gMain) return;

  const targetYear = +tahun;

  // Filter: tingkat provinsi (cek keduanya: 'provinsi' dan string yang mungkin berbeda)
  const rawList = dataAll.filter((d) => {
    const t = (d.tingkat || "").toLowerCase().trim();
    return (
      t === "provinsi" &&
      +d.tahun === targetYear &&
      d.provinsi !== "Indonesia" &&
      !isNaN(d.p0) &&
      d.p0 > 0 &&
      !isNaN(d.jumlah_ribu) &&
      d.jumlah_ribu > 0
    );
  });

  if (rawList.length === 0) {
    console.warn(
      `[Marimekko] Tidak ada data untuk tahun ${targetYear}. Total data: ${dataAll.length}. Sample:`,
      dataAll.slice(0, 3),
    );
    return;
  }

  rawList.sort((a, b) => b.p0 - a.p0);

  let cum = 0;
  const dataFormatted = rawList.map((d) => {
    const val = d.jumlah_ribu || 0;
    const x0 = cum;
    cum += val;
    return { ...d, x0, x1: cum, widthValue: val };
  });

  const totalPoor = cum;

  const { gMain, yScale, colorScale, tooltip } = marimekkoState;
  const innerW = marimekkoState.width;
  const innerH = marimekkoState.height;

  const xScale = d3.scaleLinear().domain([0, totalPoor]).range([0, innerW]);
  marimekkoState.xScale = xScale;

  const maxP0 = d3.max(dataFormatted, (d) => d.p0) || 35;
  yScale.domain([0, Math.ceil(maxP0 / 5) * 5 + 2]);

  // Update Y Axis
  gMain
    .select(".y-axis")
    .call(
      d3
        .axisLeft(yScale)
        .tickFormat((d) => d + "%")
        .ticks(6)
        .tickSize(0),
    )
    .call((g) => g.select(".domain").remove())
    .call((g) =>
      g.selectAll("text").style("fill", "#BDBDBD").style("font-size", "10px"),
    );

  // Update X Axis
  gMain
    .select(".x-axis")
    .call(
      d3
        .axisBottom(xScale)
        .tickFormat((d) => (d / 1000).toFixed(1) + "jt")
        .ticks(8)
        .tickSize(0),
    )
    .call((g) => g.select(".domain").remove())
    .call((g) =>
      g.selectAll("text").style("fill", "#BDBDBD").style("font-size", "10px"),
    );

  // Update grid
  gMain
    .select(".grid-lines-y")
    .selectAll("line")
    .data(yScale.ticks(6))
    .attr("y1", (d) => yScale(d))
    .attr("y2", (d) => yScale(d));

  const t = d3
    .transition()
    .duration(animate ? 700 : 0)
    .ease(d3.easeCubicInOut);

  const barsLayer = gMain.select(".bars-layer");

  const bars = barsLayer
    .selectAll("g.mko-bar")
    .data(dataFormatted, (d) => d.provinsi);

  bars.exit().transition(t).style("opacity", 0).remove();

  const barsEnter = bars
    .enter()
    .append("g")
    .attr("class", "mko-bar")
    .style("cursor", "pointer");

  barsEnter
    .append("rect")
    .attr("class", "mko-rect")
    .attr("y", innerH)
    .attr("height", 0)
    .attr("x", (d) => xScale(d.x0))
    .attr("width", (d) => Math.max(0.5, xScale(d.x1) - xScale(d.x0)))
    .attr("fill", (d) => colorScale(d.p0))
    .attr("stroke", "#262626")
    .attr("stroke-width", 0.5);

  barsEnter
    .append("text")
    .attr("class", "mko-label")
    .attr("text-anchor", "start")
    .attr("dy", "-6px")
    .style("fill", "#F2F2F2")
    .style("font-size", "9px")
    .style("font-weight", "600")
    .style("pointer-events", "none")
    .style("opacity", 0);

  const barsAll = barsEnter.merge(bars);

  barsAll.each(function (d) {
    const gBar = d3.select(this);
    const xPos = xScale(d.x0);
    const barWidth = Math.max(0.5, xScale(d.x1) - xScale(d.x0));
    const yPos = yScale(d.p0);
    const barHeight = innerH - yPos;

    gBar
      .select("rect.mko-rect")
      .transition(t)
      .attr("x", xPos)
      .attr("y", yPos)
      .attr("width", barWidth)
      .attr("height", barHeight)
      .attr("fill", colorScale(d.p0));

    const label = gBar.select("text.mko-label");
    if (barWidth >= 24) {
      const labelText =
        barWidth < 50
          ? d.provinsi.substring(0, Math.floor(barWidth / 6)) +
            (d.provinsi.length > Math.floor(barWidth / 6) ? "…" : "")
          : d.provinsi;
      label
        .transition(t)
        .attr("x", xPos + 3)
        .attr("y", yPos)
        .style("opacity", 1)
        .text(labelText);
    } else {
      label.transition(t).style("opacity", 0);
    }
  });

  barsAll
    .on("mouseover", function (event, d) {
      d3.select(this)
        .select("rect.mko-rect")
        .attr("stroke", "#F2F2F2")
        .attr("stroke-width", 1.8);
      const pctTotal =
        totalPoor > 0 ? ((d.jumlah_ribu / totalPoor) * 100).toFixed(1) : 0;
      tooltip
        .html(
          `
                <div style="font-weight:700;font-size:12px;color:var(--aksen);margin-bottom:2px">${d.provinsi} · ${tahun}</div>
                <div style="font-size:11px;color:#F2F2F2">Tinggi Balok (P0): <b style="color:var(--aksen)">${d.p0.toFixed(2)}%</b></div>
                <div style="font-size:11px;color:#F2F2F2">Lebar Balok (Jumlah Absolut): <b style="color:#599CDE">${d.jumlah_ribu.toLocaleString("id-ID")} ribu jiwa</b></div>
                <div style="font-size:10px;color:#BDBDBD;margin-top:3px">Pangsa Beban: <b>${pctTotal}%</b> dari populasi miskin nasional</div>
            `,
        )
        .style("opacity", 1)
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY - 40 + "px");
    })
    .on("mousemove", (event) => {
      tooltip
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY - 40 + "px");
    })
    .on("mouseleave", function () {
      d3.select(this)
        .select("rect.mko-rect")
        .attr("stroke", "#262626")
        .attr("stroke-width", 0.5);
      tooltip.style("opacity", 0).style("left", "-1000px");
    });

  const titleEl = document.getElementById("marimekko-title");
  if (titleEl)
    titleEl.textContent = `Grafik Marimekko: Beban Absolut & Persentase Kemiskinan per Provinsi (${tahun})`;
}

function updateMarimekkoYear(tahun, animate = true) {
  if (!marimekkoState.gMain) return;
  marimekkoState.currentYear = +tahun;
  _renderMarimekkoWithData(+tahun, animate);
}

// ══════════════════════════════════════════════════════════════════════════
// 3. HANDLER TIME SLIDER (dipanggil dari oninput di HTML)
// ══════════════════════════════════════════════════════════════════════════
function onMapYearSlide(value) {
  const tahun = +value;

  // Update badge tahun
  const badge = document.getElementById("map-year-badge");
  if (badge) badge.textContent = tahun;

  // Update CSS --val untuk gradient track fill
  const sliderEl = document.getElementById("map-year-slider");
  if (sliderEl) sliderEl.style.setProperty("--val", tahun);

  // Update judul peta & grafik
  const koropletTitle = document.getElementById("koroplet-map-title");
  if (koropletTitle) {
    koropletTitle.textContent = `Peta Koroplet: Persentase Penduduk Miskin Kabupaten/Kota (P0, ${tahun})`;
  }
  const marimekkoTitle = document.getElementById("marimekko-title");
  if (marimekkoTitle) {
    marimekkoTitle.textContent = `Grafik Marimekko: Beban Absolut & Persentase Kemiskinan per Provinsi (${tahun})`;
  }
  const dumbbellTitle = document.getElementById("dumbbell-title");
  if (dumbbellTitle) {
    dumbbellTitle.textContent = `Disparitas Desa vs Kota: Persentase Penduduk Miskin (${tahun})`;
  }

  // Update ketiga grafik
  updateKoropletYear(tahun);
  updateMarimekkoYear(tahun);
  updateDumbbellYear(tahun);
}

// ── Tooltip Helpers (shared) ──────────────────────────────────────────────
function showMapTooltip(event, props, tooltipObj) {
  if (!tooltipObj) return;
  const p0Text = props.p0 != null ? `${props.p0}%` : "Tidak ada data";
  const jmText =
    props.jumlah_ribu != null
      ? `${props.jumlah_ribu.toLocaleString("id-ID")} ribu jiwa`
      : "-";

  tooltipObj
    .html(
      `
        <div style="font-weight:700;font-size:12px;color:#F2F2F2;margin-bottom:2px">${props.WADMKK || "Wilayah"}</div>
        <div style="font-size:10px;color:#BDBDBD;margin-bottom:5px">${props.provinsi_bps || "-"}</div>
        <div style="font-size:11px;color:#F2F2F2">Persentase (P0): <b style="color:var(--aksen)">${p0Text}</b></div>
        <div style="font-size:11px;color:#F2F2F2">Beban Absolut: <b style="color:#599CDE">${jmText}</b></div>
    `,
    )
    .style("opacity", 1)
    .style("left", event.pageX + 15 + "px")
    .style("top", event.pageY - 30 + "px");
}

function moveMapTooltip(event, tooltipObj) {
  if (tooltipObj) {
    tooltipObj
      .style("left", event.pageX + 15 + "px")
      .style("top", event.pageY - 30 + "px");
  }
}

function hideMapTooltip(tooltipObj) {
  if (tooltipObj) {
    tooltipObj.style("opacity", 0).style("left", "-1000px");
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 4. DUMBBELL PLOT DESA VS KOTA
// ══════════════════════════════════════════════════════════════════════════
let dumbbellState = {
  svg: null,
  gMain: null,
  xScale: null,
  yScale: null,
  tooltip: null,
  width: 0,
  height: 0,
  currentYear: 2025,
  provinces: [],
};

function initDumbbellChart(containerId = "#chart-dumbbell") {
  const container = d3.select(containerId);
  if (container.empty()) return;

  container.selectAll("*").remove();

  const data = appData.desaKotaHistoris;
  if (!data || !data.length) return;

  // Ambil daftar provinsi unik (kecuali 'Indonesia')
  const provinces = [...new Set(data.map((d) => d.provinsi))]
    .filter((p) => p !== "Indonesia")
    .sort((a, b) => b.localeCompare(a, "id")); // A-Z dari bawah ke atas di Y axis

  dumbbellState.provinces = provinces;

  const node = container.node();
  const W = node.getBoundingClientRect().width || 800;
  const H = Math.max(500, provinces.length * 20 + 60);
  const margin = { top: 30, right: 30, bottom: 40, left: 140 };

  const innerW = W - margin.left - margin.right;
  const innerH = H - margin.top - margin.bottom;

  dumbbellState.width = innerW;
  dumbbellState.height = innerH;

  const svg = container
    .append("svg")
    .attr("width", "100%")
    .attr("height", H)
    .attr("viewBox", `0 0 ${W} ${H}`)
    .style("display", "block")
    .style("background", "transparent");

  dumbbellState.svg = svg;

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  dumbbellState.gMain = g;

  // Skala X (P0 Persentase)
  const maxX = d3.max(data, (d) => d.p0) || 40;
  const xScale = d3
    .scaleLinear()
    .domain([0, Math.ceil(maxX / 5) * 5])
    .range([0, innerW]);
  dumbbellState.xScale = xScale;

  // Skala Y (Provinsi)
  const yScale = d3.scaleBand().domain(provinces).range([innerH, 0]).padding(1);
  dumbbellState.yScale = yScale;

  // Garis Grid X
  g.append("g")
    .attr("class", "grid-lines-x")
    .selectAll("line")
    .data(xScale.ticks(6))
    .enter()
    .append("line")
    .attr("x1", (d) => xScale(d))
    .attr("x2", (d) => xScale(d))
    .attr("y1", 0)
    .attr("y2", innerH)
    .style("stroke", "rgba(255, 255, 255, 0.05)")
    .style("stroke-dasharray", "3,3");

  // Sumbu X & Y
  const xAxis = d3
    .axisBottom(xScale)
    .tickFormat((d) => d + "%")
    .ticks(6)
    .tickSize(0);
  g.append("g")
    .attr("transform", `translate(0,${innerH + 10})`)
    .call(xAxis)
    .call((g) => g.select(".domain").remove())
    .call((g) =>
      g.selectAll("text").style("fill", "#BDBDBD").style("font-size", "10px"),
    );

  const yAxis = d3.axisLeft(yScale).tickSize(0);
  g.append("g")
    .attr("transform", "translate(-10,0)")
    .call(yAxis)
    .call((g) => g.select(".domain").remove())
    .call((g) =>
      g.selectAll("text").style("fill", "#F2F2F2").style("font-size", "11px"),
    );

  // Tooltip
  d3.selectAll(".d3-tooltip.dumbbell-tooltip").remove();
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "d3-tooltip dumbbell-tooltip");
  dumbbellState.tooltip = tooltip;

  // Tentukan tahun awal
  const sliderEl = document.getElementById("map-year-slider");
  const initYear = sliderEl ? +sliderEl.value : 2025;
  dumbbellState.currentYear = initYear;

  // Render group container untuk masing-masing baris provinsi
  const rows = g
    .selectAll(".dumbbell-row")
    .data(provinces)
    .enter()
    .append("g")
    .attr("class", "dumbbell-row")
    .attr("transform", (d) => `translate(0,${yScale(d)})`);

  // Tambahkan connecting line, titik desa, titik kota
  rows.append("line").attr("class", "connect-line");
  rows.append("circle").attr("class", "dot-desa");
  rows.append("circle").attr("class", "dot-kota");

  // Render data awal
  updateDumbbellYear(initYear, false);
}

function updateDumbbellYear(tahun, animate = true) {
  if (!dumbbellState.gMain) return;
  dumbbellState.currentYear = tahun;

  const data = appData.desaKotaHistoris;
  if (!data) return;

  const { gMain, xScale, tooltip } = dumbbellState;
  const t = d3
    .transition()
    .duration(animate ? 700 : 0)
    .ease(d3.easeCubicInOut);

  gMain.selectAll(".dumbbell-row").each(function (prov) {
    const row = d3.select(this);

    const dataDesa = data.find(
      (d) =>
        d.provinsi === prov &&
        d.tipe_daerah === "Perdesaan" &&
        d.tahun === tahun,
    );
    const dataKota = data.find(
      (d) =>
        d.provinsi === prov &&
        d.tipe_daerah === "Perkotaan" &&
        d.tahun === tahun,
    );

    const hasDesa = dataDesa && !isNaN(dataDesa.p0);
    const hasKota = dataKota && !isNaN(dataKota.p0);

    // Hide if data is missing for the year
    if (!hasDesa && !hasKota) {
      row.transition(t).style("opacity", 0);
      return;
    }

    row.transition(t).style("opacity", 1);

    const xDesa = hasDesa ? xScale(dataDesa.p0) : 0;
    const xKota = hasKota ? xScale(dataKota.p0) : 0;

    // Connecting line
    if (hasDesa && hasKota) {
      row
        .select(".connect-line")
        .transition(t)
        .attr("x1", xDesa)
        .attr("x2", xKota)
        .attr("y1", 0)
        .attr("y2", 0)
        .style("stroke", "rgba(255, 255, 255, 0.15)")
        .style("stroke-width", 2)
        .style("opacity", 1);
    } else {
      row.select(".connect-line").transition(t).style("opacity", 0);
    }

    // Dot Desa
    if (hasDesa) {
      row
        .select(".dot-desa")
        .transition(t)
        .attr("cx", xDesa)
        .attr("cy", 0)
        .attr("r", 5.5)
        .attr("fill", "#FF9A00")
        .style("opacity", 1);
    } else {
      row.select(".dot-desa").transition(t).style("opacity", 0);
    }

    // Dot Kota
    if (hasKota) {
      row
        .select(".dot-kota")
        .transition(t)
        .attr("cx", xKota)
        .attr("cy", 0)
        .attr("r", 5.5)
        .attr("fill", "#599CDE")
        .style("opacity", 1);
    } else {
      row.select(".dot-kota").transition(t).style("opacity", 0);
    }

    // Tooltip Interactivity (Attach to row to easily hover)
    // Draw a transparent rect to catch mouse events for the whole row
    let hoverRect = row.select(".hover-rect");
    if (hoverRect.empty()) {
      hoverRect = row
        .append("rect")
        .attr("class", "hover-rect")
        .attr("x", 0)
        .attr("y", -8)
        .attr("width", dumbbellState.width)
        .attr("height", 16)
        .attr("fill", "transparent")
        .style("cursor", "pointer");
    }

    hoverRect
      .on("mouseover", function (event) {
        row
          .select(".connect-line")
          .style("stroke", "rgba(255, 255, 255, 0.4)")
          .style("stroke-width", 3);
        if (hasDesa)
          row
            .select(".dot-desa")
            .attr("r", 7)
            .attr("stroke", "#F2F2F2")
            .attr("stroke-width", 1.5);
        if (hasKota)
          row
            .select(".dot-kota")
            .attr("r", 7)
            .attr("stroke", "#F2F2F2")
            .attr("stroke-width", 1.5);

        const p0DesaTxt = hasDesa ? `${dataDesa.p0.toFixed(2)}%` : "N/A";
        const jmDesaTxt = hasDesa
          ? `${dataDesa.jumlah_ribu.toLocaleString("id-ID")}rb`
          : "N/A";

        const p0KotaTxt = hasKota ? `${dataKota.p0.toFixed(2)}%` : "N/A";
        const jmKotaTxt = hasKota
          ? `${dataKota.jumlah_ribu.toLocaleString("id-ID")}rb`
          : "N/A";

        tooltip
          .html(
            `
                <div style="font-weight:700;font-size:12px;color:#F2F2F2;margin-bottom:6px">${prov} · ${tahun}</div>
                <div style="display:flex; justify-content:space-between; gap:15px;">
                    <div>
                        <div style="font-size:10px;color:#FF9A00;font-weight:700">● Perdesaan</div>
                        <div style="font-size:11px;color:#F2F2F2">${p0DesaTxt}</div>
                        <div style="font-size:10px;color:#BDBDBD">${jmDesaTxt} jiwa</div>
                    </div>
                    <div>
                        <div style="font-size:10px;color:#599CDE;font-weight:700">● Perkotaan</div>
                        <div style="font-size:11px;color:#F2F2F2">${p0KotaTxt}</div>
                        <div style="font-size:10px;color:#BDBDBD">${jmKotaTxt} jiwa</div>
                    </div>
                </div>
            `,
          )
          .style("opacity", 1)
          .style("left", event.pageX + 15 + "px")
          .style("top", event.pageY - 40 + "px");
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", event.pageX + 15 + "px")
          .style("top", event.pageY - 40 + "px");
      })
      .on("mouseleave", function () {
        row
          .select(".connect-line")
          .style("stroke", "rgba(255, 255, 255, 0.15)")
          .style("stroke-width", 2);
        if (hasDesa)
          row.select(".dot-desa").attr("r", 5.5).attr("stroke", "none");
        if (hasKota)
          row.select(".dot-kota").attr("r", 5.5).attr("stroke", "none");
        tooltip.style("opacity", 0).style("left", "-1000px");
      });
  });
}

// ══════════════════════════════════════════════════════════════════════════
// 5. LEGACY WRAPPERS & PUBLIC API
// ══════════════════════════════════════════════════════════════════════════
function initMap() {
  initKoropletMap("#chart-map-koroplet");
  initMarimekkoChart("#chart-marimekko");
  initDumbbellChart("#chart-dumbbell");
}

// updateMap(tahun) — public API untuk slide tahun programatik
function updateMap(tahun) {
  if (tahun) {
    updateKoropletYear(+tahun);
    updateMarimekkoYear(+tahun);
    updateDumbbellYear(+tahun);
  }
}

function resetMapZoom() {
  resetKoropletZoom();
}

function renderScene1() {
  initKoropletMap("#chart-map-koroplet");
  initMarimekkoChart("#chart-marimekko");
  initDumbbellChart("#chart-dumbbell");
}