// js/scene3.js
// Bagian 3: Anatomi Pengeluaran & Hierarki Garis Kemiskinan (Stacked Treemap & Collapsible Tree)
// ──────────────────────────────────────────────────────────────────────────────
// Data: komoditas_kemiskinan.json (/data/olahan/)
// Visualisasi:
// 1. Treemap Proporsional (Drill-down dengan pembagian Makanan vs Bukan Makanan) di #chart-scene3-treemap
// 2. Collapsible Node-Link Tree (Pohon bercabang interaktif) di #chart-scene3-tree

let scene3State = {
  treemapWilayah: "Perkotaan",
  treeWilayah: "Perkotaan",
  data: null,
};

// Helper pengambilan data komoditas (dengan fallback fetch async)
async function getKomoditasData() {
  if (scene3State.data && scene3State.data.length) return scene3State.data;
  if (appData.komoditas && appData.komoditas.length) {
    scene3State.data = appData.komoditas;
    return scene3State.data;
  }
  try {
    const cacheBuster = "?v=" + new Date().getTime();
    const res = await fetch(
      "data/olahan/komoditas_kemiskinan.json" + cacheBuster,
    );
    const json = await res.json();
    scene3State.data = json;
    appData.komoditas = json;
    return json;
  } catch (err) {
    console.error("Gagal memuat data komoditas_kemiskinan.json:", err);
    return [];
  }
}

async function renderScene3() {
  await renderTreemapView("#chart-scene3-treemap");
  await renderCollapsibleTreeView("#chart-scene3-tree");
}

function setTreemapWilayah(w) {
  scene3State.treemapWilayah = w;
  d3.selectAll("#treemap-wilayah-group .btn-sub-toggle").classed(
    "active",
    false,
  );
  d3.selectAll("#treemap-wilayah-group .btn-sub-toggle")
    .filter(function () {
      return d3.select(this).text() === w;
    })
    .classed("active", true);
  renderTreemapView();
}

function setTreeWilayah(w) {
  scene3State.treeWilayah = w;
  d3.selectAll("#tree-wilayah-group .btn-sub-toggle").classed("active", false);
  d3.selectAll("#tree-wilayah-group .btn-sub-toggle")
    .filter(function () {
      return d3.select(this).text() === w;
    })
    .classed("active", true);
  renderCollapsibleTreeView();
}

// ── Helper Bangun Data Hierarki Komoditas ─────────────────────────────────
function buildKomoditasHierarchy(data, wilayah) {
  if (!data || !data.length) return { name: "Garis Kemiskinan", children: [] };
  const filtered = data.filter((d) => d.wilayah === wilayah);
  const grouped = d3.group(filtered, (d) => d.kelompok);

  const children = [];
  for (const [kelompok, items] of grouped) {
    const total = d3.sum(items, (d) => d.kontribusi_persen);
    children.push({
      name: kelompok,
      totalPct: +total.toFixed(2),
      children: items
        .sort((a, b) => b.kontribusi_persen - a.kontribusi_persen)
        .map((d, i) => ({
          name: d.komoditas,
          value: d.kontribusi_persen,
          kelompok: kelompok,
          ci: i,
        })),
    });
  }

  return {
    name: "Garis Kemiskinan",
    children: children.sort((a, b) => b.totalPct - a.totalPct),
  };
}

