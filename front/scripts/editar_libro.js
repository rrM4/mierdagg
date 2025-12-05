const API_URL = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

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

    } catch (error) {
        alert("Error cargando el libro.");
        window.location.href = 'dashboard.html';
    }
});

document.getElementById('btn-guardar').addEventListener('click', async (e) => {
    e.preventDefault();
    const id = document.getElementById('libro-id').value;
    const titulo = document.getElementById('titulo').value;
    const autor = document.getElementById('autor').value;
    const categoria = document.getElementById('categoria').value;
    const anio = document.getElementById('anio').value;

    const disponible = document.getElementById('disponible').value === "true";

    try {
        const response = await fetch(`${API_URL}/libros/${id}`, {
            method: 'PUT', // Método para actualizar
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ titulo, autor, categoria, anio, disponible })
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