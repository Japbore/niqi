// ===========================================
// db — Módulo de acceso a IndexedDB
// ===========================================

// --- Constantes ---
const DB_NAME = 'niqi-db';
const DB_VERSION = 2;
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

      // MIGRACIÓN A V2: Añadir índice para cantidad
      if (event.oldVersion < 2) {
        // En IndexedDB, añadir una propiedad a un object no requiere alterar la tabla si no es índice,
        // pero podemos crear el índice si quisiéramos buscar por cantidad.
        // Dado el alcance, es opcional. Lo creamos por consistencia.
        // Nota: si createObjectStore ya la ha creado en esta misma transacción (v0 a v2 directa), 
        // store ya tiene las cosas. El `onupgradeneeded` provee el store actual vía transaction.
        const store = event.target.transaction.objectStore(STORE_NAME);
        if (!store.indexNames.contains('cantidad')) {
          store.createIndex('cantidad', 'cantidad', { unique: false });
        }
      }
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
 * @param {string} cantidad - Cantidad/Unidades (puede ser vacía)
 * @returns {Promise<number>} ID del producto creado
 */
function addItem(nombre, categoria = '', cantidad = '') {
  return addItems([{ nombre, categoria, cantidad }]);
}

/**
 * Añade múltiples productos a la lista en una sola transacción.
 * @param {Array<{nombre: string, categoria: string}>} itemsData - Array de productos a añadir
 * @returns {Promise<void>}
 */
function addItems(itemsData) {
  return getDb().then((database) => {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      itemsData.forEach((data) => {
        const item = {
          nombre: data.nombre.trim(),
          categoria: data.categoria || '',
          cantidad: data.cantidad || '',
          comprado: false,
          createdAt: Date.now(),
        };
        store.add(item);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  });
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
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.comprado) {
            cursor.delete();
          }
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  });
}

/**
 * Actualiza los datos de un producto existente.
 * @param {number} id - ID del producto
 * @param {Object} updates - Objeto con {nombre, categoria, cantidad}
 * @returns {Promise<void>}
 */
function updateItem(id, updates) {
  return getDb().then((database) => {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const item = request.result;
        if (!item) return reject(new Error('Item not found'));
        
        Object.assign(item, updates);
        
        const putReq = store.put(item);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  });
}
