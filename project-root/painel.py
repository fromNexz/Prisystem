import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox, Toplevel
import subprocess
import threading
import json
import os
import requests
import time
from datetime import datetime
import webbrowser
import queue
from PIL import Image, ImageTk


# ========================================================================================
# CLASSE: QRCodeWindow
# ========================================================================================
class QRCodeWindow:
    """Janela para exibição e gerenciamento do QR Code do WhatsApp"""

    def __init__(self, parent):
        self.parent = parent
        self.window = Toplevel(parent.root)
        self.window.title("WhatsApp QR Code - Pri Malzoni")
        self.window.geometry("550x650")
        self.window.configure(bg='#f8f9fa')
        self.window.transient(parent.root)
        self.window.grab_set()
        self.window.resizable(False, False)

        try:
            self.window.iconbitmap('icon.ico')
        except:
            pass

        # Variáveis de controle
        self.qr_image = None
        self.qr_photo = None
        self.check_image_thread = None
        self.checking = False
        self.hours_capture_process = None
        self.hours_capture_thread = None
        self.hours_loop_active = False

        self.setup_ui()
        self.start_image_monitoring()

    def setup_ui(self):
        """Configura a interface da janela"""
        self._create_header()
        self._create_main_container()

    def _create_header(self):
        """Cria o cabeçalho da janela"""
        header_frame = tk.Frame(self.window, bg='#ff6b6b', height=80)
        header_frame.pack(fill='x')
        header_frame.pack_propagate(False)

        title_label = tk.Label(
            header_frame,
            text="Conectar WhatsApp",
            font=('Segoe UI', 18, 'bold'),
            fg='white',
            bg='#ff6b6b'
        )
        title_label.pack(expand=True)

    def _create_main_container(self):
        """Cria o container principal com todas as seções"""
        main_container = tk.Frame(self.window, bg='#f8f9fa')
        main_container.pack(fill='both', expand=True, padx=30, pady=20)

        self._create_instructions_card(main_container)
        self._create_qr_card(main_container)
        self._create_buttons(main_container)

    def _create_instructions_card(self, parent):
        """Cria o card de instruções"""
        instructions_card = tk.Frame(parent, bg='white', relief='flat', bd=0)
        instructions_card.pack(fill='x', pady=(0, 20))

        shadow_frame = tk.Frame(parent, bg='#e9ecef', height=2)
        shadow_frame.pack(fill='x', pady=(0, 15))

        instructions_title = tk.Label(
            instructions_card,
            text="Instruções",
            font=('Segoe UI', 12, 'bold'),
            bg='white',
            fg='#495057'
        )
        instructions_title.pack(pady=(15, 5))

        instructions_text = """1. Abra o WhatsApp no seu celular
2. Toque em 'Dispositivos conectados'
3. Toque em 'Conectar um dispositivo'
4. Escaneie o QR Code abaixo"""

        instructions_label = tk.Label(
            instructions_card,
            text=instructions_text,
            font=('Segoe UI', 10),
            bg='white',
            fg='#6c757d',
            justify='left'
        )
        instructions_label.pack(pady=(0, 15))

    def _create_qr_card(self, parent):
        """Cria o card do QR Code"""
        qr_card = tk.Frame(parent, bg='white', relief='flat', bd=0)
        qr_card.pack(fill='both', expand=True, pady=(0, 20))

        self.qr_frame = tk.Frame(
            qr_card,
            bg='#f8f9fa',
            relief='solid',
            bd=1,
            width=350,
            height=350
        )
        self.qr_frame.pack(pady=20)
        self.qr_frame.pack_propagate(False)

        self.qr_label = tk.Label(
            self.qr_frame,
            text="Aguardando QR Code...",
            font=('Segoe UI', 12),
            bg='#f8f9fa',
            fg='#6c757d'
        )
        self.qr_label.place(relx=0.5, rely=0.5, anchor='center')

        self._create_status_indicator(qr_card)

    def _create_status_indicator(self, parent):
        """Cria o indicador de status"""
        status_frame = tk.Frame(parent, bg='white')
        status_frame.pack(pady=10)

        self.connection_indicator = tk.Label(
            status_frame,
            text="●",
            font=('Arial', 16),
            bg='white',
            fg='#dc3545'
        )
        self.connection_indicator.pack(side='left', padx=(0, 10))

        self.status_label = tk.Label(
            status_frame,
            text="Aguardando QR Code...",
            font=('Segoe UI', 11),
            bg='white',
            fg='#6c757d'
        )
        self.status_label.pack(side='left')

    def _create_buttons(self, parent):
        """Cria os botões de controle"""
        buttons_frame = tk.Frame(parent, bg='#f8f9fa')
        buttons_frame.pack(fill='x', pady=(0, 10))

        self.btn_refresh = tk.Button(
            buttons_frame,
            text="Atualizar",
            command=self.request_refresh,
            bg='#007bff',
            fg='white',
            font=('Segoe UI', 10),
            relief='flat',
            bd=0,
            padx=20,
            pady=8,
            cursor='hand2'
        )
        self.btn_refresh.pack(side='left', padx=(0, 10))

        btn_clear = tk.Button(
            buttons_frame,
            text="Limpar",
            command=self.clear_qr,
            bg='#6c757d',
            fg='white',
            font=('Segoe UI', 10),
            relief='flat',
            bd=0,
            padx=20,
            pady=8,
            cursor='hand2'
        )
        btn_clear.pack(side='left', padx=(0, 10))

        btn_close = tk.Button(
            buttons_frame,
            text="Fechar",
            command=self.close_window,
            bg='#dc3545',
            fg='white',
            font=('Segoe UI', 10),
            relief='flat',
            bd=0,
            padx=20,
            pady=8,
            cursor='hand2'
        )
        btn_close.pack(side='right')

        self.add_hover_effects()

    def add_hover_effects(self):
        """Adiciona efeitos hover aos botões"""
        def on_enter(e, bg_color):
            e.widget.config(bg=bg_color)

        def on_leave(e, bg_color):
            e.widget.config(bg=bg_color)

        self.btn_refresh.bind("<Enter>", lambda e: on_enter(e, '#0056b3'))
        self.btn_refresh.bind("<Leave>", lambda e: on_leave(e, '#007bff'))

    # Métodos de monitoramento e gerenciamento
    def start_image_monitoring(self):
        """Inicia o monitoramento da imagem do QR Code"""
        if not self.checking:
            self.checking = True
            self.check_image_thread = threading.Thread(
                target=self.monitor_qr_image,
                daemon=True
            )
            self.check_image_thread.start()

    def stop_image_monitoring(self):
        """Para o monitoramento da imagem"""
        self.checking = False

    def monitor_qr_image(self):
        """Monitora a criação/atualização da imagem do QR Code"""
        qr_path = 'whatsapp_qr.png'
        last_modified = 0

        while self.checking:
            try:
                if os.path.exists(qr_path):
                    current_modified = os.path.getmtime(qr_path)
                    if current_modified > last_modified:
                        last_modified = current_modified
                        self.window.after(100, self.load_qr_image, qr_path)
                time.sleep(1)
            except Exception as e:
                print(f"Erro no monitoramento: {e}")
                time.sleep(2)

    def load_qr_image(self, image_path):
        """Carrega e exibe a imagem do QR Code"""
        try:
            if os.path.exists(image_path):
                image = Image.open(image_path)
                max_size = (320, 320)
                image.thumbnail(max_size, Image.Resampling.LANCZOS)

                self.qr_photo = ImageTk.PhotoImage(image)
                self.qr_label.config(image=self.qr_photo, text="")

                # CORREÇÃO: Atualizar status e indicador quando QR Code for carregado
                self.status_label.config(
                    text="QR Code carregado! Escaneie com seu WhatsApp",
                    fg='#007bff'  # Azul para indicar ação necessária
                )
                self.connection_indicator.config(
                    fg='#fd7e14')  # Laranja = aguardando scan

                self.parent.log_message(
                    "QR Code carregado na janela", "SUCCESS")
        except Exception as e:
            self.parent.log_message(
                f"Erro ao carregar imagem QR: {str(e)}", "ERROR")
            self.status_label.config(
                text="Erro ao carregar QR Code", fg='#dc3545')
            self.connection_indicator.config(fg='#dc3545')

    def update_status(self, status, color='#6c757d'):
        """Atualiza o status da conexão"""
        color_map = {
            'blue': '#007bff',
            'green': '#28a745',
            'red': '#dc3545',
            'orange': '#fd7e14',
            'yellow': '#ffc107'
        }

        final_color = color_map.get(color, color)
        self.status_label.config(text=status, fg=final_color)

        # CORREÇÃO: Atualizar indicador baseado no conteúdo da mensagem
        if 'conectado' in status.lower() or 'sucesso' in status.lower():
            self.connection_indicator.config(fg='#28a745')  # Verde
            self.stop_image_monitoring()
            self.window.after(3000, self.auto_close_on_success)
        elif 'erro' in status.lower() or 'falha' in status.lower():
            self.connection_indicator.config(fg='#dc3545')  # Vermelho
        elif 'aguardando' in status.lower() or 'escaneie' in status.lower():
            self.connection_indicator.config(fg='#fd7e14')  # Laranja
        elif 'qr code' in status.lower() and 'gerado' in status.lower():
            self.connection_indicator.config(
                fg='#ffc107')  # Amarelo = novo QR gerado
        elif 'carregando' in status.lower() or 'processando' in status.lower():
            self.connection_indicator.config(
                fg='#17a2b8')  # Azul claro = processando

    def auto_close_on_success(self):
        """Fecha automaticamente a janela após conexão bem-sucedida"""
        try:
            if self.window.winfo_exists():
                self.status_label.config(text="Conectado! Fechando janela...")
                self.window.after(2000, self.close_window)
        except tk.TclError:
            pass

    def clear_qr(self):
        """Limpa o QR Code"""
        self.qr_label.config(image="", text="Aguardando novo QR Code...")
        self.qr_photo = None
        self.status_label.config(text="Aguardando novo QR Code...")
        self.connection_indicator.config(fg='#dc3545')

        if os.path.exists('whatsapp_qr.png'):
            try:
                os.remove('whatsapp_qr.png')
            except:
                pass

    def request_refresh(self):
        """Solicita atualização do QR Code"""
        self.clear_qr()
        self.parent.log_message("Solicitada atualização do QR Code", "INFO")

        if self.parent.status['chatbot']:
            # CORREÇÃO: Atualizar visual imediatamente
            self.status_label.config(
                text="Solicitando novo QR Code...",
                fg='#fd7e14'  # Laranja = processando
            )
            self.connection_indicator.config(fg='#fd7e14')
            self.start_image_monitoring()
        else:
            self.status_label.config(
                text="Inicie o chatbot primeiro",
                fg='#dc3545'  # Vermelho = erro
            )
            self.connection_indicator.config(fg='#dc3545')

    def close_window(self):
        """Fecha a janela"""
        self.stop_image_monitoring()
        self.window.destroy()


