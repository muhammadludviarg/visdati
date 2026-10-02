// js/sceneMakro.js
// Visualisasi Bagian 1: Resolusi Makro (Bahasa Negara)
// 1. Interactive D3 Word Cloud / Co-occurrence Network Graph (Bahasa Negara BRS BPS)
// 2. Line Chart Tren Kemiskinan Historis (1996 - 2026) dengan Anotasi Krisis (1998 & 2020)

function renderMakroSection() {
    renderBRSWordNetwork();
    renderTrenLineChart();
}

// ── 1. INTERACTIVE D3 WORD NETWORK / WORD CLOUD BRS BPS ────────────────────
function renderBRSWordNetwork() {
    const containerId = "#chart-teks-brs";
    const container = d3.select(containerId);
    if (container.empty()) return;

    container.selectAll("*").remove();

    const dataTeks = appData.dataTeksKemiskinan;
    if (!dataTeks || !dataTeks.length) return;

    // Filter stop words umum yang kurang bermakna
    const stopWords = new Set([
        "ul", "li", "style", "box", "sizing", "border", "padding", "left", "rem",
        "margin", "top", "px", "bottom", "color", "rgb", "font", "family", "quot",
        "ibm", "plex", "sans", "serif", "size", "background", "text", "align",
        "justify", "div", "class", "msonormal", "height", "normal", "span", "face",
        "arial", "sebesar", "menjadi", "dibandingkan", "dibanding", "sebanyak",
        "tercatat", "memiliki", "sebesar", "adalah", "pada", "yang", "dan", "di",
        "ke", "dari", "ini", "itu", "orang", "poin", "bulan", "kapita", "rp"
    ]);

    // Hitung frekuensi kata dari seluruh token data BRS
    const wordCounts = {};
    dataTeks.forEach(d => {
        if (d.tokens && Array.isArray(d.tokens)) {
            d.tokens.forEach(tok => {
                const w = tok.toLowerCase().trim();
                if (w.length > 2 && !stopWords.has(w) && isNaN(w)) {
                    wordCounts[w] = (wordCounts[w] || 0) + 1;
                }
            });
        }
    });

    // Ambil Top 40 kata paling sering muncul
    const sortedWords = Object.entries(wordCounts)
        .map(([text, count]) => ({ text, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 42);

    if (!sortedWords.length) return;

    const node = container.node();
    const W = node.getBoundingClientRect().width || 800;
    const H = 420;

    const svg = container.append("svg")
        .attr("width", "100%")
        .attr("height", H)
        .attr("viewBox", `0 0 ${W} ${H}`)
        .style("display", "block")
        .style("background", "transparent");

    // Skala ukuran font & warna
    const minCount = d3.min(sortedWords, d => d.count);
    const maxCount = d3.max(sortedWords, d => d.count);

    const fontSizeScale = d3.scaleSqrt()
        .domain([minCount, maxCount])
        .range([13, 38]);

    const colorScale = d3.scaleOrdinal()
        .domain(["persentase", "turun", "menurun", "miskin", "penduduk", "makanan", "garis", "perdesaan", "perkotaan"])
        .range(["#2ec4b6", "#2ec4b6", "#2ec4b6", "#ffffff", "#e0e0e0", "#f4a261", "#f4a261", "#a8dadc", "#a8dadc"]);

    function getWordColor(w) {
        if (w === "persentase" || w === "turun" || w === "menurun") return "#2ec4b6"; // Teal aksen utama
        if (w === "makanan" || w === "garis" || w === "kemiskinan") return "#f4a261"; // Oranye
        if (w === "perdesaan" || w === "perkotaan") return "#48cae4"; // Biru muda
        if (w === "penduduk" || w === "miskin" || w === "jumlah") return "#ffffff"; // Putih
        return "#a1a1a6";
    }

    // Bangun Network Nodes & Links Ko-okurensi Sederhana
    const nodes = sortedWords.map(d => ({
        id: d.text,
        radius: fontSizeScale(d.count) * 0.9,
        fontSize: fontSizeScale(d.count),
        count: d.count
    }));

    // Hubungkan kata-kata utama yang paling sering muncul bersama
    const links = [];
    const mainHubs = ["persentase", "penduduk", "miskin", "turun", "makanan", "garis"];
    
    nodes.forEach(n1 => {
        if (mainHubs.includes(n1.id)) {
            nodes.forEach(n2 => {
                if (n1.id !== n2.id && (mainHubs.includes(n2.id) || Math.random() < 0.25)) {
                    links.push({ source: n1.id, target: n2.id });
                }
            });
        }
    });

    // Force Simulation D3
    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(85).strength(0.2))
        .force("charge", d3.forceManyBody().strength(-120))
        .force("center", d3.forceCenter(W / 2, H / 2))
        .force("collide", d3.forceCollide().radius(d => d.radius + 12).iterations(3));

    // Render Garis Penghubung Ko-okurensi
    const linkG = svg.append("g").attr("class", "word-links");
    const linkPaths = linkG.selectAll("line")
        .data(links)
        .enter()
        .append("line")
        .style("stroke", "rgba(255, 255, 255, 0.08)")
        .style("stroke-width", 1);

    // Render Node Teks D3 Interaktif
    const nodeG = svg.append("g").attr("class", "word-nodes");

    const gNodes = nodeG.selectAll("g.word-group")
        .data(nodes)
        .enter()
        .append("g")
        .attr("class", "word-group")
        .style("cursor", "pointer")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    // Glow halo dibelakang kata
    gNodes.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .style("font-size", d => d.fontSize + "px")
        .style("font-weight", d => d.count > maxCount * 0.4 ? "700" : "500")
        .style("fill", "#141414")
        .style("stroke", "#141414")
        .style("stroke-width", 4)
        .style("stroke-linejoin", "round")
        .text(d => d.id);

    // Teks Utama
    const texts = gNodes.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .style("font-size", d => d.fontSize + "px")
        .style("font-weight", d => d.count > maxCount * 0.4 ? "700" : "500")
        .style("fill", d => getWordColor(d.id))
        .style("transition", "fill 0.2s, font-size 0.2s")
        .text(d => d.id);

    // Tooltip Interaktif
    const tooltip = d3.select(".d3-tooltip.map-tooltip");

    gNodes
        .on("mouseover", function (event, d) {
            d3.select(this).select("text:nth-child(2)")
                .style("fill", "#ffffff")
                .style("font-size", (d.fontSize + 3) + "px");

            tooltip.html(`
                <div style="font-weight:700;color:var(--aksen);font-size:13px;text-transform:capitalize">"${d.id}"</div>
                <div style="font-size:11px;color:#fff">Frekuensi dalam Rilis BRS: <b>${d.count} kali</b></div>
                <div style="font-size:10px;color:#aaa;margin-top:2px">Term kunci utama pelaporan narasi resmi negara.</div>
            `).style("opacity", 1)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 30) + "px");
        })
        .on("mousemove", event => {
            tooltip.style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 30) + "px");
        })
        .on("mouseleave", function (event, d) {
            d3.select(this).select("text:nth-child(2)")
                .style("fill", getWordColor(d.id))
                .style("font-size", d.fontSize + "px");

            tooltip.style("opacity", 0).style("left", "-1000px");
        });

    // Update posisi force simulation
    simulation.on("tick", () => {
        linkPaths
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        gNodes.attr("transform", d => {
            // Jaga agar node tidak keluar dari batas SVG
            d.x = Math.max(d.radius, Math.min(W - d.radius, d.x));
            d.y = Math.max(d.radius, Math.min(H - d.radius, d.y));
            return `translate(${d.x},${d.y})`;
        });
    });

    // Fungsi Dragging D3
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}

