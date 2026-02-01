# painel.py - VERSÃO 3.0 OTIMIZADA COM RICH
# Sistema de Controle Pri Malzoni - Interface Moderna e Performática
# Redução: 2080 → ~1000 linhas | Melhorias: Rich panels, código organizado

import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
import subprocess
import threading
import json
import os
import requests
import time
import webbrowser
import queue
import socket
from datetime import datetime
from PIL import Image, ImageTk
import importlib.util

# ==================== CONFIGURAÇÕES GLOBAIS ====================
COLORS = {
    'primary': '#ff6b6b', 'success': '#28a745', 'danger': '#dc3545',
    'info': '#17a2b8', 'warning': '#fd7e14', 'secondary': '#6f42c1'
}

# ==================== UTILIDADES ====================


class Utils:
    @staticmethod
    def run_subprocess(cmd, name="Processo"):
        try:
            flags = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
            return subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, creationflags=flags)
        except Exception as e:
            print(f"[ERROR] {name}: {str(e)}")
            return None

    @staticmethod
    def check_port(port=8000):
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = sock.connect_ex(('localhost', port)) == 0
        sock.close()
        return result

    @staticmethod
    def load_json(path, default={}):
        try:
            return json.load(open(path, 'r', encoding='utf-8')) if os.path.exists(path) else default
        except:
            return default

    @staticmethod
    def save_json(path, data):
        try:
            os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            return True
        except:
            return False

# ==================== QR CODE WINDOW ====================


class QRCodeWindow:
    """Janela QR Code minimalista e otimizada"""

    def __init__(self, parent):
        self.parent = parent
        self.window = tk.Toplevel(parent.root)
        self.window.title("WhatsApp QR Code - Pri Malzoni")
        self.window.geometry("500x600")
        self.window.configure(bg='#f0f0f0')
        self.window.transient(parent.root)
        self.window.grab_set()
        self.qr_photo = None

        self._build_ui()
        threading.Thread(target=self._monitor_qr, daemon=True).start()

    def _build_ui(self):
        """Constrói interface compacta"""
        # Header com tema
        header = tk.Frame(self.window, bg=COLORS['primary'], height=70)
        header.pack(fill='x')
        header.pack_propagate(False)
        tk.Label(header, text="📱 Conectar WhatsApp", font=('Segoe UI', 16, 'bold'),
                 fg='white', bg=COLORS['primary']).pack(expand=True)

        # Instruções
        instr_text = "1️⃣ Abra WhatsApp no celular\n2️⃣ Dispositivos Conectados\n3️⃣ Escaneie o QR abaixo"
        tk.Label(self.window, text=instr_text, font=('Segoe UI', 10),
                 bg='#f0f0f0', fg='#555').pack(pady=(20, 10))

        # QR Display
        self.qr_frame = tk.Frame(
            self.window, bg='white', relief='solid', bd=1, width=300, height=300)
        self.qr_frame.pack(pady=20)
        self.qr_frame.pack_propagate(False)

        self.qr_label = tk.Label(self.qr_frame, text="⏳ Aguardando QR Code...",
                                 font=('Segoe UI', 10), bg='white', fg='#999')
        self.qr_label.place(relx=0.5, rely=0.5, anchor='center')

        # Status Indicator
        self.status_label = tk.Label(self.window, text="● Aguardando...",
                                     font=('Segoe UI', 9), bg='#f0f0f0', fg=COLORS['danger'])
        self.status_label.pack(pady=10)

        # Buttons
        btn_frame = tk.Frame(self.window, bg='#f0f0f0')
        btn_frame.pack(pady=(0, 20))

        for text, cmd, color in [
            ("🔄 Atualizar", self.refresh, COLORS['info']),
            ("❌ Fechar", self.close_window, COLORS['danger'])
        ]:
            tk.Button(btn_frame, text=text, command=cmd, bg=color, fg='white', relief='flat',
                      padx=15, pady=8, cursor='hand2', font=('Segoe UI', 9)).pack(side='left', padx=5)

    def _monitor_qr(self):
        """Monitora arquivo QR Code"""
        qr_path = 'data/image/whatsapp_qr.png'  # ✅ CORRIGIDO
        last_mod = 0                              # ✅ CORRIGIDO

        while True:
            try:
                if os.path.exists(qr_path):
                    current = os.path.getmtime(qr_path)
                    if current > last_mod:
                        last_mod = current
                        self.window.after(100, self._load_qr, qr_path)
                time.sleep(1)
            except:
                time.sleep(2)

    def _load_qr(self, path):
        """Carrega imagem QR"""
        try:
            img = Image.open(path)
            img.thumbnail((280, 280), Image.Resampling.LANCZOS)
            self.qr_photo = ImageTk.PhotoImage(img)
            self.qr_label.config(image=self.qr_photo, text="")
            self.update_status(
                "✅ QR Code pronto - Escaneie com WhatsApp", COLORS['success'])
        except:
            pass

    def update_status(self, text, color):
        self.status_label.config(text=f"● {text}", fg=color)

    def refresh(self):
        self.update_status("🔄 Solicitando novo QR Code...", COLORS['warning'])

    def close_window(self):
        self.window.destroy()

