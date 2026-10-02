// js/scene1.js
// Bagian 2: Peta Spasial Kemiskinan Indonesia (Koroplet & Bubble Terpisah - Stacked)
// ──────────────────────────────────────────────────────────────────────────────
// Fitur:
// 1. Peta Koroplet (Persentase P0) di kontainer #chart-map-koroplet
// 2. Peta Bubble (Jumlah Absolut Ribu Jiwa) di kontainer #chart-map-bubble
// 3. Click-to-Zoom dengan bounding box otomatis & click neighbor to pan/zoom pada kedua peta.
// 4. Tombol / klik latar belakang untuk reset zoom.

let koropletState = {
    svg: null,
    gMain: null,
    pathsGroup: null,
    projection: null,
    path: null,
    colorScale: null,
    tooltip: null,
    zoomBehavior: null,
    activeFeature: null,
    width: 0,
    height: 0
};

let bubbleState = {
    svg: null,
    gMain: null,
    pathsGroup: null,
    bubblesGroup: null,
    projection: null,
    path: null,
    radiusScale: null,
    tooltip: null,
    zoomBehavior: null,
    activeFeature: null,
    width: 0,
    height: 0
};

// ══════════════════════════════════════════════════════════════════════════
// 1. INIT PETA KOROPLET (PERSENTASE P0)
// ══════════════════════════════════════════════════════════════════════════
function initKoropletMap(containerId = "#chart-map-koroplet") {
    const container = d3.select(containerId);
    if (container.empty()) return;

    container.selectAll("*").remove();

    const node = container.node();
    const width = node.getBoundingClientRect().width || 1080;
    const height = Math.max(Math.min(window.innerHeight * 0.65, 560), 440);
    koropletState.width = width;
    koropletState.height = height;

    const dataGeo = appData.geojson;
    if (!dataGeo || !dataGeo.features) return;

    // Canvas SVG
    const svg = container.append("svg")
        .attr("width", "100%")
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("display", "block")
        .style("background", "transparent")
        .style("cursor", "grab");
    koropletState.svg = svg;

    // Proyeksi & Path Generator
    const projection = d3.geoMercator().fitSize([width, height], dataGeo);
    const path = d3.geoPath().projection(projection);
    koropletState.projection = projection;
    koropletState.path = path;

    // Skala Warna (Persentase P0)
    const colorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, 40]);
    koropletState.colorScale = colorScale;

    // Tooltip
    d3.selectAll(".d3-tooltip.map-tooltip-koroplet").remove();
    const tooltip = d3.select("body").append("div")
        .attr("class", "d3-tooltip map-tooltip-koroplet");
    koropletState.tooltip = tooltip;

    // Zoom Behavior
    const gMain = svg.append("g").attr("class", "map-zoom-group");
    koropletState.gMain = gMain;

    const zoom = d3.zoom()
        .scaleExtent([1, 14])
        .on("zoom", (event) => {
            gMain.attr("transform", event.transform);
        });
    koropletState.zoomBehavior = zoom;
    svg.call(zoom);

    // Background rect reset zoom
    svg.insert("rect", ":first-child")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "transparent")
        .on("click", () => resetKoropletZoom());

    const pathsGroup = gMain.append("g").attr("class", "layer-polygons");
    koropletState.pathsGroup = pathsGroup;

    // Render Poligon Kabupaten / Kota
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
            showMapTooltip(event, d.properties, koropletState.tooltip);
        })
        .on("mousemove", event => moveMapTooltip(event, koropletState.tooltip))
        .on("mouseleave", function () {
            const isSelected = koropletState.activeFeature === this;
            d3.select(this)
                .style("stroke", isSelected ? "#2ec4b6" : "rgba(255, 255, 255, 0.16)")
                .style("stroke-width", isSelected ? 1.8 : 0.4);
            hideMapTooltip(koropletState.tooltip);
        })
        .on("click", function (event, d) {
            event.stopPropagation();
            zoomToKoropletFeature(this, d);
        });

    // Legenda Koroplet
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
}

function zoomToKoropletFeature(element, d) {
    if (!koropletState.svg || !koropletState.path) return;

    if (koropletState.activeFeature === element) {
        return resetKoropletZoom();
    }

    if (koropletState.activeFeature) {
        d3.select(koropletState.activeFeature)
            .style("stroke", "rgba(255, 255, 255, 0.16)")
            .style("stroke-width", 0.4);
    }

    koropletState.activeFeature = element;

    d3.select(element)
        .style("stroke", "#2ec4b6")
        .style("stroke-width", 2);

    const [[x0, y0], [x1, y1]] = koropletState.path.bounds(d);
    const dx = x1 - x0;
    const dy = y1 - y0;
    const x = (x0 + x1) / 2;
    const y = (y0 + y1) / 2;
    const width = koropletState.width;
    const height = koropletState.height;

    const scale = Math.max(2, Math.min(10, 0.85 / Math.max(dx / width, dy / height)));
    const translate = [width / 2 - scale * x, height / 2 - scale * y];

    koropletState.svg.transition()
        .duration(850)
        .ease(d3.easeCubicOut)
        .call(
            koropletState.zoomBehavior.transform,
            d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
        );
}

