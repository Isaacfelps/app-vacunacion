/* Dashboard Logic - Vacunación Antirrábica Putumayo (AntiGravity) */
let allData = [];
let filteredData = [];
let currentYear = 'TODOS';
let currentMunicipio = null;
let currentPage = 1;
let searchTerm = '';

let unknownData = [];
let filteredUnknownData = [];
let currentMunicipioUnknown = null;
let currentPageUnknown = 1;
let searchTermUnknown = '';

const PAGE_SIZE = 50;

let barChartInstance = null;
let pieChartInstance = null;
let mapInstance = null;

const MUNICIPIO_COORDS = {
  'MOCOA': [1.1494, -76.6497],
  'PUERTO ASÍS': [0.5045, -76.5008],
  'VALLE DEL GUAMUEZ': [0.4183, -76.9061],
  'LA HORMIGA': [0.4183, -76.9061],
  'ORITO': [0.6661, -76.8736],
  'PUERTO LEGUÍZAMO': [-0.1936, -74.7811],
  'PUERTO LEGUIZAMO': [-0.1936, -74.7811],
  'VILLAGARZÓN': [1.0308, -76.6177],
  'VILLAGARZON': [1.0308, -76.6177],
  'PUERTO GUZMÁN': [0.9667, -76.4167],
  'PUERTO GUZMAN': [0.9667, -76.4167],
  'SAN MIGUEL': [0.3333, -76.8833],
  'SIBUNDOY': [1.2048, -76.9188],
  'PUERTO CAICEDO': [0.6839, -76.6133],
  'COLÓN': [1.1939, -76.9667],
  'COLON': [1.1939, -76.9667],
  'SANTIAGO': [1.1464, -76.9564],
  'SAN FRANCISCO': [1.1806, -76.8822],
};

const CANONICAL = {
  'LA HORMIGA': 'VALLE DEL GUAMUEZ',
  'PUERTO LEGUIZAMO': 'PUERTO LEGUÍZAMO',
  'VILLAGARZON': 'VILLAGARZÓN',
  'PUERTO GUZMAN': 'PUERTO GUZMÁN',
  'COLON': 'COLÓN'
};

async function loadData() {
  try {
    if (window.vaccinationData) {
        allData = window.vaccinationData;
        filteredData = [...allData];
        unknownData = window.unknownAnimalData || [];
        filteredUnknownData = [...unknownData];
        initDashboard();
    } else {
        throw new Error("No se pudo leer data.js");
    }
  } catch (e) {
    console.error('Error loading data:', e);
    const loading = document.getElementById('loading');
    if (loading) loading.innerHTML = '<p style="color:#ff4b4b;">Error al cargar datos. Asegúrese de que data.js haya sido generado correctamente.</p>';
  }
}

function initDashboard() {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('dashboard').style.display = 'flex';
  
  // Binding year filter
  document.getElementById('year-filter').addEventListener('change', (e) => {
    currentYear = e.target.value;
    currentMunicipio = null;
    currentPage = 1;
    applyFilters();
  });

  // Binding search filter
  document.getElementById('search-input').addEventListener('input', (e) => {
    searchTerm = e.target.value;
    currentPage = 1;
    applyFilters();
  });

  const searchUnknown = document.getElementById('search-input-unknown');
  if (searchUnknown) {
      searchUnknown.addEventListener('input', (e) => {
        searchTermUnknown = e.target.value;
        currentPageUnknown = 1;
        applyFiltersUnknown();
      });
  }

  applyFilters();
  applyFiltersUnknown();
}

function applyFilters() {
  if (currentYear === 'TODOS') {
    filteredData = [...allData];
  } else {
    const y = parseInt(currentYear);
    filteredData = allData.filter(r => r.año === y);
  }
  
  if (searchTerm) {
    const s = searchTerm.toLowerCase();
    filteredData = filteredData.filter(r =>
      (r.nombre_propietario||'').toLowerCase().includes(s) ||
      (r.identificacion||'').toLowerCase().includes(s) ||
      (r.nombre_animal||'').toLowerCase().includes(s) ||
      (r.municipio||'').toLowerCase().includes(s) ||
      (r.id||'').toLowerCase().includes(s)
    );
  }
  
  updateKPIs();
  updateCharts();
  renderMunicipioList();
  renderTable();
  updateNotifications();
}

