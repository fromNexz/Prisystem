// src/utils/logger.js
const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logsDir = path.join(__dirname, '..', '..', 'logs');
        this.ensureLogDir();
    }

    ensureLogDir() {
        if (!fs.existsSync(this.logsDir)) {
            fs.mkdirSync(this.logsDir, { recursive: true });
        }
    }

    getTimestamp() {
        const now = new Date();
        return now.toISOString().replace('T', ' ').substring(0, 19);
    }

    getLogFileName() {
        const date = new Date().toISOString().split('T')[0];
        return path.join(this.logsDir, `bot-${date}.log`);
    }

    formatMessage(level, message, data = null) {
        const timestamp = this.getTimestamp();
        let logMessage = `[${timestamp}] [${level}] ${message}`;
        
        if (data) {
            logMessage += ` | ${JSON.stringify(data)}`;
        }
        
        return logMessage;
    }

    writeToFile(message) {
        const logFile = this.getLogFileName();
        fs.appendFileSync(logFile, message + '\n', 'utf8');
    }

    info(message, data = null) {
        const formatted = this.formatMessage('INFO', message, data);
        console.log('ℹ️', formatted);
        this.writeToFile(formatted);
    }

    success(message, data = null) {
        const formatted = this.formatMessage('SUCCESS', message, data);
        console.log('✅', formatted);
        this.writeToFile(formatted);
    }

    warning(message, data = null) {
        const formatted = this.formatMessage('WARNING', message, data);
        console.log('⚠️', formatted);
        this.writeToFile(formatted);
    }

    error(message, error = null) {
        const errorData = error ? {
            message: error.message,
            stack: error.stack
        } : null;
        
        const formatted = this.formatMessage('ERROR', message, errorData);
        console.error('❌', formatted);
        this.writeToFile(formatted);
    }

    debug(message, data = null) {
        if (process.env.NODE_ENV === 'development') {
            const formatted = this.formatMessage('DEBUG', message, data);
            console.log('🔍', formatted);
            this.writeToFile(formatted);
        }
    }

    whatsapp(event, data = null) {
        const formatted = this.formatMessage('WHATSAPP', event, data);
        console.log('📱', formatted);
        this.writeToFile(formatted);
    }

    user(userName, action, data = null) {
        const message = `${userName} → ${action}`;
        const formatted = this.formatMessage('USER', message, data);
        console.log('👤', formatted);
        this.writeToFile(formatted);
    }
}

module.exports = new Logger();
