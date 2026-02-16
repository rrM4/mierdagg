from flask import Flask, request, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime, timedelta
import os
from werkzeug.utils import secure_filename
from flask import send_from_directory

basedir = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(basedir, 'images')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}


if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app = Flask(__name__)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Configuración CORS y Base de Datos
CORS(app, supports_credentials=True, origins=["http://localhost:8080", "http://127.0.0.1:8080"])

app.config['SECRET_KEY'] = '12345'
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+mysqlconnector://root:pepe123@localhost:3306/biblioteca'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False
app.config['SESSION_COOKIE_HTTPONLY'] = True

db = SQLAlchemy(app)

class Usuario(db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, primary_key=True)
    matricula = db.Column(db.String(20), unique=True, nullable=False)
    nombre = db.Column(db.String(50), nullable=False)
    apellido = db.Column(db.String(50), nullable=False)
    password = db.Column(db.String(255), nullable=False)
    rol = db.Column(db.String(50))


class Libro(db.Model):
    __tablename__ = 'libros'
    id = db.Column(db.Integer, primary_key=True)
    titulo = db.Column(db.String(150), nullable=False)
    autor = db.Column(db.String(100), nullable=False)
    categoria = db.Column(db.String(50))
    anio_publicacion = db.Column(db.Integer)
    disponible = db.Column(db.Boolean, default=True)
    fecha_ingreso = db.Column(db.DateTime, default=datetime.utcnow)

    url = db.Column(db.String(255))
    sinopsis = db.Column(db.Text)


class Prestamo(db.Model):
    __tablename__ = 'prestamos'
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    libro_id = db.Column(db.Integer, db.ForeignKey('libros.id'), nullable=False)
    fecha_prestamo = db.Column(db.Date, default=datetime.utcnow)
    fecha_devolucion = db.Column(db.Date)
    estado = db.Column(db.String(20), default='activo')


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    user = Usuario.query.filter_by(matricula=data.get('matricula')).first()
    if user and user.password == data.get('password'):
        session['user_id'] = user.id
        session['user_name'] = user.nombre
        session['user_role'] = user.rol
        return jsonify({"success": True, "user": user.nombre}), 200
    return jsonify({"success": False, "message": "Credenciales incorrectas"}), 401


@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"success": True}), 200


@app.route('/api/check-session', methods=['GET'])
def check_session():
    if 'user_id' in session:
        return jsonify({"success": True, "user": session.get('user_name'), "role" : session.get("user_role")}), 200
    return jsonify({"success": False}), 401


@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()

    # 1. Validation
    nombre = data.get('nombre')
    apellido = data.get('apellido')
    matricula = data.get('matricula')
    password = data.get('password')

    if not all([nombre, apellido, matricula, password]):
        return jsonify({"success": False, "message": "Faltan datos obligatorios"}), 400

    if Usuario.query.filter_by(matricula=matricula).first():
        return jsonify({"success": False, "message": "Matrícula ya existe"}), 400

    # 2. Create User with Default Role
    nuevo = Usuario(
        nombre=nombre,
        apellido=apellido,
        matricula=matricula,
        password=password,
        rol='usuario'  # Default role
    )

    # 3. DB Commit with Error Handling
    try:
        db.session.add(nuevo)
        db.session.commit()
        return jsonify({"success": True}), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error registrando usuario: {e}") # Log to console
        return jsonify({"success": False, "message": f"Error interno: {str(e)}"}), 500


@app.route('/api/libros', methods=['GET'])
def get_libros():
    user_id = session.get('user_id')
    busqueda = request.args.get('search')

    query = Libro.query
    if busqueda:
        term = f"%{busqueda}%"
        query = query.filter(
            (Libro.titulo.like(term)) |
            (Libro.autor.like(term)) |
            (Libro.categoria.like(term))
        )

    libros = query.order_by(Libro.fecha_ingreso.desc()).all()

    resultado = []
    libros_por_vencer = []
    hoy = datetime.utcnow().date()

    for l in libros:
        fecha_devolucion = None
        prestado_a_mi = False

        # 🔹 Último préstamo del libro
        prestamo_reciente = Prestamo.query.filter_by(
            libro_id=l.id
        ).order_by(Prestamo.id.desc()).first()

        if prestamo_reciente:
            if prestamo_reciente.estado == 'activo':
                fecha_devolucion = prestamo_reciente.fecha_devolucion
            else:
                fecha_devolucion = None

        # 🔹 Verificar si el usuario actual lo tiene activo
        if user_id:
            prestamo_usuario = Prestamo.query.filter_by(
                libro_id=l.id,
                usuario_id=user_id,
                estado='activo'
            ).first()

            if prestamo_usuario:
                prestado_a_mi = True

                if prestamo_usuario.fecha_devolucion:
                    diferencia = (prestamo_usuario.fecha_devolucion - hoy).days

                    if diferencia < 0:
                        libros_por_vencer.append(f"{l.titulo} (VENCIDO)")
                    elif diferencia == 0:
                        libros_por_vencer.append(f"{l.titulo} (vence hoy)")
                    elif diferencia == 1:
                        libros_por_vencer.append(f"{l.titulo} (vence en 24h)")

        resultado.append({
            "id": l.id,
            "titulo": l.titulo,
            "autor": l.autor,
            "categoria": l.categoria,
            "anio": l.anio_publicacion,
            "disponible": l.disponible,
            "fecha_devolucion": fecha_devolucion.isoformat() if fecha_devolucion else None,
            "prestado_a_mi": prestado_a_mi,
            "url": f"{request.host_url}images/{l.url.replace('images/', '').replace('images\\\\', '')}" if l.url else None

        })

    # 🔥 Invitados no reciben alerta porque user_id será None
    mensaje_vencimientos = ""
    if libros_por_vencer:
        mensaje_vencimientos = "Libros por vencer: " + ", ".join(libros_por_vencer)

    return jsonify({
        "libros": resultado,
        "alerta_vencimientos": mensaje_vencimientos
    }), 200



