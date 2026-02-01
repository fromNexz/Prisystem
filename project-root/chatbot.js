// Bot WhatsApp - Pri Malzoni Estética (VERSÃO ATUALIZADA)

const qrcode = require('qrcode-terminal');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
const qr = require('qrcode');

// ==================== CONFIGURAÇÃO DO CLIENT ====================

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'primalzoni-bot'
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

// Carrega configurações do arquivo rotas.json
let SISTEMA_WEB_URL = 'http://localhost:8000';
const LINK_APP_BELEZA = 'https://sites.appbeleza.com.br/primalzonimicropigme';

try {
    if (fs.existsSync('rotas.json')) {
        const rotas = JSON.parse(fs.readFileSync('rotas.json', 'utf8'));
        SISTEMA_WEB_URL = rotas.ngrok_url || rotas.local_url || SISTEMA_WEB_URL;
        console.log(`📡 URL do sistema: ${SISTEMA_WEB_URL}`);
    }
} catch (error) {
    console.log('⚠️ CONFIG_ERROR: Erro ao carregar rotas.json, usando URL padrão');
}

// ==================== EVENTOS DE CONEXÃO ====================

client.on('qr', async (qrString) => {
    console.log('📱 QR_GENERATED - QR Code gerado!');
    
    // Exibir QR no terminal
    qrcode.generate(qrString, { small: true });
    
    try {
        const qrPath = path.join(__dirname, 'whatsapp_qr.png');
        await qr.toFile(qrPath, qrString, {
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            width: 300
        });
        
        console.log(`✅ QR_IMAGE_SAVED: ${qrPath}`);
        
    } catch (error) {
        console.log('❌ QR_ERROR:', error.message);
    }
});

client.on('authenticated', () => {
    console.log('✅ WHATSAPP_AUTH_SUCCESS - Autenticado com sucesso');
});

client.on('ready', () => {
    console.log('✅ WHATSAPP_CONNECTED - WhatsApp conectado!');
    console.log('🤖 Bot está ativo e pronto para responder');
    console.log('📱 Número conectado:', client.info.wid.user);
});

client.on('auth_failure', (msg) => {
    console.error('❌ WHATSAPP_AUTH_ERROR:', msg);
});

client.on('disconnected', (reason) => {
    console.log('⚠️ WHATSAPP_DISCONNECTED:', reason);
});

