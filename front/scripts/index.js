const API_URL = 'http://localhost:5000/api';

document.getElementById('btn-login-submit').addEventListener('click', async (e) => {
    login(e);
});

document.getElementById('btn-login-submit-invitado').addEventListener('click', async (e) => {
    login(e, true);
});


const login = async (e,isInvitado = false) => {
    e.preventDefault();
    limpiarErrores();
    let matricula = "FFF"
    let password = "123"
    if(!isInvitado){
        matricula = document.getElementById('login-matricula').value.trim();
        password = document.getElementById('login-password').value.trim();

        let hayErrores = false;
        if (!matricula) {
            mostrarError('error-matricula', 'La matrícula es obligatoria.');
            hayErrores = true;
        }
        if (!password) {
            mostrarError('error-password', 'La contraseña es obligatoria.');
            hayErrores = true;
        }
        if (hayErrores) return;
    }

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ matricula, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('userName', data.user);
            localStorage.setItem('role', data.role);
            window.location.href = '../views/dashboard.html';
        } else {
            mostrarError('error-general', data.message || 'Error en el inicio de sesión');
        }

    } catch (error) {
        console.error('Error de conexión:', error);
        mostrarError('error-general', 'No se pudo conectar con el servidor.');
    }
}

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