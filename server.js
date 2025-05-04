const express = require('express');
const cors = require('cors');
const dgram = require('dgram');
const fs = require('fs');
const app = express();
const http = require('http').createServer(app);
const port = process.env.PORT || 10000;

const IDS_FILE = 'ids_por_senha.json';
let usuariosConectados = {};
let mensagensPendentes = {};

app.use(cors());
app.use(express.json());

// Utilitário: Carregar ou criar JSON de IDs
function carregarIDs() {
    try {
        const data = fs.readFileSync(IDS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.warn('⚠️ Arquivo de IDs não encontrado ou corrompido. Criando novo...');
        fs.writeFileSync(IDS_FILE, '{}');
        return {};
    }
}

// Utilitário: Salvar JSON atualizado
function salvarIDs(ids) {
    fs.writeFileSync(IDS_FILE, JSON.stringify(ids, null, 2));
}

// 🔐 Geração simbólica de ID
function gerarNovoId(idsExistentes) {
    const ids = Object.values(idsExistentes);
    let id = 101;
    while (ids.includes(`000.000.${id}`)) id++;
    return `000.000.${id}`;
}

// Endpoint de registro com senha
app.post('/registrar', (req, res) => {
    const { senha } = req.body;
    if (!senha) return res.status(400).json({ erro: 'Senha ausente.' });

    const ids = carregarIDs();

    if (!ids[senha]) {
        ids[senha] = gerarNovoId(ids);
        salvarIDs(ids);
        console.log(`🔐 Novo ID gerado: ${ids[senha]} para senha (oculta)`);
    } else {
        console.log(`🔁 ID recuperado: ${ids[senha]} para senha (oculta)`);
    }

    // 🔧 Resposta com a chave exata esperada pelo app
    res.json({ id: ids[senha] });
});

// Enviar mensagem
app.post('/enviarMensagem', (req, res) => {
    const { destinoId, remetenteId, conteudo } = req.body;
    if (!destinoId || !remetenteId || !conteudo) return res.status(400).json({ erro: 'Dados incompletos.' });

    if (!mensagensPendentes[destinoId]) mensagensPendentes[destinoId] = [];
    mensagensPendentes[destinoId].push({ remetenteId, conteudo });
    console.log(`📨 ${remetenteId} → ${destinoId}: ${conteudo}`);
    res.json({ status: 'ok' });
});

// Buscar mensagens
app.get('/buscarMensagens/:idNexaa', (req, res) => {
    const mensagens = mensagensPendentes[req.params.idNexaa] || [];
    mensagensPendentes[req.params.idNexaa] = [];
    res.json({ mensagens });
});

// Status raiz
app.get('/', (req, res) => {
    res.send('🌐 Nexaa Mini Server Online');
});

http.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando em http://0.0.0.0:${port}`);
    console.log(`💖 Build simbólico ativado: ${new Date().toLocaleString('pt-BR')}`);
});

// 📡 Broadcast UDP (convite)
const udpServer = dgram.createSocket('udp4');

function iniciarBroadcastUDP() {
    setInterval(() => {
        const mensagem = Buffer.from('NEXAA-CONVITE');
        udpServer.send(mensagem, 0, mensagem.length, 50000, '255.255.255.255', (err) => {
            if (err) console.error('❌ Erro no UDP:', err);
        });
    }, 2000);
}

udpServer.bind(50000, () => {
    udpServer.setBroadcast(true);
    console.log('📡 UDP ativo na porta 50000');
    iniciarBroadcastUDP();
});