function resetKoropletZoom() {
    if (!koropletState.svg || !koropletState.zoomBehavior) return;

    if (koropletState.activeFeature) {
        d3.select(koropletState.activeFeature)
            .style("stroke", "rgba(255, 255, 255, 0.16)")
            .style("stroke-width", 0.4);
        koropletState.activeFeature = null;
    }

    koropletState.svg.transition()
        .duration(800)
        .ease(d3.easeCubicOut)
        .call(koropletState.zoomBehavior.transform, d3.zoomIdentity);
}

// ══════════════════════════════════════════════════════════════════════════
// 2. INIT PETA BUBBLE (JUMLAH ABSOLUT RIBU JIWA)
// ══════════════════════════════════════════════════════════════════════════
function initBubbleMap(containerId = "#chart-map-bubble") {
    const container = d3.select(containerId);
    if (container.empty()) return;

    container.selectAll("*").remove();

    const node = container.node();
    const width = node.getBoundingClientRect().width || 1080;
    const height = Math.max(Math.min(window.innerHeight * 0.65, 560), 440);
    bubbleState.width = width;
    bubbleState.height = height;

    const dataGeo = appData.geojson;
    if (!dataGeo || !dataGeo.features) return;

    // Canvas SVG
    const svg = container.append("svg")
        .attr("width", "100%")
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("display", "block")
        .style("background", "transparent")
        .style("cursor", "grab");
    bubbleState.svg = svg;

    // Proyeksi & Path Generator
    const projection = d3.geoMercator().fitSize([width, height], dataGeo);
    const path = d3.geoPath().projection(projection);
    bubbleState.projection = projection;
    bubbleState.path = path;

    // Skala Radius Bubble (Jumlah Absolut Ribu Jiwa)
    const maxJumlah = d3.max(dataGeo.features, d => d.properties.jumlah_ribu || 0) || 400;
    const radiusScale = d3.scaleSqrt().domain([0, maxJumlah]).range([2.5, 30]);
    bubbleState.radiusScale = radiusScale;

    // Tooltip
    d3.selectAll(".d3-tooltip.map-tooltip-bubble").remove();
    const tooltip = d3.select("body").append("div")
        .attr("class", "d3-tooltip map-tooltip-bubble");
    bubbleState.tooltip = tooltip;

    // Pre-calculate centroid titik kabupaten untuk bubble
    dataGeo.features.forEach(f => {
        const centroid = path.centroid(f);
        f.properties._cx = isNaN(centroid[0]) ? 0 : centroid[0];
        f.properties._cy = isNaN(centroid[1]) ? 0 : centroid[1];
    });

    // Zoom Behavior
    const gMain = svg.append("g").attr("class", "map-zoom-group");
    bubbleState.gMain = gMain;

    const zoom = d3.zoom()
        .scaleExtent([1, 14])
        .on("zoom", (event) => {
            gMain.attr("transform", event.transform);
        });
    bubbleState.zoomBehavior = zoom;
    svg.call(zoom);

    // Background rect reset zoom
    svg.insert("rect", ":first-child")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "transparent")
        .on("click", () => resetBubbleZoom());

    const pathsGroup = gMain.append("g").attr("class", "layer-polygons");
    const bubblesGroup = gMain.append("g").attr("class", "layer-bubbles");
    bubbleState.pathsGroup = pathsGroup;
    bubbleState.bubblesGroup = bubblesGroup;

    // Render Base Poligon Netral Gelap
    pathsGroup.selectAll("path.kabupaten-path")
        .data(dataGeo.features)
        .enter()
        .append("path")
        .attr("class", "kabupaten-path")
        .attr("d", path)
        .attr("fill", "#222226")
        .attr("fill-opacity", 0.5)
        .style("stroke", "rgba(255, 255, 255, 0.08)")
        .style("stroke-width", 0.4)
        .style("cursor", "pointer")
        .on("mouseover", function (event, d) {
            d3.select(this)
                .style("stroke", "#ffffff")
                .style("stroke-width", 1.2);
            showMapTooltip(event, d.properties, bubbleState.tooltip);
        })
        .on("mousemove", event => moveMapTooltip(event, bubbleState.tooltip))
        .on("mouseleave", function () {
            const isSelected = bubbleState.activeFeature === this;
            d3.select(this)
                .style("stroke", isSelected ? "#2ec4b6" : "rgba(255, 255, 255, 0.08)")
                .style("stroke-width", isSelected ? 1.8 : 0.4);
            hideMapTooltip(bubbleState.tooltip);
        })
        .on("click", function (event, d) {
            event.stopPropagation();
            zoomToBubbleFeature(this, d);
        });

    // Render Bubble (Lingkaran Proporsional)
    const colorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, 40]);

    bubblesGroup.selectAll("circle.kabupaten-bubble")
        .data(dataGeo.features)
        .enter()
        .append("circle")
        .attr("class", "kabupaten-bubble")
        .attr("cx", d => d.properties._cx)
        .attr("cy", d => d.properties._cy)
        .attr("r", d => {
            const j = d.properties.jumlah_ribu;
            return j != null && j > 0 ? radiusScale(j) : 0;
        })
        .attr("fill", d => {
            const val = d.properties.p0;
            return val != null ? colorScale(val) : "#f4a261";
        })
        .attr("fill-opacity", 0.75)
        .style("stroke", "#ffffff")
        .style("stroke-width", 0.8)
        .style("cursor", "pointer")
        .on("mouseover", function (event, d) {
            d3.select(this)
                .attr("fill-opacity", 0.95)
                .style("stroke-width", 2);
            showMapTooltip(event, d.properties, bubbleState.tooltip);
        })
        .on("mousemove", event => moveMapTooltip(event, bubbleState.tooltip))
        .on("mouseleave", function () {
            d3.select(this)
                .attr("fill-opacity", 0.75)
                .style("stroke-width", 0.8);
            hideMapTooltip(bubbleState.tooltip);
        })
        .on("click", function (event, d) {
            event.stopPropagation();
            const targetPath = pathsGroup.selectAll("path.kabupaten-path")
                .filter(p => p === d).node();
            if (targetPath) zoomToBubbleFeature(targetPath, d);
        });

    // Legenda Bubble
    const legendBubble = svg.append("g")
        .attr("class", "legend-bubble")
        .attr("transform", `translate(30, ${height - 25})`);

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
}

