// ===========================================
// db — Módulo de acceso a IndexedDB
// ===========================================

// --- Constantes ---
const DB_NAME = 'niqi-db';
const DB_VERSION = 1;
const STORE_NAME = 'items';

// --- Estado del módulo ---
let db = null;

// --- Funciones privadas ---

/**
 * Obtiene una referencia a la base de datos, abriéndola si es necesario.
 * @returns {Promise<IDBDatabase>}
 */
function getDb() {
  if (db) {
    return Promise.resolve(db);
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // Creación/migración del schema (ver docs/modelo-datos.md)
    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // CREATE OBJECT STORE items
      const store = database.createObjectStore(STORE_NAME, {
        keyPath: 'id',
        autoIncrement: true,
      });

      // CREATE INDEX idx_items_nombre
      store.createIndex('nombre', 'nombre', { unique: false });

      // CREATE INDEX idx_items_comprado
      store.createIndex('comprado', 'comprado', { unique: false });

      // CREATE INDEX idx_items_categoria
      store.createIndex('categoria', 'categoria', { unique: false });
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

/**
 * Ejecuta una operación sobre un object store dentro de una transacción.
 * @param {string} mode - 'readonly' o 'readwrite'
 * @param {function(IDBObjectStore): IDBRequest} operation - Operación a ejecutar
 * @returns {Promise<*>}
 */
function withStore(mode, operation) {
  return getDb().then((database) => {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const store = transaction.objectStore(STORE_NAME);
      const request = operation(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

// --- Funciones públicas (API del módulo) ---

/**
 * Añade un producto a la lista.
 * @param {string} nombre - Nombre del producto
 * @param {string} categoria - Categoría del producto (puede ser vacía)
 * @returns {Promise<number>} ID del producto creado
 */
function addItem(nombre, categoria) {
  const item = {
    nombre: nombre.trim(),
    categoria: categoria || '',
    cantidad: 1,
    comprado: false,
    createdAt: Date.now(),
  };
  return withStore('readwrite', (store) => store.add(item));
}

/**
 * Obtiene todos los productos de la lista.
 * @returns {Promise<Array>} Lista de productos
 */
function getAllItems() {
  return getDb().then((database) => {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

/**
 * Alterna el estado comprado/pendiente de un producto.
 * @param {number} id - ID del producto
 * @returns {Promise<void>}
 */
function toggleItem(id) {
  return getDb().then((database) => {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const item = getRequest.result;
        item.comprado = !item.comprado;
        const putRequest = store.put(item);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  });
}

/**
 * Elimina un producto de la lista.
 * @param {number} id - ID del producto
 * @returns {Promise<void>}
 */
function deleteItem(id) {
  return withStore('readwrite', (store) => store.delete(id));
}

/**
 * Elimina todos los productos marcados como comprados.
 * @returns {Promise<void>}
 */
function clearPurchasedItems() {
  return getDb().then((database) => {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('comprado');
      const request = index.openCursor(IDBKeyRange.only(true));

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  });
}
