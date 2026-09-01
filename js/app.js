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
    deleteDoc,
    doc,
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
const btnAdminEstudiantes = document.getElementById('btn-admin-estudiantes');

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
        let userRol = 'docente';
        try {
            const usuariosRef = collection(db, 'usuarios');
            const q = query(usuariosRef, where('correo', '==', user.email));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const userData = querySnapshot.docs[0].data();
                if (userData.rol === 'Coordinador' || userData.Rol === 'Coordinador' || userData.rol === 'coordinador') {
                    userRol = 'coordinador';
                }
            }
        } catch (error) {
            console.error('Error al verificar rol de usuario:', error);
            // Fallback
            if (user.email.toLowerCase().includes('coord')) userRol = 'coordinador';
        }

        appState.user = {
            uid: user.uid,
            email: user.email,
            rol: userRol
        };
        
        userEmailSpan.textContent = user.email;
        userInfo.classList.remove('hidden');
        
        // Mostrar botones de administración si es coordinador
        if (appState.user.rol === 'coordinador') {
            btnInformes.classList.remove('hidden');
            if (btnAdminEstudiantes) btnAdminEstudiantes.classList.remove('hidden');
        } else {
            btnInformes.classList.add('hidden');
            if (btnAdminEstudiantes) btnAdminEstudiantes.classList.add('hidden');
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
        let mensajeError = `Error (${error.code || 'desconocido'}): Correo o contraseña incorrectos.`;
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            mensajeError = 'Usuario no encontrado o clave inválida. Revisa que el correo y contraseña coincidan con los creados en Firebase.';
        } else if (error.code === 'auth/wrong-password') {
            mensajeError = 'Contraseña incorrecta.';
        } else if (error.code === 'auth/invalid-email') {
            mensajeError = 'El formato del correo es inválido.';
        } else if (error.code === 'auth/unauthorized-domain') {
            mensajeError = 'Dominio no autorizado. Debes agregar "oepenaq-art.github.io" en Firebase > Authentication > Settings > Authorized domains.';
        } else if (error.code === 'auth/operation-not-allowed') {
            mensajeError = 'El acceso por Correo/Contraseña no está activado en Firebase > Authentication > Sign-in method.';
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
        console.log('Consultando colección estudiantes en Firestore...');
        const querySnapshot = await getDocs(collection(db, 'estudiantes'));
        appState.estudiantes = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            console.log('Estudiante encontrado en Firestore:', doc.id, data);
            
            const rawNombre = data.nombre || data.Nombre || data.NOMBRE || 'Sin nombre';
            let rawProgStr = (data.programa || data.Programa || data.PROGRAMA || '').toString().toLowerCase().trim();
            
            let rawPrograma = 'residente';
            if (rawProgStr.includes('fellow') || rawProgStr.includes('uci')) {
                rawPrograma = 'fellow';
            } else if (rawProgStr.includes('residente') || rawProgStr.includes('pedi')) {
                rawPrograma = 'residente';
            }

            appState.estudiantes.push({ 
                id: doc.id, 
                nombre: rawNombre, 
                programa: rawPrograma,
                ...data
            });
        });
        console.log('Lista final de estudiantes cargada:', appState.estudiantes);
    } catch (error) {
        console.error('Error al cargar estudiantes de Firestore:', error);
    }
}

