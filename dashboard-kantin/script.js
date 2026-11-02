/* ==========================================================
   Dashboard Kantin HSI-BS - script.js
   Integrasi lengkap: Flatpickr, Tom Select, Chart.js, 
   Tabulator, SweetAlert2, dan Floating UI.
   ========================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // --- 1. DATA SIMULASI ---
  let categories = [
    { id: 'Makanan Berat', text: 'Makanan Berat' },
    { id: 'Minuman', text: 'Minuman' },
    { id: 'Snack', text: 'Snack' },
    { id: 'Buah', text: 'Buah' }
  ];

  let products = [
    { id: 1, name: 'Nasi Goreng Special', category: 'Makanan Berat', price: 15000, stock: 45 },
    { id: 2, name: 'Ayam Bakar Madu', category: 'Makanan Berat', price: 18000, stock: 30 },
    { id: 3, name: 'Es Teh Manis', category: 'Minuman', price: 4000, stock: 120 },
    { id: 4, name: 'Jus Alpukat', category: 'Minuman', price: 8000, stock: 25 },
    { id: 5, name: 'Risoles Mayo', category: 'Snack', price: 3500, stock: 60 },
    { id: 6, name: 'Pisang Keju', category: 'Snack', price: 5000, stock: 40 },
    { id: 7, name: 'Potongan Buah Naga', category: 'Buah', price: 6000, stock: 15 },
    { id: 8, name: 'Soto Ayam', category: 'Makanan Berat', price: 14000, stock: 35 },
    { id: 9, name: 'Air Mineral 600ml', category: 'Minuman', price: 3000, stock: 90 },
    { id: 10, name: 'Keripik Singkong', category: 'Snack', price: 4000, stock: 50 }
  ];

  let promos = [
    { emoji: '🔥', title: 'Paket Hemat Nasi Goreng + Es Teh', desc: 'Diskon 15% setiap pembelian jam 10.00 - 12.00', lozengeText: 'Diskon', lozengeClass: 'yellow' },
    { emoji: '🥤', title: 'Jus Alpukat Buy 2 Get 1 Free', desc: 'Khusus hari Rabu untuk seluruh santri', lozengeText: 'Promo', lozengeClass: 'teal' },
    { emoji: '⚠️', title: 'Stok Buah Naga Menipis', desc: 'Sisa 15 porsi, segera restock untuk besok', lozengeText: 'Perhatian', lozengeClass: 'red' }
  ];

  // Data Transaksi Dummy (untuk rentang 30 hari terakhir)
  const today = new Date();
  let transactions = [];
  for (let i = 29; i >= 0; i--) {
    let d = new Date();
    d.setDate(today.getDate() - i);
    let dateStr = d.toISOString().split('T')[0];
    
    // Generate 3-5 transaksi per hari
    let count = 3 + (i % 3);
    for (let j = 0; j < count; j++) {
      let prod = products[(i + j) % products.length];
      let qty = 1 + ((i + j) % 4);
      transactions.push({
        date: dateStr,
        productName: prod.name,
        category: prod.category,
        price: prod.price,
        qty: qty,
        total: prod.price * qty
      });
    }
  }


  // --- 2. THEME TOGGLE (Dark / Light Mode) ---
  const btnTheme = document.getElementById('btnTheme');
  const htmlEl = document.documentElement;

  function updateThemeButton(mode) {
    if (!btnTheme) return;
    const isDark = mode === 'dark';
    btnTheme.innerHTML = `<svg class="ic" viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg><span>${isDark ? 'Mode terang' : 'Mode gelap'}</span>`;
  }

  // Set initial button state
  const currentMode = htmlEl.getAttribute('data-color-mode') || 'light';
  updateThemeButton(currentMode);

  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      let cur = htmlEl.getAttribute('data-color-mode');
      let next = cur === 'dark' ? 'light' : 'dark';
      htmlEl.setAttribute('data-color-mode', next);
      try { localStorage.setItem('kantin-color-mode', next); } catch(e) {}
      updateThemeButton(next);
      
      // Update charts theme colors if initialized
      updateChartsTheme();
    });
  }


  // --- 3. TOM SELECT (Kategori Multi-Select) ---
  let katSelect = null;
  const fKatEl = document.getElementById('fKat');
  if (fKatEl) {
    // Isi options
    categories.forEach(c => {
      let opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.text;
      opt.selected = true; // Default pilih semua
      fKatEl.appendChild(opt);
    });

    katSelect = new TomSelect(fKatEl, {
      plugins: ['remove_button'],
      placeholder: 'Pilih kategori...',
      persist: false,
      create: false,
      onChange: () => {
        filterAndUpdate();
      }
    });
  }


  // --- 4. FLATPICKR (Rentang Tanggal) ---
  let datePicker = null;
  const fDateEl = document.getElementById('fDate');
  const dRangeEl = document.getElementById('dRange');

  let startDate = new Date();
  startDate.setDate(today.getDate() - 29);
  let endDate = today;

  if (fDateEl) {
    datePicker = flatpickr(fDateEl, {
      mode: 'range',
      locale: 'id',
      dateFormat: 'Y-m-d',
      defaultDate: [startDate, endDate],
      onChange: (selectedDates) => {
        if (selectedDates.length === 2) {
          startDate = selectedDates[0];
          endDate = selectedDates[1];
          updateDateRangeLabel();
          filterAndUpdate();
        }
      }
    });
  }

  function updateDateRangeLabel() {
    if (!dRangeEl) return;
    const opt = { day: 'numeric', month: 'short', year: 'numeric' };
    const sStr = startDate.toLocaleDateString('id-ID', opt);
    const eStr = endDate.toLocaleDateString('id-ID', opt);
    dRangeEl.textContent = `Menampilkan data tanggal ${sStr} s.d. ${eStr}`;
  }
  updateDateRangeLabel();


  // --- 5. FLOATING UI & TOOLTIPS ---
  const tooltipEl = document.getElementById('tooltip');
  let activeReference = null;

  function showTooltip(referenceEl) {
    const text = referenceEl.getAttribute('data-tip');
    if (!text || !tooltipEl) return;
    tooltipEl.textContent = text;
    tooltipEl.style.opacity = '1';
    activeReference = referenceEl;
    updateTooltipPosition();
  }

  function hideTooltip() {
    if (!tooltipEl) return;
    tooltipEl.style.opacity = '0';
    activeReference = null;
  }

  function updateTooltipPosition() {
    if (!activeReference || !tooltipEl) return;
    window.FloatingUIDOM.computePosition(activeReference, tooltipEl, {
      placement: 'top',
      middleware: [
        window.FloatingUIDOM.offset(6),
        window.FloatingUIDOM.shift({ padding: 5 }),
        window.FloatingUIDOM.flip()
      ]
    }).then(({x, y}) => {
      Object.assign(tooltipEl.style, {
        left: `${x}px`,
        top: `${y}px`
      });
    });
  }

  document.querySelectorAll('.icon-btn[data-tip]').forEach(btn => {
    btn.addEventListener('mouseenter', () => showTooltip(btn));
    btn.addEventListener('mouseleave', hideTooltip);
    btn.addEventListener('focus', () => showTooltip(btn));
    btn.addEventListener('blur', hideTooltip);
  });


  // --- 6. CHART.JS (Omzet per Hari & Item per Kategori) ---
  let barChart = null;
  let dnChart = null;

  const ctxBar = document.getElementById('cBar');
  const ctxDn = document.getElementById('cDn');

  function getChartColors() {
    const isDark = htmlEl.getAttribute('data-color-mode') === 'dark';
    return {
      text: isDark ? '#CECFD2' : '#292A2E',
      grid: isDark ? 'rgba(227, 228, 242, 0.08)' : 'rgba(11, 18, 14, 0.08)',
      brand: isDark ? '#669DF1' : '#1868DB',
      catColors: [
        isDark ? '#4688EC' : '#357DE8',
        isDark ? '#94C748' : '#82B536',
        isDark ? '#C97CF4' : '#BF63F3',
        isDark ? '#9DD9EE' : '#206A83'
      ]
    };
  }

  function initCharts(filteredTrx) {
    if (!ctxBar || !ctxDn) return;
    const colors = getChartColors();

    // Grouping omzet per hari
    let dailyMap = {};
    // Grouping item per kategori
    let catMap = { 'Makanan Berat': 0, 'Minuman': 0, 'Snack': 0, 'Buah': 0 };

    filteredTrx.forEach(t => {
      // Daily omzet
      dailyMap[t.date] = (dailyMap[t.date] || 0) + t.total;
      // Category items
      if (catMap[t.category] !== undefined) {
        catMap[t.category] += t.qty;
      }
    });

    const dates = Object.keys(dailyMap).sort();
    const omzetData = dates.map(d => dailyMap[d]);
    const dateLabels = dates.map(d => {
      const parts = d.split('-');
      return `${parts[2]}/${parts[1]}`;
    });

    const catLabels = Object.keys(catMap);
    const catData = catLabels.map(c => catMap[c]);

    // Bar Chart
    if (barChart) barChart.destroy();
    barChart = new Chart(ctxBar, {
      type: 'bar',
      data: {
        labels: dateLabels,
        datasets: [{
          label: 'Omzet (Rp)',
          data: omzetData,
          backgroundColor: colors.brand,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Omzet: Rp ${ctx.raw.toLocaleString('id-ID')}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: colors.text, font: { size: 11 } }
          },
          y: {
            grid: { color: colors.grid },
            ticks: {
              color: colors.text,
              font: { size: 11 },
              callback: (val) => val >= 1000 ? `${val / 1000}k` : val
            }
          }
        }
      }
    });

    // Doughnut Chart
    if (dnChart) dnChart.destroy();
    dnChart = new Chart(ctxDn, {
      type: 'doughnut',
      data: {
        labels: catLabels,
        datasets: [{
          data: catData,
          backgroundColor: colors.catColors,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: colors.text, font: { size: 12 }, boxWidth: 12 }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.raw} porsi`
            }
          }
        },
        cutout: '65%'
      }
    });
  }

  function updateChartsTheme() {
    filterAndUpdate();
  }


  // --- 7. TABULATOR (Tabel Produk) ---
  let tableProd = null;
  const tProdEl = document.getElementById('tProd');
  const tCountEl = document.getElementById('tCount');

  function initTable() {
    if (!tProdEl) return;

    tableProd = new Tabulator(tProdEl, {
      data: products,
      layout: 'fitColumns',
      pagination: 'local',
      paginationSize: 5,
      placeholder: 'Tidak ada produk ditemukan',
      columns: [
        { title: 'Nama Produk', field: 'name', widthGrow: 2, headerFilter: 'input', headerFilterPlaceholder: 'Cari...' },
        { title: 'Kategori', field: 'category', widthGrow: 1.2, headerFilter: 'input', headerFilterPlaceholder: 'Kategori...' },
        { 
          title: 'Harga', 
          field: 'price', 
          widthGrow: 1, 
          formatter: (cell) => `Rp ${cell.getValue().toLocaleString('id-ID')}`,
          cssClass: 'num'
        },
        { title: 'Stok', field: 'stock', widthGrow: 0.8, cssClass: 'num' },
        {
          title: 'Aksi',
          field: 'id',
          width: 80,
          formatter: (cell) => {
            return `<button class="icon-btn del" title="Hapus produk" aria-label="Hapus"><svg class="ic" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>`;
          },
          cellClick: (e, cell) => {
            const target = e.target.closest('button');
            if (!target) return;
            const rowData = cell.getRow().getData();
            confirmDeleteProduct(rowData);
          },
          hozAlign: 'center',
          headerSort: false
        }
      ]
    });

    tableProd.on('dataFiltered', updateProductCount);
    tableProd.on('dataLoaded', updateProductCount);
  }

  function updateProductCount() {
    if (!tCountEl || !tableProd) return;
    const count = tableProd.getDataCount('active');
    tCountEl.textContent = `${count} produk`;
  }

  function confirmDeleteProduct(prod) {
    window.Swal.fire({
      title: 'Hapus Produk?',
      html: `Apakah Anda yakin ingin menghapus <b>${prod.name}</b> dari daftar produk kantin?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      customClass: {
        popup: 'ads-modal',
        confirmButton: 'btn danger',
        cancelButton: 'btn'
      },
      buttonsStyling: false
    }).then((result) => {
      if (result.isConfirmed) {
        products = products.filter(p => p.id !== prod.id);
        tableProd.setData(products);
        
        window.Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: `Produk ${prod.name} berhasil dihapus`,
          showConfirmButton: false,
          timer: 2500,
          timerProgressBar: true,
          customClass: { popup: 'ads-flag' }
        });
      }
    });
  }


  // --- 8. PROMO LIST RENDER ---
  const promoListEl = document.getElementById('promo');
  const pCountEl = document.getElementById('pCount');

  function initPromo() {
    if (!promoListEl) return;
    if (pCountEl) pCountEl.textContent = `${promos.length} aktif`;

    promoListEl.innerHTML = promos.map(p => `
      <li>
        <div class="p-emoji" style="background: var(--ds-background-neutral)">${p.emoji}</div>
        <div class="p-body">
          <b>${p.title}</b>
          <small>${p.desc}</small>
        </div>
        <span class="lozenge ${p.lozengeClass}">${p.lozengeText}</span>
      </li>
    `).join('');
  }


  // --- 9. FILTER & KPI AGGREGATION ---
  const kOmzetEl = document.getElementById('kOmzet');
  const kItemEl = document.getElementById('kItem');
  const kTrxEl = document.getElementById('kTrx');
  const cOmzetEl = document.getElementById('cOmzet');
  const cItemEl = document.getElementById('cItem');
  const cTrxEl = document.getElementById('cTrx');

  function filterAndUpdate() {
    // Get selected categories from Tom Select
    let selectedCats = katSelect ? katSelect.getValue() : [];
    if (typeof selectedCats === 'string') selectedCats = [selectedCats];

    // Filter transactions by date range and selected categories
    const sTime = startDate.setHours(0,0,0,0);
    const eTime = endDate.setHours(23,59,59,999);

    const filtered = transactions.filter(t => {
      let tDate = new Date(t.date).getTime();
      let matchDate = (tDate >= sTime && tDate <= eTime);
      let matchCat = (selectedCats.length === 0 || selectedCats.includes(t.category));
      return matchDate && matchCat;
    });

    // Compute KPIs
    let totalOmzet = filtered.reduce((acc, curr) => acc + curr.total, 0);
    let totalItems = filtered.reduce((acc, curr) => acc + curr.qty, 0);
    let totalTrx = filtered.length;

    if (kOmzetEl) kOmzetEl.textContent = `Rp ${totalOmzet.toLocaleString('id-ID')}`;
    if (kItemEl) kItemEl.textContent = totalItems.toLocaleString('id-ID');
    if (kTrxEl) kTrxEl.textContent = totalTrx.toLocaleString('id-ID');

    if (cOmzetEl) cOmzetEl.textContent = `Dari ${totalTrx} transaksi berhasil`;
    if (cItemEl) cItemEl.textContent = `Rata-rata ${(totalTrx ? (totalItems / totalTrx).toFixed(1) : 0)} porsi / transaksi`;
    if (cTrxEl) cTrxEl.textContent = `Dalam rentang ${selectedCats.length ? selectedCats.length : 'semua'} kategori`;

    // Refresh Charts
    initCharts(filtered);
  }


  // --- 10. INISIALISASI UTAMA ---
  initTable();
  initPromo();
  filterAndUpdate();

});