# ========================================================================================
# CLASSE: ModernButton
# ========================================================================================
class ModernButton(tk.Button):
    """Botão customizado com visual moderno"""

    def __init__(self, parent, **kwargs):
        default_config = {
            'font': ('Segoe UI', 10),
            'relief': 'flat',
            'bd': 0,
            'padx': 20,
            'pady': 10,
            'cursor': 'hand2'
        }

        final_config = {**default_config, **kwargs}
        super().__init__(parent, **final_config)

        if 'bg' in kwargs:
            self.default_bg = kwargs['bg']
            self.bind("<Enter>", self._on_enter)
            self.bind("<Leave>", self._on_leave)

    def _on_enter(self, e):
        pass

    def _on_leave(self, e):
        self.config(bg=self.default_bg)


# ========================================================================================
# CLASSE PRINCIPAL: PriMalzoniControlPanel
# ========================================================================================
class PriMalzoniControlPanel:
    """Painel principal de controle do sistema Pri Malzoni"""

    def __init__(self, root):
        self.root = root
        self.root.title("Pri Malzoni - Painel de Controle v2.2")
        self.root.geometry("1100x750")
        self.root.configure(bg='#f8f9fa')
        self.root.minsize(1000, 700)

        self.hours_loop_active = False

        self.setup_ttk_style()

        # Processos e status
        self.processes = {
            'servidor': None,
            'chatbot': None,
            'ngrok': None
        }

        self.status = {
            'servidor': False,
            'chatbot': False,
            'ngrok': False
        }

        # URLs
        self.ngrok_url = tk.StringVar()
        self.local_url = tk.StringVar(value="http://localhost:8000")

        # Queue para comunicação entre threads
        self.message_queue = queue.Queue()

        # Janela do QR Code
        self.qr_window = None

        self.setup_ui()
        self.load_routes()
        self.process_queue()

    # --------------------------------------------------------------------------------
    # CONFIGURAÇÃO DE INTERFACE
    # --------------------------------------------------------------------------------

    def setup_ttk_style(self):
        """Configura estilo moderno para componentes ttk"""
        style = ttk.Style()
        style.theme_use('clam')
        style.configure('TNotebook', background='#f8f9fa', borderwidth=0)
        style.configure('TNotebook.Tab', padding=[
                        20, 10], font=('Segoe UI', 10))

    def setup_ui(self):
        """Configura a interface principal"""
        self._create_header()
        self._create_main_container()

    def _create_header(self):
        """Cria o cabeçalho principal"""
        header_frame = tk.Frame(self.root, bg='#ff6b6b', height=100)
        header_frame.pack(fill='x')
        header_frame.pack_propagate(False)

        title_container = tk.Frame(header_frame, bg='#ff6b6b')
        title_container.pack(expand=True, fill='both')

        title_label = tk.Label(
            title_container,
            text="✨ Pri Malzoni Estética",
            font=('Segoe UI', 24, 'bold'),
            fg='white',
            bg='#ff6b6b'
        )
        title_label.pack(expand=True)

        subtitle_label = tk.Label(
            title_container,
            text="Central de Controle v2.2",
            font=('Segoe UI', 12),
            fg='#ffe6e6',
            bg='#ff6b6b'
        )
        subtitle_label.pack()

    def _create_main_container(self):
        """Cria o container principal com grid layout"""
        main_container = tk.Frame(self.root, bg='#f8f9fa')
        main_container.pack(fill='both', expand=True, padx=20, pady=20)

        main_container.grid_columnconfigure(0, weight=1, minsize=350)
        main_container.grid_columnconfigure(1, weight=2)
        main_container.grid_rowconfigure(0, weight=1)

        self.setup_control_panel(main_container)
        self.setup_info_panel(main_container)

    # --------------------------------------------------------------------------------
    # PAINEL DE CONTROLES
    # --------------------------------------------------------------------------------

    def setup_control_panel(self, parent):
        """Configura o painel de controles"""
        control_frame = tk.Frame(parent, bg='white', relief='flat', bd=0)
        control_frame.grid(row=0, column=0, sticky='nsew', padx=(0, 15))

        canvas = tk.Canvas(control_frame, bg='white', highlightthickness=0)
        scrollbar = tk.Scrollbar(
            control_frame, orient="vertical", command=canvas.yview)

        control_content = tk.Frame(canvas, bg='white')

        control_content.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )

        canvas.create_window((0, 0), window=control_content, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)

        canvas.pack(side="left", fill="both", expand=True, padx=25, pady=25)
        scrollbar.pack(side="right", fill="y")

        def _on_mousewheel(event):
            canvas.yview_scroll(int(-1*(event.delta/120)), "units")

        canvas.bind_all("<MouseWheel>", _on_mousewheel)

        self._create_main_controls(control_content)
        self._create_service_section(control_content)
        self._create_hours_capture_section(control_content)
        self._create_utilities_section(control_content)

    def _create_main_controls(self, parent):
        """Cria controles principais"""
        title_label = tk.Label(
            parent,
            text="Controles Principais",
            font=('Segoe UI', 16, 'bold'),
            bg='white',
            fg='#495057'
        )
        title_label.pack(pady=(0, 25))

        self.btn_start_all = ModernButton(
            parent,
            text="INICIAR TUDO",
            command=self.start_all,
            bg='#28a745',
            fg='white',
            font=('Segoe UI', 12, 'bold'),
            width=25,
            pady=15
        )
        self.btn_start_all.pack(pady=(0, 10))

        self.btn_stop_all = ModernButton(
            parent,
            text="PARAR TUDO",
            command=self.stop_all,
            bg='#dc3545',
            fg='white',
            font=('Segoe UI', 12, 'bold'),
            width=25,
            pady=15
        )
        self.btn_stop_all.pack(pady=(0, 30))

    def _create_service_section(self, parent):
        """Cria seção de controles de serviços"""
        separator = tk.Frame(parent, height=2, bg='#e9ecef')
        separator.pack(fill='x', pady=(0, 25))

        individual_label = tk.Label(
            parent,
            text="Controles Individuais",
            font=('Segoe UI', 14, 'bold'),
            bg='white',
            fg='#495057'
        )
        individual_label.pack(pady=(0, 20))

        self.setup_service_controls(parent)

    def _create_hours_capture_section(self, parent):
        """Cria seção de captura de horários"""
        separator = tk.Frame(parent, height=2, bg='#e9ecef')
        separator.pack(fill='x', pady=20)

        hours_label = tk.Label(
            parent,
            text="Captura de Horários",
            font=('Segoe UI', 14, 'bold'),
            bg='white',
            fg='#495057'
        )
        hours_label.pack(pady=(0, 15))

        self.setup_hours_capture_buttons(parent)

    def _create_utilities_section(self, parent):
        """Cria seção de utilidades"""
        separator = tk.Frame(parent, height=2, bg='#e9ecef')
        separator.pack(fill='x', pady=20)

        utilities_label = tk.Label(
            parent,
            text="Utilidades",
            font=('Segoe UI', 14, 'bold'),
            bg='white',
            fg='#495057'
        )
        utilities_label.pack(pady=(0, 15))

        self.setup_utility_buttons(parent)

    def setup_service_controls(self, parent):
        """Configura controles de serviços individuais"""
        services = [
            ('servidor', 'Servidor Web', '#17a2b8'),
            ('chatbot', 'ChatBot WhatsApp', '#6f42c1'),
            ('ngrok', 'Túnel Ngrok', '#fd7e14')
        ]

        for service_key, service_name, color in services:
            service_frame = tk.Frame(parent, bg='white')
            service_frame.pack(fill='x', pady=5)

            btn = ModernButton(
                service_frame,
                text=service_name,
                command=lambda k=service_key: self.toggle_service(k),
                bg=color,
                fg='white',
                width=20
            )
            btn.pack(side='left', padx=(0, 15))

            indicator = tk.Label(
                service_frame,
                text="●",
                fg='#dc3545',
                font=('Arial', 18),
                bg='white'
            )
            indicator.pack(side='right')

            setattr(self, f'btn_{service_key}', btn)
            setattr(self, f'status_{service_key}', indicator)

    def setup_utility_buttons(self, parent):
        """Configura botões de utilidade"""
        utilities = [
            ('Abrir Site Local', self.open_local_site, '#6c757d'),
            ('Abrir Site Público', self.open_public_site, '#17a2b8'),
            ('Mostrar QR Code', self.show_qr_window, '#fd7e14'),
            ('Painel Administrativo', self.open_admin_panel, '#dc3545'),
            ('Ver Horários JSON', self.open_hours_json, '#28a745'),
            ('Atualizar Status', self.update_all_status, '#6f42c1')
        ]

        for text, command, color in utilities:
            btn = ModernButton(
                parent,
                text=text,
                command=command,
                bg=color,
                fg='white',
                width=22
            )
            btn.pack(pady=5)

    def setup_hours_capture_buttons(self, parent):
        """Configura botões para captura de horários"""
        info_frame = tk.Frame(parent, bg='#f8f9fa', relief='solid', bd=1)
        info_frame.pack(fill='x', pady=(0, 10))

        info_text = """Status: Sistema de Captura
Horários de Trabalho:
• Seg/Qua/Sex: 8h-12h e 14h-18h
• Ter/Qui: 9h-12h e 14h-19h
• Sáb: 9h-12h • Dom: Fechado"""

        info_label = tk.Label(
            info_frame,
            text=info_text,
            font=('Segoe UI', 8),
            bg='#f8f9fa',
            fg='#6c757d',
            justify='left'
        )
        info_label.pack(padx=10, pady=8)

        # Captura única
        capture_frame = tk.LabelFrame(
            parent,
            text="Captura Única",
            font=('Segoe UI', 10, 'bold'),
            bg='white',
            fg='#495057'
        )
        capture_frame.pack(fill='x', pady=(0, 10))

        capture_buttons = [
            ("2 Semanas", lambda: self.run_hours_capture(2, False), '#17a2b8'),
            ("3 Semanas", lambda: self.run_hours_capture(3, False), '#28a745'),
            ("4 Semanas", lambda: self.run_hours_capture(4, False), '#6f42c1')
        ]

        for text, command, color in capture_buttons:
            btn = ModernButton(
                capture_frame,
                text=text,
                command=command,
                bg=color,
                fg='white',
                width=18
            )
            btn.pack(pady=2, padx=5)

        # Loop automático
        loop_frame = tk.LabelFrame(
            parent,
            text="Loop Automático",
            font=('Segoe UI', 10, 'bold'),
            bg='white',
            fg='#495057'
        )
        loop_frame.pack(fill='x', pady=(0, 10))

        loop_buttons = [
            ("5 min (3 sem)", lambda: self.run_hours_capture(3, True, 5), '#fd7e14'),
            ("10 min (3 sem)", lambda: self.run_hours_capture(3, True, 10), '#20c997'),
            ("15 min (4 sem)", lambda: self.run_hours_capture(4, True, 15), '#e83e8c')
        ]

        for text, command, color in loop_buttons:
            btn = ModernButton(
                loop_frame,
                text=text,
                command=command,
                bg=color,
                fg='white',
                width=18
            )
            btn.pack(pady=2, padx=5)

        # Controles do loop
        control_frame = tk.Frame(parent, bg='white')
        control_frame.pack(fill='x', pady=(0, 5))

        self.btn_stop_hours = ModernButton(
            control_frame,
            text="Parar Loop",
            command=self.stop_hours_capture,
            bg='#dc3545',
            fg='white',
            width=18
        )
        self.btn_stop_hours.pack(pady=2)

        self.hours_status_label = tk.Label(
            control_frame,
            text="Status: Parado",
            font=('Segoe UI', 9),
            bg='white',
            fg='#6c757d'
        )
        self.hours_status_label.pack(pady=2)

    # --------------------------------------------------------------------------------
    # PAINEL DE INFORMAÇÕES
    # --------------------------------------------------------------------------------

    def setup_info_panel(self, parent):
        """Configura painel de informações"""
        info_frame = tk.Frame(parent, bg='white', relief='flat', bd=0)
        info_frame.grid(row=0, column=1, sticky='nsew')

        notebook = ttk.Notebook(info_frame)
        notebook.pack(fill='both', expand=True, padx=20, pady=20)

        self.setup_status_tab(notebook)
        self.setup_logs_tab(notebook)
        self.setup_monitoring_tab(notebook)
        self.setup_hours_monitoring_tab(notebook)

    def setup_status_tab(self, notebook):
        """Configura aba de status"""
        status_frame = tk.Frame(notebook, bg='white')
        notebook.add(status_frame, text="Status & URLs")

        # URLs Section
        urls_frame = tk.LabelFrame(
            status_frame,
            text="🔗 URLs do Sistema",
            font=('Segoe UI', 12, 'bold'),
            bg='white',
            fg='#495057',
            padx=15,
            pady=15
        )
        urls_frame.pack(fill='x', padx=20, pady=(20, 10))

        # URL Local
        local_frame = tk.Frame(urls_frame, bg='white')
        local_frame.pack(fill='x', pady=5)

        tk.Label(
            local_frame,
            text="Local:",
            font=('Segoe UI', 10, 'bold'),
            bg='white',
            fg='#495057',
            width=10,
            anchor='w'
        ).pack(side='left')

        local_entry = tk.Entry(
            local_frame,
            textvariable=self.local_url,
            state='readonly',
            font=('Consolas', 10),
            relief='flat',
            bg='#f8f9fa'
        )
        local_entry.pack(side='left', fill='x', expand=True, padx=(10, 0))

        # URL Público
        public_frame = tk.Frame(urls_frame, bg='white')
        public_frame.pack(fill='x', pady=5)

        tk.Label(
            public_frame,
            text="Público:",
            font=('Segoe UI', 10, 'bold'),
            bg='white',
            fg='#495057',
            width=10,
            anchor='w'
        ).pack(side='left')

        public_entry = tk.Entry(
            public_frame,
            textvariable=self.ngrok_url,
            state='readonly',
            font=('Consolas', 10),
            relief='flat',
            bg='#f8f9fa'
        )
        public_entry.pack(side='left', fill='x', expand=True, padx=(10, 0))

        # Status dos Serviços
        services_frame = tk.LabelFrame(
            status_frame,
            text="Status dos Serviços",
            font=('Segoe UI', 12, 'bold'),
            bg='white',
            fg='#495057',
            padx=15,
            pady=15
        )
        services_frame.pack(fill='both', expand=True, padx=20, pady=10)

        self.status_text = scrolledtext.ScrolledText(
            services_frame,
            font=('Consolas', 10),
            relief='flat',
            bg='#f8f9fa',
            wrap='word'
        )
        self.status_text.pack(fill='both', expand=True)

    def setup_logs_tab(self, notebook):
        """Configura aba de logs"""
        logs_frame = tk.Frame(notebook, bg='white')
        notebook.add(logs_frame, text="Logs do Sistema")

        self.logs_text = scrolledtext.ScrolledText(
            logs_frame,
            font=('Consolas', 9),
            relief='flat',
            bg='#f8f9fa',
            wrap='word'
        )
        self.logs_text.pack(fill='both', expand=True, padx=20, pady=(20, 10))

        logs_controls = tk.Frame(logs_frame, bg='white')
        logs_controls.pack(fill='x', padx=20, pady=(0, 20))

        ModernButton(
            logs_controls,
            text="Limpar Logs",
            command=self.clear_logs,
            bg='#6c757d',
            fg='white'
        ).pack(side='right')

    def setup_monitoring_tab(self, notebook):
        """Configura aba de monitoramento"""
        monitor_frame = tk.Frame(notebook, bg='white')
        notebook.add(monitor_frame, text="Monitoramento")

        tk.Label(
            monitor_frame,
            text="Métricas do Sistema",
            font=('Segoe UI', 16, 'bold'),
            bg='white',
            fg='#495057'
        ).pack(pady=50)

        tk.Label(
            monitor_frame,
            text="Em breve: gráficos de desempenho e estatísticas",
            font=('Segoe UI', 12),
            bg='white',
            fg='#6c757d'
        ).pack()

    def setup_hours_monitoring_tab(self, notebook):
        """Configura aba de monitoramento da captura de horários"""
        hours_frame = tk.Frame(notebook, bg='white')
        notebook.add(hours_frame, text="Captura Horários")

        # Status atual
        status_frame = tk.LabelFrame(
            hours_frame,
            text="Status da Captura",
            font=('Segoe UI', 12, 'bold'),
            bg='white',
            fg='#495057',
            padx=15,
            pady=15
        )
        status_frame.pack(fill='x', padx=20, pady=(20, 10))

        details_text = """Horários de Funcionamento:
• Segunda/Quarta/Sexta: 8:00-12:00 e 14:00-18:00
• Terça/Quinta: 9:00-12:00 e 14:00-19:00  
• Sábado: 9:00-12:00
• Domingo: Fechado

Funcionalidades:
• Captura única (2, 3 ou 4 semanas)
• Loop automático (5, 10 ou 15 minutos)
• Filtro automático por horários de trabalho
• Exclusão de domingos e datas passadas
• Geração de arquivo JSON com horários disponíveis"""

        details_label = tk.Label(
            status_frame,
            text=details_text,
            font=('Segoe UI', 10),
            bg='white',
            fg='#495057',
            justify='left'
        )
        details_label.pack(anchor='w')

        # Informações do arquivo JSON
        json_frame = tk.LabelFrame(
            hours_frame,
            text="Último Arquivo Gerado",
            font=('Segoe UI', 12, 'bold'),
            bg='white',
            fg='#495057',
            padx=15,
            pady=15
        )
        json_frame.pack(fill='both', expand=True, padx=20, pady=10)

        self.json_info_text = scrolledtext.ScrolledText(
            json_frame,
            font=('Consolas', 9),
            relief='flat',
            bg='#f8f9fa',
            wrap='word',
            height=15
        )
        self.json_info_text.pack(fill='both', expand=True)

        # Controles
        controls_frame = tk.Frame(hours_frame, bg='white')
        controls_frame.pack(fill='x', padx=20, pady=(0, 20))

        ModernButton(
            controls_frame,
            text="Atualizar Info JSON",
            command=self.update_json_info,
            bg='#17a2b8',
            fg='white'
        ).pack(side='left', padx=(0, 10))

        ModernButton(
            controls_frame,
            text="Abrir JSON",
            command=self.open_hours_json,
            bg='#28a745',
            fg='white'
        ).pack(side='left')

        self.update_json_info()

    # --------------------------------------------------------------------------------
    # GERENCIAMENTO DE LOGS E STATUS
    # --------------------------------------------------------------------------------

    def log_message(self, message, level="INFO"):
        """Log de mensagens com cores"""
        timestamp = datetime.now().strftime("%H:%M:%S")

        color_tags = {
            "INFO": "info",
            "SUCCESS": "success",
            "ERROR": "error",
            "WARNING": "warning",
            "SYSTEM": "system",
            "CHATBOT": "chatbot"
        }

        log_entry = f"[{timestamp}] {level}: {message}\n"

        if not hasattr(self, 'logs_configured'):
            self.logs_text.tag_configure("info", foreground="#495057")
            self.logs_text.tag_configure("success", foreground="#28a745")
            self.logs_text.tag_configure("error", foreground="#dc3545")
            self.logs_text.tag_configure("warning", foreground="#fd7e14")
            self.logs_text.tag_configure("system", foreground="#007bff")
            self.logs_text.tag_configure("chatbot", foreground="#6f42c1")
            self.logs_configured = True

        start_pos = self.logs_text.index(tk.END + "-1c")
        self.logs_text.insert(tk.END, log_entry)
        end_pos = self.logs_text.index(tk.END + "-1c")

        tag = color_tags.get(level, "info")
        self.logs_text.tag_add(tag, start_pos, end_pos)
        self.logs_text.see(tk.END)

        lines = self.logs_text.get(1.0, tk.END).split('\n')
        if len(lines) > 1000:
            self.logs_text.delete(1.0, f"{len(lines) - 1000}.0")

        self.update_status_display()

    def clear_logs(self):
        """Limpa os logs"""
        self.logs_text.delete(1.0, tk.END)
        self.log_message("Logs limpos", "SYSTEM")

    def update_status_display(self):
        """Atualiza o display de status"""
        status_info = f"""
SISTEMA PRI MALZONI - STATUS ATUAL
{'='*50}

Servidor HTML: {'ATIVO' if self.status['servidor'] else 'INATIVO'}
   └─ Porta: 8000
   └─ URL: {self.local_url.get()}

ChatBot WhatsApp: {'ATIVO' if self.status['chatbot'] else 'INATIVO'}  
   └─ Status: {'Conectado e funcionando' if self.status['chatbot'] else 'Desconectado'}

Túnel Ngrok: {'ATIVO' if self.status['ngrok'] else 'INATIVO'}
   └─ URL Pública: {self.ngrok_url.get() or 'Não disponível'}

ESTATÍSTICAS:
   └─ Serviços Ativos: {sum(self.status.values())}/3
   └─ Última Atualização: {datetime.now().strftime("%H:%M:%S")}
   └─ Uptime: Sistema operacional

ACESSO RÁPIDO:
   • Site Local: {self.local_url.get()}
   • Site Público: {self.ngrok_url.get() or 'Inicie o Ngrok primeiro'}
"""
        self.status_text.delete(1.0, tk.END)
        self.status_text.insert(1.0, status_info)

    def update_json_info(self):
        """Atualiza informações do arquivo JSON de horários"""
        try:
            json_file = 'horarios_disponiveis.json'

            if not os.path.exists(json_file):
                self.json_info_text.delete(1.0, tk.END)
                self.json_info_text.insert(
                    1.0,
                    "Arquivo horarios_disponiveis.json não encontrado.\n\n"
                    "Execute uma captura primeiro."
                )
                return

            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            info_text = f"""INFORMAÇÕES DO ARQUIVO JSON
{'='*50}

Data da Captura: {data.get('data_captura', 'N/A')}
Total de Dias: {data.get('total_dias', 0)}
Data de Referência: {data.get('data_referencia', 'N/A')}

HORÁRIOS DE TRABALHO CONFIGURADOS:
{data.get('horarios_trabalho', {}).get('segunda_quarta_sexta', 'N/A')}
{data.get('horarios_trabalho', {}).get('terca_quinta', 'N/A')}
{data.get('horarios_trabalho', {}).get('sabado', 'N/A')}
{data.get('horarios_trabalho', {}).get('domingo', 'N/A')}

RESUMO DOS DIAS CAPTURADOS:
{'='*50}
"""

            dias = data.get('dias', [])
            if dias:
                for dia in dias[:10]:
                    info_text += f"{dia['data']} - {dia['dia']}: {dia['total_livres']} livres, {dia['total_ocupados']} ocupados\n"

                if len(dias) > 10:
                    info_text += f"... e mais {len(dias) - 10} dias\n"

                total_livres = sum(dia['total_livres'] for dia in dias)
                total_ocupados = sum(dia['total_ocupados'] for dia in dias)

                info_text += f"""
{'='*50}
ESTATÍSTICAS GERAIS:
• Total de horários livres: {total_livres}
• Total de horários ocupados: {total_ocupados}
• Média de livres por dia: {total_livres/len(dias):.1f}
• Taxa de ocupação: {(total_ocupados/(total_livres+total_ocupados)*100):.1f}%"""
            else:
                info_text += "Nenhum dia encontrado no arquivo."

            self.json_info_text.delete(1.0, tk.END)
            self.json_info_text.insert(1.0, info_text)
            self.log_message("Informações do JSON atualizadas", "INFO")

        except json.JSONDecodeError:
            self.json_info_text.delete(1.0, tk.END)
            self.json_info_text.insert(
                1.0, "Erro: Arquivo JSON inválido ou corrompido.")
        except Exception as e:
            self.json_info_text.delete(1.0, tk.END)
            self.json_info_text.insert(
                1.0, f"Erro ao ler arquivo JSON: {str(e)}")

    # --------------------------------------------------------------------------------
    # PROCESSAMENTO DE MENSAGENS DA QUEUE
    # --------------------------------------------------------------------------------

    def process_queue(self):
        """Processa mensagens da queue de forma thread-safe - VERSÃO CORRIGIDA"""
        try:
            while True:
                message_type, data = self.message_queue.get_nowait()

                if message_type == 'qr_generated':
                    if self.qr_window and hasattr(self.qr_window, 'window'):
                        try:
                            if self.qr_window.window.winfo_exists():
                                self.qr_window.update_status(
                                    "QR Code gerado! Carregando imagem...",
                                    'yellow'
                                )
                        except tk.TclError:
                            self.qr_window = None
                    self.log_message("QR Code gerado", "INFO")

                elif message_type == 'qr_loaded':
                    if self.qr_window and hasattr(self.qr_window, 'window'):
                        try:
                            if self.qr_window.window.winfo_exists():
                                self.qr_window.update_status(
                                    "QR Code carregado! Escaneie com seu WhatsApp",
                                    'orange'
                                )
                        except tk.TclError:
                            self.qr_window = None
                    self.log_message("QR Code pronto para scan", "SUCCESS")

                elif message_type == 'whatsapp_connected':
                    if self.qr_window and hasattr(self.qr_window, 'window'):
                        try:
                            if self.qr_window.window.winfo_exists():
                                self.qr_window.update_status(
                                    "WhatsApp conectado com sucesso!",
                                    'green'
                                )
                        except tk.TclError:
                            self.qr_window = None
                    self.log_message("WhatsApp conectado e pronto!", "SUCCESS")

                elif message_type == 'whatsapp_ready':
                    if self.qr_window and hasattr(self.qr_window, 'window'):
                        try:
                            if self.qr_window.window.winfo_exists():
                                self.qr_window.update_status(
                                    "Bot ativo e funcionando perfeitamente!",
                                    'green'
                                )
                        except tk.TclError:
                            self.qr_window = None
                    self.log_message(f"Bot pronto: {data}", "SUCCESS")

                elif message_type == 'whatsapp_disconnected':
                    if self.qr_window and hasattr(self.qr_window, 'window'):
                        try:
                            if self.qr_window.window.winfo_exists():
                                self.qr_window.update_status(
                                    "WhatsApp desconectado - Tentando reconectar...",
                                    'orange'
                                )
                        except tk.TclError:
                            self.qr_window = None
                    self.log_message(
                        f"WhatsApp desconectado: {data}", "WARNING")

                elif message_type == 'whatsapp_error':
                    if self.qr_window and hasattr(self.qr_window, 'window'):
                        try:
                            if self.qr_window.window.winfo_exists():
                                self.qr_window.update_status(
                                    f"Erro: {data}", 'red')
                        except tk.TclError:
                            self.qr_window = None
                    self.log_message(f"Erro no WhatsApp: {data}", "ERROR")

                elif message_type == 'qr_expired':
                    if self.qr_window and hasattr(self.qr_window, 'window'):
                        try:
                            if self.qr_window.window.winfo_exists():
                                self.qr_window.update_status(
                                    "QR Code expirado - Aguarde novo código...",
                                    'orange'
                                )
                                self.qr_window.clear_qr()
                        except tk.TclError:
                            self.qr_window = None
                    self.log_message(
                        "QR Code expirado - Aguardando novo", "WARNING")

                elif message_type == 'log':
                    self.log_message(data, "CHATBOT")

        except queue.Empty:
            pass

        self.root.after(100, self.process_queue)

    # --------------------------------------------------------------------------------
    # CONTROLE DE SERVIÇOS
    # --------------------------------------------------------------------------------

    def toggle_service(self, service_name):
        """Alterna estado de um serviço específico"""
        if self.status[service_name]:
            getattr(self, f'stop_{service_name}')()
        else:
            threading.Thread(
                target=getattr(self, f'start_{service_name}'),
                daemon=True
            ).start()

        self.root.after(1000, self.update_all_status)

    def start_all(self):
        """Inicia todos os serviços"""
        self.log_message("Iniciando todos os serviços...", "SYSTEM")
        self.btn_start_all.config(state='disabled', text="Iniciando...")
        threading.Thread(target=self._start_all_sequence, daemon=True).start()

    def _start_all_sequence(self):
        """Sequência de inicialização"""
        try:
            services_to_start = [
                ('servidor', 2),
                ('ngrok', 3),
                ('chatbot', 2)
            ]

            for service, delay in services_to_start:
                if not self.status[service]:
                    self.log_message(
                        f"Iniciando {service.capitalize()}...", "INFO")
                    getattr(self, f'start_{service}')()
                    time.sleep(delay)
                else:
                    self.log_message(
                        f"{service.capitalize()} já está ativo", "INFO")

            self.log_message(
                "Todos os serviços iniciados com sucesso!", "SUCCESS")

        except Exception as e:
            self.log_message(f"Erro ao iniciar serviços: {str(e)}", "ERROR")
        finally:
            self.root.after(
                0,
                lambda: self.btn_start_all.config(
                    state='normal', text="INICIAR TUDO")
            )

    def stop_all(self):
        """Para todos os serviços"""
        self.log_message("Parando todos os serviços...", "SYSTEM")
        self.btn_stop_all.config(state='disabled', text="Parando...")

        try:
            for service_name, process in self.processes.items():
                if process:
                    try:
                        process.terminate()
                        self.status[service_name] = False
                        self.log_message(
                            f"{service_name.capitalize()} parado", "INFO")
                    except Exception as e:
                        self.log_message(
                            f"Erro ao parar {service_name}: {str(e)}",
                            "ERROR"
                        )

            if self.hours_loop_active:
                self.stop_hours_capture()

            if self.qr_window and hasattr(self.qr_window, 'window'):
                try:
                    if self.qr_window.window.winfo_exists():
                        self.qr_window.close_window()
                except tk.TclError:
                    pass
                self.qr_window = None

            self.update_all_status()
            self.log_message("Todos os serviços parados", "SYSTEM")

        finally:
            self.btn_stop_all.config(state='normal', text="PARAR TUDO")

