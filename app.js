// ===========================================
// app — Lógica principal y renderizado de UI
// ===========================================

// --- Constantes ---
const CATEGORY_EMOJIS = {
  'Frutas y verduras': '🥬',
  'Carnes y pescados': '🥩',
  'Lácteos': '🧀',
  'Panadería': '🍞',
  'Bebidas': '🥤',
  'Limpieza': '🧹',
  'Higiene': '🧴',
  'Otros': '📦',
};

// --- Referencias al DOM ---
let inputName = null;
let selectCategory = null;
let buttonAdd = null;
let listPending = null;
let listPurchased = null;
let buttonClearPurchased = null;
let emptyState = null;
let bulkControls = null;
let btnExpandAll = null;
let btnCollapseAll = null;

// Referencias Importación (RF-09)
let importTextarea = null;
let btnImportExecute = null;

// Referencias Edición (RF-13)
let editModal = null;
let editId = null;
let editName = null;
let editQuantity = null;
let editCategory = null;
let btnSaveEdit = null;

// Referencias Búsqueda (RF-18)
let inputSearch = null;
let btnClearSearch = null;


// --- Estado persistente (localStorage) ---
const STORAGE_KEY_COLLAPSED = 'niqi-collapsed-categories';

function getCollapsedCategories() {
  const data = localStorage.getItem(STORAGE_KEY_COLLAPSED);
  return data ? JSON.parse(data) : [];
}

function setCategoryCollapsed(categoria, isCollapsed) {
  let collapsed = getCollapsedCategories();
  if (isCollapsed) {
    if (!collapsed.includes(categoria)) collapsed.push(categoria);
  } else {
    collapsed = collapsed.filter(c => c !== categoria);
  }
  localStorage.setItem(STORAGE_KEY_COLLAPSED, JSON.stringify(collapsed));
}

// --- Funciones privadas ---

/**
 * Crea el elemento HTML para un producto de la lista.
 * @param {Object} item - Producto de IndexedDB
 * @returns {HTMLElement}
 */
function createItemElement(item) {
  const li = document.createElement('li');
  li.className = 'list-group-item d-flex align-items-center justify-content-between';
  li.dataset.itemId = item.id;

  if (item.comprado) {
    li.classList.add('niqi-item-purchased');
  }

  // Parte izquierda: checkbox + nombre
  const leftSide = document.createElement('div');
  leftSide.className = 'd-flex align-items-center gap-2 flex-grow-1';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'form-check-input';
  checkbox.checked = item.comprado;
  checkbox.setAttribute('aria-label', `Marcar ${item.nombre} como ${item.comprado ? 'pendiente' : 'comprado'}`);
  checkbox.addEventListener('change', () => handleToggle(item.id));

  const nameLabelContainer = document.createElement('div');
  nameLabelContainer.className = 'd-flex align-items-center gap-2 text-break niqi-edit-trigger';
  nameLabelContainer.style.cursor = 'pointer'; // Indicador táctil
  nameLabelContainer.addEventListener('click', () => openEditModal(item));

  // Opcional: Badge de cantidad (RF-14)
  if (item.cantidad) {
    const badge = document.createElement('span');
    badge.className = 'badge bg-secondary rounded-pill';
    badge.textContent = item.cantidad;
    nameLabelContainer.appendChild(badge);
  }

  const nameSpan = document.createElement('span');
  nameSpan.className = 'niqi-item-name';
  nameSpan.textContent = item.nombre;
  nameLabelContainer.appendChild(nameSpan);

  leftSide.appendChild(checkbox);
  leftSide.appendChild(nameLabelContainer);

  // Botón eliminar
  const deleteButton = document.createElement('button');
  deleteButton.className = 'btn btn-outline-danger btn-sm';
  deleteButton.setAttribute('aria-label', `Eliminar ${item.nombre}`);
  deleteButton.innerHTML = '<i class="bi bi-trash"></i>';
  deleteButton.addEventListener('click', (e) => {
    e.stopPropagation(); // Evitar colapsar/expandir al borrar
    handleDelete(item.id);
  });

  li.appendChild(leftSide);
  li.appendChild(deleteButton);

  return li;
}