function getCanonicalMuni(m) {
  const upper = (m || 'DESCONOCIDO').toUpperCase();
  return CANONICAL[upper] || upper;
}

function getMuniCounts() {
  const counts = {};
  filteredData.forEach(r => {
    const m = getCanonicalMuni(r.municipio);
    counts[m] = (counts[m] || 0) + 1;
  });
  return counts;
}

function updateKPIs() {
  const total = filteredData.length;
  const perros = filteredData.filter(r => (r.especie||'').includes('PERRO') || (r.especie||'').includes('CANINO')).length;
  const gatos = filteredData.filter(r => (r.especie||'').includes('GATO') || (r.especie||'').includes('FELINO')).length;
  const cedulas = new Set(filteredData.map(r => r.identificacion).filter(Boolean)).size;

  animateValue('kpi-total', total);
  animateValue('kpi-dogs', perros);
  animateValue('kpi-cats', gatos);
  animateValue('kpi-ids', cedulas);
}

function animateValue(id, target, append = '') {
  const el = document.getElementById(id);
  if (!el) return;
  const start = parseInt(el.textContent.replace(/\D/g,'')) || 0;
  const duration = 600;
  const startTime = performance.now();
  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + (target - start) * eased);
    el.textContent = current.toLocaleString('es-CO') + append;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function updateCharts() {
  const counts = getMuniCounts();
  const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 10);

  Chart.defaults.color = '#627D98';
  Chart.defaults.font.family = "'Inter', sans-serif";

  // Bar Chart
  const barCtx = document.getElementById('barChart').getContext('2d');
  if (barChartInstance) barChartInstance.destroy();
  barChartInstance = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: sorted.map(s => s[0]),
      datasets: [{
        label: 'Vacunados',
        data: sorted.map(s => s[1]),
        backgroundColor: 'rgba(100, 255, 218, 0.6)',
        borderColor: '#64ffda',
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(136, 146, 176, 0.1)' } },
        x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45, font: { size: 10 } } }
      }
    }
  });

  // Pie Chart
  const perros = filteredData.filter(r => (r.especie||'').includes('PERRO') || (r.especie||'').includes('CANINO')).length;
  const gatos = filteredData.filter(r => (r.especie||'').includes('GATO') || (r.especie||'').includes('FELINO')).length;
  const otros = filteredData.length - perros - gatos;
  
  const pieCtx = document.getElementById('pieChart').getContext('2d');
  if (pieChartInstance) pieChartInstance.destroy();
  pieChartInstance = new Chart(pieCtx, {
    type: 'doughnut',
    data: {
      labels: ['PERROS', 'GATOS', 'OTROS'],
      datasets: [{
        data: [perros, gatos, otros],
        backgroundColor: ['rgba(100, 255, 218, 0.7)', 'rgba(13, 202, 240, 0.7)', 'rgba(68, 138, 255, 0.7)'],
        borderColor: ['#64ffda', '#0dcaf0', '#448aff'],
        borderWidth: 1, hoverOffset: 4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '70%',
      plugins: { legend: { position: 'bottom', labels: { color: '#334E68', padding: 20, font: { weight: 'bold' } } } }
    }
  });
}

function renderMunicipioList() {
  const counts = getMuniCounts();
  const uniqueNames = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const container = document.getElementById('municipalities-container');
  container.innerHTML = '';
  
  uniqueNames.forEach(m => {
    const div = document.createElement('div');
    div.className = 'municipality-item' + (currentMunicipio === m ? ' active' : '');
    const chevronClass = currentMunicipio === m ? 'fa-chevron-down' : 'fa-chevron-right';
    
    div.innerHTML = `
        <div class="m-info" style="display:flex;align-items:center;">
            <i class="fa-solid ${chevronClass}" style="font-size: 0.7rem; margin-right: 8px; color: ${currentMunicipio === m ? 'var(--accent-green)' : 'var(--text-secondary)'}"></i>
            <span class="m-name">${m}</span>
        </div>
        <span class="m-badge">${(counts[m]||0).toLocaleString('es-CO')}</span>
    `;
    
    div.onclick = () => {
      currentMunicipio = currentMunicipio === m ? null : m;
      currentPage = 1;
      renderMunicipioList();
      renderTable();
    };
    container.appendChild(div);
  });
}

function getTableData() {
  let data = filteredData;
  if (currentMunicipio) {
    data = data.filter(r => getCanonicalMuni(r.municipio) === currentMunicipio);
  }
  data.sort((a,b) => (a.identificacion||'').localeCompare(b.identificacion||''));
  return data;
}

function renderTable() {
  const data = getTableData();
  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageData = data.slice(start, start + PAGE_SIZE);
  
  const tbody = document.getElementById('records-tbody');
  tbody.innerHTML = '';
  
  if (pageData.length === 0) {
    const emptyMsg = searchTerm ? 'No se encontraron resultados para la búsqueda.' : 'Seleccione un municipio o ajuste los filtros.';
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-secondary); padding: 3rem;">
      <i class="fa-solid fa-folder-open" style="font-size: 3rem; opacity: 0.2; margin-bottom: 1rem; display: block;"></i>
      ${emptyMsg}
    </td></tr>`;
  } else {
    pageData.forEach(r => {
      let statusClass = 'status-vigente';
      if (r.estado === 'VENCIDA') statusClass = 'status-vencida';
      if (r.estado === 'POR VENCER') statusClass = 'status-por-vencer';
      
      const isDog = (r.especie||'').toUpperCase().includes('PERRO') || (r.especie||'').toUpperCase().includes('CANINO');
      const icon = isDog ? 'fa-dog' : 'fa-cat';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family: monospace;">${r.identificacion||r.id||'-'}</td>
        <td style="font-weight: 500; color: var(--text-bright);">${r.nombre_propietario||'-'}</td>
        <td>${r.nombre_animal||'-'}</td>
        <td><i class="fa-solid ${icon}" style="color: var(--text-secondary); margin-right: 5px;"></i> ${r.especie||'-'}</td>
        <td>${r.año||'-'}</td>
        <td>${r.fecha||'-'}</td>
        <td><span class="status-badge ${statusClass}">${r.estado||'-'}</span></td>
        <td>
          <button class="action-btn" onclick='showFicha(${JSON.stringify(r).replace(/'/g,"&#39;")})' title="Ver Ficha"><i class="fa-solid fa-file-medical"></i></button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Title update
  const titleEl = document.getElementById('table-title');
  titleEl.innerHTML = currentMunicipio 
    ? `<i class="fa-solid fa-list"></i> REGISTROS EN ${currentMunicipio} (${data.length.toLocaleString('es-CO')})` 
    : `<i class="fa-solid fa-list"></i> LISTADO DETALLADO DE REGISTROS (${data.length.toLocaleString('es-CO')})`;

  // Pagination
  const pag = document.getElementById('pagination');
  pag.innerHTML = '';
  if (totalPages > 1) {
    if (currentPage > 1) {
      const prev = document.createElement('button');
      prev.className = 'page-btn'; prev.innerHTML = '<i class="fa-solid fa-chevron-left"></i> Anterior';
      prev.onclick = () => { currentPage--; renderTable(); };
      pag.appendChild(prev);
    }
    const info = document.createElement('span');
    info.className = 'page-info'; info.textContent = `Pág. ${currentPage} de ${totalPages}`;
    pag.appendChild(info);
    if (currentPage < totalPages) {
      const next = document.createElement('button');
      next.className = 'page-btn'; next.innerHTML = 'Siguiente <i class="fa-solid fa-chevron-right"></i>';
      next.onclick = () => { currentPage++; renderTable(); };
      pag.appendChild(next);
    }
  }
}

  function applyFiltersUnknown() {
    if (searchTermUnknown) {
      const s = searchTermUnknown.toLowerCase();
      filteredUnknownData = unknownData.filter(r =>
        (r.MUNICIPIO||'').toLowerCase().includes(s) ||
        (r.ESPECIE||'').toLowerCase().includes(s) ||
        (r.ESTADO_SALUD_APARENTE||'').toLowerCase().includes(s)
      );
    } else {
      filteredUnknownData = [...unknownData];
    }
    
    renderMunicipioListUnknown();
    renderTableUnknown();
  }
  
  function getMuniCountsUnknown() {
    const counts = {};
    filteredUnknownData.forEach(r => {
      const m = getCanonicalMuni(r.MUNICIPIO);
      counts[m] = (counts[m] || 0) + 1;
    });
    return counts;
  }
  
  function renderMunicipioListUnknown() {
    const counts = getMuniCountsUnknown();
    const uniqueNames = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const container = document.getElementById('municipalities-container-unknown');
    if(!container) return;
    container.innerHTML = '';
    
    uniqueNames.forEach(m => {
      const div = document.createElement('div');
      div.className = 'municipality-item' + (currentMunicipioUnknown === m ? ' active' : '');
      const chevronClass = currentMunicipioUnknown === m ? 'fa-chevron-down' : 'fa-chevron-right';
      
      div.innerHTML = `
          <div class="m-info" style="display:flex;align-items:center;">
              <i class="fa-solid ${chevronClass}" style="font-size: 0.7rem; margin-right: 8px; color: ${currentMunicipioUnknown === m ? 'var(--accent-red)' : 'var(--text-secondary)'}"></i>
              <span class="m-name">${m}</span>
          </div>
          <span class="m-badge">${(counts[m]||0).toLocaleString('es-CO')}</span>
      `;
      
      div.onclick = () => {
        currentMunicipioUnknown = currentMunicipioUnknown === m ? null : m;
        currentPageUnknown = 1;
        renderMunicipioListUnknown();
        renderTableUnknown();
      };
      container.appendChild(div);
    });
  }
  
  function getTableDataUnknown() {
    let data = filteredUnknownData;
    if (currentMunicipioUnknown) {
      data = data.filter(r => getCanonicalMuni(r.MUNICIPIO) === currentMunicipioUnknown);
    }
    return data;
  }
  
  function renderTableUnknown() {
    const data = getTableDataUnknown();
    const totalPages = Math.ceil(data.length / PAGE_SIZE) || 1;
    const start = (currentPageUnknown - 1) * PAGE_SIZE;
    const pageData = data.slice(start, start + PAGE_SIZE);
    
    const tbody = document.getElementById('records-tbody-unknown');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    if (pageData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 3rem;">
        No hay registros.
      </td></tr>`;
    } else {
      pageData.forEach(r => {
        const isDog = (r.ESPECIE||'').toUpperCase().includes('PERRO') || (r.ESPECIE||'').toUpperCase().includes('CANINO');
        const icon = isDog ? 'fa-dog' : 'fa-cat';
  
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="font-family: monospace;">${r.ANIMAL_CALLE_ID||'-'}</td>
          <td><i class="fa-solid ${icon}" style="color: var(--text-secondary); margin-right: 5px;"></i> ${r.ESPECIE||'-'}</td>
          <td>${r.MUNICIPIO||'-'}</td>
          <td>${r.FECHA_REGISTRO||'-'}</td>
          <td><span class="status-badge" style="background: rgba(255, 75, 75, 0.1); color: #ff4b4b; border-color: rgba(255, 75, 75, 0.2)">${r.ESTADO_SALUD_APARENTE||'-'}</span></td>
          <td>
            <button class="action-btn" onclick='showFichaUnknown(${JSON.stringify(r).replace(/'/g,"&#39;")})' title="Ver Ficha Animal Desconocido"><i class="fa-solid fa-file-medical"></i></button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  
    const titleEl = document.getElementById('table-title-unknown');
    if(titleEl) {
      titleEl.innerHTML = currentMunicipioUnknown 
        ? `<i class="fa-solid fa-triangle-exclamation"></i> REGISTRO DE APTR ANIMAL DESCONOCIDO - ${currentMunicipioUnknown} (${data.length.toLocaleString('es-CO')})` 
        : `<i class="fa-solid fa-triangle-exclamation"></i> REGISTRO DE APTR ANIMAL DESCONOCIDO (${data.length.toLocaleString('es-CO')})`;
    }
  
    const pag = document.getElementById('pagination-unknown');
    if(!pag) return;
    pag.innerHTML = '';
    if (totalPages > 1) {
      if (currentPageUnknown > 1) {
        const prev = document.createElement('button');
        prev.className = 'page-btn'; prev.innerHTML = '<i class="fa-solid fa-chevron-left"></i> Anterior';
        prev.onclick = () => { currentPageUnknown--; renderTableUnknown(); };
        pag.appendChild(prev);
      }
      const info = document.createElement('span');
      info.className = 'page-info'; info.textContent = `Pág. ${currentPageUnknown} de ${totalPages}`;
      pag.appendChild(info);
      if (currentPageUnknown < totalPages) {
        const next = document.createElement('button');
        next.className = 'page-btn'; next.innerHTML = 'Siguiente <i class="fa-solid fa-chevron-right"></i>';
        next.onclick = () => { currentPageUnknown++; renderTableUnknown(); };
        pag.appendChild(next);
      }
    }
  }

