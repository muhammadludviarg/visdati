// js/sceneMakro.js
// Visualisasi Bagian 1: Resolusi Makro (Bahasa Negara)
// 1. Interactive D3 Word Cloud (Bahasa Negara BRS BPS)
// 2. Multi-Line Chart Tren Kemiskinan Historis (Nasional & 38 Provinsi dengan Line Highlight)

function renderMakroSection() {
    renderBRSWordNetwork();
    renderTrenLineChart();
}

// ── 1. INTERACTIVE D3 WORD CLOUD BRS BPS ──────────────────────────────────
function renderBRSWordNetwork() {
    const containerId = "#chart-teks-brs";
    const container = d3.select(containerId);

    if (container.empty()) return;

    container.selectAll("*").remove();

    const dataTeks = appData.dataTeksKemiskinan;

    if (!dataTeks || !dataTeks.length) return;

    // ============================================================
    // 1. STOP WORD
    // ============================================================

    const stopWords = new Set([
        "ul", "li", "style", "box", "sizing", "border", "padding",
        "left", "rem", "margin", "top", "px", "bottom", "color",
        "rgb", "font", "family", "quot", "ibm", "plex", "sans",
        "serif", "size", "background", "text", "align", "justify",
        "div", "class", "msonormal", "height", "normal", "span",
        "face", "arial",

        "sebesar", "menjadi", "dibandingkan", "dibanding",
        "sebanyak", "tercatat", "memiliki", "adalah",
        "pada", "yang", "dan", "di", "ke", "dari", "ini",
        "itu", "orang", "poin", "bulan", "kapita", "rp"
    ]);

    // ============================================================
    // 2. HITUNG FREKUENSI KATA
    // ============================================================

    const wordCounts = {};

    dataTeks.forEach(d => {

        if (!Array.isArray(d.tokens)) return;

        d.tokens.forEach(tok => {

            const w = String(tok)
                .toLowerCase()
                .trim();

            if (
                w.length > 2 &&
                !stopWords.has(w) &&
                isNaN(w)
            ) {
                wordCounts[w] = (wordCounts[w] || 0) + 1;
            }

        });

    });

    // ============================================================
    // 3. AMBIL 45 KATA TERATAS
    // ============================================================

    const sortedWords = Object.entries(wordCounts)
        .map(([text, count]) => ({
            text,
            count
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 45);

    if (!sortedWords.length) return;

    // ============================================================
    // 4. DIMENSI RESPONSIF
    // ============================================================

    const node = container.node();

    const W = Math.max(
        320,
        Math.floor(
            node.getBoundingClientRect().width || 800
        )
    );

    const H = Math.min(
        520,
        Math.max(
            360,
            Math.round(W * 0.48)
        )
    );

    // ============================================================
    // 5. SVG
    // ============================================================

    const svg = container
        .append("svg")
        .attr("width", "100%")
        .attr("height", H)
        .attr(
            "viewBox",
            `0 0 ${W} ${H}`
        )
        .attr(
            "role",
            "img"
        )
        .attr(
            "aria-label",
            "Word cloud istilah dominan dalam Berita Resmi Statistik BPS"
        )
        .style("display", "block")
        .style("overflow", "visible")
        .style("background", "transparent");

    // ============================================================
    // 6. SKALA UKURAN FONT
    // ============================================================

    const minCount = d3.min(
        sortedWords,
        d => d.count
    );

    const maxCount = d3.max(
        sortedWords,
        d => d.count
    );

    const fontSizeScale = d3.scaleSqrt()
        .domain([
            minCount,
            maxCount
        ])
        .range([
            15,
            Math.min(
                54,
                Math.max(
                    38,
                    W * 0.055
                )
            )
        ]);

    // ============================================================
    // 7. WARNA KATA
    // ============================================================

    function getWordColor(word) {

        if (
            [
                "persentase",
                "turun",
                "menurun",
                "penurunan"
            ].includes(word)
        ) {
            return "#2ec4b6";
        }

        if (
            [
                "makanan",
                "garis",
                "kemiskinan"
            ].includes(word)
        ) {
            return "#f4a261";
        }

        if (
            [
                "perdesaan",
                "perkotaan",
                "provinsi"
            ].includes(word)
        ) {
            return "#48cae4";
        }

        if (
            [
                "penduduk",
                "miskin",
                "jumlah"
            ].includes(word)
        ) {
            return "#ffffff";
        }

        return "#a1a1a6";
    }

    // ============================================================
    // 8. FORMAT DATA UNTUK D3-CLOUD
    // ============================================================

    const words = sortedWords.map((d, i) => ({

        ...d,

        size: fontSizeScale(d.count),

        // Hanya 0° atau 90°
        // agar lebih editorial dan mudah dibaca
        rotate: i % 5 === 0 ? 90 : 0

    }));

    // ============================================================
    // 9. D3 CLOUD LAYOUT
    // ============================================================

    const layout = d3.layout.cloud()

        .size([
            W - 24,
            H - 24
        ])

        .words(words)

        // Jarak antar kata
        .padding(7)

        // Rotasi
        .rotate(d => d.rotate)

        // Font
        .font("Archivo")

        // Ukuran font
        .fontSize(d => d.size)

        // Pola penyebaran
        .spiral("archimedean")

        // Setelah layout selesai
        .on("end", draw);

    layout.start();

    // ============================================================
    // 10. TOOLTIP
    // ============================================================

    const tooltip = d3.select(
        ".d3-tooltip.map-tooltip"
    );

    // ============================================================
    // 11. DRAW WORD CLOUD
    // ============================================================

    function draw(placedWords) {

        const g = svg
            .append("g")
            .attr(
                "class",
                "word-cloud-group"
            )
            .attr(
                "transform",
                `translate(${W / 2},${H / 2})`
            );

        const items = g
            .selectAll("g.word-item")
            .data(placedWords)
            .enter()
            .append("g")
            .attr(
                "class",
                "word-item"
            )
            .attr(
                "transform",
                d =>
                    `translate(${d.x},${d.y}) rotate(${d.rotate})`
            )
            .style(
                "cursor",
                "pointer"
            );

        // ========================================================
        // TEKS WORD CLOUD
        // ========================================================

        items
            .append("text")
            .attr(
                "text-anchor",
                "middle"
            )
            .attr(
                "dy",
                "0.35em"
            )
            .style(
                "font-family",
                "Archivo, var(--font-sans), sans-serif"
            )
            .style(
                "font-size",
                d => `${d.size}px`
            )
            .style(
                "font-weight",
                d =>
                    d.count >= maxCount * 0.55
                        ? "700"
                        : "500"
            )
            .style(
                "fill",
                d => getWordColor(d.text)
            )

            // Halo agar teks tetap terbaca
            .style(
                "paint-order",
                "stroke"
            )
            .style(
                "stroke",
                "#141414"
            )
            .style(
                "stroke-width",
                "3px"
            )
            .style(
                "stroke-linejoin",
                "round"
            )

            .text(
                d => d.text
            );

        // ========================================================
        // INTERAKSI
        // ========================================================

        items

            .on(
                "mouseenter",
                function(event, d) {

                    d3.select(this)
                        .select("text")
                        .transition()
                        .duration(120)
                        .style(
                            "font-size",
                            `${Math.min(
                                d.size + 4,
                                64
                            )}px`
                        )
                        .style(
                            "fill",
                            "#ffffff"
                        );

                    if (!tooltip.empty()) {

                        tooltip
                            .html(`
                                <div style="
                                    font-weight:700;
                                    color:var(--aksen);
                                    font-size:13px;
                                    text-transform:capitalize
                                ">
                                    "${d.text}"
                                </div>

                                <div style="
                                    font-size:11px;
                                    color:#fff
                                ">
                                    Frekuensi muncul:
                                    <b>${d.count} kali</b>
                                </div>
                            `)

                            .style(
                                "opacity",
                                1
                            )

                            .style(
                                "left",
                                `${event.pageX + 15}px`
                            )

                            .style(
                                "top",
                                `${event.pageY - 30}px`
                            );
                    }

                }
            )

            .on(
                "mousemove",
                event => {

                    if (!tooltip.empty()) {

                        tooltip
                            .style(
                                "left",
                                `${event.pageX + 15}px`
                            )
                            .style(
                                "top",
                                `${event.pageY - 30}px`
                            );

                    }

                }
            )

            .on(
                "mouseleave",
                function(event, d) {

                    d3.select(this)
                        .select("text")
                        .transition()
                        .duration(120)
                        .style(
                            "font-size",
                            `${d.size}px`
                        )
                        .style(
                            "fill",
                            getWordColor(d.text)
                        );

                    if (!tooltip.empty()) {

                        tooltip
                            .style(
                                "opacity",
                                0
                            )
                            .style(
                                "left",
                                "-1000px"
                            );

                    }

                }
            );
    }
}

// ── 2. LINE CHART TREN KEMISKINAN HISTORIS (ALL PROVINCES + NASIONAL HIGHLIGHT) ──
let trenChartState = {
    svg: null,
    g: null,
    xScale: null,
    yScale: null,
    tooltip: null,
    innerW: 0,
    innerH: 0,
    currentProvinsi: "Indonesia",
    allLines: []
};

const KRISIS_ANOTASI = {
    Indonesia: [
        { tahun: 2020, label: "Pandemi COVID-19" }
    ]
};

function renderTrenLineChart() {
    const containerId = "#chart-tren-kemiskinan";
    const container = d3.select(containerId);
    if (container.empty()) return;

    container.selectAll("*").remove();

    // Data Nasional dari appData.trenKemiskinan — filter 2010–2025
    let nationalData = [];
    if (appData.trenKemiskinan && appData.trenKemiskinan.length) {
        nationalData = appData.trenKemiskinan
            .filter(d => +d.tahun >= 2010 && +d.tahun <= 2025)
            .map(d => ({
                provinsi: "Indonesia",
                tahun: +d.tahun,
                p0: +d.persentase,
                jumlah_ribu: (d.jumlah_juta || 0) * 1000,
                anotasi: d.anotasi || null
            }));
    }

    // Data Provinsi — filter 2010–2025
    const provRaw = appData.kemiskinanHistorisLengkap || appData.kemiskinanHistorisProvinsi || [];
    const provFiltered = provRaw.filter(d =>
        d.tingkat === 'provinsi' &&
        !isNaN(d.p0) &&
        d.provinsi !== 'Indonesia' &&
        +d.tahun >= 2010 &&
        +d.tahun <= 2025
    );

    // Grouping per provinsi
    const groupedMap = new Map();

    if (nationalData.length) {
        groupedMap.set("Indonesia", nationalData);
    }

    provFiltered.forEach(d => {
        if (!groupedMap.has(d.provinsi)) {
            groupedMap.set(d.provinsi, []);
        }
        groupedMap.get(d.provinsi).push(d);
    });

    // Urutkan tahun tiap garis
    for (let [p, arr] of groupedMap.entries()) {
        arr.sort((a, b) => a.tahun - b.tahun);
    }


    const allLines = Array.from(groupedMap.entries()).map(([provinsi, data]) => ({ provinsi, data }));
    if (!allLines.length) return;

    // Populasi dropdown
    const provincesList = Array.from(groupedMap.keys()).sort((a, b) => {
        if (a === "Indonesia") return -1;
        if (b === "Indonesia") return 1;
        return a.localeCompare(b, "id");
    });

    const dropdown = document.getElementById("dropdown-tren-provinsi");
    if (dropdown) {
        dropdown.innerHTML = "";
        provincesList.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p;
            opt.textContent = p === "Indonesia" ? "Indonesia (Nasional)" : p;
            if (p === "Indonesia") opt.selected = true;
            dropdown.appendChild(opt);
        });
    }

    // Canvas SVG
    const node = container.node();
    const W = node.getBoundingClientRect().width || 800;
    const H = 430;
    const margin = { top: 50, right: 45, bottom: 50, left: 52 };
    const innerW = W - margin.left - margin.right;
    const innerH = H - margin.top - margin.bottom;

    trenChartState.innerW = innerW;
    trenChartState.innerH = innerH;

    const svg = container.append("svg")
        .attr("width", "100%")
        .attr("height", H)
        .attr("viewBox", `0 0 ${W} ${H}`)
        .style("display", "block")
        .style("background", "transparent");

    trenChartState.svg = svg;

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    trenChartState.g = g;

    // Skala
    const allYears = Array.from(new Set(allLines.flatMap(l => l.data.map(d => d.tahun)))).sort((a, b) => a - b);
    const xScale = d3.scaleLinear()
        .domain([d3.min(allYears), d3.max(allYears)])
        .range([0, innerW]);
    trenChartState.xScale = xScale;

    const maxP0 = d3.max(allLines.flatMap(l => l.data.map(d => d.p0))) || 40;
    const yScale = d3.scaleLinear()
        .domain([0, Math.ceil(maxP0 / 5) * 5 + 2])
        .range([innerH, 0]);
    trenChartState.yScale = yScale;

    // Gradient area fill untuk garis terpilih
    const defs = svg.append("defs");
    const areaGrad = defs.append("linearGradient")
        .attr("id", "area-tren-gradient-prov")
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "0%").attr("y2", "100%");
    areaGrad.append("stop").attr("offset", "0%")
        .attr("stop-color", "var(--aksen)").attr("stop-opacity", 0.28);
    areaGrad.append("stop").attr("offset", "100%")
        .attr("stop-color", "var(--aksen)").attr("stop-opacity", 0.0);

    // Garis grid horizontal
    g.selectAll("line.grid-line")
        .data(yScale.ticks(6))
        .enter()
        .append("line")
        .attr("class", "grid-line")
        .attr("x1", 0).attr("x2", innerW)
        .attr("y1", d => yScale(d)).attr("y2", d => yScale(d))
        .style("stroke", "rgba(255, 255, 255, 0.06)")
        .style("stroke-dasharray", "3,3");

    // Sumbu X & Y
    const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d")).tickValues(allYears.filter((_, i) => i % 2 === 0 || i === allYears.length - 1)).tickSize(0);
    g.append("g")
        .attr("transform", `translate(0,${innerH + 10})`)
        .call(xAxis)
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll("text").style("fill", "#8e8e93").style("font-size", "10px"));

    const yAxis = d3.axisLeft(yScale).tickFormat(d => d + "%").ticks(6).tickSize(0);
    g.append("g")
        .attr("transform", "translate(-10,0)")
        .call(yAxis)
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll("text").style("fill", "#8e8e93").style("font-size", "10px"));

    // Tooltip
    d3.selectAll(".d3-tooltip.tren-tooltip").remove();
    const tooltip = d3.select("body").append("div")
        .attr("class", "d3-tooltip tren-tooltip");
    trenChartState.tooltip = tooltip;

    // Layer Garis Latar Belakang (Semua garis redup)
    const bgLinesGroup = g.append("g").attr("class", "bg-lines-group");

    // Layer Area Fill di Bawah Garis Terpilih
    const areaGroup = g.append("g").attr("class", "area-highlight-group");
    areaGroup.append("path").attr("class", "tren-area-path").attr("fill", "url(#area-tren-gradient-prov)");

    // Layer Garis Highlight Terpilih
    const highlightGroup = g.append("g").attr("class", "highlight-line-group");
    highlightGroup.append("path")
        .attr("class", "tren-highlight-path")
        .attr("fill", "none")
        .attr("stroke", "var(--aksen)")
        .attr("stroke-width", 3.2)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round");

    highlightGroup.append("text")
        .attr("class", "tren-line-label")
        .attr("dy", "-0.5em")
        .attr("text-anchor", "start")
        .style("fill", "var(--aksen)")
        .style("font-size", "10px")
        .style("font-weight", "700")
        .style("pointer-events", "none");

    // Layer Dots & Anotasi
    g.append("g").attr("class", "highlight-dots-group");
    g.append("g").attr("class", "tren-annotations");

    // Line generator
    const lineGen = d3.line()
        .x(d => xScale(d.tahun))
        .y(d => yScale(d.p0))
        .curve(d3.curveMonotoneX);

    // Plot SEMUA garis latar belakang (dapat diklik langsung)
    bgLinesGroup.selectAll("path.bg-line")
        .data(allLines, d => d.provinsi)
        .enter()
        .append("path")
        .attr("class", "bg-line")
        .attr("data-provinsi", d => d.provinsi)
        .attr("fill", "none")
        .attr("stroke", d => d.provinsi === "Indonesia" ? "rgba(46, 196, 182, 0.4)" : "rgba(255, 255, 255, 0.12)")
        .attr("stroke-width", d => d.provinsi === "Indonesia" ? 2 : 1.2)
        .attr("d", d => lineGen(d.data))
        .style("cursor", "pointer")
        .style("transition", "stroke 0.2s ease, stroke-width 0.2s ease")
        .on("mouseover", function(event, d) {
            if (d.provinsi !== trenChartState.currentProvinsi) {
                d3.select(this)
                    .attr("stroke", "rgba(255, 255, 255, 0.6)")
                    .attr("stroke-width", 2.2);
            }
        })
        .on("mouseleave", function(event, d) {
            if (d.provinsi !== trenChartState.currentProvinsi) {
                d3.select(this)
                    .attr("stroke", d.provinsi === "Indonesia" ? "rgba(46, 196, 182, 0.4)" : "rgba(255, 255, 255, 0.12)")
                    .attr("stroke-width", d.provinsi === "Indonesia" ? 2 : 1.2);
            }
        })
        .on("click", function(event, d) {
            // Klik langsung garis untuk highlight & sync dropdown
            const dropdown = document.getElementById("dropdown-tren-provinsi");
            if (dropdown) dropdown.value = d.provinsi;
            updateTrenChart(d.provinsi);
        });

    trenChartState.allLines = allLines;

    // Draw default highlight (Indonesia)
    updateTrenChart("Indonesia", false);
}

