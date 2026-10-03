// js/scene5.js
// Scene 5: Heatmap Korelasi Antarindikator (10 Variabel Sosial-Ekonomi)
// ──────────────────────────────────────────────────────────────────────────────
// Data   : provinsi_multivariat.json (/data/olahan/)
// Tujuan : Menunjukkan variabel mana yang paling berkorelasi kuat (positif/negatif)
//          terhadap tingkat kemiskinan provinsi (P0).
// Visual : Matriks Heatmap 10x10 dengan skala warna divergen (-1 sd +1)

async function renderScene5() {
  const containerId = "#chart-scene5";
  d3.select(containerId).selectAll("*").remove();

  // ── 1. Ambil data dari appData atau fetch /data/olahan/ ────────────────
  let dataProv = appData.provinsiMultivariat;
  if (!dataProv || !dataProv.length) {
    try {
      const cacheBuster = "?v=" + new Date().getTime();
      const res = await fetch(
        "data/olahan/provinsi_multivariat.json" + cacheBuster,
      );
      dataProv = await res.json();
      appData.provinsiMultivariat = dataProv;
    } catch (err) {
      console.error("Gagal memuat data scene 5:", err);
      return;
    }
  }

  // ── 2. Definisi 10 Variabel Sosial-Ekonomi ───────────────────────────
  const variables = [
    {
      key: "p0",
      label: "Persentase Kemiskinan (P0)",
      lines: ["Persentase", "Kemiskinan (P0)"],
    },
    {
      key: "p1",
      label: "Indeks Kedalaman (P1)",
      lines: ["Indeks Kedalaman", "(P1)"],
    },
    {
      key: "p2",
      label: "Indeks Keparahan (P2)",
      lines: ["Indeks Keparahan", "(P2)"],
    },
    {
      key: "lama_sekolah",
      label: "Rata-rata Lama Sekolah",
      lines: ["Rata-rata Lama", "Sekolah"],
    },
    {
      key: "sanitasi_layak",
      label: "Akses Sanitasi Layak",
      lines: ["Akses Sanitasi", "Layak"],
    },
    {
      key: "air_layak",
      label: "Akses Air Minum Layak",
      lines: ["Akses Air Minum", "Layak"],
    },
    {
      key: "pengeluaran_total",
      label: "Pengeluaran per Kapita",
      lines: ["Pengeluaran", "per Kapita"],
    },
    {
      key: "porsi_makanan",
      label: "Porsi Pengeluaran Makanan",
      lines: ["Porsi Pengeluaran", "Makanan"],
    },
    {
      key: "tpt",
      label: "Tingkat Pengangguran (TPT)",
      lines: ["Tingkat Pengangguran", "(TPT)"],
    },
    {
      key: "tpak",
      label: "Partisipasi Kerja (TPAK)",
      lines: ["Partisipasi Kerja", "(TPAK)"],
    },
  ];

  // ── 3. Hitung Matriks Korelasi Pearson (10x10) ───────────────────────
  function pearsonR(arr1, arr2) {
    const n = arr1.length;
    if (n === 0) return 0;
    const mean1 = d3.mean(arr1);
    const mean2 = d3.mean(arr2);
    let num = 0,
      denom1 = 0,
      denom2 = 0;
    for (let i = 0; i < n; i++) {
      const dx = arr1[i] - mean1;
      const dy = arr2[i] - mean2;
      num += dx * dy;
      denom1 += dx * dx;
      denom2 += dy * dy;
    }
    if (denom1 === 0 || denom2 === 0) return 0;
    return num / Math.sqrt(denom1 * denom2);
  }

  const nVars = variables.length;
  const matrixData = [];

  for (let i = 0; i < nVars; i++) {
    const v1 = variables[i];
    const vals1 = dataProv.map((d) => +d[v1.key]);

    for (let j = 0; j < nVars; j++) {
      const v2 = variables[j];
      const vals2 = dataProv.map((d) => +d[v2.key]);
      const r = i === j ? 1.0 : pearsonR(vals1, vals2);

      matrixData.push({
        xIndex: j,
        yIndex: i,
        varX: v2.label,
        varY: v1.label,
        keyX: v2.key,
        keyY: v1.key,
        val: r,
      });
    }
  }

  // ── 4. Layout & Dimensi ───────────────────────────────────────────────
  const container = d3.select(containerId).node();
  const fullW = container.getBoundingClientRect().width || 900;

  // Margin yang cukup untuk label sumbu Y & X
  const margin = {
    top: 160,
    right: 170,
    bottom: 80,
    left: 235,
  };
  const maxMatrixSize = Math.min(fullW - margin.left - margin.right, 640);
  const W = Math.max(maxMatrixSize, 300);
  const H = W; // Matriks persegi

  const totalW = W + margin.left + margin.right;
  const totalH = H + margin.top + margin.bottom;

  const svg = d3
    .select(containerId)
    .append("svg")
    .attr("width", totalW)
    .attr("height", totalH)
    .style("display", "block")
    .style("margin", "0 auto")
    .style("background", "rgba(0,0,0,0)");

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // ── 5. Skala Band & Skala Warna Diverger ─────────────────────────────
  const xScale = d3
    .scaleBand()
    .domain(variables.map((v) => v.label))
    .range([0, W])
    .padding(0.04);

  const yScale = d3
    .scaleBand()
    .domain(variables.map((v) => v.label))
    .range([0, H])
    .padding(0.04);

  // Skala Warna Diverging (-1 sd +1): Merah (-1) ↔ Abu Gelap (0) ↔ Teal (+1)
  const colorScale = d3
    .scaleLinear()
    .domain([-1, 0, 1])
    .range(["#FF9A00", "#333333", "#0066CC"]);

  // Tooltip
  const tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");

  // ── 6. Render Sel Matriks ─────────────────────────────────────────────
  const cells = g
    .selectAll("rect.cell")
    .data(matrixData)
    .enter()
    .append("rect")
    .attr("class", "cell")
    .attr("x", (d) => xScale(d.varX))
    .attr("y", (d) => yScale(d.varY))
    .attr("width", xScale.bandwidth())
    .attr("height", yScale.bandwidth())
    .attr("rx", 2)
    .attr("fill", (d) => colorScale(d.val))
    .style("stroke", "#262626")
    .style("stroke-width", 1)
    .style("cursor", "pointer")
    .style("transition", "opacity 0.15s");

  // ── 7. Nilai Korelasi di Sel ──────────────────────────────────────────
  g.selectAll("text.cell-val")
    .data(matrixData)
    .enter()
    .append("text")
    .attr("class", "cell-val")
    .attr("x", (d) => xScale(d.varX) + xScale.bandwidth() / 2)
    .attr("y", (d) => yScale(d.varY) + yScale.bandwidth() / 2 + 4)
    .attr("text-anchor", "middle")
    .style("font-size", xScale.bandwidth() > 40 ? "11px" : "9px")
    .style("font-weight", "600")
    .style("fill", (d) =>
      Math.abs(d.val) <= 0.4
        ? "#BDBDBD"
        : d3.lab(colorScale(d.val)).l > 60
          ? "#262626"
          : "#F2F2F2",
    )
    .style("pointer-events", "none")
    .text((d) => (d.val === 1 ? "1.00" : d.val.toFixed(2)));

  // ── 8. Render Sumbu X dan Y ────────────────────────────────────────────
  // Label kolom berada di ATAS matriks.
  // Label baris berada di KIRI matriks.

  // Sumbu X — di bagian ATAS, dibuat miring ke kanan
  const xAxis = d3.axisTop(xScale).tickSize(0);

  const xAxisG = g
    .append("g")
    .attr("transform", "translate(0, -10)")
    .call(xAxis);

  xAxisG.select(".domain").remove();

  xAxisG
    .selectAll("text")
    .style("fill", "#F2F2F2")
    .style("font-size", "10px")
    .style("font-family", "'Plus Jakarta Sans', sans-serif")
    .style("font-weight", "500")
    .attr("text-anchor", "start")
    .attr("transform", "rotate(-45)")
    .attr("x", 0)
    .attr("y", -4)
    .attr("dx", "0.4em")
    .attr("dy", "0em");

  // Sumbu Y — di bagian KIRI
  const yAxis = d3.axisLeft(yScale).tickSize(0);

  const yAxisG = g
    .append("g")
    .attr("transform", "translate(-10, 0)")
    .call(yAxis);

  yAxisG.select(".domain").remove();

  yAxisG
    .selectAll("text")
    .style("fill", "#F2F2F2")
    .style("font-size", "10px")
    .style("font-family", "'Plus Jakarta Sans', sans-serif")
    .style("font-weight", "500")
    .attr("text-anchor", "end");

  // ── 9. Interaksi Hover Tooltip ────────────────────────────────────────
  cells
    .on("mouseover", function (event, d) {
      cells.style("opacity", (x) =>
        x.varX === d.varX && x.varY === d.varY ? 1 : 0.4,
      );
      d3.select(this).style("stroke", "#F2F2F2").style("stroke-width", 2);

      const statusKorelasi =
        d.val > 0.6
          ? "Korelasi Positif Kuat"
          : d.val > 0.2
            ? "Korelasi Positif Sedang"
            : d.val > -0.2
              ? "Korelasi Lemah / Dekat 0"
              : d.val > -0.6
                ? "Korelasi Negatif Sedang"
                : "Korelasi Negatif Kuat";

      const colorText =
        d.val > 0 ? "#599CDE" : d.val < 0 ? "#FF9A00" : "#F2F2F2";

      tooltip
        .html(
          `<div style="font-size:11px;color:#bbb;margin-bottom:2px">Hubungan Korelasi</div>` +
            `<div style="font-weight:bold;color:#F2F2F2">${d.varY}</div>` +
            `<div style="font-size:11px;color:#aaa">dengan</div>` +
            `<div style="font-weight:bold;color:#F2F2F2;margin-bottom:6px">${d.varX}</div>` +
            `<div style="font-size:13px;color:${colorText}">Nilai r = <b>${d.val.toFixed(3)}</b></div>` +
            `<div style="font-size:10px;color:#999;margin-top:2px">${statusKorelasi}</div>`,
        )
        .style("opacity", 1)
        .style("left", event.pageX + 16 + "px")
        .style("top", event.pageY - 40 + "px");
    })
    .on("mousemove", (event) => {
      tooltip
        .style("left", event.pageX + 16 + "px")
        .style("top", event.pageY - 40 + "px");
    })
    .on("mouseleave", function () {
      cells
        .style("opacity", 1)
        .style("stroke", "#262626")
        .style("stroke-width", 1);
      tooltip.style("opacity", 0).style("left", "-9999px");
    });

  // ── 10. Legenda Skala Warna ──────────────────────────────────────────
  const legW = 240;
  const legH = 10;
  const legG = svg
    .append("g")
    .attr(
      "transform",
      `translate(${margin.left + (W - legW) / 2}, ${margin.top + H + 55})`,
    );

  const defs = svg.append("defs");
  const gradId = "heatmap-grad-diverging";
  const grad = defs.append("linearGradient").attr("id", gradId);

  grad.append("stop").attr("offset", "0%").attr("stop-color", "#FF9A00");
  grad.append("stop").attr("offset", "50%").attr("stop-color", "#333333");
  grad.append("stop").attr("offset", "100%").attr("stop-color", "#0066CC");

  legG
    .append("rect")
    .attr("width", legW)
    .attr("height", legH)
    .attr("rx", 3)
    .style("fill", `url(#${gradId})`);

  legG
    .append("text")
    .attr("x", 0)
    .attr("y", legH + 13)
    .style("fill", "#FF9A00")
    .style("font-size", "10px")
    .style("font-weight", "bold")
    .text("-1.0 (Negatif Kuat)");

  legG
    .append("text")
    .attr("x", legW / 2)
    .attr("y", legH + 13)
    .attr("text-anchor", "middle")
    .style("fill", "#BDBDBD")
    .style("font-size", "10px")
    .text("0 (Netral)");

  legG
    .append("text")
    .attr("x", legW)
    .attr("y", legH + 13)
    .attr("text-anchor", "end")
    .style("fill", "#599CDE")
    .style("font-size", "10px")
    .style("font-weight", "bold")
    .text("+1.0 (Positif Kuat)");
}
