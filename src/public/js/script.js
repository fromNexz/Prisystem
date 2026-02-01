
require('dotenv').config();

const firebaseConfig = {
    apiKey: "AIzaSyBYo_laDj2ZfxWZLzCJvFaPq3sj0iOCfWM",
    authDomain: "agendamentos-pri.firebaseapp.com",
    projectId: "agendamentos-pri",
    storageBucket: "agendamentos-pri.firebasestorage.app",
    messagingSenderId: "131199864323",
    appId: "1:131199864323:web:ddd2d06c7d2ac16721c836",
    measurementId: "G-9FNZV0V1JB"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let currentStep = 1;
let formData = {
    name: '',
    phone: '',
    service: null,
    date: null,
    dateFormatted: null,
    time: null
};

let availableSchedules = [];
let lastJsonHash = null;
let updateCheckInterval = null;

const serviceCategories = {
    micropigmentacao: {
        name: 'Micropigmentação',
        emoji: '✨',
        services: []
    },
    protocolos: {
        name: 'Protocolos Especiais',
        emoji: '🌸',
        services: []
    },
    depilacaoFacial: {
        name: 'Depilação Facial',
        emoji: '✨',
        services: []
    },
    depilacaoCorporal: {
        name: 'Depilação Corporal',
        emoji: '🦵',
        services: []
    },
    outros: {
        name: 'Outros Tratamentos',
        emoji: '💆‍♀️',
        services: []
    }
};

const ADMIN_PASSWORD = process.env.SENHA_ADMIN

document.addEventListener('DOMContentLoaded', function () {
    setupEventListeners();
    loadServicesFromFirestore();
    loadScheduleData();
    startUpdateChecker();
});

async function loadServicesFromFirestore() {
    try {
        const servicesSnapshot = await db.collection('services').get();

        Object.keys(serviceCategories).forEach(key => {
            serviceCategories[key].services = [];
        });

        servicesSnapshot.forEach(doc => {
            const service = doc.data();
            service.id = doc.id;

            if (serviceCategories[service.category]) {
                serviceCategories[service.category].services.push(service);
            }
        });

        console.log('Serviços carregados do Firestore:', servicesSnapshot.size, 'serviços');
        loadServices();
    } catch (error) {
        console.error('Erro ao carregar serviços do Firestore:', error);
        loadDefaultServices();
    }
}

async function loadDefaultServices() {
    const defaultServices = [
        { category: 'micropigmentacao', name: 'Avaliação para Micropigmentação Labial', desc: 'Consulta e avaliação', price: 0, duration: 30 },
        { category: 'micropigmentacao', name: 'Avaliação para Micropigmentação nas Sobrancelhas', desc: 'Consulta e avaliação', price: 0, duration: 30 },
        { category: 'micropigmentacao', name: 'Volume Express Soft', desc: 'Extensão de cílios', price: 120, duration: 90 },
        { category: 'micropigmentacao', name: 'Colocação Completa', desc: '100% dos cílios', price: 180, duration: 120 },
        { category: 'micropigmentacao', name: 'Remoção de Cílios', desc: 'Remoção completa', price: 80, duration: 60 },

        { category: 'protocolos', name: 'GlowLips (Hidragloss)', desc: '1 sessão', price: 150, duration: 30 },
        { category: 'protocolos', name: 'GlowLips (Hidragloss)', desc: '3 sessões', price: 437, duration: 30, sessions: 3 },
        { category: 'protocolos', name: 'Lash Lifting', desc: 'Curvatura + tintura + hidratação', price: 120, duration: 80 },
        { category: 'protocolos', name: 'Brow Lamination', desc: 'Fios alinhados + tintura', price: 150, duration: 90 },
        { category: 'protocolos', name: 'Pigmentação Cílios Naturais', desc: 'Tintura', price: 80, duration: 30 },
        { category: 'protocolos', name: 'Pigmentação Sobrancelhas', desc: 'Com henna ou tintura', price: 60, duration: 30 },

        { category: 'depilacaoFacial', name: 'Design Sobrancelhas', desc: 'Design profissional', price: 35, duration: 30 },
        { category: 'depilacaoFacial', name: 'Design + Henna', desc: 'Design + pigmentação', price: 50, duration: 20 },
        { category: 'depilacaoFacial', name: 'Buço', desc: 'Depilação buço', price: 10, duration: 10 },
        { category: 'depilacaoFacial', name: 'Buço + Queixo', desc: 'Combo', price: 20, duration: 20 },
        { category: 'depilacaoFacial', name: 'Nariz', desc: 'Depilação nariz', price: 15, duration: 10 },
        { category: 'depilacaoFacial', name: 'Depilação Facial Completa', desc: 'Rosto completo', price: 60, duration: 60 },
        { category: 'depilacaoFacial', name: 'Design Rena', desc: 'Design especial', price: 70, duration: 60 },

        { category: 'depilacaoCorporal', name: 'Axila', desc: 'Depilação axilas', price: 20, duration: 10 },
        { category: 'depilacaoCorporal', name: 'Meia Perna', desc: 'Até o joelho', price: 40, duration: 30 },
        { category: 'depilacaoCorporal', name: 'Perna Inteira', desc: 'Completa', price: 70, duration: 60 },
        { category: 'depilacaoCorporal', name: 'Virilha Contorno', desc: 'Básica', price: 25, duration: 30 },
        { category: 'depilacaoCorporal', name: 'Virilha Cavada', desc: 'sem perianal', price: 50, duration: 60 },
        { category: 'depilacaoCorporal', name: 'Virilha Cavada', desc: 'com perianal', price: 70, duration: 60 },
        { category: 'depilacaoCorporal', name: 'Virilha Total', desc: 'sem perianal', price: 60, duration: 60 },
        { category: 'depilacaoCorporal', name: 'Virilha Total', desc: 'com perianal', price: 70, duration: 60 },

        { category: 'outros', name: 'Limpeza de Pele', desc: 'Tratamento completo', price: 120, duration: 90 },
        { category: 'outros', name: 'Spa Lips', desc: 'Esfoliação + hidratação', price: 40, duration: 30 },
        { category: 'outros', name: 'Massagem', desc: 'Relaxante/Drenagem', price: 90, duration: 60 }
    ];

    try {
        for (const service of defaultServices) {
            await db.collection('services').add(service);
        }
        console.log('Serviços padrão salvos no Firestore');
        await loadServicesFromFirestore();
    } catch (error) {
        console.error('Erro ao salvar serviços padrão:', error);
    }
}

async function loadScheduleData() {
    try {
        const response = await fetch('./horarios_disponiveis.json?' + Date.now());

        if (response.ok) {
            const jsonData = await response.json();
            availableSchedules = jsonData.dias;
            lastJsonHash = JSON.stringify(jsonData);
            renderScheduleDays();
            console.log('Horários carregados:', availableSchedules.length, 'dias');
        } else {
            throw new Error('Arquivo não encontrado');
        }
    } catch (error) {
        console.error('Erro ao carregar horários:', error);
        useFallbackData();
    }
}

function useFallbackData() {
    const today = new Date();
    const fallbackData = [];

    for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);

        if (date.getDay() === 0) continue;

        const exampleHours = [
            "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
            "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
            "17:00", "17:30", "18:00", "18:30"
        ];

        fallbackData.push({
            dia: date.toLocaleDateString('pt-BR'),
            data: date.toLocaleDateString('pt-BR'),
            horarios_livres: exampleHours,
            total_livres: exampleHours.length
        });
    }

    availableSchedules = fallbackData;
    renderScheduleDays();
}

