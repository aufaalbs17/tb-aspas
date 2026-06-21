// Definisi Basemap
const cartoLightLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  maxZoom: 19
});

const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri',
  maxZoom: 19
});

// UI state untuk Zen Mode
window.toggleZenMode = function() {
  if(navigator.vibrate) navigator.vibrate(10);
  document.body.classList.toggle('zen-mode');
  const btn = document.getElementById('btn-zen');
  if (document.body.classList.contains('zen-mode')) {
    btn.innerHTML = '<i class="fa-solid fa-compress"></i>';
    btn.style.boxShadow = '0 0 20px #10b981';
  } else {
    btn.innerHTML = '<i class="fa-solid fa-expand"></i>';
    btn.style.boxShadow = '';
  }
};

window.showDynamicIsland = function(msg) {
  const island = document.getElementById('dynamic-island');
  island.innerText = msg;
  island.classList.add('active');
  setTimeout(() => {
    island.classList.remove('active');
  }, 2500);
};

window.openTutorial = function() {
  if(navigator.vibrate) navigator.vibrate(10);
  document.getElementById('tutorial-overlay').classList.add('active');
};

window.closeTutorial = function() {
  if(navigator.vibrate) navigator.vibrate(10);
  document.getElementById('tutorial-overlay').classList.remove('active');
  // Simpan ke local storage agar tidak muncul terus
  localStorage.setItem('tutorial_seen', 'true');
};

window.openTeam = function() {
  if(navigator.vibrate) navigator.vibrate(10);
  document.getElementById('team-overlay').classList.add('active');
};

window.closeTeam = function() {
  if(navigator.vibrate) navigator.vibrate(10);
  document.getElementById('team-overlay').classList.remove('active');
};

// Inisialisasi Peta Leaflet berpusat di Padang
const map = L.map('map', {
  center: [-0.9471, 100.3658],
  zoom: 13,
  layers: [cartoLightLayer]
});

// Layer Control
const baseMaps = {
  "Street Map": cartoLightLayer,
  "Satellite": satelliteLayer
};

// ======== TUTORIAL LOGIC ========

// Cek apakah user baru pertama kali buka
document.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem('tutorial_seen')) {
    setTimeout(window.openTutorial, 500);
  }
});

// ======== ZEN MODE ========
window.toggleZenMode = function(e) {
  if (e) e.stopPropagation();
  document.body.classList.toggle('zen-mode');
};

// ======== VOICE NAVIGATION ========
window.speakNarrative = function(steps) {
  if (!window.speechSynthesis) return;
  // Batalkan suara sebelumnya jika ada
  window.speechSynthesis.cancel();
  
  let narrativeText = "Rute ditemukan. ";
  steps.forEach((step, index) => {
    // Hilangkan tag HTML jika ada
    const text = step.text.replace(/<[^>]*>?/gm, '');
    narrativeText += `Langkah ${index + 1}: ${text}. `;
  });
  narrativeText += "Selamat menikmati perjalanan Anda.";
  
  const utterance = new SpeechSynthesisUtterance(narrativeText);
  utterance.lang = 'id-ID';
  utterance.rate = 1.0;
  window.speechSynthesis.speak(utterance);
};
L.control.layers(baseMaps).addTo(map);

// Removed OSMBuildings and CCTV per user request

// Collapse Omnibox Logic
document.getElementById('btn-collapse').addEventListener('click', function() {
  const body = document.getElementById('routing-form-body');
  const icon = document.getElementById('omnibox-icon');
  if (body.style.display === 'none') {
    body.style.display = 'flex';
    icon.style.transform = 'rotate(180deg)';
  } else {
    body.style.display = 'none';
    icon.style.transform = 'rotate(0deg)';
  }
});

let userMarker, destinationMarker, routeLayer;

// Ikon
const startIcon = L.divIcon({ html: '<i class="fa-solid fa-location-dot fa-2x" style="color:#2563eb; text-shadow: 0 2px 4px rgba(0,0,0,0.3);"></i>', className: 'custom-icon', iconSize: [24, 24], iconAnchor: [12, 24] });
const endIcon = L.divIcon({ html: '<i class="fa-solid fa-flag-checkered fa-2x" style="color:#ef4444; text-shadow: 0 2px 4px rgba(0,0,0,0.3);"></i>', className: 'custom-icon', iconSize: [24, 24], iconAnchor: [12, 24] });

