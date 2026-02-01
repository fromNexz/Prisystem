// chatbot.js - Pri Malzoni Estética - VERSÃO COM ENCERRAMENTO
// Localização: project-root/chatbot.js

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
const qr = require('qrcode');

// ==================== CONFIGURAÇÃO ====================

const DATA_DIR = path.join(__dirname, 'data');
const IMAGE_DIR = path.join(DATA_DIR, 'image');
const QR_PATH = path.join(IMAGE_DIR, 'whatsapp_qr.png');
const ROTAS_PATH = path.join(DATA_DIR, 'rotas.json');

// Criar diretórios se não existirem
[DATA_DIR, IMAGE_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Diretório criado: ${dir}`);
    }
});

console.log('📂 Configuração de pastas:');
console.log('  QR será salvo em:', QR_PATH);
console.log('  Rotas em:', ROTAS_PATH);

// ==================== CLIENT CONFIG ====================

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'primalzoni-bot',
        dataPath: path.join(DATA_DIR, '.wwebjs_auth')
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

// ==================== CARREGA URLS ====================

let SISTEMA_WEB_URL = 'http://localhost:8000';
const LINK_APP_BELEZA = 'https://sites.appbeleza.com.br/primalzonimicropigme';

function loadUrls() {
    try {
        if (fs.existsSync(ROTAS_PATH)) {
            const rotas = JSON.parse(fs.readFileSync(ROTAS_PATH, 'utf8'));
            SISTEMA_WEB_URL = rotas.ngrok_url || rotas.local_url || SISTEMA_WEB_URL;
            console.log(`📡 URL do sistema: ${SISTEMA_WEB_URL}`);
        }
    } catch (error) {
        console.log('⚠️ Erro ao carregar rotas.json, usando URL padrão');
    }
}

loadUrls();

// ==================== EVENTOS DE CONEXÃO ====================

let lastQrGeneration = 0;
const QR_GENERATION_INTERVAL = 60000; // 1 minuto

client.on('qr', async (qrString) => {
    const now = Date.now();
    
    if (now - lastQrGeneration < QR_GENERATION_INTERVAL) {
        console.log('⏭️ QR recente, aguardando intervalo de 1 minuto...');
        return;
    }
    
    lastQrGeneration = now;
    console.log('QR_GENERATED');
    
    try {
        await qr.toFile(QR_PATH, qrString, {
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            width: 300
        });
        
        console.log('QR_IMAGE_SAVED');
        console.log(`📸 QR Code salvo em: ${QR_PATH}`);
        
    } catch (error) {
        console.log('QR_ERROR:', error.message);
    }
});

client.on('authenticated', () => {
    console.log('WHATSAPP_AUTH_SUCCESS');
    console.log('✅ Autenticado com sucesso');
});

client.on('ready', () => {
    console.log('WHATSAPP_CONNECTED');
    console.log('✅ WhatsApp conectado - Bot ativo!');
    console.log('📱 Número:', client.info.wid.user);
    
    try {
        if (fs.existsSync(QR_PATH)) {
            fs.unlinkSync(QR_PATH);
            console.log('🗑️ QR Code removido após conexão bem-sucedida');
        }
    } catch (error) {
        console.log('⚠️ Erro ao remover QR:', error.message);
    }
});

client.on('auth_failure', (msg) => {
    console.log('WHATSAPP_AUTH_ERROR:', msg);
});

client.on('disconnected', (reason) => {
    console.log('WHATSAPP_DISCONNECTED:', reason);
});

client.on('loading_screen', (percent, message) => {
    console.log('LOADING:', percent, message);
});

// ==================== DADOS DOS SERVIÇOS ====================

const servicos = {
    1: { nome: 'BrowLaminations', preco: 'R$ 150,00' },
    2: { nome: 'Design de Sobrancelhas', preco: 'R$ 35,00' },
    3: { nome: 'Design em sobrancelhas micropigmentadas', preco: 'R$ 30,00' },
    4: { nome: 'Drenagem Linfática (10 sessões)', preco: 'R$ 750,00' },
    5: { nome: 'Drenagem Linfática (5 sessões)', preco: 'R$ 400,00' },
    6: { nome: 'Drenagem Linfática (1 sessão)', preco: 'R$ 90,00' },
    7: { nome: 'Epilação Buço', preco: 'R$ 10,00' },
    8: { nome: 'Epilação Facial', preco: 'R$ 60,00' },
    9: { nome: 'Epilação Buço e queixo', preco: 'R$ 20,00' },
    10: { nome: 'SPA Lips - esfoliação e hidratação labial', preco: 'R$ 40,00' },
    11: { nome: 'Hidragloss 1 sessão', preco: 'R$ 150,00' },
    12: { nome: 'Lash Lifting', preco: 'R$ 120,00' },
    13: { nome: 'Limpeza de pele', preco: 'R$ 150,00' },
    14: { nome: 'Massagem modeladora (1 sessão)', preco: 'R$ 90,00' },
    15: { nome: 'Massagem modeladora (10 sessões)', preco: 'R$ 750,00' },
    16: { nome: 'Massagem modeladora (5 sessões)', preco: 'R$ 400,00' },
    17: { nome: 'Massagem Terapêutica (1 sessão)', preco: 'R$ 90,00' },
    18: { nome: 'Massagem Terapêutica (10 sessões)', preco: 'R$ 750,00' },
    19: { nome: 'Massagem Terapêutica (5 sessões)', preco: 'R$ 400,00' },
    20: { nome: 'Micropigmentação Labial (duas sessões)', preco: 'R$ 575,00' },
    21: { nome: 'Micropigmentação Labial (uma sessão)', preco: 'R$ 290,00' },
    22: { nome: 'Micropigmentação sobrancelhas - fio a fio ou Shadow (duas sessões)', preco: 'R$ 430,00' },
    23: { nome: 'Micropigmentação sobrancelhas - fio a fio ou Shadow (uma sessão)', preco: 'R$ 250,00' },
    24: { nome: 'Remoção e hidratação dos cílios', preco: 'R$ 40,00' },
    25: { nome: 'Alongamento de cílios volume Express Soft', preco: 'R$ 120,00' },
    26: { nome: 'Design e Henna', preco: 'R$ 50,00' }
};

// ==================== SISTEMA DE CONVERSAS ====================

let conversasAtivas = {};
let conversasEncerradas = new Set(); // ← NOVO: Armazena números encerrados

const PALAVRA_CHAVE_REATIVAR = 'atendimento'; // ← Palavra-chave para reativar

const ESTADOS = {
    INICIAL: 'inicial',
    AGUARDANDO_NOME: 'aguardando_nome',
    AGUARDANDO_PERIODO: 'aguardando_periodo',
    AGUARDANDO_SERVICO: 'aguardando_servico',
    MOSTRANDO_OPCOES: 'mostrando_opcoes',
    AGUARDANDO_CONTATO: 'aguardando_contato',
    ENCERRADO: 'encerrado' // ← NOVO estado
};

const delay = ms => new Promise(res => setTimeout(res, ms));

function resetarConversa(numeroTelefone) {
    if (conversasAtivas[numeroTelefone]) {
        delete conversasAtivas[numeroTelefone];
    }
    console.log(`🔄 Conversa resetada: ${numeroTelefone}`);
}

function encerrarConversa(numeroTelefone) {
    conversasEncerradas.add(numeroTelefone);
    if (conversasAtivas[numeroTelefone]) {
        conversasAtivas[numeroTelefone].estado = ESTADOS.ENCERRADO;
    }
    console.log(`🔒 Conversa encerrada: ${numeroTelefone}`);
}

function reativarConversa(numeroTelefone) {
    conversasEncerradas.delete(numeroTelefone);
    resetarConversa(numeroTelefone);
    console.log(`🔓 Conversa reativada: ${numeroTelefone}`);
}

async function iniciarConversa(msg) {
    await delay(1000);
    
    await client.sendMessage(msg.from, 
        `Olá, seja muito bem-vinda 🤍\n\n` +
        `Aqui é a assistente virtual da *Pri Malzoni Estética*.\n` +
        `Vou te orientar no agendamento de forma rápida e organizada ✨\n\n` +
        `Para começarmos, poderia me informar, por favor,\n` +
        `seu *nome e sobrenome*? 🤍`
    );
    
    conversasAtivas[msg.from] = {
        estado: ESTADOS.AGUARDANDO_NOME,
        dados: {}
    };
    
    console.log(`🆕 Nova conversa iniciada: ${msg.from}`);
}

async function processarNome(msg, mensagem, conversa) {
    await delay(1000);
    
    conversa.dados.nome = mensagem;
    
    await client.sendMessage(msg.from,
        `Obrigada ✨\n\n` +
        `Em qual período você prefere atendimento?\n\n` +
        `⏰ *Manhã*: das 8h às 12h\n` +
        `⏰ *Tarde*: das 14h às 18h\n\n` +
        `Atendimentos de segunda à sexta feira.\n\n` +
        `_Por favor, responda com *manhã* ou *tarde*_`
    );
    
    conversa.estado = ESTADOS.AGUARDANDO_PERIODO;
    console.log(`👤 Nome registrado: ${mensagem}`);
}

async function processarPeriodo(msg, mensagem, conversa) {
    const mensagemLower = mensagem.toLowerCase().trim();
    
    if (!mensagemLower.includes('manhã') && !mensagemLower.includes('manha') && 
        !mensagemLower.includes('tarde')) {
        await client.sendMessage(msg.from,
            `Por favor, informe o período desejado:\n\n` +
            `Digite *manhã* ou *tarde* 🤍`
        );
        return;
    }
    
    await delay(1000);
    
    if (mensagemLower.includes('manhã') || mensagemLower.includes('manha')) {
        conversa.dados.periodo = 'Manhã (8h às 12h)';
    } else {
        conversa.dados.periodo = 'Tarde (14h às 18h)';
    }
    
    await mostrarServicos(msg, conversa);
    
    console.log(`⏰ Período registrado: ${conversa.dados.periodo}`);
}

async function mostrarServicos(msg, conversa) {
    await delay(1000);
    
    let mensagemServicos = `Perfeito 🤍\n\n` +
        `Agora me diga, por gentileza,\n` +
        `qual procedimento você deseja realizar:\n\n`;
    
    for (let i = 1; i <= 26; i++) {
        const servico = servicos[i];
        mensagemServicos += `*${i}* - ${servico.nome} ${servico.preco}\n`;
    }
    
    mensagemServicos += `\nConfira o catálogo do whats e conheça os serviços também! 🥰\n\n`;
    mensagemServicos += `_Digite o número do procedimento desejado_`;
    
    await client.sendMessage(msg.from, mensagemServicos);
    
    // ✅ ENVIAR PDF DO CATÁLOGO
    await enviarCatalogo(msg.from);
    
    conversa.estado = ESTADOS.AGUARDANDO_SERVICO;
}

// ==================== FUNÇÃO PARA ENVIAR CATÁLOGO ====================

async function enviarCatalogo(numeroTelefone) {
    try {
        await delay(1500); // Aguarda um pouco antes de enviar
        
        const catalogoPath = path.join(__dirname, 'src', 'public', 'documents', 'Catalago.pdf');
        
        // Verifica se o arquivo existe
        if (!fs.existsSync(catalogoPath)) {
            console.log(`⚠️ Catálogo não encontrado em: ${catalogoPath}`);
            return;
        }
        
        console.log(`📄 Enviando catálogo para ${numeroTelefone}...`);
        
        // Cria objeto de mídia
        const media = MessageMedia.fromFilePath(catalogoPath);
        
        // Envia o PDF com legenda
        await client.sendMessage(numeroTelefone, media, {
            caption: '📖 *Catálogo Pri Malzoni Estética*\n\nConfira todos os nossos serviços! ✨'
        });
        
        console.log(`✅ Catálogo enviado com sucesso!`);
        
    } catch (error) {
        console.log(`❌ Erro ao enviar catálogo: ${error.message}`);
    }
}

async function processarServico(msg, mensagem, conversa) {
    const numeroServico = parseInt(mensagem.trim());
    
    if (isNaN(numeroServico) || numeroServico < 1 || numeroServico > 26) {
        await client.sendMessage(msg.from,
            `Por favor, digite um número válido entre *1* e *26* 🤍`
        );
        return;
    }
    
    await delay(1000);
    
    const servicoEscolhido = servicos[numeroServico];
    conversa.dados.servico = `${servicoEscolhido.nome} - ${servicoEscolhido.preco}`;
    conversa.dados.numeroServico = numeroServico;
    
    await mostrarOpcoesAgendamento(msg, conversa);
    
    console.log(`💆 Serviço escolhido: ${conversa.dados.servico}`);
}

async function mostrarOpcoesAgendamento(msg, conversa) {
    loadUrls();
    
    await delay(1000);
    
    const mensagemOpcoes = 
        `Ótimo ✨\n\n` +
        `Agora vou te mostrar as formas disponíveis para seguir com o agendamento 👇\n\n` +
        `👉 Se preferir realizar o agendamento de forma *independente e definitiva*, (em média 3 minutos)\n` +
        `acesse o link abaixo:\n\n` +
        `${LINK_APP_BELEZA}\n\n` +
        `👉 Se desejar solicitar o serviço por aqui, (para solicitar 3 minutos)\n` +
        `utilize este link:\n\n` +
        `${SISTEMA_WEB_URL}\n\n` +
        `👉 Caso queira falar diretamente com a Pri,\n` +
        `pedimos que aguarde ela finalizar os atendimentos do dia 🤍\n\n` +
        `Assim que possível, ela retorna com toda atenção que você merece por ordem de sequência de solicitação.\n\n` +
        `━━━━━━━━━━━━━━━\n` +
        `📋 *Resumo da sua solicitação:*\n` +
        `👤 Nome: ${conversa.dados.nome}\n` +
        `⏰ Período: ${conversa.dados.periodo}\n` +
        `💆 Serviço: ${conversa.dados.servico}\n` +
        `━━━━━━━━━━━━━━━\n\n` +
        `✅ Seu atendimento foi registrado!\n\n` +
        `_Se precisar de um novo atendimento, digite *${PALAVRA_CHAVE_REATIVAR}*_ 🤍`;
    
    await client.sendMessage(msg.from, mensagemOpcoes);
    
    // ← NOVO: Encerra a conversa após mostrar o resumo
    encerrarConversa(msg.from);
    
    console.log(`📊 Dados completos coletados e conversa encerrada:`, conversa.dados);
}

async function processarComandos(msg, mensagem, conversa) {
    const mensagemLower = mensagem.toLowerCase().trim();
    
    if (mensagemLower === 'menu' || mensagemLower === 'recomeçar' || mensagemLower === 'começar') {
        console.log(`🔄 Reiniciando conversa para ${conversa.dados.nome || 'Cliente'}`);
        resetarConversa(msg.from);
        await iniciarConversa(msg);
    } else if (mensagemLower === 'sair' || mensagemLower === 'encerrar') {
        await client.sendMessage(msg.from,
            `Obrigada pelo contato! 🤍\n\n` +
            `Estamos à disposição sempre que precisar.\n\n` +
            `*Pri Malzoni Estética* ✨\n\n` +
            `_Digite *${PALAVRA_CHAVE_REATIVAR}* para iniciar um novo atendimento_`
        );
        encerrarConversa(msg.from);
        console.log(`👋 Conversa encerrada`);
    } else {
        await client.sendMessage(msg.from,
            `Olá! 🤍\n\n` +
            `Se precisar de algo mais, estou aqui!\n\n` +
            `Digite:\n` +
            `• *menu* - para recomeçar\n` +
            `• *sair* - para encerrar\n\n` +
            `Ou aguarde o retorno da Pri 💕`
        );
    }
}

// ==================== HANDLER PRINCIPAL ====================

async function handleMessage(msg) {
    try {
        // ============ FILTROS CRÍTICOS ============
        
        // 1. IGNORAR GRUPOS
        if (msg.from.includes('@g.us')) {
            console.log(`⏭️ Ignorando grupo: ${msg.from}`);
            return;
        }
        
        // 2. IGNORAR NEWSLETTERS/CHANNELS
        if (msg.from.includes('@newsletter')) {
            console.log(`⏭️ Ignorando newsletter: ${msg.from}`);
            return;
        }
        
        // 3. IGNORAR BROADCAST
        if (msg.from.includes('@broadcast')) {
            console.log(`⏭️ Ignorando broadcast`);
            return;
        }
        
        // 4. IGNORAR MENSAGENS PRÓPRIAS
        if (msg.fromMe) {
            console.log(`⏭️ Ignorando mensagem própria`);
            return;
        }
        
        // 5. IGNORAR MENSAGENS VAZIAS
        if (!msg.body || msg.body.trim() === '') {
            console.log(`⏭️ Ignorando mensagem vazia de ${msg.from}`);
            return;
        }
        
        const mensagem = msg.body.trim();
        const mensagemLower = mensagem.toLowerCase();
        
        // ============ VERIFICAR SE CONVERSA ESTÁ ENCERRADA ============
        if (conversasEncerradas.has(msg.from)) {
            // Verificar palavra-chave para reativar
            if (mensagemLower === PALAVRA_CHAVE_REATIVAR) {
                console.log(`🔓 Reativando conversa de ${msg.from}`);
                reativarConversa(msg.from);
                await iniciarConversa(msg);
                return;
            } else {
                console.log(`🔒 Conversa encerrada, ignorando mensagem de ${msg.from}: "${mensagem}"`);
                return; // Ignora qualquer outra mensagem
            }
        }
        
        console.log(`🔔 MENSAGEM VÁLIDA de ${msg.from}: "${mensagem}"`);
        
        const conversa = conversasAtivas[msg.from];
        
        if (!conversa) {
            await iniciarConversa(msg);
            return;
        }
        
        console.log(`📊 Estado atual: ${conversa.estado}`);
        
        switch (conversa.estado) {
            case ESTADOS.AGUARDANDO_NOME:
                await processarNome(msg, mensagem, conversa);
                break;
                
            case ESTADOS.AGUARDANDO_PERIODO:
                await processarPeriodo(msg, mensagem, conversa);
                break;
                
            case ESTADOS.AGUARDANDO_SERVICO:
                await processarServico(msg, mensagem, conversa);
                break;
                
            case ESTADOS.AGUARDANDO_CONTATO:
                await processarComandos(msg, mensagem, conversa);
                break;
                
            default:
                console.log(`❌ Estado desconhecido: ${conversa.estado}`);
                resetarConversa(msg.from);
                await iniciarConversa(msg);
        }
        
    } catch (error) {
        console.error('❌ ERRO no handleMessage:', error.message);
        console.error('Stack:', error.stack);
        
        try {
            resetarConversa(msg.from);
        } catch (resetError) {
            console.error('❌ Erro ao resetar conversa:', resetError.message);
        }
    }
}

client.on('message_create', handleMessage);

// ==================== INICIALIZAÇÃO ====================

console.log('🚀 Iniciando Bot WhatsApp - Pri Malzoni Estética...');
console.log('📱 Aguardando autenticação...\n');

client.initialize();

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

console.log('\n✨ Bot configurado e pronto!\n');
console.log(`🔑 Palavra-chave para reativar: "${PALAVRA_CHAVE_REATIVAR}"`);