# --------------------------------------------------------------------------------
    # SERVIÇOS INDIVIDUAIS
    # --------------------------------------------------------------------------------

    def start_servidor(self):
        """Inicia o servidor HTTP"""
        try:
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            result = sock.connect_ex(('localhost', 8000))
            sock.close()

            if result == 0:
                self.log_message("Porta 8000 já está em uso", "WARNING")
                return

            self.processes['servidor'] = subprocess.Popen(
                ['python', '-m', 'http.server', '8000'],
                cwd='.',
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
            )

            self.status['servidor'] = True
            self.log_message("Servidor HTTP iniciado na porta 8000", "SUCCESS")

        except Exception as e:
            self.log_message(f"Erro ao iniciar servidor: {str(e)}", "ERROR")

    def stop_servidor(self):
        """Para o servidor HTTP"""
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
            self.log_message("Servidor HTTP parado", "INFO")

    def start_chatbot(self):
        """Inicia o chatbot"""
        try:
            if not os.path.exists('chatbot.js'):
                self.log_message("Arquivo chatbot.js não encontrado", "ERROR")
                return

            try:
                subprocess.run(['node', '--version'],
                               check=True, capture_output=True)
            except (subprocess.CalledProcessError, FileNotFoundError):
                self.log_message("Node.js não encontrado no sistema", "ERROR")
                return

            if not self.qr_window or not hasattr(self.qr_window, 'window'):
                self.qr_window = QRCodeWindow(self)
            else:
                try:
                    if not self.qr_window.window.winfo_exists():
                        self.qr_window = QRCodeWindow(self)
                except tk.TclError:
                    self.qr_window = QRCodeWindow(self)

            startupinfo = None
            if os.name == 'nt':
                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                startupinfo.wShowWindow = subprocess.SW_HIDE

            self.processes['chatbot'] = subprocess.Popen(
                ['node', 'chatbot.js'],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                universal_newlines=True,
                bufsize=1,
                encoding='utf-8',
                errors='ignore',
                startupinfo=startupinfo
            )

            threading.Thread(
                target=self.monitor_chatbot_output, daemon=True).start()

            self.status['chatbot'] = True
            self.log_message(
                "ChatBot iniciado - Aguardando QR Code...", "SUCCESS")

        except Exception as e:
            self.log_message(f"Erro ao iniciar chatbot: {str(e)}", "ERROR")

    def stop_chatbot(self):
        """Para o chatbot"""
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
                    if self.qr_window.window.winfo_exists():
                        self.qr_window.close_window()
                except tk.TclError:
                    pass
                self.qr_window = None

            self.log_message("ChatBot parado", "INFO")

    def monitor_chatbot_output(self):
        """Monitora saída do chatbot"""
        if not self.processes['chatbot']:
            return

        try:
            while self.processes['chatbot'] and self.processes['chatbot'].poll() is None:
                line = self.processes['chatbot'].stdout.readline()
                if not line:
                    break

                line = line.strip()
                if not line:
                    continue

                try:
                    line_clean = line.encode('ascii', 'ignore').decode('ascii')
                    if line_clean:
                        line = line_clean
                except:
                    line = ''.join(char for char in line if ord(char) < 128)

                self.message_queue.put(('log', f"{line}"))
                self.detect_whatsapp_events(line)

        except Exception as e:
            error_msg = f"Erro no monitoramento: {str(e)}"
            error_msg = ''.join(char for char in error_msg if ord(char) < 128)
            self.message_queue.put(('whatsapp_error', error_msg))

        self.status['chatbot'] = False
        self.processes['chatbot'] = None
        self.message_queue.put(('log', 'Processo do chatbot finalizado'))

    def detect_whatsapp_events(self, line):
        """Detecta eventos específicos do WhatsApp"""
        events = {
            'QR_GENERATED': ('qr_generated', 'QR Code gerado'),
            'QR_IMAGE_SAVED': ('qr_generated', 'Imagem QR salva'),
            'WHATSAPP_CONNECTED': ('whatsapp_connected', 'WhatsApp conectado'),
            'WHATSAPP_AUTH_SUCCESS': ('whatsapp_connected', 'Autenticacao bem-sucedida'),
            'WHATSAPP_AUTH_ERROR': ('whatsapp_error', 'Falha na autenticacao'),
            'WHATSAPP_DISCONNECTED': ('whatsapp_disconnected', 'WhatsApp desconectado')
        }

        if line in events:
            event_type, message = events[line]
            self.message_queue.put((event_type, message))
            return

        if 'QR Code salvo como imagem' in line:
            self.message_queue.put(
                ('qr_generated', 'QR Code salvo como imagem'))
        elif 'Tudo certo! WhatsApp conectado' in line:
            self.message_queue.put(
                ('whatsapp_connected', 'Conexao estabelecida'))
        elif 'Bot do Salao da Pri ativo' in line:
            self.message_queue.put(
                ('whatsapp_ready', 'Bot ativo e funcionando'))
        elif any(error in line.lower() for error in [
            'connection terminated', 'econnreset', 'session terminated',
            'protocol error', 'navigation timeout', 'timeout'
        ]):
            self.message_queue.put(
                ('whatsapp_error', f'Problema de conexao: {line}'))
        elif any(qr_issue in line.lower() for qr_issue in [
            'qr code expired', 'qr_error', 'qr timeout'
        ]):
            self.message_queue.put(('qr_expired', 'QR Code expirado'))

    def start_ngrok(self):
        """Inicia o Ngrok"""
        try:
            try:
                subprocess.run(['ngrok', 'version'],
                               check=True, capture_output=True)
            except (subprocess.CalledProcessError, FileNotFoundError):
                self.log_message("Ngrok não encontrado no sistema", "ERROR")
                self.log_message(
                    "Instale o Ngrok: https://ngrok.com/download", "INFO")
                return

            self.stop_ngrok()

            startupinfo = None
            if os.name == 'nt':
                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                startupinfo.wShowWindow = subprocess.SW_HIDE

            self.processes['ngrok'] = subprocess.Popen(
                ['ngrok', 'http', '8000', '--log=stdout'],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                startupinfo=startupinfo
            )

            self.status['ngrok'] = True
            self.log_message("Ngrok iniciado, obtendo URL pública...", "INFO")

            threading.Thread(target=self.delayed_get_ngrok_url,
                             daemon=True).start()

        except Exception as e:
            self.log_message(f"Erro ao iniciar Ngrok: {str(e)}", "ERROR")

    def stop_ngrok(self):
        """Para o Ngrok"""
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
            self.log_message("Ngrok parado", "INFO")

    def delayed_get_ngrok_url(self):
        """Obtém URL do Ngrok com múltiplas tentativas"""
        max_attempts = 10
        for attempt in range(max_attempts):
            time.sleep(2)
            if self.get_ngrok_url():
                break
            self.log_message(
                f"Tentativa {attempt + 1}/{max_attempts} para obter URL...",
                "INFO"
            )
        else:
            self.log_message(
                "Não foi possível obter URL pública após múltiplas tentativas",
                "WARNING"
            )

    def get_ngrok_url(self):
        """Obtém URL pública do Ngrok"""
        try:
            response = requests.get(
                'http://localhost:4040/api/tunnels', timeout=5)
            if response.status_code == 200:
                tunnels = response.json()['tunnels']
                if tunnels:
                    public_url = tunnels[0]['public_url']
                    self.ngrok_url.set(public_url)
                    self.save_routes(public_url)
                    self.log_message(
                        f"URL pública obtida: {public_url}", "SUCCESS")
                    return True
            return False

        except Exception as e:
            self.log_message(
                f"Erro ao obter URL do Ngrok: {str(e)}", "WARNING")
            return False

    def update_all_status(self):
        """Atualiza todos os indicadores visuais"""
        status_colors = {
            True: '#28a745',
            False: '#dc3545'
        }

        self.status_servidor.config(fg=status_colors[self.status['servidor']])
        self.status_chatbot.config(fg=status_colors[self.status['chatbot']])
        self.status_ngrok.config(fg=status_colors[self.status['ngrok']])

        self.update_status_display()

    # --------------------------------------------------------------------------------
    # CAPTURA DE HORÁRIOS
    # --------------------------------------------------------------------------------

    def run_hours_capture(self, weeks, is_loop=False, interval_minutes=5):
        """Inicia a captura de horários"""
        try:
            if not os.path.exists('get_hours.py'):
                messagebox.showerror(
                    "Erro", "Arquivo get_hours.py não encontrado!")
                return

            if self.hours_loop_active:
                self.stop_hours_capture()
                time.sleep(2)

            if is_loop:
                self.hours_loop_active = True
                self.log_message(
                    f"Iniciando loop automático: {interval_minutes} min, {weeks} semanas",
                    "SYSTEM"
                )
                self.hours_status_label.config(
                    text=f"Status: Loop Ativo ({interval_minutes}min)"
                )

                self.hours_capture_thread = threading.Thread(
                    target=self._hours_loop_worker,
                    args=(weeks, interval_minutes),
                    daemon=True
                )
                self.hours_capture_thread.start()

            else:
                self.log_message(
                    f"Iniciando captura única: {weeks} semanas", "SYSTEM")
                self.hours_status_label.config(text="Status: Capturando...")

                self.hours_capture_thread = threading.Thread(
                    target=self._single_capture_worker,
                    args=(weeks,),
                    daemon=True
                )
                self.hours_capture_thread.start()

        except Exception as e:
            self.log_message(
                f"Erro ao iniciar captura de horários: {str(e)}", "ERROR")

    def _single_capture_worker(self, weeks):
        """Worker para captura única"""
        try:
            import sys
            import importlib.util

            spec = importlib.util.spec_from_file_location(
                "get_hours", "get_hours.py")
            get_hours_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(get_hours_module)

            captura = get_hours_module.CapturaHorariosAutomatica()

            EMAIL = "Priscilamalzoni1309@gmail.com"
            SENHA = "Aruiva89"

            sucesso = captura.executar_captura_completa(EMAIL, SENHA, weeks)

            if sucesso:
                self.message_queue.put(
                    ('log',
                     f"Captura de {weeks} semanas concluída com sucesso!")
                )
                self.root.after(
                    0,
                    lambda: self.hours_status_label.config(
                        text="Status: Concluído")
                )
            else:
                self.message_queue.put(('log', "Falha na captura de horários"))
                self.root.after(
                    0,
                    lambda: self.hours_status_label.config(text="Status: Erro")
                )

        except Exception as e:
            self.message_queue.put(('log', f"Erro na captura: {str(e)}"))
            self.root.after(
                0,
                lambda: self.hours_status_label.config(text="Status: Erro")
            )
        finally:
            self.root.after(
                5000,
                lambda: self.hours_status_label.config(text="Status: Parado")
            )

    def _hours_loop_worker(self, weeks, interval_minutes):
        """Worker para loop automático"""
        try:
            import sys
            import importlib.util

            spec = importlib.util.spec_from_file_location(
                "get_hours", "get_hours.py")
            get_hours_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(get_hours_module)

            captura = get_hours_module.CapturaHorariosAutomatica()

            EMAIL = "Priscilamalzoni1309@gmail.com"
            SENHA = "Aruiva89"

            cycle_count = 0

            while self.hours_loop_active:
                try:
                    cycle_count += 1
                    self.message_queue.put(
                        ('log', f"Ciclo {cycle_count}: Iniciando captura...")
                    )

                    self.root.after(
                        0,
                        lambda c=cycle_count: self.hours_status_label.config(
                            text=f"Status: Loop Ativo - Ciclo {c}"
                        )
                    )

                    sucesso = captura.executar_captura_completa(
                        EMAIL, SENHA, weeks)

                    if sucesso:
                        self.message_queue.put(
                            ('log',
                             f"Ciclo {cycle_count} concluído com sucesso")
                        )
                    else:
                        self.message_queue.put(
                            ('log', f"Falha no ciclo {cycle_count}"))

                    if self.hours_loop_active:
                        self.message_queue.put(
                            ('log',
                             f"Aguardando {interval_minutes} minutos...")
                        )

                        for i in range(interval_minutes * 60):
                            if not self.hours_loop_active:
                                break
                            time.sleep(1)

                            if i % 30 == 0:
                                remaining_minutes = (
                                    interval_minutes * 60 - i) // 60
                                remaining_seconds = (
                                    interval_minutes * 60 - i) % 60
                                self.root.after(
                                    0,
                                    lambda m=remaining_minutes, s=remaining_seconds, c=cycle_count:
                                    self.hours_status_label.config(
                                        text=f"Ciclo {c} - Próximo em {m:02d}:{s:02d}"
                                    )
                                )

                except Exception as e:
                    self.message_queue.put(
                        ('log', f"Erro no ciclo {cycle_count}: {str(e)}")
                    )

                    if self.hours_loop_active:
                        self.message_queue.put(
                            ('log', "Aguardando 2 minutos antes de tentar novamente...")
                        )
                        time.sleep(120)

        except Exception as e:
            self.message_queue.put(
                ('log', f"Erro fatal no loop de horários: {str(e)}")
            )
        finally:
            self.hours_loop_active = False
            self.root.after(
                0,
                lambda: self.hours_status_label.config(text="Status: Parado")
            )
            self.message_queue.put(
                ('log', "Loop de captura de horários parado"))

    def stop_hours_capture(self):
        """Para a captura de horários"""
        if self.hours_loop_active:
            self.hours_loop_active = False
            self.log_message(
                "Parando loop de captura de horários...", "SYSTEM")

            if self.hours_capture_thread and self.hours_capture_thread.is_alive():
                self.hours_capture_thread.join(timeout=5)

            self.hours_status_label.config(text="Status: Parado")
            self.log_message("Loop de captura de horários parado", "SYSTEM")
        else:
            self.log_message("Nenhum loop de captura ativo", "WARNING")

    # --------------------------------------------------------------------------------
    # UTILIDADES
    # --------------------------------------------------------------------------------

    def open_local_site(self):
        """Abre o site local"""
        if not self.status['servidor']:
            messagebox.showwarning(
                "Aviso",
                "Servidor não está rodando!\nInicie o servidor primeiro."
            )
            return

        webbrowser.open(self.local_url.get())
        self.log_message("Site local aberto no navegador", "INFO")

    def open_public_site(self):
        """Abre o site público"""
        if not self.ngrok_url.get():
            messagebox.showwarning(
                "Aviso",
                "URL público não disponível!\nInicie o Ngrok primeiro e aguarde a URL ser gerada."
            )
            return

        webbrowser.open(self.ngrok_url.get())
        self.log_message("Site público aberto no navegador", "INFO")

    def open_admin_panel(self):
        """Abre o painel administrativo no navegador"""
        try:
            admin_url = None

            if self.ngrok_url.get():
                admin_url = f"{self.ngrok_url.get()}/admin.html"
                webbrowser.open(admin_url)
                self.log_message(
                    f"Painel administrativo aberto (público): {admin_url}",
                    "INFO"
                )
            elif self.status['servidor']:
                admin_url = f"{self.local_url.get()}/admin.html"
                webbrowser.open(admin_url)
                self.log_message(
                    f"Painel administrativo aberto (local): {admin_url}",
                    "INFO"
                )
            else:
                messagebox.showwarning(
                    "Aviso",
                    "Servidor não está rodando!\n\n"
                    "Inicie o servidor primeiro para acessar o painel administrativo."
                )
        except Exception as e:
            self.log_message(
                f"Erro ao abrir painel administrativo: {str(e)}",
                "ERROR"
            )
            messagebox.showerror(
                "Erro",
                f"Não foi possível abrir o painel:\n{str(e)}"
            )

    def show_qr_window(self):
        """Mostra janela do QR Code"""
        if not self.qr_window or not hasattr(self.qr_window, 'window'):
            self.qr_window = QRCodeWindow(self)
        else:
            try:
                if not self.qr_window.window.winfo_exists():
                    self.qr_window = QRCodeWindow(self)
                else:
                    self.qr_window.window.lift()
                    self.qr_window.window.focus_set()
            except tk.TclError:
                self.qr_window = QRCodeWindow(self)

        if self.status['chatbot']:
            self.qr_window.update_status(
                "ChatBot rodando - QR Code deve aparecer em breve",
                'blue'
            )
        else:
            self.qr_window.update_status(
                "Inicie o chatbot primeiro para gerar QR Code",
                'orange'
            )

    def open_hours_json(self):
        """Abre o arquivo JSON de horários"""
        try:
            if os.path.exists('horarios_disponiveis.json'):
                if os.name == 'nt':
                    os.startfile('horarios_disponiveis.json')
                else:
                    subprocess.run(['xdg-open', 'horarios_disponiveis.json'])
                self.log_message(
                    "Arquivo horarios_disponiveis.json aberto", "INFO")
            else:
                messagebox.showwarning(
                    "Aviso",
                    "Arquivo horarios_disponiveis.json não encontrado!"
                )
        except Exception as e:
            self.log_message(f"Erro ao abrir arquivo: {str(e)}", "ERROR")

    # --------------------------------------------------------------------------------
    # GERENCIAMENTO DE ROTAS
    # --------------------------------------------------------------------------------

    def load_routes(self):
        """Carrega rotas do arquivo JSON"""
        try:
            if os.path.exists('rotas.json'):
                with open('rotas.json', 'r', encoding='utf-8') as f:
                    routes = json.load(f)
                    if 'ngrok_url' in routes and routes['ngrok_url']:
                        self.ngrok_url.set(routes['ngrok_url'])
                        self.log_message(
                            "Rotas carregadas do arquivo rotas.json", "INFO")
        except Exception as e:
            self.log_message(f"Erro ao carregar rotas: {str(e)}", "WARNING")

    def save_routes(self, ngrok_url):
        """Salva rotas no arquivo JSON"""
        try:
            routes = {
                'ngrok_url': ngrok_url,
                'local_url': self.local_url.get(),
                'last_updated': datetime.now().isoformat(),
                'admin_password': os.getenv('PRI_ADMIN_PASSWORD', 'pri2025@admin'),
                'version': '2.2',
                'services': self.status
            }

            with open('rotas.json', 'w', encoding='utf-8') as f:
                json.dump(routes, f, indent=2, ensure_ascii=False)

            self.log_message("Rotas salvas em rotas.json", "SUCCESS")

        except Exception as e:
            self.log_message(f"Erro ao salvar rotas: {str(e)}", "ERROR")


