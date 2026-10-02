// js/scene1.js

function renderScene1() {
    const dataGeo = appData.geojson;
    const containerId = "#chart-scene1";
    
    // Hapus SVG yang mungkin sudah ada
    d3.select(containerId).selectAll("*").remove();

    // 1. Tentukan dimensi
    const container = d3.select(containerId).node();
    const width = container.getBoundingClientRect().width || 1000;
    const height = 550;

    const svg = d3.select(containerId)
      .append("svg")
      .attr("width", "100%")
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .style("display", "block")
      .style("margin", "auto");

    // 2. Tentukan Proyeksi dan Path
    const projection = d3.geoMercator()
      .fitSize([width, height], dataGeo);

    const path = d3.geoPath().projection(projection);

    // 3. Skala Warna
    const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
      .domain([0, 40]);

    // 4. Buat Tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "d3-tooltip");

    // 5. Setup Zoom dan State Interaksi
    let activeFeature = null;

    const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on("zoom", (event) => {
            mapGroup.attr("transform", event.transform);
        });

    svg.call(zoom);

    // Background klik untuk reset zoom
    svg.append("rect")
      .attr("class", "background-zoom-reset")
      .attr("width", width)
      .attr("height", height)
      .style("fill", "transparent")
      .on("click", resetZoom);

    const mapGroup = svg.append("g");

    // Fungsi klik di background untuk reset
    function resetZoom() {
      activeFeature = null;
      
      d3.selectAll(".kabupaten-path")
        .transition().duration(750)
        .style("opacity", 1)
        .style("stroke", "rgba(255, 255, 255, 0.1)")
        .style("stroke-width", 0.5);

      svg.transition()
          .duration(750)
          .call(zoom.transform, d3.zoomIdentity);
    }

    // Fungsi klik pada kabupaten untuk zoom
    function clicked(event, d) {
      if (activeFeature === this) return resetZoom();
      
      activeFeature = this;

      d3.selectAll(".kabupaten-path")
        .transition().duration(750)
        .style("opacity", 0.2)
        .style("stroke", "rgba(255, 255, 255, 0.1)")
        .style("stroke-width", 0.5);
        
      d3.select(this)
        .transition().duration(750)
        .style("opacity", 1)
        .style("stroke", "#ffffff")
        .style("stroke-width", 1.5);

      const [[x0, y0], [x1, y1]] = path.bounds(d);
      const dx = x1 - x0,
            dy = y1 - y0,
            x = (x0 + x1) / 2,
            y = (y0 + y1) / 2;
            
      const scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height)));
      const translate = [width / 2 - scale * x, height / 2 - scale * y];

      svg.transition()
          .duration(750)
          .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
    }

    // 6. Interaksi Mouse Hover
    const mouseOver = function(event, d) {
        if (!activeFeature) {
            d3.selectAll(".kabupaten-path")
              .transition().duration(200)
              .style("opacity", 0.3);
              
            d3.select(this)
              .transition().duration(200)
              .style("opacity", 1)
              .style("stroke", "#ffffff")
              .style("stroke-width", 1.5);
        }

        const props = d.properties;
        const p0Text = props.p0 ? props.p0 + "%" : "Data Tidak Tersedia";
        const jumlahText = props.jumlah_ribu ? props.jumlah_ribu + " ribu jiwa" : "-";
        
        tooltip
          .html(`<b>${props.WADMKK}</b><br>
                 Provinsi: ${props.provinsi_bps}<br>
                 Persentase Penduduk Miskin (P0): <span style="color:var(--aksen)">${p0Text}</span><br>
                 Jumlah Penduduk Miskin: ${jumlahText}`)
          .style("opacity", 1);
    };

    const mouseMove = function(event) {
        tooltip
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 28) + "px");
    };

    const mouseLeave = function(event, d) {
        if (!activeFeature) {
            d3.selectAll(".kabupaten-path")
              .transition().duration(200)
              .style("opacity", 1)
              .style("stroke", "rgba(255, 255, 255, 0.1)")
              .style("stroke-width", 0.5);
        }

        tooltip.style("opacity", 0)
               .style("left", "-1000px")
               .style("top", "-1000px");
    };

    // 7. Gambar Peta
    mapGroup.selectAll("path")
      .data(dataGeo.features)
      .enter()
      .append("path")
        .attr("class", "kabupaten-path")
        .attr("d", path)
        .attr("fill", d => {
            const val = d.properties.p0;
            return val !== undefined && val !== null ? colorScale(val) : "#333333";
        })
        .style("stroke", "rgba(255, 255, 255, 0.1)")
        .style("stroke-width", 0.5)
        .style("cursor", "pointer")
        .on("mouseover", mouseOver)
        .on("mousemove", mouseMove)
        .on("mouseleave", mouseLeave)
        .on("click", clicked);
        
    // 8. Legenda Horizontal (Colorbar)
    const legendWidth = 250;
    const legendHeight = 15;
    
    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient")
        .attr("id", "linear-gradient-scene1")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%");
        
    const numStops = 10;
    for(let i=0; i<=numStops; i++) {
        linearGradient.append("stop")
            .attr("offset", (i/numStops * 100) + "%")
            .attr("stop-color", d3.interpolateYlOrRd(i/numStops));
    }
    
    const legend = svg.append("g")
        .attr("transform", `translate(${width - legendWidth - 20}, ${height - 50})`);
        
    legend.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#linear-gradient-scene1)")
        .style("stroke", "#4a4a4a")
        .style("rx", 3);
        
    legend.append("text")
        .attr("x", 0)
        .attr("y", legendHeight + 15)
        .attr("fill", "#b9b9b9")
        .style("font-size", "12px")
        .text("0%");
        
    legend.append("text")
        .attr("x", legendWidth)
        .attr("y", legendHeight + 15)
        .attr("text-anchor", "end")
        .attr("fill", "#b9b9b9")
        .style("font-size", "12px")
        .text("40%+");
        
    legend.append("text")
        .attr("x", legendWidth/2)
        .attr("y", -8)
        .attr("text-anchor", "middle")
        .attr("fill", "#f2f2f2")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text("Persentase Penduduk Miskin (P0)");
}