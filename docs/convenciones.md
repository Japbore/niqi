# Niqi — Convenciones y Reglas del Proyecto

Este documento es la referencia obligatoria para todo el desarrollo. Se sigue siempre.

---

## 1. Idioma

| Contexto                        | Idioma   |
|---------------------------------|----------|
| Código fuente (nombres)         | Inglés   |
| Comentarios en el código        | Español  |
| Documentación (`docs/`)         | Español  |
| Mensajes de commit              | Español  |
| Textos visibles en la UI        | Español  |

---

## 2. Nombrado

### JavaScript

| Elemento         | Convención         | Ejemplo                    |
|------------------|--------------------|----------------------------|
| Variables        | `camelCase`        | `itemCount`, `isCompleted` |
| Constantes       | `UPPER_SNAKE_CASE` | `DB_NAME`, `DB_VERSION`    |
| Funciones        | `camelCase`        | `addItem()`, `getAll()`    |
| Clases           | `PascalCase`       | `ShoppingList`             |
| Archivos/módulos | `kebab-case`       | `db.js`, `app.js`          |
| Booleans         | prefijo `is/has`   | `isPurchased`, `hasItems`  |

### CSS

| Elemento              | Convención         | Ejemplo                       |
|-----------------------|--------------------|-------------------------------|
| Clases Bootstrap      | usar tal cual      | `.btn`, `.list-group-item`    |
| Clases custom         | `kebab-case`       | `.niqi-header`, `.item-card`  |
| Variables custom      | `--kebab-case`     | `--niqi-color-primary`        |
| IDs                   | `kebab-case`       | `#item-list`, `#input-name`   |

> Las clases custom llevan prefijo `niqi-` cuando hay riesgo de colisión con Bootstrap.

### HTML

| Elemento         | Convención         | Ejemplo                     |
|------------------|--------------------|-----------------------------|
| IDs              | `kebab-case`       | `id="item-list"`            |
| Data attributes  | `kebab-case`       | `data-item-id="3"`          |

### Archivos

| Tipo             | Convención         | Ejemplo                     |
|------------------|--------------------|-----------------------------|
| HTML/CSS/JS      | `kebab-case`       | `index.html`, `app.js`      |
| Documentación    | `kebab-case`       | `modelo-datos.md`           |

---

## 3. Clean Code (Uncle Bob)

### Principios fundamentales

- **Nombres descriptivos** — El nombre de una variable, función o clase debe explicar su propósito sin necesidad de comentario.
- **Funciones pequeñas** — Una función hace UNA cosa. Si necesitas comentar un bloque dentro de una función, extráelo a otra función.
- **Sin comentarios obvios** — No `// incrementa el contador`. Sí `// IndexedDB requiere transacción explícita para escritura`.
- **Sin números mágicos** — Usar constantes con nombre. `DB_VERSION = 1`, no `1` suelto.
- **Sin código muerto** — No dejar código comentado. Git lo recuerda todo.

### Estructura de funciones

```javascript
// ✅ Bien: nombre descriptivo, hace una cosa
function markItemAsPurchased(id) { ... }

// ❌ Mal: nombre genérico, hace demasiado
function handleClick(e) {
    // buscar item, cambiar estado, actualizar UI, guardar en DB...
}
```

### SOLID (adaptado a módulos JS)

| Principio | Aplicación en Niqi |
|-----------|-------------------|
| **S** — Responsabilidad única | `db.js` = datos, `app.js` = UI y lógica de presentación |
| **O** — Abierto/cerrado | Las funciones de `db.js` no asumen nada de la UI |
| **D** — Inversión de dependencias | `app.js` depende de las funciones de `db.js`, nunca al revés |

> L e I (Liskov, Segregación de interfaces) no aplican directamente al no usar clases ni interfaces, pero se respeta el espíritu: módulos con contratos claros y mínimos.

---

## 4. Organización del Código

### Estructura de un archivo JS

```javascript
// ===========================================
// [Nombre del módulo] — [Descripción breve]
// ===========================================

// --- Constantes ---

// --- Estado / Variables del módulo ---

// --- Funciones privadas (helpers) ---

// --- Funciones públicas (API del módulo) ---

// --- Inicialización ---
```

### Reglas

- **Un módulo, una responsabilidad.**
- **Exportar solo lo necesario.** El resto es privado al módulo.
- **Dependencias al inicio** del archivo.
- **Máximo ~100 líneas por archivo** como guía. Si crece, considerar dividir.

---

## 5. CSS + Bootstrap

- **Bootstrap primero** — Usar clases de Bootstrap siempre que cubran la necesidad. CSS custom solo para lo que Bootstrap no resuelva.
- **Mobile-first** — Bootstrap ya es mobile-first. Los estilos custom siguen la misma filosofía.
- **Variables CSS** — Sobreescribir variables de Bootstrap en `:root` para personalizar el tema. Variables custom propias con prefijo `--niqi-`.
- **Sin `!important`** — Si lo necesitas, la especificidad está mal.
- **`styles.css` es complementario** — No replicar lo que Bootstrap ya ofrece.
- **Orden de propiedades** (en CSS custom) — Layout → Box model → Tipografía → Visual → Misc.

---

## 6. HTML

- **Semántico** — Usar `<main>`, `<section>`, `<header>`, `<button>`, no `<div>` para todo.
- **Accesible** — Todos los inputs con `<label>`, botones con texto o `aria-label`.
- **IDs únicos y descriptivos** — Para facilitar testing y referencia desde JS.

---

## 7. Control de Versiones (Git)

### Commits

- **Atómicos** — Un commit = un cambio lógico.
- **Mensaje en español**, formato: `tipo: descripción breve`
  - Tipos: `feat`, `fix`, `docs`, `refactor`, `style`, `test`
  - Ejemplo: `feat: añadir función para eliminar producto`

### Ramas

- `main` — Código desplegado y estable.
- `dev` — Desarrollo activo (si se necesita).
- `feat/nombre` — Feature branches para cambios grandes.

---

## 8. Documentación

- **`docs/` como fuente de verdad** — Toda decisión relevante queda documentada.
- **Actualizar antes de implementar** — Primero el doc (modelo de datos, requisitos), luego el código.
- **Enlaces cruzados** — Los documentos se referencian entre sí.

---

## 9. Testing

- **Manual por ahora** — No hay framework de tests en el MVP.
- **Consola del navegador** — Verificar operaciones IndexedDB.
- **Lighthouse** — Auditoría PWA antes de cada versión.

---

*Este documento se revisa y actualiza conforme evolucione el proyecto.*
