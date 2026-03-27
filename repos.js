"use strict";

const MenuRepo = {
    async getActual() {
        const data = await DataSource.getMenuSemana();
        return normalizarMenuActual(data);
    },
    
    async saveActual(menu) {
        const seguro = normalizarMenuActual(menu);
        await DataSource.setMenuSemana(seguro);
        return seguro;
    },
    
    async clearActual() {
        await DataSource.setMenuSemana({});
    },
    
    async getArchivados() {
        const data = await DataSource.getMenusArchivados();
        const arr = Array.isArray(data) ? data : [];
        
        let cambiado = false;
        
        const normalizado = arr
            .map((m) => {
                const n = normalizarMenuArchivado(m);
                if (!n) {
                    if (m != null) cambiado = true;
                    return null;
                }
                return n;
            })
            .filter(Boolean);
        
        if (typeof asegurarIdsMenusArchivados === "function") {
            asegurarIdsMenusArchivados(normalizado);
            if (normalizado.__idsMigrados) cambiado = true;
        }
        
        normalizado.forEach((m, idx) => {
            if (!m.nombre) {
                m.nombre = `Menú ${idx + 1}`;
                cambiado = true;
            }
        });
        
        if (cambiado) {
            await DataSource.setMenusArchivados(normalizado);
        }
        
        return normalizado;
    },
    
    async saveArchivados(arr, opts = { refresh: false }) {
        const limpio = Array.isArray(arr) ?
            arr.map(normalizarMenuArchivado).filter(Boolean) :
            [];
        
        await DataSource.setMenusArchivados(limpio);
        
        if (opts.refresh) {
            if (typeof mostrarTablaMenu === "function") {
                await mostrarTablaMenu();
            }
        }
        
        return limpio;
    },
    
    async buildActualDesdeInputs() {
        const actual = await this.getActual();
        const dias = {};
        
        diasSemana.forEach(dia => {
            const comidaInput = document.getElementById(`comida-${dia}`);
            const cenaInput = document.getElementById(`cena-${dia}`);
            
            dias[dia] = {
                comida: (comidaInput?.value || "").trim(),
                cena: (cenaInput?.value || "").trim()
            };
        });
        
        const archivados = await this.getArchivados();
        const nombre = String(actual?.nombre || "").trim() || `Menú ${archivados.length + 1}`;
        
        return normalizarMenuActual({
            id: actual?.id || generarIdMenu(),
            creado: actual?.creado || new Date().toISOString(),
            nombre,
            dias
        });
    },
    
    async buildEditadoDesdeModal() {
        const actual = await this.getActual();
        const archivados = await this.getArchivados();
        const nombre = String(actual?.nombre || "").trim() || `Menú ${archivados.length + 1}`;
        const dias = {};
        
        diasSemana.forEach(dia => {
            dias[dia] = {
                comida: (document.getElementById(`editComida-${dia}`)?.value || "").trim(),
                cena: (document.getElementById(`editCena-${dia}`)?.value || "").trim()
            };
        });
        
        return normalizarMenuActual({
            id: actual?.id || generarIdMenu(),
            creado: actual?.creado || new Date().toISOString(),
            nombre,
            dias
        });
    },
    
    async archivarActual() {
        const actual = await this.getActual();
        
        const tieneContenido = diasSemana.some(dia => {
            const comida = (actual?.dias?.[dia]?.comida || "").trim();
            const cena = (actual?.dias?.[dia]?.cena || "").trim();
            return comida || cena;
        });
        
        if (!tieneContenido) return null;
        
        const archivados = await this.getArchivados();
        
        const archivado = normalizarMenuArchivado({
            id: actual.id || generarIdMenu(),
            creado: actual.creado || new Date().toISOString(),
            nombre: (actual.nombre || "").trim() || `Menú ${archivados.length + 1}`,
            fechaArchivado: new Date().toISOString(),
            dias: actual.dias
        });
        
        await this.saveArchivados([...archivados, archivado], { refresh: false });
        await this.clearActual();
        
        return archivado;
    },
    
    async recuperarArchivado(id) {
        const archivados = await this.getArchivados();
        const idx = archivados.findIndex(m => m && m.id === id);
        if (idx === -1) return null;
        
        const raw = archivados.splice(idx, 1)[0];
        const menu = normalizarMenuArchivado(raw);
        if (!menu) return null;
        
        await this.saveActual({
            id: menu.id,
            nombre: menu.nombre,
            creado: menu.creado || new Date().toISOString(),
            dias: menu.dias
        });
        
        await this.saveArchivados(archivados, { refresh: false });
        
        return menu;
    },
    
    async cargarArchivadoPorIndex(index) {
        const archivados = await this.getArchivados();
        const menu = archivados[index];
        if (!menu) return null;
        
        const normalizado = normalizarMenuArchivado(menu);
        if (!normalizado) return null;
        
        return await this.saveActual({
            id: normalizado.id,
            nombre: normalizado.nombre,
            creado: normalizado.creado || new Date().toISOString(),
            dias: normalizado.dias
        });
    }
};


