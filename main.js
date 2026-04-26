// CONFIGURACIÓN OMEGA V19.0 - FULL CAPABILITIES
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const modalPro = document.getElementById('modal-pro');
const voiceToggle = document.getElementById('voice-toggle');
const newChatBtn = document.getElementById('new-chat-btn');
const fileInput = document.getElementById('file-upload');
const filePreview = document.getElementById('file-preview');

let isVoiceEnabled = false;
let attachedFiles = []; // Almacén temporal de archivos

// 1. GESTIÓN DE API KEY
function getApiKey() {
    return localStorage.getItem('custom_key') || import.meta.env.VITE_GEMINI_API_KEY;
}

// 2. DESCUBRIMIENTO DE MODELO (Tu llave del éxito)
async function findWorkingModel(KEY) {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${KEY}`);
        const data = await response.json();
        if (!data.models) return null;
        const bestModel = data.models.find(m => 
            m.supportedGenerationMethods.includes('generateContent') && 
            (m.name.includes('flash') || m.name.includes('pro'))
        );
        return bestModel ? bestModel.name : null;
    } catch (e) { return null; }
}

// 3. PROCESAMIENTO DE ARCHIVOS (Base64)
fileInput.addEventListener('change', async () => {
    filePreview.innerHTML = '';
    attachedFiles = [];
    
    for (const file of fileInput.files) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64Data = e.target.result.split(',')[1];
            attachedFiles.push({
                inline_data: { mime_type: file.type, data: base64Data }
            });
            // Crear miniatura visual
            const span = document.createElement('span');
            span.className = 'file-tag';
            span.innerHTML = `<i class="fa-solid fa-file-code"></i> ${file.name}`;
            filePreview.appendChild(span);
        };
        reader.readAsDataURL(file);
    }
});

// 4. LÓGICA DE VOZ (Narrador)
function speak(text) {
    if (!isVoiceEnabled) return;
    window.speechSynthesis.cancel();
    const chunks = text.split(/[.;?!]/); // Fragmentación por puntuación
    chunks.forEach(chunk => {
        const ut = new SpeechSynthesisUtterance(chunk);
        ut.lang = 'es-ES';
        ut.rate = 1.1;
        window.speechSynthesis.speak(ut);
    });
}

voiceToggle.addEventListener('click', () => {
    isVoiceEnabled = !isVoiceEnabled;
    voiceToggle.classList.toggle('active');
    voiceToggle.innerHTML = isVoiceEnabled ? 
        '<i class="fa-solid fa-volume-high"></i>' : 
        '<i class="fa-solid fa-volume-xmark"></i>';
    if (!isVoiceEnabled) window.speechSynthesis.cancel();
});

// 5. NUEVO CHAT (Limpiar pantalla)
newChatBtn.addEventListener('click', () => {
    chatMessages.innerHTML = '';
    appendMessage('ai', 'SISTEMA REINICIADO. Memoria volátil purgada. ¿Nueva misión?');
});

// 6. ENVÍO DE DATOS (Texto + Archivos)
async function fetchGemini(prompt) {
    const KEY = getApiKey();
    const modelPath = await findWorkingModel(KEY);

    if (!modelPath) {
        modalPro.style.display = 'flex';
        return "🚨 ERROR: No se detectaron modelos compatibles.";
    }

    try {
        const URL = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${KEY}`;
        
        // Unimos el texto con los archivos adjuntos
        const parts = [{ text: prompt }, ...attachedFiles];

        const response = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts }] })
        });

        const data = await response.json();
        attachedFiles = []; // Limpiar archivos tras enviar
        filePreview.innerHTML = '';

        if (response.ok) {
            return data.candidates[0].content.parts[0].text;
        } else {
            return `🚨 ERROR: ${data.error.message}`;
        }
    } catch (err) {
        return "🚨 ERROR DE RED.";
    }
}

// 7. RENDERIZADO DE MENSAJES
function appendMessage(role, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    
    // Formateo de KPIs (Valores en Naranja Neón)
    const formattedText = text.replace(/(\d+(?:\.\d+)?%|\$\d+(?:\.\d+)?)/g, '<code class="kpi">$1</code>');
    
    msgDiv.innerHTML = role === 'ai' ? marked.parse(formattedText) : `<b>AGENTE:</b> ${text}`;
    
    if (role === 'ai') {
        const btn = document.createElement('button');
        btn.className = "cyber-button mini";
        btn.innerText = "COPIAR";
        btn.onclick = () => {
            navigator.clipboard.writeText(text);
            btn.innerText = "¡COPIADO!";
            setTimeout(() => btn.innerText = "COPIAR", 2000);
        };
        msgDiv.appendChild(btn);
        speak(text); // Ejecutar voz si está activa
    }
    
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    Prism.highlightAll();
}

sendBtn.addEventListener('click', async () => {
    const text = userInput.value.trim();
    if (!text && attachedFiles.length === 0) return;

    appendMessage('user', text || "(Archivo enviado)");
    userInput.value = '';
    
    const res = await fetchGemini(text || "Analiza estos archivos adjuntos.");
    appendMessage('ai', res);
});

// Modal Pro
document.getElementById('save-key-btn').addEventListener('click', () => {
    const newK = document.getElementById('new-api-key').value.trim();
    if (newK) {
        localStorage.setItem('custom_key', newK);
        location.reload();
    }
});

userInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendBtn.click(); } });