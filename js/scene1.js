// js/scene1.js
// Bagian 1: Peta Spasial Kemiskinan Indonesia (Koroplet & Bubble)
// ──────────────────────────────────────────────────────────────────────────────
// Fitur:
// 1. Inisialisasi peta interaktif Kabupaten/Kota se-Indonesia.
// 2. Smooth Transition (Morph/Fade) antara mode "koroplet" dan "bubble".
// 3. Click-to-Zoom dengan bounding box otomatis & click neighbor to pan/zoom.
// 4. Tombol / klik latar belakang untuk reset zoom.

let mapState = {
    svg: null,
    gMain: null,
    pathsGroup: null,
    bubblesGroup: null,
    projection: null,
    path: null,
    colorScale: null,
    radiusScale: null,
    tooltip: null,
    legendKoroplet: null,
    legendBubble: null,
    zoomBehavior: null,
    activeFeature: null,
    currentMode: "koroplet",
    width: 0,
    height: 0
};

function initMap() {
    const containerId = "#chart-map";
    const container = d3.select(containerId);
    if (container.empty()) return;

    container.selectAll("*").remove();

    const node = container.node();
    const width = node.getBoundingClientRect().width || 1080;
    const height = Math.max(Math.min(window.innerHeight * 0.72, 620), 480);
    mapState.width = width;
    mapState.height = height;

    const dataGeo = appData.geojson;
    if (!dataGeo || !dataGeo.features) return;

    // 1. Canvas SVG utama
    const svg = container.append("svg")
        .attr("width", "100%")
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("display", "block")
        .style("background", "transparent")
        .style("cursor", "grab");
    mapState.svg = svg;

    // 2. Proyeksi Geo Mercator
    const projection = d3.geoMercator().fitSize([width, height], dataGeo);
    const path = d3.geoPath().projection(projection);
    mapState.projection = projection;
    mapState.path = path;

    // 3. Skala Warna (Persentase P0: 0% - 40%)
    const colorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, 40]);
    mapState.colorScale = colorScale;

    // 4. Skala Radius Bubble (Jumlah Absolut Ribu Jiwa)
    const maxJumlah = d3.max(dataGeo.features, d => d.properties.jumlah_ribu || 0) || 400;
    const radiusScale = d3.scaleSqrt().domain([0, maxJumlah]).range([2.5, 30]);
    mapState.radiusScale = radiusScale;

    // 5. Tooltip
    d3.selectAll(".d3-tooltip.map-tooltip").remove();
    const tooltip = d3.select("body").append("div")
        .attr("class", "d3-tooltip map-tooltip");
    mapState.tooltip = tooltip;

    // 6. Pre-calculate centroid titik kabupaten untuk bubble & zoom
    dataGeo.features.forEach(f => {
        const centroid = path.centroid(f);
        f.properties._cx = isNaN(centroid[0]) ? 0 : centroid[0];
        f.properties._cy = isNaN(centroid[1]) ? 0 : centroid[1];
    });

    // 7. Zoom Behavior
    const gMain = svg.append("g").attr("class", "map-zoom-group");
    mapState.gMain = gMain;

    const zoom = d3.zoom()
        .scaleExtent([1, 14])
        .on("zoom", (event) => {
            gMain.attr("transform", event.transform);
        });
    mapState.zoomBehavior = zoom;
    svg.call(zoom);

    // Background rect penangkap klik reset zoom
    svg.insert("rect", ":first-child")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "transparent")
        .on("click", () => resetMapZoom());

    // Layer grouping
    const pathsGroup = gMain.append("g").attr("class", "layer-polygons");
    const bubblesGroup = gMain.append("g").attr("class", "layer-bubbles");
    mapState.pathsGroup = pathsGroup;
    mapState.bubblesGroup = bubblesGroup;

    // 8. Render Poligon Kabupaten / Kota
    pathsGroup.selectAll("path.kabupaten-path")
        .data(dataGeo.features)
        .enter()
        .append("path")
        .attr("class", "kabupaten-path")
        .attr("d", path)
        .attr("fill", d => {
            const val = d.properties.p0;
            return val != null ? colorScale(val) : "#282828";
        })
        .attr("fill-opacity", 0.9)
        .style("stroke", "rgba(255, 255, 255, 0.16)")
        .style("stroke-width", 0.4)
        .style("cursor", "pointer")
        .on("mouseover", function (event, d) {
            d3.select(this)
                .style("stroke", "#ffffff")
                .style("stroke-width", 1.4);
            showMapTooltip(event, d.properties);
        })
        .on("mousemove", moveMapTooltip)
        .on("mouseleave", function () {
            const isSelected = mapState.activeFeature === this;
            d3.select(this)
                .style("stroke", isSelected ? "#2ec4b6" : "rgba(255, 255, 255, 0.16)")
                .style("stroke-width", isSelected ? 1.8 : 0.4);
            hideMapTooltip();
        })
        .on("click", function (event, d) {
            event.stopPropagation();
            zoomToFeature(this, d);
        });

    // 9. Render Bubble (Lingkaran Proporsional)
    bubblesGroup.selectAll("circle.kabupaten-bubble")
        .data(dataGeo.features)
        .enter()
        .append("circle")
        .attr("class", "kabupaten-bubble")
        .attr("cx", d => d.properties._cx)
        .attr("cy", d => d.properties._cy)
        .attr("r", 0)
        .attr("fill", d => {
            const val = d.properties.p0;
            return val != null ? colorScale(val) : "#e63946";
        })
        .attr("fill-opacity", 0)
        .style("stroke", "#ffffff")
        .style("stroke-width", 0.8)
        .style("pointer-events", "none")
        .on("mouseover", function (event, d) {
            if (mapState.currentMode === "bubble") {
                d3.select(this)
                    .attr("fill-opacity", 0.95)
                    .style("stroke-width", 2);
                showMapTooltip(event, d.properties);
            }
        })
        .on("mousemove", moveMapTooltip)
        .on("mouseleave", function () {
            if (mapState.currentMode === "bubble") {
                d3.select(this)
                    .attr("fill-opacity", 0.75)
                    .style("stroke-width", 0.8);
                hideMapTooltip();
            }
        })
        .on("click", function (event, d) {
            event.stopPropagation();
            // Temukan path polygon pasangannya
            const targetPath = pathsGroup.selectAll("path.kabupaten-path")
                .filter(p => p === d).node();
            if (targetPath) zoomToFeature(targetPath, d);
        });

    // 10. Legenda Koroplet
    const legWidth = 220;
    const legHeight = 10;
    const defs = svg.append("defs");
    const gradId = "gradient-peta-koroplet";
    const grad = defs.append("linearGradient")
        .attr("id", gradId)
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "100%").attr("y2", "0%");

    for (let i = 0; i <= 10; i++) {
        grad.append("stop")
            .attr("offset", (i * 10) + "%")
            .attr("stop-color", d3.interpolateYlOrRd(i / 10));
    }

    const legendKoroplet = svg.append("g")
        .attr("class", "legend-koroplet")
        .attr("transform", `translate(${width - legWidth - 25}, ${height - 40})`);

    legendKoroplet.append("rect")
        .attr("width", legWidth)
        .attr("height", legHeight)
        .style("fill", `url(#${gradId})`)
        .style("rx", 3);

    legendKoroplet.append("text")
        .attr("x", 0).attr("y", -6)
        .attr("fill", "#e0e0e0")
        .style("font-size", "10px").style("font-weight", "600")
        .text("Persentase Penduduk Miskin (P0)");

    legendKoroplet.append("text")
        .attr("x", 0).attr("y", legHeight + 12)
        .attr("fill", "#8e8e93").style("font-size", "9px")
        .text("0%");

    legendKoroplet.append("text")
        .attr("x", legWidth).attr("y", legHeight + 12)
        .attr("text-anchor", "end")
        .attr("fill", "#8e8e93").style("font-size", "9px")
        .text("40%+");

    mapState.legendKoroplet = legendKoroplet;

    // 11. Legenda Bubble
    const legendBubble = svg.append("g")
        .attr("class", "legend-bubble")
        .attr("transform", `translate(30, ${height - 25})`)
        .style("opacity", 0)
        .style("pointer-events", "none");

    legendBubble.append("text")
        .attr("x", 0).attr("y", -54)
        .attr("fill", "#e0e0e0")
        .style("font-size", "10px").style("font-weight", "600")
        .text("Jumlah Penduduk Miskin (Ribu Jiwa)");

    const sampleSizes = [50, 150, 400];
    sampleSizes.forEach((val, idx) => {
        const r = radiusScale(val);
        const xOffset = 24 + (idx * 56);
        legendBubble.append("circle")
            .attr("cx", xOffset)
            .attr("cy", -22)
            .attr("r", r)
            .attr("fill", "none")
            .style("stroke", "#2ec4b6")
            .style("stroke-width", 1.2)
            .style("stroke-dasharray", "2,2");

        legendBubble.append("text")
            .attr("x", xOffset)
            .attr("y", 12)
            .attr("text-anchor", "middle")
            .attr("fill", "#8e8e93")
            .style("font-size", "9px")
            .text(`${val}k`);
    });

    mapState.legendBubble = legendBubble;
}

