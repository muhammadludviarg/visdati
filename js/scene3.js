// js/scene3.js
// Bagian 3: Anatomi Pengeluaran & Hierarki Garis Kemiskinan
// ──────────────────────────────────────────────────────────────────────────────
// Data: komoditas_kemiskinan.json (/data/olahan/)
// Visualisasi:
// 1. Treemap (Drill-down dengan pembagian Makanan vs Bukan Makanan)
// 2. Collapsible Node-Link Tree (Pohon bercabang yang dapat di-expand/collapse)
// 3. Tombol Toggle Elegan (Treemap ↔ Collapsible Tree) & Switcher Perkotaan/Perdesaan

let scene3State = {
    mode: "treemap",       // "treemap" | "tree"
    wilayah: "Perkotaan",  // "Perkotaan" | "Perdesaan"
    data: null,
    treeRoot: null
};

function renderScene3() {
    // Ambil data komoditas
    const raw = appData.komoditas;
    if (!raw || !raw.length) return;
    scene3State.data = raw;

    const containerId = "#chart-scene3";
    const container = d3.select(containerId);
    if (container.empty()) return;

    container.selectAll("*").remove();

    // ── 1. Header Toolbar (Toggle View & Wilayah) ─────────────────────────
    const toolbar = container.append("div").attr("class", "scene3-toolbar");

    // Kelompok Pemilih Wilayah
    const wilayahGroup = toolbar.append("div").attr("class", "toolbar-group");
    wilayahGroup.append("span").attr("class", "toolbar-label").text("Wilayah:");

    ["Perkotaan", "Perdesaan"].forEach(w => {
        wilayahGroup.append("button")
            .attr("class", `btn-sub-toggle ${w === scene3State.wilayah ? 'active' : ''}`)
            .text(w)
            .on("click", function () {
                scene3State.wilayah = w;
                wilayahGroup.selectAll(".btn-sub-toggle").classed("active", false);
                d3.select(this).classed("active", true);
                renderActiveView();
            });
    });

    // Kelompok Pemilih Perspektif Visual (Treemap vs Collapsible Tree)
    const modeGroup = toolbar.append("div").attr("class", "toolbar-group mode-toggle-group");
    modeGroup.append("span").attr("class", "toolbar-label").text("Tampilan:");

    const modes = [
        { key: "treemap", label: "Treemap Proporsional" },
        { key: "tree", label: "Pohon Hierarki (Collapsible Tree)" }
    ];

    modes.forEach(m => {
        modeGroup.append("button")
            .attr("class", `btn-sub-toggle ${m.key === scene3State.mode ? 'active' : ''}`)
            .text(m.label)
            .on("click", function () {
                scene3State.mode = m.key;
                modeGroup.selectAll(".btn-sub-toggle").classed("active", false);
                d3.select(this).classed("active", true);
                renderActiveView();
            });
    });

    // Wadah Visualisasi
    container.append("div").attr("id", "scene3-view-canvas").attr("class", "chart-canvas");

    // Jalankan render awal
    renderActiveView();
}

function renderActiveView() {
    const canvas = d3.select("#scene3-view-canvas");
    canvas.selectAll("*").remove();

    if (scene3State.mode === "treemap") {
        renderTreemapView(canvas);
    } else {
        renderCollapsibleTreeView(canvas);
    }
}

// ── Helper Bangun Data Hierarki Komoditas ─────────────────────────────────
function buildKomoditasHierarchy(wilayah) {
    const filtered = scene3State.data.filter(d => d.wilayah === wilayah);
    const grouped = d3.group(filtered, d => d.kelompok);

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
                    ci: i
                }))
        });
    }

    return {
        name: "Garis Kemiskinan",
        children: children.sort((a, b) => b.totalPct - a.totalPct)
    };
}