function startUpdateChecker() {
    updateCheckInterval = setInterval(async () => {
        try {
            const response = await fetch('./horarios_disponiveis.json?' + Date.now());
            if (response.ok) {
                const newData = await response.json();
                const newHash = JSON.stringify(newData);

                if (lastJsonHash && lastJsonHash !== newHash) {
                    availableSchedules = newData.dias;
                    renderScheduleDays();
                    console.log('Horários atualizados automaticamente');
                }
                lastJsonHash = newHash;
            }
        } catch (error) {
            console.error('Erro ao verificar atualizações:', error);
        }
    }, 15000);
}

function setupEventListeners() {
    document.getElementById('clientName').addEventListener('input', validateStep1);
    document.getElementById('clientPhone').addEventListener('input', function (e) {
        e.target.value = formatPhone(e.target.value);
        validateStep1();
    });
    document.getElementById('step1Next').addEventListener('click', () => goToStep(2));
    document.getElementById('step2Next').addEventListener('click', () => goToStep(3));
    document.getElementById('step3Next').addEventListener('click', () => goToStep(4));
    document.getElementById('confirmBtn').addEventListener('click', confirmAppointment);

    document.getElementById('serviceSearch').addEventListener('input', filterServices);

    document.getElementById('adminModal').addEventListener('click', function (e) {
        if (e.target === this) {
            closeAdminModal();
        }
    });

    document.getElementById('adminPassword').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            validateAdminPassword();
        }
    });
}

