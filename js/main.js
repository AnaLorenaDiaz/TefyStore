let db = [];
let cart = [];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cargar base de datos
    try {
        const res = await fetch('./data.json');
        db = await res.json();
        
        // Determinar qué página estamos visualizando para renderizar lo correcto
        if (document.getElementById('grid-todos-productos')) {
            applyFilters(); // Estamos en productos.html
        } else if (document.getElementById('grid-productos')) {
            renderCatalogoInicio(); // Estamos en index.html
        }
    } catch (e) { 
        console.error("Error cargando productos", e); 
    }

    // 2. Lógica del Menú Móvil
    const btnOpen = document.getElementById('menu-open-btn') || document.getElementById('menu-open');
    const btnClose = document.getElementById('menu-close-btn') || document.getElementById('menu-close');
    const mobileMenu = document.getElementById('mobile-menu');
    const links = document.querySelectorAll('.mobile-link');

    const toggleNav = (isOpen) => {
        if (!mobileMenu) return;
        mobileMenu.classList.toggle('translate-x-full', !isOpen);
        mobileMenu.classList.toggle('translate-x-0', isOpen);
        if (isOpen) {
            document.body.classList.add('menu-open');
        } else {
            document.body.classList.remove('menu-open');
        }
    };

    if(btnOpen) btnOpen.onclick = () => toggleNav(true);
    if(btnClose) btnClose.onclick = () => toggleNav(false);
    links.forEach(l => l.onclick = () => toggleNav(false));
});

/* ==========================================
   LÓGICA DE RENDERIZADO (CATÁLOGO E INICIO)
   ========================================== */

// Para index.html (Muestra los primeros 5 o favoritos)
function renderCatalogoInicio() {
    const grid = document.getElementById('grid-productos');
    if (!grid) return;
    
    // Mostramos solo los primeros 5 productos como "Favoritos"
    const favoritos = db.slice(0, 5);
    
    grid.innerHTML = favoritos.map(p => templateProducto(p)).join('');
}

// Función común para el diseño de la tarjeta de producto
function templateProducto(p) {
    return `
        <div class="bg-white rounded-2xl overflow-hidden border border-gray-100 flex flex-col shadow-sm">
            <div class="cursor-pointer aspect-square overflow-hidden" onclick="abrirDetalle(${p.id})">
                <img src="${p.imagenPrincipal}" class="w-full h-full object-cover hover:scale-105 transition duration-500">
            </div>
            <div class="p-4 text-center flex-grow flex flex-col">
                <h3 class="text-sm font-bold h-10 line-clamp-2 cursor-pointer hover:text-[#7A8974]" onclick="abrirDetalle(${p.id})">${p.nombre}</h3>
                <p class="text-[#7A8974] font-serif my-2 text-lg font-bold">S/ ${p.precio_new.toFixed(2)}</p>
                <button onclick="pedidoRapido(${p.id})" class="mt-auto bg-[#7A8974] text-white py-3 rounded-xl font-bold text-[10px] uppercase">Realizar Pedido</button>
            </div>
        </div>
    `;
}

/* ==========================================
   LÓGICA DE FILTROS (productos.html)
   ========================================== */

function applyFilters() {
    const grid = document.getElementById('grid-todos-productos');
    if (!grid) return;

    let filtered = [...db];
    const priceRange = document.getElementById('filter-price')?.value || 'all';
    const sortOrder = document.getElementById('sort-order')?.value || 'az';

    // Filtrar por precio
    if (priceRange !== 'all') {
        filtered = filtered.filter(p => {
            if (priceRange === 'low') return p.precio_new <= 50;
            if (priceRange === 'mid') return p.precio_new > 50 && p.precio_new <= 150;
            if (priceRange === 'high') return p.precio_new > 150;
        });
    }

    // Ordenar
    filtered.sort((a, b) => {
        if (sortOrder === 'az') return a.nombre.localeCompare(b.nombre);
        if (sortOrder === 'za') return b.nombre.localeCompare(a.nombre);
        if (sortOrder === 'price-asc') return a.precio_new - b.precio_new;
        if (sortOrder === 'price-desc') return b.precio_new - a.precio_new;
    });

    // Actualizar contador
    const quantityLabel = document.getElementById('product-quantity');
    if (quantityLabel) quantityLabel.innerText = filtered.length;

    grid.innerHTML = filtered.map(p => templateProducto(p)).join('');
}

/* ==========================================
   PÁGINA DE DETALLE Y CARRITO
   ========================================== */

