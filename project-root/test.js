// test.js
const config = require('./src/config/config');
const logger = require('./src/utils/logger');
const dataService = require('./src/services/data.service');

console.log('\n🧪 TESTANDO CONFIGURAÇÕES\n');

// Teste 1: Config
logger.info('Testando configurações...');
console.log('Web URL:', config.getWebUrl());
console.log('Port:', config.getPort());
console.log('Paths:', config.getPaths());

// Teste 2: Logger
logger.success('Logger funcionando!');
logger.warning('Este é um aviso de teste');
logger.error('Este é um erro de teste');
logger.whatsapp('QR_GENERATED', { timestamp: new Date() });
logger.user('João', 'Acessou o menu');

// Teste 3: Data Service
logger.info('Testando Data Service...');
const horarios = dataService.getHorariosDisponiveis();
console.log('Horários disponíveis:', horarios.length);

logger.success('✅ Todos os testes passaram!');
