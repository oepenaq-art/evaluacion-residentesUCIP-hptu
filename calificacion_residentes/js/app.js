import { rubricasData } from './rubricas-data.js';

// --- ELEMENTOS DEL DOM ---
const sections = {
    login: document.getElementById('sec-login'),
    dashboard: document.getElementById('sec-dashboard'),
    formulario: document.getElementById('sec-formulario'),
    informes: document.getElementById('sec-informes')
};

// Login
const formLogin = document.getElementById('form-login');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const userInfo = document.getElementById('user-info');
const userEmailSpan = document.getElementById('user-email');
const btnLogout = document.getElementById('btn-logout');

// Dashboard
const btnProgramas = document.querySelectorAll('.btn-programa');
const estudiantesContainer = document.getElementById('estudiantes-container');
const selectEstudiante = document.getElementById('select-estudiante');
const rubricasContainer = document.getElementById('rubricas-container');
const btnRubricas = document.querySelectorAll('.btn-rubrica');
const btnInformes = document.getElementById('btn-informes');

// Formulario
const btnVolverDash = document.getElementById('btn-volver-dash');
const btnVerRubrica = document.getElementById('btn-ver-rubrica');
const formTitle = document.getElementById('form-title');
const formEstudianteNombre = document.getElementById('form-estudiante-nombre');
const campoSeminario = document.getElementById('campo-seminario');
const nombreSeminario = document.getElementById('nombre-seminario');
const itemsRubrica = document.getElementById('items-rubrica');
const formEvaluacion = document.getElementById('form-evaluacion');

// Informes
const btnVolverDashInf = document.getElementById('btn-volver-dash-inf');
const btnGenerarIa = document.getElementById('btn-generar-ia');
const infSelectEstudiante = document.getElementById('inf-select-estudiante');
const infApiKey = document.getElementById('inf-api-key');
const infResultado = document.getElementById('inf-resultado');
const infTexto = document.getElementById('inf-texto');
const infNotaAuto = document.getElementById('inf-nota-auto');

// --- ESTADO DE LA APP ---
let appState = {
    user: null, 
    programaSeleccionado: null,
    estudianteSeleccionado: null,
    rubricaSeleccionada: null,
    estudiantes: [
        { id: '1', nombre: 'Juan Pérez', programa: 'residente' },
        { id: '2', nombre: 'María Gómez', programa: 'residente' },
        { id: '3', nombre: 'Carlos Ruiz', programa: 'fellow' }
    ]
};

// --- NAVEGACIÓN ---
function showSection(sectionId) {
    Object.values(sections).forEach(sec => sec.classList.add('hidden'));
    sections[sectionId].classList.remove('hidden');
    window.scrollTo(0, 0);
}

// --- LÓGICA DE LOGIN ---
formLogin.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = loginEmail.value;
    const password = loginPassword.value;
    
    if (email && password) {
        appState.user = { email: email, rol: email.includes('coord') ? 'coordinador' : 'docente' };
        
        userEmailSpan.textContent = email;
        userInfo.classList.remove('hidden');
        
        if (appState.user.rol === 'coordinador') {
            btnInformes.classList.remove('hidden');
        } else {
            btnInformes.classList.add('hidden');
        }

        showSection('dashboard');
        
        Swal.fire({
            icon: 'success',
            title: 'Sesión Iniciada',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
    }
});

btnLogout.addEventListener('click', () => {
    appState.user = null;
    userInfo.classList.add('hidden');
    loginEmail.value = '';
    loginPassword.value = '';
    showSection('login');
    
    estudiantesContainer.classList.add('hidden');
    rubricasContainer.classList.add('hidden');
    btnProgramas.forEach(b => {
        b.classList.remove('bg-[#0056b3]', 'text-white');
        b.classList.add('bg-white', 'text-gray-700');
    });
});

// --- LÓGICA DEL DASHBOARD ---
btnProgramas.forEach(btn => {
    btn.addEventListener('click', () => {
        btnProgramas.forEach(b => {
            b.classList.remove('bg-[#0056b3]', 'text-white');
            b.classList.add('bg-white', 'text-gray-700');
        });
        btn.classList.remove('bg-white', 'text-gray-700');
        btn.classList.add('bg-[#0056b3]', 'text-white');
        
        appState.programaSeleccionado = btn.dataset.prog;
        cargarEstudiantes(appState.programaSeleccionado);
        
        estudiantesContainer.classList.remove('hidden');
        rubricasContainer.classList.add('hidden'); 
    });
});

function cargarEstudiantes(programa) {
    selectEstudiante.innerHTML = '<option value="">Seleccione estudiante...</option>';
    const filtrados = appState.estudiantes.filter(e => e.programa === programa);
    
    filtrados.forEach(est => {
        const option = document.createElement('option');
        option.value = est.id;
        option.textContent = est.nombre;
        selectEstudiante.appendChild(option);
    });
}