// ══════════════════════════════════════════════════════════════════════════
//  1. TREEMAP VIEW (Proporsi Luas Blok Makanan & Non-Makanan)
// ══════════════════════════════════════════════════════════════════════════
function renderTreemapView(canvas) {
    const W = canvas.node().getBoundingClientRect().width || 900;
    const H = 490;

    const hierData = buildKomoditasHierarchy(scene3State.wilayah);
    const root = d3.hierarchy(hierData)
        .sum(d => d.value || 0)
        .sort((a, b) => b.value - a.value);

    // Navigasi Breadcrumb
    const bc = canvas.append("div").attr("class", "tree-breadcrumb");

    const svg = canvas.append("svg")
        .attr("width", "100%")
        .attr("height", H)
        .attr("viewBox", `0 0 ${W} ${H}`)
        .style("display", "block");

    const makananShades = [
        "#1a8a7d", "#1e9e8f", "#22b2a1", "#2ec4b6", "#40cdbf",
        "#55d6c8", "#6adfd1", "#80e8da", "#96efe3", "#aaf5eb"
    ];
    const bukanMakananShades = [
        "#4a5568", "#5a6478", "#6b7280", "#7c839a", "#8b92a8",
        "#6366a0", "#7171b0", "#5b5ea6", "#8686b8", "#9999c4"
    ];

    function getColor(kelompok, idx) {
        const pal = kelompok === "Makanan" ? makananShades : bukanMakananShades;
        return pal[idx % pal.length];
    }

    function draw(kelompokNode) {
        svg.selectAll("*").remove();

        const isTop = !kelompokNode;

        if (isTop) {
            bc.html(`<span class="bc-current">Semua Kelompok Komoditas</span> <span style="font-size:12px;color:#888;">(Klik kotak untuk drill-down)</span>`);
        } else {
            bc.html(`
                <span class="bc-link" id="bc-btn-back">&lt; Kembali ke Semua Kelompok</span>
                <span class="bc-sep">/</span>
                <span class="bc-current">${kelompokNode.data.name}</span>
                <span style="color:#aaa;font-size:12px"> (${kelompokNode.data.totalPct}%)</span>
            `);
            d3.select("#bc-btn-back").on("click", () => draw(null));
        }

        if (isTop) {
            d3.treemap().size([W, H]).paddingOuter(4).paddingInner(2).paddingTop(26).round(true)(root);

            root.children.forEach(kNode => {
                const kw = kNode.x1 - kNode.x0;
                const kh = kNode.y1 - kNode.y0;
                const accent = kNode.data.name === "Makanan" ? "#2ec4b6" : "#7c839a";

                // Background container kelompok
                svg.append("rect")
                    .attr("x", kNode.x0).attr("y", kNode.y0)
                    .attr("width", kw).attr("height", kh)
                    .attr("rx", 4)
                    .attr("fill", "rgba(255,255,255,0.02)")
                    .attr("stroke", accent)
                    .attr("stroke-opacity", 0.4)
                    .attr("stroke-width", 1.2)
                    .style("cursor", "pointer")
                    .on("click", () => draw(kNode));

                svg.append("text")
                    .attr("x", kNode.x0 + 8).attr("y", kNode.y0 + 17)
                    .style("fill", accent).style("font-size", "12px").style("font-weight", "700")
                    .text(`${kNode.data.name} — ${kNode.data.totalPct}%`);

                kNode.leaves().forEach(leaf => {
                    renderTreemapTile(leaf, kNode.data.name, () => draw(kNode));
                });
            });
        } else {
            const localHier = d3.hierarchy({
                name: kelompokNode.data.name,
                children: kelompokNode.data.children
            }).sum(d => d.value || 0).sort((a, b) => b.value - a.value);

            d3.treemap().size([W, H]).paddingOuter(6).paddingInner(3).round(true)(localHier);

            localHier.leaves().forEach(leaf => {
                renderTreemapTile(leaf, kelompokNode.data.name, null);
            });
        }
    }

    function renderTreemapTile(leaf, kelompok, clickCallback) {
        const lx = leaf.x0, ly = leaf.y0;
        const lw = leaf.x1 - leaf.x0, lh = leaf.y1 - leaf.y0;
        if (lw < 2 || lh < 2) return;

        const clr = getColor(kelompok, leaf.data.ci || 0);
        const tile = svg.append("g").style("cursor", clickCallback ? "pointer" : "default");

        const rect = tile.append("rect")
            .attr("x", lx).attr("y", ly)
            .attr("width", lw).attr("height", lh)
            .attr("rx", 2)
            .attr("fill", clr)
            .attr("fill-opacity", 0.8)
            .attr("stroke", "#121212")
            .attr("stroke-width", 0.6);

        if (lw > 34 && lh > 18) {
            tile.append("text")
                .attr("x", lx + 4).attr("y", ly + 14)
                .style("fill", "#ffffff").style("font-size", lw > 80 ? "11px" : "9px")
                .style("font-weight", "600").style("pointer-events", "none")
                .text(leaf.data.name.length > lw / 7 ? leaf.data.name.slice(0, Math.floor(lw / 7)) + "…" : leaf.data.name);
        }

        if (lw > 34 && lh > 32) {
            tile.append("text")
                .attr("x", lx + 4).attr("y", ly + 28)
                .style("fill", "rgba(255,255,255,0.65)").style("font-size", "9px")
                .style("pointer-events", "none")
                .text(`${leaf.data.value}%`);
        }

        const tooltip = d3.select(".d3-tooltip.map-tooltip");
        tile.on("mouseover", function (event) {
            rect.attr("fill-opacity", 1).attr("stroke", "#ffffff").attr("stroke-width", 1.2);
            tooltip.html(`
                <div style="font-weight:700;color:${clr};font-size:12px">${leaf.data.name}</div>
                <div style="font-size:11px;color:#aaa">Kelompok: ${kelompok}</div>
                <div style="font-size:11px;color:#fff">Kontribusi Garis Kemiskinan: <b>${leaf.data.value}%</b></div>
            `).style("opacity", 1)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 30) + "px");
        })
        .on("mousemove", event => {
            tooltip.style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 30) + "px");
        })
        .on("mouseleave", function () {
            rect.attr("fill-opacity", 0.8).attr("stroke", "#121212").attr("stroke-width", 0.6);
            tooltip.style("opacity", 0).style("left", "-1000px");
        });

        if (clickCallback) {
            tile.on("click", clickCallback);
        }
    }

    draw(null);
}