function updateNotifications() {
  const porVencer = filteredData.filter(r => r.estado === 'POR VENCER').length;
  const vencidas = filteredData.filter(r => r.estado === 'VENCIDA').length;
  const unknown = window.unknownAnimalCount || 0;
  
  document.getElementById('alert-porvencer').textContent = porVencer.toLocaleString('es-CO');
  document.getElementById('alert-vencidas').textContent = vencidas.toLocaleString('es-CO');
  document.getElementById('alert-unknown').textContent = unknown.toLocaleString('es-CO');
}



function showFichaUnknown(record) {
  const modal = document.getElementById('modal-overlay');
  document.getElementById('modal-title').innerHTML = '<i class="fa-solid fa-file-medical"></i> FICHA ANIMAL DESCONOCIDO';
  const body = document.getElementById('modal-body');
  
  let fotoHtml = '';
  if (record.foto) {
    fotoHtml = `<div class="modal-row" style="justify-content: center; margin-bottom: 15px;">
        <img src="${record.foto}" alt="Foto Animal" style="max-width: 100%; max-height: 250px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
    </div>`;
  }

  body.innerHTML = fotoHtml + `
    <div class="modal-row"><span class="modal-label">ID ANIMAL CALLE:</span><span class="modal-value" style="font-family:monospace; opacity:0.8">${record.ANIMAL_CALLE_ID||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">FECHA REGISTRO:</span><span class="modal-value" style="color:var(--text-bright); font-weight:600">${record.FECHA_REGISTRO||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">MUNICIPIO:</span><span class="modal-value">${record.MUNICIPIO||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">CORREGIMIENTO/INSP:</span><span class="modal-value">${record.CORREGIMIENTO_INSPECCION||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">BARRIO:</span><span class="modal-value">${record.BARRIO||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">VEREDA:</span><span class="modal-value">${record.VEREDA||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">ZONA/FRECUENCIA:</span><span class="modal-value">${record.ZONA_FRECUENCIA||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">ESPECIE:</span><span class="modal-value">${record.ESPECIE||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">RAZA/FENOTIPO:</span><span class="modal-value">${record.RAZA_FENOTIPO||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">DESCRIPCIÓN FÍSICA:</span><span class="modal-value">${record.DESCRIPCION_FISICA||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">TAMAÑO ESTIMADO:</span><span class="modal-value">${record.TAMANO_ESTIMADO||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">EDAD APROXIMADA:</span><span class="modal-value">${record.EDAD_APROXIMADA||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">GÉNERO:</span><span class="modal-value">${record.GENERO||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">ESTADO SALUD:</span><span class="modal-value" style="color:var(--text-bright); font-weight:600">${record.ESTADO_SALUD_APARENTE||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">ANTECEDENTE AGRESOR:</span><span class="modal-value">${record.ANTECEDENTE_AGRESOR||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">NÚMERO AGRESIONES:</span><span class="modal-value">${record['NUMERO DE AGRESIONES']||record.NUMERO_DE_AGRESIONES||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">DETALLES AGRESIÓN:</span><span class="modal-value">${record.DETALLES_AGRESION||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">FUNCIONARIO:</span><span class="modal-value">${record.FUNCIONARIO||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">OBSERVACIONES:</span><span class="modal-value">${record.OBSERVACIONES_GENERALES||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">GEOREFERENCIACIÓN:</span><span class="modal-value">${record.GEOREFERENCIACION||'-'}</span></div>
  `;
  modal.classList.add('show');
}