function formatPhone(value) {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
}

function validatePhone(phone) {
    const numbers = phone.replace(/\D/g, '');
    return numbers.length >= 10 && numbers.length <= 11;
}

function validateStep1() {
    const name = document.getElementById('clientName').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();
    const btn = document.getElementById('step1Next');
    btn.disabled = !(name.length >= 2 && validatePhone(phone));
}

function loadServices() {
    const grid = document.getElementById('servicesGrid');
    let html = '';

    Object.keys(serviceCategories).forEach(categoryKey => {
        const category = serviceCategories[categoryKey];

        if (category.services.length === 0) return;

        html += `
                    <div class="service-category" data-category="${categoryKey}" style="margin-bottom: 20px;">
                        <div class="category-title" style="font-size: 18px; font-weight: bold; color: #333; margin-bottom: 12px; padding-left: 5px; border-left: 4px solid #667eea;">
                            ${category.emoji} ${category.name}
                        </div>
                        <div class="category-services" style="display: grid; gap: 10px;">
                            ${category.services.map(service => `
                                <div class="service-card" 
                                     data-service-id="${service.id}"
                                     data-service-name="${service.name.toLowerCase()}"
                                     data-service-desc="${service.desc.toLowerCase()}"
                                     onclick="selectService('${service.id}', '${categoryKey}')">
                                    <div class="service-name">${service.name}</div>
                                    <div class="service-info">${service.desc}</div>
                                    <div class="service-info">⏱️ Duração: ${formatDuration(service.duration)}</div>
                                    ${service.sessions ? `<div class="service-info" style="color: #667eea;">📋 ${service.sessions} sessões</div>` : ''}
                                    <div class="service-price">R$ ${service.price.toFixed(2)}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
    });

    if (html === '') {
        html = '<div style="text-align: center; padding: 40px; color: #666;">Nenhum serviço disponível no momento.</div>';
    }

    grid.innerHTML = html;
    updateSearchResultCount();
}

function filterServices() {
    const searchTerm = document.getElementById('serviceSearch').value.toLowerCase().trim();
    const categories = document.querySelectorAll('.service-category');
    let visibleCount = 0;

    if (searchTerm === '') {
        categories.forEach(category => {
            category.style.display = 'block';
            const services = category.querySelectorAll('.service-card');
            services.forEach(service => {
                service.style.display = 'block';
                visibleCount++;
            });
        });
        updateSearchResultCount(visibleCount, false);
        return;
    }

    categories.forEach(category => {
        const services = category.querySelectorAll('.service-card');
        let categoryHasVisibleServices = false;

        services.forEach(service => {
            const serviceName = service.getAttribute('data-service-name');
            const serviceDesc = service.getAttribute('data-service-desc');

            if (serviceName.includes(searchTerm) || serviceDesc.includes(searchTerm)) {
                service.style.display = 'block';
                categoryHasVisibleServices = true;
                visibleCount++;
            } else {
                service.style.display = 'none';
            }
        });

        if (categoryHasVisibleServices) {
            category.style.display = 'block';
        } else {
            category.style.display = 'none';
        }
    });

    updateSearchResultCount(visibleCount, true);
}

function updateSearchResultCount(count, isSearching) {
    const resultDiv = document.getElementById('searchResultCount');

    if (!isSearching) {
        resultDiv.textContent = '';
        return;
    }

    if (count === 0) {
        resultDiv.textContent = '❌ Nenhum serviço encontrado. Tente outro termo.';
        resultDiv.style.color = '#e74c3c';
    } else if (count === 1) {
        resultDiv.textContent = `✅ 1 serviço encontrado`;
        resultDiv.style.color = '#27ae60';
    } else {
        resultDiv.textContent = `✅ ${count} serviços encontrados`;
        resultDiv.style.color = '#27ae60';
    }
}

function selectService(serviceId, categoryKey) {
    document.querySelectorAll('.service-card').forEach(card => card.classList.remove('selected'));
    event.target.closest('.service-card').classList.add('selected');

    const category = serviceCategories[categoryKey];
    formData.service = category.services.find(s => s.id === serviceId);
    document.getElementById('step2Next').disabled = false;
}

