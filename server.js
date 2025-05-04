// ✅ Nexaa Mini Server – versão simbólica final com rotas, JSON e UDP
// by Fábio & Sahra 💖

const express = require('express');
const cors = require('cors');
const dgram = require('dgram');
const fs = require('fs');
const path = require('path');

const app = express();
const http = require('http').createServer(app);
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const caminhoBanco = path.join(__dirname, 'ids_por_senha.json');
let usuariosConectados = {};
let mensagensPendentes = {};

function carregarBanco() {
    try {
        if (!fs.existsSync(caminhoBanco)) return {};
        return JSON.parse(fs.readFileSync(caminhoBanco));
    } catch (err) {
        console.error("❌ Erro ao carregar banco:", err.message);
        return {};
    }
}

function salvarBanco(banco) {
    fs.writeFileSync(caminhoBanco, JSON.stringify(banco, null, 2));
}

function gerarNovoID(banco) {
    const usados = Object.values(banco).map(id => parseInt(id.replace(/\./g, ''))).filter(n => n >= 101);
    const novo = (usados.length ? Math.max(...usados) : 100) + 1;
    const s = String(novo).padStart(9, '0');
    return `${s.slice(0,3)}.${s.slice(3,6)}.${s.slice(6)}`;
}

// Registro ou recuperação via senha
app.post('/registrar', (req, res) => {
    const { senha } = req.body;
    if (!senha) return res.status(400).json({ mensagem: 'Senha ausente.' });
    let banco = carregarBanco();

    if (banco[senha]) return res.json({ id_nexaa: banco[senha] });

    const novoID = gerarNovoID(banco);
    banco[senha] = novoID;
    salvarBanco(banco);

    console.log(`🔐 ID gerado: ${novoID} (senha oculta)`);
    res.json({ id_nexaa: novoID });
});

app.post('/enviarMensagem', (req, res) => {
    const { destinoId, remetenteId, conteudo } = req.body;
    if (!destinoId || !remetenteId || !conteudo) return res.status(400).json({ mensagem: 'Dados incompletos.' });

    if (!mensagensPendentes[destinoId]) mensagensPendentes[destinoId] = [];
    mensagensPendentes[destinoId].push({ remetenteId, conteudo });

    console.log(`📨 ${remetenteId} → ${destinoId}: ${conteudo}`);
    res.json({ mensagem: 'Mensagem enviada!' });
});

app.get('/buscarMensagens/:idNexaa', (req, res) => {
    const mensagens = mensagensPendentes[req.params.idNexaa] || [];
    mensagensPendentes[req.params.idNexaa] = [];
    res.json({ mensagens });
});

app.get('/', (req, res) => {
    res.send('🌐 Nexaa Mini Server está online!');
});

http.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando em http://0.0.0.0:${port}`);
    console.log("💖 Build simbólico ativado:", new Date().toLocaleString());
});

// UDP Broadcast
const udpServer = dgram.createSocket('udp4');
udpServer.bind(50000, () => {
    udpServer.setBroadcast(true);
    console.log('📡 UDP ativo na porta 50000');
    setInterval(() => {
        const msg = Buffer.from('NEXAA-CONVITE');
        udpServer.send(msg, 0, msg.length, 50000, '255.255.255.255');
    }, 2000);
});