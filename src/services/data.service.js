// src/services/data.service.js
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class DataService {
    constructor() {
        this.dataDir = path.join(__dirname, '..', '..', 'data');
        this.files = {
            confirmadas: path.join(this.dataDir, 'confirmadas.json'),
            confirmacoesEnviadas: path.join(this.dataDir, 'confirmacoes_enviadas.json'),
            horariosDisponiveis: path.join(this.dataDir, 'horarios_disponiveis.json'),
            rotas: path.join(this.dataDir, 'rotas.json')
        };
        this.initializeFiles();
    }

    initializeFiles() {
        // Garantir que a pasta data existe
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
            logger.info('Pasta data criada');
        }

        // Inicializar arquivos JSON se não existirem
        Object.entries(this.files).forEach(([name, filePath]) => {
            if (!fs.existsSync(filePath)) {
                const defaultData = name === 'rotas' 
                    ? { local_url: 'http://localhost:8000', ngrok_url: '' }
                    : [];
                
                this.writeFile(filePath, defaultData);
                logger.info(`Arquivo ${name}.json criado`);
            }
        });
    }

    readFile(filePath) {
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            logger.error(`Erro ao ler arquivo ${filePath}`, error);
            return null;
        }
    }

    writeFile(filePath, data) {
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (error) {
            logger.error(`Erro ao escrever arquivo ${filePath}`, error);
            return false;
        }
    }

    // Métodos para confirmadas
    getConfirmadas() {
        return this.readFile(this.files.confirmadas) || [];
    }

    addConfirmada(confirmacao) {
        const confirmadas = this.getConfirmadas();
        confirmadas.push({
            ...confirmacao,
            timestamp: new Date().toISOString()
        });
        this.writeFile(this.files.confirmadas, confirmadas);
        logger.info('Confirmação adicionada', { nome: confirmacao.nome });
    }

    // Métodos para confirmações enviadas
    getConfirmacoesEnviadas() {
        return this.readFile(this.files.confirmacoesEnviadas) || [];
    }

    addConfirmacaoEnviada(confirmacao) {
        const enviadas = this.getConfirmacoesEnviadas();
        enviadas.push({
            ...confirmacao,
            timestamp: new Date().toISOString()
        });
        this.writeFile(this.files.confirmacoesEnviadas, enviadas);
        logger.info('Confirmação enviada registrada', { telefone: confirmacao.telefone });
    }

    // Métodos para horários disponíveis
    getHorariosDisponiveis() {
        return this.readFile(this.files.horariosDisponiveis) || [];
    }

    setHorariosDisponiveis(horarios) {
        this.writeFile(this.files.horariosDisponiveis, horarios);
        logger.info(`${horarios.length} horários disponíveis atualizados`);
    }

    addHorario(horario) {
        const horarios = this.getHorariosDisponiveis();
        horarios.push(horario);
        this.setHorariosDisponiveis(horarios);
    }

    removeHorario(data, hora) {
        const horarios = this.getHorariosDisponiveis();
        const filtered = horarios.filter(h => !(h.data === data && h.hora === hora));
        this.setHorariosDisponiveis(filtered);
        logger.info('Horário removido', { data, hora });
    }

    // Métodos para rotas
    getRotas() {
        return this.readFile(this.files.rotas);
    }

    updateRotas(rotas) {
        this.writeFile(this.files.rotas, rotas);
        logger.info('Rotas atualizadas');
    }
}

module.exports = new DataService();