function showFicha(record) {
  const modal = document.getElementById('modal-overlay');
  document.getElementById('modal-title').innerHTML = '<i class="fa-solid fa-file-medical"></i> FICHA DE VACUNACIÓN';
  const body = document.getElementById('modal-body');
  body.innerHTML = `
    <div class="modal-row"><span class="modal-label">ENTIDAD:</span><span class="modal-value">${record.entidad||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">MUNICIPIO:</span><span class="modal-value">${record.municipio||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">BARRIO:</span><span class="modal-value">${record.barrio||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">VEREDA:</span><span class="modal-value">${record.vereda||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">PROPIETARIO:</span><span class="modal-value">${record.nombre_propietario||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">IDENTIFICACIÓN:</span><span class="modal-value">${record.identificacion||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">TELÉFONO:</span><span class="modal-value">${record.telefono||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">MASCOTA:</span><span class="modal-value">${record.nombre_animal||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">ESPECIE:</span><span class="modal-value">${record.especie||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">EDAD:</span><span class="modal-value">${record.edad||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">GÉNERO:</span><span class="modal-value">${record.genero||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">VACUNADOR:</span><span class="modal-value">${record.vacunador||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">FECHA APLICADA:</span><span class="modal-value" style="color:var(--text-bright); font-weight:600">${record.fecha||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">ESTADO ACTUAL:</span><span class="modal-value" style="color:var(--text-bright); font-weight:600">${record.estado||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">ID SISTEMA:</span><span class="modal-value" style="font-family:monospace; opacity:0.8">${record.id||'-'}</span></div>
  `;
  modal.classList.add('show');
}

