// Bot WhatsApp - Salão da Pri (SEM TOKENS)

const qrcode = require('qrcode-terminal');
const { Client, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
const qr = require('qrcode');

const client = new Client();

// Carrega configurações do arquivo rotas.json
let SISTEMA_WEB_URL = 'http://localhost:8000';
try {
    if (fs.existsSync('rotas.json')) {
        const rotas = JSON.parse(fs.readFileSync('rotas.json', 'utf8'));
        SISTEMA_WEB_URL = rotas.ngrok_url || rotas.local_url || SISTEMA_WEB_URL;
    }
} catch (error) {
    console.log('CONFIG_ERROR: Erro ao carregar rotas.json, usando URL padrão');
}

// Leitor de QR Code
client.on('qr', async (qrString) => {
    console.log('QR_GENERATED');
    console.log('📱 QR Code gerado! Salvando como imagem...');
    
    try {
        const qrPath = path.join(__dirname, 'whatsapp_qr.png');
        await qr.toFile(qrPath, qrString, {
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            width: 300
        });
        
        console.log('QR_IMAGE_SAVED');
        console.log(`QR Code salvo como imagem: ${qrPath}`);
        console.log('Abra o arquivo whatsapp_qr.png para escanear');
        
    } catch (error) {
        console.log('QR_ERROR');
        console.log('Erro ao gerar QR Code:', error.message);
    }
});

// Confirmação de conexão
client.on('ready', () => {
    console.log('WHATSAPP_CONNECTED');
    console.log('✅ Tudo certo! WhatsApp conectado.');
    console.log('🤖 Bot do Salão da Pri ativo e aguardando mensagens...');
});

// Eventos de conexão
client.on('authenticated', (session) => {
    console.log('WHATSAPP_AUTH_SUCCESS');
    console.log('✅ WhatsApp autenticado com sucesso');
});

client.on('auth_failure', (msg) => {
    console.log('WHATSAPP_AUTH_ERROR');
    console.log('❌ Falha na autenticação do WhatsApp:', msg);
});

client.on('disconnected', (reason) => {
    console.log('WHATSAPP_DISCONNECTED');
    console.log('📱 WhatsApp desconectado. Motivo:', reason);
});

// Inicializa o cliente
console.log('BOT_STARTING');
console.log('🤖 Iniciando Bot do WhatsApp...');
client.initialize();

// Função delay
const delay = ms => new Promise(res => setTimeout(res, ms));

// ==================== DADOS DOS SERVIÇOS ====================

const servicos = {
    design_sobrancelha: { nome: 'Design de sobrancelhas', preco: 'R$ 35,00' },
    design_micro: { nome: 'Design em sobrancelhas micropigmentadas', preco: 'R$ 30,00' },
    lash_lifting: { nome: 'Lash Lifting', preco: 'R$ 120,00' },
    micropigmentacao: { nome: 'Micropigmentação', preco: 'R$ 400,00' },
    limpeza_pele: { nome: 'Limpeza de pele', preco: 'R$ 120,00' },
    depil_buco: { nome: 'Depilação buço', preco: 'R$ 10,00' },
    depil_buco_queixo: { nome: 'Depilação buço e queixo', preco: 'R$ 20,00' },
    depil_facial: { nome: 'Depilação Facial', preco: 'R$ 60,00' },
    design_henna: { nome: 'Design e henna', preco: 'R$ 50,00' },
    brows_lamination: { nome: 'Brows Laminations', preco: 'R$ 120,00' }
};

const combos = {
    olhar_poderoso: {
        nome: 'Olhar Poderoso',
        servicos: 'Alongamento + Design & Henna + Spa Lips',
        brinde: 'Depilação buço',
        preco_original: 'R$ 280,00',
        preco_combo: 'R$ 240,00'
    },
    pele_radiante: {
        nome: 'Pele Radiante',
        servicos: 'Limpeza de pele + Spa Lips',
        brinde: 'Depilação buço',
        preco_original: 'R$ 170,00',
        preco_combo: 'R$ 130,00'
    }
};

// ==================== SISTEMA DE CONVERSAS ====================

let conversasAtivas = {};

const ESTADOS = {
    MENU_INICIAL: 'menu_inicial',
    ESCOLHENDO_SERVICO: 'escolhendo_servico',
    ESCOLHENDO_COMBO: 'escolhendo_combo',
    AGUARDANDO_CONTATO: 'aguardando_contato'
};

function resetarConversa(numeroTelefone) {
    if (conversasAtivas[numeroTelefone]) {
        delete conversasAtivas[numeroTelefone];
    }
    console.log('CONVERSATION_RESET');
    console.log(`🔄 Conversa resetada para ${numeroTelefone}`);
}

async function mostrarMenuInicial(msg, firstName) {
    const chat = await msg.getChat();
    
    await delay(2000);
    await chat.sendStateTyping();
    await delay(3000);
    
    await client.sendMessage(msg.from, 
        `Olá ${firstName}! 👋\n\n` +
        `Sou a assistente virtual da *Pri*, como posso ajudar hoje?\n\n` +
        `Por favor, digite uma das opções abaixo:\n\n` +
        `*1* - 📅 Agendar horário\n` +
        `*2* - ✂️ Serviços e valores\n` +
        `*3* - 🎁 Combos especiais\n` +
        `*4* - 📞 Conversar com a Pri\n` +
        `*(Para responder, digite os números respectivos. Ex: Digite 1 para agendar)*`
    );
    
    conversasAtivas[msg.from] = {
        estado: ESTADOS.MENU_INICIAL,
        nome: firstName
    };
    
    console.log('MENU_SENT');
    console.log(`📋 Menu inicial enviado para ${firstName}`);
}

async function processarMenuInicial(msg, mensagem, conversa, chat) {
    await delay(1500);
    await chat.sendStateTyping();
    await delay(2500);
    
    switch (mensagem) {
        case '1':
            console.log('USER_SELECTED_SCHEDULING');
            console.log(`📅 ${conversa.nome} selecionou agendamento`);
            
            // LINK SIMPLES - SEM TOKENS
            await client.sendMessage(msg.from,
                `📅 *Agendamento Online*\n\n` +
                `Perfeito ${conversa.nome}! Para agendar seu horário, clique no link abaixo:\n\n` +
                `🔗 ${SISTEMA_WEB_URL}\n\n` +
                `✨ *Vantagens do agendamento online:*\n` +
                `• Veja horários disponíveis em tempo real\n` +
                `• Escolha o serviço desejado\n` +
                `• Confirmação instantânea\n` +
                `• Lembretes automáticos\n\n` +
                `💬 Precisa de ajuda? Digite *4* para falar comigo diretamente!`
            );

            await delay(2000);
            
            try {
                const imagePath = path.join('C:', 'Users', 'pedro', 'OneDrive', 'Área de Trabalho', 'Pri', 'ex.png'); // Alteração de caminho necessária
                
                if (fs.existsSync(imagePath)) {
                    const media = MessageMedia.fromFilePath(imagePath);
                    await client.sendMessage(msg.from, media, {
                        caption: `🔍 *O que é essa tela?*\n\n` +
                                `Está tudo bem, essa é uma tela de verificação para sua segurança.\n\n` +
                                `Para ir para o site de agendamento basta clicar em *"Visit Site"* ✅`
                    });
                    console.log('HELP_IMAGE_SENT');
                    console.log(`📸 Imagem de ajuda enviada para ${conversa.nome}`);
                } else {
                    console.log('IMAGE_NOT_FOUND');
                    console.log(`⚠️ Imagem não encontrada em: ${imagePath}`);
                }
            } catch (error) {
                console.log('IMAGE_SEND_ERROR');
                console.log(`❌ Erro ao enviar imagem: ${error.message}`);
            }
            
            conversasAtivas[msg.from].estado = ESTADOS.AGUARDANDO_CONTATO;
            break;
            
        case '2':
            console.log('USER_SELECTED_SERVICES');
            console.log(`✂️ ${conversa.nome} selecionou serviços e valores`);
            
            await mostrarServicos(msg, conversa, chat);
            break;
            
        case '3':
            console.log('USER_SELECTED_COMBOS');
            console.log(`🎁 ${conversa.nome} selecionou combos especiais`);
            
            await mostrarCombos(msg, conversa, chat);
            break;
            
        case '4':
            console.log('USER_REQUESTED_CONTACT');
            console.log(`📞 ${conversa.nome} solicitou contato direto`);
            
            await client.sendMessage(msg.from,
                `📞 *Falar com a Pri*\n\n` +
                `Oi ${conversa.nome}! A Pri estará disponível para te atender:\n\n` +
                `⏰ *Horário de Atendimento:*\n` +
                `Segunda a Sexta: 9h às 18h\n` +
                `Sábado: 8h às 16h\n\n` +
                `📱 *Contato direto:*\n` +
                `WhatsApp: +55 55 99154-6257\n` +
                `Instagram: @primalzoni_estetica\n\n` +
                `🔙 Digite *menu* para voltar ao menu principal`
            );
            
            conversasAtivas[msg.from].estado = ESTADOS.AGUARDANDO_CONTATO;
            break;
            
        case 'menu':
        case 'Menu':
            console.log('USER_REQUESTED_MENU');
            console.log(`🔙 ${conversa.nome} solicitou retorno ao menu`);
            
            await mostrarMenuInicial(msg, conversa.nome);
            break;
            
        default:
            console.log('USER_INVALID_OPTION');
            console.log(`❓ ${conversa.nome} enviou opção inválida: ${mensagem}`);
            
            await client.sendMessage(msg.from,
                `🤔 Não entendi sua opção.\n\n` +
                `Por favor, escolha uma das opções:\n\n` +
                `*1* - 📅 Agendar horário\n` +
                `*2* - ✂️ Serviços e valores\n` +
                `*3* - 🎁 Combos especiais\n` +
                `*4* - 📞 Conversar com a Pri`
            );
    }
}

async function mostrarServicos(msg, conversa, chat) {
    await delay(2000);
    await chat.sendStateTyping();
    await delay(3000);
    
    let listaServicos = `✂️ *Nossos Serviços e Valores*\n\n`;
    
    Object.values(servicos).forEach((servico, index) => {
        listaServicos += `${index + 1}. *${servico.nome}*\n   💰 ${servico.preco}\n\n`;
    });
    
    listaServicos += `📅 Para agendar qualquer serviço, digite *1*\n`;
    listaServicos += `🎁 Quer ver nossos combos? Digite *3*\n`;
    listaServicos += `🔙 Voltar ao menu: digite *menu*`;
    
    await client.sendMessage(msg.from, listaServicos);
    
    conversasAtivas[msg.from].estado = ESTADOS.ESCOLHENDO_SERVICO;
}

async function mostrarCombos(msg, conversa, chat) {
    await delay(2000);
    await chat.sendStateTyping();
    await delay(3500);
    
    let listaCombos = `🎁 *Combos Especiais - Economia Garantida!*\n\n`;
    
    Object.values(combos).forEach((combo, index) => {
        listaCombos += `${index + 1}. *${combo.nome}*\n`;
        listaCombos += `   📋 ${combo.servicos}\n`;
        listaCombos += `   🎁 Brinde: ${combo.brinde}\n`;
        listaCombos += `   💸 De ${combo.preco_original} por *${combo.preco_combo}*\n`;
        listaCombos += `   💰 Economia: R$ ${parseInt(combo.preco_original.replace(/\D/g, '')) - parseInt(combo.preco_combo.replace(/\D/g, ''))},00\n\n`;
    });
    
    listaCombos += `📅 Para agendar qualquer combo, digite *1*\n`;
    listaCombos += `✂️ Quer ver serviços individuais? Digite *2*\n`;
    listaCombos += `🔙 Voltar ao menu: digite *menu*`;
    
    await client.sendMessage(msg.from, listaCombos);
    
    conversasAtivas[msg.from].estado = ESTADOS.ESCOLHENDO_COMBO;
}

async function processarEscolhaServico(msg, mensagem, conversa, chat) {
    switch (mensagem) {
        case '1':
            await client.sendMessage(msg.from,
                `📅 *Agendar Serviço*\n\n` +
                `Perfeito! Clique no link abaixo para agendar:\n\n` +
                `🔗 ${SISTEMA_WEB_URL}\n\n` +
                `Você poderá escolher o serviço específico na página de agendamento! 😊`
            );
            conversasAtivas[msg.from].estado = ESTADOS.AGUARDANDO_CONTATO;
            break;
            
        case '3':
            await mostrarCombos(msg, conversa, chat);
            break;
            
        case 'menu', 'Menu':
            await mostrarMenuInicial(msg, conversa.nome);
            break;
            
        default:
            await client.sendMessage(msg.from,
                `🤔 Opção não reconhecida.\n\n` +
                `Digite:\n` +
                `*1* - Para agendar\n` +
                `*3* - Ver combos\n` +
                `*menu* - Voltar ao início`
            );
    }
}

async function processarEscolhaCombo(msg, mensagem, conversa, chat) {
    switch (mensagem) {
        case '1':
            await client.sendMessage(msg.from,
                `📅 *Agendar Combo*\n\n` +
                `Excelente escolha! Clique no link abaixo:\n\n` +
                `🔗 ${SISTEMA_WEB_URL}\n\n` +
                `Na página você poderá selecionar o combo desejado! ✨`
            );
            conversasAtivas[msg.from].estado = ESTADOS.AGUARDANDO_CONTATO;
            break;
            
        case '2':
            await mostrarServicos(msg, conversa, chat);
            break;
            
        case 'menu':
            await mostrarMenuInicial(msg, conversa.nome);
            break;
            
        default:
            await client.sendMessage(msg.from,
                `🤔 Opção não reconhecida.\n\n` +
                `Digite:\n` +
                `*1* - Para agendar combo\n` +
                `*2* - Ver serviços individuais\n` +
                `*menu* - Voltar ao início`
            );
    }
}

async function processarAguardandoContato(msg, mensagem, conversa, chat) {
    switch (mensagem) {
        case 'menu':
        case 'Menu':
            await mostrarMenuInicial(msg, conversa.nome);
            break;
            
        case '1':
        case '2':
        case '3':
        case '4':
            await processarMenuInicial(msg, mensagem, conversa, chat);
            break;
            
        default:
            await client.sendMessage(msg.from,
                `Oi ${conversa.nome}! 👋\n\n` +
                `Para uma nova consulta, digite *menu* ou escolha:\n\n` +
                `*1* - 📅 Agendar horário\n` +
                `*2* - ✂️ Serviços e valores\n` +
                `*3* - 🎁 Combos especiais\n` +
                `*4* - 📞 Conversar com a Pri`
            );
    }
}

// ==================== SISTEMA PRINCIPAL DE MENSAGENS ====================

client.on('message', async msg => {
    
    if (!msg.from.endsWith('@c.us')) {
        return;
    }
    
    const mensagem = msg.body.trim();
    const conversa = conversasAtivas[msg.from];
    const contact = await msg.getContact();
    const firstName = contact.pushname ? contact.pushname.split(' ')[0] : 'Cliente';
    
    console.log('MESSAGE_RECEIVED');
    console.log(`📨 Mensagem de ${firstName} (${msg.from}): ${mensagem}`);
    
    if (!conversa && mensagem.match(/(Pri|pri|PRI|menu|Menu|dia|tarde|noite|oi|Oi|Olá|olá|ola|Ola|bom dia|boa tarde|boa noite|1|2|3|4)/i)) {
        console.log('CONVERSATION_STARTED');
        console.log(`🆕 Nova conversa iniciada com ${firstName}`);
        await mostrarMenuInicial(msg, firstName);
        return;
    }
    
    if (!conversa) {
        console.log('CONVERSATION_NOT_RECOGNIZED');
        console.log(`❓ Mensagem não reconhecida de ${firstName}: ${mensagem}`);
        
        await delay(2000);
        const chat = await msg.getChat();
        await chat.sendStateTyping();
        await delay(2000);
        
        await client.sendMessage(msg.from, 
            `🤔 Não entendi sua mensagem.\n\n` +
            `Digite *menu* para iniciar ou uma das opções:\n\n` +
            `*1* - Agendar horário\n` +
            `*2* - Serviços e valores\n` +
            `*3* - Combos especiais\n` +
            `*4* - Falar com a Pri`
        );
        return;
    }
    
    const chat = await msg.getChat();
    
    console.log('PROCESSING_STATE');
    console.log(`⚡ Processando estado ${conversa.estado} para ${firstName}`);
    
    switch (conversa.estado) {
        case ESTADOS.MENU_INICIAL:
            await processarMenuInicial(msg, mensagem, conversa, chat);
            break;
            
        case ESTADOS.ESCOLHENDO_SERVICO:
            await processarEscolhaServico(msg, mensagem, conversa, chat);
            break;
            
        case ESTADOS.ESCOLHENDO_COMBO:
            await processarEscolhaCombo(msg, mensagem, conversa, chat);
            break;
            
        case ESTADOS.AGUARDANDO_CONTATO:
            await processarAguardandoContato(msg, mensagem, conversa, chat);
            break;
            
        default:
            console.log('UNKNOWN_STATE');
            console.log(`❌ Estado desconhecido: ${conversa.estado}`);
            resetarConversa(msg.from);
            await mostrarMenuInicial(msg, firstName);
    }
});

console.log('CHATBOT_INITIALIZED');
console.log('🚀 Chatbot Pri Malzoni inicializado - VERSÃO SIMPLIFICADA');
console.log('📱 Aguardando conexão com WhatsApp...');
console.log('🔧 Sistema de tokens REMOVIDO - Link direto único');