function renderScheduleDays() {
    const grid = document.getElementById('calendarGrid');

    if (!availableSchedules || availableSchedules.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">Carregando horários disponíveis...</div>';
        return;
    }

    const filteredSchedule = availableSchedules.filter(day => {
        if (!day.horarios_livres || day.horarios_livres.length === 0) return false;

        if (formData.service && formData.service.duration) {
            const filtered = filterAvailableTimeSlots(day.horarios_livres, formData.service.duration);
            return filtered.length > 0;
        }

        return true;
    });

    if (filteredSchedule.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">Nenhum horário disponível no momento para este serviço.</div>';
        return;
    }

    grid.innerHTML = filteredSchedule.map(day => {
        const dateObj = parseDate(day.data);
        const dayName = getDayName(dateObj);
        const dayNumber = dateObj.getDate();
        const monthName = getMonthName(dateObj);

        let availableCount = day.total_livres || day.horarios_livres.length;
        if (formData.service && formData.service.duration) {
            const filtered = filterAvailableTimeSlots(day.horarios_livres, formData.service.duration);
            availableCount = filtered.length;
        }

        return `
                    <div class="day-card" data-date="${day.data}" onclick='selectDayFromSchedule("${day.data}")'>
                        <div class="day-name">${dayName}</div>
                        <div class="day-number">${dayNumber}</div>
                        <div class="day-month">${monthName}</div>
                        <div class="day-slots-info">${availableCount} horários</div>
                    </div>
                `;
    }).join('');
}

function parseDate(dateStr) {
    const parts = dateStr.split('/');
    return new Date(parts[2], parts[1] - 1, parts[0]);
}

function getDayName(date) {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return days[date.getDay()];
}

function getMonthName(date) {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return months[date.getMonth()];
}

function selectDayFromSchedule(dateStr) {
    const dayData = availableSchedules.find(d => d.data === dateStr);
    if (!dayData) return;

    document.querySelectorAll('.day-card').forEach(card => card.classList.remove('selected'));
    event.target.closest('.day-card').classList.add('selected');

    formData.date = dayData.dia || dateStr;
    formData.dateFormatted = dateStr;
    formData.time = null;

    document.querySelectorAll('.time-slot').forEach(slot => slot.classList.remove('selected'));

    loadTimesFromSchedule(dayData.horarios_livres);

    const timeSection = document.getElementById('timeSection');
    timeSection.classList.add('active');

    setTimeout(() => {
        timeSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);

    document.getElementById('step3Next').disabled = true;

    if (formData.service) {
        document.getElementById('durationInfo').style.display = 'block';
        document.getElementById('durationText').textContent = formatDuration(formData.service.duration);
    }
}

function loadTimesFromSchedule(times) {
    const grid = document.getElementById('timeGrid');
    let availableTimes = times;

    if (formData.service && formData.service.duration) {
        availableTimes = filterAvailableTimeSlots(times, formData.service.duration);
    }

    if (availableTimes.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px; color: #666;">Nenhum horário disponível neste dia para a duração deste serviço. Escolha outro dia.</div>';
        return;
    }

    grid.innerHTML = availableTimes.map(time => `
                <div class="time-slot" onclick="selectTime('${time}')">${time}</div>
            `).join('');
}

function filterAvailableTimeSlots(availableHours, serviceDuration) {
    if (!serviceDuration || serviceDuration <= 0) return availableHours;

    return availableHours.filter(time => {
        return checkTimeSlotAvailability(availableHours, time, serviceDuration);
    });
}

function checkTimeSlotAvailability(availableHours, startTime, durationMinutes) {
    const startMinutes = parseTimeToMinutes(startTime);
    const availableMinutesSet = new Set(availableHours.map(time => parseTimeToMinutes(time)));
    const slotDuration = 10;

    let currentTime = startMinutes;
    const endTime = startMinutes + durationMinutes;

    while (currentTime < endTime) {
        if (!availableMinutesSet.has(currentTime)) {
            return false;
        }
        currentTime += slotDuration;
    }

    return true;
}

function parseTimeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
}

function selectTime(time) {
    document.querySelectorAll('.time-slot').forEach(slot => slot.classList.remove('selected'));
    event.target.classList.add('selected');
    formData.time = time;
    document.getElementById('step3Next').disabled = false;
}