function showMordedura(record) {
  const modal = document.getElementById('modal-overlay');
  document.getElementById('modal-title').innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> REPORTE DE MORDEDURA DE CASO CONOCIDO';
  const body = document.getElementById('modal-body');
  body.innerHTML = `
    <div style="padding:16px;background:rgba(255,75,75,0.1);border:1px solid rgba(255,75,75,0.3);border-radius:12px;margin-bottom:16px">
      <p style="color:#ff4b4b;font-weight:700;margin-bottom:8px">INCIDENTE CON ANIMAL PREVIAMENTE VACUNADO</p>
      <p style="color:#8892b0;font-size:0.8rem">Acaba de iniciar el reporte en el sistema para este animal. Confirme la situación general.</p>
    </div>
    <div class="modal-row"><span class="modal-label">ANIMAL:</span><span class="modal-value">${record.nombre_animal||'-'} (${record.especie||'-'})</span></div>
    <div class="modal-row"><span class="modal-label">PROPIETARIO:</span><span class="modal-value">${record.nombre_propietario||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">IDENTIFICACIÓN:</span><span class="modal-value">${record.identificacion||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">MUNICIPIO:</span><span class="modal-value">${record.municipio||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">ÚLTIMA VACUNA:</span><span class="modal-value">${record.fecha||'-'}</span></div>
    <div class="modal-row"><span class="modal-label">ESTADO VACUNA:</span><span class="modal-value" style="font-weight:bold">${record.estado||'-'}</span></div>
    <div style="margin-top:16px;text-align:center">
      <button id="btn-notify-known" class="btn-emergency" style="animation:none;max-width:300px;margin:auto"><i class="fa-solid fa-paper-plane"></i> NOTIFICAR SEGUIMIENTO</button>
    </div>
  `;
  
  document.getElementById('btn-notify-known').onclick = (e) => {
    const subject = "📝 ALERTA SEGUIMIENTO MORDEDURA - CASO CONOCIDO";
    const bodyText = 
      `Se solicita seguimiento urgente para el siguiente caso:\n\n` +
      `ANIMAL: ${record.nombre_animal||'-'} (${record.especie||'-'})\n` +
      `PROPIETARIO: ${record.nombre_propietario||'-'}\n` +
      `IDENTIFICACIÓN: ${record.identificacion||'-'}\n` +
      `MUNICIPIO: ${record.municipio||'-'}\n` +
      `ÚLTIMA VACUNA: ${record.fecha||'-'}\n` +
      `ESTADO VACUNA: ${record.estado||'-'}\n\n` +
      `Por favor, iniciar protocolo de seguimiento respectivo.`;
    
    sendAutomaticEmail(e.currentTarget, subject, bodyText);
  };
  
  modal.classList.add('show');
}