// ══════════════════════════════════════════════════════════════════════════
//  1. TREEMAP VIEW (Proporsi Luas Blok Makanan & Non-Makanan)
// ══════════════════════════════════════════════════════════════════════════
async function renderTreemapView(containerId = "#chart-scene3-treemap") {
  const container = d3.select(containerId);
  if (container.empty()) return;

  const data = await getKomoditasData();
  if (!data || !data.length) return;

  container.selectAll("*").remove();

  const W = container.node().getBoundingClientRect().width || 900;
  const H = 490;

  const hierData = buildKomoditasHierarchy(data, scene3State.treemapWilayah);
  const root = d3
    .hierarchy(hierData)
    .sum((d) => d.value || 0)
    .sort((a, b) => b.value - a.value);

  // Navigasi Breadcrumb
  const bc = container.append("div").attr("class", "tree-breadcrumb");

  const svg = container
    .append("svg")
    .attr("width", "100%")
    .attr("height", H)
    .attr("viewBox", `0 0 ${W} ${H}`)
    .style("display", "block")
    .style("background", "transparent");

  const makananShades = [
    "#A85A00",
    "#B86400",
    "#C86E00",
    "#D87800",
    "#E48200",
    "#B05E00",
    "#C26A00",
    "#D47400",
    "#E07E00",
    "#EC8800",
  ];
  const bukanMakananShades = [
    "#004C99",
    "#0A56A6",
    "#1561B3",
    "#206CBF",
    "#2F78C8",
    "#0057B3",
    "#1262BD",
    "#256FC6",
    "#3A7ECF",
    "#4D8CD8",
  ];

  function getColor(kelompok, idx) {
    const pal = kelompok === "Makanan" ? makananShades : bukanMakananShades;
    return pal[idx % pal.length];
  }

  function draw(kelompokNode) {
    svg.selectAll("*").remove();

    const isTop = !kelompokNode;

    if (isTop) {
      bc.html(
        `<span class="bc-current">Semua Kelompok Komoditas</span> <span style="font-size:12px;color:#888;">(Klik kotak untuk drill-down)</span>`,
      );
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
      d3
        .treemap()
        .size([W, H])
        .paddingOuter(4)
        .paddingInner(2)
        .paddingTop(26)
        .round(true)(root);

      if (root.children) {
        root.children.forEach((kNode) => {
          const kw = kNode.x1 - kNode.x0;
          const kh = kNode.y1 - kNode.y0;
          const accent = kNode.data.name === "Makanan" ? "#FF9A00" : "#599CDE";

          svg
            .append("rect")
            .attr("x", kNode.x0)
            .attr("y", kNode.y0)
            .attr("width", kw)
            .attr("height", kh)
            .attr("rx", 4)
            .attr("fill", "rgba(255,255,255,0.02)")
            .attr("stroke", accent)
            .attr("stroke-opacity", 0.4)
            .attr("stroke-width", 1.2)
            .style("cursor", "pointer")
            .on("click", () => draw(kNode));

          svg
            .append("text")
            .attr("x", kNode.x0 + 8)
            .attr("y", kNode.y0 + 17)
            .style("fill", accent)
            .style("font-size", "12px")
            .style("font-weight", "700")
            .text(`${kNode.data.name} — ${kNode.data.totalPct}%`);

          kNode.leaves().forEach((leaf) => {
            renderTreemapTile(svg, leaf, kNode.data.name, getColor, () =>
              draw(kNode),
            );
          });
        });
      }
    } else {
      const localHier = d3
        .hierarchy({
          name: kelompokNode.data.name,
          children: kelompokNode.data.children,
        })
        .sum((d) => d.value || 0)
        .sort((a, b) => b.value - a.value);

      d3.treemap().size([W, H]).paddingOuter(6).paddingInner(3).round(true)(
        localHier,
      );

      localHier.leaves().forEach((leaf) => {
        renderTreemapTile(svg, leaf, kelompokNode.data.name, getColor, null);
      });
    }
  }

  draw(null);
}