function goToStep(step) {
    if (step > currentStep) {
        if (currentStep === 1 && !validateStepData(1)) return;
        if (currentStep === 2 && !formData.service) return;
        if (currentStep === 3 && (!formData.date || !formData.time)) return;
    }
    document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step${step}`).classList.add('active');
    updateProgress(step);
    currentStep = step;
    if (step === 4) loadSummary();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateStepData(step) {
    if (step === 1) {
        const name = document.getElementById('clientName').value.trim();
        const phone = document.getElementById('clientPhone').value.trim();
        if (name.length < 2 || !validatePhone(phone)) return false;
        formData.name = name;
        formData.phone = phone.replace(/\D/g, '');
    }
    return true;
}

function updateProgress(step) {
    const progress = (step - 1) / 3 * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;
    document.querySelectorAll('.progress-step').forEach((stepEl, index) => {
        stepEl.classList.remove('active', 'completed');
        if (index + 1 < step) stepEl.classList.add('completed');
        if (index + 1 === step) stepEl.classList.add('active');
    });
}

function loadSummary() {
    document.getElementById('summaryName').textContent = formData.name;
    document.getElementById('summaryPhone').textContent = formatPhone(formData.phone);
    document.getElementById('summaryService').textContent = formData.service.name;
    document.getElementById('summaryDuration').textContent = formatDuration(formData.service.duration);
    document.getElementById('summaryDate').textContent = formData.dateFormatted;
    document.getElementById('summaryTime').textContent = formData.time;
    document.getElementById('summaryPrice').textContent = `R$ ${formData.service.price.toFixed(2)}`;
}

async function confirmAppointment() {
    const appointmentData = {
        clientName: formData.name,
        clientPhone: formData.phone,
        serviceName: formData.service.name,
        serviceId: formData.service.id,
        servicePrice: formData.service.price,
        serviceDuration: formData.service.duration,
        appointmentDate: formData.dateFormatted,
        appointmentTime: formData.time,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        source: 'web_form'
    };

    try {
        const docRef = await db.collection('appointments').add(appointmentData);
        console.log('✅ Agendamento salvo com sucesso no Firestore com ID:', docRef.id);

        alert(`✅ Solicitação realizada com sucesso!\n\n📱 Você receberá uma confirmação no WhatsApp em breve.\n\n📞 Contato: +55 55 99154-6257\n📍 Alfredo Brenner 198, Cruz Alta\n\nObrigada por confiar no meu trabalho! 💖`);

        formData = { name: '', phone: '', service: null, date: null, dateFormatted: null, time: null };
        goToStep(1);
        document.getElementById('clientName').value = '';
        document.getElementById('clientPhone').value = '';
        document.querySelectorAll('.service-card').forEach(card => card.classList.remove('selected'));
        document.querySelectorAll('.day-card').forEach(card => card.classList.remove('selected'));
        document.querySelectorAll('.time-slot').forEach(slot => slot.classList.remove('selected'));
        document.getElementById('timeSection').classList.remove('active');
        document.getElementById('step1Next').disabled = true;
        document.getElementById('step2Next').disabled = true;

    } catch (error) {
        console.error('❌ Erro ao salvar agendamento no Firestore:', error);
        alert('❌ Erro ao salvar agendamento. Por favor, tente novamente ou entre em contato diretamente pelo WhatsApp: +55 55 99154-6257');
    }
}

function formatDuration(minutes) {
    if (minutes < 60) return `${minutes} min`;
    if (minutes % 60 === 0) return `${minutes / 60}h`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}min`;
}

function openAdminModal() {
    document.getElementById('adminModal').classList.add('active');
    document.getElementById('adminPassword').value = '';
    document.getElementById('adminPasswordError').style.display = 'none';
    document.getElementById('adminAuth').style.display = 'block';
    document.getElementById('adminServices').classList.remove('active');
}

function closeAdminModal() {
    document.getElementById('adminModal').classList.remove('active');
}

function validateAdminPassword() {
    const password = document.getElementById('adminPassword').value;
    const errorDiv = document.getElementById('adminPasswordError');

    if (password === ADMIN_PASSWORD) {
        document.getElementById('adminAuth').style.display = 'none';
        document.getElementById('adminServices').classList.add('active');
        loadAdminPrices();
        loadServiceList();
    } else {
        errorDiv.style.display = 'block';
        errorDiv.textContent = 'Senha incorreta!';
        document.getElementById('adminPassword').classList.add('error');
        setTimeout(() => {
            document.getElementById('adminPassword').classList.remove('error');
        }, 2000);
    }
}

