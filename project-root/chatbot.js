// Bot WhatsApp - Salão da Pri (VERSÃO CORRIGIDA)

const qrcode = require('qrcode-terminal');
const { Client, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
const qr = require('qrcode');

const client = new Client({
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

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

// ==================== EVENTOS DE CONEXÃO ====================

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
        console.log(`QR Code salvo: ${qrPath}`);
        
    } catch (error) {
        console.log('QR_ERROR:', error.message);
    }
});

client.on('ready', () => {
    console.log('WHATSAPP_CONNECTED');
    console.log('✅ WhatsApp conectado - Bot ativo!');
});

client.on('authenticated', () => {
    console.log('WHATSAPP_AUTH_SUCCESS');
    console.log('✅ Autenticado com sucesso');
});

client.on('auth_failure', (msg) => {
    console.log('WHATSAPP_AUTH_ERROR:', msg);
});

client.on('disconnected', (reason) => {
    console.log('WHATSAPP_DISCONNECTED:', reason);
});

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

const delay = ms => new Promise(res => setTimeout(res, ms));

function resetarConversa(numeroTelefone) {
    if (conversasAtivas[numeroTelefone]) {
        delete conversasAtivas[numeroTelefone];
    }
    console.log(`🔄 Conversa resetada: ${numeroTelefone}`);
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
        `*(Para responder, digite os números respectivos)*`
    );
    
    conversasAtivas[msg.from] = {
        estado: ESTADOS.MENU_INICIAL,
        nome: firstName
    };
    
    console.log(`📋 Menu enviado para ${firstName}`);
}