// ── Fungsi Click-to-Zoom dengan Smooth Pan/Zoom ────────────────────────────
function zoomToFeature(element, d) {
    if (!mapState.svg || !mapState.path) return;

    // Jika mengklik wilayah yang sama, lakukan reset zoom
    if (mapState.activeFeature === element) {
        return resetMapZoom();
    }

    // Reset style active sebelumnya
    if (mapState.activeFeature) {
        d3.select(mapState.activeFeature)
            .style("stroke", "rgba(255, 255, 255, 0.16)")
            .style("stroke-width", 0.4);
    }

    mapState.activeFeature = element;

    // Highlight wilayah terpilih
    d3.select(element)
        .style("stroke", "#2ec4b6")
        .style("stroke-width", 2);

    const [[x0, y0], [x1, y1]] = mapState.path.bounds(d);
    const dx = x1 - x0;
    const dy = y1 - y0;
    const x = (x0 + x1) / 2;
    const y = (y0 + y1) / 2;

    const width = mapState.width;
    const height = mapState.height;

    // Skala zoom dibatasi antara 2x hingga 10x
    const scale = Math.max(2, Math.min(10, 0.85 / Math.max(dx / width, dy / height)));
    const translate = [width / 2 - scale * x, height / 2 - scale * y];

    mapState.svg.transition()
        .duration(850)
        .ease(d3.easeCubicOut)
        .call(
            mapState.zoomBehavior.transform,
            d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
        );
}