function zoomToBubbleFeature(element, d) {
    if (!bubbleState.svg || !bubbleState.path) return;

    if (bubbleState.activeFeature === element) {
        return resetBubbleZoom();
    }

    if (bubbleState.activeFeature) {
        d3.select(bubbleState.activeFeature)
            .style("stroke", "rgba(255, 255, 255, 0.08)")
            .style("stroke-width", 0.4);
    }

    bubbleState.activeFeature = element;

    d3.select(element)
        .style("stroke", "#2ec4b6")
        .style("stroke-width", 2);

    const [[x0, y0], [x1, y1]] = bubbleState.path.bounds(d);
    const dx = x1 - x0;
    const dy = y1 - y0;
    const x = (x0 + x1) / 2;
    const y = (y0 + y1) / 2;
    const width = bubbleState.width;
    const height = bubbleState.height;

    const scale = Math.max(2, Math.min(10, 0.85 / Math.max(dx / width, dy / height)));
    const translate = [width / 2 - scale * x, height / 2 - scale * y];

    bubbleState.svg.transition()
        .duration(850)
        .ease(d3.easeCubicOut)
        .call(
            bubbleState.zoomBehavior.transform,
            d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
        );
}

function resetBubbleZoom() {
    if (!bubbleState.svg || !bubbleState.zoomBehavior) return;

    if (bubbleState.activeFeature) {
        d3.select(bubbleState.activeFeature)
            .style("stroke", "rgba(255, 255, 255, 0.08)")
            .style("stroke-width", 0.4);
        bubbleState.activeFeature = null;
    }

    bubbleState.svg.transition()
        .duration(800)
        .ease(d3.easeCubicOut)
        .call(bubbleState.zoomBehavior.transform, d3.zoomIdentity);
}

// ── Tooltip Helpers ───────────────────────────────────────────────────────
function showMapTooltip(event, props, tooltipObj) {
    if (!tooltipObj) return;
    const p0Text = props.p0 != null ? `${props.p0}%` : "Tidak ada data";
    const jmText = props.jumlah_ribu != null ? `${props.jumlah_ribu.toLocaleString("id-ID")} ribu jiwa` : "-";

    tooltipObj.html(`
        <div style="font-weight:700;font-size:12px;color:#fff;margin-bottom:2px">${props.WADMKK || "Wilayah"}</div>
        <div style="font-size:10px;color:#8e8e93;margin-bottom:5px">${props.provinsi_bps || "-"}</div>
        <div style="font-size:11px;color:#d1d1d6">Persentase (P0): <b style="color:var(--aksen)">${p0Text}</b></div>
        <div style="font-size:11px;color:#d1d1d6">Beban Absolut: <b style="color:#f4a261">${jmText}</b></div>
    `)
    .style("opacity", 1)
    .style("left", (event.pageX + 15) + "px")
    .style("top", (event.pageY - 30) + "px");
}

function moveMapTooltip(event, tooltipObj) {
    if (tooltipObj) {
        tooltipObj
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 30) + "px");
    }
}

function hideMapTooltip(tooltipObj) {
    if (tooltipObj) {
        tooltipObj.style("opacity", 0).style("left", "-1000px");
    }
}

// Global legacy wrapper
function initMap() {
    initKoropletMap("#chart-map-koroplet");
    initBubbleMap("#chart-map-bubble");
}

function updateMap() {
    // Deprecated legacy handler fallback
}

function resetMapZoom() {
    resetKoropletZoom();
    resetBubbleZoom();
}

function renderScene1() {
    initKoropletMap("#chart-map-koroplet");
    initBubbleMap("#chart-map-bubble");
}