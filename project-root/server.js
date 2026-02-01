// server.js
const express = require('express');
const path = require('path');
const logger = require('./src/utils/logger');
const config = require('./src/config/config');
const whatsappService = require('./src/services/whatsapp.service');
const chatbotService = require('./src/services/chatbot.service');
const dataService = require('./src/services/data.service');

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'src', 'public')));

// ==================== ROTAS ====================

// Rota de health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        whatsapp: whatsappService.isConnected(),
        timestamp: new Date().toISOString()
    });
});

// Rota para obter QR Code
app.get('/qr', (req, res) => {
    const qrCode = whatsappService.getQRCode();
    
    if (!qrCode) {
        return res.status(404).json({ 
            error: 'QR Code não disponível',
            message: 'WhatsApp já conectado ou aguardando QR'
        });
    }
    
    res.json({ qrCode });
});

// Rota para obter horários disponíveis
app.get('/api/horarios', (req, res) => {
    try {
        const horarios = dataService.getHorariosDisponiveis();
        res.json({ success: true, horarios });
    } catch (error) {
        logger.error('Erro ao buscar horários', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao buscar horários' 
        });
    }
});

// Rota para adicionar horário
app.post('/api/horarios', (req, res) => {
    try {
        const { data, hora, disponivel } = req.body;
        
        if (!data || !hora) {
            return res.status(400).json({ 
                success: false, 
                error: 'Data e hora são obrigatórios' 
            });
        }
        
        dataService.addHorario({ data, hora, disponivel: disponivel !== false });
        
        logger.info('Horário adicionado', { data, hora });
        res.json({ success: true, message: 'Horário adicionado' });
    } catch (error) {
        logger.error('Erro ao adicionar horário', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao adicionar horário' 
        });
    }
});

// Rota para remover horário
app.delete('/api/horarios', (req, res) => {
    try {
        const { data, hora } = req.body;
        
        if (!data || !hora) {
            return res.status(400).json({ 
                success: false, 
                error: 'Data e hora são obrigatórios' 
            });
        }
        
        dataService.removeHorario(data, hora);
        
        logger.info('Horário removido', { data, hora });
        res.json({ success: true, message: 'Horário removido' });
    } catch (error) {
        logger.error('Erro ao remover horário', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao remover horário' 
        });
    }
});

// Rota para obter confirmações
app.get('/api/confirmacoes', (req, res) => {
    try {
        const confirmadas = dataService.getConfirmadas();
        const enviadas = dataService.getConfirmacoesEnviadas();
        
        res.json({ 
            success: true, 
            confirmadas, 
            enviadas 
        });
    } catch (error) {
        logger.error('Erro ao buscar confirmações', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao buscar confirmações' 
        });
    }
});

// Rota para adicionar confirmação
app.post('/api/confirmacoes', (req, res) => {
    try {
        const { nome, telefone, data, hora, servico } = req.body;
        
        if (!nome || !telefone || !data || !hora) {
            return res.status(400).json({ 
                success: false, 
                error: 'Campos obrigatórios faltando' 
            });
        }
        
        dataService.addConfirmada({ nome, telefone, data, hora, servico });
        
        logger.info('Confirmação registrada', { nome, data, hora });
        res.json({ success: true, message: 'Confirmação registrada' });
    } catch (error) {
        logger.error('Erro ao adicionar confirmação', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao adicionar confirmação' 
        });
    }
});

// Servir arquivos HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'public', 'index2.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'public', 'admin.html'));
});

// Rota 404
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Rota não encontrada',
        path: req.path 
    });
});

// ==================== INICIALIZAÇÃO ====================

function iniciarServidor() {
    const PORT = config.getPort();
    
    app.listen(PORT, () => {
        logger.success(`Servidor rodando na porta ${PORT}`);
        logger.info(`URL: http://localhost:${PORT}`);
        logger.info(`Admin: http://localhost:${PORT}/admin`);
    });
}

function iniciarWhatsApp() {
    logger.info('Iniciando WhatsApp Service...');
    whatsappService.initialize();
    
    // Registrar handler de mensagens
    const client = whatsappService.getClient();
    client.on('message', async (msg) => {
        await chatbotService.processarMensagem(msg);
    });
    
    logger.success('Handler de mensagens registrado');
}

// ==================== START ====================

async function start() {
    try {
        logger.info('='.repeat(50));
        logger.info('🚀 Iniciando Prisystem - Salão da Pri');
        logger.info('='.repeat(50));
        
        // 1. Iniciar servidor Express
        iniciarServidor();
        
        // 2. Iniciar WhatsApp
        iniciarWhatsApp();
        
        logger.success('✅ Sistema iniciado com sucesso!');
        logger.info('Aguardando conexão do WhatsApp...');
        
    } catch (error) {
        logger.error('Erro fatal ao iniciar sistema', error);
        process.exit(1);
    }
}

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { reason, promise });
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    logger.info('Recebido SIGINT, encerrando...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('Recebido SIGTERM, encerrando...');
    process.exit(0);
});

// Iniciar aplicação
start();
