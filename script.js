// ============================================
// CONFIGURAÇÃO DO FIREBASE
// ============================================
// INSTRUÇÕES: Substitua os valores abaixo pelas suas credenciais do Firebase
// 1. Acesse https://console.firebase.google.com
// 2. Crie um novo projeto
// 3. Ative o Firestore Database (modo teste)
// 4. Vá em "Configurações do Projeto" > "Aplicativos" > "Web"
// 5. Copie as credenciais e substitua abaixo

const firebaseConfig = {
    apiKey: "AIzaSyBDsI99-q_l1guxeta6erbnoFuMcSv-qBw", // Substitua pelo seu
    authDomain: "projeto-1-717f0.firebaseapp.com", // Substitua pelo seu
    projectId: "projeto-1-717f0", // Substitua pelo seu
    storageBucket: "projeto-1-717f0.appspot.com", // Substitua pelo seu
    messagingSenderId: "313396412559", // Substitua pelo seu
    appId: "1:313396412559:web:a967ed3a44bb341cf3f0fa" // Substitua pelo seu
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let encontros = [];
let encontroAtualId = null;
let estrelasSelecionadas = 0;
let encontroEditando = null;
let usuarioAtual = null;
let isAdmin = false;
let unsubscribe = null;

const encontrosExemplo = [
    {
        nome: "Mc'donalds (Barra Funda)",
        imagem: null,
        avaliacoes: [],
        data: null,
        isFuturo: false
    },
    {
        nome: "Pastelaria da Ex noiva",
        imagem: null,
        avaliacoes: [],
        data: null,
        isFuturo: false
    },
    {
        nome: "Pastelaria do bebum perdido",
        imagem: null,
        avaliacoes: [],
        data: null,
        isFuturo: false
    },
    {
        nome: "Marmita de pagamento em 90 dias",
        imagem: null,
        avaliacoes: [],
        data: null,
        isFuturo: false
    },
    {
        nome: "Conveniência Barra Funda (picolé preço de 2 leva 1)",
        imagem: null,
        avaliacoes: [],
        data: null,
        isFuturo: false
    }
];

// ============================================
// INICIALIZAÇÃO
// ============================================
async function inicializar() {
    obterUsuarioAtual();
    isAdmin = usuarioAtual === 'alex';
    
    // Verificar se é a primeira vez
    const docRef = db.collection('config').doc('geral');
    const docSnap = await docRef.get();
    
    if (!docSnap.exists()) {
        // Primeira vez - criar dados de exemplo
        await inicializarDadosExemplo();
    }
    
    // Configurar listener para sincronização em tempo real
    configurarListenerEncontros();
    atualizarPainelAdmin();
}

async function inicializarDadosExemplo() {
    try {
        for (const encontro of encontrosExemplo) {
            await db.collection('encontros').add({
                ...encontro,
                criadoEm: new Date()
            });
        }
        await db.collection('config').doc('geral').set({
            inicializado: true
        });
    } catch (error) {
        console.error('Erro ao inicializar dados:', error);
    }
}

function configurarListenerEncontros() {
    // Se já existe um listener, remover
    if (unsubscribe) {
        unsubscribe();
    }

    // Configurar novo listener - SINCRONIZAÇÃO EM TEMPO REAL
    unsubscribe = db.collection('encontros')
        .orderBy('criadoEm', 'desc')
        .onSnapshot((snapshot) => {
            encontros = [];
            snapshot.forEach((doc) => {
                encontros.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            renderizarEncontros();
        }, (error) => {
            console.error('Erro ao carregar encontros:', error);
        });
}

function obterUsuarioAtual() {
    let usuario = sessionStorage.getItem('usuarioAtual');
    if (!usuario) {
        const nome = prompt('Qual é o seu nome?');
        if (nome) {
            usuario = nome.toLowerCase().trim();
            sessionStorage.setItem('usuarioAtual', usuario);
        } else {
            usuario = 'usuario_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('usuarioAtual', usuario);
        }
    }
    usuarioAtual = usuario;
    return usuario;
}

// ============================================
// RENDERIZAÇÃO
// ============================================
function renderizarEncontros() {
    const grid = document.getElementById('encontrosGrid');
    grid.innerHTML = '';

    if (encontros.length === 0) {
        grid.innerHTML = '<div class="loading">Nenhum encontro ainda. Crie um novo!</div>';
        return;
    }

    encontros.forEach(encontro => {
        const mediaNotas = encontro.avaliacoes.length > 0
            ? (encontro.avaliacoes.reduce((sum, a) => sum + a.nota, 0) / encontro.avaliacoes.length).toFixed(1)
            : 0;

        const estrelas = '★'.repeat(Math.round(mediaNotas)) + '☆'.repeat(5 - Math.round(mediaNotas));
        const usuarioJaAvaliou = encontro.avaliacoes.some(a => a.usuario === usuarioAtual);

        const card = document.createElement('div');
        card.className = 'encontro-card';
        card.innerHTML = `
            <div class="card-image-container">
                ${encontro.imagem ? 
                    `<img src="${encontro.imagem}" alt="${encontro.nome}" class="card-image">` : 
                    `<div class="placeholder-image">📸</div>`
                }
                <button class="btn-edit-menu" onclick="abrirMenuEdicao(event, '${encontro.id}')">⚙️</button>
            </div>
            <div class="card-content">
                <div class="card-title">
                    <div style="flex: 1;">
                        ${encontro.nome}
                        ${encontro.isFuturo && !dataPassou(encontro.data) ? '<span class="future-badge">FUTURO</span>' : ''}
                    </div>
                </div>
                ${encontro.data ? `<div class="card-date">📅 ${formatarData(encontro.data)}</div>` : ''}
                <div class="card-rating">
                    <span class="stars">${estrelas}</span>
                    <span class="rating-value">${mediaNotas}/5</span>
                </div>
                <div class="card-reviews">${encontro.avaliacoes.length} avaliações</div>
                
                ${encontro.avaliacoes.length > 0 ? `
                    <div style="margin-bottom: 15px; max-height: 150px; overflow-y: auto;">
                        ${encontro.avaliacoes.map(a => `
                            <div class="user-review">
                                <div class="user-review-header">
                                    <span>${a.usuario}</span>
                                    <span class="user-review-stars">${'★'.repeat(a.nota)}${'☆'.repeat(5-a.nota)}</span>
                                </div>
                                ${a.comentario ? `<div class="user-review-comment">"${a.comentario}"</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}

                ${usuarioJaAvaliou ? `
                    <div class="already-rated">✓ Você já avaliou este local</div>
                ` : `
                    <button class="btn-avaliar" onclick="abrirModalAvaliar('${encontro.id}')">Avaliar</button>
                `}
            </div>
        `;
        grid.appendChild(card);
    });
}

function atualizarPainelAdmin() {
    const panel = document.getElementById('adminPanel');
    
    if (isAdmin) {
        const encontrosMarcados = encontros.filter(e => e.isFuturo && !dataPassou(e.data)).length;
        panel.innerHTML = `
            <div class="admin-panel">
                <h3>🔐 Painel de Administrador (${usuarioAtual})</h3>
                <p>Encontros marcados: ${encontrosMarcados}</p>
                <div class="admin-buttons">
                    <button class="admin-btn" onclick="resetarEncontrosMarcados()">Resetar Encontros Marcados</button>
                    <button class="admin-btn" onclick="resetarTudo()">Resetar Tudo</button>
                </div>
            </div>
        `;
    } else {
        panel.innerHTML = '';
    }
}

// ============================================
// MODAIS
// ============================================
function abrirModalNovoEncontro() {
    document.getElementById('modalNovoEncontro').style.display = 'block';
}

function abrirModalMarcarEncontro() {
    document.getElementById('modalMarcarEncontro').style.display = 'block';
    document.getElementById('marcarData').valueAsDate = new Date();
}

function abrirModalAvaliar(id) {
    encontroAtualId = id;
    const encontro = encontros.find(e => e.id === id);
    document.getElementById('avaliarTitulo').textContent = `Avaliar: ${encontro.nome}`;
    document.getElementById('modalAvaliar').style.display = 'block';
    estrelasSelecionadas = 0;
    atualizarEstrelas();
    document.getElementById('comentario').value = '';
}

function abrirMenuEdicao(event, id) {
    event.stopPropagation();
    
    // Remover menu anterior se existir
    const menuAnterior = document.querySelector('.edit-menu');
    if (menuAnterior) {
        menuAnterior.remove();
    }

    const encontro = encontros.find(e => e.id === id);
    const menu = document.createElement('div');
    menu.className = 'edit-menu';
    menu.innerHTML = `
        <button onclick="abrirModalEditarEncontro('${id}')">✏️ Editar Nome/Foto</button>
        ${isAdmin ? `<button onclick="excluirEncontro('${id}')">🗑️ Excluir</button>` : ''}
    `;
    
    event.target.parentElement.appendChild(menu);
    
    // Fechar menu ao clicar fora
    document.addEventListener('click', function fecharMenu(e) {
        if (!menu.contains(e.target) && !e.target.classList.contains('btn-edit-menu')) {
            menu.remove();
            document.removeEventListener('click', fecharMenu);
        }
    });
}

function abrirModalEditarEncontro(id) {
    encontroEditando = id;
    const encontro = encontros.find(e => e.id === id);
    document.getElementById('editarNomeInput').value = encontro.nome;
    document.getElementById('modalEditarEncontro').style.display = 'block';
    document.getElementById('editarImagemInput').value = '';
    document.getElementById('previewEditarImagem').innerHTML = encontro.imagem 
        ? `<img src="${encontro.imagem}" alt="Preview">` 
        : '<div class="empty-state">Selecione uma imagem</div>';
}

function fecharModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// ============================================
// AVALIAÇÕES
// ============================================
function selecionarEstrela(numero) {
    estrelasSelecionadas = numero;
    atualizarEstrelas();
}

function atualizarEstrelas() {
    const stars = document.querySelectorAll('#starRating span');
    stars.forEach((star, index) => {
        if (index < estrelasSelecionadas) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

async function enviarAvaliacao() {
    if (estrelasSelecionadas === 0) {
        alert('Por favor, selecione uma nota!');
        return;
    }

    const encontro = encontros.find(e => e.id === encontroAtualId);
    
    if (encontro.avaliacoes.some(a => a.usuario === usuarioAtual)) {
        alert('Você já avaliou este local!');
        return;
    }

    try {
        const novaAvaliacao = {
            usuario: usuarioAtual,
            nota: estrelasSelecionadas,
            comentario: document.getElementById('comentario').value
        };

        const avaliacoesAtualizadas = [...encontro.avaliacoes, novaAvaliacao];

        await db.collection('encontros').doc(encontroAtualId).update({
            avaliacoes: avaliacoesAtualizadas
        });

        fecharModal('modalAvaliar');
        alert('Avaliação enviada com sucesso!');
    } catch (error) {
        console.error('Erro ao enviar avaliação:', error);
        alert('Erro ao enviar avaliação');
    }
}

// ============================================
// ADICIONAR/MARCAR ENCONTROS
// ============================================
async function adicionarNovoEncontro() {
    const nome = document.getElementById('novoNome').value.trim();
    const imagemInput = document.getElementById('novaImagemInput');

    if (!nome) {
        alert('Por favor, insira o nome do local!');
        return;
    }

    try {
        let imagem = null;
        if (imagemInput.files.length > 0) {
            imagem = await lerArquivoComoBase64(imagemInput.files[0]);
        }

        await db.collection('encontros').add({
            nome: nome,
            imagem: imagem,
            avaliacoes: [],
            data: null,
            isFuturo: false,
            criadoEm: new Date()
        });

        fecharModal('modalNovoEncontro');
        document.getElementById('novoNome').value = '';
        imagemInput.value = '';
        document.getElementById('previewNovaImagem').innerHTML = '<div class="empty-state">Selecione uma imagem</div>';
        alert('Encontro adicionado com sucesso!');
    } catch (error) {
        console.error('Erro ao adicionar encontro:', error);
        alert('Erro ao adicionar encontro');
    }
}

async function marcarNovoEncontro() {
    const nome = document.getElementById('marcarNome').value.trim();
    const data = document.getElementById('marcarData').value;
    const imagemInput = document.getElementById('marcarImagemInput');

    if (!nome) {
        alert('Por favor, insira o nome do local!');
        return;
    }

    if (!data) {
        alert('Por favor, selecione uma data!');
        return;
    }

    try {
        let imagem = null;
        if (imagemInput.files.length > 0) {
            imagem = await lerArquivoComoBase64(imagemInput.files[0]);
        }

        await db.collection('encontros').add({
            nome: nome,
            imagem: imagem,
            avaliacoes: [],
            data: data,
            isFuturo: true,
            criadoEm: new Date()
        });

        // Verificar achievement
        verificarAchievement();

        fecharModal('modalMarcarEncontro');
        document.getElementById('marcarNome').value = '';
        document.getElementById('marcarData').value = '';
        imagemInput.value = '';
        document.getElementById('previewMarcarImagem').innerHTML = '<div class="empty-state">Selecione uma imagem</div>';
        alert('Encontro agendado com sucesso!');
    } catch (error) {
        console.error('Erro ao marcar encontro:', error);
        alert('Erro ao marcar encontro');
    }
}

// ============================================
// EDITAR ENCONTRO
// ============================================
async function salvarEdicaoEncontro() {
    const novoNome = document.getElementById('editarNomeInput').value.trim();
    const imagemInput = document.getElementById('editarImagemInput');
    const encontro = encontros.find(e => e.id === encontroEditando);

    if (!novoNome) {
        alert('Por favor, insira um nome válido!');
        return;
    }

    try {
        const atualizacoes = {
            nome: novoNome
        };

        if (imagemInput.files.length > 0) {
            atualizacoes.imagem = await lerArquivoComoBase64(imagemInput.files[0]);
        }

        await db.collection('encontros').doc(encontroEditando).update(atualizacoes);

        fecharModal('modalEditarEncontro');
        alert('Encontro atualizado com sucesso!');
    } catch (error) {
        console.error('Erro ao atualizar encontro:', error);
        alert('Erro ao atualizar encontro');
    }
}

// ============================================
// EXCLUIR ENCONTRO (APENAS ADMIN)
// ============================================
async function excluirEncontro(id) {
    if (!isAdmin) {
        alert('Apenas administradores podem excluir encontros!');
        return;
    }

    if (confirm('Tem certeza que deseja excluir este encontro?')) {
        try {
            await db.collection('encontros').doc(id).delete();
            alert('Encontro excluído com sucesso!');
        } catch (error) {
            console.error('Erro ao excluir encontro:', error);
            alert('Erro ao excluir encontro');
        }
    }
}

// ============================================
// ACHIEVEMENTS
// ============================================
function verificarAchievement() {
    const encontrosMarcados = encontros.filter(e => e.isFuturo && !dataPassou(e.data)).length;
    
    // Mostrar achievement apenas quando atingir múltiplos de 3
    if (encontrosMarcados % 3 === 0 && encontrosMarcados > 0) {
        const ciclo = encontrosMarcados / 3;
        mostrarAchievement(ciclo, encontrosMarcados);
    }
}

function mostrarAchievement(ciclo, totalEncontros) {
    let achievement;
    let mensagem;
    
    if (ciclo === 1) {
        achievement = { titulo: "Conversante", emoji: "💬" };
        mensagem = `Alguém marcou ${totalEncontros} encontros! Isso é mais que amizade!`;
    } else if (ciclo === 2) {
        achievement = { titulo: "Ficantes de Trabalho", emoji: "💼" };
        mensagem = `${totalEncontros} encontros marcados? Vocês não conseguem ficar um dia sem se ver!`;
    } else {
        achievement = { titulo: "Ficantes de Trabalho", emoji: "💼" };
        if (ciclo % 2 === 0) {
            mensagem = `${totalEncontros} encontros marcados? Vocês não conseguem ficar um dia sem se ver!`;
        } else {
            mensagem = `Alguém marcou ${totalEncontros} encontros! Isso é mais que amizade!`;
        }
    }
    
    document.getElementById('achievementIcon').textContent = achievement.emoji;
    document.getElementById('achievementTitle').textContent = `Parabéns, ${usuarioAtual}!`;
    document.getElementById('achievementSubtitle').textContent = `Agora vocês são: ${achievement.titulo}`;
    document.getElementById('achievementMessage').textContent = mensagem;
    
    document.getElementById('achievementModal').style.display = 'flex';
}

function fecharAchievement() {
    document.getElementById('achievementModal').style.display = 'none';
}

// ============================================
// ADMIN - RESET
// ============================================
async function resetarEncontrosMarcados() {
    if (!isAdmin) {
        alert('Apenas administradores podem fazer isso!');
        return;
    }

    if (confirm('Deseja resetar apenas os encontros marcados?')) {
        try {
            const batch = db.batch();
            encontros.forEach(e => {
                if (e.isFuturo) {
                    batch.update(db.collection('encontros').doc(e.id), {
                        isFuturo: false
                    });
                }
            });
            await batch.commit();
            alert('Encontros marcados resetados!');
        } catch (error) {
            console.error('Erro ao resetar encontros marcados:', error);
            alert('Erro ao resetar encontros marcados');
        }
    }
}

async function resetarTudo() {
    if (!isAdmin) {
        alert('Apenas administradores podem fazer isso!');
        return;
    }

    if (confirm('Tem certeza que deseja resetar TUDO? Essa ação não pode ser desfeita!')) {
        try {
            // Deletar todos os encontros
            const batch = db.batch();
            encontros.forEach(e => {
                batch.delete(db.collection('encontros').doc(e.id));
            });
            await batch.commit();

            // Reinicializar com dados de exemplo
            await inicializarDadosExemplo();
            alert('Tudo foi resetado!');
        } catch (error) {
            console.error('Erro ao resetar tudo:', error);
            alert('Erro ao resetar tudo');
        }
    }
}

// ============================================
// UTILITÁRIOS
// ============================================
function formatarData(dataString) {
    if (!dataString) return '';
    const data = new Date(dataString + 'T00:00:00');
    return data.toLocaleDateString('pt-BR');
}

function dataPassou(dataString) {
    if (!dataString) return false;
    const data = new Date(dataString + 'T00:00:00');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return data < hoje;
}

function previewImagem(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);

    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function lerArquivoComoBase64(arquivo) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(arquivo);
    });
}

window.onclick = function(event) {
    const modals = ['modalNovoEncontro', 'modalMarcarEncontro', 'modalAvaliar', 'modalEditarEncontro'];
    modals.forEach(id => {
        const modal = document.getElementById(id);
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    const achievementModal = document.getElementById('achievementModal');
    if (event.target === achievementModal) {
        achievementModal.style.display = 'none';
    }
}

window.addEventListener('load', inicializar);
