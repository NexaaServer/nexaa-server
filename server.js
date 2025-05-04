// ✅ Nexaa Server com suporte completo à identidade por senha + rotas auxiliares
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

// 🧠 Banco de dados de IDs vinculados a senhas
const caminhoBanco = path.join(__dirname, 'ids_por_senha.json');

function carregarBancoSenhas() {
    if (!fs.existsSync(caminhoBanco)) return {};
    const dados = fs.readFileSync(caminhoBanco);
    return JSON.parse(dados);
}

function salvarBancoSenhas(banco) {
    fs.writeFileSync(caminhoBanco, JSON.stringify(banco, null, 2));
}

function gerarNovoID(banco) {
    const usados = Object.values(banco)
        .map(id => parseInt(id.replace(/\./g, '')))
        .filter(num => num >= 101); // respeita reserva até 100

    const maior = usados.length > 0 ? Math.max(...usados) : 100;
    const novo = maior + 1;
    const numStr = String(novo).padStart(9, '0');
    return `${numStr.substring(0,3)}.${numStr.substring(3,6)}.${numStr.substring(6)}`;
}

// 🔐 Registro ou restauração via senha
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

    console.log(`🔐 Novo ID gerado: ${novoID} (senha oculta)`);
    res.json({ id_nexaa: novoID });
});

// 🔁 Verificar conexão do servidor
app.get('/verificarConexao', (req, res) => {
    res.json({ status: 'online', servidor: 'Nexaa Server ativo', hora: new Date() });
});

// 🔚 Finalizar conta (remove senha e ID)
app.post('/finalizarConta', (req, res) => {
    const { senha } = req.body;
    if (!senha) return res.status(400).json({ mensagem: 'Senha ausente.' });

    let banco = carregarBancoSenhas();
    if (banco[senha]) {
        delete banco[senha];
        salvarBancoSenhas(banco);
        return res.json({ mensagem: 'Conta finalizada e ID liberado.' });
    } else {
        return res.status(404).json({ mensagem: 'Senha não encontrada.' });
    }
});

// ✏️ Atualizar nome do usuário (armazenado em memória, não persistente ainda)
let usuariosConectados = {}; // { idNexaa: { nome, conectado, pagamentoOK } }

app.post('/atualizarNome', (req, res) => {
    const { idNexaa, novoNome } = req.body;
    if (!idNexaa || !novoNome) return res.status(400).json({ mensagem: 'Dados inválidos.' });

    if (!usuariosConectados[idNexaa]) {
        usuariosConectados[idNexaa] = { nome: novoNome, conectado: true, pagamentoOK: true };
    } else {
        usuariosConectados[idNexaa].nome = novoNome;
    }

    console.log(`✏️ Nome atualizado para ${idNexaa}: ${novoNome}`);
    res.json({ mensagem: 'Nome atualizado com sucesso.' });
});

// 📨 Envio de mensagens
let mensagensPendentes = {};  // { idDestino: [ { remetente, conteudo } ] }

app.post('/enviarMensagem', (req, res) => {
    const { destinoId, remetenteId, conteudo } = req.body;
    if (!destinoId || !remetenteId || !conteudo) return res.status(400).json({ mensagem: 'Dados incompletos.' });

    if (!mensagensPendentes[destinoId]) mensagensPendentes[destinoId] = [];
    mensagensPendentes[destinoId].push({ remetenteId, conteudo });

    console.log(`📨 De ${remetenteId} para ${destinoId}: ${conteudo}`);
    res.json({ mensagem: 'Mensagem enviada com sucesso!' });
});

// 📬 Buscar mensagens pendentes
app.get('/buscarMensagens/:idNexaa', (req, res) => {
    const idNexaa = req.params.idNexaa;
    if (!idNexaa) return res.status(400).json({ mensagem: 'ID inválido.' });

    const mensagens = mensagensPendentes[idNexaa] || [];
    mensagensPendentes[idNexaa] = [];
    res.json({ mensagens });
});

// 🌐 Página principal
app.get('/', (req, res) => {
    res.send('🚀 Nexaa Server rodando com sucesso!');
});

// 🛰️ Iniciar servidor HTTP
http.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Nexaa Server rodando em http://0.0.0.0:${port} (rede local ativada)`);
});

// 📡 Broadcast UDP (convite)
const udpServer = dgram.createSocket('udp4');
function iniciarBroadcastUDP() {
    setInterval(() => {
        const mensagem = Buffer.from('NEXAA-CONVITE');
        udpServer.send(mensagem, 0, mensagem.length, 50000, '255.255.255.255', (err) => {
            if (err) console.error('❌ Erro no UDP Broadcast:', err);
            else console.log('📡 Convite UDP enviado para 255.255.255.255:50000');
        });
    }, 2000);
}
udpServer.bind(50000, () => {
    udpServer.setBroadcast(true);
    console.log('📡 UDP Broadcast ativo na porta 50000');
    iniciarBroadcastUDP();
});