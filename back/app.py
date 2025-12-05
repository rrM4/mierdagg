from flask import Flask, request, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)

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


class Libro(db.Model):
    __tablename__ = 'libros'
    id = db.Column(db.Integer, primary_key=True)
    titulo = db.Column(db.String(150), nullable=False)
    autor = db.Column(db.String(100), nullable=False)
    categoria = db.Column(db.String(50))
    anio_publicacion = db.Column(db.Integer)
    disponible = db.Column(db.Boolean, default=True)
    fecha_ingreso = db.Column(db.DateTime, default=datetime.utcnow)


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
        return jsonify({"success": True, "user": user.nombre}), 200
    return jsonify({"success": False, "message": "Credenciales incorrectas"}), 401


@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"success": True}), 200


@app.route('/api/check-session', methods=['GET'])
def check_session():
    if 'user_id' in session:
        return jsonify({"success": True, "user": session.get('user_name')}), 200
    return jsonify({"success": False}), 401


@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    if Usuario.query.filter_by(matricula=data.get('matricula')).first():
        return jsonify({"success": False, "message": "Matrícula ya existe"}), 400
    nuevo = Usuario(nombre=data.get('nombre'), apellido=data.get('apellido'), matricula=data.get('matricula'),
                    password=data.get('password'))
    db.session.add(nuevo)
    db.session.commit()
    return jsonify({"success": True}), 201


@app.route('/api/libros', methods=['GET'])
def get_libros():
    user_id = session.get('user_id')
    busqueda = request.args.get('search')

    query = Libro.query
    if busqueda:
        term = f"%{busqueda}%"
        query = query.filter((Libro.titulo.like(term)) | (Libro.autor.like(term)) | (Libro.categoria.like(term)))

    libros = query.order_by(Libro.fecha_ingreso.desc()).all()

    resultado = []
    for l in libros:
        prestado_a_mi = False
        if not l.disponible and user_id:
            prestamo = Prestamo.query.filter_by(libro_id=l.id, usuario_id=user_id, estado='activo').first()
            if prestamo: prestado_a_mi = True

        resultado.append({
            "id": l.id, "titulo": l.titulo, "autor": l.autor, "categoria": l.categoria,
            "anio": l.anio_publicacion, "disponible": l.disponible, "prestado_a_mi": prestado_a_mi
        })
    return jsonify(resultado), 200


@app.route('/api/libros/<int:id>', methods=['GET'])
def get_libro_single(id):
    if 'user_id' not in session: return jsonify({"message": "No autorizado"}), 401
    libro = Libro.query.get_or_404(id)
    return jsonify({
        "id": libro.id, "titulo": libro.titulo, "autor": libro.autor,
        "categoria": libro.categoria, "anio": libro.anio_publicacion, "disponible": libro.disponible
    }), 200


@app.route('/api/libros', methods=['POST'])
def crear_libro():
    if 'user_id' not in session: return jsonify({"message": "No autorizado"}), 401
    data = request.get_json()

    nuevo_libro = Libro(
        titulo=data.get('titulo'),
        autor=data.get('autor'),
        categoria=data.get('categoria'),
        anio_publicacion=data.get('anio'),
        disponible=True
    )
    db.session.add(nuevo_libro)
    db.session.commit()
    return jsonify({"success": True, "message": "Libro creado"}), 201


@app.route('/api/libros/<int:id>', methods=['PUT'])
def editar_libro(id):
    if 'user_id' not in session: return jsonify({"message": "No autorizado"}), 401
    libro = Libro.query.get_or_404(id)
    data = request.get_json()

    libro.titulo = data.get('titulo')
    libro.autor = data.get('autor')
    libro.categoria = data.get('categoria')
    libro.anio_publicacion = data.get('anio')
    if 'disponible' in data:
        libro.disponible = data.get('disponible')

    db.session.commit()
    return jsonify({"success": True, "message": "Libro actualizado"}), 200


# ... (Rutas de Prestamo y Devolver siguen igual en ORM) ...
@app.route('/api/prestamo', methods=['POST'])
def solicitar_prestamo():
    user_id = session.get('user_id')
    data = request.get_json()
    libro = Libro.query.get(data.get('libro_id'))
    if libro and libro.disponible:
        prestamo = Prestamo(usuario_id=user_id, libro_id=libro.id)
        libro.disponible = False
        db.session.add(prestamo)
        db.session.commit()
        return jsonify({"success": True}), 200
    return jsonify({"success": False}), 400


@app.route('/api/devolver', methods=['POST'])
def devolver_libro():
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


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)