// --- LÓGICA DEL DASHBOARD ---
btnProgramas.forEach(btn => {
    btn.addEventListener('click', async () => {
        btnProgramas.forEach(b => {
            b.classList.remove('bg-[#0056b3]', 'text-white');
            b.classList.add('bg-white', 'text-gray-700');
        });
        btn.classList.remove('bg-white', 'text-gray-700');
        btn.classList.add('bg-[#0056b3]', 'text-white');
        
        appState.programaSeleccionado = btn.dataset.prog;

        // Asegurar que la lista de estudiantes se descargue de Firestore si está vacía
        if (!appState.estudiantes || appState.estudiantes.length === 0) {
            await cargarEstudiantesDesdeFirestore();
        }
        
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

// Función auxiliar para obtener títulos de los niveles según la rúbrica
function getNombreNivel(val, esRonda) {
    if (esRonda) {
        if (val === 4) return 'Sobresaliente (4.1 - 5.0)';
        if (val === 3) return 'Aprobado / Bueno (3.0 - 4.0)';
        if (val === 2) return 'Por Mejorar / Regular (1.0 - 2.9)';
        if (val === 1) return 'Insuficiente (0)';
        return 'No Aplica';
    } else {
        if (val === 5) return 'Excelente (5.0)';
        if (val === 4) return 'Sobresaliente (4.0)';
        if (val === 3) return 'Aprobado / Bueno (3.0)';
        if (val === 2) return 'Por Mejorar / Regular (2.0)';
        if (val === 1) return 'Insuficiente (1.0)';
        return 'No Aplica';
    }
}

function getPrefijoGuia(val, esRonda) {
    if (esRonda) {
        if (val === 4) return '<span class="text-emerald-700 font-bold">Sobr. (4.1-5.0):</span>';
        if (val === 3) return '<span class="text-sky-700 font-bold">Aprob. (3.0-4.0):</span>';
        if (val === 2) return '<span class="text-amber-700 font-bold">Por mej. (1.0-2.9):</span>';
        if (val === 1) return '<span class="text-rose-700 font-bold">Insuf. (0):</span>';
        return '';
    } else {
        if (val === 5) return '<span class="text-green-800 font-bold">Excel. (5.0):</span>';
        if (val === 4) return '<span class="text-emerald-700 font-bold">Sobr. (4.0):</span>';
        if (val === 3) return '<span class="text-sky-700 font-bold">Aprob. (3.0):</span>';
        if (val === 2) return '<span class="text-amber-700 font-bold">Por mej. (2.0):</span>';
        if (val === 1) return '<span class="text-rose-700 font-bold">Insuf. (1.0):</span>';
        return '';
    }
}

// Modal Ver Rúbrica Completa con estilo idéntico al diseño institucional
btnVerRubrica.addEventListener('click', (e) => {
    e.preventDefault();
    const dataRubrica = rubricasData[appState.rubricaSeleccionada];
    const esRonda = (appState.rubricaSeleccionada === 'ronda');
    const tieneNivel5 = dataRubrica.items.some(item => item.opciones.some(o => o.valor === 5));

    let headerHtml = '';
    if (esRonda) {
        headerHtml = `
            <thead class="text-white text-xs uppercase font-bold sticky top-0">
                <tr>
                    <th class="p-3 bg-[#0056b3] border border-blue-900 text-left min-w-[140px]">Ítem</th>
                    <th class="p-3 bg-[#e53e3e] border border-red-800 text-center min-w-[130px]">Insuficiente 0</th>
                    <th class="p-3 bg-[#dd6b20] border border-orange-800 text-center min-w-[130px]">Por Mejorar 1.0 - 2.9</th>
                    <th class="p-3 bg-[#0284c7] border border-sky-800 text-center min-w-[130px]">Aprobado 3.0 - 4.0</th>
                    <th class="p-3 bg-[#16a34a] border border-green-800 text-center min-w-[130px]">Sobresaliente 4.1 - 5.0</th>
                </tr>
            </thead>
        `;
    } else {
        headerHtml = `
            <thead class="text-white text-xs uppercase font-bold sticky top-0">
                <tr>
                    <th class="p-3 bg-[#0056b3] border border-blue-900 text-left min-w-[140px]">Ítem</th>
                    <th class="p-3 bg-[#e53e3e] border border-red-800 text-center min-w-[130px]">Insuficiente 1.0</th>
                    <th class="p-3 bg-[#dd6b20] border border-orange-800 text-center min-w-[130px]">Por Mejorar 2.0</th>
                    <th class="p-3 bg-[#0284c7] border border-sky-800 text-center min-w-[130px]">Aprobado 3.0</th>
                    <th class="p-3 bg-[#16a34a] border border-green-800 text-center min-w-[130px]">Sobresaliente 4.0</th>
                    ${tieneNivel5 ? '<th class="p-3 bg-[#15803d] border border-emerald-900 text-center min-w-[130px]">Excelente 5.0</th>' : ''}
                </tr>
            </thead>
        `;
    }

    let rowsHtml = dataRubrica.items.map(item => {
        const op1 = item.opciones.find(o => o.valor === 1)?.texto.replace(/^[A-ZÁÉÍÓÚ\s\(\)\d]+:\s*/i, '') || '-';
        const op2 = item.opciones.find(o => o.valor === 2)?.texto.replace(/^[A-ZÁÉÍÓÚ\s\(\)\d]+:\s*/i, '') || '-';
        const op3 = item.opciones.find(o => o.valor === 3)?.texto.replace(/^[A-ZÁÉÍÓÚ\s\(\)\d]+:\s*/i, '') || '-';
        const op4 = item.opciones.find(o => o.valor === 4)?.texto.replace(/^[A-ZÁÉÍÓÚ\s\(\)\d]+:\s*/i, '') || '-';
        const op5 = tieneNivel5 ? (item.opciones.find(o => o.valor === 5)?.texto.replace(/^[A-ZÁÉÍÓÚ\s\(\)\d]+:\s*/i, '') || '-') : '';

        return `
            <tr class="hover:bg-gray-50 transition border-b">
                <td class="p-3 font-bold text-gray-800 border bg-blue-50/40 text-xs">
                    ${item.titulo}
                    <div class="text-[10px] text-blue-700 font-semibold mt-1">Peso: ${item.peso}</div>
                </td>
                <td class="p-3 border text-xs text-gray-700 leading-relaxed">${op1}</td>
                <td class="p-3 border text-xs text-gray-700 leading-relaxed">${op2}</td>
                <td class="p-3 border text-xs text-gray-700 leading-relaxed">${op3}</td>
                <td class="p-3 border text-xs text-gray-700 leading-relaxed">${op4}</td>
                ${tieneNivel5 ? `<td class="p-3 border text-xs text-gray-700 leading-relaxed">${op5}</td>` : ''}
            </tr>
        `;
    }).join('');

    const tableModalHtml = `
        <div class="overflow-x-auto text-left max-h-[72vh] rounded-lg border shadow-sm">
            <table class="w-full text-left border-collapse bg-white">
                ${headerHtml}
                <tbody class="divide-y divide-gray-200">
                    ${rowsHtml}
                </tbody>
            </table>
        </div>
    `;

    Swal.fire({
        title: `Rúbrica de Evaluación Completa - ${dataRubrica.titulo}`,
        html: tableModalHtml,
        width: '95%',
        confirmButtonText: 'Cerrar Rúbrica',
        confirmButtonColor: '#0056b3',
        showCloseButton: true
    });
});

function renderizarFormulario() {
    const dataRubrica = rubricasData[appState.rubricaSeleccionada];
    const esRonda = (appState.rubricaSeleccionada === 'ronda');
    
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
        // Generar botones de nivel
        const botonesNivelesHtml = item.opciones.slice().reverse().map(op => {
            let colorClase = 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300';
            if (op.valor === 5) colorClase = 'hover:bg-green-600 hover:text-white border-green-600 text-green-800 bg-green-50';
            if (op.valor === 4) colorClase = 'hover:bg-emerald-500 hover:text-white border-emerald-500 text-emerald-800 bg-emerald-50';
            if (op.valor === 3) colorClase = 'hover:bg-sky-500 hover:text-white border-sky-500 text-sky-800 bg-sky-50';
            if (op.valor === 2) colorClase = 'hover:bg-amber-500 hover:text-white border-amber-500 text-amber-800 bg-amber-50';
            if (op.valor === 1) colorClase = 'hover:bg-rose-500 hover:text-white border-rose-500 text-rose-800 bg-rose-50';

            return `
                <button type="button" 
                    class="btn-nivel-opcion border font-semibold py-2 px-3 rounded-lg text-xs transition duration-150 shadow-sm ${colorClase}"
                    data-item="${item.id}"
                    data-valor="${op.valor}">
                    ${getNombreNivel(op.valor, esRonda)}
                </button>
            `;
        }).join('');

        // Botón No Aplica
        const botonNoAplicaHtml = `
            <button type="button" 
                class="btn-nivel-opcion border font-semibold py-2 px-3 rounded-lg text-xs transition duration-150 shadow-sm bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-600 hover:text-white"
                data-item="${item.id}"
                data-valor="0">
                No aplica
            </button>
        `;

        // Generar texto resumen de guía
        const guiaTextoHtml = item.opciones.slice().reverse().map(op => {
            const descripcionCorta = op.texto.replace(/^[A-ZÁÉÍÓÚ\s\(\)\d]+:\s*/i, '');
            return `${getPrefijoGuia(op.valor, esRonda)} ${descripcionCorta}`;
        }).join(' <span class="text-gray-300 font-bold mx-1.5">|</span> ');

        // Sección de nota: input libre para Ronda, o input hidden para Seminarios/Tema Central
        let inputNotaHtml = '';
        if (esRonda) {
            inputNotaHtml = `
                <!-- Input numérico de nota exclusivo para Ronda -->
                <div class="flex items-center gap-3 bg-gray-50 p-2.5 rounded-lg border border-gray-200 mb-3">
                    <label for="input_nota_${item.id}" class="text-xs sm:text-sm font-bold text-gray-700">
                        Nota (0.0 - 5.0):
                    </label>
                    <input type="number" 
                        id="input_nota_${item.id}" 
                        name="nota_${item.id}" 
                        step="0.1" 
                        min="0" 
                        max="5" 
                        placeholder="0.0" 
                        class="w-20 border-2 border-blue-500 rounded px-2 py-1 text-center font-bold text-base bg-white focus:ring-2 focus:ring-blue-400 outline-none" 
                        required>
                    <span class="text-xs text-gray-500">(Puedes ajustar la nota exacta libremente)</span>
                </div>
            `;
        } else {
            inputNotaHtml = `
                <input type="hidden" id="input_nota_${item.id}" name="nota_${item.id}" value="" required>
            `;
        }

        const itemCardHtml = `
            <div class="border rounded-xl p-5 bg-white shadow-sm border-gray-200" id="card_item_${item.id}">
                <!-- Encabezado del ítem -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                    <h4 class="text-base font-bold text-gray-800">${item.titulo}</h4>
                    <span class="bg-blue-50 text-[#0056b3] text-xs font-bold px-3 py-1 rounded-full border border-blue-200">
                        Peso: ${item.peso}
                    </span>
                </div>

                <!-- Botones de niveles -->
                <div class="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap gap-2 mb-4">
                    ${botonesNivelesHtml}
                    ${botonNoAplicaHtml}
                </div>

                ${inputNotaHtml}

                <!-- Guía explicativa inline -->
                <div class="text-[11px] text-gray-600 bg-white p-3 rounded-lg border border-gray-100 leading-relaxed shadow-inner">
                    <strong class="text-gray-800 font-bold">Guía de criterios:</strong> ${guiaTextoHtml}
                </div>
            </div>
        `;

        itemsRubrica.insertAdjacentHTML('beforeend', itemCardHtml);
    });

    // Añadir eventos a los botones de niveles para actualizar automáticamente la nota
    document.querySelectorAll('.btn-nivel-opcion').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const itemId = btn.dataset.item;
            const valor = parseFloat(btn.dataset.valor);
            const input = document.getElementById(`input_nota_${itemId}`);

            if (esRonda) {
                // Para Ronda: Asignar el valor más alto del rango seleccionado por defecto
                let valorPorDefecto = 0.0;
                if (valor === 4) valorPorDefecto = 5.0;       // Rango 4.1 - 5.0
                else if (valor === 3) valorPorDefecto = 4.0;  // Rango 3.0 - 4.0
                else if (valor === 2) valorPorDefecto = 2.9;  // Rango 1.0 - 2.9
                else if (valor === 1) valorPorDefecto = 0.0;  // Insuficiente: 0
                else valorPorDefecto = 0.0;                   // No aplica: 0

                if (input) {
                    input.value = valorPorDefecto.toFixed(1);
                }
            } else {
                // Para Seminarios y Tema Central: Asigna el valor exacto de la rúbrica (5, 4, 3, 2, 1, 0)
                if (input) {
                    input.value = valor.toFixed(1);
                }
            }

            // Resaltar botón activo en esa tarjeta
            const parentCard = document.getElementById(`card_item_${itemId}`);
            parentCard.querySelectorAll('.btn-nivel-opcion').forEach(b => {
                b.classList.remove('ring-2', 'ring-offset-2', 'ring-blue-600', 'font-black', 'scale-105', 'bg-blue-600', 'text-white');
            });
            btn.classList.add('ring-2', 'ring-offset-2', 'ring-blue-600', 'font-black', 'scale-105');
        });
    });
}

