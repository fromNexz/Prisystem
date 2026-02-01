// src/services/whatsapp.service.js
const { Client, MessageMedia } = require('whatsapp-web.js');
const qr = require('qrcode');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const config = require('../config/config');

class WhatsAppService {
    constructor() {
        this.client = null;
        this.isReady = false;
        this.qrCode = null;
    }

    initialize() {
        logger.info('Inicializando WhatsApp Client...');
        
        this.client = new Client({
            puppeteer: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });

        this.setupEventListeners();
        
        this.client.initialize();
    }

    setupEventListeners() {
        this.client.on('qr', async (qrString) => {
            logger.whatsapp('QR_GENERATED');
            this.qrCode = qrString;
            
            try {
                const qrPath = config.get('whatsapp.qrPath');
                await qr.toFile(qrPath, qrString, {
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    },
                    width: 300
                });
                
                logger.success(`QR Code salvo: ${qrPath}`);
            } catch (error) {
                logger.error('Erro ao gerar QR Code', error);
            }
        });

        this.client.on('ready', () => {
            this.isReady = true;
            logger.whatsapp('CONNECTED');
            logger.success('WhatsApp conectado - Bot ativo!');
        });

        this.client.on('authenticated', () => {
            logger.whatsapp('AUTH_SUCCESS');
        });

        this.client.on('auth_failure', (msg) => {
            logger.error('Falha na autenticação do WhatsApp', msg);
        });

        this.client.on('disconnected', (reason) => {
            this.isReady = false;
            logger.whatsapp('DISCONNECTED', { reason });
        });
    }

    async sendMessage(to, message) {
        try {
            if (!this.isReady) {
                throw new Error('WhatsApp não está conectado');
            }
            
            await this.client.sendMessage(to, message);
            logger.debug('Mensagem enviada', { to, preview: message.substring(0, 50) });
            return true;
        } catch (error) {
            logger.error('Erro ao enviar mensagem', error);
            return false;
        }
    }

    async sendMediaMessage(to, mediaPath, caption = '') {
        try {
            if (!this.isReady) {
                throw new Error('WhatsApp não está conectado');
            }

            if (!fs.existsSync(mediaPath)) {
                throw new Error(`Arquivo não encontrado: ${mediaPath}`);
            }
            
            const media = MessageMedia.fromFilePath(mediaPath);
            await this.client.sendMessage(to, media, { caption });
            logger.debug('Mídia enviada', { to, file: path.basename(mediaPath) });
            return true;
        } catch (error) {
            logger.error('Erro ao enviar mídia', error);
            return false;
        }
    }

    async setTyping(chatId, duration = 3000) {
        try {
            const chat = await this.client.getChatById(chatId);
            await chat.sendStateTyping();
            
            if (duration > 0) {
                await new Promise(resolve => setTimeout(resolve, duration));
            }
        } catch (error) {
            logger.error('Erro ao definir typing', error);
        }
    }

    getClient() {
        return this.client;
    }

    isConnected() {
        return this.isReady;
    }

    getQRCode() {
        return this.qrCode;
    }
}

module.exports = new WhatsAppService();