client.on('message_ack', (msg, ack) => {
    console.log(`📬 ACK recebido: ${ack}`);
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

const ESTADOS = {
    INICIAL: 'inicial',
    AGUARDANDO_NOME: 'aguardando_nome',
    AGUARDANDO_PERIODO: 'aguardando_periodo',
    AGUARDANDO_SERVICO: 'aguardando_servico',
    MOSTRANDO_OPCOES: 'mostrando_opcoes',
    AGUARDANDO_CONTATO: 'aguardando_contato'
};

const delay = ms => new Promise(res => setTimeout(res, ms));

function resetarConversa(numeroTelefone) {
    if (conversasAtivas[numeroTelefone]) {
        delete conversasAtivas[numeroTelefone];
    }
    console.log(`🔄 Conversa resetada: ${numeroTelefone}`);
}

async function iniciarConversa(msg) {
    const chat = await msg.getChat();
    
    await delay(1000);
    await chat.sendStateTyping();
    await delay(2000);
    
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

async function processarNome(msg, mensagem, conversa, chat) {
    await delay(1000);
    await chat.sendStateTyping();
    await delay(2000);
    
    // Salvar nome
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

async function processarPeriodo(msg, mensagem, conversa, chat) {
    const mensagemLower = mensagem.toLowerCase().trim();
    
    // Validar período
    if (!mensagemLower.includes('manhã') && !mensagemLower.includes('manha') && 
        !mensagemLower.includes('tarde')) {
        await client.sendMessage(msg.from,
            `Por favor, informe o período desejado:\n\n` +
            `Digite *manhã* ou *tarde* 🤍`
        );
        return;
    }
    
    await delay(1000);
    await chat.sendStateTyping();
    await delay(2500);
    
    // Salvar período
    if (mensagemLower.includes('manhã') || mensagemLower.includes('manha')) {
        conversa.dados.periodo = 'Manhã (8h às 12h)';
    } else {
        conversa.dados.periodo = 'Tarde (14h às 18h)';
    }
    
    await mostrarServicos(msg, conversa, chat);
    
    console.log(`⏰ Período registrado: ${conversa.dados.periodo}`);
}

async function mostrarServicos(msg, conversa, chat) {
    await delay(1000);
    await chat.sendStateTyping();
    await delay(2000);
    
    let mensagemServicos = `Perfeito 🤍\n\n` +
        `Agora me diga, por gentileza,\n` +
        `qual procedimento você deseja realizar:\n\n`;
    
    // Listar todos os serviços
    for (let i = 1; i <= 26; i++) {
        const servico = servicos[i];
        mensagemServicos += `*${i}* - ${servico.nome} ${servico.preco}\n`;
    }
    
    mensagemServicos += `\nConfira o catálogo do whats e conheça os serviços também! 🥰\n\n`;
    mensagemServicos += `_Digite o número do procedimento desejado_`;
    
    await client.sendMessage(msg.from, mensagemServicos);
    
    conversa.estado = ESTADOS.AGUARDANDO_SERVICO;
}

async function processarServico(msg, mensagem, conversa, chat) {
    const numeroServico = parseInt(mensagem.trim());
    
    // Validar número do serviço
    if (isNaN(numeroServico) || numeroServico < 1 || numeroServico > 26) {
        await client.sendMessage(msg.from,
            `Por favor, digite um número válido entre *1* e *26* 🤍`
        );
        return;
    }
    
    await delay(1000);
    await chat.sendStateTyping();
    await delay(2500);
    
    // Salvar serviço escolhido
    const servicoEscolhido = servicos[numeroServico];
    conversa.dados.servico = `${servicoEscolhido.nome} - ${servicoEscolhido.preco}`;
    conversa.dados.numeroServico = numeroServico;
    
    await mostrarOpcoesAgendamento(msg, conversa, chat);
    
    console.log(`💆 Serviço escolhido: ${conversa.dados.servico}`);
}

async function mostrarOpcoesAgendamento(msg, conversa, chat) {
    await delay(1000);
    await chat.sendStateTyping();
    await delay(2000);
    
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
        `━━━━━━━━━━━━━━━━━━\n` +
        `📋 *Resumo da sua solicitação:*\n` +
        `👤 Nome: ${conversa.dados.nome}\n` +
        `⏰ Período: ${conversa.dados.periodo}\n` +
        `💆 Serviço: ${conversa.dados.servico}\n` +
        `━━━━━━━━━━━━━━━━━━\n\n` +
        `Digite *menu* para recomeçar ou *sair* para encerrar 🤍`;
    
    await client.sendMessage(msg.from, mensagemOpcoes);
    
    conversa.estado = ESTADOS.AGUARDANDO_CONTATO;
    
    // Log completo dos dados coletados
    console.log(`📊 Dados completos coletados:`, conversa.dados);
}

async function processarComandos(msg, mensagem, conversa, chat) {
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
            `_Digite qualquer mensagem para iniciar um novo atendimento_`
        );
        resetarConversa(msg.from);
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
        console.log(`🔔 MENSAGEM RECEBIDA de ${msg.from}: "${msg.body}"`);
        
        // Ignorar mensagens de grupos
        if (!msg.from.endsWith('@c.us')) {
            console.log(`⏭️ Ignorando mensagem de grupo`);
            return;
        }
        
        // Ignorar mensagens do próprio bot
        if (msg.fromMe) {
            console.log(`⏭️ Ignorando mensagem própria`);
            return;
        }
        
        const mensagem = msg.body.trim();
        const conversa = conversasAtivas[msg.from];
        
        // Se não há conversa ativa, iniciar nova
        if (!conversa) {
            await iniciarConversa(msg);
            return;
        }
        
        const chat = await msg.getChat();
        
        console.log(`📊 Estado atual: ${conversa.estado}`);
        
        // Processar baseado no estado
        switch (conversa.estado) {
            case ESTADOS.AGUARDANDO_NOME:
                await processarNome(msg, mensagem, conversa, chat);
                break;
                
            case ESTADOS.AGUARDANDO_PERIODO:
                await processarPeriodo(msg, mensagem, conversa, chat);
                break;
                
            case ESTADOS.AGUARDANDO_SERVICO:
                await processarServico(msg, mensagem, conversa, chat);
                break;
                
            case ESTADOS.AGUARDANDO_CONTATO:
                await processarComandos(msg, mensagem, conversa, chat);
                break;
                
            default:
                console.log(`❌ Estado desconhecido: ${conversa.estado}`);
                resetarConversa(msg.from);
                await iniciarConversa(msg);
        }
        
    } catch (error) {
        console.error('❌ ERRO no handler de mensagens:', error);
        console.error('Stack:', error.stack);
        
        try {
            await client.sendMessage(msg.from, 
                `😔 Desculpe, ocorreu um erro.\n\n` +
                `Digite *menu* para recomeçar 🤍`
            );
            resetarConversa(msg.from);
        } catch (sendError) {
            console.error('❌ Erro ao enviar mensagem de erro:', sendError);
        }
    }
}

// ✅ Usar APENAS message_create
client.on('message_create', handleMessage);

// ==================== INICIALIZAÇÃO ====================

console.log('[+] Iniciando Bot do WhatsApp - Pri Malzoni Estética...');
console.log('{...} Aguardando autenticação...');
console.log('{...} Isso pode levar alguns segundos...\n');

client.initialize();

process.on('unhandledRejection', (reason, promise) => {
    console.error('[X] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('[X] Uncaught Exception:', error);
});

console.log('\n✨ Bot configurado e pronto para inicializar!\n');
