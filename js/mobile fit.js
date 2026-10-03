/*
 * mobile-fit.js
 * Di layar HP, setiap grafik (gambar vektor SVG buatan D3) diperkecil agar
 * muat selebar layar. Kalau pengecilan membuat tulisan terlalu kecil (di bawah
 * skala minimum), grafik berhenti mengecil dan wadahnya bisa digeser ke samping.
 * Di layar lebar (desktop) berkas ini tidak mengubah apa pun.
 */
(function () {
  "use strict";

  var LAYAR_HP = window.matchMedia("(max-width: 820px)");

  // Skala minimum = seberapa kecil grafik boleh dikecilkan dari ukuran aslinya.
  // 0.5 artinya paling kecil setengah dari ukuran asli. Makin kecil angkanya,
  // makin "fit" ke layar tetapi makin kecil tulisannya.
  var SKALA_MIN_UMUM = 0.5;
  var SKALA_MIN = {
    "chart-scene5": 0.85, // matriks korelasi: angka di tiap sel harus terbaca
    "chart-map-koroplet": 0.3, // peta: bentuk wilayah lebih penting dari tulisan
    "chart-scene3-tree": 0.8, // pohon hierarki: label harus terbaca, boleh digeser
  };

  var ANGKA = /^\s*\d+(\.\d+)?(px)?\s*$/;

  // Ukuran asli grafik: dari viewBox, atau dari atribut width/height.
  function ukuranAsli(svg) {
    var buatan = svg.getAttribute("data-mf-vb") === "1";
    var vb = svg.viewBox && svg.viewBox.baseVal;
    if (!buatan && vb && vb.width > 0 && vb.height > 0) {
      return { w: vb.width, h: vb.height, punyaVb: true };
    }
    var w = svg.getAttribute("width");
    var h = svg.getAttribute("height");
    if (w && h && ANGKA.test(w) && ANGKA.test(h)) {
      return { w: parseFloat(w), h: parseFloat(h), punyaVb: false };
    }
    return null; // ukuran tidak diketahui: biarkan apa adanya
  }

  function kembalikan(svg) {
    if (svg.getAttribute("data-mf-on") === "1") {
      svg.style.removeProperty("width");
      svg.style.removeProperty("height");
      svg.style.removeProperty("max-width");
      svg.removeAttribute("data-mf-on");
    }
  }

  function sesuaikan(wadah) {
    var hp = LAYAR_HP.matches;
    var svgs = wadah.querySelectorAll("svg");
    var adaGeser = false;

    for (var i = 0; i < svgs.length; i++) {
      var svg = svgs[i];
      if (
        svg.parentNode &&
        svg.parentNode.closest &&
        svg.parentNode.closest("svg")
      ) {
        continue; // lewati svg bersarang, cukup yang paling luar
      }
      if (!hp) {
        kembalikan(svg);
        continue;
      }
      var s = ukuranAsli(svg);
      if (!s) continue;

      if (!s.punyaVb) {
        svg.setAttribute("viewBox", "0 0 " + s.w + " " + s.h);
        svg.setAttribute("data-mf-vb", "1");
      }

      var cs = window.getComputedStyle(wadah);
      var lebarWadah =
        wadah.clientWidth -
        (parseFloat(cs.paddingLeft) || 0) -
        (parseFloat(cs.paddingRight) || 0);
      var minLebar = (SKALA_MIN[wadah.id] || SKALA_MIN_UMUM) * s.w;
      var lebar = Math.min(s.w, Math.max(lebarWadah, minLebar));

      svg.style.setProperty("width", lebar + "px", "important");
      svg.style.setProperty("height", (lebar * s.h) / s.w + "px", "important");
      svg.style.setProperty("max-width", "none", "important");
      svg.setAttribute("data-mf-on", "1");

      if (lebar > lebarWadah + 1) adaGeser = true;
    }

    wadah.classList.toggle("bisa-geser", hp && adaGeser);
    if (wadah._petunjuk)
      wadah._petunjuk.classList.toggle("mf-aktif", hp && adaGeser);
  }

  function siapkanPetunjuk(wadah) {
    var p = wadah.previousElementSibling;
    if (!p || !p.classList.contains("hint-geser")) {
      p = document.createElement("p");
      p.className = "hint-geser";
      p.textContent = "Geser ke samping untuk melihat seluruh grafik.";
      wadah.parentNode.insertBefore(p, wadah);
    }
    wadah._petunjuk = p;
  }

  var wadahWadah = document.querySelectorAll(".chart-canvas");
  var antri = false;

  function jadwalkan() {
    if (antri) return;
    antri = true;
    window.requestAnimationFrame(function () {
      antri = false;
      for (var i = 0; i < wadahWadah.length; i++) sesuaikan(wadahWadah[i]);
    });
  }

  var pengamat = new MutationObserver(jadwalkan);
  for (var i = 0; i < wadahWadah.length; i++) {
    siapkanPetunjuk(wadahWadah[i]);
    // setiap kali D3 menggambar ulang isi wadah, ukurannya disesuaikan lagi
    pengamat.observe(wadahWadah[i], { childList: true, subtree: true });
  }

  window.addEventListener("resize", jadwalkan);
  window.addEventListener("orientationchange", jadwalkan);
  window.addEventListener("load", jadwalkan);
  if (LAYAR_HP.addEventListener) LAYAR_HP.addEventListener("change", jadwalkan);
  jadwalkan();
})();
