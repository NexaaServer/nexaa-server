// ✅ Bloco C0 — Servidor Nexaa Reconstruído
// 💠 Estrutura limpa, sem gambiarras, expansível e estável
// 🧠 Inclui: Registro por senha, troca de mensagens, ping, broadcast UDP e suporte a upload

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const dgram = require('dgram');

const app = express();
const http = require('http').createServer(app);
const port = 3000;

app.use(cors());
app.use(express.json());

// 💾 Pastas e arquivos
const basePath = path.join(__dirname, 'dados');
const bancoSenhasPath = path.join(basePath, 'ids_por_senha.json');
const mensagensPath = path.join(basePath, 'mensagens_pendentes.json');
const uploadPath = path.join(__dirname, 'uploads');

// 🛠️ Garantir estrutura de pastas
if (!fs.existsSync(basePath)) fs.mkdirSync(basePath);
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);

// 🧠 Utilidades
function carregarJSON(caminho) {
    try {
        return fs.existsSync(caminho) ? JSON.parse(fs.readFileSync(caminho)) : {};
    } catch { return {}; }
}
function salvarJSON(caminho, dados) {
    fs.writeFileSync(caminho, JSON.stringify(dados, null, 2));
}

// 🔐 Geração de ID
function gerarNovoID(banco) {
    const usados = Object.values(banco).map(id => parseInt(id.replace(/\./g, ''))).filter(n => n >= 101);
    const novo = (usados.length > 0 ? Math.max(...usados) : 100) + 1;
    const str = String(novo).padStart(9, '0');
    return `${str.slice(0,3)}.${str.slice(3,6)}.${str.slice(6)}`;
}

// 🔐 Registro ou restauração
app.post('/registrar', (req, res) => {
    const { senha } = req.body;
    if (!senha) return res.status(400).json({ erro: 'Senha obrigatória.' });

    let banco = carregarJSON(bancoSenhasPath);
    if (banco[senha]) return res.json({ id_nexaa: banco[senha] });

    const novoID = gerarNovoID(banco);
    banco[senha] = novoID;
    salvarJSON(bancoSenhasPath, banco);
    res.json({ id_nexaa: novoID });
});

// 📨 Enviar mensagem
app.post('/enviarMensagem', (req, res) => {
    const { destinoId, remetenteId, conteudo } = req.body;
    if (!destinoId || !remetenteId || !conteudo) return res.status(400).json({ erro: 'Dados incompletos.' });

    let mensagens = carregarJSON(mensagensPath);
    mensagens[destinoId] = mensagens[destinoId] || [];
    mensagens[destinoId].push({ remetenteId, conteudo, hora: new Date() });
    salvarJSON(mensagensPath, mensagens);

    res.json({ ok: true });
});

// 📬 Buscar mensagens
app.get('/buscarMensagens/:id', (req, res) => {
    const id = req.params.id;
    let mensagens = carregarJSON(mensagensPath);
    const entregues = mensagens[id] || [];
    mensagens[id] = [];
    salvarJSON(mensagensPath, mensagens);
    res.json({ mensagens: entregues });
});

// 📂 Upload
const upload = multer({ dest: uploadPath });
app.post('/upload', upload.single('arquivo'), (req, res) => {
    if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo enviado.' });
    res.json({ ok: true, nome: req.file.filename, original: req.file.originalname });
});

// 🔁 Status do servidor
app.get('/status', (req, res) => {
    res.json({ status: 'online', hora: new Date().toISOString() });
});

// 🌐 Página principal
app.get('/', (req, res) => {
    res.send('🌐 Nexaa Server ativo');
});

// 📡 Broadcast UDP
const udpServer = dgram.createSocket('udp4');
function iniciarBroadcastUDP() {
    setInterval(() => {
        const mensagem = Buffer.from('NEXAA-CONVITE');
        udpServer.send(mensagem, 0, mensagem.length, 50000, '255.255.255.255');
    }, 5000);
}
udpServer.bind(50000, () => {
    udpServer.setBroadcast(true);
    iniciarBroadcastUDP();
});

// 🛰️ Iniciar servidor
http.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Nexaa Server online em http://0.0.0.0:${port}`);
});