const CarritoRepo = {
    async getAll() {
        const data = await DataSource.getCarrito();
        const arr = Array.isArray(data) ? data : [];
        
        const normalizado = arr.map(normalizarProductoCarrito);
        
        if (typeof asegurarIdsCarrito === "function") {
            asegurarIdsCarrito(normalizado);
        }
        
        carrito = normalizado;
        return normalizado;
    },
    
    
    async saveAll(items, opts = { refresh: false }) {
        const limpio = Array.isArray(items) ?
            items.map(normalizarProductoCarrito) :
            [];
        
        await DataSource.setCarrito(limpio);
        carrito = limpio;
        
        if (opts.refresh) {
            Promise.resolve(mostrarCarrito()).catch(console.error);
        }
        
        return limpio;
    },
    
   

    async findById(id) {
        const items = await this.getAll();
        return items.find(item => item && item.id === id) || null;
    },
    
    async removeById(id, opts = { refresh: false }) {
        const items = await this.getAll();
        const filtrado = items.filter(item => item && item.id !== id);
        await this.saveAll(filtrado, opts);
        return filtrado;
    },
    
    async removeSelected(ids, opts = { refresh: false }) {
        const idsSet = ids instanceof Set ? ids : new Set(ids || []);
        const items = await this.getAll();
        const filtrado = items.filter(item => item && !idsSet.has(item.id));
        await this.saveAll(filtrado, opts);
        return filtrado;
    },
    
    async clear(opts = { refresh: false }) {
        await this.saveAll([], opts);
        return [];
    },
    
    async updateById(id, patch, opts = { refresh: false }) {
        const items = await this.getAll();
        
        const actualizados = items.map(item => {
            if (!item || item.id !== id) return item;
            
            return normalizarProductoCarrito({
                ...item,
                ...(patch || {})
            });
        });
        
        await this.saveAll(actualizados, opts);
        
        return actualizados.find(item => item && item.id === id) || null;
    },
    
    async add(item, opts = { refresh: false }) {
        const normalizado = normalizarProductoCarrito(item);
        const items = await this.getAll();
        
        const nuevos = [...items, normalizado];
        
        await this.saveAll(nuevos, opts);
        return normalizado;
    },
    
    async mergeByNombre(nombre, cantidadSumar = null, opts = { refresh: false }) {
        
        const nombreLimpio = String(nombre || "").trim();
        if (!nombreLimpio) return null;
        
        const items = await this.getAll();
        
        const idx = items.findIndex(item =>
            item &&
            String(item.nombre || "").trim().toLowerCase() === nombreLimpio.toLowerCase()
        );
        
        if (idx === -1) {
            
            const nuevo = normalizarProductoCarrito({
                id: generarIdCarrito(),
                nombre: nombreLimpio,
                cantidad: cantidadSumar
            });
            
            const nuevos = [...items, nuevo];
            
            await this.saveAll(nuevos, opts);
            return nuevo;
        }
        
        const actual = items[idx];
        
        const cantidadActual = normalizarCantidad(actual.cantidad);
        const cantidadNueva = normalizarCantidad(cantidadSumar);
        
        let cantidadFinal = cantidadActual;
        
        if (cantidadNueva !== null) {
            cantidadFinal = (cantidadActual || 0) + cantidadNueva;
        }
        
        const actualizado = normalizarProductoCarrito({
            ...actual,
            nombre: nombreLimpio,
            cantidad: cantidadFinal
        });
        
        const nuevos = [...items];
        nuevos[idx] = actualizado;
        
        await this.saveAll(nuevos, opts);
        
        return actualizado;
    },
    
    async addOrMerge(item, opts = { refresh: false }) {
        
        const nombre = String(item?.nombre || "").trim();
        if (!nombre) return null;
        
        const cantidad = item?.cantidad ?? null;
        
        return await this.mergeByNombre(nombre, cantidad, opts);
    },
    
    async renameOrMergeById(id, patch, opts = { refresh: false }) {
        
        const items = await this.getAll();
        
        const actual = items.find(item => item && item.id === id);
        if (!actual) return null;
        
        const nuevoNombre = String(patch?.nombre || "").trim();
        if (!nuevoNombre) return null;
        
        let nuevaCantidad = patch?.cantidad ?? null;
        nuevaCantidad = normalizarCantidad(nuevaCantidad);
        
        const duplicado = items.find(item =>
            item &&
            item.id !== id &&
            String(item.nombre || "").trim().toLowerCase() === nuevoNombre.toLowerCase()
        );
        
        if (!duplicado) {
            
            return await this.updateById(id, {
                ...patch,
                nombre: nuevoNombre,
                cantidad: nuevaCantidad
            }, opts);
        }
        
        const cantidadDuplicado = normalizarCantidad(duplicado.cantidad);
        const cantidadActual = normalizarCantidad(actual.cantidad);
        
        let cantidadFinal = cantidadDuplicado;
        
        if (nuevaCantidad !== null) {
            cantidadFinal = (cantidadDuplicado || 0) + nuevaCantidad;
        }
        else if (cantidadDuplicado === null && cantidadActual !== null) {
            cantidadFinal = cantidadActual;
        }
        
        const fusionado = normalizarProductoCarrito({
            ...duplicado,
            nombre: nuevoNombre,
            cantidad: cantidadFinal
        });
        
        const filtrado = items.filter(item =>
            item &&
            item.id !== id &&
            item.id !== duplicado.id
        );
        
        const nuevos = [...filtrado, fusionado];
        
        await this.saveAll(nuevos, opts);
        
        return fusionado;
    }
    
};


