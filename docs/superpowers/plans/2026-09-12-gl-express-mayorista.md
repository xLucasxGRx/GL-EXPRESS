# GL EXPRESS Mayorista Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the GL EXPRESS independent copy into an exclusive Wholesale Catalog PWA connected to the MAYORISTA Google Sheets tab with cart and WhatsApp order generation.

**Architecture:** A lightweight Vanilla JS + CSS PWA architecture. Data is extracted via published Google Sheets CSV endpoint (tab `MAYORISTA`, gid `2013926010`). Wholesale cards render only Image, Product name, USA price, and "PUESTO EN PERÚ". Quantity selector builds the cart order stored in `localStorage` under `glexpress_*`. Order generator formats and encodes WhatsApp message for instant direct checkout.

**Tech Stack:** Vanilla HTML5, Vanilla CSS3 (luxury dark/gold theme), Vanilla JavaScript ES6+, Service Worker for Offline PWA.

---

## Global Constraints

- Never modify DUNES-APP repository.
- Structure of Google Sheets MAYORISTA tab remains strictly unchanged (Columns A-L: Producto, Precio USA ($), Cantidad, Categoria, Genero, Peso KG, Flete x KG, Reempaque, Precio Dolar (T.C), Costo Perú, imagen, Estado catálogo).
- Column J ("Costo Perú") is labeled and displayed exclusively as "PUESTO EN PERÚ".
- Completely hide from client: Cantidad, Peso KG, Flete x KG, Reempaque, Precio Dólar (T.C), Ganancias, Costos internos, Precio de venta sugerido.
- Cart is solely an order generator for WhatsApp, not an inventory system.
- Storage keys prefixed with `glexpress_*`.

---

### Task 1: Unit tests for Wholesale Data Extraction, Cart & WhatsApp Format

**Files:**
- Create: `tests/mayorista-cart.test.js`

- [ ] **Step 1: Write tests for MAYORISTA tab mapping, column privacy, cart logic and WhatsApp formatting**
- [ ] **Step 2: Run test to observe behavior**
- [ ] **Step 3: Commit / baseline check**

---

### Task 2: Update Semantic UI & HTML Structure

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Update metadata, header branding, and remove retail calculator views**
- [ ] **Step 2: Add Floating Cart Button and Wholesale Order Modal with WhatsApp submission**

---

### Task 3: Wholesale Card, Floating Button & Modal Styles

**Files:**
- Modify: `style.css`

- [ ] **Step 1: Add styles for wholesale vertical cards, 110x110px image, [-] 1 [+] quantity stepper and Add button**
- [ ] **Step 2: Add styles for floating cart button and order review modal**

---

### Task 4: Wholesale Logic, Cart Management & Google Sheets Sync

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Update default URL to MAYORISTA tab (gid=2013926010) and rename storage keys to `glexpress_*`**
- [ ] **Step 2: Update row converter to map Column J to `puestoPeru` and hide private columns**
- [ ] **Step 3: Implement cart operations and WhatsApp order message generator**
- [ ] **Step 4: Connect interactive stepper controls and modal triggers**

---

### Task 5: PWA Manifest & Service Worker

**Files:**
- Modify: `manifest.json`
- Modify: `service-worker.js`

- [ ] **Step 1: Update manifest name to GL EXPRESS MAYORISTA**
- [ ] **Step 2: Update cache name to `glexpress-v1.0`**

---

### Task 6: End-to-End Verification

- [ ] **Step 1: Run all automated tests**
- [ ] **Step 2: Verify in browser**