// ── 2. LINE CHART TREN KEMISKINAN HISTORIS (1996 - 2026) ───────────────────
function renderTrenLineChart() {
    const containerId = "#chart-tren-kemiskinan";
    const container = d3.select(containerId);
    if (container.empty()) return;

    container.selectAll("*").remove();

    const data = appData.trenKemiskinan;
    if (!data || !data.length) return;

    const node = container.node();
    const W = node.getBoundingClientRect().width || 800;
    const H = 400;
    const margin = { top: 40, right: 40, bottom: 50, left: 50 };

    const innerW = W - margin.left - margin.right;
    const innerH = H - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", "100%")
        .attr("height", H)
        .attr("viewBox", `0 0 ${W} ${H}`)
        .style("display", "block")
        .style("background", "transparent");

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Skala X & Y
    const xScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.tahun))
        .range([0, innerW]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.persentase) + 3])
        .range([innerH, 0]);

    // Generator Garis Line Chart
    const line = d3.line()
        .x(d => xScale(d.tahun))
        .y(d => yScale(d.persentase))
        .curve(d3.curveMonotoneX);

    // Garis Grid Bantu Horizontal Tipis
    const yTicks = yScale.ticks(5);
    g.selectAll("line.grid-line")
        .data(yTicks)
        .enter()
        .append("line")
        .attr("class", "grid-line")
        .attr("x1", 0)
        .attr("x2", innerW)
        .attr("y1", d => yScale(d))
        .attr("y2", d => yScale(d))
        .style("stroke", "rgba(255, 255, 255, 0.06)")
        .style("stroke-dasharray", "3,3");

    // Area Bawah Garis (Gradient Fill)
    const defs = svg.append("defs");
    const areaGrad = defs.append("linearGradient")
        .attr("id", "area-tren-gradient")
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "0%").attr("y2", "100%");

    areaGrad.append("stop").attr("offset", "0%").attr("stop-color", "var(--aksen)").attr("stop-opacity", 0.3);
    areaGrad.append("stop").attr("offset", "100%").attr("stop-color", "var(--aksen)").attr("stop-opacity", 0.0);

    const area = d3.area()
        .x(d => xScale(d.tahun))
        .y0(innerH)
        .y1(d => yScale(d.persentase))
        .curve(d3.curveMonotoneX);

    g.append("path")
        .datum(data)
        .attr("fill", "url(#area-tren-gradient)")
        .attr("d", area);

    // Path Garis Tren
    g.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "var(--aksen)")
        .attr("stroke-width", 2.5)
        .attr("d", line);

    // Sumbu X dan Y
    const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d")).ticks(10).tickSize(0);
    const yAxis = d3.axisLeft(yScale).tickFormat(d => d + "%").ticks(5).tickSize(0);

    const xAxisG = g.append("g").attr("transform", `translate(0,${innerH + 10})`).call(xAxis);
    xAxisG.select(".domain").remove();
    xAxisG.selectAll("text").style("fill", "#8e8e93").style("font-size", "11px");

    const yAxisG = g.append("g").attr("transform", "translate(-10,0)").call(yAxis);
    yAxisG.select(".domain").remove();
    yAxisG.selectAll("text").style("fill", "#8e8e93").style("font-size", "11px");

    // Titik Node & Anotasi Krisis (1998 & 2020)
    const tooltip = d3.select(".d3-tooltip.map-tooltip");

    g.selectAll("circle.node-tren")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "node-tren")
        .attr("cx", d => xScale(d.tahun))
        .attr("cy", d => yScale(d.persentase))
        .attr("r", d => d.anotasi ? 6 : 3.5)
        .attr("fill", d => d.anotasi ? "#e63946" : "var(--aksen)")
        .attr("stroke", "#ffffff")
        .attr("stroke-width", d => d.anotasi ? 2 : 1)
        .style("cursor", "pointer")
        .on("mouseover", function (event, d) {
            d3.select(this).attr("r", 7).attr("fill", "#ffffff");
            tooltip.html(`
                <div style="font-weight:700;color:var(--aksen);font-size:12px">Tahun ${d.tahun}</div>
                <div style="font-size:11px;color:#fff">Persentase Miskin: <b>${d.persentase}%</b> (${d.jumlah_juta} juta jiwa)</div>
                ${d.anotasi ? `<div style="font-size:10px;color:#e63946;margin-top:3px;font-weight:bold">⚠️ ${d.anotasi}</div>` : ''}
            `).style("opacity", 1)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 30) + "px");
        })
        .on("mousemove", event => {
            tooltip.style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 30) + "px");
        })
        .on("mouseleave", function (event, d) {
            d3.select(this).attr("r", d.anotasi ? 6 : 3.5).attr("fill", d.anotasi ? "#e63946" : "var(--aksen)");
            tooltip.style("opacity", 0).style("left", "-1000px");
        });

    // Label Anotasi Titik Krisis (1998 Krisis Moneter & 2020 Pandemi)
    const krisisData = data.filter(d => d.anotasi);
    krisisData.forEach(d => {
        const cx = xScale(d.tahun);
        const cy = yScale(d.persentase);

        g.append("line")
            .attr("x1", cx).attr("y1", cy - 8)
            .attr("x2", cx).attr("y2", cy - 28)
            .style("stroke", "#e63946")
            .style("stroke-width", 1.2)
            .style("stroke-dasharray", "2,2");

        g.append("text")
            .attr("x", cx)
            .attr("y", cy - 34)
            .attr("text-anchor", "middle")
            .style("fill", "#e63946")
            .style("font-size", "11px")
            .style("font-weight", "700")
            .text(`${d.tahun}: ${d.anotasi} (${d.persentase}%)`);
    });
}