function abrirDetalle(id) {
    const p = db.find(x => x.id === id);
    if (!p) return;

    document.getElementById('detalle-titulo').innerText = p.nombre;
    document.getElementById('detalle-precio-new').innerText = `S/ ${p.precio_new.toFixed(2)}`;
    document.getElementById('detalle-desc').innerText = p.descripcion;
    document.getElementById('detalle-img-principal').src = p.imagenPrincipal;
    document.getElementById('det-qty').value = 1;

    // Miniaturas
    const fotos = [p.imagenPrincipal, ...p.imagenesGaleria];
    const contenedorMini = document.getElementById('detalle-miniaturas');
    if (contenedorMini) {
        contenedorMini.innerHTML = fotos.map(f => `
            <img src="${f}" class="aspect-square object-cover rounded-lg border cursor-pointer opacity-70 hover:opacity-100" 
                 onclick="document.getElementById('detalle-img-principal').src='${f}'">
        `).join('');
    }

    // Configurar botones del detalle
    document.getElementById('btn-add-carrito').onclick = () => addToCart(p, parseInt(document.getElementById('det-qty').value));
    document.getElementById('btn-checkout-directo').onclick = () => {
        addToCart(p, parseInt(document.getElementById('det-qty').value), false);
        abrirCheckout();
    };

    document.getElementById('pagina-detalle').classList.remove('hidden');
    document.body.classList.add('menu-open');
}

function ajustarQtyDetalle(n) {
    const i = document.getElementById('det-qty');
    let v = parseInt(i.value) + n;
    if (v >= 1) i.value = v;
}

function addToCart(p, qty, notify = true) {
    const existe = cart.find(x => x.id === p.id);
    if (existe) {
        existe.qty += qty;
    } else {
        cart.push({...p, qty});
    }
    updateBadge();
    if (notify) alert("¡Añadido al carrito!");
}

function pedidoRapido(id) {
    const p = db.find(x => x.id === id);
    addToCart(p, 1, false);
    abrirCheckout();
}

/* ==========================================
   MODAL DE CHECKOUT (CARRITO)
   ========================================== */

function abrirCheckout() {
    const container = document.getElementById('checkout-items');
    let total = 0;
    
    container.innerHTML = cart.map(i => {
        total += i.precio_new * i.qty;
        return `
        <div class="flex gap-4 items-center border-b border-gray-50 pb-3">
            <img src="${i.imagenPrincipal}" class="w-14 h-14 rounded-xl object-cover border">
            <div class="flex-grow">
                <p class="text-[11px] font-bold leading-tight line-clamp-1">${i.nombre}</p>
                <div class="flex justify-between items-center mt-2">
                    <div class="flex items-center gap-2">
                        <button onclick="updateQtyCart(${i.id}, -1)" class="qty-btn">-</button>
                        <span class="text-xs font-bold">${i.qty}</span>
                        <button onclick="updateQtyCart(${i.id}, 1)" class="qty-btn">+</button>
                    </div>
                    <p class="text-xs font-bold text-[#7A8974]">S/ ${(i.precio_new * i.qty).toFixed(2)}</p>
                </div>
            </div>
        </div>`;
    }).join('') + `
        <div class="flex justify-between font-bold pt-4 text-lg">
            <span>TOTAL:</span>
            <span>S/ ${total.toFixed(2)}</span>
        </div>`;

    document.getElementById('checkout-modal').classList.remove('hidden');
    document.body.classList.add('menu-open');
}

function updateQtyCart(id, n) {
    const item = cart.find(x => x.id === id);
    if (item) {
        item.qty += n;
        if (item.qty <= 0) cart = cart.filter(x => x.id !== id);
    }
    updateBadge();
    if (cart.length === 0) {
        closeCheckout(); 
    } else {
        abrirCheckout();
    }
}

function updateBadge() {
    const t = cart.reduce((acc, i) => acc + i.qty, 0);
    const b = document.getElementById('cart-count');
    if (b) {
        b.innerText = t;
        b.classList.toggle('hidden', t === 0);
    }
}

/* ==========================================
   CIERRE DE MODALES Y GESTIÓN DE SCROLL
   ========================================== */

function cerrarDetalle() { 
    document.getElementById('pagina-detalle').classList.add('hidden'); 
    // Solo quitamos el bloqueo si el checkout también está cerrado
    if(document.getElementById('checkout-modal').classList.contains('hidden')) {
        document.body.classList.remove('menu-open'); 
    }
}

function closeCheckout() { 
    document.getElementById('checkout-modal').classList.add('hidden'); 
    // Solo quitamos el bloqueo si la página de detalle también está oculta
    if(document.getElementById('pagina-detalle').classList.contains('hidden')) {
        document.body.classList.remove('menu-open'); 
    }
}

function toggleCartModal() { 
    if(cart.length > 0) abrirCheckout(); 
    else alert("El carrito está vacío"); 
}