function resetMapZoom() {
    if (!mapState.svg || !mapState.zoomBehavior) return;

    if (mapState.activeFeature) {
        d3.select(mapState.activeFeature)
            .style("stroke", "rgba(255, 255, 255, 0.16)")
            .style("stroke-width", 0.4);
        mapState.activeFeature = null;
    }

    mapState.svg.transition()
        .duration(800)
        .ease(d3.easeCubicOut)
        .call(mapState.zoomBehavior.transform, d3.zoomIdentity);
}

// ── Fungsi Transisi Mulus Antara Koroplet dan Bubble ──────────────────────
function updateMap(tipe) {
    if (!mapState.svg) return;
    mapState.currentMode = tipe;

    const t = mapState.svg.transition().duration(850).ease(d3.easeCubicInOut);

    // Update active button state jika tombol ada di UI
    d3.selectAll(".btn-map-toggle").classed("active", false);
    d3.select(`#btn-${tipe}`).classed("active", true);

    if (tipe === "bubble") {
        // 1. Redupkan poligon koroplet menjadi latar peta netral gelap
        mapState.pathsGroup.selectAll("path.kabupaten-path")
            .transition(t)
            .attr("fill", "#262626")
            .attr("fill-opacity", 0.45)
            .style("stroke", "rgba(255, 255, 255, 0.08)");

        // 2. Munculkan bubble proporsional
        mapState.bubblesGroup.selectAll("circle.kabupaten-bubble")
            .transition(t)
            .attr("r", d => {
                const j = d.properties.jumlah_ribu;
                return j != null && j > 0 ? mapState.radiusScale(j) : 0;
            })
            .attr("fill-opacity", 0.72)
            .style("pointer-events", "all");

        // 3. Pergantian Legenda
        mapState.legendKoroplet.transition(t).style("opacity", 0.15);
        mapState.legendBubble.transition(t).style("opacity", 1);

    } else {
        // 1. Kembalikan warna choropleth asli
        mapState.pathsGroup.selectAll("path.kabupaten-path")
            .transition(t)
            .attr("fill", d => {
                const val = d.properties.p0;
                return val != null ? mapState.colorScale(val) : "#282828";
            })
            .attr("fill-opacity", 0.9)
            .style("stroke", "rgba(255, 255, 255, 0.16)");

        // 2. Kecilkan bubble ke 0
        mapState.bubblesGroup.selectAll("circle.kabupaten-bubble")
            .transition(t)
            .attr("r", 0)
            .attr("fill-opacity", 0)
            .style("pointer-events", "none");

        // 3. Pergantian Legenda
        mapState.legendKoroplet.transition(t).style("opacity", 1);
        mapState.legendBubble.transition(t).style("opacity", 0);
    }
}

// ── Tooltip Helpers ───────────────────────────────────────────────────────
function showMapTooltip(event, props) {
    if (!mapState.tooltip) return;
    const p0Text = props.p0 != null ? `${props.p0}%` : "Tidak ada data";
    const jmText = props.jumlah_ribu != null ? `${props.jumlah_ribu.toLocaleString("id-ID")} ribu jiwa` : "-";

    mapState.tooltip.html(`
        <div style="font-weight:700;font-size:12px;color:#fff;margin-bottom:2px">${props.WADMKK || "Wilayah"}</div>
        <div style="font-size:10px;color:#8e8e93;margin-bottom:5px">${props.provinsi_bps || "-"}</div>
        <div style="font-size:11px;color:#d1d1d6">Persentase (P0): <b style="color:var(--aksen)">${p0Text}</b></div>
        <div style="font-size:11px;color:#d1d1d6">Beban Absolut: <b style="color:#f4a261">${jmText}</b></div>
    `)
    .style("opacity", 1)
    .style("left", (event.pageX + 15) + "px")
    .style("top", (event.pageY - 30) + "px");
}

function moveMapTooltip(event) {
    if (mapState.tooltip) {
        mapState.tooltip
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 30) + "px");
    }
}

function hideMapTooltip() {
    if (mapState.tooltip) {
        mapState.tooltip.style("opacity", 0).style("left", "-1000px");
    }
}

function renderScene1() {
    initMap();
    updateMap("koroplet");
}