/**
 * Agrupa un array de items por su categoría.
 * @param {Array} items - Lista de productos
 * @returns {Map<string, Array>} Mapa categoría → items
 */
function groupByCategory(items) {
  const groups = new Map();

  items.forEach((item) => {
    const key = item.categoria || '';
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(item);
  });

  return groups;
}

/**
 * Crea un bloque visual para una categoría con sus items (RF-09: Colapsable).
 * @param {string} categoria - Nombre de la categoría
 * @param {Array} items - Productos de esa categoría
 * @returns {HTMLElement}
 */
function createCategoryGroup(categoria, items) {
  const container = document.createElement('div');
  container.className = 'niqi-category-group mb-2';

  const collapsedList = getCollapsedCategories();
  const isCollapsed = collapsedList.includes(categoria);
  const displayCategory = categoria || 'Sin categoría';
  const targetId = `collapse-${displayCategory.replace(/\s+/g, '-')}`;

  // Cabecera de categoría (Botón colapsable)
  const headerButton = document.createElement('button');
  headerButton.className = `niqi-category-header ${isCollapsed ? 'collapsed' : ''}`;
  headerButton.type = 'button';
  headerButton.setAttribute('data-bs-toggle', 'collapse');
  headerButton.setAttribute('data-bs-target', `#${targetId}`);
  headerButton.setAttribute('aria-expanded', !isCollapsed);
  headerButton.dataset.categoria = categoria;

  const emoji = CATEGORY_EMOJIS[categoria] || '📦';
  const leftText = document.createElement('span');
  leftText.textContent = `${emoji} ${displayCategory.toUpperCase()}`;
  const icon = document.createElement('i');
  icon.className = 'bi bi-chevron-down';

  headerButton.appendChild(leftText);
  headerButton.appendChild(icon);
  container.appendChild(headerButton);

  // Escuchar cambios de estado para persistencia
  headerButton.addEventListener('click', () => {
    // Usamos un pequeño timeout para que el cambio de clase 'collapsed' ocurra
    setTimeout(() => {
      const currentlyCollapsed = headerButton.classList.contains('collapsed');
      setCategoryCollapsed(categoria, currentlyCollapsed);
    }, 0);
  });

  // Lista de items (Envoltorio colapsable)
  const collapseDiv = document.createElement('div');
  collapseDiv.id = targetId;
  collapseDiv.className = `collapse ${isCollapsed ? '' : 'show'}`;

  const ul = document.createElement('ul');
  ul.className = 'list-group list-group-flush';
  items.forEach((item) => {
    ul.appendChild(createItemElement(item));
  });

  collapseDiv.appendChild(ul);
  container.appendChild(collapseDiv);

  return container;
}

/**
 * Renderiza la lista completa desde los datos de IndexedDB.
 */
function renderList() {
  getAllItems().then((items) => {
    const pendingItems = items.filter((item) => !item.comprado);
    const purchasedItems = items.filter((item) => item.comprado);

    // Limpiar listas
    listPending.innerHTML = '';
    listPurchased.innerHTML = '';

    // Renderizar pendientes agrupados por categoría (RF-08)
    const groups = groupByCategory(pendingItems);
    
    // Ordenar categorías: 'Sin categoría' (vacía) siempre al final
    const sortedCategories = Array.from(groups.keys()).sort((a, b) => {
      if (a === '') return 1;
      if (b === '') return -1;
      return a.localeCompare(b);
    });

    sortedCategories.forEach((categoria) => {
      listPending.appendChild(createCategoryGroup(categoria, groups.get(categoria)));
    });

    // Mostrar/ocultar controles globales (solo si hay más de una categoría con items)
    bulkControls.classList.toggle('d-none', groups.size <= 1);

    // Renderizar comprados (sin agrupar, son secundarios)
    purchasedItems.forEach((item) => {
      listPurchased.appendChild(createItemElement(item));
    });

    // Mostrar/ocultar sección de comprados
    const purchasedSection = document.getElementById('purchased-section');
    purchasedSection.classList.toggle('d-none', purchasedItems.length === 0);

    // Mostrar/ocultar estado vacío
    emptyState.classList.toggle('d-none', items.length > 0);
  });
}

// --- Manejadores de eventos ---