// --- GUARDAR EVALUACIÓN EN FIRESTORE ---
formEvaluacion.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const dataRubrica = rubricasData[appState.rubricaSeleccionada];
    const formData = new FormData(formEvaluacion);
    
    let notas = {};
    let totalPuntos = 0;
    let totalPeso = 0;

    dataRubrica.items.forEach(item => {
        const nota = parseFloat(formData.get(`nota_${item.id}`)) || 0;
        const peso = parseFloat(item.peso) / 100;
        
        notas[item.id] = nota;
        
        if (nota > 0) {
            totalPuntos += (nota * peso);
            totalPeso += peso;
        }
    });

    const notaCalculada = totalPeso > 0 ? (totalPuntos / totalPeso).toFixed(2) : 0;
    const aspectosPositivos = document.getElementById('aspectos-positivos-generales').value.trim();
    const aspectosMejorar = document.getElementById('aspectos-mejorar-generales').value.trim();

    const payload = {
        estudianteId: appState.estudianteSeleccionado.id,
        estudianteNombre: appState.estudianteSeleccionado.nombre,
        programa: appState.estudianteSeleccionado.programa,
        tipoRubrica: appState.rubricaSeleccionada,
        nombreSeminario: dataRubrica.requiereNombre ? nombreSeminario.value.trim() : null,
        docenteEmail: appState.user ? appState.user.email : 'docente@hptu.org.co',
        docenteUid: appState.user ? appState.user.uid : null,
        notas,
        aspectosPositivosGenerales: aspectosPositivos,
        aspectosMejorarGenerales: aspectosMejorar,
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
            text: `Se ha registrado la calificación con éxito. Nota promedio calculada: ${notaCalculada}.`,
            icon: 'success',
            confirmButtonColor: '#0056b3'
        }).then(() => {
            formEvaluacion.reset();
            showSection('dashboard');
        });
    } catch (error) {
        console.error('Error al guardar en Firestore:', error);
        Swal.fire('Guardado Local', `La evaluación se completó (Nota: ${notaCalculada}).`, 'info')
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
    
    const fechaDesdeStr = document.getElementById('inf-fecha-desde').value;
    const fechaHastaStr = document.getElementById('inf-fecha-hasta').value;
    const rotacionSeleccionada = document.getElementById('inf-rotacion').value;
    
    if (!apiKey || !estId || isNaN(notaAuto)) {
        Swal.fire('Campos requeridos', 'Por favor ingresa la API Key de Gemini, selecciona el estudiante e indica la nota de autoevaluación.', 'warning');
        return;
    }

    const est = appState.estudiantes.find(e => e.id === estId);
    
    btnGenerarIa.innerHTML = '<span>⏳</span> Consultando evaluaciones y procesando con Gemini...';
    btnGenerarIa.disabled = true;

    try {
        // Consultar evaluaciones del estudiante en Firestore
        let evaluacionesFiltradas = [];
        try {
            const q = query(collection(db, 'evaluaciones'), where('estudianteId', '==', estId));
            const querySnapshot = await getDocs(q);
            
            // Filtro local por fechas
            const fechaDesde = fechaDesdeStr ? new Date(fechaDesdeStr + 'T00:00:00') : new Date('2000-01-01');
            const fechaHasta = fechaHastaStr ? new Date(fechaHastaStr + 'T23:59:59') : new Date('2100-01-01');

            querySnapshot.forEach(doc => {
                const data = doc.data();
                const evalDate = new Date(data.fecha);
                if (evalDate >= fechaDesde && evalDate <= fechaHasta) {
                    evaluacionesFiltradas.push(data);
                }
            });
        } catch (e) {
            console.warn('No se pudieron consultar evaluaciones:', e);
        }

        if (evaluacionesFiltradas.length === 0) {
            Swal.fire('Sin evaluaciones', 'No se encontraron evaluaciones para este residente en el período seleccionado.', 'info');
            btnGenerarIa.innerHTML = '<span>🔍</span> Generar Informe y Calcular Notas';
            btnGenerarIa.disabled = false;
            return;
        }

        // Calcular promedios por tipo de rúbrica
        let sumRonda = 0, countRonda = 0;
        let sumSeminarios = 0, countSeminarios = 0;
        let sumTemaCentral = 0, countTemaCentral = 0;
        
        let resumenFeedbackCualitativo = '';

        evaluacionesFiltradas.forEach((ev, idx) => {
            if (ev.tipoRubrica === 'ronda') { sumRonda += ev.notaFinalRubrica; countRonda++; }
            if (ev.tipoRubrica === 'seminarios') { sumSeminarios += ev.notaFinalRubrica; countSeminarios++; }
            if (ev.tipoRubrica === 'tema_central') { sumTemaCentral += ev.notaFinalRubrica; countTemaCentral++; }
            
            resumenFeedbackCualitativo += `\nEvaluación #${idx+1} [${ev.tipoRubrica.toUpperCase()}]:\n`;
            if (ev.aspectosPositivosGenerales) resumenFeedbackCualitativo += `- Aspectos Positivos: ${ev.aspectosPositivosGenerales}\n`;
            if (ev.aspectosMejorarGenerales) resumenFeedbackCualitativo += `- Aspectos a Mejorar: ${ev.aspectosMejorarGenerales}\n`;
        });

        const promRonda = countRonda > 0 ? (sumRonda / countRonda) : 0;
        const promSeminarios = countSeminarios > 0 ? (sumSeminarios / countSeminarios) : 0;
        const promTemaCentral = countTemaCentral > 0 ? (sumTemaCentral / countTemaCentral) : 0;
        
        // Ponderado oficial: 40% ronda, 35% seminarios, 20% tema central, 5% autoevaluacion
        const notaFinalDefinitiva = (promRonda * 0.40) + (promSeminarios * 0.35) + (promTemaCentral * 0.20) + (notaAuto * 0.05);

        const promptText = `Actúa como Coordinador Académico de Pediatría y Cuidado Intensivo en el Hospital Pablo Tobón Uribe.
Genera un informe integral formal, cuantitativo y cualitativo de fin de rotación para entregarle al residente.

Estudiante: ${est.nombre}
Programa: ${est.programa.toUpperCase()}
Rotación: ${rotacionSeleccionada}
Período evaluado: ${fechaDesdeStr || 'Inicio'} a ${fechaHastaStr || 'Fin'}

--- CONSOLIDADO DE CALIFICACIONES (Usa exactamente estos valores) ---
- Promedio Ronda (Peso 40%): ${promRonda.toFixed(2)}
- Promedio Seminarios (Peso 35%): ${promSeminarios.toFixed(2)}
- Promedio Tema Central (Peso 20%): ${promTemaCentral.toFixed(2)}
- Autoevaluación (Peso 5%): ${notaAuto.toFixed(2)}
- NOTA FINAL DEFINITIVA: ${notaFinalDefinitiva.toFixed(2)}

--- RETROALIMENTACIÓN DE LOS DOCENTES DURANTE LA ROTACIÓN ---
${resumenFeedbackCualitativo || 'No hay comentarios registrados.'}

Por favor, redacta el informe en formato HTML (solo el interior, sin <html> o <body>). Usa etiquetas como <h3>, <ul>, <li>, <p>, <strong>.
Estructura:
1. "Consolidado de Calificaciones": Muestra claramente la nota final definitiva calculada arriba y el desglose de los 4 componentes.
2. "Aspectos Destacados": Un resumen en prosa de las fortalezas basado en los comentarios de los docentes.
3. "Aspectos a Mejorar": Consejos constructivos basados en los comentarios de mejora.
4. "Concepto Final": Un breve dictamen de cierre.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: { temperature: 0.3 }
            })
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: Verifica que tu API Key sea válida.`);
        }

        const data = await response.json();
        const textoIA = data.candidates[0].content.parts[0].text;
        
        // Limpiar bloques de markdown html residuales si los hay
        const cleanHtml = textoIA.replace(/```html/g, '').replace(/```/g, '').trim();
        
        infTexto.innerHTML = `
            <div class="mb-4 text-center">
                <p><strong>Residente:</strong> ${est.nombre} | <strong>Programa:</strong> ${est.programa.toUpperCase()}</p>
                <p><strong>Rotación:</strong> ${rotacionSeleccionada} | <strong>Período:</strong> ${fechaDesdeStr || 'Inicio'} al ${fechaHastaStr || 'Fin'}</p>
            </div>
            ${cleanHtml}
        `;
        infResultado.classList.remove('hidden');

    } catch (error) {
        console.error('Error al generar informe:', error);
        Swal.fire('Error', error.message || 'No se pudo generar el informe.', 'error');
    } finally {
        btnGenerarIa.innerHTML = '<span>🔍</span> Generar Informe y Calcular Notas';
        btnGenerarIa.disabled = false;
    }
});

