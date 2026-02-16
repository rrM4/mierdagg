const API_URL = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    console.log(id)

    if (!id) {
        alert("No se seleccionó ningún libro");
        window.location.href = 'dashboard.html';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/libros/${id}`, {
            method: 'GET', credentials: 'include'
        });
        if (!response.ok) throw new Error("Error al cargar");

        const libro = await response.json();

        document.getElementById('libro-id').value = libro.id;
        document.getElementById('titulo').value = libro.titulo;
        document.getElementById('autor').value = libro.autor;
        document.getElementById('categoria').value = libro.categoria;
        document.getElementById('anio').value = libro.anio;
        document.getElementById('disponible').value = libro.disponible ? "true" : "false";

        // Populate Synopsis
        if (libro.sinopsis) {
            document.getElementById('sinopsis').value = libro.sinopsis;
        }

        // Populate Image
        const img = document.getElementById('current-image');
        if (libro.url) {
            img.src = libro.url; // The backend now returns the full URL
            img.style.display = 'block';
        } else {
            img.style.display = 'none';
        }

    } catch (error) {
        alert("Error cargando el libro.");
        window.location.href = 'dashboard.html';
    }
});

document.getElementById('btn-guardar').addEventListener('click', async (e) => {
    e.preventDefault();
    limpiarErrores();
    const id = document.getElementById('libro-id').value;
    const titulo = document.getElementById('titulo').value.trim();
    const autor = document.getElementById('autor').value.trim();
    const categoria = document.getElementById('categoria').value.trim();
    const anio = document.getElementById('anio').value.trim();
    let hayErrores = false;
    if (!titulo) { mostrarError('error-titulo', 'El título es obligatorio'); hayErrores = true; }
    if (!autor) { mostrarError('error-autor', 'El autor es obligatorio'); hayErrores = true; }
    if (!categoria) { mostrarError('error-categoria', 'La categoría es obligatoria'); hayErrores = true; }
    if (!anio) { mostrarError('error-anio', 'El año es obligatorio'); hayErrores = true; }
    const disponible = document.getElementById('disponible').value === "true";
    if (hayErrores) return;

    const sinopsis = document.getElementById('sinopsis').value.trim();
    const imagen = document.getElementById('imagen').files[0];

    const formData = new FormData();
    formData.append("titulo", titulo);
    formData.append("autor", autor);
    formData.append("categoria", categoria);
    formData.append("anio", anio);
    formData.append("sinopsis", sinopsis);
    formData.append("disponible", disponible);

    if (imagen) {
        formData.append("imagen", imagen);
    }



    try {
        const response = await fetch(`${API_URL}/libros/${id}`, {
            method: 'PUT',
            credentials: 'include',
            body: formData
        });

        if (response.ok) {
            alert("Libro actualizado");
            window.location.href = 'dashboard.html';
        } else {
            alert("Error al guardar cambios");
        }
    } catch (error) {
        console.error(error);
    }
});

function mostrarError(id, msg) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.style.display = 'block';
    el.style.color = 'red';
}
function limpiarErrores() {
    document.querySelectorAll('.form__error').forEach(e => e.textContent = '');
}