// Fungsi Reverse Geocoding (Mendapatkan alamat dari koordinat)
async function reverseGeocode(lat, lon, defaultLabel) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        // Ambil nama jalan atau bangunan terpendek yang masuk akal
        const parts = data.display_name.split(',');
        return parts.length > 1 ? parts[0] + ', ' + parts[1] : data.display_name;
      }
    }
  } catch (e) {
    console.error("Reverse geocoding error:", e);
  }
  return defaultLabel;
}


// Fungsi helper menempatkan marker
let transitMarker = null;

function setMarker(type, lat, lon, label) {
  if (type === 'start') {
    if (userMarker) map.removeLayer(userMarker);
    userMarker = L.marker([lat, lon], {icon: startIcon}).addTo(map).bindPopup("<b>Titik Awal</b><br>"+label).openPopup();
    document.getElementById('start-input').value = label;
    document.getElementById('start-coords').dataset.lat = lat;
    document.getElementById('start-coords').dataset.lon = lon;
  } else if (type === 'end') {
    if (destinationMarker) map.removeLayer(destinationMarker);
    destinationMarker = L.marker([lat, lon], {icon: endIcon}).addTo(map).bindPopup("<b>Tujuan</b><br>"+label).openPopup();
    document.getElementById('end-input').value = label;
    document.getElementById('end-coords').dataset.lat = lat;
    document.getElementById('end-coords').dataset.lon = lon;
  } else if (type === 'transit') {
    if (transitMarker) map.removeLayer(transitMarker);
    const transitIcon = L.divIcon({ html: '<i class="fa-solid fa-location-dot fa-2x" style="color:#f59e0b; text-shadow: 0 2px 4px rgba(0,0,0,0.3);"></i>', className: 'custom-icon', iconSize: [24, 24], iconAnchor: [12, 24] });
    transitMarker = L.marker([lat, lon], {icon: transitIcon}).addTo(map).bindPopup("<b>Transit</b><br>"+label).openPopup();
    document.getElementById('transit-input').value = label;
    document.getElementById('transit-coords').dataset.lat = lat;
    document.getElementById('transit-coords').dataset.lon = lon;
  }
  map.setView([lat, lon], 15);
}

window.swapRoute = function(e) {
  if (e) e.preventDefault();
  
  const startInput = document.getElementById('start-input');
  const endInput = document.getElementById('end-input');
  const startCoords = document.getElementById('start-coords');
  const endCoords = document.getElementById('end-coords');

  // Swap values
  const tempVal = startInput.value;
  startInput.value = endInput.value;
  endInput.value = tempVal;

  // Swap coords
  const tempLat = startCoords.dataset.lat;
  const tempLon = startCoords.dataset.lon;
  
  startCoords.dataset.lat = endCoords.dataset.lat;
  startCoords.dataset.lon = endCoords.dataset.lon;
  
  endCoords.dataset.lat = tempLat;
  endCoords.dataset.lon = tempLon;

  // Re-render markers if they exist
  if (userMarker && startCoords.dataset.lat) {
    userMarker.setLatLng([startCoords.dataset.lat, startCoords.dataset.lon]).bindPopup("<b>Titik Awal</b><br>"+startInput.value);
  }
  if (destinationMarker && endCoords.dataset.lat) {
    destinationMarker.setLatLng([endCoords.dataset.lat, endCoords.dataset.lon]).bindPopup("<b>Tujuan</b><br>"+endInput.value);
  }

  // If both are filled, automatically calculate route
  if (startCoords.dataset.lat && endCoords.dataset.lat) {
    getRoute();
  }
};

