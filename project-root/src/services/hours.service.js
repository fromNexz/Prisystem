from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import time
import json
import re
import threading
from datetime import datetime, timedelta

class CapturaHorariosAutomatica:
    def __init__(self):
        self.chrome_options = Options()
        self.chrome_options.add_argument("--start-maximized")
        self.chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        self.chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        self.chrome_options.add_experimental_option('useAutomationExtension', False)
        
        self.driver = None
        self.todos_horarios_disponiveis = []  # Lista para armazenar horários de todas as semanas
        self.hora_inicio = 7 * 60  # 7:00 em minutos (mantido para cálculos internos)
        self.hora_fim = 23 * 60    # 23:00 em minutos (mantido para cálculos internos)
        self.executando = False
        self.thread_loop = None
        self.data_hoje = datetime.now().date()

    def obter_horarios_trabalho(self, data_obj):
        """Retorna os horários de trabalho baseado no dia da semana"""
        if not data_obj:
            return []
        
        dia_semana = data_obj.weekday()  # 0=segunda, 1=terça, ..., 6=domingo
        
        horarios = []
        
        if dia_semana in [0, 2, 4]:  # Segunda, quarta, sexta
            # Das 8h ao meio dia (8:00 às 12:00)
            horarios.extend(self.gerar_slots_periodo(8 * 60, 12 * 60))
            # Das 14h às 18h
            horarios.extend(self.gerar_slots_periodo(14 * 60, 18 * 60))
            
        elif dia_semana in [1, 3]:  # Terça, quinta
            # Das 9h ao meio dia (9:00 às 12:00)
            horarios.extend(self.gerar_slots_periodo(9 * 60, 12 * 60))
            # Das 14h às 19h
            horarios.extend(self.gerar_slots_periodo(14 * 60, 19 * 60))
            
        elif dia_semana == 5:  # Sábado
            # Das 9h ao meio dia (9:00 às 12:00)
            horarios.extend(self.gerar_slots_periodo(9 * 60, 12 * 60))
            
        # Domingo (dia_semana == 6) retorna lista vazia
        
        return horarios

    def gerar_slots_periodo(self, inicio_min, fim_min):
        """Gera slots de 10 em 10 minutos para um período específico"""
        slots = []
        slot_idx = 0
        
        for total_min in range(inicio_min, fim_min, 10):
            hora = total_min // 60
            minuto = total_min % 60
            horario = f"{hora:02d}:{minuto:02d}"
            slots.append({
                "slot_number": slot_idx,
                "horario": horario,
                "ocupado": False,
                "minutos_totais": total_min
            })
            slot_idx += 1
        
        return slots

    def to_minutos(self, hhmm):
        """Converte HH:MM para minutos"""
        try:
            h, m = map(int, hhmm.strip().split(":"))
            return h * 60 + m
        except (ValueError, AttributeError):
            return None

    def log(self, mensagem):
        """Log com timestamp"""
        timestamp = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        print(f"[{timestamp}] {mensagem}")

    def extrair_data_do_texto(self, dia_texto):
        """Extrai a data do texto do dia (ex: 'Seg 18/9' -> datetime)"""
        try:
            # Remove espaços e converte para minúsculas
            dia_texto = dia_texto.strip()
            self.log(f"🔍 Analisando texto do dia: '{dia_texto}'")
            
            # Padrões comuns de data
            padroes = [
                r'(\w+)\s+(\d{1,2})/(\d{1,2})/(\d{4})',  # Seg 18/9/2025
                r'(\w+)\s+(\d{1,2})/(\d{1,2})',  # Seg 18/9
                r'(\d{1,2})/(\d{1,2})/(\d{4})',  # 18/9/2025
                r'(\d{1,2})/(\d{1,2})',  # 18/9
                r'(\w+)\s+(\d{1,2})-(\d{1,2})',  # Seg 18-9
                r'(\d{1,2})-(\d{1,2})-(\d{4})',  # 18-9-2025
                r'(\d{1,2})-(\d{1,2})',  # 18-9
            ]
            
            for i, padrao in enumerate(padroes):
                match = re.search(padrao, dia_texto)
                if match:
                    self.log(f" Padrão {i+1} encontrado: {match.groups()}")
                    
                    if len(match.groups()) == 4:  # Com dia da semana e ano
                        dia = int(match.group(2))
                        mes = int(match.group(3))
                        ano = int(match.group(4))
                    elif len(match.groups()) == 3:  # Com dia da semana OU data com ano
                        if match.group(1).isalpha():  # Com dia da semana
                            dia = int(match.group(2))
                            mes = int(match.group(3))
                            ano = datetime.now().year
                            # Se mês passou, assume próximo ano
                            if mes < datetime.now().month:
                                ano += 1
                        else:  # Data com ano
                            dia = int(match.group(1))
                            mes = int(match.group(2))
                            ano = int(match.group(3))
                    elif len(match.groups()) == 2:  # Apenas data
                        dia = int(match.group(1))
                        mes = int(match.group(2))
                        ano = datetime.now().year
                        # Se mês passou, assume próximo ano
                        if mes < datetime.now().month:
                            ano += 1
                    
                    try:
                        data_resultado = datetime(ano, mes, dia).date()
                        self.log(f" Data extraída: {data_resultado.strftime('%d/%m/%Y')}")
                        return data_resultado
                    except ValueError as e:
                        self.log(f" Data inválida: dia={dia}, mes={mes}, ano={ano} - {e}")
                        continue
            
            self.log(f" Nenhum padrão de data encontrado em: '{dia_texto}'")
            return None
            
        except (ValueError, AttributeError) as e:
            self.log(f" Erro ao extrair data de '{dia_texto}': {e}")
            return None

    def eh_data_futura(self, data_str):
        """Verifica se a data é futura (incluindo hoje)"""
        data = self.extrair_data_do_texto(data_str)
        if data is None:
            return False
        return data >= self.data_hoje

    def iniciar_driver(self):
        """Inicializa o driver do Chrome"""
        self.driver = webdriver.Chrome(options=self.chrome_options)
        self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

    def fazer_login(self, email, senha):
        """Realiza login no sistema AppBeleza"""
        try:
            self.driver.get("https://sistema.appbeleza.com.br")
            
            # Aguarda elementos de login carregarem
            wait = WebDriverWait(self.driver, 10)
            
            email_field = wait.until(EC.presence_of_element_located((By.ID, "login-name")))
            senha_field = self.driver.find_element(By.ID, "login-pass")
            
            email_field.send_keys(email)
            senha_field.send_keys(senha)
            
            submit_btn = self.driver.find_element(By.XPATH, "//button[@type='submit']")
            submit_btn.click()
            
            time.sleep(5)
            return True
            
        except TimeoutException:
            self.log(" Timeout no login - elementos não encontrados")
            return False
        except Exception as e:
            self.log(f" Erro no login: {e}")
            return False

    def navegar_para_agenda(self):
        """Navega para a agenda semanal"""
        try:
            self.driver.get("https://sistema.appbeleza.com.br/index.php#/agenda")
            time.sleep(5)
            
            # Clica na visualização semanal
            btn_semana = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.ID, "btnAgendaWeek"))
            )
            btn_semana.click()
            time.sleep(3)
            return True
            
        except Exception as e:
            self.log(f" Erro navegando para agenda: {e}")
            return False

    def avancar_semana(self):
        """Avança para a próxima semana"""
        try:
            # Tenta diferentes seletores para o botão Next
            seletores_next = [
                "#btnAgendaNext",
                ".btn-next",
                "button[id*='Next']",
                "button[class*='next']",
                ".fc-button-next"
            ]
            
            btn_next = None
            for selector in seletores_next:
                try:
                    btn_next = WebDriverWait(self.driver, 5).until(
                        EC.element_to_be_clickable((By.CSS_SELECTOR, selector))
                    )
                    self.log(f" Botão Next encontrado com seletor: {selector}")
                    break
                except TimeoutException:
                    continue
            
            if not btn_next:
                self.log(" Botão Next não encontrado com nenhum seletor")
                return False
                
            # Scroll para garantir que o botão está visível
            self.driver.execute_script("arguments[0].scrollIntoView(true);", btn_next)
            time.sleep(1)
            
            # Clica no botão
            btn_next.click()
            time.sleep(4)  # Aguarda mais tempo para carregar
            
            self.log(" Avançou para próxima semana")
            return True
            
        except Exception as e:
            self.log(f" Erro ao avançar semana: {e}")
            return False

    def eh_domingo(self, dia_texto):
        """Verifica se o dia é domingo"""
        indicadores_domingo = ['dom', 'domingo', 'sun']
        dia_lower = dia_texto.lower()
        return any(indicador in dia_lower for indicador in indicadores_domingo)

    def capturar_estrutura_dias(self):
        """Captura a estrutura dos dias da semana (exceto domingos e datas passadas)"""
        try:
            # Tenta diferentes seletores para encontrar os cabeçalhos dos dias
            seletores_possiveis = [
                "tr.fc-first.fc-last th",
                ".fc-day-header",
                ".fc-widget-header",
                "th.fc-day-header",
                ".fc-agenda-axis + th"
            ]
            
            dias_headers = []
            for selector in seletores_possiveis:
                dias_headers = self.driver.find_elements(By.CSS_SELECTOR, selector)
                if dias_headers:
                    self.log(f" Encontrou cabeçalhos com seletor: {selector}")
                    break
            
            if not dias_headers:
                self.log(" Não foi possível encontrar cabeçalhos dos dias")
                return []
            
            dias_map = []
            offset = 0.0

            for idx, th in enumerate(dias_headers):
                dia_texto = th.text.strip()
                
                # Captura largura de forma mais robusta
                try:
                    largura_css = th.value_of_css_property("width")
                    if largura_css == 'auto' or not largura_css:
                        # Se for 'auto', usa largura padrão ou calcula baseado no tamanho da tela
                        largura = 120.0  # Largura padrão
                        self.log(f" Largura 'auto' detectada para {dia_texto}, usando largura padrão: {largura}px")
                    else:
                        largura = float(largura_css.replace("px", "").replace("em", "").replace("rem", ""))
                except (ValueError, AttributeError):
                    largura = 120.0  # Largura de fallback
                    self.log(f" Erro ao capturar largura de {dia_texto}, usando largura padrão: {largura}px")
                
                self.log(f"📏 {dia_texto}: largura = {largura}px, offset = {offset}px")
                
                # Pula domingos
                if self.eh_domingo(dia_texto):
                    self.log(f" Pulando domingo: {dia_texto}")
                    offset += largura
                    continue
                
                # Pula datas passadas
                if not self.eh_data_futura(dia_texto):
                    self.log(f" Pulando data passada: {dia_texto}")
                    offset += largura
                    continue
                
                # Extrai data para usar no JSON final
                data_obj = self.extrair_data_do_texto(dia_texto)
                data_formatada = data_obj.strftime("%d/%m/%Y") if data_obj else dia_texto
                
                dias_map.append({
                    "index": idx,
                    "dia": dia_texto,
                    "data": data_formatada,
                    "data_obj": data_obj,
                    "left_offset": offset,
                    "largura": largura
                })
                offset += largura

            # Cria slots baseado nos horários de trabalho da Pri
            dias_com_slots = []
            for dia in dias_map:
                # Gera slots baseado na agenda de trabalho
                slots = self.obter_horarios_trabalho(dia["data_obj"])
                
                # Se não há horários de trabalho para este dia, pula
                if not slots:
                    self.log(f" Sem horários de trabalho para {dia['dia']} ({dia['data']})")
                    continue
                
                dias_com_slots.append({
                    "dia": dia["dia"],
                    "data": dia["data"],
                    "data_obj": dia["data_obj"],
                    "left_offset": dia["left_offset"],
                    "largura": dia["largura"],
                    "slots": slots
                })
                
                # Log dos períodos de trabalho
                horarios_str = [slot["horario"] for slot in slots]
                self.log(f" {dia['dia']} ({dia['data']}): {len(slots)} slots ({horarios_str[0]} a {horarios_str[-1]})")

            if dias_com_slots:
                dias_validos = [f"{d['dia']} ({d['data']})" for d in dias_com_slots]
                self.log(f" Dias válidos capturados: {dias_validos}")
            else:
                self.log(" Nenhum dia válido encontrado nesta semana")
            
            return dias_com_slots
            
        except Exception as e:
            self.log(f" Erro capturando estrutura dos dias: {e}")
            return []

    def capturar_eventos_ocupados(self, dias_com_slots):
        """Captura todos os tipos de eventos ocupados"""
        if not dias_com_slots:
            return 0
            
        eventos_encontrados = 0
        
        # Lista de seletores para diferentes tipos de eventos
        seletores_eventos = [
            "div.fc-event",
            "div.fc-event-inner",
            "div.hasmenu",
            ".fc-agenda-slots .fc-event",
        ]
        
        # Cores de fundo que indicam ocupação
        cores_ocupadas = [
            "rgb(255, 0, 0)",     # Vermelho
            "rgb(255, 165, 0)",   # Laranja  
            "rgb(128, 128, 128)", # Cinza
            "rgb(0, 0, 255)",     # Azul
        ]

        for selector in seletores_eventos:
            try:
                eventos = self.driver.find_elements(By.CSS_SELECTOR, selector)
                
                for evento in eventos:
                    try:
                        # Verifica se já foi processado
                        if hasattr(evento, '_processado'):
                            continue
                        
                        # Marca como processado
                        evento._processado = True
                        
                        # Método 1: Eventos com classe hasmenu
                        if self.processar_evento_hasmenu(evento, dias_com_slots):
                            eventos_encontrados += 1
                            continue
                        
                        # Método 2: Eventos por cor de fundo
                        if self.processar_evento_por_cor(evento, cores_ocupadas, dias_com_slots):
                            eventos_encontrados += 1
                            continue
                        
                        # Método 3: Eventos por posição e tamanho
                        if self.processar_evento_por_posicao(evento, dias_com_slots):
                            eventos_encontrados += 1
                            continue
                            
                    except Exception as e:
                        continue
                        
            except Exception as e:
                continue
        
        self.log(f" Total de eventos ocupados encontrados: {eventos_encontrados}")
        return eventos_encontrados

    def processar_evento_hasmenu(self, evento, dias_com_slots):
        """Processa eventos com classe hasmenu"""
        try:
            classes = evento.get_attribute("class") or ""
            if "hasmenu" not in classes:
                return False
                
            horario_element = evento.find_element(By.CLASS_NAME, "fc-event-time")
            horario_texto = horario_element.text.strip()
            
            return self.marcar_horario_ocupado(evento, horario_texto, "hasmenu", dias_com_slots)
            
        except NoSuchElementException:
            return False
        except Exception as e:
            return False

    def processar_evento_por_cor(self, evento, cores_ocupadas, dias_com_slots):
        """Processa eventos pela cor de fundo"""
        try:
            bg_color = evento.value_of_css_property("background-color")
            
            if bg_color not in cores_ocupadas:
                return False
            
            horario_texto = self.extrair_horario_do_elemento(evento)
            if not horario_texto:
                return False
                
            return self.marcar_horario_ocupado(evento, horario_texto, f"cor:{bg_color}", dias_com_slots)
            
        except Exception as e:
            return False

    def processar_evento_por_posicao(self, evento, dias_com_slots):
        """Processa eventos pela posição e características visuais"""
        try:
            if not evento.is_displayed():
                return False
                
            width = float(evento.value_of_css_property("width").replace("px", ""))
            height = float(evento.value_of_css_property("height").replace("px", ""))
            
            if width < 10 or height < 10:
                return False
            
            horario_texto = self.extrair_horario_do_elemento(evento)
            if not horario_texto:
                return self.inferir_horario_por_posicao(evento, dias_com_slots)
                
            return self.marcar_horario_ocupado(evento, horario_texto, "posicao", dias_com_slots)
            
        except Exception as e:
            return False

    def extrair_horario_do_elemento(self, evento):
        """Extrai horário de um elemento"""
        seletores_horario = [
            ".fc-event-time",
            ".fc-time",
            ".time",
            "[class*='time']",
            "[class*='hora']"
        ]
        
        for selector in seletores_horario:
            try:
                horario_element = evento.find_element(By.CSS_SELECTOR, selector)
                horario_texto = horario_element.text.strip()
                if horario_texto and "-" in horario_texto:
                    return horario_texto
            except NoSuchElementException:
                continue
        
        texto_completo = evento.text.strip()
        
        padroes = [
            r'(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})',
            r'(\d{1,2}:\d{2})\s*às?\s*(\d{1,2}:\d{2})',
            r'(\d{1,2}h\d{2})\s*-\s*(\d{1,2}h\d{2})',
        ]
        
        for padrao in padroes:
            match = re.search(padrao, texto_completo)
            if match:
                inicio = match.group(1).replace("h", ":")
                fim = match.group(2).replace("h", ":")
                return f"{inicio} - {fim}"
        
        return None

    def inferir_horario_por_posicao(self, evento, dias_com_slots):
        """Infere horário baseado na posição"""
        try:
            # Captura propriedades CSS de forma mais robusta
            def get_css_value_safe(elemento, propriedade, default=0.0):
                try:
                    value = elemento.value_of_css_property(propriedade)
                    if value == 'auto' or not value:
                        return default
                    return float(value.replace("px", "").replace("em", "").replace("rem", ""))
                except (ValueError, AttributeError):
                    return default
            
            left_px = get_css_value_safe(evento, "left", 0.0)
            top_px = get_css_value_safe(evento, "top", 0.0)
            height_px = get_css_value_safe(evento, "height", 30.0)
            
            dia_encontrado = None
            for dia in dias_com_slots:
                if dia["left_offset"] <= left_px < dia["left_offset"] + dia["largura"]:
                    dia_encontrado = dia
                    break
            
            if not dia_encontrado:
                return False
            
            minutos_por_pixel = 2
            horario_inicio_min = self.hora_inicio + (top_px * minutos_por_pixel)
            duracao_min = height_px * minutos_por_pixel
            
            for slot in dia_encontrado["slots"]:
                slot_min = slot["minutos_totais"]
                if horario_inicio_min <= slot_min < horario_inicio_min + duracao_min:
                    slot["ocupado"] = True
            
            self.log(f" Horário inferido por posição no dia {dia_encontrado['dia']}")
            return True
            
        except Exception as e:
            self.log(f" Erro ao inferir horário por posição: {e}")
            return False

    def marcar_horario_ocupado(self, evento, horario_texto, tipo, dias_com_slots):
        """Marca horários como ocupados"""
        try:
            if " - " not in horario_texto:
                return False

            inicio_str, fim_str = horario_texto.split(" - ")
            inicio_str = inicio_str.strip().replace("-", "").strip()
            fim_str = fim_str.strip().replace("-", "").strip()

            inicio_min = self.to_minutos(inicio_str)
            fim_min = self.to_minutos(fim_str)
            
            if inicio_min is None or fim_min is None:
                return False

            # Captura posição de forma mais robusta
            try:
                left_css = evento.value_of_css_property("left")
                if left_css == 'auto' or not left_css:
                    left_px = 0.0
                else:
                    left_px = float(left_css.replace("px", "").replace("em", "").replace("rem", ""))
            except (ValueError, AttributeError):
                left_px = 0.0
            
            for dia in dias_com_slots:
                if dia["left_offset"] <= left_px < dia["left_offset"] + dia["largura"]:
                    slots_marcados = 0
                    for slot in dia["slots"]:
                        slot_min = slot["minutos_totais"]
                        if inicio_min <= slot_min < fim_min:
                            slot["ocupado"] = True
                            slots_marcados += 1
                    
                    self.log(f" Evento {tipo}: {inicio_str} até {fim_str} no dia {dia['dia']} ({slots_marcados} slots)")
                    return True
            
            return False
            
        except Exception as e:
            self.log(f" Erro ao marcar horário ocupado: {e}")
            return False

    def capturar_multiplas_semanas(self, num_semanas=3):
        """Captura horários de múltiplas semanas"""
        self.todos_horarios_disponiveis = []
        
        for semana in range(num_semanas):
            self.log(f"Capturando semana {semana + 1} de {num_semanas}")
            
            # Captura estrutura da semana atual
            dias_com_slots = self.capturar_estrutura_dias()
            
            if not dias_com_slots:
                self.log(f" Nenhum dia válido na semana {semana + 1}, pulando...")
                if semana < num_semanas - 1:  # Se não é a última semana, avança
                    self.avancar_semana()
                continue
            
            # Captura eventos ocupados
            self.capturar_eventos_ocupados(dias_com_slots)
            
            # Adiciona à lista geral, organizando por data
            for dia in dias_com_slots:
                livres = [slot for slot in dia["slots"] if not slot["ocupado"]]
                if livres:  # Só adiciona se houver horários livres
                    self.todos_horarios_disponiveis.append({
                        "dia": dia["dia"],
                        "data": dia["data"],
                        "data_obj": dia["data_obj"],
                        "horarios_livres": [slot["horario"] for slot in livres],
                        "total_livres": len(livres),
                        "total_ocupados": len(dia["slots"]) - len(livres)
                    })
            
            # Avança para próxima semana (exceto na última)
            if semana < num_semanas - 1:
                if not self.avancar_semana():
                    self.log(f" Erro ao avançar para semana {semana + 2}, parando captura")
                    break
        
        # Ordena por data
        self.todos_horarios_disponiveis.sort(key=lambda x: x["data_obj"] if x["data_obj"] else datetime.min.date())
        
        total_dias = len(self.todos_horarios_disponiveis)
        self.log(f" Captura concluída: {total_dias} dias com horários disponíveis")
        
        return len(self.todos_horarios_disponiveis) > 0

    def gerar_json_disponibilidade(self, arquivo_saida="horarios_disponiveis.json"):
        """Gera arquivo JSON com horários disponíveis de múltiplas semanas"""
        try:
            if not self.todos_horarios_disponiveis:
                self.log(" Nenhum horário disponível para salvar")
                return False

            # Prepara dados para JSON (remove data_obj que não é serializável)
            dados_json = []
            for item in self.todos_horarios_disponiveis:
                dados_json.append({
                    "dia": item["dia"],
                    "data": item["data"],
                    "horarios_livres": item["horarios_livres"],
                    "total_livres": item["total_livres"],
                    "total_ocupados": item["total_ocupados"]
                })

            # Adiciona informações extras
            resultado_final = {
                "data_captura": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
                "data_referencia": self.data_hoje.strftime("%d/%m/%Y"),
                "total_dias": len(dados_json),
                "horarios_trabalho": {
                    "segunda_quarta_sexta": "8:00-12:00 e 14:00-18:00",
                    "terca_quinta": "9:00-12:00 e 14:00-19:00", 
                    "sabado": "9:00-12:00",
                    "domingo": "Fechado"
                },
                "dias": dados_json
            }

            # Salva arquivo
            with open(arquivo_saida, 'w', encoding='utf-8') as f:
                json.dump(resultado_final, f, indent=4, ensure_ascii=False)

            self.log(f" Arquivo salvo: {arquivo_saida}")
            
            # Resumo por dia
            for item in dados_json:
                self.log(f"{item['data']} - {item['dia']}: {item['total_livres']} livres, {item['total_ocupados']} ocupados")
            
            # Resumo geral
            total_livres = sum(item["total_livres"] for item in dados_json)
            total_ocupados = sum(item["total_ocupados"] for item in dados_json)
            self.log(f"RESUMO GERAL: {total_livres} horários livres, {total_ocupados} ocupados em {len(dados_json)} dias")
            
            return True
            
        except Exception as e:
            self.log(f" Erro gerando JSON: {e}")
            return False

    def executar_captura_completa(self, email, senha, num_semanas=3):
        """Executa captura completa de múltiplas semanas"""
        try:
            self.log(f" Iniciando captura de {num_semanas} semanas...")
            self.log(f"Data de referência: {self.data_hoje.strftime('%d/%m/%Y')}")
            self.log("Horários de trabalho da Pri:")
            self.log("  Segunda/Quarta/Sexta: 8h-12h e 14h-18h")
            self.log("  Terça/Quinta: 9h-12h e 14h-19h")
            self.log("  Sábado: 9h-12h")
            self.log("  Domingo: Fechado")
            
            # Inicializa driver
            self.iniciar_driver()
            
            # Login
            if not self.fazer_login(email, senha):
                return False
            
            # Navega para agenda
            if not self.navegar_para_agenda():
                return False
            
            # Captura múltiplas semanas
            if not self.capturar_multiplas_semanas(num_semanas):
                self.log(" Falha na captura de múltiplas semanas")
                return False
            
            # Gera JSON
            if not self.gerar_json_disponibilidade():
                return False
            
            self.log(" Captura completa concluída com sucesso!")
            return True
            
        except Exception as e:
            self.log(f" Erro na execução: {e}")
            return False
        finally:
            if self.driver:
                self.driver.quit()

    def loop_automatico(self, email, senha, intervalo_minutos=10, num_semanas=3):
        """Loop automático de captura a cada X minutos"""
        self.log(f" Iniciando loop automático (intervalo: {intervalo_minutos} min, semanas: {num_semanas})")
        self.executando = True
        
        while self.executando:
            try:
                # Atualiza data de referência
                self.data_hoje = datetime.now().date()
                
                # Executa captura
                sucesso = self.executar_captura_completa(email, senha, num_semanas)
                
                if sucesso:
                    self.log(" Captura do loop executada com sucesso")
                else:
                    self.log(" Falha na captura do loop")
                
                # Aguarda intervalo
                if self.executando:
                    self.log(f" Aguardando {intervalo_minutos} minutos para próxima captura...")
                    time.sleep(intervalo_minutos * 60)
                    
            except KeyboardInterrupt:
                self.log(" Loop interrompido pelo usuário")
                break
            except Exception as e:
                self.log(f" Erro no loop: {e}")
                if self.executando:
                    time.sleep(60)

    def iniciar_loop_automatico(self, email, senha, intervalo_minutos=10, num_semanas=3):
        """Inicia loop automático em thread separada"""
        if self.thread_loop and self.thread_loop.is_alive():
            self.log("Loop já está executando")
            return False
            
        self.thread_loop = threading.Thread(
            target=self.loop_automatico, 
            args=(email, senha, intervalo_minutos, num_semanas),
            daemon=True
        )
        self.thread_loop.start()
        self.log(f" Loop automático iniciado ({num_semanas} semanas, {intervalo_minutos} min)")
        return True

    def parar_loop_automatico(self):
        """Para o loop automático"""
        if self.executando:
            self.executando = False
            self.log(" Solicitando parada do loop automático...")
            
            if self.thread_loop:
                self.thread_loop.join(timeout=5)
                
            self.log(" Loop automático parado")
            return True
        else:
            self.log("Loop não estava executando")
            return False

    def status_loop(self):
        """Retorna status do loop automático"""
        if self.executando and self.thread_loop and self.thread_loop.is_alive():
            return "EXECUTANDO"
        elif self.thread_loop and self.thread_loop.is_alive():
            return "PARANDO"
        else:
            return "PARADO"

