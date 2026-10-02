// js/scene6.js
// Scene 6: Diagram Sankey — Mobilitas Status Kemiskinan Provinsi (2018 vs 2026)
// ──────────────────────────────────────────────────────────────────────────────
// Data   : provinsi_kemiskinan_deret_waktu.json (/data/olahan/)
// Status : Rendah (<5%), Sedang (5-10%), Tinggi (>10%)
// Visual : Diagram Aliran Sankey D3 (Kiri: 2018 → Kanan: 2026)

async function renderScene6() {
    const containerId = "#chart-scene6";
    d3.select(containerId).selectAll("*").remove();

    // ── 1. Ambil Data ────────────────────────────────────────────────────
    let dataWaktu = appData.provinsiDeretWaktu;
    if (!dataWaktu || !dataWaktu.length) {
        try {
            const cacheBuster = "?v=" + new Date().getTime();
            const res = await fetch('data/olahan/provinsi_kemiskinan_deret_waktu.json' + cacheBuster);
            dataWaktu = await res.json();
            appData.provinsiDeretWaktu = dataWaktu;
        } catch (err) {
            console.error("Gagal memuat data scene 6:", err);
            return;
        }
    }

    // ── 2. Logika Kategorisasi Kemiskinan ──────────────────────────────
    function getStatusCategory(val) {
        if (val == null) return null;
        if (val < 5.0) return "Rendah";
        if (val <= 10.0) return "Sedang";
        return "Tinggi";
    }

    function formatProvName(key) {
        if (!key) return "";
        return key.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
                  .replace("Dki", "DKI")
                  .replace("Di ", "DI ");
    }

    // Filter provinsi yang memiliki data valid 2018 & 2026
    const provList = [];
    dataWaktu.forEach(d => {
        const v2018 = d["2018"];
        const v2026 = d["2026"];
        if (v2018 != null && v2026 != null) {
            provList.push({
                kunci: d.kunci,
                nama: formatProvName(d.kunci),
                v2018: +v2018,
                v2026: +v2026,
                cat2018: getStatusCategory(+v2018),
                cat2026: getStatusCategory(+v2026)
            });
        }
    });

    const categories = ["Tinggi", "Sedang", "Rendah"];
    const catLabels = {
        "Tinggi": "Tinggi (>10%)",
        "Sedang": "Sedang (5–10%)",
        "Rendah": "Rendah (<5%)"
    };

    const catColors = {
        "Tinggi": "#e63946",
        "Sedang": "#f4a261",
        "Rendah": "#2ec4b6"
    };

    // ── 3. Agregasi Node dan Link Sankey ───────────────────────────────
    // Node 2018
    const nodes2018 = categories.map(cat => ({
        cat,
        label: catLabels[cat],
        year: 2018,
        items: provList.filter(p => p.cat2018 === cat)
    }));

    // Node 2026
    const nodes2026 = categories.map(cat => ({
        cat,
        label: catLabels[cat],
        year: 2026,
        items: provList.filter(p => p.cat2026 === cat)
    }));

    // Links (Aliran)
    const links = [];
    categories.forEach(c18 => {
        categories.forEach(c26 => {
            const matches = provList.filter(p => p.cat2018 === c18 && p.cat2026 === c26);
            if (matches.length > 0) {
                links.push({
                    sourceCat: c18,
                    targetCat: c26,
                    count: matches.length,
                    provinces: matches,
                    color: catColors[c18]
                });
            }
        });
    });

    // ── 4. Geometri & Dimensi Sankey ──────────────────────────────────────
    const container = d3.select(containerId).node();
    const fullW = container.getBoundingClientRect().width || 900;
    
    const margin = { top: 60, right: 180, bottom: 40, left: 180 };
    const W = Math.max(fullW - margin.left - margin.right, 300);
    const H = 420;
    const totalW = fullW;
    const totalH = H + margin.top + margin.bottom;

    const nodeWidth = 24;
    const gap = 30; // Jarak antar node vertikal

    const svg = d3.select(containerId).append("svg")
        .attr("width", totalW)
        .attr("height", totalH)
        .style("display", "block")
        .style("margin", "0 auto")
        .style("background", "rgba(0,0,0,0)");

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Tooltip
    const tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");

    // Hitung tinggi total unit yang terpakai
    const totalProvs = provList.length;
    const totalGaps = (categories.length - 1) * gap;
    const availableH = H - totalGaps;
    const unitH = availableH / totalProvs;

    // Posisi Y untuk Node 2018 (Kiri)
    let curY2018 = 0;
    const nodeMap2018 = {};
    nodes2018.forEach(n => {
        const nh = n.items.length * unitH;
        n.x = 0;
        n.y = curY2018;
        n.h = Math.max(nh, 6);
        nodeMap2018[n.cat] = n;
        curY2018 += n.h + gap;
    });

    // Posisi Y untuk Node 2026 (Kanan)
    let curY2026 = 0;
    const nodeMap2026 = {};
    nodes2026.forEach(n => {
        const nh = n.items.length * unitH;
        n.x = W - nodeWidth;
        n.y = curY2026;
        n.h = Math.max(nh, 6);
        nodeMap2026[n.cat] = n;
        curY2026 += n.h + gap;
    });

    // Hitung offset Y untuk tiap Link
    const sourceOffsets = {};
    categories.forEach(c => { sourceOffsets[c] = nodeMap2018[c].y; });

    const targetOffsets = {};
    categories.forEach(c => { targetOffsets[c] = nodeMap2026[c].y; });

    links.forEach(l => {
        const linkH = l.count * unitH;
        l.y0_top = sourceOffsets[l.sourceCat];
        l.y0_bot = l.y0_top + linkH;
        sourceOffsets[l.sourceCat] += linkH;

        l.y1_top = targetOffsets[l.targetCat];
        l.y1_bot = l.y1_top + linkH;
        targetOffsets[l.targetCat] += linkH;

        l.x0 = nodeWidth;
        l.x1 = W - nodeWidth;
    });

    // Path ribbon generator
    function ribbonPath(d) {
        const xi = d3.interpolateNumber(d.x0, d.x1);
        const xcp1 = xi(0.45);
        const xcp2 = xi(0.55);

        return `M ${d.x0},${d.y0_top}
                C ${xcp1},${d.y0_top} ${xcp2},${d.y1_top} ${d.x1},${d.y1_top}
                L ${d.x1},${d.y1_bot}
                C ${xcp2},${d.y1_bot} ${xcp1},${d.y0_bot} ${d.x0},${d.y0_bot}
                Z`;
    }

    // ── 5. Render Header Tahun ───────────────────────────────────────────
    g.append("text")
        .attr("x", 0).attr("y", -20)
        .attr("text-anchor", "start")
        .style("fill", "#e0e0e0").style("font-size", "15px").style("font-weight", "bold")
        .text("Tahun 2018");

    g.append("text")
        .attr("x", W).attr("y", -20)
        .attr("text-anchor", "end")
        .style("fill", "#e0e0e0").style("font-size", "15px").style("font-weight", "bold")
        .text("Tahun 2026");

    // ── 6. Render Links (Pita Aliran Sankey) ─────────────────────────────
    const linkG = g.append("g").attr("class", "links");

    const linkPaths = linkG.selectAll("path.sankey-link")
        .data(links).enter()
        .append("path")
        .attr("class", "sankey-link")
        .attr("d", ribbonPath)
        .attr("fill", d => d.color)
        .attr("fill-opacity", 0.35)
        .style("stroke", "rgba(255,255,255,0.15)")
        .style("stroke-width", 0.5)
        .style("cursor", "pointer")
        .style("transition", "fill-opacity 0.2s, stroke-width 0.2s");

    // Interaksi Hover Link
    linkPaths
        .on("mouseover", function(event, d) {
            linkPaths.style("fill-opacity", l => l === d ? 0.85 : 0.15);
            d3.select(this)
                .style("stroke", "#ffffff")
                .style("stroke-width", 1.5);

            // Daftar provinsi untuk tooltip
            const provItems = d.provinces
                .map(p => `<li style="margin-bottom:2px"><b>${p.nama}</b>: ${p.v2018}% → ${p.v2026}%</li>`)
                .join("");

            const isPindah = d.sourceCat !== d.targetCat;
            const statusText = isPindah 
                ? `Berpindah dari <b style="color:${catColors[d.sourceCat]}">${d.sourceCat}</b> ke <b style="color:${catColors[d.targetCat]}">${d.targetCat}</b>`
                : `Tetap di Kategori <b style="color:${catColors[d.sourceCat]}">${d.sourceCat}</b>`;

            tooltip.html(
                `<div style="font-size:12px;font-weight:bold;color:#fff;margin-bottom:4px">${d.count} Provinsi</div>` +
                `<div style="font-size:11px;color:#ddd;margin-bottom:8px">${statusText}</div>` +
                `<ul style="margin:0;padding-left:14px;font-size:11px;color:#ccc;max-height:160px;overflow-y:auto">` +
                `${provItems}` +
                `</ul>`
            )
            .style("opacity", 1)
            .style("left", (event.pageX + 16) + "px")
            .style("top",  (event.pageY - 40) + "px");
        })
        .on("mousemove", event => {
            tooltip
                .style("left", (event.pageX + 16) + "px")
                .style("top",  (event.pageY - 40) + "px");
        })
        .on("mouseleave", function() {
            linkPaths.style("fill-opacity", 0.35)
                .style("stroke", "rgba(255,255,255,0.15)")
                .style("stroke-width", 0.5);
            tooltip.style("opacity", 0).style("left", "-9999px");
        });

    // ── 7. Render Nodes (Kotak Status Kiri & Kanan) ──────────────────────
    const allNodes = [...nodes2018, ...nodes2026];
    const nodeG = g.append("g").attr("class", "nodes");

    const nodeGroups = nodeG.selectAll("g.node")
        .data(allNodes).enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.x}, ${d.y})`);

    nodeGroups.append("rect")
        .attr("width", nodeWidth)
        .attr("height", d => d.h)
        .attr("rx", 3)
        .attr("fill", d => catColors[d.cat])
        .style("stroke", "#ffffff")
        .style("stroke-width", 1)
        .style("cursor", "pointer");

    // Label Node
    nodeGroups.append("text")
        .attr("x", d => d.year === 2018 ? -10 : nodeWidth + 10)
        .attr("y", d => d.h / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.year === 2018 ? "end" : "start")
        .style("fill", "#ffffff")
        .style("font-size", "12px")
        .style("font-weight", "600")
        .style("pointer-events", "none")
        .text(d => `${d.label} (${d.items.length})`);

    // Interaksi Hover Node
    nodeGroups
        .on("mouseover", function(event, d) {
            linkPaths.style("fill-opacity", l => 
                (d.year === 2018 && l.sourceCat === d.cat) || (d.year === 2026 && l.targetCat === d.cat) ? 0.85 : 0.12
            );

            const provNames = d.items
                .map(p => `<li style="margin-bottom:2px"><b>${p.nama}</b> (${p.year === 2018 ? p.v2018 : p.v2026}%)</li>`)
                .join("");

            tooltip.html(
                `<div style="font-size:12px;font-weight:bold;color:${catColors[d.cat]}">${d.label} (${d.year})</div>` +
                `<div style="font-size:11px;color:#aaa;margin-bottom:6px">Total: ${d.items.length} Provinsi</div>` +
                `<ul style="margin:0;padding-left:14px;font-size:11px;color:#ccc;max-height:160px;overflow-y:auto">` +
                `${provNames}` +
                `</ul>`
            )
            .style("opacity", 1)
            .style("left", (event.pageX + 16) + "px")
            .style("top",  (event.pageY - 40) + "px");
        })
        .on("mousemove", event => {
            tooltip
                .style("left", (event.pageX + 16) + "px")
                .style("top",  (event.pageY - 40) + "px");
        })
        .on("mouseleave", function() {
            linkPaths.style("fill-opacity", 0.35);
            tooltip.style("opacity", 0).style("left", "-9999px");
        });
}