// Event Klik Kanan / Tahan pada Peta (Context Menu)
map.on('contextmenu', function(e) {
  const lat = e.latlng.lat;
  const lon = e.latlng.lng;
  
  const popupContent = `
    <div style="text-align: center; min-width: 140px;">
      <p style="margin: 0 0 10px 0; font-weight: 600; font-size: 13px;">Atur Lokasi Ini Sebagai:</p>
      <button onclick="setMarkerFromMap('start', ${lat}, ${lon})" style="width: 100%; padding: 8px; margin-bottom: 5px; background: var(--primary-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 600;"><i class="fa-solid fa-circle-dot"></i> Titik Awal</button>
      <button onclick="setMarkerFromMap('end', ${lat}, ${lon})" style="width: 100%; padding: 8px; background: var(--danger-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 600;"><i class="fa-solid fa-location-dot"></i> Tujuan</button>
    </div>
  `;
  
  L.popup()
    .setLatLng(e.latlng)
    .setContent(popupContent)
    .openOn(map);
});

// Hapus klik kiri biasa agar tidak mengganggu drag peta
// map.on('click', async function(e) { ... });

window.setMarkerFromMap = async function(type, lat, lon) {
  map.closePopup();
  document.getElementById(type + '-input').value = "Mengambil alamat...";
  const label = await reverseGeocode(lat, lon, "Titik Peta Dipilih");
  setMarker(type, lat, lon, label);
};

// Fitur Riwayat Pencarian
function getRecentSearches() {
  const history = localStorage.getItem('recent_searches');
  return history ? JSON.parse(history) : [];
}

function addRecentSearch(label, lat, lon) {
  if (!label || !lat || !lon) return;
  if (label === "Lokasi Saat Ini (GPS)" || label === "Titik Peta Dipilih") return;
  
  let history = getRecentSearches();
  // Hapus jika sudah ada agar tidak duplikat
  history = history.filter(item => item.label !== label);
  // Tambahkan ke awal
  history.unshift({ label, lat, lon });
  // Simpan maksimal 3
  if (history.length > 3) history.pop();
  
  localStorage.setItem('recent_searches', JSON.stringify(history));
}