function updateTrenChart(selectedProvinsi) {
    if (!trenChartState.g) return;

    trenChartState.currentProvinsi = selectedProvinsi;

    const { g, xScale, yScale, innerH, allLines, tooltip } = trenChartState;
    if (!allLines || !allLines.length) return;

    const targetObj = allLines.find(l => l.provinsi === selectedProvinsi) || allLines[0];
    const data = targetObj.data;

    const lineGen = d3.line()
        .x(d => xScale(d.tahun))
        .y(d => yScale(d.p0))
        .curve(d3.curveMonotoneX);

    const areaGen = d3.area()
        .x(d => xScale(d.tahun))
        .y0(innerH)
        .y1(d => yScale(d.p0))
        .curve(d3.curveMonotoneX);

    const t = d3.transition().duration(600).ease(d3.easeCubicInOut);

    // Redupkan/Sembunyikan garis latar belakang yang sedang di-highlight
    g.selectAll("path.bg-line")
        .transition(t)
        .style("opacity", d => d.provinsi === selectedProvinsi ? 0 : 0.6);

    // Update Area Path
    g.select(".tren-area-path")
        .datum(data)
        .transition(t)
        .attr("d", areaGen);

    // Update Highlighted Path
    g.select(".tren-highlight-path")
        .datum(data)
        .transition(t)
        .attr("d", lineGen);

    // Update Label Ujung Garis
    const lastPt = data[data.length - 1];
    if (lastPt) {
        g.select(".tren-line-label")
            .transition(t)
            .attr("x", xScale(lastPt.tahun) + 6)
            .attr("y", yScale(lastPt.p0))
            .text(`${lastPt.p0.toFixed(1)}%`);
    }

    // Update Interactive Dots untuk Garis Terpilih
    const dotsGroup = g.select(".highlight-dots-group");
    dotsGroup.selectAll("*").remove();

    const dots = dotsGroup.selectAll("circle.node-tren")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "node-tren")
        .attr("cx", d => xScale(d.tahun))
        .attr("cy", d => yScale(d.p0))
        .attr("r", 4)
        .attr("fill", "var(--aksen)")
        .attr("stroke", "#141414")
        .attr("stroke-width", 1.5)
        .style("cursor", "pointer");

    dots
        .on("mouseover", function(event, d) {
            d3.select(this)
                .transition().duration(150)
                .attr("r", 7)
                .attr("fill", "#ffffff")
                .attr("stroke", "var(--aksen)")
                .attr("stroke-width", 2);

            const jmTxt = d.jumlah_ribu && d.jumlah_ribu > 0
                ? `${(d.jumlah_ribu / 1000).toFixed(2)} juta jiwa (${d.jumlah_ribu.toLocaleString('id-ID')} ribu)`
                : (d.jumlah_juta ? `${d.jumlah_juta} juta jiwa` : '—');

            tooltip.html(`
                <div style="font-weight:700;color:var(--aksen);font-size:12px">${selectedProvinsi} — Tahun ${d.tahun}</div>
                <div style="font-size:11px;color:#fff;margin-top:3px">
                    Persentase Miskin (P0): <b>${d.p0.toFixed(2)}%</b>
                </div>
                <div style="font-size:11px;color:#d1d1d6">
                    Beban Absolut: <b>${jmTxt}</b>
                </div>
            `)
            .style("opacity", 1)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 38) + "px");
        })
        .on("mousemove", event => {
            tooltip
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 38) + "px");
        })
        .on("mouseleave", function() {
            d3.select(this)
                .transition().duration(150)
                .attr("r", 4)
                .attr("fill", "var(--aksen)")
                .attr("stroke", "#141414")
                .attr("stroke-width", 1.5);
            tooltip.style("opacity", 0).style("left", "-1000px");
        });

    // Anotasi Krisis (khusus Indonesia)
    const annotationsGroup = g.select(".tren-annotations");
    annotationsGroup.selectAll("*").remove();

    const krisisNote = document.getElementById("tren-krisis-note");

    if (selectedProvinsi === "Indonesia") {
        const anotasiList = KRISIS_ANOTASI["Indonesia"] || [];

        anotasiList.forEach(kr => {
            const matchedPoint = data.find(d => d.tahun === kr.tahun);
            if (!matchedPoint) return;

            const cx = xScale(kr.tahun);
            const cy = yScale(matchedPoint.p0);

            annotationsGroup.append("circle")
                .attr("cx", cx).attr("cy", cy)
                .attr("r", 7)
                .attr("fill", "#e63946")
                .attr("stroke", "#ffffff")
                .attr("stroke-width", 2)
                .style("cursor", "pointer")
                .on("mouseover", function(event) {
                    tooltip.html(`
                        <div style="font-weight:700;color:#e63946;font-size:12px">⚠️ ${kr.label}</div>
                        <div style="font-size:11px;color:#fff;margin-top:3px">Tahun ${kr.tahun}: <b>${matchedPoint.p0.toFixed(2)}%</b></div>
                    `)
                    .style("opacity", 1)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 38) + "px");
                })
                .on("mousemove", event => {
                    tooltip.style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 38) + "px");
                })
                .on("mouseleave", () => {
                    tooltip.style("opacity", 0).style("left", "-1000px");
                });

            annotationsGroup.append("line")
                .attr("x1", cx).attr("y1", cy - 10)
                .attr("x2", cx).attr("y2", cy - 36)
                .style("stroke", "#e63946")
                .style("stroke-width", 1.2)
                .style("stroke-dasharray", "2,2");

            annotationsGroup.append("text")
                .attr("x", cx).attr("y", cy - 42)
                .attr("text-anchor", "middle")
                .style("fill", "#e63946")
                .style("font-size", "10px")
                .style("font-weight", "700")
                .text(`${kr.tahun}: ${kr.label}`);

            annotationsGroup.append("text")
                .attr("x", cx).attr("y", cy - 30)
                .attr("text-anchor", "middle")
                .style("fill", "#e63946")
                .style("font-size", "10px")
                .text(`(${matchedPoint.p0.toFixed(1)}%)`);
        });

        if (krisisNote) krisisNote.style.display = "";
    } else {
        if (krisisNote) krisisNote.style.display = "none";
    }

    // Update Header Title
    const titleEl = document.getElementById("tren-chart-title");
    if (titleEl) {
        titleEl.textContent = selectedProvinsi === "Indonesia"
            ? "Tren Historis Persentase Penduduk Miskin Indonesia (1996–2025)"
            : `Tren Historis Kemiskinan: ${selectedProvinsi} (vs Semua Provinsi & Nasional)`;
    }
}
