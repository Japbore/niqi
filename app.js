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
  deleteButton.addEventListener('click', () => handleDelete(item.id));

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
 * Crea un bloque visual para una categoría con sus items.
 * @param {string} categoria - Nombre de la categoría
 * @param {Array} items - Productos de esa categoría
 * @returns {HTMLElement}
 */
function createCategoryGroup(categoria, items) {
  const container = document.createElement('div');
  container.className = 'niqi-category-group mb-2';

  // Cabecera de categoría (solo si tiene categoría)
  if (categoria) {
    const header = document.createElement('div');
    header.className = 'niqi-category-header';
    const emoji = CATEGORY_EMOJIS[categoria] || '📦';
    header.textContent = `${emoji} ${categoria}`;
    container.appendChild(header);
  }

  // Lista de items
  const ul = document.createElement('ul');
  ul.className = 'list-group list-group-flush';
  items.forEach((item) => {
    ul.appendChild(createItemElement(item));
  });
  container.appendChild(ul);

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

  // Eventos
  buttonAdd.addEventListener('click', handleAdd);
  inputName.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      handleAdd();
    }
  });
  buttonClearPurchased.addEventListener('click', handleClearPurchased);

  // Carga inicial
  renderList();
});
