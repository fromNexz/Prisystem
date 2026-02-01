// server.js - BYPASS NGROK GARANTIDO
const express = require('express');
const path = require('path');

const app = express();
const PORT = 8000;

// ==================== MIDDLEWARE CRITICAL - SEMPRE PRIMEIRO ====================
app.use((req, res, next) => {
    console.log(`📨 Requisição: ${req.method} ${req.path}`);
    
    // FORÇA headers do Ngrok
    res.setHeader('ngrok-skip-browser-warning', '69420');
    res.setHeader('User-Agent', 'CustomAgent');
    
    console.log('✅ Headers Ngrok definidos');
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// ==================== ROTAS ====================

app.get('/', (req, res) => {
    console.log('🏠 Servindo index2.html');
    res.sendFile(path.join(__dirname, 'src', 'public', 'views', 'index2.html'));
});

app.get('/health', (req, res) => {
    console.log('🔍 Health check acessado');
    const responseData = {
        status: 'ok',
        server: 'Node.js Express',
        timestamp: new Date().toISOString(),
        ngrok_bypass: 'ACTIVE_69420',
        port: PORT
    };
    console.log('📤 Enviando:', responseData);
    res.json(responseData);
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.use((req, res) => {
    res.status(404).json({ 
        error: 'Rota não encontrada',
        path: req.path,
        server: 'Node.js'
    });
});

// ==================== START ====================

const server = app.listen(PORT, () => {
    console.log('\n' + '='.repeat(70));
    console.log('🚀 SERVIDOR NODE.JS - PRI MALZONI ESTÉTICA');
    console.log('='.repeat(70));
    console.log(`✅ Porta: ${PORT}`);
    console.log(`🌐 Local: http://localhost:${PORT}`);
    console.log(`🔓 Ngrok Bypass: ATIVO (69420)`);
    console.log(`📝 Logs ativos para debug`);
    console.log('='.repeat(70) + '\n');
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ ERRO: Porta ${PORT} já está em uso!`);
        console.error('Execute: netstat -ano | findstr :8000\n');
        process.exit(1);
    } else {
        console.error('❌ Erro:', err);
        process.exit(1);
    }
});

process.on('SIGINT', () => {
    console.log('\n👋 Encerrando servidor Node.js...');
    server.close(() => process.exit(0));
});