# Menu principal melhorado
def menu_principal():
    captura = CapturaHorariosAutomatica()
    
    EMAIL = "Priscilamalzoni1309@gmail.com"
    SENHA = "Aruiva89"
    
    while True:
        print("\n" + "="*60)
        print("CAPTURA AUTOMÁTICA COM FILTRO DE HORÁRIOS - SALÃO DA PRI")
        print("="*60)
        print(f"Status do loop: {captura.status_loop()}")
        print(f"Data atual: {datetime.now().strftime('%d/%m/%Y')}")
        print("Horários de trabalho:")
        print("   Seg/Qua/Sex: 8h-12h e 14h-18h")
        print("   Ter/Qui: 9h-12h e 14h-19h") 
        print("   Sáb: 9h-12h | Dom: Fechado")
        print("="*60)
        print("1 -  Captura única (2 semanas)")
        print("2 -  Captura única (3 semanas)")
        print("3 -  Captura única (4 semanas)")
        print("4 - Loop automático (10 min, 3 semanas)")
        print("5 - Loop automático (5 min, 3 semanas)")
        print("6 - Loop automático (15 min, 4 semanas)")
        print("7 -  Parar loop automático")
        print("8 - Status do sistema")
        print("0 - Sair")
        print("="*60)
        
        try:
            opcao = input("Escolha uma opção: ").strip()
            
            if opcao == "1":
                captura.executar_captura_completa(EMAIL, SENHA, 2)
                
            elif opcao == "2":
                captura.executar_captura_completa(EMAIL, SENHA, 3)
                
            elif opcao == "3":
                captura.executar_captura_completa(EMAIL, SENHA, 4)
                
            elif opcao == "4":
                captura.iniciar_loop_automatico(EMAIL, SENHA, 10, 3)
                
            elif opcao == "5":
                captura.iniciar_loop_automatico(EMAIL, SENHA, 5, 3)
                
            elif opcao == "6":
                captura.iniciar_loop_automatico(EMAIL, SENHA, 15, 4)
                
            elif opcao == "7":
                captura.parar_loop_automatico()
                
            elif opcao == "8":
                print(f"\nSTATUS DO SISTEMA:")
                print(f" Loop: {captura.status_loop()}")
                print(f" Email: {EMAIL}")
                print(f" Domingos: EXCLUÍDOS")
                print(f" Data referência: {captura.data_hoje.strftime('%d/%m/%Y')}")
                print(f" Últimos horários capturados: {len(captura.todos_horarios_disponiveis)} dias")
                print("  Horários filtrados por agenda de trabalho da Pri")
                
            elif opcao == "0":
                # Para o loop se estiver executando
                if captura.executando:
                    print(" Parando loop antes de sair...")
                    captura.parar_loop_automatico()
                print("Saindo...")
                break
                
            else:
                print(" Opção inválida!")
                
        except KeyboardInterrupt:
            print("\n Interrompido pelo usuário")
            if captura.executando:
                captura.parar_loop_automatico()
            break

if __name__ == "__main__":
    try:
        menu_principal()
    except KeyboardInterrupt:
        print("\nSistema encerrado")