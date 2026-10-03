// js/scene2.js
// Scene 2: PCA Scatter Plot (kiri) + Radar Chart Komparasi (kanan)
// Interaksi:
//   - Brush scatter -> tampilkan semua provinsi terpilih di radar (overlay)
//   - Klik titik -> toggle masuk/keluar set komparasi
//   - Dropdown -> tambah provinsi ke set komparasi
//   - Lencana Badges -> Tampilkan daftar provinsi terpilih + titik warna + tombol Hapus ✕
//   - Maks 6 provinsi sekaligus di radar agar terbaca

function renderScene2() {
  const data = appData.provinsiMultivariat;
  if (!data || !data.length) return;

  // ─── KONFIGURASI VARIABEL RADAR ──────────────────────────────────────
  const radarDimensions = [
    {
      key: "p0",
      label: "Persentase Kemiskinan (%)",
      lines: ["Persentase", "Kemiskinan (%)"],
      max: 45,
    },
    {
      key: "lama_sekolah",
      label: "Rata-rata Lama Sekolah",
      lines: ["Rata-rata Lama", "Sekolah"],
      max: 14,
    },
    {
      key: "sanitasi_layak",
      label: "Akses Sanitasi Layak (%)",
      lines: ["Akses Sanitasi", "Layak (%)"],
      max: 100,
    },
    {
      key: "air_layak",
      label: "Akses Air Minum Layak (%)",
      lines: ["Akses Air Minum", "Layak (%)"],
      max: 100,
    },
    {
      key: "tpt",
      label: "Tingkat Pengangguran (TPT)",
      lines: ["Tingkat", "Pengangguran", "(TPT)"],
      max: 12,
    },
    {
      key: "tpak",
      label: "Tingkat Partisipasi Angkatan Kerja (TPAK)",
      lines: ["Tingkat Partisipasi", "Angkatan Kerja", "(TPAK)"],
      max: 90,
    },
    {
      key: "porsi_makanan",
      label: "Porsi Pengeluaran Makanan (%)",
      lines: ["Porsi Pengeluaran", "Makanan (%)"],
      max: 80,
    },
  ];
  const totalAxes = radarDimensions.length;
  const angleSlice = (Math.PI * 2) / totalAxes;
  const MAX_COMPARE = 6;

  // Palet warna untuk tiap provinsi yang dibandingkan
  const colorPalette = [
    "#FF9A00", // oranye (aksen utama)
    "#599CDE", // biru terang
    "#C5E1A5", // hijau muda
    "#F2F2F2", // putih lembut
    "#0066CC", // biru
    "#FFC266", // oranye muda
  ];

  // ─── BERSIHKAN KONTAINER ────────────────────────────────────────────
  d3.select("#scatter-pca").selectAll("*").remove();
  d3.select("#radar-chart").selectAll("*").remove();

  const containerS = d3.select("#scatter-pca").node();
  const containerR = d3.select("#radar-chart").node();
  const wS = containerS.getBoundingClientRect().width || 480;
  const wR = containerR.getBoundingClientRect().width || 420;
  const H = 460;

  const mS = { top: 30, right: 30, bottom: 50, left: 50 };
  const mR = { top: 30, right: 20, bottom: 20, left: 20 };

  const radarRadius =
    Math.min(wR - mR.left - mR.right, H - mR.top - mR.bottom) / 2 - 40;

  d3.selectAll(".d3-tooltip.scene2-tooltip").remove();
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "d3-tooltip scene2-tooltip");

  // STATE: set provinsi yang sedang dibandingkan (kunci -> index warna)
  let compareMap = new Map(); // kunci -> colorIndex
  let nextColorIdx = 0;
  let brushedKeys = new Set();

  // ─────────────────────────────────────────────────────────────────────
  //  A. SCATTER PLOT (PCA)
  // ─────────────────────────────────────────────────────────────────────
  const svgS = d3
    .select("#scatter-pca")
    .append("svg")
    .attr("width", "100%")
    .attr("height", H)
    .attr("viewBox", `0 0 ${wS} ${H}`)
    .append("g")
    .attr("transform", `translate(${mS.left},${mS.top})`);

  const xS = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d.PC1))
    .nice()
    .range([0, wS - mS.left - mS.right]);
  const yS = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d.PC2))
    .nice()
    .range([H - mS.top - mS.bottom, 0]);

  svgS
    .append("g")
    .attr("transform", `translate(0,${yS(0)})`)
    .call(d3.axisBottom(xS).ticks(6).tickSize(0))
    .call((g) => g.select(".domain").style("stroke", "#4a4a4a"))
    .selectAll("text")
    .style("fill", "#BDBDBD");

  svgS
    .append("g")
    .attr("transform", `translate(${xS(0)},0)`)
    .call(d3.axisLeft(yS).ticks(6).tickSize(0))
    .call((g) => g.select(".domain").style("stroke", "#4a4a4a"))
    .selectAll("text")
    .style("fill", "#BDBDBD");

  svgS
    .append("text")
    .attr("x", wS - mS.left - mS.right)
    .attr("y", yS(0) - 10)
    .attr("text-anchor", "end")
    .style("fill", "#BDBDBD")
    .style("font-size", "11px")
    .text("PC1 →");
  svgS
    .append("text")
    .attr("x", 10)
    .attr("y", 10)
    .style("fill", "#BDBDBD")
    .style("font-size", "11px")
    .text("↑ PC2");
  svgS
    .append("text")
    .attr("x", (wS - mS.left - mS.right) / 2)
    .attr("y", -12)
    .attr("text-anchor", "middle")
    .style("fill", "#f2f2f2")
    .style("font-size", "13px")
    .style("font-weight", "bold")
    .text("Peta Kesamaan Provinsi (PCA)");

  // Titik scatter
  const dots = svgS
    .selectAll("circle.pca-dot")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "pca-dot")
    .attr("cx", (d) => xS(d.PC1))
    .attr("cy", (d) => yS(d.PC2))
    .attr("r", 5)
    .style("fill", "var(--aksen)")
    .style("stroke", "#262626")
    .style("stroke-width", 1.5)
    .style("opacity", 0.8)
    .style("cursor", "pointer");

  // Label hover scatter
  const scatterLabel = svgS
    .append("text")
    .style("fill", "#f2f2f2")
    .style("font-size", "11px")
    .style("pointer-events", "none")
    .style("opacity", 0);

  function dotColor(d) {
    if (compareMap.has(d.kunci)) return colorPalette[compareMap.get(d.kunci)];
    if (brushedKeys.has(d.kunci)) return "#FF9A00";
    return "var(--aksen)";
  }

  function updateDots() {
    const hasAny = compareMap.size > 0 || brushedKeys.size > 0;
    dots.each(function (d) {
      const isCompare = compareMap.has(d.kunci);
      const isBrushed = brushedKeys.has(d.kunci);
      const isActive = isCompare || isBrushed;
      d3.select(this)
        .style("fill", dotColor(d))
        .attr("r", isCompare ? 7 : isBrushed ? 5 : hasAny ? 4 : 5)
        .style("opacity", isActive ? 1 : hasAny ? 0.15 : 0.8)
        .style("stroke", isCompare ? "#F2F2F2" : "#262626")
        .style("stroke-width", isCompare ? 2 : 1.5);
    });
  }

  dots
    .on("mouseover", function (event, d) {
      if (!compareMap.has(d.kunci)) {
        d3.select(this)
          .style("fill", "#FF9A00")
          .attr("r", 7)
          .style("opacity", 1);
      }
      scatterLabel
        .attr("x", xS(d.PC1) + 9)
        .attr("y", yS(d.PC2) - 6)
        .text(d.provinsi)
        .style("opacity", 1);
      const hint = compareMap.has(d.kunci)
        ? "Klik untuk <b>hapus</b> dari komparasi"
        : `Klik untuk <b>tambah</b> ke komparasi (${compareMap.size}/${MAX_COMPARE})`;
      tooltip
        .html(`<b>${d.provinsi}</b><br>Miskin: ${d.p0}%<br>${hint}`)
        .style("opacity", 1)
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mousemove", (event) => {
      tooltip
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseleave", function () {
      scatterLabel.style("opacity", 0);
      tooltip.style("opacity", 0).style("left", "-1000px");
      updateDots();
    })
    .on("click", function (event, d) {
      event.stopPropagation();
      toggleCompare(d.kunci);
    });

  // Brush scatter
  const brushScatter = d3
    .brush()
    .extent([
      [0, 0],
      [wS - mS.left - mS.right, H - mS.top - mS.bottom],
    ])
    .on("brush", (event) => {
      if (!event.selection) return;
      const [[x0, y0], [x1, y1]] = event.selection;
      brushedKeys.clear();
      data.forEach((d) => {
        const cx = xS(d.PC1),
          cy = yS(d.PC2);
        if (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1)
          brushedKeys.add(d.kunci);
      });
      updateDots();
    })
    .on("end", (event) => {
      if (!event.selection) {
        brushedKeys.clear();
        updateDots();
        return;
      }
      brushedKeys.forEach((key) => {
        if (!compareMap.has(key) && compareMap.size < MAX_COMPARE) {
          compareMap.set(key, nextColorIdx % colorPalette.length);
          nextColorIdx++;
        }
      });
      brushedKeys.clear();
      updateDots();
      updateRadar();
      updateBadges();
      svgS.select(".brush").call(brushScatter.move, null);
    });

  svgS.insert("g", ".pca-dot").attr("class", "brush").call(brushScatter);

  // ─────────────────────────────────────────────────────────────────────
  //  B. RADAR CHART
  // ─────────────────────────────────────────────────────────────────────
  const svgR = d3
    .select("#radar-chart")
    .append("svg")
    .attr("width", "100%")
    .attr("height", H)
    .attr("viewBox", `0 0 ${wR} ${H}`)
    .style("overflow", "visible");

  const gR = svgR
    .append("g")
    .attr("transform", `translate(${wR / 2},${H / 2 + 10})`);

  const defs = svgR.append("defs");
  const filt = defs.append("filter").attr("id", "glow-r");
  filt
    .append("feGaussianBlur")
    .attr("stdDeviation", "2.5")
    .attr("result", "coloredBlur");
  const fm = filt.append("feMerge");
  fm.append("feMergeNode").attr("in", "coloredBlur");
  fm.append("feMergeNode").attr("in", "SourceGraphic");

  svgR
    .append("text")
    .attr("x", wR / 2)
    .attr("y", 22)
    .attr("text-anchor", "middle")
    .style("fill", "#f2f2f2")
    .style("font-size", "13px")
    .style("font-weight", "bold")
    .text("Radar Komparasi Profil Multidimensi");

  // Grid Radar
  const levels = 5;
  const axisGrid = gR.append("g").attr("class", "axisWrapper");
  d3.range(1, levels + 1)
    .reverse()
    .forEach((lvl) => {
      axisGrid
        .append("circle")
        .attr("r", (radarRadius / levels) * lvl)
        .style("fill", "none")
        .style("stroke", "#333")
        .style("stroke-dasharray", "2,4");
      if (lvl === levels || lvl === Math.ceil(levels / 2)) {
        axisGrid
          .append("text")
          .attr("x", 4)
          .attr("y", -((radarRadius / levels) * lvl) + 4)
          .style("fill", "#6a6a6a")
          .style("font-size", "9px")
          .text(Math.round((lvl / levels) * 100) + "%");
      }
    });

  const axisGroup = axisGrid
    .selectAll(".radar-axis")
    .data(radarDimensions)
    .enter()
    .append("g")
    .attr("class", "radar-axis");

  axisGroup
    .append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", (d, i) => radarRadius * Math.cos(angleSlice * i - Math.PI / 2))
    .attr("y2", (d, i) => radarRadius * Math.sin(angleSlice * i - Math.PI / 2))
    .style("stroke", "#4a4a4a")
    .style("stroke-width", "1px");

  const labelRadius = radarRadius * 1.18;

  axisGroup
    .append("text")
    .attr("class", "radar-label")
    .attr("x", (d, i) => labelRadius * Math.cos(angleSlice * i - Math.PI / 2))
    .attr("y", (d, i) => labelRadius * Math.sin(angleSlice * i - Math.PI / 2))
    .attr("text-anchor", (d, i) => {
      const cos = Math.cos(angleSlice * i - Math.PI / 2);
      return Math.abs(cos) < 0.1 ? "middle" : cos > 0 ? "start" : "end";
    })
    .style("fill", "#BDBDBD")
    .style("font-size", "10px")
    .style("font-weight", "500")
    .each(function (d, i) {
      const label = d3.select(this);
      const x = labelRadius * Math.cos(angleSlice * i - Math.PI / 2);
      const lines = d.lines || [d.label];

      label.text(null);

      lines.forEach((line, j) => {
        label
          .append("tspan")
          .attr("x", x)
          .attr("dy", j === 0 ? `${-((lines.length - 1) * 0.55)}em` : "1.1em")
          .text(line);
      });
    });

  const emptyHint = gR
    .append("text")
    .attr("text-anchor", "middle")
    .attr("y", 0)
    .style("fill", "#6a6a6a")
    .style("font-size", "12px")
    .text("Pilih provinsi dari dropdown / peta untuk komparasi");

  const blobLayer = gR.append("g").attr("class", "blob-layer");

  function radarPoints(prov) {
    return radarDimensions.map((dim, i) => {
      const ratio = Math.min(prov[dim.key] / dim.max, 1);
      return {
        angle: angleSlice * i - Math.PI / 2,
        r: ratio * radarRadius,
        value: prov[dim.key],
        label: dim.label,
      };
    });
  }

  const lineGen = d3
    .lineRadial()
    .radius((d) => d.r)
    .angle((d) => d.angle + Math.PI / 2)
    .curve(d3.curveLinearClosed);

  function updateRadar() {
    const selected = [...compareMap.entries()]
      .map(([key, ci]) => ({ prov: data.find((d) => d.kunci === key), ci }))
      .filter((x) => x.prov);

    emptyHint.style("display", selected.length === 0 ? null : "none");

    const blobs = blobLayer
      .selectAll("g.blob-group")
      .data(selected, (d) => d.prov.kunci);

    const blobEnter = blobs.enter().append("g").attr("class", "blob-group");

    blobEnter
      .append("path")
      .attr("class", "blob-area")
      .style("fill-opacity", 0)
      .style("stroke-width", "2px")
      .style("filter", "url(#glow-r)");

    const blobAll = blobEnter.merge(blobs);

    blobAll.each(function (d) {
      const color = colorPalette[d.ci];
      const pts = radarPoints(d.prov);
      const g = d3.select(this);

      g.select(".blob-area")
        .transition()
        .duration(400)
        .attr("d", lineGen(pts))
        .style("fill", color)
        .style("fill-opacity", 0.2 + 0.1 / Math.max(selected.length, 1))
        .style("stroke", color);

      const dotsSel = g.selectAll("circle.r-dot").data(pts);
      dotsSel
        .enter()
        .append("circle")
        .attr("class", "r-dot")
        .attr("r", 4)
        .style("fill-opacity", 0.9)
        .style("cursor", "default")
        .merge(dotsSel)
        .style("fill", color)
        .transition()
        .duration(400)
        .attr("cx", (p) => p.r * Math.cos(p.angle))
        .attr("cy", (p) => p.r * Math.sin(p.angle));

      g.selectAll("circle.r-dot")
        .on("mouseover", function (event, p) {
          tooltip
            .html(
              `<b>${d.prov.provinsi}</b><br>${p.label}: ${p.value.toLocaleString("id-ID")}`,
            )
            .style("opacity", 1)
            .style("left", event.pageX + 12 + "px")
            .style("top", event.pageY - 28 + "px");
        })
        .on("mousemove", (event) => {
          tooltip
            .style("left", event.pageX + 12 + "px")
            .style("top", event.pageY - 28 + "px");
        })
        .on("mouseleave", () =>
          tooltip.style("opacity", 0).style("left", "-1000px"),
        );

      dotsSel.exit().remove();
    });

    blobs
      .exit()
      .select(".blob-area")
      .transition()
      .duration(300)
      .style("fill-opacity", 0)
      .style("stroke-opacity", 0);
    blobs.exit().transition().duration(350).remove();
  }

  // ─────────────────────────────────────────────────────────────────────
  //  C. LENCANA (BADGES) DAFTAR PROVINSI TERPILIH DI HEADER SCENE 2
  // ─────────────────────────────────────────────────────────────────────
  function updateBadges() {
    const badgeContainer = d3.select("#selected-provinces-container");
    if (badgeContainer.empty()) return;

    badgeContainer.selectAll("*").remove();

    if (compareMap.size === 0) {
      badgeContainer
        .append("span")
        .attr("class", "selected-provinces-hint")
        .html(
          "Belum ada provinsi dibandingkan. Pilih provinsi dari menu dropdown di atas atau seleksi (brush) titik pada peta PCA.",
        );
      return;
    }

    const items = [...compareMap.entries()]
      .map(([key, ci]) => ({
        key,
        ci,
        prov: data.find((d) => d.kunci === key),
      }))
      .filter((x) => x.prov);

    items.forEach((d) => {
      const color = colorPalette[d.ci];
      const badge = badgeContainer.append("div").attr("class", "prov-badge");

      badge
        .append("span")
        .attr("class", "prov-badge-dot")
        .style("background-color", color)
        .style("color", color);

      badge
        .append("span")
        .attr("class", "prov-badge-name")
        .text(d.prov.provinsi);

      badge
        .append("button")
        .attr("class", "prov-badge-remove")
        .attr("title", "Hapus dari perbandingan")
        .html("✕")
        .on("click", (event) => {
          event.stopPropagation();
          toggleCompare(d.key);
        });
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  //  D. TOGGLE HELPER & DROPDOWN HANDLER
  // ─────────────────────────────────────────────────────────────────────
  function toggleCompare(key) {
    if (compareMap.has(key)) {
      compareMap.delete(key);
    } else {
      if (compareMap.size >= MAX_COMPARE) {
        const firstKey = compareMap.keys().next().value;
        compareMap.delete(firstKey);
      }
      compareMap.set(key, nextColorIdx % colorPalette.length);
      nextColorIdx++;
    }

    d3.select("#dropdown-provinsi").property("value", "");
    updateDots();
    updateRadar();
    updateBadges();
  }

  // Populate Options Dropdown
  const sorted = [...data].sort((a, b) => a.provinsi.localeCompare(b.provinsi));
  const dropdown = d3.select("#dropdown-provinsi");
  dropdown.selectAll("option.prov-opt").remove();
  dropdown.append("option").attr("value", "").text("-- Pilih Provinsi --");

  sorted.forEach((d) => {
    dropdown
      .append("option")
      .attr("class", "prov-opt")
      .attr("value", d.kunci)
      .text(d.provinsi);
  });

  dropdown.on("change", function () {
    const key = this.value;
    if (!key) return;
    if (!compareMap.has(key)) toggleCompare(key);
    this.value = "";
  });

  // ─── Init ─────────────────────────────────────────────────────────────
  updateDots();
  updateRadar();
  updateBadges();
}
