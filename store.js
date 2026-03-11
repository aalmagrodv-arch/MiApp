  // ===================== STORE (único punto de acceso) =====================
const Store = (() => {
  const KEYS = {
    recetas: "recetas",
    productos: "productos",
    carrito: "carrito",
    pasoAPaso: "pasoAPaso",
    menuSemana: "menuSemana",
    menusArchivados: "menusArchivados",
    temaSeleccionado: "temaSeleccionado",
    despensa: "despensa",
  };

  function get(key, fallback) {
    const k = typeof key === "string" ? key : String(key);
    const raw = localStorage.getItem(k);
    if (raw === null || raw === undefined || raw === "") return fallback;
    try { return JSON.parse(raw); } catch { return fallback; }
  }

  function set(key, value) {
    const k = typeof key === "string" ? key : String(key);
    localStorage.setItem(k, JSON.stringify(value));
    return value;
  }

  function update(key, fallback, mutatorFn) {
    const current = get(key, fallback);
    const next = mutatorFn(current) ?? current;
    set(key, next);
    return next;
  }

  return {
    KEYS,
    get, set, update,

    loadRecetas:   () => get(KEYS.recetas, []),
    saveRecetas:   (v) => set(KEYS.recetas, v),

    loadProductos: () => get(KEYS.productos, []),
    saveProductos: (v) => set(KEYS.productos, v),

    loadCarrito:   () => get(KEYS.carrito, []),
    saveCarrito:   (v) => set(KEYS.carrito, v),

    loadPasoAPaso: () => get(KEYS.pasoAPaso, []),
    savePasoAPaso: (v) => set(KEYS.pasoAPaso, v),

    loadMenuSemana: () => get(KEYS.menuSemana, {}),
    saveMenuSemana: (v) => set(KEYS.menuSemana, v),

    loadMenusArchivados: () => get(KEYS.menusArchivados, []),
    saveMenusArchivados: (v) => set(KEYS.menusArchivados, v),

   loadTema: () => get(KEYS.temaSeleccionado, "original"),
   
    saveTema: (v) => set(KEYS.temaSeleccionado, v),
    
    loadDespensa: () => get(KEYS.despensa, []),
    saveDespensa: (v) => set(KEYS.despensa, v),

    resetAll: () => {
      Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    }
  };
})();