function renderTreemapTile(svg, leaf, kelompok, getColor, clickCallback) {
  const lx = leaf.x0,
    ly = leaf.y0;
  const lw = leaf.x1 - leaf.x0,
    lh = leaf.y1 - leaf.y0;
  if (lw < 2 || lh < 2) return;

  const clr = getColor(kelompok, leaf.data.ci || 0);
  const tile = svg
    .append("g")
    .style("cursor", clickCallback ? "pointer" : "default");

  const rect = tile
    .append("rect")
    .attr("x", lx)
    .attr("y", ly)
    .attr("width", lw)
    .attr("height", lh)
    .attr("rx", 2)
    .attr("fill", clr)
    .attr("fill-opacity", 0.8)
    .attr("stroke", "#262626")
    .attr("stroke-width", 0.6);

  if (lw > 34 && lh > 18) {
    tile
      .append("text")
      .attr("x", lx + 4)
      .attr("y", ly + 14)
      .style("fill", "#F2F2F2")
      .style("font-size", lw > 80 ? "11px" : "9px")
      .style("font-weight", "600")
      .style("pointer-events", "none")
      .text(
        leaf.data.name.length > lw / 7
          ? leaf.data.name.slice(0, Math.floor(lw / 7)) + "…"
          : leaf.data.name,
      );
  }

  if (lw > 34 && lh > 32) {
    tile
      .append("text")
      .attr("x", lx + 4)
      .attr("y", ly + 28)
      .style("fill", "rgba(255,255,255,0.65)")
      .style("font-size", "9px")
      .style("pointer-events", "none")
      .text(`${leaf.data.value}%`);
  }

  d3.selectAll(".d3-tooltip.scene3-tooltip").remove();
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "d3-tooltip scene3-tooltip");

  tile
    .on("mouseover", function (event) {
      rect
        .attr("fill-opacity", 1)
        .attr("stroke", "#F2F2F2")
        .attr("stroke-width", 1.2);
      tooltip
        .html(
          `
            <div style="font-weight:700;color:${clr};font-size:12px">${leaf.data.name}</div>
            <div style="font-size:11px;color:#aaa">Kelompok: ${kelompok}</div>
            <div style="font-size:11px;color:#F2F2F2">Kontribusi Garis Kemiskinan: <b>${leaf.data.value}%</b></div>
        `,
        )
        .style("opacity", 1)
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY - 30 + "px");
    })
    .on("mousemove", (event) => {
      tooltip
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY - 30 + "px");
    })
    .on("mouseleave", function () {
      rect
        .attr("fill-opacity", 0.8)
        .attr("stroke", "#262626")
        .attr("stroke-width", 0.6);
      tooltip.style("opacity", 0).style("left", "-1000px");
    });

  if (clickCallback) {
    tile.on("click", clickCallback);
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  2. COLLAPSIBLE NODE-LINK TREE VIEW (Pohon Hierarki Interaktif)
// ══════════════════════════════════════════════════════════════════════════
async function renderCollapsibleTreeView(containerId = "#chart-scene3-tree") {
  const container = d3.select(containerId);
  if (container.empty()) return;

  const data = await getKomoditasData();
  if (!data || !data.length) return;

  container.selectAll("*").remove();

  // Lebar rancangan minimum 760: di HP label tetap muat, lalu gambar
  // diperkecil atau digeser oleh mobile-fit.js
  const W = Math.max(
    container.node().getBoundingClientRect().width || 900,
    760,
  );
  const H = 540;
  // left 170: ruang untuk label akar "Garis Kemiskinan" (rata kanan, di kiri titik)
  // right 190: ruang untuk label komoditas di daun pohon (rata kiri, di kanan titik)
  const margin = { top: 20, right: 190, bottom: 20, left: 170 };

  const hierData = buildKomoditasHierarchy(data, scene3State.treeWilayah);

  const svg = container
    .append("svg")
    .attr("width", "100%")
    .attr("height", H)
    .attr("viewBox", `0 0 ${W} ${H}`)
    .style("display", "block")
    .style("background", "transparent");

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const innerW = W - margin.left - margin.right;
  const innerH = H - margin.top - margin.bottom;

  const treeLayout = d3.tree().size([innerH, innerW]);

  let i = 0;
  const root = d3.hierarchy(hierData, (d) => d.children);
  root.x0 = innerH / 2;
  root.y0 = 0;

  // Default: biarkan cabang Makanan terbuka, collapse Bukan Makanan
  if (root.children) {
    root.children.forEach((child, idx) => {
      if (idx === 1 && child.children) {
        child._children = child.children;
        child.children = null;
      }
    });
  }

  d3.selectAll(".d3-tooltip.tree-tooltip").remove();
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "d3-tooltip tree-tooltip");

  function updateTree(source) {
    const treeData = treeLayout(root);
    const nodes = treeData.descendants();
    const links = treeData.links();

    nodes.forEach((d) => {
      d.y = d.depth * (innerW / 2.3);
    });

    const node = g
      .selectAll("g.tree-node")
      .data(nodes, (d) => d.id || (d.id = ++i));

    const nodeEnter = node
      .enter()
      .append("g")
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

    nodeEnter
      .append("circle")
      .attr("r", 1e-6)
      .attr("fill", (d) =>
        d._children ? "var(--aksen)" : d.depth === 0 ? "#F2F2F2" : "#333333",
      )
      .attr("stroke", (d) =>
        d.depth === 1
          ? d.data.name === "Makanan"
            ? "#FF9A00"
            : "#599CDE"
          : "var(--aksen)",
      )
      .attr("stroke-width", 1.8);

    nodeEnter
      .append("text")
      .attr("dy", "0.32em")
      .attr("x", (d) => (d.children || d._children ? -12 : 12))
      .attr("text-anchor", (d) => (d.children || d._children ? "end" : "start"))
      .text((d) => {
        const valText = d.data.value
          ? ` (${d.data.value}%)`
          : d.data.totalPct
            ? ` (${d.data.totalPct}%)`
            : "";
        return d.data.name + valText;
      })
      .style("fill", (d) =>
        d.depth === 0 ? "#F2F2F2" : d.depth === 1 ? "#FF9A00" : "#F2F2F2",
      )
      .style("font-size", (d) => (d.depth <= 1 ? "12px" : "11px"))
      .style("font-weight", (d) => (d.depth <= 1 ? "700" : "400"))
      .style("fill-opacity", 1e-6);

    nodeEnter
      .on("mouseover", function (event, d) {
        if (d.data.value) {
          tooltip
            .html(
              `
                        <div style="font-weight:700;color:var(--aksen);font-size:12px">${d.data.name}</div>
                        <div style="font-size:11px;color:#aaa">Kategori: ${d.parent ? d.parent.data.name : "-"}</div>
                        <div style="font-size:11px;color:#F2F2F2">Kontribusi: <b>${d.data.value}%</b></div>
                    `,
            )
            .style("opacity", 1)
            .style("left", event.pageX + 15 + "px")
            .style("top", event.pageY - 28 + "px");
        }
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", event.pageX + 15 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseleave", () => {
        tooltip.style("opacity", 0).style("left", "-1000px");
      });

    const nodeUpdate = nodeEnter
      .merge(node)
      .transition()
      .duration(600)
      .attr("transform", (d) => `translate(${d.y},${d.x})`);

    nodeUpdate
      .select("circle")
      .attr("r", (d) => (d.depth === 0 ? 7 : d.depth === 1 ? 6 : 4))
      .attr("fill", (d) =>
        d._children ? "var(--aksen)" : d.depth === 0 ? "#F2F2F2" : "#333333",
      );

    nodeUpdate.select("text").style("fill-opacity", 1);

    const nodeExit = node
      .exit()
      .transition()
      .duration(500)
      .attr("transform", () => `translate(${source.y},${source.x})`)
      .remove();

    nodeExit.select("circle").attr("r", 1e-6);
    nodeExit.select("text").style("fill-opacity", 1e-6);

    const link = g.selectAll("path.tree-link").data(links, (d) => d.target.id);

    const linkEnter = link
      .enter()
      .insert("path", "g")
      .attr("class", "tree-link")
      .attr("d", () => {
        const o = { x: source.x0, y: source.y0 };
        return diagonalLink({ source: o, target: o });
      })
      .attr("fill", "none")
      .attr("stroke", "rgba(255, 255, 255, 0.18)")
      .attr("stroke-width", 1.2);

    linkEnter
      .merge(link)
      .transition()
      .duration(600)
      .attr("d", diagonalLink)
      .attr("stroke", (d) =>
        d.target.data.kelompok === "Makanan"
          ? "rgba(255, 154, 0, 0.40)"
          : "rgba(89, 156, 222, 0.40)",
      );

    link
      .exit()
      .transition()
      .duration(500)
      .attr("d", () => {
        const o = { x: source.x, y: source.y };
        return diagonalLink({ source: o, target: o });
      })
      .remove();

    nodes.forEach((d) => {
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