async function processarMenuInicial(msg, mensagem, conversa, chat) {
    await delay(1500);
    await chat.sendStateTyping();
    await delay(2500);
    
    switch (mensagem) {
        case '1':
            console.log(`📅 ${conversa.nome} → Agendamento`);
            
            await client.sendMessage(msg.from,
                `📅 *Agendamento Online*\n\n` +
                `Perfeito ${conversa.nome}! Para agendar seu horário:\n\n` +
                `🔗 ${SISTEMA_WEB_URL}\n\n` +
                `✨ *Vantagens:*\n` +
                `• Horários em tempo real\n` +
                `• Escolha o serviço desejado\n` +
                `• Confirmação instantânea\n` +
                `• Lembretes automáticos\n\n` +
                `💬 Precisa de ajuda? Digite *4*`
            );

            await delay(2000);
            
            try {
                const imagePath = path.join(__dirname, 'ex.png');
                
                if (fs.existsSync(imagePath)) {
                    const media = MessageMedia.fromFilePath(imagePath);
                    await client.sendMessage(msg.from, media, {
                        caption: `🔍 *Como acessar*\n\n` +
                                `Clique em *"Visit Site"* para continuar ✅`
                    });
                    console.log(`📸 Imagem enviada para ${conversa.nome}`);
                }
            } catch (error) {
                console.log(`❌ Erro ao enviar imagem: ${error.message}`);
            }
            
            conversasAtivas[msg.from].estado = ESTADOS.AGUARDANDO_CONTATO;
            break;
            
        case '2':
            console.log(`✂️ ${conversa.nome} → Serviços`);
            await mostrarServicos(msg, conversa, chat);
            break;
            
        case '3':
            console.log(`🎁 ${conversa.nome} → Combos`);
            await mostrarCombos(msg, conversa, chat);
            break;
            
        case '4':
            console.log(`📞 ${conversa.nome} → Contato direto`);
            
            await client.sendMessage(msg.from,
                `📞 *Falar com a Pri*\n\n` +
                `Oi ${conversa.nome}! Horário de atendimento:\n\n` +
                `⏰ Segunda a Sexta: 9h às 18h\n` +
                `⏰ Sábado: 8h às 16h\n\n` +
                `📱 WhatsApp: +55 55 99154-6257\n` +
                `📸 Instagram: @primalzoni_estetica\n\n` +
                `🔙 Digite *menu* para voltar`
            );
            
            conversasAtivas[msg.from].estado = ESTADOS.AGUARDANDO_CONTATO;
            break;
            
        case 'menu':
        case 'Menu':
        case 'MENU':
            console.log(`🔙 ${conversa.nome} → Menu`);
            await mostrarMenuInicial(msg, conversa.nome);
            break;
            
        default:
            console.log(`❓ Opção inválida de ${conversa.nome}: ${mensagem}`);
            
            await client.sendMessage(msg.from,
                `🤔 Não entendi sua opção.\n\n` +
                `Por favor, escolha:\n\n` +
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
    
    listaServicos += `📅 Agendar: digite *1*\n`;
    listaServicos += `🎁 Ver combos: digite *3*\n`;
    listaServicos += `🔙 Menu: digite *menu*`;
    
    await client.sendMessage(msg.from, listaServicos);
    
    conversasAtivas[msg.from].estado = ESTADOS.ESCOLHENDO_SERVICO;
}

async function mostrarCombos(msg, conversa, chat) {
    await delay(2000);
    await chat.sendStateTyping();
    await delay(3500);
    
    let listaCombos = `🎁 *Combos Especiais*\n\n`;
    
    Object.values(combos).forEach((combo, index) => {
        const economia = parseInt(combo.preco_original.replace(/\D/g, '')) - 
                        parseInt(combo.preco_combo.replace(/\D/g, ''));
        
        listaCombos += `${index + 1}. *${combo.nome}*\n`;
        listaCombos += `   📋 ${combo.servicos}\n`;
        listaCombos += `   🎁 Brinde: ${combo.brinde}\n`;
        listaCombos += `   💸 De ${combo.preco_original} por *${combo.preco_combo}*\n`;
        listaCombos += `   💰 Economia: R$ ${economia},00\n\n`;
    });
    
    listaCombos += `📅 Agendar: digite *1*\n`;
    listaCombos += `✂️ Ver serviços: digite *2*\n`;
    listaCombos += `🔙 Menu: digite *menu*`;
    
    await client.sendMessage(msg.from, listaCombos);
    
    conversasAtivas[msg.from].estado = ESTADOS.ESCOLHENDO_COMBO;
}

async function processarEscolhaServico(msg, mensagem, conversa, chat) {
    switch (mensagem) {
        case '1':
            await client.sendMessage(msg.from,
                `📅 *Agendar Serviço*\n\n` +
                `Perfeito! Acesse:\n\n` +
                `🔗 ${SISTEMA_WEB_URL}\n\n` +
                `Escolha o serviço na página de agendamento! 😊`
            );
            conversasAtivas[msg.from].estado = ESTADOS.AGUARDANDO_CONTATO;
            break;
            
        case '3':
            await mostrarCombos(msg, conversa, chat);
            break;
            
        case 'menu':
        case 'Menu':
        case 'MENU':
            await mostrarMenuInicial(msg, conversa.nome);
            break;
            
        default:
            await client.sendMessage(msg.from,
                `🤔 Opção não reconhecida.\n\n` +
                `*1* - Agendar\n` +
                `*3* - Ver combos\n` +
                `*menu* - Voltar`
            );
    }
}

async function processarEscolhaCombo(msg, mensagem, conversa, chat) {
    switch (mensagem) {
        case '1':
            await client.sendMessage(msg.from,
                `📅 *Agendar Combo*\n\n` +
                `Excelente escolha! Acesse:\n\n` +
                `🔗 ${SISTEMA_WEB_URL}\n\n` +
                `Selecione o combo desejado! ✨`
            );
            conversasAtivas[msg.from].estado = ESTADOS.AGUARDANDO_CONTATO;
            break;
            
        case '2':
            await mostrarServicos(msg, conversa, chat);
            break;
            
        case 'menu':
        case 'Menu':
        case 'MENU':
            await mostrarMenuInicial(msg, conversa.nome);
            break;
            
        default:
            await client.sendMessage(msg.from,
                `🤔 Opção não reconhecida.\n\n` +
                `*1* - Agendar combo\n` +
                `*2* - Ver serviços\n` +
                `*menu* - Voltar`
            );
    }
}

async function processarAguardandoContato(msg, mensagem, conversa, chat) {
    const mensagemLower = mensagem.toLowerCase();
    
    if (mensagemLower === 'menu') {
        await mostrarMenuInicial(msg, conversa.nome);
    } else if (['1', '2', '3', '4'].includes(mensagem)) {
        await processarMenuInicial(msg, mensagem, conversa, chat);
    } else {
        await client.sendMessage(msg.from,
            `Oi ${conversa.nome}! 👋\n\n` +
            `Digite *menu* ou escolha:\n\n` +
            `*1* - 📅 Agendar\n` +
            `*2* - ✂️ Serviços\n` +
            `*3* - 🎁 Combos\n` +
            `*4* - 📞 Falar com a Pri`
        );
    }
}

// ==================== HANDLER PRINCIPAL ====================

client.on('message', async msg => {
    try {
        // Ignorar mensagens de grupos
        if (!msg.from.endsWith('@c.us')) {
            return;
        }
        
        // Ignorar mensagens do próprio bot
        if (msg.fromMe) {
            return;
        }
        
        const mensagem = msg.body.trim();
        const conversa = conversasAtivas[msg.from];
        const contact = await msg.getContact();
        const firstName = contact.pushname ? contact.pushname.split(' ')[0] : 'Cliente';
        
        console.log(`📨 ${firstName}: ${mensagem}`);
        
        // Se não há conversa ativa, iniciar nova conversa com QUALQUER mensagem
        if (!conversa) {
            console.log(`🆕 Nova conversa: ${firstName}`);
            await mostrarMenuInicial(msg, firstName);
            return;
        }
        
        const chat = await msg.getChat();
        
        // Processar baseado no estado atual
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
                console.log(`❌ Estado desconhecido: ${conversa.estado}`);
                resetarConversa(msg.from);
                await mostrarMenuInicial(msg, firstName);
        }
        
    } catch (error) {
        console.error('❌ ERRO no handler de mensagens:', error);
        
        try {
            await client.sendMessage(msg.from, 
                `😔 Desculpe, ocorreu um erro.\n\n` +
                `Digite *menu* para recomeçar.`
            );
        } catch (sendError) {
            console.error('❌ Erro ao enviar mensagem de erro:', sendError);
        }
    }
});

// ==================== INICIALIZAÇÃO ====================

console.log('🚀 Iniciando Bot do WhatsApp...');
console.log('📱 Aguardando conexão...');

client.initialize();