@app.route('/api/libros/<int:id>', methods=['GET'])
def get_libro_single(id):
    if 'user_id' not in session: return jsonify({"message": "No autorizado"}), 401

    libro = Libro.query.get_or_404(id)
    return jsonify({
        "id": libro.id, "titulo": libro.titulo, "autor": libro.autor,
        "categoria": libro.categoria, "anio": libro.anio_publicacion, "disponible": libro.disponible,
        "sinopsis": libro.sinopsis,
        "url": f"{request.host_url}images/{libro.url.replace('images/', '').replace('images\\\\', '')}" if libro.url else None
    }), 200


@app.route('/api/libros', methods=['POST'])
def crear_libro():
    if 'user_id' not in session:
        return jsonify({"message": "No autorizado"}), 401

    if check_user("invitado"):
        return jsonify({"message": "No autorizado para invitados"}), 403

    titulo = request.form.get('titulo')
    autor = request.form.get('autor')
    categoria = request.form.get('categoria')
    anio = request.form.get('anio')
    sinopsis = request.form.get('sinopsis')

    file = request.files.get('imagen')

    if not file or file.filename == '':
        return jsonify({"message": "La imagen es obligatoria"}), 400

    if not allowed_file(file.filename):
        return jsonify({"message": "Formato de imagen no permitido"}), 400

    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    # Create Book Sanitize
    nuevo_libro = Libro(
        titulo=titulo,
        autor=autor,
        categoria=categoria,
        anio_publicacion=anio,
        sinopsis=sinopsis,
        url=filename, # Store only the filename!
        disponible=True
    )

    db.session.add(nuevo_libro)
    db.session.commit()

    return jsonify({"success": True}), 201


@app.route('/api/libros/<int:id>', methods=['PUT'])
def editar_libro(id):
    if 'user_id' not in session:
        return jsonify({"message": "No autorizado"}), 401

    if check_user("invitado"):
        return jsonify({"message": "No autorizado para invitados"}), 403

    libro = Libro.query.get_or_404(id)

    libro.titulo = request.form.get('titulo')
    libro.autor = request.form.get('autor')
    libro.categoria = request.form.get('categoria')
    libro.anio_publicacion = request.form.get('anio')
    libro.sinopsis = request.form.get('sinopsis')


    file = request.files.get('imagen')

    if file and file.filename != '':
        if not allowed_file(file.filename):
            return jsonify({"message": "Formato de imagen no permitido"}), 400

        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        libro.url = filename



    db.session.commit()

    return jsonify({"success": True}), 200


@app.route('/api/libros/<int:id>', methods=['DELETE'])
def eliminar_libro(id):
    if 'user_id' not in session: return jsonify({"message": "No autorizado"}), 401
    if not check_user("admin"): return jsonify({"message": "No autorizado"}), 403

    libro = Libro.query.get_or_404(id)

    # Eliminar préstamos asociados
    Prestamo.query.filter_by(libro_id=id).delete()

    db.session.delete(libro)
    db.session.commit()
    return jsonify({"success": True}), 200

@app.route('/api/prestamo', methods=['POST'])
def solicitar_prestamo():
    if 'user_id' not in session:
        return jsonify({"message": "No autorizado"}), 401

    if check_user("invitado"):
        return jsonify({"message": "No autorizado para invitados"}), 403

    user_id = session.get('user_id')
    data = request.get_json()

    libro = Libro.query.get(data.get('libro_id'))
    dias_prestamo = int(data.get('diasPrestamo', 1))

    if dias_prestamo < 1:
        return jsonify({"message": "El préstamo mínimo es de 1 día"}), 400

    if libro and libro.disponible:

        hoy = datetime.utcnow().date()
        fecha_devolucion = hoy + timedelta(days=dias_prestamo)

        prestamo = Prestamo(
            usuario_id=user_id,
            libro_id=libro.id,
            fecha_prestamo=hoy,
            fecha_devolucion=fecha_devolucion,
            estado='activo'
        )

        libro.disponible = False

        db.session.add(prestamo)
        db.session.commit()

        return jsonify({"success": True}), 200

    return jsonify({"success": False}), 400



@app.route('/api/devolver', methods=['POST'])
def devolver_libro():
    if check_user("invitado"): return jsonify({"message": "No autorizado para invitados"}), 403
    user_id = session.get('user_id')
    data = request.get_json()
    prestamo = Prestamo.query.filter_by(libro_id=data.get('libro_id'), usuario_id=user_id, estado='activo').first()
    if prestamo:
        prestamo.estado = 'devuelto'
        prestamo.fecha_devolucion = datetime.utcnow()
        libro = Libro.query.get(data.get('libro_id'))
        libro.disponible = True
        db.session.commit()
        return jsonify({"success": True}), 200
    return jsonify({"success": False}), 400


def check_user(role):
    user_id = session.get('user_id')
    if not user_id:
        return False

    user = Usuario.query.get(user_id)

    return user and user.rol == role
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/images/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)



if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)