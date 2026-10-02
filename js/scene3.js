// js/scene3.js
// Scene 3: Marimekko Chart (Mosaic Plot) — Jumlah Penduduk Miskin vs Persentase Kemiskinan
// ──────────────────────────────────────────────────────────────────────────────
// Tujuan  : Menunjukkan bahwa provinsi dengan Persentase Kemiskinan tinggi
//           belum tentu memiliki Jumlah Penduduk Miskin Absolut terbanyak.
// Sumbu X : Lebar balok ∝ Jumlah Penduduk Miskin Absolut (ribu jiwa)
// Sumbu Y : Tinggi balok ∝ Persentase Penduduk Miskin (P0)
// Urutan  : Kiri → kanan = terbesar → terkecil (jumlah absolut)

function renderScene3() {
    const raw = appData.provinsiSimbol; // [{provinsi, jumlah_ribu, p0_avg, lon, lat}, …]
    if (!raw || !raw.length) return;

    const containerId = "#chart-scene3";
    d3.select(containerId).selectAll("*").remove();

    // ── Data: urutkan jumlah absolut terbesar → terkecil ─────────────────
    const data = [...raw].sort((a, b) => b.jumlah_ribu - a.jumlah_ribu);

    const totalJumlah = d3.sum(data, d => d.jumlah_ribu);
    const maxP0       = d3.max(data, d => d.p0_avg);

    // ── Dimensi & margin ─────────────────────────────────────────────────
    const container = d3.select(containerId).node();
    const fullW     = container.getBoundingClientRect().width || 1000;
    const margin    = { top: 40, right: 24, bottom: 80, left: 60 };
    const W         = fullW - margin.left - margin.right;
    const H         = 500;
    const totalH    = H + margin.top + margin.bottom;

    const svg = d3.select(containerId).append("svg")
        .attr("width",  fullW)
        .attr("height", totalH)
        .style("display", "block");

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // ── Skala Y: persentase kemiskinan P0 ────────────────────────────────
    // Tambah sedikit ruang di atas agar label tidak terpotong
    const yDomain = Math.ceil(maxP0 / 5) * 5 + 5;
    const yScale  = d3.scaleLinear().domain([0, yDomain]).range([H, 0]);

    // ── Hitung posisi x kumulatif (Marimekko) ────────────────────────────
    let xCursor = 0;
    const bars = data.map(d => {
        const w = (d.jumlah_ribu / totalJumlah) * W;
        const entry = {
            ...d,
            x: xCursor,
            w: w,
            barH: H - yScale(d.p0_avg)   // tinggi balok dalam piksel
        };
        xCursor += w;
        return entry;
    });

    // ── Palet warna ──────────────────────────────────────────────────────
    // Interpolasi warna dari biru teal → kuning emas → merah terang
    // berdasarkan p0_avg agar kontras tinggi di latar gelap
    const colorScale = d3.scaleSequential()
        .domain([0, maxP0])
        .interpolator(d3.interpolateTurbo);

    // ── Tooltip ──────────────────────────────────────────────────────────
    const tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");

    // Nama provinsi: huruf kapital tiap kata
    function titleCase(s) {
        return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    }

    // ── Render Balok Marimekko ───────────────────────────────────────────
    const rects = g.selectAll("rect.marimekko-bar")
        .data(bars).enter()
        .append("rect").attr("class", "marimekko-bar")
        .attr("x",      d => d.x)
        .attr("y",      d => yScale(d.p0_avg))
        .attr("width",  d => Math.max(d.w - 1.2, 0.8))  // gap 1.2 px antar balok
        .attr("height", d => d.barH)
        .attr("fill",   d => colorScale(d.p0_avg))
        .attr("rx", 2)
        .style("cursor", "pointer")
        .style("transition", "opacity 0.15s");

    // ── Label nama provinsi di dalam / atas balok (hanya yang cukup lebar) ─
    g.selectAll("text.bar-label")
        .data(bars.filter(d => d.w > 28)).enter()
        .append("text").attr("class", "bar-label")
        .attr("x", d => d.x + d.w / 2)
        .attr("y", d => {
            // Jika balok cukup tinggi, taruh di dalam; kalau tidak, di atas
            return d.barH > 50 ? yScale(d.p0_avg) + 14 : yScale(d.p0_avg) - 5;
        })
        .attr("text-anchor", "middle")
        .style("fill", d => d.barH > 50 ? "#fff" : "#ccc")
        .style("font-size", d => d.w > 55 ? "10px" : "8px")
        .style("font-weight", "600")
        .style("pointer-events", "none")
        .text(d => {
            // Singkat jika balok sempit
            const name = titleCase(d.provinsi);
            if (d.w > 75) return name;
            // Ambil kata terakhir saja
            const parts = name.split(" ");
            return parts[parts.length - 1];
        });

    // ── Label persentase di tiap balok ────────────────────────────────────
    g.selectAll("text.bar-pct")
        .data(bars.filter(d => d.w > 22 && d.barH > 28)).enter()
        .append("text").attr("class", "bar-pct")
        .attr("x", d => d.x + d.w / 2)
        .attr("y", d => yScale(d.p0_avg) + (d.barH > 50 ? 28 : 12))
        .attr("text-anchor", "middle")
        .style("fill", "rgba(255,255,255,0.75)")
        .style("font-size", "9px")
        .style("pointer-events", "none")
        .text(d => d.p0_avg.toFixed(1) + "%");

    // ── Sumbu Y ──────────────────────────────────────────────────────────
    const yAxis = d3.axisLeft(yScale)
        .ticks(6)
        .tickFormat(d => d + "%")
        .tickSize(0);

    const yAxisG = g.append("g").call(yAxis);
    yAxisG.select(".domain").remove();
    yAxisG.selectAll("text")
        .style("fill", "#b9b9b9").style("font-size", "11px");

    // Label sumbu Y
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -H / 2).attr("y", -44)
        .attr("text-anchor", "middle")
        .style("fill", "#e0e0e0").style("font-size", "12px").style("font-weight", "600")
        .text("Persentase Penduduk Miskin (P0) →");

    // Garis bantu horizontal tipis (hanya beberapa)
    const yTicks = yScale.ticks(6);
    g.selectAll("line.h-grid")
        .data(yTicks).enter()
        .append("line").attr("class", "h-grid")
        .attr("x1", 0).attr("x2", W)
        .attr("y1", d => yScale(d)).attr("y2", d => yScale(d))
        .style("stroke", "rgba(255,255,255,0.06)")
        .style("stroke-dasharray", "4,4");

    // ── Sumbu X (baseline) ───────────────────────────────────────────────
    g.append("line")
        .attr("x1", 0).attr("x2", W)
        .attr("y1", H).attr("y2", H)
        .style("stroke", "#4a4a4a");

    // Label sumbu X
    g.append("text")
        .attr("x", W / 2).attr("y", H + 52)
        .attr("text-anchor", "middle")
        .style("fill", "#e0e0e0").style("font-size", "12px").style("font-weight", "600")
        .text("← Lebar Balok ∝ Jumlah Penduduk Miskin Absolut (Ribu Jiwa) →");

    // Tick-mark kumulatif di sumbu X (setiap kelipatan tertentu ribu jiwa)
    // Kita tampilkan penanda di batas balok beberapa provinsi besar
    const cumulTicks = [];
    let cumul = 0;
    bars.forEach(d => {
        cumul += d.jumlah_ribu;
        cumulTicks.push({ cumul, x: d.x + d.w, provinsi: d.provinsi, jumlah: d.jumlah_ribu });
    });

    // Tampilkan label jumlah di bawah untuk provinsi yang lebar ≥ 35 px
    g.selectAll("text.x-tick-label")
        .data(bars.filter(d => d.w >= 35)).enter()
        .append("text").attr("class", "x-tick-label")
        .attr("x", d => d.x + d.w / 2)
        .attr("y", H + 18)
        .attr("text-anchor", "middle")
        .style("fill", "#888").style("font-size", "9px")
        .text(d => d.jumlah_ribu.toLocaleString("id-ID", { maximumFractionDigits: 0 }));

    // ── Interaksi: Hover Tooltip ─────────────────────────────────────────
    rects
        .on("mouseover", function(event, d) {
            // Highlight balok ini, redupkan yang lain
            rects.style("opacity", x => x.provinsi === d.provinsi ? 1 : 0.3);
            d3.select(this)
                .style("stroke", "#fff")
                .style("stroke-width", 2);

            const pct = ((d.jumlah_ribu / totalJumlah) * 100).toFixed(1);
            tooltip.html(
                `<b style="color:#2ec4b6;font-size:13px">${titleCase(d.provinsi)}</b><br>` +
                `<span style="color:#ccc">Jumlah Absolut:</span> <b>${d.jumlah_ribu.toLocaleString("id-ID")} ribu jiwa</b><br>` +
                `<span style="color:#ccc">Persentase Kemiskinan:</span> <b>${d.p0_avg}%</b><br>` +
                `<span style="color:#888;font-size:10px">Proporsi thd total: ${pct}%</span>`
            )
            .style("opacity", 1)
            .style("left", (event.pageX + 16) + "px")
            .style("top",  (event.pageY - 40) + "px");
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", (event.pageX + 16) + "px")
                .style("top",  (event.pageY - 40) + "px");
        })
        .on("mouseleave", function() {
            rects.style("opacity", 1)
                .style("stroke", "none");
            tooltip.style("opacity", 0).style("left", "-9999px");
        });

    // ── Anotasi: Highlight insight utama ─────────────────────────────────
    // Cari provinsi dengan P0 tertinggi & jumlah terbesar
    const topP0     = data.reduce((a, b) => a.p0_avg > b.p0_avg ? a : b);
    const topJumlah = data[0]; // sudah sorted terbesar

    const topP0Bar     = bars.find(b => b.provinsi === topP0.provinsi);
    const topJumlahBar = bars.find(b => b.provinsi === topJumlah.provinsi);

    // Anotasi: provinsi P0 tertinggi
    if (topP0Bar && topP0Bar.w > 4) {
        const ax = topP0Bar.x + topP0Bar.w / 2;
        const ay = yScale(topP0.p0_avg) - 12;

        // Garis penunjuk
        g.append("line")
            .attr("x1", ax).attr("x2", ax)
            .attr("y1", ay).attr("y2", ay - 28)
            .style("stroke", "#ff6b6b").style("stroke-width", 1.5)
            .style("stroke-dasharray", "3,2");

        g.append("text")
            .attr("x", ax).attr("y", ay - 32)
            .attr("text-anchor", "middle")
            .style("fill", "#ff6b6b").style("font-size", "10px").style("font-weight", "bold")
            .text("P0 Tertinggi ↓");
    }

    // Anotasi: provinsi jumlah terbesar
    if (topJumlahBar) {
        const ax2 = topJumlahBar.x + topJumlahBar.w / 2;

        g.append("text")
            .attr("x", ax2).attr("y", H + 38)
            .attr("text-anchor", "middle")
            .style("fill", "#2ec4b6").style("font-size", "10px").style("font-weight", "bold")
            .text("Jumlah Absolut Terbanyak ↑");
    }

    // ── Legenda Warna ────────────────────────────────────────────────────
    const legendW = Math.min(200, W * 0.25);
    const legendH = 12;
    const legendG = svg.append("g")
        .attr("transform", `translate(${margin.left + W - legendW - 4}, ${margin.top - 32})`);

    // Gradient bar
    const defs   = svg.append("defs");
    const gradId = "marimekko-grad-" + Math.random().toString(36).slice(2, 8);
    const grad   = defs.append("linearGradient").attr("id", gradId);
    const nStops = 10;
    for (let i = 0; i <= nStops; i++) {
        const t = i / nStops;
        grad.append("stop")
            .attr("offset",     (t * 100) + "%")
            .attr("stop-color", d3.interpolateTurbo(t));
    }

    legendG.append("rect")
        .attr("width", legendW).attr("height", legendH)
        .attr("rx", 3)
        .style("fill", `url(#${gradId})`);

    legendG.append("text")
        .attr("x", 0).attr("y", -3)
        .style("fill", "#b9b9b9").style("font-size", "9px")
        .text("Persentase Kemiskinan (P0)");

    legendG.append("text")
        .attr("x", 0).attr("y", legendH + 11)
        .style("fill", "#888").style("font-size", "8px")
        .text("0%");

    legendG.append("text")
        .attr("x", legendW).attr("y", legendH + 11)
        .attr("text-anchor", "end")
        .style("fill", "#888").style("font-size", "8px")
        .text(maxP0.toFixed(1) + "%");
}
