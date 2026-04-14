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
});

// --- ROTAS DE AUTENTICAÇÃO ---

app.post('/api/login', (req, res) => {
    const { email, senha } = req.body;
    
    db.get(`SELECT * FROM usuarios WHERE email = ? AND senha = ?`, [email, senha], (err, user) => {
        if (err) return res.status(500).json({ error: "Erro no servidor." });
        if (!user) return res.status(401).json({ error: "E-mail ou senha incorretos." });

        const token = jwt.sign({ id: user.id, role: user.role, clinic_id: user.clinic_id }, SECRET_KEY, { expiresIn: '2h' });
        res.json({ success: true, token, user: { nome: user.nome, role: user.role, clinic_id: user.clinic_id } });
    });
});

app.post('/api/registro-completo', (req, res) => {
    const { nomeClinica, cnpj, telefone, nomeAdmin, email, senha } = req.body;

    db.run(`INSERT INTO clinicas (nome, cnpj, telefone) VALUES (?, ?, ?)`, [nomeClinica, cnpj, telefone], function(err) {
        if (err) return res.status(400).json({ error: "CNPJ já cadastrado ou erro no banco." });
        
        const clinicaId = this.lastID;
        db.run(`INSERT INTO usuarios (clinic_id, nome, email, senha, role) VALUES (?, ?, ?, ?, ?)`, 
        [clinicaId, nomeAdmin, email, senha, 'admin'], function(err) {
            if (err) return res.status(400).json({ error: "E-mail já cadastrado." });
            res.json({ success: true, message: "Sistema ativado com sucesso!" });
        });
    });
});

// --- ROTAS DE COLABORADORES ---

app.post('/api/colaborador', (req, res) => {
    const { nome, email, senha, cargo, clinica_id } = req.body;
    
    // Verificar se email já existe
    db.get(`SELECT email FROM usuarios WHERE email = ?`, [email], (err, row) => {
        if (err) return res.status(500).json({ error: "Erro interno no servidor." });
        if (row) return res.status(400).json({ error: "E-mail já cadastrado no sistema." });
        
        // Inserir novo colaborador - Alinhado com a coluna clinic_id
        db.run(`INSERT INTO usuarios (clinic_id, nome, email, senha, role) VALUES (?, ?, ?, ?, ?)`, 
        [clinica_id, nome, email, senha, cargo], function(err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: "Erro ao cadastrar colaborador." });
            }
            res.json({ success: true, message: "Colaborador cadastrado com sucesso!", id: this.lastID });
        });
    });
});

app.get('/api/colaboradores/:clinica_id', (req, res) => {
    const { clinica_id } = req.params;
    
    // Busca todos os usuários vinculados àquela clínica
    db.all(`SELECT id, nome, email, role as cargo FROM usuarios WHERE clinic_id = ?`, [clinica_id], (err, rows) => {
        if (err) return res.status(500).json({ error: "Erro ao buscar colaboradores." });
        res.json(rows);
    });
});

// --- FINANCEIRO ---

app.get('/api/transacoes/:clinica_id', (req, res) => {
    const { clinica_id } = req.params;
    db.all(`SELECT * FROM transacoes WHERE clinic_id = ? ORDER BY data DESC`, [clinica_id], (err, rows) => {
        if (err) return res.status(500).json({ error: "Erro ao buscar transações." });
        res.json(rows);
    });
});

app.post('/api/transacoes', (req, res) => {
    const { clinic_id, data, descricao, categoria, valor, tipo, metodo } = req.body;
    db.run(`INSERT INTO transacoes (clinic_id, data, descricao, categoria, valor, tipo, metodo) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [clinic_id, data, descricao, categoria, valor, tipo, metodo], function(err) {
        if (err) return res.status(500).json({ error: "Erro ao salvar transação." });
        res.json({ success: true, id: this.lastID });
    });
});

app.listen(port, () => {
    console.log(`🚀 Servidor Mundo Pet rodando em http://localhost:${port}`);
});