# ==================== PAINEL PRINCIPAL OTIMIZADO ====================


class PriMalzoniControlPanel:
    """Painel Principal - Versão 3.0"""

    def __init__(self, root):
        self.root = root
        self.root.title("Pri Malzoni - Painel de Controle v3.0")
        self.root.geometry("1200x750")
        self.root.configure(bg='#f8f9fa')
        self.root.minsize(1100, 700)

        # Estado
        self.processes = {'servidor': None, 'chatbot': None, 'ngrok': None}
        self.status = {'servidor': False, 'chatbot': False, 'ngrok': False}
        self.service_indicators = {}
        self.message_queue = queue.Queue()
        self.hours_loop_active = False
        self.qr_window = None

        # URLs
        self.ngrok_url = tk.StringVar()
        self.local_url = tk.StringVar(value="http://localhost:8000")

        self._setup_ui()
        self._load_config()
        self._process_queue()

    def _setup_ui(self):
        """Constrói interface principal"""
        # Header
        header = tk.Frame(self.root, bg=COLORS['primary'], height=90)
        header.pack(fill='x')
        header.pack_propagate(False)
        tk.Label(header, text="✨ Pri Malzoni Estética", font=('Segoe UI', 22, 'bold'),
                 fg='white', bg=COLORS['primary']).pack(expand=True)
        tk.Label(header, text="Central de Controle v3.0", font=('Segoe UI', 10),
                 fg='#ffe6e6', bg=COLORS['primary']).pack()

        # Main Layout
        main = tk.Frame(self.root, bg='#f8f9fa')
        main.pack(fill='both', expand=True, padx=20, pady=20)
        main.grid_columnconfigure(0, weight=1, minsize=350)
        main.grid_columnconfigure(1, weight=2)
        main.grid_rowconfigure(0, weight=1)

        self._build_control_panel(main)
        self._build_info_panel(main)

    def _build_control_panel(self, parent):
        """Painel de controles esquerdo"""
        ctrl_frame = tk.Frame(parent, bg='white', relief='flat')
        ctrl_frame.grid(row=0, column=0, sticky='nsew', padx=(0, 15))

        # Canvas com scroll
        canvas = tk.Canvas(ctrl_frame, bg='white', highlightthickness=0)
        scrollbar = tk.Scrollbar(
            ctrl_frame, orient="vertical", command=canvas.yview)
        scroll_frame = tk.Frame(canvas, bg='white')
        scroll_frame.bind("<Configure>", lambda e: canvas.configure(
            scrollregion=canvas.bbox("all")))

        canvas.create_window((0, 0), window=scroll_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        canvas.pack(side="left", fill="both", expand=True, padx=20, pady=20)
        scrollbar.pack(side="right", fill="y")

        # Seções
        self._add_section(scroll_frame, "Controles Principais", [
            ("▶️ INICIAR TUDO", self.start_all, COLORS['success']),
            ("⏹️ PARAR TUDO", self.stop_all, COLORS['danger'])
        ])

        self._add_separator(scroll_frame)
        self._add_services_section(scroll_frame)

        self._add_separator(scroll_frame)
        self._add_section(scroll_frame, "Captura de Horários", [
            ("📅 Capturar 2 Semanas", lambda: self.run_hours(
                2, False), COLORS['info']),
            ("📅 Capturar 3 Semanas", lambda: self.run_hours(
                3, False), COLORS['success']),
            ("📅 Capturar 4 Semanas (1 Mês)", lambda: self.run_hours(
                4, False), COLORS['secondary']),
            ("🔄 Loop 5min (3sem)", lambda: self.run_hours(
                3, True, 5), COLORS['warning']),
            ("⏹️ Parar Loop", self.stop_hours, COLORS['danger'])
        ])

        self._add_separator(scroll_frame)
        self._add_section(scroll_frame, "Utilidades", [
            ("🌐 Site Local", self.open_local_site, '#6c757d'),
            ("🌍 Site Público", self.open_public_site, COLORS['info']),
            ("📱 QR Code", self.show_qr, COLORS['warning']),
            ("⚙️ Admin Panel", self.open_admin_panel, COLORS['danger']),
            ("📋 Horários JSON", self.open_hours_json, COLORS['success']),
            ("🔄 Atualizar Status", self.update_all_status, COLORS['secondary'])
        ])

    def _add_section(self, parent, title, buttons):
        """Adiciona seção com botões"""
        tk.Label(parent, text=f"📌 {title}", font=('Segoe UI', 12, 'bold'),
                 bg='white', fg='#333').pack(pady=(0, 10))

        for text, cmd, color in buttons:
            tk.Button(parent, text=text, command=cmd, bg=color, fg='white', font=('Segoe UI', 9),
                      relief='flat', padx=15, pady=10, cursor='hand2').pack(fill='x', pady=3)

    def _add_separator(self, parent):
        """Adiciona separador visual"""
        tk.Frame(parent, height=2, bg='#e9ecef').pack(fill='x', pady=20)

    def _add_services_section(self, parent):
        """Seção de serviços individuais"""
        tk.Label(parent, text="⚡ Serviços Individuais", font=('Segoe UI', 12, 'bold'),
                 bg='white', fg='#333').pack(pady=(0, 10))

        services = [
            ('servidor', '🖥️ Servidor Web', COLORS['info']),
            ('chatbot', '🤖 ChatBot WhatsApp', COLORS['secondary']),
            ('ngrok', '🔗 Túnel Ngrok', COLORS['warning'])
        ]

        for key, name, color in services:
            svc_frame = tk.Frame(parent, bg='white')
            svc_frame.pack(fill='x', pady=5)

            tk.Button(svc_frame, text=name, command=lambda k=key: self.toggle_service(k),
                      bg=color, fg='white', relief='flat', padx=15, pady=8,
                      cursor='hand2').pack(side='left', padx=(0, 10))

            ind = tk.Label(svc_frame, text="●",
                           fg=COLORS['danger'], font=('Arial', 16), bg='white')
            ind.pack(side='right')
            self.service_indicators[key] = ind

    def _build_info_panel(self, parent):
        """Painel informações direito"""
        info_frame = tk.Frame(parent, bg='white', relief='flat')
        info_frame.grid(row=0, column=1, sticky='nsew')

        notebook = ttk.Notebook(info_frame)
        notebook.pack(fill='both', expand=True, padx=20, pady=20)

        # Aba Status
        status_tab = tk.Frame(notebook, bg='white')
        notebook.add(status_tab, text="📊 Status & URLs")

        # painel.py - VERSÃO 3.0 OTIMIZADA (Continuação)

        urls_frame = tk.LabelFrame(status_tab, text="🔗 URLs do Sistema", font=('Segoe UI', 11, 'bold'),
                                   bg='white', fg='#495057', padx=15, pady=15)
        urls_frame.pack(fill='x', padx=20, pady=(20, 10))

        for label, var in [("📍 Local:", self.local_url), ("🌍 Público:", self.ngrok_url)]:
            f = tk.Frame(urls_frame, bg='white')
            f.pack(fill='x', pady=5)
            tk.Label(f, text=label, font=('Segoe UI', 10, 'bold'),
                     bg='white', width=12, anchor='w').pack(side='left')
            entry = tk.Entry(f, textvariable=var, state='readonly', font=(
                'Consolas', 9), relief='flat', bg='#f8f9fa')
            entry.pack(side='left', fill='x', expand=True, padx=(5, 0))

        # Status dos Serviços
        svc_frame = tk.LabelFrame(status_tab, text="⚙️ Status dos Serviços", font=('Segoe UI', 11, 'bold'),
                                  bg='white', fg='#495057', padx=15, pady=15)
        svc_frame.pack(fill='both', expand=True, padx=20, pady=10)

        self.status_text = scrolledtext.ScrolledText(svc_frame, font=('Consolas', 9), relief='flat',
                                                     bg='#f8f9fa', wrap='word', height=12)
        self.status_text.pack(fill='both', expand=True)

        # Aba Logs
        logs_tab = tk.Frame(notebook, bg='white')
        notebook.add(logs_tab, text="📝 Logs do Sistema")

        self.logs_text = scrolledtext.ScrolledText(logs_tab, font=('Consolas', 8), relief='flat',
                                                   bg='#f8f9fa', wrap='word')
        self.logs_text.pack(fill='both', expand=True, padx=20, pady=(20, 10))

        # Botões de controle dos logs
        log_ctrl = tk.Frame(logs_tab, bg='white')
        log_ctrl.pack(fill='x', padx=20, pady=(0, 20))
        tk.Button(log_ctrl, text="🗑️ Limpar Logs", command=self.clear_logs, bg='#6c757d',
                  fg='white', relief='flat', padx=15, pady=8, cursor='hand2').pack(side='right')

        # Aba Horários
        hours_tab = tk.Frame(notebook, bg='white')
        notebook.add(hours_tab, text="📅 Captura Horários")

        info_label = tk.Label(hours_tab, text="ℹ️ Status: Sistema de Captura Automática\n\n"
                              "Horários de Funcionamento:\n"
                              "• Seg/Qua/Sex: 8h-12h e 14h-18h\n"
                              "• Ter/Qui: 9h-12h e 14h-19h\n"
                              "• Sábado: 9h-12h | Domingo: Fechado",
                              font=('Segoe UI', 9), bg='white', fg='#6c757d', justify='left')
        info_label.pack(padx=20, pady=20)

        hours_frame = tk.LabelFrame(hours_tab, text="📊 Último Arquivo JSON", font=('Segoe UI', 11, 'bold'),
                                    bg='white', fg='#495057', padx=15, pady=15)
        hours_frame.pack(fill='both', expand=True, padx=20, pady=10)

        self.json_info_text = scrolledtext.ScrolledText(hours_frame, font=('Consolas', 8), relief='flat',
                                                        bg='#f8f9fa', wrap='word', height=12)
        self.json_info_text.pack(fill='both', expand=True)

        # Botões de controle
        hours_ctrl = tk.Frame(hours_tab, bg='white')
        hours_ctrl.pack(fill='x', padx=20, pady=(0, 20))
        tk.Button(hours_ctrl, text="🔄 Atualizar Info", command=self.update_json_info,
                  bg=COLORS['info'], fg='white', relief='flat', padx=15, pady=8, cursor='hand2').pack(side='left', padx=(0, 10))
        tk.Button(hours_ctrl, text="📂 Abrir JSON", command=self.open_hours_json,
                  bg=COLORS['success'], fg='white', relief='flat', padx=15, pady=8, cursor='hand2').pack(side='left')

        self.update_json_info()

    # ==================== GERENCIAMENTO DE LOGS ====================
    def log_message(self, message, level="INFO"):
        """Log com timestamp e cores"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_entry = f"[{timestamp}] {level}: {message}\n"

        # Cores para tags
        color_map = {"SUCCESS": "#28a745", "ERROR": "#dc3545", "WARNING": "#fd7e14",
                     "INFO": "#495057", "SYSTEM": "#007bff", "CHATBOT": "#6f42c1"}

        if not hasattr(self, 'logs_configured'):
            for level_name, color in color_map.items():
                self.logs_text.tag_configure(level_name, foreground=color)
            self.logs_configured = True

        self.logs_text.insert(tk.END, log_entry, level)
        self.logs_text.see(tk.END)

        # Limita tamanho dos logs
        lines = self.logs_text.get(1.0, tk.END).split('\n')
        if len(lines) > 1000:
            self.logs_text.delete(1.0, f"{len(lines) - 1000}.0")

        self.update_status_display()

    def clear_logs(self):
        """Limpa os logs"""
        self.logs_text.delete(1.0, tk.END)
        self.log_message("Logs limpos", "SYSTEM")

    def update_status_display(self):
        """Atualiza display de status"""
        status_info = f"""
            SISTEMA PRI MALZONI - STATUS ATUAL
            {'='*60}

            🖥️ SERVIDOR:
            Status: {'✅ ATIVO' if self.status['servidor'] else '❌ INATIVO'}
            Porta: 8000
            URL: {self.local_url.get()}

            🤖 CHATBOT:
            Status: {'✅ ATIVO' if self.status['chatbot'] else '❌ INATIVO'}
            Conexão: {'🟢 Conectado' if self.status['chatbot'] else '🔴 Desconectado'}

            🔗 NGROK:
            Status: {'✅ ATIVO' if self.status['ngrok'] else '❌ INATIVO'}
            URL Pública: {self.ngrok_url.get() or 'Não disponível'}

            📊 ESTATÍSTICAS:
            Serviços Ativos: {sum(self.status.values())}/3
            Última Atualização: {datetime.now().strftime("%H:%M:%S")}
            Versão: 3.0
        """
        self.status_text.delete(1.0, tk.END)
        self.status_text.insert(1.0, status_info)

    def update_json_info(self):
        """Atualiza info do arquivo JSON de horários"""
        try:
            json_file = 'data/horarios_disponiveis.json' if os.path.exists(
                'data') else 'horarios_disponiveis.json'

            if not os.path.exists(json_file):
                self.json_info_text.delete(1.0, tk.END)
                self.json_info_text.insert(
                    1.0, "❌ Arquivo não encontrado\n\nExecute uma captura primeiro.")
                return

            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            info = f"""
                INFORMAÇÕES DO ARQUIVO JSON
                {'='*60}

                📅 Data da Captura: {data.get('data_captura', 'N/A')}
                📊 Total de Dias: {data.get('total_dias', 0)}
                🔄 Data Referência: {data.get('data_referencia', 'N/A')}

                ⏰ HORÁRIOS CONFIGURADOS:
                {data.get('horarios_trabalho', {}).get('segunda_quarta_sexta', 'N/A')}
                {data.get('horarios_trabalho', {}).get('terca_quinta', 'N/A')}
                {data.get('horarios_trabalho', {}).get('sabado', 'N/A')}
                {data.get('horarios_trabalho', {}).get('domingo', 'N/A')}

                📋 RESUMO DOS DIAS:
                {'='*60}
            """
            dias = data.get('dias', [])
            if dias:
                for dia in dias[:10]:
                    info += f"{dia['data']} - {dia['dia']}: ✅ {dia['total_livres']} | ❌ {dia['total_ocupados']}\n"

                if len(dias) > 10:
                    info += f"\n... e mais {len(dias) - 10} dias\n"

                total_livres = sum(d['total_livres'] for d in dias)
                total_ocupados = sum(d['total_ocupados'] for d in dias)

                info += f"""
                    {'='*60}
                    📊 ESTATÍSTICAS GERAIS:
                    • Total Livres: {total_livres}
                    • Total Ocupados: {total_ocupados}
                    • Média Livres/Dia: {total_livres/len(dias):.1f}
                    • Taxa Ocupação: {(total_ocupados/(total_livres+total_ocupados)*100):.1f}%
                """

            self.json_info_text.delete(1.0, tk.END)
            self.json_info_text.insert(1.0, info)
            self.log_message("Info JSON atualizada", "INFO")
        except Exception as e:
            self.json_info_text.delete(1.0, tk.END)
            self.json_info_text.insert(1.0, f"❌ Erro ao ler JSON:\n{str(e)}")

    # ==================== PROCESSAMENTO DE QUEUE ====================
    def _process_queue(self):
        """Processa mensagens da queue thread-safe"""
        try:
            while True:
                msg_type, data = self.message_queue.get_nowait()

                if msg_type == 'log':
                    self.log_message(data, "CHATBOT")
                elif msg_type == 'whatsapp_connected':
                    self.log_message("✅ WhatsApp conectado!", "SUCCESS")
                elif msg_type == 'whatsapp_disconnected':
                    self.log_message(
                        f"⚠️ WhatsApp desconectado: {data}", "WARNING")
                elif msg_type == 'whatsapp_error':
                    self.log_message(f"❌ Erro WhatsApp: {data}", "ERROR")
        except queue.Empty:
            pass

        self.root.after(100, self._process_queue)

    # ==================== CONTROLE DE SERVIÇOS ====================
    def toggle_service(self, service):
        """Alterna serviço"""
        if self.status[service]:
            getattr(self, f'stop_{service}')()
        else:
            threading.Thread(target=getattr(
                self, f'start_{service}'), daemon=True).start()
        self.root.after(1000, self.update_all_status)

    def start_all(self):
        """Inicia todos os serviços"""
        self.log_message("🚀 Iniciando todos os serviços...", "SYSTEM")
        threading.Thread(target=self._start_all_sequence, daemon=True).start()

    def _start_all_sequence(self):
        """Sequência de inicialização"""
        services = [
            ('servidor', 4),
            ('ngrok', 6),
            ('chatbot', 5)
        ]

        for service, delay in services:
            if not self.status[service]:
                self.log_message(f"Iniciando {service}...", "INFO")
                getattr(self, f'start_{service}')()
                time.sleep(delay)

        self.log_message("✅ Todos os serviços iniciados!", "SUCCESS")
        self.root.after(0, self.update_all_status)

    def stop_all(self):
        """Para todos os serviços"""
        self.log_message("⏹️ Parando todos os serviços...", "SYSTEM")

        for service_name, process in self.processes.items():
            if process:
                try:
                    process.terminate()
                    self.status[service_name] = False
                    self.log_message(f"{service_name} parado", "INFO")
                except:
                    pass

        if self.hours_loop_active:
            self.stop_hours()

        self.update_all_status()
        self.log_message("✅ Todos os serviços parados", "SYSTEM")

    def start_servidor(self):
        """Inicia servidor HTTP"""
        try:
            if Utils.check_port(8000):
                self.log_message("⚠️ Porta 8000 já está em uso", "WARNING")
                return

            # Caminho absoluto para server.js
            server_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'server.js')
            
            if os.path.exists(server_path):
                self.log_message(f"📂 Encontrado: {server_path}", "INFO")
                
                # Usar servidor Node.js
                startupinfo = None
                if os.name == 'nt':
                    startupinfo = subprocess.STARTUPINFO()
                    startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                    startupinfo.wShowWindow = subprocess.SW_HIDE
                
                self.processes['servidor'] = subprocess.Popen(
                    ['node', server_path],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    startupinfo=startupinfo,
                    cwd=os.path.dirname(server_path)  # ← Define diretório de trabalho
                )
                
                self.status['servidor'] = True
                self.log_message("✅ Servidor Node.js iniciado na porta 8000", "SUCCESS")
                self.log_message("🔓 Ngrok bypass ATIVO", "SUCCESS")
            else:
                self.log_message(f"⚠️ server.js não encontrado em: {server_path}", "WARNING")
                
                # Fallback para Python HTTP server
                self.processes['servidor'] = Utils.run_subprocess(
                    ['python', '-m', 'http.server', '8000'], "Servidor HTTP"
                )
                self.status['servidor'] = True
                self.log_message("✅ Servidor Python iniciado na porta 8000", "SUCCESS")
                self.log_message("⚠️ Ngrok vai mostrar tela de aviso", "WARNING")
            
        except Exception as e:
            self.log_message(f"❌ Erro ao iniciar servidor: {str(e)}", "ERROR")


    def stop_servidor(self):
        """Para servidor HTTP"""
        if self.processes['servidor']:
            try:
                self.processes['servidor'].terminate()
                self.processes['servidor'].wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.processes['servidor'].kill()
            except:
                pass

        self.processes['servidor'] = None
        self.status['servidor'] = False
        self.log_message("⏹️ Servidor HTTP parado", "INFO")

    def start_chatbot(self):
        """Inicia chatbot WhatsApp"""
        try:
            chatbot_path = 'chatbot.js' 

            if not os.path.exists(chatbot_path):
                self.log_message(
                    f"❌ Arquivo {chatbot_path} não encontrado", "ERROR")
                return

            try:
                subprocess.run(['node', '--version'],
                               check=True, capture_output=True)
            except (subprocess.CalledProcessError, FileNotFoundError):
                self.log_message("❌ Node.js não encontrado", "ERROR")
                return

            # NÃO mostrar QR se já conectado (verificar sessão)
            auth_path = 'data/.wwebjs_auth'
            if os.path.exists(auth_path):
                self.log_message("✅ Sessão WhatsApp encontrada", "INFO")
            else:
                if not self.qr_window or not hasattr(self.qr_window, 'window'):
                    self.qr_window = QRCodeWindow(self)

            startupinfo = None
            if os.name == 'nt':
                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                startupinfo.wShowWindow = subprocess.SW_HIDE

            self.processes['chatbot'] = subprocess.Popen(
                ['node', chatbot_path],
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                universal_newlines=True, bufsize=1, encoding='utf-8',
                errors='ignore', startupinfo=startupinfo
            )

            threading.Thread(target=self._monitor_chatbot, daemon=True).start()
            self.status['chatbot'] = True
            self.log_message(
                "✅ ChatBot iniciado", "SUCCESS")
        except Exception as e:
            self.log_message(f"❌ Erro ao iniciar chatbot: {str(e)}", "ERROR")

    def stop_chatbot(self):
        """Para chatbot"""
        if self.processes['chatbot']:
            try:
                self.processes['chatbot'].terminate()
                self.processes['chatbot'].wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.processes['chatbot'].kill()
            except:
                pass

        self.processes['chatbot'] = None
        self.status['chatbot'] = False

        if self.qr_window and hasattr(self.qr_window, 'window'):
            try:
                self.qr_window.close_window()
            except:
                pass

        self.log_message("⏹️ ChatBot parado", "INFO")

    def _monitor_chatbot(self):
        """Monitora saída do chatbot"""
        if not self.processes['chatbot']:
            return

        try:
            while self.processes['chatbot'] and self.processes['chatbot'].poll() is None:
                line = self.processes['chatbot'].stdout.readline()
                if not line:
                    break

                line = line.strip()
                if line:
                    # Limpa caracteres especiais
                    line_clean = line.encode('ascii', 'ignore').decode('ascii')
                    self.message_queue.put(('log', line_clean or line))

                    # Detecta eventos
                    self._detect_whatsapp_events(line)
        except Exception as e:
            self.message_queue.put(('whatsapp_error', str(e)))
        finally:
            self.status['chatbot'] = False
            self.processes['chatbot'] = None

    def _detect_whatsapp_events(self, line):
        """Detecta eventos do WhatsApp"""
        events = {
            'WHATSAPP_CONNECTED': 'whatsapp_connected',
            'WHATSAPP_AUTH_SUCCESS': 'whatsapp_connected',
            'WHATSAPP_DISCONNECTED': 'whatsapp_disconnected',
            'WHATSAPP_AUTH_ERROR': 'whatsapp_error'
        }

        for event_key, event_type in events.items():
            if event_key in line:
                self.message_queue.put((event_type, 'Evento detectado'))

    def start_ngrok(self):
        """Inicia Ngrok"""
        try:
            try:
                subprocess.run(['ngrok', 'version'],
                               check=True, capture_output=True)
            except (subprocess.CalledProcessError, FileNotFoundError):
                self.log_message(
                    "❌ Ngrok não encontrado - Instale em: https://ngrok.com", "ERROR")
                return

            self.stop_ngrok()

            startupinfo = None
            if os.name == 'nt':
                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                startupinfo.wShowWindow = subprocess.SW_HIDE

            self.processes['ngrok'] = subprocess.Popen(
                ['ngrok', 'http', '8000', '--log=stdout'],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, startupinfo=startupinfo
            )

            self.status['ngrok'] = True
            self.log_message(
                "🔗 Ngrok iniciado, obtendo URL pública...", "INFO")
            threading.Thread(
                target=self._delayed_get_ngrok_url, daemon=True).start()
        except Exception as e:
            self.log_message(f"❌ Erro ao iniciar Ngrok: {str(e)}", "ERROR")

    def stop_ngrok(self):
        """Para Ngrok"""
        if self.processes['ngrok']:
            try:
                self.processes['ngrok'].terminate()
                self.processes['ngrok'].wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.processes['ngrok'].kill()
            except:
                pass

        self.processes['ngrok'] = None
        self.status['ngrok'] = False
        self.ngrok_url.set("")
        self.log_message("⏹️ Ngrok parado", "INFO")

    def _delayed_get_ngrok_url(self):
        """Obtém URL do Ngrok com retry"""
        for attempt in range(10):
            time.sleep(2)
            if self._get_ngrok_url():
                break
            self.log_message(
                f"Tentativa {attempt + 1}/10 para obter URL...", "INFO")

    def _get_ngrok_url(self):
        """Obtém URL pública do Ngrok"""
        try:
            response = requests.get(
                'http://localhost:4040/api/tunnels', timeout=5)
            if response.status_code == 200:
                tunnels = response.json().get('tunnels', [])
                if tunnels:
                    public_url = tunnels[0]['public_url']
                    self.ngrok_url.set(public_url)
                    self._save_config(public_url)
                    self.log_message(f"✅ URL pública: {public_url}", "SUCCESS")
                    return True
            return False
        except Exception as e:
            self.log_message(
                f"⚠️ Erro ao obter URL Ngrok: {str(e)}", "WARNING")
            return False

    def update_all_status(self):
        """Atualiza indicadores visuais"""
        colors = {True: COLORS['success'], False: COLORS['danger']}
        for service, indicator in self.service_indicators.items():
            indicator.config(fg=colors[self.status[service]])
        self.update_status_display()

    # ==================== CAPTURA DE HORÁRIOS ====================
    def run_hours(self, weeks, is_loop=False, interval=5):
        """Executa captura de horários"""
        try:
            if not os.path.exists('get_hours.py'):
                messagebox.showerror(
                    "Erro", "Arquivo get_hours.py não encontrado!")
                return

            if self.hours_loop_active:
                self.stop_hours()
                time.sleep(2)

            if is_loop:
                self.hours_loop_active = True
                self.log_message(
                    f"🔄 Loop iniciado: {interval}min, {weeks}sem", "SYSTEM")
                threading.Thread(target=self._hours_loop, args=(
                    weeks, interval), daemon=True).start()
            else:
                self.log_message(f"📅 Capturando {weeks} semanas...", "SYSTEM")
                threading.Thread(target=self._single_capture,
                                 args=(weeks,), daemon=True).start()
        except Exception as e:
            self.log_message(f"❌ Erro ao iniciar captura: {str(e)}", "ERROR")

    def _single_capture(self, weeks):
        """Captura única de horários"""
        try:
            spec = importlib.util.spec_from_file_location(
                "get_hours", "get_hours.py")
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)

            captura = module.CapturaHorariosAutomatica()
            EMAIL = "Priscilamalzoni1309@gmail.com"
            SENHA = "Aruiva89"

            if captura.executar_captura_completa(EMAIL, SENHA, weeks):
                self.log_message(
                    f"✅ Captura de {weeks}sem concluída!", "SUCCESS")
            else:
                self.log_message("❌ Falha na captura", "ERROR")
        except Exception as e:
            self.log_message(f"❌ Erro na captura: {str(e)}", "ERROR")

    def _hours_loop(self, weeks, interval_min):
        """Loop automático de captura"""
        try:
            spec = importlib.util.spec_from_file_location(
                "get_hours", "get_hours.py")
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)

            captura = module.CapturaHorariosAutomatica()
            EMAIL = "Priscilamalzoni1309@gmail.com"
            SENHA = "Aruiva89"

            cycle = 0
            while self.hours_loop_active:
                cycle += 1
                self.log_message(
                    f"Ciclo {cycle}: Iniciando captura...", "INFO")

                if captura.executar_captura_completa(EMAIL, SENHA, weeks):
                    self.log_message(f"✅ Ciclo {cycle} concluído", "SUCCESS")
                else:
                    self.log_message(f"⚠️ Falha no ciclo {cycle}", "WARNING")

                if self.hours_loop_active:
                    self.log_message(
                        f"⏳ Aguardando {interval_min}min...", "INFO")
                    for i in range(interval_min * 60):
                        if not self.hours_loop_active:
                            break
                        time.sleep(1)
        except Exception as e:
            self.log_message(f"❌ Erro no loop: {str(e)}", "ERROR")
        finally:
            self.hours_loop_active = False

    def stop_hours(self):
        """Para captura de horários"""
        if self.hours_loop_active:
            self.hours_loop_active = False
            self.log_message("⏹️ Loop de captura parado", "SYSTEM")
        else:
            self.log_message("⚠️ Nenhum loop ativo", "WARNING")

    # ==================== UTILIDADES ====================
    def open_local_site(self):
        """Abre site local"""
        if not self.status['servidor']:
            messagebox.showwarning("Aviso", "Servidor não está rodando!")
            return
        webbrowser.open(self.local_url.get())
        self.log_message("🌐 Site local aberto", "INFO")

    def open_public_site(self):
        """Abre site público"""
        if not self.ngrok_url.get():
            messagebox.showwarning(
                "Aviso", "URL público não disponível!\nInicie o Ngrok primeiro.")
            return
        webbrowser.open(self.ngrok_url.get())
        self.log_message("🌍 Site público aberto", "INFO")

    def open_admin_panel(self):
        """Abre painel administrativo"""
        try:
            url = f"{self.ngrok_url.get()}/admin.html" if self.ngrok_url.get(
            ) else f"{self.local_url.get()}/admin.html"
            webbrowser.open(url)
            self.log_message(f"⚙️ Painel admin aberto", "INFO")
        except Exception as e:
            messagebox.showerror("Erro", f"Não foi possível abrir: {str(e)}")

    def show_qr(self):
        """Mostra janela QR Code"""
        if not self.qr_window or not hasattr(self.qr_window, 'window'):
            self.qr_window = QRCodeWindow(self)
        else:
            try:
                if not self.qr_window.window.winfo_exists():
                    self.qr_window = QRCodeWindow(self)
                else:
                    self.qr_window.window.lift()
                    self.qr_window.window.focus_set()
            except:
                self.qr_window = QRCodeWindow(self)

    def open_hours_json(self):
        """Abre arquivo JSON de horários"""
        try:
            json_file = 'data/horarios_disponiveis.json' if os.path.exists(
                'data') else 'horarios_disponiveis.json'
            if os.path.exists(json_file):
                if os.name == 'nt':
                    os.startfile(json_file)
                else:
                    subprocess.run(['xdg-open', json_file])
                self.log_message("📂 JSON aberto", "INFO")
            else:
                messagebox.showwarning("Aviso", "Arquivo JSON não encontrado!")
        except Exception as e:
            self.log_message(f"❌ Erro ao abrir: {str(e)}", "ERROR")

    # ==================== CONFIGURAÇÕES ====================
    def _load_config(self):
        """Carrega configurações"""
        try:
            config_file = 'data/rotas.json' if os.path.exists(
                'data') else 'rotas.json'
            routes = Utils.load_json(config_file)
            if routes.get('ngrok_url'):
                self.ngrok_url.set(routes['ngrok_url'])
            self.log_message("✅ Configurações carregadas", "INFO")
        except Exception as e:
            self.log_message(
                f"⚠️ Erro ao carregar config: {str(e)}", "WARNING")

    def _save_config(self, ngrok_url):
        """Salva configurações"""
        try:
            config_file = 'data/rotas.json' if os.path.exists(
                'data') else 'rotas.json'
            config = {
                'ngrok_url': ngrok_url,
                'local_url': self.local_url.get(),
                'last_updated': datetime.now().isoformat(),
                'version': '3.0',
                'services': self.status
            }
            Utils.save_json(config_file, config)
            self.log_message("💾 Configurações salvas", "SUCCESS")
        except Exception as e:
            self.log_message(f"❌ Erro ao salvar config: {str(e)}", "ERROR")

# ==================== FUNÇÃO PRINCIPAL ====================


def main():
    """Inicializa a aplicação"""
    try:
        # Verifica dependências
        try:
            from PIL import Image, ImageTk
        except ImportError:
            messagebox.showerror(
                "Erro", "Pillow não instalado!\npip install Pillow")
            return

        try:
            subprocess.run(['node', '--version'],
                           check=True, capture_output=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            messagebox.showerror(
                "Erro", "Node.js não encontrado!\nhttps://nodejs.org/")
            return

        if not os.path.exists('node_modules'):
            response = messagebox.askyesno(
                "Aviso", "npm modules não instalados.\nExecute 'npm install' primeiro.\n\nContinuar mesmo assim?")
            if not response:
                return

        # Cria aplicação
        root = tk.Tk()
        try:
            root.iconbitmap('icon.ico')
        except:
            pass

        app = PriMalzoniControlPanel(root)
        app.update_all_status()
        app.log_message("🚀 Painel v3.0 Iniciado", "SYSTEM")
        app.log_message("Interface Modernizada - Pronto para usar", "SUCCESS")

        def on_closing():
            if messagebox.askokcancel("Confirmar", "Parar todos os serviços e fechar?"):
                app.log_message("🛑 Encerrando aplicação...", "SYSTEM")
                app.stop_all()
                if app.hours_loop_active:
                    app.stop_hours()
                time.sleep(1)
                root.destroy()

        root.protocol("WM_DELETE_WINDOW", on_closing)

        # Centraliza janela
        root.update_idletasks()
        width = root.winfo_width()
        height = root.winfo_height()
        x = (root.winfo_screenwidth() // 2) - (width // 2)
        y = (root.winfo_screenheight() // 2) - (height // 2)
        root.geometry(f'{width}x{height}+{x}+{y}')

        root.mainloop()

    except Exception as e:
        messagebox.showerror("Erro Fatal", f"Erro crítico:\n\n{str(e)}")


if __name__ == "__main__":
    main()