const InventarioRepo = {
    async getAll() {
        const data = await DataSource.getInventario();
        const arr = Array.isArray(data) ? data : [];
        
        const normalizado = arr
            .map(normalizarProductoInventario)
            .filter(Boolean);
        
        productos = normalizado;
        return normalizado;
    },
    
    async saveAll(items, opts = { refresh: true }) {
        const limpio = Array.isArray(items) ?
            items.map(normalizarProductoInventario).filter(Boolean) :
            [];
        
        await DataSource.setInventario(limpio);
        productos = limpio;
        
        if (opts.refresh) {
            if (typeof verInventario === "function") {
                await verInventario();
            }
        }
        
        return limpio;
    },
    
    async findById(id) {
        const items = await this.getAll();
        return items.find(item => item && item.id === id) || null;
    },
    
    async addOrMerge(nombre, cantidadRaw, fechaCaducidad, opts = { refresh: true }) {
        const nNombre = String(nombre || "").trim();
        const nFecha = String(fechaCaducidad || "").trim();
        const nCant = toNumberOrNullInventario(cantidadRaw);
        
        if (!nNombre || !nFecha) return false;
        if (nCant === null || nCant <= 0) return "cantidad_invalida";
        
        const items = await this.getAll();
        const k = keyNombre(nNombre);
        
        const idx = items.findIndex(p =>
            p &&
            keyNombre(p.nombre || "") === k &&
            String(p.fechaCaducidad || "").trim() === nFecha
        );
        
        if (idx === -1) {
            const nuevo = normalizarProductoInventario({
                id: generarIdInventario(),
                nombre: nNombre,
                cantidad: nCant,
                fechaCaducidad: nFecha
            });
            
            await this.saveAll([...items, nuevo], opts);
            return true;
        }
        
        const actual = items[idx];
        const base = toNumberOrNullInventario(actual.cantidad) ?? 0;
        
        const actualizado = normalizarProductoInventario({
            ...actual,
            nombre: nNombre,
            cantidad: base + nCant,
            fechaCaducidad: nFecha
        });
        
        const nuevos = [...items];
        nuevos[idx] = actualizado;
        
        await this.saveAll(nuevos, opts);
        return true;
    },
    
    async updateById(id, patch, opts = { refresh: true }) {
        const items = await this.getAll();
        
        const actualizados = items.map(item => {
            if (!item || item.id !== id) return item;
            
            return normalizarProductoInventario({
                ...item,
                ...(patch || {})
            });
        });
        
        await this.saveAll(actualizados, opts);
        return actualizados.find(item => item && item.id === id) || null;
    },
    
    async removeById(id, opts = { refresh: true }) {
        const items = await this.getAll();
        const nuevos = items.filter(item => item && item.id !== id);
        await this.saveAll(nuevos, opts);
        return nuevos;
    }
};