# ========================================================================================
# FUNÇÃO PRINCIPAL
# ========================================================================================

def main():
    """Função principal com verificações de dependências"""

    try:
        
        dependencies_ok = True

        # Verifica PIL
        try:
            from PIL import Image, ImageTk
        except ImportError:
            messagebox.showerror(
                "Dependência Faltante",
                "Pillow não encontrado!\n\n"
                "Execute no terminal:\n"
                "pip install Pillow\n\n"
                "Ou se estiver usando conda:\n"
                "conda install pillow"
            )
            dependencies_ok = False

        # Verifica Node.js
        try:
            result = subprocess.run(
                ['node', '--version'],
                check=True,
                capture_output=True,
                text=True
            )
            node_version = result.stdout.strip()
        except (subprocess.CalledProcessError, FileNotFoundError):
            messagebox.showerror(
                "Dependência Faltante",
                "Node.js não encontrado!\n\n"
                "Por favor, instale o Node.js:\n"
                "https://nodejs.org/\n\n"
                "Versão recomendada: LTS (Long Term Support)"
            )
            dependencies_ok = False

        if not dependencies_ok:
            return

        # Verifica módulos Node.js
        if not os.path.exists('node_modules'):
            response = messagebox.askyesno(
                "Módulos Não Instalados",
                "Módulos do Node.js não encontrados!\n\n"
                "É necessário executar 'npm install' primeiro.\n\n"
                "Deseja continuar mesmo assim?\n"
                "(O chatbot pode não funcionar corretamente)"
            )
            if not response:
                return

        # Cria a aplicação
        root = tk.Tk()

        try:
            root.iconbitmap('icon.ico')
        except:
            pass

        app = PriMalzoniControlPanel(root)

        app.update_all_status()
        app.log_message(
            "Painel de Controle Pri Malzoni v2.2 iniciado", "SYSTEM")
        app.log_message(f"Node.js {node_version} detectado", "SYSTEM")
        app.log_message("Interface modernizada e otimizada", "SYSTEM")

        def on_closing():
            if messagebox.askokcancel(
                "Confirmar",
                "Deseja parar todos os serviços e fechar o painel?"
            ):
                app.log_message("Encerrando aplicação...", "SYSTEM")
                app.stop_all()

                if app.hours_loop_active:
                    app.stop_hours_capture()

                time.sleep(2)
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
        messagebox.showerror(
            "Erro Fatal",
            f"Erro crítico ao iniciar o painel:\n\n{str(e)}\n\n"
            "Verifique as dependências e tente novamente."
        )


if __name__ == "__main__":
    main()
