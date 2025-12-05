const API_URL = 'http://localhost:5000/api';

document.getElementById('btn-register-submit').addEventListener('click', async (e) => {
    e.preventDefault();

    limpiarErrores();

    const nombre = document.getElementById('reg-nombre').value.trim();
    const apellido = document.getElementById('reg-apellido').value.trim();
    const matricula = document.getElementById('reg-matricula').value.trim();
    const password = document.getElementById('reg-password').value; // No trim en password por si usa espacios
    const confirmPassword = document.getElementById('reg-confirm').value;

    let hayErrores = false;

    if (!nombre) {
        mostrarError('error-nombre', 'El nombre es obligatorio.');
        hayErrores = true;
    }

    if (!apellido) {
        mostrarError('error-apellido', 'El apellido es obligatorio.');
        hayErrores = true;
    }

    if (!matricula) {
        mostrarError('error-matricula', 'La matrícula es obligatoria.');
        hayErrores = true;
    }

    if (!password) {
        mostrarError('error-password', 'La contraseña es obligatoria.');
        hayErrores = true;
    } else if (password.length < 6) {
        mostrarError('error-password', 'La contraseña debe tener al menos 6 caracteres.');
        hayErrores = true;
    }

    if (!confirmPassword) {
        mostrarError('error-confirm', 'Debes confirmar la contraseña.');
        hayErrores = true;
    } else if (password !== confirmPassword) {
        mostrarError('error-confirm', 'Las contraseñas no coinciden.');
        hayErrores = true;
    }

    if (hayErrores) return;
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nombre, apellido, matricula, password })
        });

        const data = await response.json();

        if (response.ok) {
            alert('¡Registro exitoso! Redirigiendo...');
            window.location.href = '../index.html';
        } else {
            mostrarError('error-general', data.message);
        }

    } catch (error) {
        console.error('Error:', error);
        mostrarError('error-general', 'Ocurrió un error al intentar conectarse con el servidor.');
    }
});


function mostrarError(elementId, mensaje) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = mensaje;
        errorElement.classList.add('form__error--active');
    }
}

function limpiarErrores() {
    const errores = document.querySelectorAll('.form__error');
    errores.forEach(el => {
        el.textContent = '';
        el.classList.remove('form__error--active');
    });
}