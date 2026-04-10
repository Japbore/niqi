# Niqi — Modelo de Datos

## Motor de Almacenamiento

**IndexedDB** — Base de datos NoSQL integrada en el navegador. Transaccional, asíncrona, soporta índices.

- **Base de datos:** `niqi-db`
- **Versión:** `1`

---

## DDL (Pseudo-SQL para IndexedDB)

Este DDL es la **fuente de verdad** del modelo de datos. Cualquier cambio en la estructura de IndexedDB debe reflejarse aquí primero.

> IndexedDB no usa SQL, pero representamos el esquema en pseudo-DDL para que sea legible y sirva como referencia canónica.

```sql
-- ============================================
-- Niqi Database Schema — IndexedDB
-- Versión: 1
-- Última actualización: 2026-04-10
-- ============================================

CREATE DATABASE niqi-db VERSION 1;

-- --------------------------------------------
-- Object Store: items
-- Descripción: Productos de la lista de la compra
-- --------------------------------------------
CREATE OBJECT STORE items (
    id          INTEGER     PRIMARY KEY AUTOINCREMENT,
    nombre      TEXT        NOT NULL,       -- Nombre del producto
    categoria   TEXT        DEFAULT '',     -- Categoría para agrupar (RF-08)
    cantidad    INTEGER     DEFAULT 1,      -- Unidades
    comprado    BOOLEAN     DEFAULT FALSE,  -- ¿Comprado?
    createdAt   INTEGER     NOT NULL        -- Timestamp (Date.now())
);

CREATE INDEX idx_items_nombre    ON items (nombre);
CREATE INDEX idx_items_comprado  ON items (comprado);
CREATE INDEX idx_items_categoria ON items (categoria);
```

---

## Mapeo DDL → Código JavaScript

El pseudo-DDL anterior se implementa así en `db.js`:

```javascript
// Abrir/crear la base de datos
const request = indexedDB.open('niqi-db', 1);

request.onupgradeneeded = (event) => {
    const db = event.target.result;

    // CREATE OBJECT STORE items
    const store = db.createObjectStore('items', {
        keyPath: 'id',
        autoIncrement: true
    });

    // CREATE INDEX idx_items_nombre
    store.createIndex('nombre', 'nombre', { unique: false });

    // CREATE INDEX idx_items_comprado
    store.createIndex('comprado', 'comprado', { unique: false });

    // CREATE INDEX idx_items_categoria
    store.createIndex('categoria', 'categoria', { unique: false });
};
```

---

## Reglas de Mantenimiento

1. **Todo cambio de schema empieza aquí** — Editar el DDL primero, luego el código.
2. **Incrementar versión** — Al cambiar el schema, subir la versión de la DB y actualizar `onupgradeneeded`.
3. **Documentar migraciones** — Añadir un bloque `ALTER` o comentario al DDL cuando se modifique el schema.

---

## Historial de Cambios

| Versión DB | Fecha      | Cambio                        |
|------------|------------|-------------------------------|
| 1          | 2026-04-10 | Schema inicial: object store `items` con campos `nombre`, `categoria`, `cantidad`, `comprado`, `createdAt` e índices `nombre`, `comprado`, `categoria` |

---

*Este documento es la fuente de verdad del modelo de datos. Mantenerlo sincronizado con `db.js`.*
