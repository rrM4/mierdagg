const API_URL = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', () => {
    validarSesionSegura();
});

async function validarSesionSegura() {
    try {
        const response = await fetch(`${API_URL}/check-session`, {
            method: 'GET',
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('userName', data.user);
            localStorage.setItem('role', data.role);

            iniciarDashboard();
        } else {
            console.warn("Sesión no válida o expirada.");
            cerrarSesionYRedirigir();
        }
    } catch (error) {
        console.error("Error al verificar sesión:", error);
        cerrarSesionYRedirigir();
    }
}

function cerrarSesionYRedirigir() {
    localStorage.removeItem('userName');
    window.location.href = '../index.html';
}

function iniciarDashboard() {
    cargarLibros();

    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const query = document.getElementById('search-input').value;
            cargarLibros(query);
        });
    }

    // Configurar Logout
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await fetch(`${API_URL}/logout`, {
                    method: 'POST',
                    credentials: 'include'
                });
            } catch (error) {
                console.error("Error al cerrar sesión:", error);
            } finally {
                cerrarSesionYRedirigir();
            }
        });
    }

    // Ocultar botón "Nuevo Libro" si no es admin
    const btnNuevoLibro = document.getElementById('btn-nuevo-libro');
    const role = localStorage.getItem('role');
    if (btnNuevoLibro && role !== 'admin') {
        btnNuevoLibro.style.display = 'none';
    }
}

async function cargarLibros(busqueda = '') {
    const container = document.getElementById('books-container');
    container.innerHTML = '<p>Cargando catálogo...</p>';

    try {
        let url = `${API_URL}/libros`;
        if (busqueda) {
            url += `?search=${encodeURIComponent(busqueda)}`;
        }

        const response = await fetch(url, { method: 'GET', credentials: 'include' });

        if (response.status === 401) {
            alert("Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
            cerrarSesionYRedirigir();
            return;
        }

        const libros = await response.json();
        await renderizarLibros(libros.libros, libros.alerta_vencimientos);

    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = '<p>Error al cargar los libros.</p>';
    }
}

async function renderizarLibros(libros, message) {
    const container = document.getElementById('books-container');
    const role = localStorage.getItem('role');
    container.innerHTML = '';

    if (!libros || libros.length === 0) {
        container.innerHTML = '<p>No se encontraron libros.</p>';
        return;
    }

    libros.forEach(libro => {
        const card = document.createElement('div');
        card.className = 'book-card';

        let estadoClase, estadoTexto, botonDisabled, botonTexto, botonStyle, botonOnclick;

        if (libro.disponible) {
            estadoClase = 'book-card__status--available';
            estadoTexto = 'Disponible';
            botonDisabled = '';
            botonTexto = 'Solicitar Préstamo';
            botonStyle = ''; // Estilo por defecto del CSS
            botonOnclick = `solicitarPrestamo(${libro.id})`;

        } else if (libro.prestado_a_mi) {
            estadoClase = 'book-card__status--borrowed';
            estadoTexto = 'En tu disposición';
            botonDisabled = '';
            botonTexto = 'Devolver Libro';
            botonStyle = 'background-color: #2e7d32;';
            botonOnclick = `devolverLibro(${libro.id})`;

        } else {

            estadoClase = 'book-card__status--borrowed';
            estadoTexto = 'En Préstamo';
            botonDisabled = 'disabled';
            botonTexto = 'No Disponible';
            botonStyle = 'background-color: #ccc; cursor: not-allowed;';
            botonOnclick = '';
        }

        card.innerHTML = `
            <div>
                <div>
                    ${libro.url
                ? `<img src="${libro.url}" 
                               alt="Imagen del libro"
                               <img src="${libro.url}" 
     alt="Imagen del libro"
     style="
        width:100%;
        max-height:250px;
        object-fit:contain;
        background:#f5f5f5;
        border-radius:12px;
        padding:10px;
        margin-bottom:12px;
     "
>`
                : ''
            }


                <h3 class="book-card__title">${libro.titulo}</h3>
                ${role === "admin"
                ? `<a href="editar_libro.html?id=${libro.id}" 
                       style="color: blue; font-size: 0.8rem; text-decoration: none;">
                       Editar
                     </a>
                     <a href="#" onclick="eliminarLibro(${libro.id})" 
                       style="color: red; font-size: 0.8rem; text-decoration: none; margin-left: 10px;">
                       Eliminar
                     </a>`
                : ""
            }

            <div style="margin-top: 5px;">
                <a href="ver_libro.html?id=${libro.id}" 
                   style="
                       display: inline-block;
                       padding: 5px 10px;
                       background-color: #0277bd;
                       color: white;
                       text-decoration: none;
                       border-radius: 4px;
                       font-size: 0.85rem;
                   ">
                   Ver Sinopsis
                </a>
            </div>

                <p class="book-card__info"><strong>Autor:</strong> ${libro.autor}</p>
                <p class="book-card__info"><strong>Categoría:</strong> ${libro.categoria || 'General'}</p>
                <p class="book-card__info"><strong>Año:</strong> ${libro.anio || 'N/A'}</p>
                <p class="book-card__status ${estadoClase}">${estadoTexto}</p>
            </div>
            
          ${libro.fecha_devolucion ? `<p class="book-card__info"><strong>Fecha a devolver: </strong>${libro.fecha_devolucion}</p>` : ''}
            <input 
                type="number" 
                min="1" 
                value="1"
                id="dias-prestamo-${libro.id}" 
                class="book-card__input"
            >

            <button 
                class="book-card__action" 
                onclick="${botonOnclick}" 
                ${botonDisabled}
                style="${botonStyle}"
            >
                ${botonTexto}
            </button>
            
        `;
        container.appendChild(card);
    });
    setTimeout(() => {
        if (message) {
            alert(message)
        }
    }, 300)
}

window.solicitarPrestamo = async (id) => {
    const diasPrestamo = document.getElementById(`dias-prestamo-${id}`).value;
    try {
        const response = await fetch(`${API_URL}/prestamo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ libro_id: id, diasPrestamo: diasPrestamo })
        });

        const data = await response.json();

        if (response.ok) {
            cargarLibros();
        } else {
            if (response.status === 401) {
                alert("Debes iniciar sesión nuevamente.");
                cerrarSesionYRedirigir();
            }
            else if (response.status === 403) {
                alert(data.message);
            }
            else {
                alert(`Error: ${data.message}`);
            }
        }
    } catch (error) {
        console.error(error);
        alert("Error al procesar la solicitud.");
    }
};

window.devolverLibro = async (id) => {
    try {
        const response = await fetch(`${API_URL}/devolver`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ libro_id: id })
        });

        const data = await response.json();

        if (response.ok) {
            cargarLibros();
        } else {
            alert(`Error: ${data.message}`);
        }
    } catch (error) {
        console.error(error);
        alert("Error al devolver el libro.");
    }
};

window.eliminarLibro = async (id) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este libro? Esta acción no se puede deshacer.")) return;

    try {
        const response = await fetch(`${API_URL}/libros/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.ok) {
            alert("Libro eliminado correctamente");
            cargarLibros();
        } else {
            const data = await response.json();
            alert(`Error: ${data.message}`);
        }
    } catch (error) {
        console.error(error);
        alert("Error al eliminar el libro.");
    }
};