function showEmergencyReport() {
  const modal = document.getElementById('modal-overlay');
  document.getElementById('modal-title').innerHTML = '<i class="fa-solid fa-truck-medical"></i> REPORTE DE EMERGENCIA POR MORDEDURA (ANIMAL DESCONOCIDO)';
  const body = document.getElementById('modal-body');
  body.innerHTML = `
    <div style="padding:16px;background:rgba(255,75,75,0.1);border:1px solid rgba(255,75,75,0.3);border-radius:12px;margin-bottom:20px">
      <p style="color:#ff4b4b;font-weight:700;font-size:0.95rem">FORMULARIO RÁPIDO</p>
      <p style="color:#8892b0;font-size:0.8rem;margin-top:4px">Para casos donde el animal mordedor no está identificado en la base.</p>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px">
      <input id="em-nombre" class="styled-input" placeholder="Nombre de la víctima">
      <input id="em-id" class="styled-input" placeholder="Identificación de la víctima">
      <input id="em-muni" class="styled-input" placeholder="Municipio del incidente">
      <input id="em-fecha" class="styled-input" type="date">
      <textarea id="em-desc" class="styled-input" placeholder="Descripción del paciente / gravedad" rows="3" style="resize:vertical"></textarea>
    </div>
    <div style="margin-top:20px;text-align:center">
      <button id="btn-notify-unknown" class="btn-emergency" style="animation:none;max-width:300px;margin:auto"><i class="fa-solid fa-tower-broadcast"></i> GENERAR ALERTA</button>
    </div>
  `;
  
  document.getElementById('btn-notify-unknown').onclick = (e) => {
    const nombre = document.getElementById('em-nombre').value || '-';
    const id = document.getElementById('em-id').value || '-';
    const muni = document.getElementById('em-muni').value || '-';
    const fecha = document.getElementById('em-fecha').value || '-';
    const desc = document.getElementById('em-desc').value || '-';
    
    const subject = "🚨 EMERGENCIA DE MORDEDURA - ANIMAL DESCONOCIDO";
    const bodyText = 
      `ALERTA EPIDEMIOLÓGICA - ANIMAL NO IDENTIFICADO\n\n` +
      `VÍCTIMA: ${nombre}\n` +
      `IDENTIFICACIÓN: ${id}\n` +
      `MUNICIPIO: ${muni}\n` +
      `FECHA INCIDENTE: ${fecha}\n` +
      `DESCRIPCIÓN / GRAVEDAD:\n${desc}\n\n` +
      `Por favor activar la ruta de emergencia correspondiente.`;
      
    sendAutomaticEmail(e.currentTarget, subject, bodyText);
  };
  
  modal.classList.add('show');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('show');
}

