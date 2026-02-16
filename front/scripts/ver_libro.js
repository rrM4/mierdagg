const API_URL = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('id');

    if (bookId) {
        cargarDetallesLibro(bookId);
    } else {
        alert("ID de libro no especificado.");
        window.location.href = 'dashboard.html';
    }
});

async function cargarDetallesLibro(id) {
    try {
        const response = await fetch(`${API_URL}/libros/${id}`, {
            method: 'GET',
            credentials: 'include'
        });

        if (response.ok) {
            const libro = await response.json();
            renderizarDetalles(libro);
        } else {
            if (response.status === 401) {
                alert("Sesión expirada.");
                window.location.href = '../index.html';
            } else {
                alert("Error al cargar el libro.");
                // window.location.href = 'dashboard.html';
            }
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Error de conexión.");
    }
}

function renderizarDetalles(libro) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('book-content').style.display = 'block';

    document.getElementById('book-title').textContent = libro.titulo;
    document.getElementById('book-author').textContent = libro.autor;
    document.getElementById('book-category').textContent = libro.categoria || 'General';
    document.getElementById('book-year').textContent = libro.anio || 'N/A';
    document.getElementById('book-status').textContent = libro.disponible ? 'Disponible' : 'No Disponible';

    // Set Synopsis
    const synopsisElem = document.getElementById('book-synopsis');
    if (libro.sinopsis) {
        synopsisElem.textContent = libro.sinopsis;
    } else {
        synopsisElem.textContent = 'No hay sinopsis disponible.';
        synopsisElem.style.fontStyle = 'italic';
        synopsisElem.style.color = '#888';
    }

    // Set Image
    const imgElem = document.getElementById('book-image');
    if (libro.url) {
        imgElem.src = libro.url;
    } else {
        // Fallback or hide if no image
        imgElem.src = 'https://via.placeholder.com/300x400?text=Sin+Imagen';
    }
}
