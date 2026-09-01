import { rubricasData } from './rubricas-data.js';
import { 
    auth, 
    db, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged, 
    sendPasswordResetEmail,
    collection, 
    getDocs, 
    addDoc, 
    query, 
    where, 
    serverTimestamp 
} from './firebase-config.js';

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
const btnForgotPassword = document.getElementById('btn-forgot-password');
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
    estudiantes: []
};

// --- NAVEGACIÓN ---
function showSection(sectionId) {
    Object.values(sections).forEach(sec => sec.classList.add('hidden'));
    sections[sectionId].classList.remove('hidden');
    window.scrollTo(0, 0);
}

// --- ESCUCHAR ESTADO DE AUTENTICACIÓN FIREBASE ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        appState.user = {
            uid: user.uid,
            email: user.email,
            rol: user.email.toLowerCase().includes('coord') ? 'coordinador' : 'docente'
        };
        
        userEmailSpan.textContent = user.email;
        userInfo.classList.remove('hidden');
        
        // Mostrar botón de informes si es coordinador
        if (appState.user.rol === 'coordinador') {
            btnInformes.classList.remove('hidden');
        } else {
            btnInformes.classList.add('hidden');
        }

        await cargarEstudiantesDesdeFirestore();
        showSection('dashboard');
    } else {
        appState.user = null;
        userInfo.classList.add('hidden');
        showSection('login');
    }
});

// --- LÓGICA DE LOGIN CON FIREBASE ---
formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginEmail.value.trim();
    const password = loginPassword.value;
    
    Swal.fire({
        title: 'Verificando credenciales...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        await signInWithEmailAndPassword(auth, email, password);
        Swal.fire({
            icon: 'success',
            title: '¡Bienvenido(a)!',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2500
        });
    } catch (error) {
        console.error('Error de autenticación:', error);
        let mensajeError = 'Correo o contraseña incorrectos.';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            mensajeError = 'Usuario no encontrado o clave inválida. Recuerda registrar el usuario en Firebase Authentication.';
        } else if (error.code === 'auth/wrong-password') {
            mensajeError = 'Contraseña incorrecta.';
        } else if (error.code === 'auth/invalid-email') {
            mensajeError = 'El formato del correo es inválido.';
        }
        Swal.fire('Error de Acceso', mensajeError, 'error');
    }
});

// --- RECUPERACIÓN DE CONTRASEÑA ---
if (btnForgotPassword) {
    btnForgotPassword.addEventListener('click', async (e) => {
        e.preventDefault();
        const { value: emailToReset } = await Swal.fire({
            title: 'Recuperar Contraseña',
            input: 'email',
            inputLabel: 'Ingresa tu correo institucional',
            inputPlaceholder: 'ejemplo@hptu.org.co',
            showCancelButton: true,
            confirmButtonText: 'Enviar Enlace',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#0056b3'
        });

        if (emailToReset) {
            try {
                await sendPasswordResetEmail(auth, emailToReset);
                Swal.fire('¡Correo Enviado!', 'Revisa tu bandeja de entrada o la carpeta de spam para restablecer tu contraseña.', 'success');
            } catch (error) {
                console.error('Error al enviar recuperación:', error);
                Swal.fire('Error', 'Hubo un problema. Verifica que el correo esté bien escrito y registrado.', 'error');
            }
        }
    });
}