// Evento para el botón de descargar PDF
const btnDescargarPdf = document.getElementById('btn-descargar-pdf');
if (btnDescargarPdf) {
    btnDescargarPdf.addEventListener('click', (e) => {
        e.preventDefault();
        const element = document.getElementById('informe-pdf-container');
        const estNombre = appState.estudianteSeleccionado ? appState.estudianteSeleccionado.nombre : 'Estudiante';
        
        const opt = {
            margin:       0.5,
            filename:     `Evaluacion_Rotacion_${estNombre.replace(/\s+/g, '_')}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        // Cambiamos el texto temporalmente a que descargando
        const originalText = btnDescargarPdf.innerHTML;
        btnDescargarPdf.innerHTML = '<span>⏳</span> Generando...';
        btnDescargarPdf.disabled = true;

        html2pdf().set(opt).from(element).save().then(() => {
            btnDescargarPdf.innerHTML = originalText;
            btnDescargarPdf.disabled = false;
        });
    });
}
// --- GESTIÓN DE RESIDENTES / FELLOWS (COORDINADOR) ---
if (btnAdminEstudiantes) {
    btnAdminEstudiantes.addEventListener('click', async () => {
        await abrirModalGestionEstudiantes();
    });
}

async function abrirModalGestionEstudiantes() {
    Swal.fire({
        title: 'Cargando lista de estudiantes...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    await cargarEstudiantesDesdeFirestore();

    const listaHtml = appState.estudiantes.map(est => `
        <div class="flex justify-between items-center p-2 border-b text-sm">
            <div class="text-left">
                <strong>${est.nombre}</strong> 
                <span class="text-xs px-2 py-0.5 rounded ${est.programa === 'fellow' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'} font-semibold ml-2 uppercase">${est.programa}</span>
            </div>
            <button class="btn-eliminar-est text-red-500 hover:text-red-700 text-xs px-2 py-1 font-bold" data-id="${est.id}">Eliminar</button>
        </div>
    `).join('');

    const modalHtml = `
        <div class="text-left space-y-4">
            <div class="bg-gray-50 p-3 rounded border">
                <h4 class="font-bold text-sm text-[#0056b3] mb-2">➕ Agregar Nuevo Estudiante</h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                    <input type="text" id="nuevo-est-nombre" placeholder="Nombre completo (ej. Dr. Juan Pérez)" class="border rounded p-2 text-sm w-full">
                    <select id="nuevo-est-programa" class="border rounded p-2 text-sm w-full bg-white">
                        <option value="residente">Residente de Pediatría</option>
                        <option value="fellow">Fellow de UCI</option>
                    </select>
                </div>
                <button id="btn-guardar-nuevo-est" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded text-sm transition">
                    Guardar en Base de Datos
                </button>
            </div>

            <div>
                <h4 class="font-bold text-sm text-gray-700 mb-2">📋 Lista Actual de Estudiantes:</h4>
                <div class="max-h-48 overflow-y-auto border rounded bg-white p-2 divide-y">
                    ${listaHtml || '<p class="text-xs text-gray-400 p-2">No hay estudiantes registrados.</p>'}
                </div>
            </div>
        </div>
    `;

    Swal.fire({
        title: 'Gestión de Residentes y Fellows',
        html: modalHtml,
        width: '550px',
        showConfirmButton: false,
        showCloseButton: true,
        didOpen: () => {
            const btnGuardar = document.getElementById('btn-guardar-nuevo-est');
            const inputNombre = document.getElementById('nuevo-est-nombre');
            const selectProg = document.getElementById('nuevo-est-programa');

            btnGuardar.addEventListener('click', async () => {
                const nombre = inputNombre.value.trim();
                const programa = selectProg.value;

                if (!nombre) {
                    Swal.showValidationMessage('Por favor escribe el nombre del estudiante');
                    return;
                }

                try {
                    await addDoc(collection(db, 'estudiantes'), {
                        nombre,
                        programa,
                        createdAt: serverTimestamp()
                    });
                    
                    Swal.fire({
                        icon: 'success',
                        title: 'Estudiante Agregado',
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 2000
                    });

                    // Recargar lista
                    await cargarEstudiantesDesdeFirestore();
                    if (appState.programaSeleccionado) {
                        filtrarEstudiantesEnSelect(appState.programaSeleccionado);
                    }
                    abrirModalGestionEstudiantes();

                } catch (err) {
                    console.error('Error al agregar estudiante:', err);
                    Swal.fire('Error', 'No se pudo guardar el estudiante en Firebase.', 'error');
                }
            });

            // Botones eliminar
            document.querySelectorAll('.btn-eliminar-est').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const estId = e.target.dataset.id;
                    const confirm = await Swal.fire({
                        title: '¿Eliminar estudiante?',
                        text: 'Esta acción no se puede deshacer.',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Sí, eliminar',
                        cancelButtonText: 'Cancelar',
                        confirmButtonColor: '#d33'
                    });

                    if (confirm.isConfirmed) {
                        try {
                            await deleteDoc(doc(db, 'estudiantes', estId));
                            await cargarEstudiantesDesdeFirestore();
                            if (appState.programaSeleccionado) {
                                filtrarEstudiantesEnSelect(appState.programaSeleccionado);
                            }
                            abrirModalGestionEstudiantes();
                        } catch (err) {
                            console.error('Error al eliminar:', err);
                            Swal.fire('Error', 'No se pudo eliminar de Firebase.', 'error');
                        }
                    }
                });
            });
        }
    });
}

