// ✅ Nexaa Server — versão final com identidade por senha + rotas REST + broadcast UDP
// Versão final reorganizada por Sahra 💖
// ☑️ Build forçado por Fábio e Sahra — manter integridade entre Git e Render

const express = require('express');
const cors = require('cors');
const dgram = require('dgram');
const fs = require('fs');
const path = require('path');

const app = express();
const http = require('http').createServer(app);
const port = 3000;

app.use(cors());
app.use(express.json());

// 💾 Banco de senhas (JSON local)
const caminhoBanco = path.join(__dirname, 'ids_por_senha.json');

function carregarBancoSenhas() {
    try {
        if (!fs.existsSync(caminhoBanco)) return {};
        const dados = fs.readFileSync(caminhoBanco);
        return JSON.parse(dados.toString());
    } catch (err) {
        console.error("❌ Erro ao carregar banco de senhas:", err.message);
        return {}; // fallback: banco vazio
    }
}

function salvarBancoSenhas(banco) {
    fs.writeFileSync(caminhoBanco, JSON.stringify(banco, null, 2));
}

function gerarNovoID(banco) {
    const usados = Object.values(banco)
        .map(id => parseInt(id.replace(/\./g, '')))
        .filter(n => n >= 101); // reserva até 000.000.100

    const maior = usados.length > 0 ? Math.max(...usados) : 100;
    const novo = maior + 1;
    const str = String(novo).padStart(9, '0');
    return `${str.slice(0,3)}.${str.slice(3,6)}.${str.slice(6)}`;
}

// 🔐 Registro ou restauração
app.post('/registrar', (req, res) => {
    const { senha } = req.body;
    if (!senha) return res.status(400).json({ mensagem: 'Senha ausente.' });

    let banco = carregarBancoSenhas();

    if (banco[senha]) {
        return res.json({ id_nexaa: banco[senha] });
    }

    const novoID = gerarNovoID(banco);
    banco[senha] = novoID;
    salvarBancoSenhas(banco);

    console.log(`🔐 Novo ID gerado: ${novoID} para senha (oculta)`);
    return res.json({ id_nexaa: novoID });
});

// 🔁 Verificar status do servidor
app.get('/verificarConexao', (req, res) => {
    res.json({ status: 'online', servidor: 'Nexaa Server ativo', hora: new Date() });
});

// 🔚 Finalizar conta
app.post('/finalizarConta', (req, res) => {
    const { senha } = req.body;
    if (!senha) return res.status(400).json({ mensagem: 'Senha ausente.' });

    let banco = carregarBancoSenhas();
    if (banco[senha]) {
        delete banco[senha];
        salvarBancoSenhas(banco);
        return res.json({ mensagem: 'Conta finalizada e ID liberado.' });
    }
    return res.status(404).json({ mensagem: 'Senha não encontrada.' });
});

// ✏️ Atualizar nome (não persistente ainda)
let usuariosConectados = {};  // { id: { nome, conectado, pagamentoOK } }

app.post('/atualizarNome', (req, res) => {
    const { idNexaa, novoNome } = req.body;
    if (!idNexaa || !novoNome) return res.status(400).json({ mensagem: 'Dados inválidos.' });

    usuariosConectados[idNexaa] = usuariosConectados[idNexaa] || {};
    usuariosConectados[idNexaa].nome = novoNome;

    console.log(`✏️ Nome atualizado: ${idNexaa} → ${novoNome}`);
    res.json({ mensagem: 'Nome atualizado com sucesso.' });
});

// 📨 Enviar mensagem
let mensagensPendentes = {};  // { idDestino: [ { remetenteId, conteudo } ] }

app.post('/enviarMensagem', (req, res) => {
    const { destinoId, remetenteId, conteudo } = req.body;
    if (!destinoId || !remetenteId || !conteudo) {
        return res.status(400).json({ mensagem: 'Dados incompletos.' });
    }

    mensagensPendentes[destinoId] = mensagensPendentes[destinoId] || [];
    mensagensPendentes[destinoId].push({ remetenteId, conteudo });

    console.log(`📨 ${remetenteId} → ${destinoId}: ${conteudo}`);
    res.json({ mensagem: 'Mensagem enviada com sucesso.' });
});

// 📬 Buscar mensagens
app.get('/buscarMensagens/:idNexaa', (req, res) => {
    const idNexaa = req.params.idNexaa;
    const mensagens = mensagensPendentes[idNexaa] || [];
    mensagensPendentes[idNexaa] = [];
    res.json({ mensagens });
});

// 🌐 Página principal
app.get('/', (req, res) => {
    res.send('🚀 Nexaa Server rodando com sucesso!');
});

// 🛰️ Iniciar servidor
http.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Nexaa Server rodando em http://0.0.0.0:${port}`);
	console.log("⏱️ Build simbólico atualizado às:", new Date().toLocaleString());
	console.log("✅ Build forçado por Fábio & Sahra — confirmado diretamente no código!");
	console.log("✅ Build forçado por Fábio & Sahra — verificado em tempo real");
});

// 📡 Broadcast UDP
const udpServer = dgram.createSocket('udp4');
function iniciarBroadcastUDP() {
    setInterval(() => {
        const mensagem = Buffer.from('NEXAA-CONVITE');
        udpServer.send(mensagem, 0, mensagem.length, 50000, '255.255.255.255', (err) => {
            if (err) console.error('❌ Erro no UDP:', err);
            else console.log('📡 Convite UDP enviado para 255.255.255.255:50000');
        });
    }, 2000);
}
udpServer.bind(50000, () => {
    udpServer.setBroadcast(true);
    console.log('📡 UDP ativo na porta 50000');
    iniciarBroadcastUDP();
});