const DespensaRepo = {
    async getAll() {
        const data = await DataSource.getDespensa();
        const arr = Array.isArray(data) ? data : [];
        
        const normalizado = arr.map(normalizarProductoDespensa);
        
        if (typeof asegurarIdsDespensa === "function") {
            asegurarIdsDespensa(normalizado);
        }
        
        despensa = normalizado;
        return normalizado;
    },
    
    async saveAll(items, opts = { refresh: false }) {
        const limpio = Array.isArray(items) ?
            items.map(normalizarProductoDespensa) :
            [];
        
        await DataSource.setDespensa(limpio);
        despensa = limpio;
        
        if (opts.refresh) {
            Promise.resolve(mostrarDespensa()).catch(console.error);
        }
        
        return limpio;
    },
    
    async findById(id) {
        const items = await this.getAll();
        return items.find(item => item && item.id === id) || null;
    },
    
    async removeById(id, opts = { refresh: false }) {
        const items = await this.getAll();
        const filtrado = items.filter(item => item && item.id !== id);
        await this.saveAll(filtrado, opts);
        return filtrado;
    },
    
    async removeSelected(ids, opts = { refresh: false }) {
        const idsSet = ids instanceof Set ? ids : new Set(ids || []);
        const items = await this.getAll();
        const filtrado = items.filter(item => item && !idsSet.has(item.id));
        await this.saveAll(filtrado, opts);
        return filtrado;
    },
    
    async clear(opts = { refresh: false }) {
        await this.saveAll([], opts);
        return [];
    },
    
    async updateById(id, patch, opts = { refresh: false }) {
        const items = await this.getAll();
        
        const actualizados = items.map(item => {
            if (!item || item.id !== id) return item;
            
            return normalizarProductoDespensa({
                ...item,
                ...(patch || {})
            });
        });
        
        await this.saveAll(actualizados, opts);
        return actualizados.find(item => item && item.id === id) || null;
    },
    
    async add(item, opts = { refresh: false }) {
        const normalizado = normalizarProductoDespensa(item);
        const items = await this.getAll();
        
        const nuevos = [...items, normalizado];
        
        await this.saveAll(nuevos, opts);
        return normalizado;
    },
    
    async mergeByNombre(nombre, cantidad = null, caducidad = null, opts = { refresh: false }) {
        const nombreLimpio = String(nombre || "").trim();
        if (!nombreLimpio) return null;
        
        const items = await this.getAll();
        
        const idx = items.findIndex(item =>
            item &&
            String(item.nombre || "").trim().toLowerCase() === nombreLimpio.toLowerCase()
        );
        
        if (idx === -1) {
            const nuevo = normalizarProductoDespensa({
                id: generarIdDespensa(),
                nombre: nombreLimpio,
                cantidad,
                caducidad
            });
            
            const nuevos = [...items, nuevo];
            await this.saveAll(nuevos, opts);
            return nuevo;
        }
        
        const actual = items[idx];
        const cantidadActual = normalizarCantidadDespensa(actual.cantidad);
        const cantidadNueva = normalizarCantidadDespensa(cantidad);
        
        let cantidadFinal = cantidadActual;
        if (cantidadNueva !== null) {
            cantidadFinal = (cantidadActual || 0) + cantidadNueva;
        }
        
        const actualizado = normalizarProductoDespensa({
            ...actual,
            nombre: nombreLimpio,
            cantidad: cantidadFinal,
            caducidad: caducidad ?? actual.caducidad ?? null
        });
        
        const nuevos = [...items];
        nuevos[idx] = actualizado;
        
        await this.saveAll(nuevos, opts);
        return actualizado;
    },
    
    async addOrMerge(item, opts = { refresh: false }) {
        const nombre = String(item?.nombre || "").trim();
        if (!nombre) return null;
        
        return await this.mergeByNombre(
            nombre,
            item?.cantidad ?? null,
            item?.caducidad ?? null,
            opts
        );
    },
    
    async renameOrMergeById(id, patch, opts = { refresh: false }) {
        const items = await this.getAll();
        const actual = items.find(item => item && item.id === id);
        if (!actual) return null;
        
        const nuevoNombre = String(patch?.nombre || "").trim();
        if (!nuevoNombre) return null;
        
        const nuevaCantidad = normalizarCantidadDespensa(patch?.cantidad);
        const nuevaCaducidad =
            patch?.caducidad === null ||
            typeof patch?.caducidad === "undefined" ||
            String(patch.caducidad).trim() === "" ?
            null :
            String(patch.caducidad).trim();
        
        const duplicado = items.find(item =>
            item &&
            item.id !== id &&
            String(item.nombre || "").trim().toLowerCase() === nuevoNombre.toLowerCase()
        );
        
        if (!duplicado) {
            return await this.updateById(id, {
                ...patch,
                nombre: nuevoNombre,
                cantidad: nuevaCantidad,
                caducidad: nuevaCaducidad
            }, opts);
        }
        
        const cantidadDuplicado = normalizarCantidadDespensa(duplicado.cantidad);
        const cantidadActual = normalizarCantidadDespensa(actual.cantidad);
        
        let cantidadFinal = cantidadDuplicado;
        if (nuevaCantidad !== null) {
            cantidadFinal = (cantidadDuplicado || 0) + nuevaCantidad;
        } else if (cantidadDuplicado === null && cantidadActual !== null) {
            cantidadFinal = cantidadActual;
        }
        
        const caducidadFinal = nuevaCaducidad ?? duplicado.caducidad ?? actual.caducidad ?? null;
        
        const fusionado = normalizarProductoDespensa({
            ...duplicado,
            nombre: nuevoNombre,
            cantidad: cantidadFinal,
            caducidad: caducidadFinal
        });
        
        const filtrado = items.filter(item => item && item.id !== id && item.id !== duplicado.id);
        const nuevos = [...filtrado, fusionado];
        
        await this.saveAll(nuevos, opts);
        return fusionado;
    }
};



