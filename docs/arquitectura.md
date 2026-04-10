# Niqi — Arquitectura

> Para la definición del sistema y sus objetivos, ver [definicion-sistema.md](definicion-sistema.md).

---

## Diagrama de Arquitectura

```
┌─────────────────────────────────┐
│         Hosting estático        │
│   (GitHub Pages / Netlify /     │
│    Cloudflare Pages / Vercel)   │
│                                 │
│   Sirve: index.html, app.js,   │
│          styles.css, sw.js,     │
│          manifest.json, icons   │
└────────────┬────────────────────┘
             │ descarga inicial
             ▼
┌─────────────────────────────────┐
│        Navegador (móvil)        │
│                                 │
│  ┌───────────┐  ┌────────────┐  │
│  │   UI      │  │  Service   │  │
│  │  (HTML +  │◄─┤  Worker    │  │
│  │  CSS +JS) │  │  (cache)   │  │
│  └─────┬─────┘  └────────────┘  │
│        │                        │
│        ▼                        │
│  ┌───────────┐                  │
│  │ IndexedDB │                  │
│  │  (datos)  │                  │
│  └───────────┘                  │
└─────────────────────────────────┘
```

### Flujo

1. El usuario accede a la URL por primera vez → se descargan los archivos estáticos.
2. El **Service Worker** cachea todos los recursos → la app funciona **offline**.
3. La UI lee/escribe datos en **IndexedDB** directamente desde JavaScript.
4. No hay API, no hay servidor, no hay autenticación.

---

## Stack Técnico

| Capa            | Tecnología                          |
|-----------------|-------------------------------------|
| Estructura      | HTML5                               |
| Estilos         | Bootstrap 5 (CDN) + CSS3 custom     |
| Lógica          | JavaScript (vanilla, ES modules)    |
| Datos locales   | IndexedDB                           |
| Offline         | Service Worker + Cache API          |
| Instalable      | Web App Manifest (manifest.json)    |
| Hosting         | GitHub Pages (gratis)               |

> Sin frameworks JS, sin npm, sin build tools. Bootstrap se carga por CDN como única dependencia externa.

---

## Estructura de Archivos

```
niqi/
├── docs/
│   ├── arquitectura.md          ← este documento
│   ├── definicion-sistema.md    ← qué es Niqi, objetivos, alcance
│   ├── modelo-datos.md          ← DDL y esquema IndexedDB
│   ├── tracker.md               ← seguimiento del desarrollo
│   └── versiones/
│       └── v0.1.md              ← requisitos e historias de usuario v0.1
├── index.html                    ← página única (SPA)
├── styles.css                    ← estilos
├── app.js                        ← lógica principal + UI
├── db.js                         ← módulo IndexedDB
├── sw.js                         ← Service Worker
├── manifest.json                 ← configuración PWA
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

---

## Hosting Gratuito

**Opción recomendada: GitHub Pages**

1. Subir el código a un repo en GitHub.
2. Activar GitHub Pages desde Settings → Pages → rama `main`.
3. La app estará disponible en `https://<usuario>.github.io/niqi/`.

**Alternativas:** Netlify, Cloudflare Pages, Vercel — todos ofrecen hosting estático gratuito con HTTPS.

---

## Service Worker — Estrategia de Cache

```
Estrategia: Cache First, Network Fallback

1. Instalar → cachear todos los recursos estáticos
2. Fetch → servir desde cache; si no existe, ir a red
3. Activar → limpiar caches antiguos
```

Esto garantiza que la app funcione sin conexión después de la primera visita.

---

## Documentación Relacionada

| Documento | Descripción |
|-----------|-------------|
| [definicion-sistema.md](definicion-sistema.md) | Qué es Niqi, objetivos, alcance y restricciones |
| [modelo-datos.md](modelo-datos.md) | Schema IndexedDB (DDL canónico) |
| [versiones/v0.1.md](versiones/v0.1.md) | Requisitos, historias de usuario y casos de uso v0.1 |
| [tracker.md](tracker.md) | Estado del desarrollo |

---

*Documento vivo — se actualizará conforme avance el desarrollo.*
