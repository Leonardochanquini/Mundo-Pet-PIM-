const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const port = 8080;
const SECRET_KEY = "MundoPet_Security_2026_PIM";

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Alterado o nome do banco para criar um do zero com as colunas corretas (CPF, Status, Estoque)
const db = new sqlite3.Database('./mundopet_persistente.db');

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
        cpf TEXT,
        email TEXT UNIQUE,
        senha TEXT,
        role TEXT,
        status TEXT DEFAULT 'Ativo',
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

    // Nova tabela para garantir a persistência do estoque
    db.run(`CREATE TABLE IF NOT EXISTS estoque (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clinic_id INTEGER,
        nome TEXT,
        lote TEXT,
        val TEXT,
        qtd INTEGER,
        FOREIGN KEY (clinic_id) REFERENCES clinicas(id)
    )`);
});

// --- ROTAS DE AUTENTICAÇÃO E CADASTRO ---

app.post('/api/login', (req, res) => {
    const { email, senha } = req.body;
    
    db.get(`SELECT * FROM usuarios WHERE email = ? AND senha = ?`, [email, senha], (err, user) => {
        if (err) return res.status(500).json({ error: "Erro no servidor." });
        if (!user) return res.status(401).json({ error: "E-mail ou senha incorretos." });

        const token = jwt.sign({ id: user.id, role: user.role, clinic_id: user.clinic_id }, SECRET_KEY, { expiresIn: '2h' });
        res.json({ success: true, token, user: { nome: user.nome, role: user.role, clinic_id: user.clinic_id } });
    });
});

app.post('/api/assinatura-completa', (req, res) => {
    const { clinica, colaboradores } = req.body;

    db.run(`INSERT INTO clinicas (nome, cnpj, telefone) VALUES (?, ?, ?)`, [clinica.nome, clinica.cnpj, clinica.telefone], function(err) {
        if (err) return res.status(400).json({ error: "CNPJ já cadastrado ou erro no banco." });
        
        const clinicaId = this.lastID;
        
        // Insere o admin principal
        db.run(`INSERT INTO usuarios (clinic_id, nome, cpf, email, senha, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
        [clinicaId, 'Admin Master', '', clinica.emailAdmin, clinica.senhaAdmin, 'Administrador', 'Ativo'], function(err) {
            
            // Insere colaboradores do checkout
            if(colaboradores && colaboradores.length > 0) {
                const stmt = db.prepare(`INSERT INTO usuarios (clinic_id, nome, cpf, email, senha, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)`);
                colaboradores.forEach(c => stmt.run([clinicaId, c.nome, c.cpf, c.email, '123456', c.cargo, 'Ativo']));
                stmt.finalize();
            }

            // Popula um estoque inicial padrão para demonstração
            const stmtEstoque = db.prepare(`INSERT INTO estoque (clinic_id, nome, lote, val, qtd) VALUES (?, ?, ?, ?, ?)`);
            stmtEstoque.run([clinicaId, 'Vacina V10', 'V-2901', '10/2026', 12]);
            stmtEstoque.run([clinicaId, 'Antipulgas Bravecto', 'B-1120', '02/2027', 4]);
            stmtEstoque.run([clinicaId, 'Ração Premier 15kg', 'R-009', '12/2026', 8]);
            stmtEstoque.finalize();

            res.json({ success: true, message: "Sistema ativado com sucesso!" });
        });
    });
});

// --- ROTAS DE COLABORADORES ---

app.post('/api/colaborador', (req, res) => {
    const { nome, cpf, email, senha, cargo, clinica_id } = req.body;
    db.get(`SELECT email FROM usuarios WHERE email = ?`, [email], (err, row) => {
        if (err) return res.status(500).json({ error: "Erro interno no servidor." });
        if (row) return res.status(400).json({ error: "E-mail já cadastrado no sistema." });
        
        db.run(`INSERT INTO usuarios (clinic_id, nome, cpf, email, senha, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
        [clinica_id, nome, cpf, email, senha, cargo, 'Ativo'], function(err) {
            if (err) return res.status(500).json({ error: "Erro ao cadastrar colaborador." });
            res.json({ success: true, message: "Colaborador cadastrado com sucesso!", id: this.lastID });
        });
    });
});

app.put('/api/colaborador/:id', (req, res) => {
    const { nome, cpf, email, cargo } = req.body;
    db.run(`UPDATE usuarios SET nome = ?, cpf = ?, email = ?, role = ? WHERE id = ?`,
        [nome, cpf, email, cargo, req.params.id], err => {
            if (err) return res.status(500).json({ error: "Erro ao atualizar." });
            res.json({ success: true });
    });
});

app.put('/api/colaborador/:id/status', (req, res) => {
    const { status } = req.body;
    db.run(`UPDATE usuarios SET status = ? WHERE id = ?`, [status, req.params.id], err => {
        if (err) return res.status(500).json({ error: "Erro ao atualizar status." });
        res.json({ success: true });
    });
});

app.get('/api/colaboradores/:clinica_id', (req, res) => {
    db.all(`SELECT id, nome, cpf, email, role as cargo, status FROM usuarios WHERE clinic_id = ?`, [req.params.clinica_id], (err, rows) => {
        if (err) return res.status(500).json({ error: "Erro ao buscar colaboradores." });
        // Adiciona campo fictício de último acesso
        res.json(rows.map(r => ({ ...r, ultimoAcesso: 'Hoje' })));
    });
});

// --- ROTAS FINANCEIRAS ---

app.get('/api/transacoes/:clinica_id', (req, res) => {
    db.all(`SELECT * FROM transacoes WHERE clinic_id = ? ORDER BY id DESC`, [req.params.clinica_id], (err, rows) => {
        if (err) return res.status(500).json({ error: "Erro ao buscar transações." });
        // Mapeia para os nomes de propriedades que o frontend espera (desc, cat)
        res.json(rows.map(r => ({
            id: r.id, data: r.data, desc: r.descricao, cat: r.categoria, valor: r.valor, tipo: r.tipo, metodo: r.metodo
        })));
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

app.put('/api/transacoes/:id', (req, res) => {
    const { data, descricao, categoria, valor, tipo, metodo } = req.body;
    db.run(`UPDATE transacoes SET data=?, descricao=?, categoria=?, valor=?, tipo=?, metodo=? WHERE id=?`,
        [data, descricao, categoria, valor, tipo, metodo, req.params.id], err => {
            if (err) return res.status(500).json({ error: "Erro ao atualizar transação." });
            res.json({ success: true });
        });
});

app.delete('/api/transacoes/:id', (req, res) => {
    db.run(`DELETE FROM transacoes WHERE id = ?`, [req.params.id], err => {
        if (err) return res.status(500).json({ error: "Erro ao deletar transação." });
        res.json({ success: true });
    });
});

// --- ROTAS DE ESTOQUE ---

app.get('/api/estoque/:clinica_id', (req, res) => {
    db.all(`SELECT * FROM estoque WHERE clinic_id = ?`, [req.params.clinica_id], (err, rows) => {
        if (err) return res.status(500).json({ error: "Erro ao buscar estoque." });
        res.json(rows);
    });
});

app.put('/api/estoque/:id/ajustar', (req, res) => {
    const { qtd } = req.body;
    db.run(`UPDATE estoque SET qtd = ? WHERE id = ?`, [qtd, req.params.id], err => {
        if (err) return res.status(500).json({ error: "Erro ao atualizar estoque." });
        res.json({ success: true });
    });
});

app.listen(port, () => {
    console.log(`🚀 Servidor Mundo Pet rodando em http://localhost:${port}`);
});