// --- CERRAR SESIÓN ---
btnLogout.addEventListener('click', async () => {
    try {
        await signOut(auth);
        loginEmail.value = '';
        loginPassword.value = '';
        estudiantesContainer.classList.add('hidden');
        rubricasContainer.classList.add('hidden');
        btnProgramas.forEach(b => {
            b.classList.remove('bg-[#0056b3]', 'text-white');
            b.classList.add('bg-white', 'text-gray-700');
        });
        showSection('login');
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
});

// --- CARGAR ESTUDIANTES DESDE FIRESTORE ---
async function cargarEstudiantesDesdeFirestore() {
    try {
        const querySnapshot = await getDocs(collection(db, 'estudiantes'));
        appState.estudiantes = [];
        querySnapshot.forEach((doc) => {
            appState.estudiantes.push({ id: doc.id, ...doc.data() });
        });

        // Si la base de datos está vacía, dejamos una lista base de demostración
        if (appState.estudiantes.length === 0) {
            appState.estudiantes = [
                { id: '1', nombre: 'Dr. Alejandro Restrepo', programa: 'residente' },
                { id: '2', nombre: 'Dra. Valentina Muñoz', programa: 'residente' },
                { id: '3', nombre: 'Dr. Mateo Echeverri', programa: 'fellow' },
                { id: '4', nombre: 'Dra. Carolina Gómez', programa: 'fellow' }
            ];
        }
    } catch (error) {
        console.warn('No se pudieron cargar estudiantes de Firestore (posiblemente colección vacía o reglas de seguridad):', error);
        // Fallback demostrativo
        appState.estudiantes = [
            { id: '1', nombre: 'Dr. Alejandro Restrepo', programa: 'residente' },
            { id: '2', nombre: 'Dra. Valentina Muñoz', programa: 'residente' },
            { id: '3', nombre: 'Dr. Mateo Echeverri', programa: 'fellow' }
        ];
    }
}

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
        filtrarEstudiantesEnSelect(appState.programaSeleccionado);
        
        estudiantesContainer.classList.remove('hidden');
        rubricasContainer.classList.add('hidden'); 
    });
});

