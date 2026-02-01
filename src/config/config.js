// src/config/config.js
const fs = require('fs');
const path = require('path');

class Config {
    constructor() {
        this.loadConfig();
    }

    loadConfig() {
        // Configurações padrão
        this.defaults = {
            port: process.env.PORT || 8000,
            webUrl: process.env.WEB_URL || 'http://localhost:8000',
            whatsapp: {
                sessionPath: path.join(__dirname, '..', '..', '.wwebjs_auth'),
                qrPath: path.join(__dirname, '..', '..', 'data', 'whatsapp_qr.png')
            },
            paths: {
                data: path.join(__dirname, '..', '..', 'data'),
                logs: path.join(__dirname, '..', '..', 'logs'),
                images: path.join(__dirname, '..', 'public', 'images')
            }
        };

        // Tentar carregar rotas.json se existir
        try {
            const rotasPath = path.join(this.defaults.paths.data, 'rotas.json');
            if (fs.existsSync(rotasPath)) {
                const rotas = JSON.parse(fs.readFileSync(rotasPath, 'utf8'));
                this.defaults.webUrl = rotas.ngrok_url || rotas.local_url || this.defaults.webUrl;
                console.log('✅ Configurações carregadas de rotas.json');
            }
        } catch (error) {
            console.log('⚠️ Erro ao carregar rotas.json, usando configurações padrão');
        }

        // Garantir que as pastas existam
        this.ensureDirectories();
    }

    ensureDirectories() {
        Object.values(this.defaults.paths).forEach(dirPath => {
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                console.log(`📁 Pasta criada: ${dirPath}`);
            }
        });
    }

    get(key) {
        const keys = key.split('.');
        let value = this.defaults;
        
        for (const k of keys) {
            value = value[k];
            if (value === undefined) return null;
        }
        
        return value;
    }

    getWebUrl() {
        return this.defaults.webUrl;
    }

    getPort() {
        return this.defaults.port;
    }

    getPaths() {
        return this.defaults.paths;
    }
}

module.exports = new Config();
