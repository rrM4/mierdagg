const API_URL = 'http://localhost:5000/api';

document.getElementById('btn-crear').addEventListener('click', async (e) => {
    e.preventDefault();
    limpiarErrores();

    const titulo = document.getElementById('titulo').value.trim();
    const autor = document.getElementById('autor').value.trim();
    const categoria = document.getElementById('categoria').value.trim();
    const anio = document.getElementById('anio').value.trim();
    let hayErrores = false;

    if (!titulo) { mostrarError('error-titulo', 'El título es obligatorio'); hayErrores = true; }
    if (!autor) { mostrarError('error-autor', 'El autor es obligatorio'); hayErrores = true; }
    if (!categoria) { mostrarError('error-categoria', 'La categoría es obligatoria'); hayErrores = true; }
    if (!anio) { mostrarError('error-anio', 'El año es obligatorio'); hayErrores = true; }

    if (hayErrores) return;

    try {
        const response = await fetch(`${API_URL}/libros`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ titulo, autor, categoria, anio })
        });

        if (response.ok) {
            alert("Libro creado con éxito");
            window.location.href = 'dashboard.html';
        } else {
            alert("Error al crear libro");
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