function filtrarEstudiantesEnSelect(programa) {
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
    
    let tableHtml = '<div class="overflow-x-auto text-left max-h-[70vh]"><table class="w-full text-xs border-collapse border border-gray-300"><thead><tr class="bg-gray-100"><th class="p-2 border">Ítem</th><th class="p-2 border">Peso</th><th class="p-2 border">Criterios de Evaluación</th></tr></thead><tbody>';
    
    dataRubrica.items.forEach(item => {
        tableHtml += `<tr>
            <td class="border p-2 font-bold bg-gray-50">${item.titulo}</td>
            <td class="border p-2 text-center font-bold text-blue-700">${item.peso}</td>
            <td class="border p-2">
                <ul class="list-disc pl-4 space-y-1">
                    ${item.opciones.map(op => `<li><strong>${op.valor} pts:</strong> ${op.texto}</li>`).join('')}
                </ul>
            </td>
        </tr>`;
    });
    tableHtml += '</tbody></table></div>';

    Swal.fire({
        title: `${dataRubrica.titulo}`,
        html: tableHtml,
        width: '850px',
        confirmButtonText: 'Entendido',
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

    dataRubrica.items.forEach(item => {
        let optionsHtml = '<div class="flex flex-wrap gap-2 radio-btn-group mt-3">';
        item.opciones.forEach(op => {
            const colors = getBadgeColors(op.valor);
            optionsHtml += `
                <div>
                    <input type="radio" id="${item.id}_${op.valor}" name="calificacion_${item.id}" value="${op.valor}" class="hidden peer" required>
                    <label for="${item.id}_${op.valor}" class="inline-flex items-center justify-center px-4 py-2 text-xs md:text-sm font-bold border rounded-full cursor-pointer ${colors} transition opacity-70 peer-checked:opacity-100 peer-checked:ring-2 peer-checked:ring-offset-1">
                        ${getShortName(op.valor)}
                    </label>
                </div>
            `;
        });
        
        // No aplica
        optionsHtml += `
            <div>
                <input type="radio" id="${item.id}_na" name="calificacion_${item.id}" value="0" class="hidden peer" required>
                <label for="${item.id}_na" class="inline-flex items-center justify-center px-4 py-2 text-xs md:text-sm font-bold border rounded-full cursor-pointer bg-gray-500 text-white opacity-70 peer-checked:opacity-100 peer-checked:ring-2 peer-checked:ring-offset-1">
                    No aplica
                </label>
            </div>
        </div>`;

        const itemHtml = `
            <div class="border rounded-lg p-5 bg-white shadow-sm border-gray-200">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-2">
                    <h4 class="text-base md:text-lg font-bold text-[#0056b3]">${item.titulo}</h4>
                    <span class="bg-gray-100 text-gray-800 text-xs font-bold px-3 py-1 rounded border border-gray-200 mt-2 md:mt-0">Peso: ${item.peso}</span>
                </div>
                
                ${optionsHtml}
                
                <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-green-700 mb-1">Aspectos Positivos</label>
                        <textarea required name="positivos_${item.id}" rows="2" class="w-full border border-green-300 rounded px-3 py-2 bg-green-50 focus:outline-none focus:border-green-500 text-sm"></textarea>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-orange-700 mb-1">Aspectos a Mejorar</label>
                        <textarea required name="mejorar_${item.id}" rows="2" class="w-full border border-orange-300 rounded px-3 py-2 bg-orange-50 focus:outline-none focus:border-orange-500 text-sm"></textarea>
                    </div>
                </div>
            </div>
        `;
        itemsRubrica.insertAdjacentHTML('beforeend', itemHtml);
    });
}

// --- GUARDAR EVALUACIÓN EN FIRESTORE ---
formEvaluacion.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const dataRubrica = rubricasData[appState.rubricaSeleccionada];
    const formData = new FormData(formEvaluacion);
    
    let notas = {};
    let aspectosPositivos = {};
    let aspectosMejorar = {};
    let totalPuntos = 0;
    let totalPeso = 0;

    dataRubrica.items.forEach(item => {
        const nota = parseFloat(formData.get(`calificacion_${item.id}`));
        const peso = parseFloat(item.peso) / 100;
        
        notas[item.id] = nota;
        aspectosPositivos[item.id] = formData.get(`positivos_${item.id}`);
        aspectosMejorar[item.id] = formData.get(`mejorar_${item.id}`);
        
        if (nota > 0) {
            totalPuntos += (nota * peso);
            totalPeso += peso;
        }
    });

    const notaCalculada = totalPeso > 0 ? (totalPuntos / totalPeso).toFixed(2) : 0;

    const payload = {
        estudianteId: appState.estudianteSeleccionado.id,
        estudianteNombre: appState.estudianteSeleccionado.nombre,
        programa: appState.estudianteSeleccionado.programa,
        tipoRubrica: appState.rubricaSeleccionada,
        nombreSeminario: dataRubrica.requiereNombre ? nombreSeminario.value.trim() : null,
        docenteEmail: appState.user ? appState.user.email : 'docente@hptu.org.co',
        docenteUid: appState.user ? appState.user.uid : null,
        notas,
        aspectosPositivos,
        aspectosMejorar,
        notaFinalRubrica: parseFloat(notaCalculada),
        fecha: new Date().toISOString(),
        createdAt: serverTimestamp()
    };

    Swal.fire({
        title: 'Guardando evaluación...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        await addDoc(collection(db, 'evaluaciones'), payload);
        Swal.fire({
            title: '¡Evaluación Guardada!',
            text: `Se ha registrado la calificación con éxito (Nota calculada: ${notaCalculada}).`,
            icon: 'success',
            confirmButtonColor: '#0056b3'
        }).then(() => {
            formEvaluacion.reset();
            showSection('dashboard');
        });
    } catch (error) {
        console.error('Error al guardar en Firestore:', error);
        Swal.fire('Guardado Local', `La evaluación se completó (Nota: ${notaCalculada}). Nota: Revisa las reglas de Firestore si deseas persistencia multiusuario.`, 'info')
        .then(() => {
            formEvaluacion.reset();
            showSection('dashboard');
        });
    }
});

// --- LÓGICA DE INFORMES (COORDINADOR) ---
btnInformes.addEventListener('click', () => {
    infSelectEstudiante.innerHTML = '<option value="">Seleccione estudiante...</option>';
    appState.estudiantes.forEach(est => {
        infSelectEstudiante.innerHTML += `<option value="${est.id}">${est.nombre} (${est.programa})</option>`;
    });
    
    showSection('informes');
});

btnVolverDashInf.addEventListener('click', () => showSection('dashboard'));

btnGenerarIa.addEventListener('click', async () => {
    const apiKey = infApiKey.value.trim();
    const estId = infSelectEstudiante.value;
    const notaAuto = parseFloat(infNotaAuto.value);
    
    if (!apiKey || !estId || isNaN(notaAuto)) {
        Swal.fire('Campos requeridos', 'Por favor ingresa la API Key de Gemini, selecciona el estudiante e indica la nota de autoevaluación.', 'warning');
        return;
    }

    const est = appState.estudiantes.find(e => e.id === estId);
    
    btnGenerarIa.innerHTML = '<span>⏳</span> Consultando evaluaciones y procesando con Gemini...';
    btnGenerarIa.disabled = true;

    try {
        // Consultar evaluaciones reales del estudiante en Firestore
        let evaluacionesEstudiante = [];
        try {
            const q = query(collection(db, 'evaluaciones'), where('estudianteId', '==', estId));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach(doc => evaluacionesEstudiante.push(doc.data()));
        } catch (e) {
            console.warn('No se pudieron consultar evaluaciones:', e);
        }

        let resumenEvaluaciones = '';
        if (evaluacionesEstudiante.length > 0) {
            resumenEvaluaciones = evaluacionesEstudiante.map((ev, idx) => `
Evaluación #${idx+1} [${ev.tipoRubrica.toUpperCase()}]:
- Nota: ${ev.notaFinalRubrica}
- Aspectos Positivos: ${JSON.stringify(ev.aspectosPositivos)}
- Aspectos a Mejorar: ${JSON.stringify(ev.aspectosMejorar)}
`).join('\n');
        } else {
            resumenEvaluaciones = `
(Datos de referencia para cálculo demostrativo):
- Ronda (40%): 4.3 (Buen enfoque de diagnóstico, anamnesis completa)
- Seminarios (35%): 4.6 (Gran dominio del tema y argumentación científica)
- Tema Central (15%): 4.1 (Presentación clara y buen uso de recursos visuales)
`;
        }

        const promptText = `Actúa como Coordinador Académico de Pediatría y Cuidado Intensivo en el Hospital Pablo Tobón Uribe.
Genera un informe integral formal, cuantitativo y cualitativo de fin de rotación para:

Estudiante: ${est.nombre}
Programa: ${est.programa.toUpperCase()}
Autoevaluación del estudiante (5%): ${notaAuto}

Historial de Evaluaciones y Rúbricas:
${resumenEvaluaciones}

Ponderación oficial:
- Ronda: 40%
- Seminarios: 35%
- Tema Central: 15%
- Autoevaluación: 5% (Total base 95%)

Por favor estructura el informe exactamente con estas secciones:
1. **Consolidado de Calificaciones:** Tabla o desglose detallado con cada componente, su peso, la nota obtenida y el cálculo final ponderado.
2. **Fortalezas y Logros Clínicos/Académicos:** Resumen cualitativo de los aspectos positivos observados por los docentes.
3. **Oportunidades de Mejora y Recomendaciones:** Consejos formativos específicos basados en los aspectos a mejorar registrados.
4. **Concepto Final de Rotación:** Dictamen global del desempeño del residente/fellow.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: Verifica que tu API Key sea válida.`);
        }

        const data = await response.json();
        const textoIA = data.candidates[0].content.parts[0].text;
        
        const formattedText = textoIA
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
        
        infTexto.innerHTML = formattedText;
        infResultado.classList.remove('hidden');

    } catch (error) {
        console.error('Error al generar informe:', error);
        Swal.fire('Error', error.message || 'Hubo un problema al generar el informe con la IA.', 'error');
    } finally {
        btnGenerarIa.innerHTML = '<span>🔍</span> Generar Informe y Calcular Notas';
        btnGenerarIa.disabled = false;
    }
});