function switchAdminTab(tab) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));

    event.target.classList.add('active');

    if (tab === 'prices') {
        document.getElementById('adminPricesTab').classList.add('active');
    } else if (tab === 'manage') {
        document.getElementById('adminManageTab').classList.add('active');
        loadServiceList();
    }
}

function loadAdminPrices() {
    const container = document.getElementById('adminServicesContent');
    let html = '';

    Object.keys(serviceCategories).forEach(categoryKey => {
        const category = serviceCategories[categoryKey];

        if (category.services.length === 0) return;

        html += `
                    <div class="admin-category-title">
                        ${category.emoji} ${category.name}
                    </div>
                `;

        category.services.forEach(service => {
            html += `
                        <div class="admin-service-item">
                            <div class="admin-service-header">
                                <span class="admin-service-name">${service.name}</span>
                                <span class="admin-service-current-price">R$ ${service.price.toFixed(2)}</span>
                            </div>
                            <div class="admin-service-desc">${service.desc}</div>
                            <div class="admin-price-input-group">
                                <input 
                                    type="number" 
                                    class="admin-price-input" 
                                    id="price_${service.id}" 
                                    placeholder="Novo preço"
                                    step="0.01"
                                    min="0"
                                >
                                <button 
                                    class="admin-btn-save" 
                                    onclick="updateServicePrice('${service.id}')"
                                    id="btn_${service.id}">
                                    Atualizar
                                </button>
                            </div>
                        </div>
                    `;
        });
    });

    if (html === '') {
        html = '<div style="text-align: center; padding: 40px; color: #666;">Nenhum serviço cadastrado ainda.</div>';
    }

    container.innerHTML = html;
}