const RecetasRepo = {
    async getAll() {
        const raw = await DataSource.getRecetas();
        const arr = Array.isArray(raw) ? raw : [];
        
        const normalizadas = arr
            .map(normalizarReceta)
            .filter(r => r.nombre);
        
        await DataSource.setRecetas(normalizadas);
        recetas = normalizadas;
        
        return normalizadas;
    },
    
    async saveAll(arr) {
        const limpio = Array.isArray(arr) ?
            arr.map(normalizarReceta).filter(r => r.nombre) :
            [];
        
        await DataSource.setRecetas(limpio);
        recetas = limpio;
        
        return limpio;
    },
    
    async findById(id) {
        const items = await this.getAll();
        return items.find(r => r && r.id === id) || null;
    },
    
    async findByNombre(nombre) {
        const items = await this.getAll();
        const key = keyNombre(nombre);
        return items.find(r => keyNombre(r.nombre) === key) || null;
    },
    
    async getByTipo(tipo) {
        const items = await this.getAll();
        return items.filter(r => r.tipo === tipo);
    },
    
    async add(receta) {
        const nueva = normalizarReceta(receta);
        
        if (!nueva.nombre || !nueva.ingredientes.length) return null;
        
        const actuales = await this.getAll();
        
        const existe = actuales.some(
            r => keyNombre(r.nombre) === keyNombre(nueva.nombre)
        );
        
        if (existe) return "duplicada";
        
        await this.saveAll([...actuales, nueva]);
        
        return nueva;
    },
    
    async removeById(id) {
        const actuales = await this.getAll();
        const filtradas = actuales.filter(r => r.id !== id);
        
        await this.saveAll(filtradas);
        
        return filtradas;
    },
    
    async removeByNombre(nombre) {
        const receta = await this.findByNombre(nombre);
        if (!receta) return await this.getAll();
        
        return await this.removeById(receta.id);
    }
};


