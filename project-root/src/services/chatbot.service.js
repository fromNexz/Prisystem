// src/services/chatbot.service.js
const logger = require('../utils/logger');
const whatsappService = require('./whatsapp.service');
const config = require('../config/config');

class ChatbotService {
    constructor() {
        this.conversasAtivas = {};
        this.ESTADOS = {
            MENU_INICIAL: 'menu_inicial',
            ESCOLHENDO_SERVICO: 'escolhendo_servico',
            ESCOLHENDO_COMBO: 'escolhendo_combo',
            AGUARDANDO_CONTATO: 'aguardando_contato'
        };

        this.servicos = {
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

        this.combos = {
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
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    resetarConversa(numeroTelefone) {
        if (this.conversasAtivas[numeroTelefone]) {
            delete this.conversasAtivas[numeroTelefone];
        }
        logger.debug('Conversa resetada', { numero: numeroTelefone });
    }

    async mostrarMenuInicial(from, firstName) {
        await this.delay(2000);
        await whatsappService.setTyping(from, 3000);
        
        const mensagem = 
            `Olá ${firstName}! 👋\n\n` +
            `Sou a assistente virtual da *Pri*, como posso ajudar hoje?\n\n` +
            `Por favor, digite uma das opções abaixo:\n\n` +
            `*1* - 📅 Agendar horário\n` +
            `*2* - ✂️ Serviços e valores\n` +
            `*3* - 🎁 Combos especiais\n` +
            `*4* - 📞 Conversar com a Pri\n` +
            `*(Para responder, digite os números respectivos)*`;
        
        await whatsappService.sendMessage(from, mensagem);
        
        this.conversasAtivas[from] = {
            estado: this.ESTADOS.MENU_INICIAL,
            nome: firstName
        };
        
        logger.user(firstName, 'Menu inicial enviado');
    }

    async processarMenuInicial(from, mensagem, conversa) {
        await this.delay(1500);
        await whatsappService.setTyping(from, 2500);
        
        switch (mensagem) {
            case '1':
                logger.user(conversa.nome, 'Selecionou agendamento');
                await this.enviarAgendamento(from, conversa.nome);
                break;
                
            case '2':
                logger.user(conversa.nome, 'Selecionou serviços');
                await this.mostrarServicos(from, conversa);
                break;
                
            case '3':
                logger.user(conversa.nome, 'Selecionou combos');
                await this.mostrarCombos(from, conversa);
                break;
                
            case '4':
                logger.user(conversa.nome, 'Solicitou contato direto');
                await this.enviarContato(from, conversa.nome);
                break;
                
            case 'menu':
            case 'Menu':
            case 'MENU':
                logger.user(conversa.nome, 'Voltou ao menu');
                await this.mostrarMenuInicial(from, conversa.nome);
                break;
                
            default:
                logger.user(conversa.nome, 'Opção inválida', { opcao: mensagem });
                await whatsappService.sendMessage(from,
                    `🤔 Não entendi sua opção.\n\n` +
                    `Por favor, escolha:\n\n` +
                    `*1* - 📅 Agendar horário\n` +
                    `*2* - ✂️ Serviços e valores\n` +
                    `*3* - 🎁 Combos especiais\n` +
                    `*4* - 📞 Conversar com a Pri`
                );
        }
    }

    async enviarAgendamento(from, nome) {
        const webUrl = config.getWebUrl();
        
        const mensagem = 
            `📅 *Agendamento Online*\n\n` +
            `Perfeito ${nome}! Para agendar seu horário:\n\n` +
            `🔗 ${webUrl}\n\n` +
            `✨ *Vantagens:*\n` +
            `• Horários em tempo real\n` +
            `• Escolha o serviço desejado\n` +
            `• Confirmação instantânea\n` +
            `• Lembretes automáticos\n\n` +
            `💬 Precisa de ajuda? Digite *4*`;
        
        await whatsappService.sendMessage(from, mensagem);
        
        await this.delay(2000);
        
        // Enviar imagem de ajuda
        const imagePath = require('path').join(config.get('paths.images'), 'ex.png');
        await whatsappService.sendMediaMessage(from, imagePath,
            `🔍 *Como acessar*\n\n` +
            `Clique em *"Visit Site"* para continuar ✅`
        );
        
        this.conversasAtivas[from].estado = this.ESTADOS.AGUARDANDO_CONTATO;
    }

    async mostrarServicos(from, conversa) {
        await this.delay(2000);
        await whatsappService.setTyping(from, 3000);
        
        let listaServicos = `✂️ *Nossos Serviços e Valores*\n\n`;
        
        Object.values(this.servicos).forEach((servico, index) => {
            listaServicos += `${index + 1}. *${servico.nome}*\n   💰 ${servico.preco}\n\n`;
        });
        
        listaServicos += `📅 Agendar: digite *1*\n`;
        listaServicos += `🎁 Ver combos: digite *3*\n`;
        listaServicos += `🔙 Menu: digite *menu*`;
        
        await whatsappService.sendMessage(from, listaServicos);
        
        this.conversasAtivas[from].estado = this.ESTADOS.ESCOLHENDO_SERVICO;
    }

    async mostrarCombos(from, conversa) {
        await this.delay(2000);
        await whatsappService.setTyping(from, 3500);
        
        let listaCombos = `🎁 *Combos Especiais*\n\n`;
        
        Object.values(this.combos).forEach((combo, index) => {
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
        
        await whatsappService.sendMessage(from, listaCombos);
        
        this.conversasAtivas[from].estado = this.ESTADOS.ESCOLHENDO_COMBO;
    }

    async enviarContato(from, nome) {
        const mensagem = 
            `📞 *Falar com a Pri*\n\n` +
            `Oi ${nome}! Horário de atendimento:\n\n` +
            `⏰ Segunda a Sexta: 9h às 18h\n` +
            `⏰ Sábado: 8h às 16h\n\n` +
            `📱 WhatsApp: +55 55 99154-6257\n` +
            `📸 Instagram: @primalzoni_estetica\n\n` +
            `🔙 Digite *menu* para voltar`;
        
        await whatsappService.sendMessage(from, mensagem);
        this.conversasAtivas[from].estado = this.ESTADOS.AGUARDANDO_CONTATO;
    }

    async processarEscolhaServico(from, mensagem, conversa) {
        const webUrl = config.getWebUrl();
        
        switch (mensagem) {
            case '1':
                await whatsappService.sendMessage(from,
                    `📅 *Agendar Serviço*\n\n` +
                    `Perfeito! Acesse:\n\n` +
                    `🔗 ${webUrl}\n\n` +
                    `Escolha o serviço na página de agendamento! 😊`
                );
                this.conversasAtivas[from].estado = this.ESTADOS.AGUARDANDO_CONTATO;
                break;
                
            case '3':
                await this.mostrarCombos(from, conversa);
                break;
                
            case 'menu':
            case 'Menu':
            case 'MENU':
                await this.mostrarMenuInicial(from, conversa.nome);
                break;
                
            default:
                await whatsappService.sendMessage(from,
                    `🤔 Opção não reconhecida.\n\n` +
                    `*1* - Agendar\n` +
                    `*3* - Ver combos\n` +
                    `*menu* - Voltar`
                );
        }
    }

    async processarEscolhaCombo(from, mensagem, conversa) {
        const webUrl = config.getWebUrl();
        
        switch (mensagem) {
            case '1':
                await whatsappService.sendMessage(from,
                    `📅 *Agendar Combo*\n\n` +
                    `Excelente escolha! Acesse:\n\n` +
                    `🔗 ${webUrl}\n\n` +
                    `Selecione o combo desejado! ✨`
                );
                this.conversasAtivas[from].estado = this.ESTADOS.AGUARDANDO_CONTATO;
                break;
                
            case '2':
                await this.mostrarServicos(from, conversa);
                break;
                
            case 'menu':
            case 'Menu':
            case 'MENU':
                await this.mostrarMenuInicial(from, conversa.nome);
                break;
                
            default:
                await whatsappService.sendMessage(from,
                    `🤔 Opção não reconhecida.\n\n` +
                    `*1* - Agendar combo\n` +
                    `*2* - Ver serviços\n` +
                    `*menu* - Voltar`
                );
        }
    }

    async processarAguardandoContato(from, mensagem, conversa) {
        const mensagemLower = mensagem.toLowerCase();
        
        if (mensagemLower === 'menu') {
            await this.mostrarMenuInicial(from, conversa.nome);
        } else if (['1', '2', '3', '4'].includes(mensagem)) {
            await this.processarMenuInicial(from, mensagem, conversa);
        } else {
            await whatsappService.sendMessage(from,
                `Oi ${conversa.nome}! 👋\n\n` +
                `Digite *menu* ou escolha:\n\n` +
                `*1* - 📅 Agendar\n` +
                `*2* - ✂️ Serviços\n` +
                `*3* - 🎁 Combos\n` +
                `*4* - 📞 Falar com a Pri`
            );
        }
    }

    async processarMensagem(msg) {
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
            const conversa = this.conversasAtivas[msg.from];
            const contact = await msg.getContact();
            const firstName = contact.pushname ? contact.pushname.split(' ')[0] : 'Cliente';
            
            logger.user(firstName, 'Mensagem recebida', { texto: mensagem });
            
            // Se não há conversa ativa, iniciar nova
            if (!conversa) {
                await this.mostrarMenuInicial(msg.from, firstName);
                return;
            }
            
            // Processar baseado no estado atual
            switch (conversa.estado) {
                case this.ESTADOS.MENU_INICIAL:
                    await this.processarMenuInicial(msg.from, mensagem, conversa);
                    break;
                    
                case this.ESTADOS.ESCOLHENDO_SERVICO:
                    await this.processarEscolhaServico(msg.from, mensagem, conversa);
                    break;
                    
                case this.ESTADOS.ESCOLHENDO_COMBO:
                    await this.processarEscolhaCombo(msg.from, mensagem, conversa);
                    break;
                    
                case this.ESTADOS.AGUARDANDO_CONTATO:
                    await this.processarAguardandoContato(msg.from, mensagem, conversa);
                    break;
                    
                default:
                    logger.error('Estado desconhecido', { estado: conversa.estado });
                    this.resetarConversa(msg.from);
                    await this.mostrarMenuInicial(msg.from, firstName);
            }
            
        } catch (error) {
            logger.error('Erro ao processar mensagem', error);
            
            try {
                await whatsappService.sendMessage(msg.from, 
                    `😔 Desculpe, ocorreu um erro.\n\n` +
                    `Digite *menu* para recomeçar.`
                );
            } catch (sendError) {
                logger.error('Erro ao enviar mensagem de erro', sendError);
            }
        }
    }
}

module.exports = new ChatbotService();