async function updateServicePrice(serviceId) {
    const newPriceInput = document.getElementById(`price_${serviceId}`);
    const newPrice = parseFloat(newPriceInput.value);
    const btn = document.getElementById(`btn_${serviceId}`);

    if (!newPrice || newPrice < 0) {
        alert('Por favor, digite um valor válido!');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span>';

    try {
        await db.collection('services').doc(serviceId).update({
            price: newPrice
        });

        Object.keys(serviceCategories).forEach(categoryKey => {
            const service = serviceCategories[categoryKey].services.find(s => s.id === serviceId);
            if (service) {
                service.price = newPrice;
            }
        });

        loadAdminPrices();
        loadServices();

        alert(`✅ Preço atualizado com sucesso!\n\nNovo valor: R$ ${newPrice.toFixed(2)}`);

    } catch (error) {
        console.error('Erro ao atualizar preço:', error);
        alert('❌ Erro ao atualizar preço. Tente novamente.');
        btn.disabled = false;
        btn.textContent = 'Atualizar';
    }
}

function loadServiceList() {
    const container = document.getElementById('serviceList');
    let html = '';

    Object.keys(serviceCategories).forEach(categoryKey => {
        const category = serviceCategories[categoryKey];

        if (category.services.length === 0) return;

        html += `
                    <div style="margin-bottom: 30px;">
                        <div style="font-size: 18px; font-weight: bold; color: #333; margin-bottom: 15px; padding-left: 5px; border-left: 4px solid #667eea;">
                            ${category.emoji} ${category.name}
                        </div>
                        <div style="display: grid; gap: 15px;">
                            ${category.services.map(service => `
                                <div class="service-list-item">
                                    <div class="service-list-info">
                                        <div class="service-list-name">${service.name}</div>
                                        <div class="service-list-details">
                                            📝 ${service.desc}<br>
                                            💰 R$ ${service.price.toFixed(2)}<br>
                                            ⏱️ ${formatDuration(service.duration)}
                                            ${service.sessions ? `<br>📋 ${service.sessions} sessões` : ''}
                                        </div>
                                    </div>
                                    <div class="service-list-actions">
                                        <button class="btn-edit" onclick="editService('${service.id}')">✏️ Editar</button>
                                        <button class="btn-delete" onclick="deleteService('${service.id}', '${service.name}')">🗑️ Excluir</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
    });

    if (html === '') {
        html = '<div style="text-align: center; padding: 40px; color: #666;">Nenhum serviço cadastrado ainda. Crie seu primeiro serviço acima!</div>';
    }

    container.innerHTML = html;
}

async function saveService() {
    const category = document.getElementById('serviceCategory').value;
    const name = document.getElementById('serviceName').value.trim();
    const desc = document.getElementById('serviceDesc').value.trim();
    const price = parseFloat(document.getElementById('servicePrice').value);
    const duration = parseInt(document.getElementById('serviceDuration').value);
    const sessions = document.getElementById('serviceSessions').value.trim();
    const editId = document.getElementById('editServiceId').value;

    if (!category) {
        alert('Por favor, selecione uma categoria!');
        return;
    }

    if (!name) {
        alert('Por favor, digite o nome do serviço!');
        return;
    }

    if (!desc) {
        alert('Por favor, digite a descrição!');
        return;
    }

    if (isNaN(price) || price < 0) {
        alert('Por favor, digite um valor válido!');
        return;
    }

    if (isNaN(duration) || duration < 10) {
        alert('Por favor, digite uma duração válida (mínimo 10 minutos)!');
        return;
    }

    const serviceData = {
        category: category,
        name: name,
        desc: desc,
        price: price,
        duration: duration
    };

    if (sessions && parseInt(sessions) > 0) {
        serviceData.sessions = parseInt(sessions);
    }

    try {
        if (editId) {
            await db.collection('services').doc(editId).update(serviceData);
            alert('✅ Serviço atualizado com sucesso!');
        } else {
            await db.collection('services').add(serviceData);
            alert('✅ Serviço cadastrado com sucesso!');
        }

        clearServiceForm();
        await loadServicesFromFirestore();
        loadServiceList();
        loadAdminPrices();

    } catch (error) {
        console.error('Erro ao salvar serviço:', error);
        alert('❌ Erro ao salvar serviço. Tente novamente.');
    }
}

function editService(serviceId) {
    let service = null;
    let categoryKey = null;

    Object.keys(serviceCategories).forEach(key => {
        const found = serviceCategories[key].services.find(s => s.id === serviceId);
        if (found) {
            service = found;
            categoryKey = key;
        }
    });

    if (!service) return;

    document.getElementById('serviceCategory').value = service.category || categoryKey;
    document.getElementById('serviceName').value = service.name;
    document.getElementById('serviceDesc').value = service.desc;
    document.getElementById('servicePrice').value = service.price;
    document.getElementById('serviceDuration').value = service.duration;
    document.getElementById('serviceSessions').value = service.sessions || '';
    document.getElementById('editServiceId').value = serviceId;

    document.getElementById('formTitle').textContent = '✏️ Editar Serviço';
    document.getElementById('saveButtonText').textContent = '💾 Atualizar Serviço';
    document.getElementById('cancelEditBtn').style.display = 'block';

    document.querySelector('.service-form').scrollIntoView({ behavior: 'smooth' });
}

function cancelEdit() {
    clearServiceForm();
}

function clearServiceForm() {
    document.getElementById('serviceCategory').value = '';
    document.getElementById('serviceName').value = '';
    document.getElementById('serviceDesc').value = '';
    document.getElementById('servicePrice').value = '';
    document.getElementById('serviceDuration').value = '';
    document.getElementById('serviceSessions').value = '';
    document.getElementById('editServiceId').value = '';

    document.getElementById('formTitle').textContent = '➕ Adicionar Novo Serviço';
    document.getElementById('saveButtonText').textContent = '💾 Salvar Serviço';
    document.getElementById('cancelEditBtn').style.display = 'none';
}

async function deleteService(serviceId, serviceName) {
    if (!confirm(`Tem certeza que deseja excluir o serviço:\n\n"${serviceName}"?\n\nEsta ação não pode ser desfeita!`)) {
        return;
    }

    try {
        await db.collection('services').doc(serviceId).delete();

        alert('✅ Serviço excluído com sucesso!');

        await loadServicesFromFirestore();
        loadServiceList();
        loadAdminPrices();

    } catch (error) {
        console.error('Erro ao excluir serviço:', error);
        alert('❌ Erro ao excluir serviço. Tente novamente.');
    }
}

window.goToStep = goToStep;
window.selectService = selectService;
window.selectDayFromSchedule = selectDayFromSchedule;
window.selectTime = selectTime;
window.openAdminModal = openAdminModal;
window.closeAdminModal = closeAdminModal;
window.validateAdminPassword = validateAdminPassword;
window.switchAdminTab = switchAdminTab;
window.updateServicePrice = updateServicePrice;
window.saveService = saveService;
window.editService = editService;
window.deleteService = deleteService;
window.cancelEdit = cancelEdit;