// Fitur Pencarian / Geocoding Nominatim
let searchTimeout;
function setupAutocomplete(inputId, resultsId, type) {
  const input = document.getElementById(inputId);
  const results = document.getElementById(resultsId);

  input.addEventListener('focus', function() {
    if (!this.value) {
      results.innerHTML = '';
      
      if (type === 'start') {
        const divGps = document.createElement('div');
        divGps.className = 'search-item';
        divGps.innerHTML = `<i class="fa-solid fa-crosshairs" style="color:var(--primary-color);"></i> <span style="color:var(--primary-color); font-weight:600;">Gunakan Lokasi Saat Ini (GPS)</span>`;
        divGps.onclick = () => {
          locateUser();
          results.style.display = 'none';
        };
        results.appendChild(divGps);
      }
      
      // Tampilkan Riwayat Pencarian
      const history = getRecentSearches();
      if (history.length > 0) {
        const historyTitle = document.createElement('div');
        historyTitle.style = "padding: 8px 16px; font-size: 11px; font-weight: bold; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; background: rgba(0,0,0,0.02);";
        historyTitle.innerText = "Pencarian Terakhir";
        results.appendChild(historyTitle);
        
        history.forEach(item => {
          const div = document.createElement('div');
          div.className = 'search-item';
          div.innerHTML = `<i class="fa-solid fa-clock-rotate-left" style="color: #64748b;"></i> <span>${item.label}</span>`;
          div.onclick = () => {
            setMarker(type, item.lat, item.lon, item.label);
            results.style.display = 'none';
          };
          results.appendChild(div);
        });
      }

      if (results.innerHTML !== '') {
        results.style.display = 'block';
      }
    }
  });

  input.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    const query = this.value;
    
    if (query.length === 0 && type === 'start') {
      input.dispatchEvent(new Event('focus'));
      return;
    }

    if (query.length < 3) {
      results.style.display = 'none';
      return;
    }

    searchTimeout = setTimeout(() => {
      // Menambahkan 'Padang, Sumatera Barat' untuk memastikan hasil relevan
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ' Padang Sumatera Barat')}&limit=5`)
        .then(response => response.json())
        .then(data => {
          results.innerHTML = '';
          if (data.length > 0) {
            results.style.display = 'block';
            data.forEach(item => {
              const div = document.createElement('div');
              div.className = 'search-item';
              // Parse nama pendek
              const shortName = item.display_name.split(',')[0] + ', ' + item.display_name.split(',')[1];
              div.innerHTML = `<i class="fa-solid fa-map-pin"></i> <span>${shortName}</span>`;
              div.onclick = () => {
                setMarker(type, parseFloat(item.lat), parseFloat(item.lon), shortName);
                addRecentSearch(shortName, item.lat, item.lon);
                results.style.display = 'none';
              };
              results.appendChild(div);
            });
          } else {
            results.innerHTML = '<div class="search-item">Tidak ditemukan</div>';
          }
        });
    }, 500); // debounce 500ms
  });

  // Sembunyikan hasil saat klik di luar
  document.addEventListener('click', function(e) {
    if (e.target !== input && e.target.parentNode !== results) {
      results.style.display = 'none';
    }
  });
}

setupAutocomplete('start-input', 'start-results', 'start');
setupAutocomplete('end-input', 'end-results', 'end');
setupAutocomplete('transit-input', 'transit-results', 'transit');

window.toggleTransitInput = function(e) {
  e.preventDefault();
  const group = document.getElementById('transit-group');
  const btn = document.getElementById('btn-add-transit');
  if (group.style.display === 'none') {
    group.style.display = 'block';
    btn.style.display = 'none';
  }
};

window.removeTransit = function(e) {
  e.preventDefault();
  const group = document.getElementById('transit-group');
  const btn = document.getElementById('btn-add-transit');
  group.style.display = 'none';
  btn.style.display = 'block';
  document.getElementById('transit-input').value = '';
  document.getElementById('transit-coords').dataset.lat = '';
  document.getElementById('transit-coords').dataset.lon = '';
  if (transitMarker) {
    map.removeLayer(transitMarker);
    transitMarker = null;
  }
};

// Auto-recalculate route when travel mode changes
document.querySelectorAll('input[name="travel_mode"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const startLon = document.getElementById('start-coords').dataset.lon;
    const endLon = document.getElementById('end-coords').dataset.lon;
    if (startLon && endLon) {
      getRoute();
    }
  });
});

// Fungsi Memanggil API Routing ke Node.js Backend
async function getRoute() {
  const startLat = parseFloat(document.getElementById('start-coords').dataset.lat);
  const startLon = parseFloat(document.getElementById('start-coords').dataset.lon);
  const endLat = parseFloat(document.getElementById('end-coords').dataset.lat);
  const endLon = parseFloat(document.getElementById('end-coords').dataset.lon);
  
  // Ambil mode transportasi
  const mode = document.querySelector('input[name="travel_mode"]:checked').value;
  
  if(isNaN(startLon) || isNaN(startLat) || isNaN(endLon) || isNaN(endLat)) {
    alert('Silakan tentukan Lokasi Awal dan Tujuan terlebih dahulu.');
    return;
  }

  // Validasi Geografis (Batas Kota Padang)
  function validateLocation(lat, lon, label) {
    // Batas Kasar Kota Padang
    if (lat > -0.70 || lat < -1.10 || lon > 100.55 || lon < 100.20) {
      alert('Maaf, ' + label + ' berada di luar area Kota Padang. Sistem hanya melayani rute di Padang saja.');
      return false;
    }
    return true;
  }

  if (!validateLocation(startLat, startLon, 'Titik Awal')) return;
  if (!validateLocation(endLat, endLon, 'Titik Tujuan')) return;

  const payload = { startLon, startLat, endLon, endLat, mode };

  if(navigator.vibrate) navigator.vibrate(20);
  try {
    const btn = document.getElementById('btn-route');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';
    btn.classList.add('btn-loading');
    btn.disabled = true;
    
    showDynamicIsland("Mencari Rute Terbaik...");

    let geoJsonData;
    const transitLat = parseFloat(document.getElementById('transit-coords').dataset.lat);
    const transitLon = parseFloat(document.getElementById('transit-coords').dataset.lon);

    if (!isNaN(transitLat) && !isNaN(transitLon)) {
      if (!validateLocation(transitLat, transitLon, 'Titik Transit')) {
        btn.innerHTML = originalText;
        btn.classList.remove('btn-loading');
        btn.disabled = false;
        return;
      }
      
      // Ada transit
      const payload1 = { startLon, startLat, endLon: transitLon, endLat: transitLat, mode };
      const payload2 = { startLon: transitLon, startLat: transitLat, endLon, endLat, mode };
      
      const res1 = await fetch('/api/routes/interactive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload1) });
      const res2 = await fetch('/api/routes/interactive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload2) });
      
      if (!res1.ok || !res2.ok) throw new Error('Gagal mendapatkan rute transit dari server');
      const data1 = await res1.json();
      const data2 = await res2.json();
      
      geoJsonData = {
        type: "FeatureCollection",
        features: [...data1.features, ...data2.features],
        summary: {
          totalTime: "Multi-stop",
          totalDistance: "Transit",
          steps: [
            ...data1.summary.steps, 
            {id: 'transit', icon: 'fa-location-dot', text: '<b style="color:#f59e0b;">Tiba di Titik Transit</b>', dist: '', time: ''}, 
            ...data2.summary.steps
          ]
        }
      };
    } else {
      const response = await fetch('/api/routes/interactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if(!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Server error');
      }

      geoJsonData = await response.json();
    }
    
    if (routeLayer) map.removeLayer(routeLayer);
    
    // Simpan reference setiap layer by ID untuk efek hover
    const layersMap = {};

    routeLayer = L.featureGroup().addTo(map);
    
    geoJsonData.features.forEach(feature => {
      let color = "#ef4444";
      let isWalk = false;
      let weight = 5;
      
      switch(feature.properties.type) {
        case 'walk': color = "#6b7280"; isWalk = true; break;
        case 'motor': color = "#16a34a"; break;
        case 'car': color = "#ca8a04"; break;
        case 'bus': color = "#2563eb"; weight = 7; break;
      }
      
      // GeoJSON: [lon, lat] -> Leaflet: [lat, lon]
      const latlngs = feature.geometry.coordinates.map(c => [c[1], c[0]]);
      
      // Membuat AntPath (Efek Rute Mengalir)
      const antPolyline = L.polyline.antPath(latlngs, {
        "delay": isWalk ? 800 : 400,
        "dashArray": [10, 20],
        "weight": weight,
        "color": color,
        "pulseColor": "#FFFFFF",
        "paused": false,
        "reverse": false,
        "hardwareAccelerated": true
      });
      
      if(feature.properties && feature.properties.description) {
        antPolyline.bindTooltip(`<b>${feature.properties.description}</b>`, { permanent: false, direction: 'auto', className: 'custom-tooltip' });
      }
      
      if (feature.properties.id) {
        layersMap[feature.properties.id] = antPolyline;
      }
      
      antPolyline.addTo(routeLayer);
    });
    
    map.fitBounds(routeLayer.getBounds(), { padding: [50, 50], maxZoom: 16 });
    
    // Tampilkan Summary di Bottom Sheet
    if (geoJsonData.summary) {
      const sheet = document.getElementById('bottom-sheet');
      sheet.classList.remove('minimized');
      sheet.classList.add('active');

      document.getElementById('rp-time').innerText = geoJsonData.summary.totalTime;
      document.getElementById('rp-dist').innerText = geoJsonData.summary.totalDistance;
      
      const timelineObj = document.getElementById('rp-timeline');
      timelineObj.innerHTML = '';
      
      geoJsonData.summary.steps.forEach((step, index) => {
        const stepDiv = document.createElement('div');
        stepDiv.className = `timeline-step step-animated ${step.id.includes('walk') ? 'walk' : ''}`;
        stepDiv.style.animationDelay = `${index * 0.15}s`;
        stepDiv.innerHTML = `
          <div class="step-icon"><i class="fa-solid ${step.icon}"></i></div>
          <div class="step-text">${step.text}</div>
          <div class="step-meta">${step.dist} &bull; ${step.time}</div>
        `;

        // Interaksi Hover
        stepDiv.addEventListener('mouseenter', () => {
          if (layersMap[step.id]) {
            const originalWeight = layersMap[step.id].options.weight;
            layersMap[step.id].setStyle({ weight: originalWeight + 4, opacity: 1, pulseColor: '#fef08a' });
          }
        });
        stepDiv.addEventListener('mouseleave', () => {
          if (layersMap[step.id]) {
            const originalWeight = step.id.includes('bus') ? 7 : 5;
            layersMap[step.id].setStyle({ weight: originalWeight, opacity: 1, pulseColor: '#FFFFFF' });
          }
        });

        timelineObj.appendChild(stepDiv);
      });
      
      // Panggil Voice Navigation
      if (window.speakNarrative) {
        window.speakNarrative(geoJsonData.summary.steps);
      }
    }

    btn.innerHTML = originalText;
    btn.disabled = false;

    
    // Restore button state
    const btnEnd = document.getElementById('btn-route');
    if (btnEnd && btnEnd.classList.contains('btn-loading')) {
      btnEnd.innerHTML = '<i class="fa-solid fa-route"></i> Cari Rute';
      btnEnd.classList.remove('btn-loading');
      btnEnd.disabled = false;
    }

  } catch (error) {
    console.error('Routing Error:', error);
    alert(error.message || 'Terjadi kesalahan saat mencari rute.');
    
    // Restore button state on error
    const btnErr = document.getElementById('btn-route');
    if (btnErr && btnErr.classList.contains('btn-loading')) {
      btnErr.innerHTML = '<i class="fa-solid fa-route"></i> Cari Rute';
      btnErr.classList.remove('btn-loading');
      btnErr.disabled = false;
    }
  }
}

window.speakNarrative = function(steps) {
  if (!('speechSynthesis' in window)) return;
  
  let fullNarrative = "Rute ditemukan. ";
  
  steps.forEach(step => {
    // Hilangkan tag HTML jika ada (seperti <b>)
    let cleanText = step.text.replace(/<[^>]*>?/gm, '');
    fullNarrative += cleanText + ". ";
  });

  const utterance = new SpeechSynthesisUtterance(fullNarrative);
  utterance.lang = 'id-ID';
  utterance.rate = 1.0;
  utterance.pitch = 1.1;
  window.speechSynthesis.speak(utterance);
};

// Fungsi Global untuk Setting Halte dari Popup
window.setStartFromHalte = function(lat, lon, name) {
  document.getElementById('start-input').value = name;
  document.getElementById('start-coords').dataset.lat = lat;
  document.getElementById('start-coords').dataset.lon = lon;
  
  if (userMarker) map.removeLayer(userMarker);
  userMarker = L.marker([lat, lon]).addTo(map).bindPopup("Titik Awal").openPopup();
  
  if (document.getElementById('end-coords').dataset.lon) getRoute();
  map.closePopup();
};

window.closeBottomSheet = function() {
  if(navigator.vibrate) navigator.vibrate(10);
  const sheet = document.getElementById('bottom-sheet');
  sheet.classList.remove('active');
  sheet.classList.add('minimized');
};

window.expandBottomSheet = function() {
  const sheet = document.getElementById('bottom-sheet');
  if (sheet.classList.contains('minimized')) {
    if(navigator.vibrate) navigator.vibrate(10);
    sheet.classList.remove('minimized');
    sheet.classList.add('active');
  }
};

window.setEndFromHalte = function(lat, lon, name) {
  document.getElementById('end-input').value = name;
  document.getElementById('end-coords').dataset.lat = lat;
  document.getElementById('end-coords').dataset.lon = lon;
  
  if (destinationMarker) map.removeLayer(destinationMarker);
  destinationMarker = L.marker([lat, lon], {icon: L.divIcon({className: 'fa-solid fa-flag-checkered', html: '<i class="fa-solid fa-flag-checkered text-danger" style="font-size:24px;"></i>', iconSize:[24,24], iconAnchor:[12,24]})}).addTo(map).bindPopup("Tujuan").openPopup();
  
  if (document.getElementById('start-coords').dataset.lon) getRoute();
  map.closePopup();
};




// Fungsi menampilkan semua Halte di awal
async function loadHaltes() {
  try {
    const res = await fetch('/api/haltes');
    if (res.ok) {
      const geojson = await res.json();
      L.geoJSON(geojson, {
        pointToLayer: function(feature, latlng) {
          const halteIcon = L.divIcon({ 
            html: '<i class="fa-solid fa-bus" style="color:#ffffff; background:#eab308; padding:5px; border-radius:50%; border:2px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.4);"></i>', 
            className: 'halte-icon', 
            iconSize: [30, 30], 
            iconAnchor: [15, 15] 
          });
          return L.marker(latlng, {icon: halteIcon});
        },
        onEachFeature: function(feature, layer) {
          const props = feature.properties;
          const lat = layer.getLatLng().lat;
          const lon = layer.getLatLng().lng;
          
          const popupContent = `
            <div style="text-align:center; min-width:160px;">
              <h3 style="margin:0 0 5px 0; font-size:14px; color:var(--text-main);">${props.nama_halte}</h3>
              <p style="margin:0 0 10px 0; font-size:12px; color:#666;">Koridor ${props.koridor}</p>
              
              <div style="display:flex; flex-direction:column; gap:5px; margin-bottom: 8px;">
                <button onclick="setStartFromHalte(${lat}, ${lon}, '${props.nama_halte}')" style="background:#2563eb; color:white; border:none; padding:5px; border-radius:4px; cursor:pointer;"><i class="fa-solid fa-location-dot"></i> Set Awal</button>
                <button onclick="setEndFromHalte(${lat}, ${lon}, '${props.nama_halte}')" style="background:#dc2626; color:white; border:none; padding:5px; border-radius:4px; cursor:pointer;"><i class="fa-solid fa-flag-checkered"></i> Set Tujuan</button>
              </div>
            </div>
          `;
          layer.bindPopup(popupContent);
          
          // Tambahkan Tooltip untuk hover info
          layer.bindTooltip(`<b>${props.nama_halte}</b><br>Koridor ${props.koridor}`);
        }
      }).addTo(map);
    }
  } catch(e) {
    console.error('Gagal memuat halte', e);
  }
}

// Fungsi GPS Lokasi Pengguna
function locateUser() {
  if(navigator.vibrate) navigator.vibrate(15);
  if (!navigator.geolocation) {
    alert('Geolocation tidak didukung browser ini.');
    return;
  }
  
  showDynamicIsland("Mencari Lokasi GPS...");
  
  navigator.geolocation.getCurrentPosition((pos) => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    
    document.getElementById('start-input').value = 'Lokasi Saat Ini (GPS)';
    document.getElementById('start-coords').dataset.lat = lat;
    document.getElementById('start-coords').dataset.lon = lon;
    
    if (userMarker) map.removeLayer(userMarker);
    
    // Gunakan animasi Pulse untuk GPS
    const pulseIcon = L.divIcon({
      className: 'pulse-icon',
      html: '<div class="pulse-dot"></div><div class="pulse-ring"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    
    userMarker = L.marker([lat, lon], {icon: pulseIcon}).addTo(map).bindPopup("Lokasi Anda").openPopup();
    map.setView([lat, lon], 15);
    
    if (document.getElementById('end-coords').dataset.lon) getRoute();
  }, () => {
    alert('Gagal mengambil lokasi GPS.');
  });
}

// Fitur Reset Rute
function resetRoute() {
  if(userMarker) map.removeLayer(userMarker);
  if(destinationMarker) map.removeLayer(destinationMarker);
  if(routeLayer) map.removeLayer(routeLayer);
  
  userMarker = null;
  destinationMarker = null;
  routeLayer = null;

  document.getElementById('start-input').value = '';
  document.getElementById('end-input').value = '';
  document.getElementById('start-coords').dataset.lat = '';
  document.getElementById('start-coords').dataset.lon = '';
  document.getElementById('end-coords').dataset.lat = '';
  document.getElementById('end-coords').dataset.lon = '';
  
  document.getElementById('route-summary').style.display = 'none';
  
  map.setView([-0.9471, 100.3658], 13);
}

// Jalankan saat pertama kali dimuat
loadHaltes();
