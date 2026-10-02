// js/scene4.js
// Scene 4: Treemap — Hierarki Komponen Garis Kemiskinan
// ──────────────────────────────────────────────────────────────────────────────
// Data   : komoditas_kemiskinan.json
//          [{wilayah, kelompok, komoditas, kontribusi_persen}, …]
// Hierarki: root → Kelompok (Makanan / Bukan Makanan) → Komoditas
// Fitur  : Drill-down klik, breadcrumb teks polos, pilih wilayah

function renderScene4() {
    const raw = appData.komoditas;
    if (!raw || !raw.length) return;

    const containerId = "#chart-scene4";
    d3.select(containerId).selectAll("*").remove();

    // ── State ────────────────────────────────────────────────────────────
    let currentWilayah = "Perkotaan";

    // ── Container ────────────────────────────────────────────────────────
    const wrapper = d3.select(containerId);

    // Control bar (hanya tombol wilayah)
    const controls = wrapper.append("div")
        .style("display", "flex").style("flex-wrap", "wrap")
        .style("gap", "8px").style("align-items", "center")
        .style("margin-bottom", "10px").style("padding", "0 4px");

    const wilayahGroup = controls.append("div")
        .style("display", "flex").style("gap", "6px").style("align-items", "center");

    wilayahGroup.append("span")
        .style("color", "#b9b9b9").style("font-size", "12px").style("margin-right", "2px")
        .text("Wilayah:");

    // Breadcrumb (teks polos, tanpa emoji)
    const breadcrumb = wrapper.append("div")
        .style("padding", "4px 8px 8px").style("font-size", "13px")
        .style("color", "#b9b9b9").style("min-height", "24px")
        .style("user-select", "none");

    // Chart area
    const chartDiv = wrapper.append("div").attr("id", "scene4-chart-area");

    // Tooltip (dark style — sudah di-style via .d3-tooltip di CSS)
    const tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");

    // ── Palet warna ──────────────────────────────────────────────────────
    // Gradasi teal–slate untuk Makanan, gradasi slate–purple untuk Bukan Makanan
    // Elegan, menyatu dengan latar gelap, tidak mencolok

    const makananShades = [
        "#1a8a7d", "#1e9e8f", "#22b2a1", "#2ec4b6", "#40cdbf",
        "#55d6c8", "#6adfd1", "#80e8da", "#96efe3", "#aaf5eb",
        "#bffaf2", "#249489", "#3ab5a8"
    ];
    const bukanMakananShades = [
        "#4a5568", "#5a6478", "#6b7280", "#7c839a", "#8b92a8",
        "#6366a0", "#7171b0", "#5b5ea6", "#8686b8", "#9999c4",
        "#4e5285", "#5c6099", "#a0a3cc"
    ];

    function tileColor(kelompok, idx) {
        const pal = kelompok === "Makanan" ? makananShades : bukanMakananShades;
        return pal[idx % pal.length];
    }

    // Warna header kelompok
    const kelompokAccent = {
        "Makanan":       "#2ec4b6",
        "Bukan Makanan": "#7c839a"
    };

    // ── Bangun hierarki ──────────────────────────────────────────────────
    function buildHierarchy(wilayah) {
        const filtered = raw.filter(d => d.wilayah === wilayah);
        const grouped  = d3.group(filtered, d => d.kelompok);

        const children = [];
        for (const [kelompok, items] of grouped) {
            const total = d3.sum(items, d => d.kontribusi_persen);
            children.push({
                name: kelompok,
                totalPct: +total.toFixed(2),
                children: items
                    .sort((a, b) => b.kontribusi_persen - a.kontribusi_persen)
                    .map((d, i) => ({
                        name: d.komoditas,
                        value: d.kontribusi_persen,
                        kelompok: kelompok,
                        ci: i  // color index
                    }))
            });
        }

        return {
            name: "Garis Kemiskinan",
            children: children.sort((a, b) => b.totalPct - a.totalPct)
        };
    }

    // ── Helper: potong teks ──────────────────────────────────────────────
    function fitText(text, widthPx, fontSizePx) {
        const charW = fontSizePx * 0.52;
        const max   = Math.floor(widthPx / charW);
        if (max <= 2) return "";
        return text.length <= max ? text : text.slice(0, max - 1) + "\u2026";
    }

    // ══════════════════════════════════════════════════════════════════════
    //  TREEMAP
    // ══════════════════════════════════════════════════════════════════════
    function renderTreemap(wilayah) {
        chartDiv.selectAll("*").remove();

        const W = (chartDiv.node().getBoundingClientRect().width || 900);
        const H = 480;

        const hierData = buildHierarchy(wilayah);

        const root = d3.hierarchy(hierData)
            .sum(d => d.value || 0)
            .sort((a, b) => b.value - a.value);

        // ── State drill-down ─────────────────────────────────────────────
        let drillTarget = null;   // null = top level

        const svg = chartDiv.append("svg")
            .attr("width", W).attr("height", H)
            .style("display", "block")
            .style("font-family", "'Archivo', system-ui, sans-serif");

        // ── Render a level ───────────────────────────────────────────────
        function draw(kelompokNode, animate) {
            svg.selectAll("*").remove();
            drillTarget = kelompokNode;

            const isTop = !kelompokNode;

            // ─ Breadcrumb (teks polos) ───────────────────────────────────
            if (isTop) {
                breadcrumb.html(
                    `<span style="color:#f2f2f2;font-weight:600">Semua Kelompok</span>`
                );
            } else {
                breadcrumb.html(
                    `<span style="cursor:pointer;color:#2ec4b6;font-weight:500" class="bc-back">&lt; Kembali ke Semua Kelompok</span>` +
                    `<span style="color:#555"> / </span>` +
                    `<span style="color:#f2f2f2;font-weight:600">${kelompokNode.data.name}</span>` +
                    `<span style="color:#777;font-size:12px"> (${kelompokNode.data.totalPct}%)</span>`
                );
                breadcrumb.select(".bc-back").on("click", () => draw(null, true));
            }

            // ─ Layout ────────────────────────────────────────────────────
            if (isTop) {
                // Treemap penuh — kelompok sebagai grup, komoditas sebagai tile
                d3.treemap()
                    .size([W, H])
                    .paddingOuter(4)
                    .paddingInner(2)
                    .paddingTop(26)
                    .round(true)(root);

                root.children.forEach(kNode => {
                    const kw = kNode.x1 - kNode.x0;
                    const kh = kNode.y1 - kNode.y0;
                    const accent = kelompokAccent[kNode.data.name] || "#888";

                    // Bingkai kelompok
                    svg.append("rect")
                        .attr("x", kNode.x0).attr("y", kNode.y0)
                        .attr("width", kw).attr("height", kh)
                        .attr("rx", 5)
                        .attr("fill", "rgba(255,255,255,0.02)")
                        .attr("stroke", accent)
                        .attr("stroke-opacity", 0.4)
                        .attr("stroke-width", 1.2)
                        .style("cursor", "pointer")
                        .on("click", () => draw(kNode, true));

                    // Label kelompok
                    svg.append("text")
                        .attr("x", kNode.x0 + 8).attr("y", kNode.y0 + 17)
                        .style("fill", accent).style("font-size", "12px")
                        .style("font-weight", "700").style("pointer-events", "none")
                        .text(`${kNode.data.name}  \u2014  ${kNode.data.totalPct}%`);

                    // Tile komoditas di dalam kelompok
                    kNode.leaves().forEach(leaf => {
                        drawTile(leaf, kNode.data.name, animate);
                    });
                });
            } else {
                // Drill-down: hanya komoditas dari satu kelompok, layout penuh
                const localHier = d3.hierarchy({
                    name: kelompokNode.data.name,
                    children: kelompokNode.data.children
                }).sum(d => d.value || 0).sort((a, b) => b.value - a.value);

                d3.treemap()
                    .size([W, H])
                    .paddingOuter(5)
                    .paddingInner(3)
                    .round(true)(localHier);

                localHier.leaves().forEach(leaf => {
                    drawTile(leaf, kelompokNode.data.name, animate);
                });
            }
        }

        // ── Render satu tile komoditas ────────────────────────────────────
        function drawTile(leaf, kelompok, animate) {
            const lx = leaf.x0, ly = leaf.y0;
            const lw = leaf.x1 - leaf.x0;
            const lh = leaf.y1 - leaf.y0;
            if (lw < 1 || lh < 1) return;

            const clr  = tileColor(kelompok, leaf.data.ci ?? 0);
            const tile = svg.append("g").style("cursor", "pointer");

            // Kotak tile — border gelap tipis
            const rect = tile.append("rect")
                .attr("x", lx).attr("y", ly)
                .attr("width", lw).attr("height", lh)
                .attr("rx", 3)
                .attr("fill", clr)
                .attr("fill-opacity", animate ? 0 : 0.78)
                .attr("stroke", "#111").attr("stroke-width", 0.7);

            if (animate) {
                rect.transition().duration(420).attr("fill-opacity", 0.78);
            }

            // Nama komoditas
            const fzName = lw > 100 ? 12 : lw > 60 ? 10 : 8;
            if (lw > 30 && lh > 18) {
                tile.append("text")
                    .attr("x", lx + 5).attr("y", ly + fzName + 3)
                    .style("fill", "#fff").style("font-size", fzName + "px")
                    .style("font-weight", "600").style("pointer-events", "none")
                    .text(fitText(leaf.data.name, lw - 10, fzName));
            }

            // Persentase
            const fzPct = lw > 80 ? 11 : 9;
            if (lw > 30 && lh > 34) {
                tile.append("text")
                    .attr("x", lx + 5).attr("y", ly + fzName + fzPct + 7)
                    .style("fill", "rgba(255,255,255,0.6)").style("font-size", fzPct + "px")
                    .style("pointer-events", "none")
                    .text(leaf.data.value + "%");
            }

            // Hover
            tile.on("mouseover", function(event) {
                rect.attr("fill-opacity", 1)
                    .attr("stroke", "#e0e0e0").attr("stroke-width", 1.5);
                tooltip.html(
                    `<b style="color:${clr}">${leaf.data.name}</b><br>` +
                    `<span style="color:#aaa">Kelompok:</span> ${kelompok}<br>` +
                    `<span style="color:#aaa">Kontribusi:</span> <b>${leaf.data.value}%</b>`
                ).style("opacity", 1)
                 .style("left", (event.pageX + 14) + "px")
                 .style("top",  (event.pageY - 36) + "px");
            })
            .on("mousemove", event => {
                tooltip.style("left", (event.pageX + 14) + "px")
                       .style("top",  (event.pageY - 36) + "px");
            })
            .on("mouseleave", function() {
                rect.attr("fill-opacity", 0.78)
                    .attr("stroke", "#111").attr("stroke-width", 0.7);
                tooltip.style("opacity", 0).style("left", "-9999px");
            })
            .on("click", function(event) {
                event.stopPropagation();
                // Klik tile saat top-level → drill-down ke kelompok induk
                if (!drillTarget) {
                    const parentK = root.children.find(
                        k => k.data.name === kelompok
                    );
                    if (parentK) draw(parentK, true);
                }
            });
        }

        // ── Initial draw: top level ──────────────────────────────────────
        draw(null, false);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  TOMBOL WILAYAH & RENDER AWAL
    // ══════════════════════════════════════════════════════════════════════
    ["Perkotaan", "Perdesaan"].forEach(w => {
        wilayahGroup.append("button")
            .attr("class", "tombol-tahun" + (w === currentWilayah ? " aktif" : ""))
            .style("font-size", "11px").style("padding", "4px 14px")
            .text(w)
            .on("click", function() {
                currentWilayah = w;
                wilayahGroup.selectAll("button").classed("aktif", false);
                d3.select(this).classed("aktif", true);
                renderTreemap(currentWilayah);
            });
    });

    renderTreemap(currentWilayah);
}
