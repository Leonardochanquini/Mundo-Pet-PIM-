const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const port = 8080;
const SECRET_KEY = "MundoPet_Security_2026_PIM";

// Configurações
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Inicialização do Banco de Dados
const db = new sqlite3.Database('./mundopet.db');

db.serialize(() => {
    console.log("🛠️  Configurando banco de dados...");

    db.run(`CREATE TABLE IF NOT EXISTS clinicas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        cnpj TEXT UNIQUE,
        telefone TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clinic_id INTEGER,
        nome TEXT,
        email TEXT UNIQUE,
        senha TEXT,
        role TEXT,
        FOREIGN KEY (clinic_id) REFERENCES clinicas(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS transacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clinic_id INTEGER,
        data TEXT,
        descricao TEXT,
        categoria TEXT,
        valor REAL,
        tipo TEXT,
        metodo TEXT,
        FOREIGN KEY (clinic_id) REFERENCES clinicas(id)
    )`);

    db.run(`INSERT OR IGNORE INTO clinicas (id, nome, cnpj, telefone) 
            VALUES (1, 'Clínica Modelo Mundo Pet', '00.000.000/0001-00', '11999999999')`);
    
    db.run(`INSERT OR IGNORE INTO usuarios (clinic_id, nome, email, senha, role) 
            VALUES (1, 'Carlos Administrador', 'admin@teste.com', '123', 'admin')`);
    
    db.run(`INSERT OR IGNORE INTO usuarios (clinic_id, nome, email, senha, role) 
            VALUES (1, 'Ana Recepção', 'rec@teste.com', '123', 'recepcao')`);

    console.log("✅ Banco de dados pronto para uso.");
});

// ROTAS DA API
app.post('/api/login', (req, res) => {
    const { email, senha, role } = req.body;
    const sql = `SELECT u.*, c.nome as clinica_nome FROM usuarios u 
                 JOIN clinicas c ON u.clinic_id = c.id 
                 WHERE u.email = ? AND u.senha = ? AND u.role = ?`;

    db.get(sql, [email, senha, role], (err, row) => {
        if (err) return res.status(500).json({ error: "Erro interno no servidor." });
        if (row) {
            const token = jwt.sign({ id: row.id, clinic_id: row.clinic_id, role: row.role }, SECRET_KEY, { expiresIn: '8h' });
            res.json({ token, user: row });
        } else {
            res.status(401).json({ error: "E-mail, senha ou perfil incorretos." });
        }
    });
});

app.post('/api/assinatura-completa', (req, res) => {
    const { clinica } = req.body;
    db.run(`INSERT INTO clinicas (nome, cnpj, telefone) VALUES (?, ?, ?)`, 
    [clinica.nome, clinica.cnpj, clinica.cep], function(err) {
        if (err) return res.status(500).json({ error: "Erro ao cadastrar clínica." });
        const cid = this.lastID;
        db.run(`INSERT INTO usuarios (clinic_id, nome, email, senha, role) VALUES (?, 'Gestor Principal', ?, ?, 'admin')`, 
        [cid, clinica.emailAdmin, clinica.senhaAdmin], (err) => {
            if (err) return res.status(500).json({ error: "Erro ao criar usuário administrador." });
            res.json({ success: true, message: "Sistema ativado com sucesso!" });
        });
    });
});

app.listen(port, () => console.log(`🚀 Servidor Mundo Pet rodando em http://localhost:${port}`));