selectEstudiante.addEventListener('change', (e) => {
    if (e.target.value) {
        appState.estudianteSeleccionado = appState.estudiantes.find(est => est.id === e.target.value);
        rubricasContainer.classList.remove('hidden');
    } else {
        appState.estudianteSeleccionado = null;
        rubricasContainer.classList.add('hidden');
    }
});

btnRubricas.forEach(btn => {
    btn.addEventListener('click', () => {
        appState.rubricaSeleccionada = btn.dataset.rubrica;
        renderizarFormulario();
        showSection('formulario');
    });
});

// --- LÓGICA DEL FORMULARIO ---
btnVolverDash.addEventListener('click', () => showSection('dashboard'));

btnVerRubrica.addEventListener('click', (e) => {
    e.preventDefault();
    const dataRubrica = rubricasData[appState.rubricaSeleccionada];
    
    let tableHtml = '<div class="overflow-x-auto"><table class="w-full text-sm text-left border-collapse border border-gray-300"><thead><tr class="bg-gray-100"><th>Ítem</th><th>Peso</th><th>Criterios</th></tr></thead><tbody>';
    
    dataRubrica.items.forEach(item => {
        tableHtml += \`<tr>
            <td class="border border-gray-300 p-2 font-bold">\${item.titulo}</td>
            <td class="border border-gray-300 p-2">\${item.peso}</td>
            <td class="border border-gray-300 p-2 text-xs">
                <ul class="list-disc pl-4 space-y-1">
                    \${item.opciones.map(op => \`<li>\${op.texto}</li>\`).join('')}
                </ul>
            </td>
        </tr>\`;
    });
    tableHtml += '</tbody></table></div>';

    Swal.fire({
        title: \`Matriz: \${dataRubrica.titulo}\`,
        html: tableHtml,
        width: '90%',
        confirmButtonText: 'Cerrar',
        confirmButtonColor: '#0056b3'
    });
});

function getBadgeColors(val) {
    if(val == 5) return 'bg-green-700 hover:bg-green-800 text-white border-green-700 peer-checked:bg-green-700 peer-checked:text-white';
    if(val == 4) return 'bg-green-500 hover:bg-green-600 text-white border-green-500 peer-checked:bg-green-500 peer-checked:text-white';
    if(val == 3) return 'bg-blue-400 hover:bg-blue-500 text-white border-blue-400 peer-checked:bg-blue-500 peer-checked:text-white';
    if(val == 2) return 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500 peer-checked:bg-yellow-600 peer-checked:text-white';
    if(val == 1) return 'bg-red-500 hover:bg-red-600 text-white border-red-500 peer-checked:bg-red-600 peer-checked:text-white';
    return 'bg-gray-500 hover:bg-gray-600 text-white border-gray-500 peer-checked:bg-gray-600 peer-checked:text-white';
}

function getShortName(val) {
    if(val == 5) return 'Excelente (5)';
    if(val == 4) return 'Sobresaliente (4)';
    if(val == 3) return 'Aprobado/Bueno (3)';
    if(val == 2) return 'Por Mejorar (2)';
    if(val == 1) return 'Insuficiente (1)';
    return 'No Aplica';
}

function renderizarFormulario() {
    const dataRubrica = rubricasData[appState.rubricaSeleccionada];
    
    formTitle.textContent = dataRubrica.titulo;
    formEstudianteNombre.textContent = appState.estudianteSeleccionado.nombre;
    
    if (dataRubrica.requiereNombre) {
        campoSeminario.classList.remove('hidden');
        nombreSeminario.required = true;
    } else {
        campoSeminario.classList.add('hidden');
        nombreSeminario.required = false;
        nombreSeminario.value = '';
    }

    itemsRubrica.innerHTML = '';
    
    if (dataRubrica.items.length === 0) {
        itemsRubrica.innerHTML = '<p class="text-red-500 italic">Rúbrica pendiente por configurar...</p>';
        return;
    }

    dataRubrica.items.forEach(item => {
        
        let optionsHtml = '<div class="flex flex-wrap gap-2 radio-btn-group mt-3">';
        item.opciones.forEach(op => {
            const colors = getBadgeColors(op.valor);
            optionsHtml += \`
                <div>
                    <input type="radio" id="\${item.id}_\${op.valor}" name="calificacion_\${item.id}" value="\${op.valor}" class="hidden peer" required>
                    <label for="\${item.id}_\${op.valor}" class="inline-flex items-center justify-center px-4 py-2 text-sm font-bold border rounded-full cursor-pointer \${colors} transition opacity-70 peer-checked:opacity-100 peer-checked:ring-2 peer-checked:ring-offset-1">
                        \${getShortName(op.valor)}
                    </label>
                </div>
            \`;
        });
        
        // Add N/A
        optionsHtml += \`
            <div>
                <input type="radio" id="\${item.id}_na" name="calificacion_\${item.id}" value="0" class="hidden peer" required>
                <label for="\${item.id}_na" class="inline-flex items-center justify-center px-4 py-2 text-sm font-bold border rounded-full cursor-pointer bg-gray-500 text-white opacity-70 peer-checked:opacity-100 peer-checked:ring-2 peer-checked:ring-offset-1">
                    No aplica
                </label>
            </div>
        </div>\`;

        // Tooltip o descripcion corta extraida
        const descCorta = item.opciones.map(o => \`<span class="block text-xs text-gray-500 mb-1">\${o.texto}</span>\`).join('');

        const itemHtml = \`
            <div class="border rounded-lg p-5 bg-white shadow-sm border-gray-200">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-2">
                    <h4 class="text-lg font-bold text-[#0056b3]">\${item.titulo}</h4>
                    <span class="bg-gray-100 text-gray-800 text-xs font-bold px-3 py-1 rounded border border-gray-200 mt-2 md:mt-0">Peso: \${item.peso}</span>
                </div>
                
                \${optionsHtml}
                
                <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-green-700 mb-1">Aspectos Positivos</label>
                        <textarea required name="positivos_\${item.id}" rows="2" class="w-full border border-green-300 rounded px-3 py-2 bg-green-50 focus:outline-none focus:border-green-500 text-sm"></textarea>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-orange-700 mb-1">Aspectos a Mejorar</label>
                        <textarea required name="mejorar_\${item.id}" rows="2" class="w-full border border-orange-300 rounded px-3 py-2 bg-orange-50 focus:outline-none focus:border-orange-500 text-sm"></textarea>
                    </div>
                </div>
            </div>
        \`;
        itemsRubrica.insertAdjacentHTML('beforeend', itemHtml);
    });
}

formEvaluacion.addEventListener('submit', (e) => {
    e.preventDefault();
    Swal.fire({
        title: 'Evaluación Guardada',
        text: 'La evaluación se ha registrado correctamente.',
        icon: 'success',
        confirmButtonColor: '#0056b3'
    }).then(() => {
        formEvaluacion.reset();
        showSection('dashboard');
    });
});

// --- LÓGICA DE INFORMES ---
btnInformes.addEventListener('click', () => {
    infSelectEstudiante.innerHTML = '<option value="">Seleccione estudiante...</option>';
    appState.estudiantes.forEach(est => {
        infSelectEstudiante.innerHTML += \`<option value="\${est.id}">\${est.nombre} (\${est.programa})</option>\`;
    });
    
    showSection('informes');
});

btnVolverDashInf.addEventListener('click', () => showSection('dashboard'));

btnGenerarIa.addEventListener('click', async () => {
    const apiKey = infApiKey.value;
    const estId = infSelectEstudiante.value;
    const notaAuto = infNotaAuto.value;
    
    if (!apiKey || !estId || !notaAuto) {
        Swal.fire('Error', 'Debe seleccionar un estudiante, proveer la nota de autoevaluación y su API Key de Gemini.', 'error');
        return;
    }

    const est = appState.estudiantes.find(e => e.id === estId);
    
    btnGenerarIa.innerHTML = '<span>⏳</span> Generando Informe...';
    btnGenerarIa.disabled = true;

    try {
        const resumenEstudiante = \`
Estudiante: \${est.nombre}
Programa: \${est.programa}

Calificaciones Consolidadas (Simuladas basadas en historial):
- RONDA (Peso 40%): Promedio 4.2. (Aspectos: Buen análisis clínico, debe mejorar correlación).
- SEMINARIOS (Peso 35%): Promedio 4.5. (Aspectos: Excelente dominio de temas y argumentación).
- TEMA CENTRAL (Peso 15%): Promedio 4.0. (Aspectos: Buena presentación, faltó algo de fluidez virtual).
- AUTOEVALUACIÓN (Peso 5%): Nota \${notaAuto}.

Teniendo en cuenta estos pesos (40%, 35%, 15%, 5% que suman 95% de la nota final, asumiendo nota sobre ese porcentaje o escalada al 100%), calcula la nota final consolidada estimada.
\`;
        
        const promptText = \`Eres un coordinador académico del Hospital Pablo Tobón Uribe. 
Redacta un informe final cualitativo y cuantitativo formal sobre el desempeño del estudiante al final de la rotación.
Usa la siguiente estructura:
1) **Consolidado de Notas:** Muestra el cálculo de la nota final considerando los pesos indicados.
2) **Puntos Fuertes y Logros:** Basado cualitativamente en las rúbricas.
3) **Áreas de Oportunidad / Mejoras:**
4) **Concepto Final:**
Datos del estudiante:
\${resumenEstudiante}\`;

        const response = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=\${apiKey}\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        });

        if (!response.ok) {
            throw new Error('Error en la API');
        }

        const data = await response.json();
        const textoIA = data.candidates[0].content.parts[0].text;
        
        // Render markdown simple
        const formattedText = textoIA.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>').replace(/\\n/g, '<br>');
        
        infTexto.innerHTML = formattedText;
        infResultado.classList.remove('hidden');

    } catch (error) {
        Swal.fire('Error', 'Hubo un problema al contactar la IA. Verifica tu API Key o conexión.', 'error');
    } finally {
        btnGenerarIa.innerHTML = '<span>🔍</span> Generar Informe y Calcular Notas';
        btnGenerarIa.disabled = false;
    }
});
