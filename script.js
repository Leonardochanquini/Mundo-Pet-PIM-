const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const port = 3000;

const SECRET_KEY = "MundoPet_Security_2026_PIM";
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./mundopet.db');

db.serialize(() => {
    db.run(`INSERT OR IGNORE INTO clinicas (id, nome, cnpj, telefone) VALUES (1, 'Clínica Modelo Mundo Pet', '00.000.000/0001-00', '11999999999')`);
    db.run(`INSERT OR IGNORE INTO usuarios (clinic_id, nome, email, senha, role) VALUES (1, 'Carlos Administrador', 'admin@teste.com', '123', 'admin')`);
    db.run(`INSERT OR IGNORE INTO usuarios (clinic_id, nome, email, senha, role) VALUES (1, 'Ana Recepção', 'rec@teste.com', '123', 'recepcao')`);
    db.run(`INSERT OR IGNORE INTO usuarios (clinic_id, nome, email, senha, role) VALUES (1, 'Dr. Roberto Vet', 'vet@teste.com', '123', 'vet')`);
});

app.post('/api/login', (req, res) => {
    const { email, senha, role } = req.body;
    const sql = `SELECT u.*, c.nome as clinica_nome FROM usuarios u 
                 JOIN clinicas c ON u.clinic_id = c.id 
                 WHERE u.email = ? AND u.senha = ? AND u.role = ?`;
    db.get(sql, [email, senha, role], (err, row) => {
        if (row) {
            const token = jwt.sign({ id: row.id, clinic_id: row.clinic_id, role: row.role }, SECRET_KEY, { expiresIn: '8h' });
            res.json({ token, user: row });
        } else { res.status(401).json({ error: "Acesso Negado." }); }
    });
});

app.post('/api/assinatura-completa', (req, res) => {
    const { clinica } = req.body;
    db.run(`INSERT INTO clinicas (nome, cnpj, telefone) VALUES (?, ?, ?)`, 
    [clinica.nome, clinica.cnpj, clinica.cep], function(err) {
        if (err) return res.status(500).json({ error: "Erro" });
        const cid = this.lastID;
        db.run(`INSERT INTO usuarios (clinic_id, nome, email, senha, role) VALUES (?, 'Gestor', ?, ?, 'admin')`, [cid, clinica.emailAdmin, clinica.senhaAdmin]);
        db.run(`INSERT INTO usuarios (clinic_id, nome, email, senha, role) VALUES (?, 'Recepção', ?, ?, 'recepcao')`, [cid, clinica.emailRec, clinica.senhaAdmin], () => {
            res.json({ success: true });
        });
    });
});

app.listen(port, () => console.log(`Servidor Mundo Pet rodando em http://localhost:${port}`));