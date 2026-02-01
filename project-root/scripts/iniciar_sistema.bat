@echo off
echo ========================================
echo  Pri Malzoni - Iniciando Sistema
echo ========================================
echo.

REM Muda para o diretório correto
cd /d "%~dp0"

REM Verifica se node_modules existe
if not exist "node_modules\" (
    echo [ERRO] Pasta node_modules nao encontrada!
    echo.
    echo Execute primeiro: npm install
    echo.
    pause
    exit /b 1
)

REM Inicia o painel Python
echo [*] Iniciando Painel de Controle...
python painel.py

REM Se o Python fechar, aguarda
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERRO] Falha ao iniciar o painel!
    pause
)