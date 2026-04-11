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
let importModal = null; // Instancia de Bootstrap Modal

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

  const nameSpan = document.createElement('span');
  nameSpan.className = 'niqi-item-name';
  nameSpan.textContent = item.nombre;

  leftSide.appendChild(checkbox);
  leftSide.appendChild(nameSpan);

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
    groups.forEach((groupItems, categoria) => {
      listPending.appendChild(createCategoryGroup(categoria, groupItems));
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
 * Añade un nuevo producto desde el campo de texto.
 */
function handleAdd() {
  const nombre = inputName.value.trim();
  if (!nombre) return;

  const categoria = selectCategory.value;

  addItem(nombre, categoria).then(() => {
    inputName.value = '';
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
    // Extraer nombre de la categoría para persistencia
    const name = h.querySelector('span').textContent.slice(3).trim(); // Quitar emoji
    collapsedNames.push(name);
  });

  localStorage.setItem(STORAGE_KEY_COLLAPSED, JSON.stringify(collapsedNames));
}

/**
 * Ejecuta la importación masiva desde el textarea.
 */
function handleImportExecute() {
  const text = importTextarea.value.trim();
  if (!text) return;

  const lines = text.split('\n');
  const itemsToImport = [];

  lines.forEach((line) => {
    const rawLine = line.trim();
    if (!rawLine) return;

    // Intentar separar por coma
    const parts = rawLine.split(',');
    const nombre = parts[0].trim();
    let categoria = parts.length > 1 ? parts[1].trim() : '';

    // Validar si la categoría existe en nuestro diccionario, si no, usar 'Otros' o vacía
    if (categoria && !CATEGORY_EMOJIS[categoria]) {
      categoria = 'Otros';
    }

    if (nombre) {
      itemsToImport.push({ nombre, categoria });
    }
  });

  if (itemsToImport.length > 0) {
    addItems(itemsToImport).then(() => {
      importTextarea.value = '';
      const modalElement = document.getElementById('importModal');
      const modalInstance = bootstrap.Modal.getInstance(modalElement);
      modalInstance.hide();
      renderList();
    });
  }
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

  // Controles globales
  btnExpandAll.addEventListener('click', handleExpandAll);
  btnCollapseAll.addEventListener('click', handleCollapseAll);

  // Carga inicial
  renderList();
});