const FORMSPREE_ENDPOINT = "AQUI_TU_ENLACE_DE_FORMSPREE"; // EJEMPLO: https://formspree.io/f/xyz123

async function sendAutomaticEmail(buttonEl, subject, bodyText) {
  if (FORMSPREE_ENDPOINT === "AQUI_TU_ENLACE_DE_FORMSPREE") {
    alert("⚠️ FALTA CONFIGURAR: Necesitas crear una cuenta en Formspree.io y colocar tu enlace en el código (app.js).");
    return;
  }

  const originalHTML = buttonEl.innerHTML;
  buttonEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ENVIANDO...';
  buttonEl.disabled = true;

  try {
    const response = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subject: subject,
        message: bodyText
      })
    });

    if (response.ok) {
      buttonEl.innerHTML = '<i class="fa-solid fa-check"></i> ¡ENVIADO!';
      buttonEl.style.background = '#4CAF50';
      buttonEl.style.borderColor = '#4CAF50';
      setTimeout(() => closeModal(), 2000);
    } else {
      throw new Error("Error en la respuesta");
    }
  } catch (err) {
    console.error(err);
    buttonEl.innerHTML = '<i class="fa-solid fa-xmark"></i> ERROR AL ENVIAR';
    buttonEl.style.background = 'var(--accent-red)';
    setTimeout(() => {
      buttonEl.innerHTML = originalHTML;
      buttonEl.disabled = false;
      buttonEl.style.background = '';
    }, 3000);
  }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', loadData);