const PasoAPasoRepo = {
    async getAll() {
        const raw = await DataSource.getPasoAPaso();
        const arr = Array.isArray(raw) ? raw : [];
        
        const recetasActuales = await RecetasRepo.getAll();
        
        let cambiado = false;
        
        const normalizados = arr
            .map(item => {
                const n = normalizarPasoAPasoItem(item);
                if (!n.nombre) return null;
                
                if (!n.id) {
                    const receta = recetasActuales.find(
                        r => keyNombre(r.nombre) === keyNombre(n.nombre)
                    );
                    
                    if (receta?.id) {
                        n.id = receta.id;
                        cambiado = true;
                    }
                }
                
                return n;
            })
            .filter(Boolean);
        
        const vistos = new Set();
        
        const limpios = normalizados.filter(item => {
            const clave = item.id ?
                `id:${item.id}` :
                `nombre:${keyNombre(item.nombre)}`;
            
            if (vistos.has(clave)) {
                cambiado = true;
                return false;
            }
            
            vistos.add(clave);
            return true;
        });
        
        if (cambiado) {
            await DataSource.setPasoAPaso(limpios);
        }
        
        pasoAPaso = limpios;
        
        return limpios;
    },
    
    async saveAll(arr) {
        const limpio = Array.isArray(arr) ?
            arr.map(normalizarPasoAPasoItem).filter(r => r.nombre) :
            [];
        
        await DataSource.setPasoAPaso(limpio);
        pasoAPaso = limpio;
        
        return limpio;
    },

    
    async findById(id) {
        const items = await this.getAll();
        const idLimpio = String(id || "").trim();
        
        if (!idLimpio) return null;
        
        return items.find(r => r.id === idLimpio) || null;
    },
    
    async findByNombre(nombre) {
        const items = await this.getAll();
        const key = keyNombre(nombre);
        
        return items.find(r => keyNombre(r.nombre) === key) || null;
    },
    
    async ensureReceta(id, nombre) {
        const idLimpio = String(id || "").trim();
        const nombreLimpio = String(nombre || "").trim();
        
        if (!idLimpio || !nombreLimpio) return null;
        
        const actual = await this.findById(idLimpio);
        
        if (actual) return actual;
        
        const nuevo = {
            id: idLimpio,
            nombre: nombreLimpio,
            pasos: ""
        };
        
        const actuales = await this.getAll();
        
        await this.saveAll([...actuales, nuevo]);
        
        return nuevo;
    },
    
    async upsert(id, nombre, pasosTexto) {
        const idLimpio = String(id || "").trim();
        const nombreLimpio = String(nombre || "").trim();
        
        if (!idLimpio || !nombreLimpio) return null;
        
        const pasos = Array.isArray(pasosTexto) ?
            pasosTexto.map(p => String(p || "").trim()).filter(Boolean).join("\n") :
            String(pasosTexto ?? "").trim();
        
        const actuales = await this.getAll();
        
        const idx = actuales.findIndex(r => r.id === idLimpio);
        
        if (idx === -1) {
            const nuevo = { id: idLimpio, nombre: nombreLimpio, pasos };
            
            await this.saveAll([...actuales, nuevo]);
            
            return nuevo;
        }
        
        const nuevos = [...actuales];
        
        nuevos[idx] = {
            ...nuevos[idx],
            nombre: nombreLimpio,
            pasos
        };
        
        await this.saveAll(nuevos);
        
        return nuevos[idx];
    },
    
    async removeById(id) {
        const actuales = await this.getAll();
        
        const idLimpio = String(id || "").trim();
        
        const filtradas = actuales.filter(r => r.id !== idLimpio);
        
        await this.saveAll(filtradas);
        
        return filtradas;
    },
    
    async removeByNombre(nombre) {
        const actual = await this.findByNombre(nombre);
        
        if (!actual) return await this.getAll();
        
        return await this.removeById(actual.id);
    }
};