// ══════════════════════════════════════════════════════════════════════════
//  2. COLLAPSIBLE NODE-LINK TREE VIEW (Pohon Hierarki Interaktif)
// ══════════════════════════════════════════════════════════════════════════
function renderCollapsibleTreeView(canvas) {
    const W = canvas.node().getBoundingClientRect().width || 900;
    const H = 540;
    const margin = { top: 20, right: 120, bottom: 20, left: 100 };

    const hierData = buildKomoditasHierarchy(scene3State.wilayah);

    const svg = canvas.append("svg")
        .attr("width", "100%")
        .attr("height", H)
        .attr("viewBox", `0 0 ${W} ${H}`)
        .style("display", "block")
        .style("background", "transparent");

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const innerW = W - margin.left - margin.right;
    const innerH = H - margin.top - margin.bottom;

    const treeLayout = d3.tree().size([innerH, innerW]);

    let i = 0;
    const root = d3.hierarchy(hierData, d => d.children);
    root.x0 = innerH / 2;
    root.y0 = 0;

    // Awalan: biarkan cabang Makanan terbuka, tapi tutup Bukan Makanan jika terlalu panjang
    // Atau biarkan terbuka di level 1 (Makanan & Bukan Makanan)
    function collapse(d) {
        if (d.children) {
            d._children = d.children;
            d._children.forEach(collapse);
            d.children = null;
        }
    }

    // Collapse beberapa item cabang kedua jika diinginkan
    if (root.children) {
        // Biarkan Makanan terbuka, collapse Bukan Makanan sebagai demonstrasi awal
        root.children.forEach((child, idx) => {
            if (idx === 1 && child.children) {
                child._children = child.children;
                child.children = null;
            }
        });
    }

    const tooltip = d3.select(".d3-tooltip.map-tooltip");

    function updateTree(source) {
        const treeData = treeLayout(root);
        const nodes = treeData.descendants();
        const links = treeData.links();

        // Normalisasi kedalaman horizontal (y)
        nodes.forEach(d => { d.y = d.depth * (innerW / 2.3); });

        // 1. UPDATE NODES
        const node = g.selectAll("g.tree-node")
            .data(nodes, d => d.id || (d.id = ++i));

        const nodeEnter = node.enter().append("g")
            .attr("class", "tree-node")
            .attr("transform", () => `translate(${source.y0},${source.x0})`)
            .style("cursor", "pointer")
            .on("click", (event, d) => {
                if (d.children) {
                    d._children = d.children;
                    d.children = null;
                } else if (d._children) {
                    d.children = d._children;
                    d._children = null;
                }
                updateTree(d);
            });

        nodeEnter.append("circle")
            .attr("r", 1e-6)
            .attr("fill", d => d._children ? "var(--aksen)" : (d.depth === 0 ? "#ffffff" : "#242424"))
            .attr("stroke", d => d.depth === 1 ? (d.data.name === "Makanan" ? "#2ec4b6" : "#f4a261") : "var(--aksen)")
            .attr("stroke-width", 1.8);

        nodeEnter.append("text")
            .attr("dy", "0.32em")
            .attr("x", d => d.children || d._children ? -12 : 12)
            .attr("text-anchor", d => d.children || d._children ? "end" : "start")
            .text(d => {
                const valText = d.data.value ? ` (${d.data.value}%)` : (d.data.totalPct ? ` (${d.data.totalPct}%)` : "");
                return d.data.name + valText;
            })
            .style("fill", d => d.depth === 0 ? "#ffffff" : (d.depth === 1 ? "#2ec4b6" : "#d1d1d6"))
            .style("font-size", d => d.depth <= 1 ? "12px" : "11px")
            .style("font-weight", d => d.depth <= 1 ? "700" : "400")
            .style("fill-opacity", 1e-6);

        // Tooltip node tree
        nodeEnter
            .on("mouseover", function (event, d) {
                if (d.data.value) {
                    tooltip.html(`
                        <div style="font-weight:700;color:var(--aksen);font-size:12px">${d.data.name}</div>
                        <div style="font-size:11px;color:#aaa">Kategori: ${d.parent ? d.parent.data.name : "-"}</div>
                        <div style="font-size:11px;color:#fff">Kontribusi: <b>${d.data.value}%</b></div>
                    `).style("opacity", 1)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px");
                }
            })
            .on("mousemove", event => {
                tooltip.style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 28) + "px");
            })
            .on("mouseleave", () => {
                tooltip.style("opacity", 0).style("left", "-1000px");
            });

        // Transisi node enter ke posisi baru
        const nodeUpdate = nodeEnter.merge(node).transition().duration(600)
            .attr("transform", d => `translate(${d.y},${d.x})`);

        nodeUpdate.select("circle")
            .attr("r", d => d.depth === 0 ? 7 : (d.depth === 1 ? 6 : 4))
            .attr("fill", d => d._children ? "var(--aksen)" : (d.depth === 0 ? "#ffffff" : "#242424"));

        nodeUpdate.select("text")
            .style("fill-opacity", 1);

        // Transisi node exit
        const nodeExit = node.exit().transition().duration(500)
            .attr("transform", () => `translate(${source.y},${source.x})`)
            .remove();

        nodeExit.select("circle").attr("r", 1e-6);
        nodeExit.select("text").style("fill-opacity", 1e-6);

        // 2. UPDATE LINKS
        const link = g.selectAll("path.tree-link")
            .data(links, d => d.target.id);

        const linkEnter = link.enter().insert("path", "g")
            .attr("class", "tree-link")
            .attr("d", () => {
                const o = { x: source.x0, y: source.y0 };
                return diagonalLink({ source: o, target: o });
            })
            .attr("fill", "none")
            .attr("stroke", "rgba(255, 255, 255, 0.18)")
            .attr("stroke-width", 1.2);

        linkEnter.merge(link).transition().duration(600)
            .attr("d", diagonalLink)
            .attr("stroke", d => d.target.data.kelompok === "Makanan" ? "rgba(46, 196, 182, 0.35)" : "rgba(244, 162, 97, 0.35)");

        link.exit().transition().duration(500)
            .attr("d", () => {
                const o = { x: source.x, y: source.y };
                return diagonalLink({ source: o, target: o });
            })
            .remove();

        // Simpan posisi sebelumnya untuk transisi mulus
        nodes.forEach(d => {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    function diagonalLink({ source, target }) {
        return `M ${source.y} ${source.x}
                C ${(source.y + target.y) / 2} ${source.x},
                  ${(source.y + target.y) / 2} ${target.x},
                  ${target.y} ${target.x}`;
    }

    updateTree(root);
}