/**
 * Parsea un texto natural extrayendo cantidad, nombre y categoría opcional.
 * @param {string} texto 
 * @returns {Object} { cantidad, nombre, categoria }
 */
function parseNaturalInput(texto) {
  let cantidad = '';
  let nombre = '';
  let categoria = '';

  const idxComa = texto.lastIndexOf(',');
  let resto = texto;
  if (idxComa !== -1) {
    categoria = texto.substring(idxComa + 1).trim();
    resto = texto.substring(0, idxComa).trim();
  }

  const cantidadRegex = /^(\d\S*)\s+(.+)$/i;
  const match = resto.match(cantidadRegex);
  
  if (match) {
    cantidad = match[1].trim();
    nombre = match[2].trim();
  } else {
    nombre = resto.trim();
  }

  return { cantidad, nombre, categoria };
}

/**
 * Añade un nuevo producto desde el campo de texto.
 */
function handleAdd() {
  const rawText = inputName.value.trim();
  if (!rawText) return;

  const parsed = parseNaturalInput(rawText);
  const categoria = selectCategory.value || parsed.categoria; // El select manda si se eligió algo

  addItem(parsed.nombre, categoria, parsed.cantidad).then(() => {
    inputName.value = '';
    // RF-20: Mantiene la misma categoría en el select form
    inputName.focus();
    renderList();
  });
}

/**
 * Alterna el estado comprado/pendiente de un producto.
 * @param {number} id
 */
function handleToggle(id) {
  toggleItem(id).then(() => renderList());
}

/**
 * Elimina un producto.
 * @param {number} id
 */
function handleDelete(id) {
  deleteItem(id).then(() => renderList());
}

/**
 * Elimina todos los productos comprados.
 */
function handleClearPurchased() {
  clearPurchasedItems().then(() => renderList());
}

/**
 * Control masivo: Expandir todo
 */
function handleExpandAll() {
  const collapses = document.querySelectorAll('#list-pending .collapse');
  const headers = document.querySelectorAll('#list-pending .niqi-category-header');
  
  collapses.forEach(el => {
    const bsCollapse = bootstrap.Collapse.getOrCreateInstance(el);
    bsCollapse.show();
  });
  
  headers.forEach(h => h.classList.remove('collapsed'));
  localStorage.setItem(STORAGE_KEY_COLLAPSED, JSON.stringify([]));
}

/**
 * Control masivo: Colapsar todo
 */
function handleCollapseAll() {
  const collapses = document.querySelectorAll('#list-pending .collapse');
  const headers = document.querySelectorAll('#list-pending .niqi-category-header');
  const collapsedNames = [];

  collapses.forEach(el => {
    const bsCollapse = bootstrap.Collapse.getOrCreateInstance(el);
    bsCollapse.hide();
  });

  headers.forEach(h => {
    h.classList.add('collapsed');
    // Extraer nombre de la categoría para persistencia usando el dataset
    const name = h.dataset.categoria;
    collapsedNames.push(name);
  });

  localStorage.setItem(STORAGE_KEY_COLLAPSED, JSON.stringify(collapsedNames));
}

/**
 * Ejecuta la carga en bloque desde el textarea.
 */
function handleImportExecute() {
  const text = importTextarea.value.trim();
  if (!text) return;

  const lines = text.split('\n');
  const itemsToImport = [];
  let currentCategory = '';

  lines.forEach((line) => {
    const rawLine = line.trim();
    if (!rawLine) return;

    if (rawLine.endsWith(':')) {
      currentCategory = rawLine.slice(0, -1).trim();
      return;
    }

    const parsed = parseNaturalInput(rawLine);

    if (parsed.nombre) {
      itemsToImport.push({
        nombre: parsed.nombre,
        categoria: parsed.categoria || currentCategory,
        cantidad: parsed.cantidad || ''
      });
    }
  });

  if (itemsToImport.length > 0) {
    addItems(itemsToImport).then(() => {
      importTextarea.value = '';
      const modalInstance = bootstrap.Modal.getInstance(document.getElementById('importModal'));
      if (modalInstance) modalInstance.hide();
      renderList();
    });
  }
}

/**
 * Abre el modal de edición de un producto
 */
function openEditModal(item) {
  editId.value = item.id;
  editName.value = item.nombre;
  editQuantity.value = item.cantidad || '';
  editCategory.value = item.categoria || '';
  editModal.show();
}

/**
 * Guarda los cambios de edición
 */
function handleSaveEdit() {
  const id = parseInt(editId.value, 10);
  const nombre = editName.value.trim();
  const cantidad = editQuantity.value.trim();
  const categoria = editCategory.value;

  if (!nombre) return;

  updateItem(id, { nombre, cantidad, categoria }).then(() => {
    editModal.hide();
    renderList();
  });
}

/**
 * Normaliza un texto para búsquedas (quita tildes y pasa a minúsculas)
 * @param {string} str 
 */
function normalize(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Filtra los productos en tiempo real.
 */
function applySearchFilter(term) {
  const query = normalize(term);
  const allItems = document.querySelectorAll('.list-group-item');
  
  if (query.length < 3) {
    allItems.forEach(li => li.classList.remove('d-none'));
    const categories = document.querySelectorAll('#list-pending > div, #purchased-section');
    categories.forEach(c => c.classList.remove('d-none'));
    return;
  }

  // Filtrado activo
  const categories = document.querySelectorAll('#list-pending > div');
  categories.forEach(c => c.classList.add('d-none'));

  allItems.forEach(li => {
    const text = normalize(li.textContent);
    if (text.includes(query)) {
      li.classList.remove('d-none');
      const catGroup = li.closest('div[id^="cat-"], div[class*="niqi-category-group"]');
      if (catGroup) {
        catGroup.classList.remove('d-none');
        // Mostrar también el contenido interior
        const collapseDiv = catGroup.querySelector('.collapse');
        if (collapseDiv) collapseDiv.classList.add('show');
      }
      
      const purchasedSec = li.closest('#purchased-section');
      if (purchasedSec) purchasedSec.classList.remove('d-none');

    } else {
      li.classList.add('d-none');
    }
  });
}

// --- Inicialización ---

document.addEventListener('DOMContentLoaded', () => {
  // Capturar referencias al DOM
  inputName = document.getElementById('input-name');
  selectCategory = document.getElementById('select-category');
  buttonAdd = document.getElementById('btn-add');
  listPending = document.getElementById('list-pending');
  listPurchased = document.getElementById('list-purchased');
  buttonClearPurchased = document.getElementById('btn-clear-purchased');
  emptyState = document.getElementById('empty-state');
  bulkControls = document.getElementById('bulk-controls');
  btnExpandAll = document.getElementById('btn-expand-all');
  btnCollapseAll = document.getElementById('btn-collapse-all');

  // Referencias Importación
  importTextarea = document.getElementById('import-textarea');
  btnImportExecute = document.getElementById('btn-import-execute');

  // Referencias Edición
  editId = document.getElementById('edit-id');
  editName = document.getElementById('edit-name');
  editQuantity = document.getElementById('edit-quantity');
  editCategory = document.getElementById('edit-category');
  btnSaveEdit = document.getElementById('btn-save-edit');
  editModal = new bootstrap.Modal(document.getElementById('editModal'));

  // Referencias Búsqueda
  inputSearch = document.getElementById('input-search');
  btnClearSearch = document.getElementById('btn-clear-search');

  // Eventos
  buttonAdd.addEventListener('click', handleAdd);
  inputName.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      handleAdd();
    }
  });
  buttonClearPurchased.addEventListener('click', handleClearPurchased);

  if (btnImportExecute) {
    btnImportExecute.addEventListener('click', handleImportExecute);
  }

  // Eventos de Edición
  btnSaveEdit.addEventListener('click', handleSaveEdit);
  
  // Eventos de Búsqueda
  inputSearch.addEventListener('input', (e) => {
    const term = e.target.value.trim();
    btnClearSearch.classList.toggle('d-none', term.length === 0);
    applySearchFilter(term);
  });
  btnClearSearch.addEventListener('click', () => {
    inputSearch.value = '';
    btnClearSearch.classList.add('d-none');
    applySearchFilter('');
  });

  // Controles globales
  btnExpandAll.addEventListener('click', handleExpandAll);
  btnCollapseAll.addEventListener('click', handleCollapseAll);

  // Carga inicial
  renderList();
});
