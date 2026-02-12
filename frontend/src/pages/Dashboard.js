import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import moment from 'moment';
import 'moment/locale/pt-br';
import {
    Calendar, Users, Settings, Scissors, LogOut, Check, Clock,
    User, Save, Coffee, CreditCard, Camera, Upload, Smile, Briefcase, Trash2, Edit2, AlertCircle, Shield, Building, PlusCircle, Activity, ArrowLeft, BarChart2, Eye
} from 'lucide-react';

moment.locale('pt-br');

const ConfirmationModal = ({ onClose }) => (
    <div className="modal-overlay">
        <div className="modal-content">
            <div style={{ marginBottom: 15, background: '#ecfdf5', width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                <Smile size={32} color="#10b981" />
            </div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: 8, color: '#064e3b' }}>Agendado com Sucesso!</h2>
            <p style={{ color: '#6b7280', fontSize: '0.95rem', marginBottom: 20 }}>Seu horário está garantido.</p>
            <button onClick={onClose} className="btn btn-primary" style={{ width: '100%', background: '#10b981' }}>Perfeito!</button>
        </div>
    </div>
);

// --- COMPONENTE DO SUPER ADMIN (BACKOFFICE) ---
const SuperAdminView = () => {
    const [view, setView] = useState('list'); // 'list' ou 'details'
    const [empresas, setEmpresas] = useState([]);
    const [selectedEmpresa, setSelectedEmpresa] = useState(null); // Dados completos da empresa selecionada
    const [loading, setLoading] = useState(true);

    // Form de criação
    const [form, setForm] = useState({ nome: '', slug: '', email_dono: '', senha_dono: '', plano: 'pro' });

    // Form de edição (quando dentro da empresa)
    const [editForm, setEditForm] = useState({});

    // Carrega lista inicial
    const loadEmpresas = async () => {
        setLoading(true);
        try { const res = await api.get('/admin/empresas'); setEmpresas(res.data); } catch (e) { }
        setLoading(false);
    };

    useEffect(() => { loadEmpresas(); }, []);

    // Carrega detalhes de UMA empresa (Raio-X)
    const abrirDetalhes = async (id) => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/empresas/${id}`);
            setSelectedEmpresa(res.data);
            setEditForm({
                nome: res.data.nome,
                slug: res.data.slug,
                cor_primaria: res.data.cor_primaria,
                plano: res.data.plano,
                status_assinatura: res.data.status_assinatura
            });
            setView('details');
        } catch (e) { alert("Erro ao carregar detalhes."); }
        setLoading(false);
    };

    const criarEmpresa = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/empresas', form);
            alert("Empresa criada!");
            setForm({ nome: '', slug: '', email_dono: '', senha_dono: '', plano: 'pro' });
            loadEmpresas();
        } catch (e) { alert("Erro: " + e.response?.data?.erro); }
    };

    const salvarEdicaoEmpresa = async (e) => {
        e.preventDefault();
        if (!selectedEmpresa) return;
        try {
            await api.put(`/admin/empresas/${selectedEmpresa.id}`, editForm);
            alert("Dados atualizados!");
            abrirDetalhes(selectedEmpresa.id); // Recarrega os dados
        } catch (e) { alert("Erro ao salvar."); }
    };

    const toggleStatus = async () => {
        if (!selectedEmpresa) return;
        const novoStatus = selectedEmpresa.status_assinatura === 'ativa' ? 'bloqueada' : 'ativa';
        if (!window.confirm(`Deseja mudar para ${novoStatus}?`)) return;

        try {
            // Reutiliza a rota de update geral para mudar status
            await api.put(`/admin/empresas/${selectedEmpresa.id}`, { status_assinatura: novoStatus });
            alert("Status alterado!");
            abrirDetalhes(selectedEmpresa.id);
        } catch (e) { alert("Erro ao mudar status."); }
    };

    // --- RENDERIZAÇÃO BACKOFFICE ---

    // 1. VISÃO DETALHADA (DENTRO DA EMPRESA)
    if (view === 'details' && selectedEmpresa) {
        const totalAgendamentos = selectedEmpresa.agendamentos ? selectedEmpresa.agendamentos.length : 0;
        const faturamentoEstimado = selectedEmpresa.agendamentos ? selectedEmpresa.agendamentos.reduce((acc, ag) => {
            // Tenta achar o preço do serviço no agendamento (lógica simplificada)
            // Em produção ideal, o valor deveria estar salvo no agendamento para histórico
            return acc + 30; // Valor médio estimado para visualização
        }, 0) : 0;

        return (
            <div style={{ padding: 20 }}>
                <button onClick={() => { setView('list'); loadEmpresas(); }} className="btn btn-ghost" style={{ marginBottom: 20 }}>
                    <ArrowLeft size={18} /> Voltar para Lista
                </button>

                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                        <div style={{ width: 60, height: 60, borderRadius: 10, background: selectedEmpresa.cor_primaria, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 24 }}>
                            {selectedEmpresa.nome.charAt(0)}
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', margin: 0 }}>{selectedEmpresa.nome}</h1>
                            <div style={{ color: '#64748b' }}>slug: /{selectedEmpresa.slug}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={toggleStatus} className="btn" style={{ background: selectedEmpresa.status_assinatura === 'ativa' ? '#fee2e2' : '#dcfce7', color: selectedEmpresa.status_assinatura === 'ativa' ? '#991b1b' : '#166534' }}>
                            {selectedEmpresa.status_assinatura === 'ativa' ? 'Bloquear Empresa' : 'Ativar Empresa'}
                        </button>
                    </div>
                </header>

                <div className="grid-2-col" style={{ gridTemplateColumns: '2fr 1fr' }}>
                    {/* ESQUERDA: DADOS E ESTATÍSTICAS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* STATS */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 15 }}>
                            <div className="card" style={{ marginBottom: 0, textAlign: 'center', padding: 15 }}>
                                <Users size={24} color="#3b82f6" style={{ marginBottom: 5 }} />
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{selectedEmpresa.usuarios?.length || 0}</div>
                                <div style={{ fontSize: '0.8rem', color: '#666' }}>Usuários</div>
                            </div>
                            <div className="card" style={{ marginBottom: 0, textAlign: 'center', padding: 15 }}>
                                <Calendar size={24} color="#10b981" style={{ marginBottom: 5 }} />
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{totalAgendamentos}</div>
                                <div style={{ fontSize: '0.8rem', color: '#666' }}>Agendamentos</div>
                            </div>
                            <div className="card" style={{ marginBottom: 0, textAlign: 'center', padding: 15 }}>
                                <Scissors size={24} color="#f59e0b" style={{ marginBottom: 5 }} />
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{selectedEmpresa.servicos?.length || 0}</div>
                                <div style={{ fontSize: '0.8rem', color: '#666' }}>Serviços</div>
                            </div>
                        </div>

                        {/* LISTAS */}
                        <div className="card">
                            <h3>Equipe ({selectedEmpresa.usuarios?.filter(u => u.role !== 'cliente').length})</h3>
                            {selectedEmpresa.usuarios?.filter(u => u.role !== 'cliente').map(u => (
                                <div key={u.id} className="list-item">
                                    <div><strong>{u.nome}</strong> <span style={{ fontSize: '0.8rem', color: '#666' }}>({u.role})</span></div>
                                    <div>{u.email}</div>
                                </div>
                            ))}
                        </div>

                        <div className="card">
                            <h3>Serviços</h3>
                            {selectedEmpresa.servicos?.map(s => (
                                <div key={s.id} className="list-item">
                                    <strong>{s.nome}</strong>
                                    <span>R$ {s.preco} • {s.duracao_minutos}m</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* DIREITA: GERENCIAR EMPRESA */}
                    <div className="card" style={{ height: 'fit-content' }}>
                        <h3><Settings size={20} /> Gerenciar Empresa</h3>
                        <form onSubmit={salvarEdicaoEmpresa} style={{ display: 'grid', gap: 15 }}>
                            <div><label className="label">Nome Fantasia</label><input className="input" value={editForm.nome} onChange={e => setEditForm({ ...editForm, nome: e.target.value })} /></div>
                            <div><label className="label">Slug (Link)</label><input className="input" value={editForm.slug} onChange={e => setEditForm({ ...editForm, slug: e.target.value })} /></div>
                            <div><label className="label">Cor Tema</label><input type="color" className="input" style={{ height: 45 }} value={editForm.cor_primaria} onChange={e => setEditForm({ ...editForm, cor_primaria: e.target.value })} /></div>
                            <div>
                                <label className="label">Plano</label>
                                <select className="input" value={editForm.plano} onChange={e => setEditForm({ ...editForm, plano: e.target.value })}>
                                    <option value="basico">Básico</option>
                                    <option value="pro">Pro</option>
                                </select>
                            </div>
                            <button className="btn btn-primary">Salvar Alterações</button>
                        </form>

                        <div style={{ marginTop: 30, paddingTop: 20, borderTop: '1px solid #eee' }}>
                            <h4>Horários Configurados</h4>
                            <div style={{ display: 'grid', gap: 5, fontSize: '0.85rem' }}>
                                {selectedEmpresa.horario_funcionamentos?.sort((a, b) => a.dia_semana - b.dia_semana).map(h => (
                                    <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', color: h.ativo ? '#000' : '#999' }}>
                                        <span>{moment().day(h.dia_semana).format('dddd')}</span>
                                        <span>{h.ativo ? `${h.abertura} - ${h.fechamento}` : 'Fechado'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 2. VISÃO LISTA (TELA INICIAL)
    return (
        <div style={{ padding: 20 }}>
            <header style={{ marginBottom: 30, borderBottom: '1px solid #eee', paddingBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#0f172a' }}>
                    <Shield size={32} />
                    <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Painel Master</h1>
                </div>
                <p style={{ color: '#64748b' }}>Gerencie todas as empresas do SaaS.</p>
            </header>

            <div className="grid-2-col">
                <div className="card" style={{ height: 'fit-content' }}>
                    <h3><PlusCircle size={20} style={{ verticalAlign: 'middle' }} /> Cadastrar Nova Barbearia</h3>
                    <form onSubmit={criarEmpresa} style={{ display: 'grid', gap: 15 }}>
                        <input className="input" placeholder="Nome Barbearia" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required />
                        <input className="input" placeholder="Link (ex: barbearia-top)" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} required />
                        <div style={{ height: 1, background: '#eee', margin: '5px 0' }}></div>
                        <input className="input" placeholder="Email do Dono" value={form.email_dono} onChange={e => setForm({ ...form, email_dono: e.target.value })} required />
                        <input className="input" placeholder="Senha do Dono" value={form.senha_dono} onChange={e => setForm({ ...form, senha_dono: e.target.value })} required />
                        <select className="input" value={form.plano} onChange={e => setForm({ ...form, plano: e.target.value })}>
                            <option value="basico">Plano Básico</option>
                            <option value="pro">Plano Pro</option>
                        </select>
                        <button className="btn btn-primary">Criar Empresa</button>
                    </form>
                </div>

                <div className="card">
                    <h3><Building size={20} style={{ verticalAlign: 'middle' }} /> Empresas Cadastradas</h3>
                    {loading ? <p>Carregando...</p> : (
                        <div style={{ display: 'grid', gap: 15 }}>
                            {empresas.map(emp => (
                                <div
                                    key={emp.id}
                                    className="card"
                                    style={{ marginBottom: 0, cursor: 'pointer', borderLeft: `5px solid ${emp.status_assinatura === 'ativa' ? '#10b981' : '#ef4444'}` }}
                                    onClick={() => abrirDetalhes(emp.id)}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
                                            <div style={{ width: 40, height: 40, background: emp.cor_primaria, borderRadius: 8, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', fontWeight: 'bold' }}>
                                                {emp.nome.charAt(0)}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{emp.nome}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#666' }}>/{emp.slug} • {emp.plano}</div>
                                            </div>
                                        </div>
                                        <Eye size={20} color="#64748b" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- DASHBOARD NORMAL (CLIENTE/DONO) ---
const Dashboard = ({ usuario, empresa }) => {
    // Roteador de Visão
    if (usuario.role === 'admin_geral') {
        return (
            <div className="layout">
                <aside className="sidebar">
                    <div style={{ marginBottom: 40, textAlign: 'center' }}>
                        <h2 style={{ fontSize: '1rem', fontWeight: 'bold' }}>SUPER ADMIN</h2>
                    </div>
                    <button className="nav-btn desktop-only" onClick={() => { localStorage.removeItem('marcou_token'); window.location.reload(); }} style={{ marginTop: 'auto', color: '#ef4444' }}>
                        <LogOut size={20} /> <span>Sair</span>
                    </button>
                </aside>
                <main className="main-content">
                    <SuperAdminView />
                </main>
            </div>
        );
    }

    return <DashboardNormal usuario={usuario} empresa={empresa} />;
};

const DashboardNormal = ({ usuario, empresa }) => {
    const [aba, setAba] = useState('agenda');
    const [loadingData, setLoadingData] = useState(true);
    const [showSuccess, setShowSuccess] = useState(false);

    // Dados
    const [agenda, setAgenda] = useState([]);
    const [servicos, setServicos] = useState([]);
    const [equipe, setEquipe] = useState([]);
    const [slots, setSlots] = useState([]);

    // Perfil
    const [perfil, setPerfil] = useState({ ...usuario });
    const [empresaConfig, setEmpresaConfig] = useState({ ...empresa });
    const fileRef = useRef(null);
    const logoRef = useRef(null);

    // Horários
    const [horarios, setHorarios] = useState(
        Array.from({ length: 7 }, (_, i) => ({
            dia_semana: i, abertura: '09:00', fechamento: '18:00', almoco_inicio: '', almoco_fim: '', ativo: i !== 0
        }))
    );

    // Forms
    const [novoAgendamento, setNovoAgendamento] = useState({ nome: '', servicoId: '', profissionalId: '', data: '', hora: '' });
    const [novoMembro, setNovoMembro] = useState({ nome: '', email: '', senha: '', role: 'profissional', atende_clientes: true });
    const [svcForm, setSvcForm] = useState({ nome: '', descricao: '', preco: '', duracao_minutos: '' });
    const [editId, setEditId] = useState(null);

    const carregarTudo = useCallback(async () => {
        try {
            const [resS, resA, resE] = await Promise.allSettled([
                api.get('/servicos'),
                api.get(usuario.role === 'dono' ? '/agendamentos/empresa' : '/agendamentos/meus'),
                api.get('/equipe')
            ]);

            setServicos(resS.status === 'fulfilled' ? resS.value.data : []);
            setAgenda(resA.status === 'fulfilled' ? resA.value.data : []);
            setEquipe(resE.status === 'fulfilled' ? resE.value.data : []);

            if (usuario.role === 'dono') {
                const resH = await api.get('/config/horarios').catch(() => ({ data: [] }));
                if (resH.data && resH.data.length > 0) {
                    setHorarios(prev => prev.map(p => {
                        const b = resH.data.find(x => x.dia_semana === p.dia_semana);
                        return b ? { ...p, ...b } : p;
                    }));
                }
            }
        } catch (e) { console.error("Erro load", e); }
        setLoadingData(false);
    }, [usuario.role]);

    useEffect(() => { carregarTudo(); }, [carregarTudo]);

    // Slots Dinâmicos
    useEffect(() => {
        const { data, servicoId, profissionalId } = novoAgendamento;
        if (data && servicoId && profissionalId) {
            setSlots([]);
            api.get(`/disponibilidade?data=${data}&servicoId=${servicoId}&profissionalId=${profissionalId}`)
                .then(res => setSlots(res.data))
                .catch(() => setSlots([]));
        } else setSlots([]);
    }, [novoAgendamento.data, novoAgendamento.servicoId, novoAgendamento.profissionalId]);

    const handleUpload = (e, tipo) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 50 * 1024 * 1024) { alert("Imagem muito grande."); return; }
        const reader = new FileReader();
        reader.onloadend = () => {
            if (tipo === 'perfil') setPerfil({ ...perfil, foto_url: reader.result });
            if (tipo === 'logo') setEmpresaConfig({ ...empresaConfig, logo_url: reader.result });
        };
        reader.readAsDataURL(file);
    };

    const handleAgendar = async (e) => {
        e.preventDefault();
        try {
            const dataHoraInicio = moment(`${novoAgendamento.data} ${novoAgendamento.hora}`).format();
            await api.post('/agendar', {
                servicoId: novoAgendamento.servicoId,
                profissionalId: novoAgendamento.profissionalId,
                dataHoraInicio: dataHoraInicio,
                nomeClienteAvulso: novoAgendamento.nome
            });
            setShowSuccess(true);
            setNovoAgendamento({ nome: '', servicoId: '', profissionalId: '', data: '', hora: '' });
            setSlots([]);
            carregarTudo();
        } catch (e) { alert("Erro ao agendar."); }
    };

    const salvarPerfil = async (e) => {
        e.preventDefault();
        try {
            await api.put('/perfil', perfil);
            if (usuario.role === 'dono') await api.put('/config/empresa', empresaConfig);
            alert("Perfil atualizado!");
            window.location.reload();
        } catch (e) { alert("Erro ao salvar."); }
    };

    const handleService = async (e) => {
        e.preventDefault();
        try {
            const pl = { ...svcForm, preco: parseFloat(svcForm.preco), duracao_minutos: parseInt(svcForm.duracao_minutos) };
            if (editId) await api.put(`/servicos/${editId}`, pl); else await api.post('/servicos', pl);
            setSvcForm({ nome: '', descricao: '', preco: '', duracao_minutos: '' }); setEditId(null); await carregarTudo();
            alert("Serviço Salvo!");
        } catch (e) { alert("Erro ao salvar serviço."); }
    };

    const deleteService = async (id) => { if (window.confirm('Excluir?')) { await api.delete(`/servicos/${id}`); carregarTudo(); } };

    const addMembro = async (e) => {
        e.preventDefault();
        try { await api.post('/equipe', novoMembro); setNovoMembro({ nome: '', email: '', senha: '', role: 'profissional', atende_clientes: true }); await carregarTudo(); alert("Adicionado!"); } catch (e) { alert("Erro ao adicionar."); }
    };
    const removeMembro = async (id) => { if (window.confirm('Remover?')) { await api.delete(`/equipe/${id}`); carregarTudo(); } };

    const salvarHorarios = async () => {
        try {
            const pl = horarios.map(h => ({ ...h, dia_semana: parseInt(h.dia_semana) }));
            await api.post('/config/horarios', pl);
            alert("Horários atualizados!");
        } catch (e) { alert("Erro ao salvar horários."); }
    };

    const updateHorario = (i, f, v) => { const n = [...horarios]; n[i][f] = v; setHorarios(n); };

    // --- RENDER NORMAL ---
    return (
        <div className="layout">
            {showSuccess && <ConfirmationModal onClose={() => setShowSuccess(false)} />}

            <aside className="sidebar">
                <div className="desktop-only" style={{ marginBottom: 40, textAlign: 'center' }}>
                    {empresaConfig.logo_url ? (
                        <img src={empresaConfig.logo_url} alt="Logo" style={{ width: 60, height: 60, borderRadius: 12, objectFit: 'cover', marginBottom: 10 }} />
                    ) : (
                        <div style={{ width: 60, height: 60, background: empresaConfig.cor_primaria, borderRadius: 12, margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: 24 }}>{empresa.nome.charAt(0)}</div>
                    )}
                    <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>{empresa.nome}</h2>
                </div>

                <nav style={{ flex: 1, display: 'flex', flexDirection: window.innerWidth <= 768 ? 'row' : 'column', gap: 6 }}>
                    <button className={`nav-btn ${aba === 'agenda' ? 'active' : ''}`} onClick={() => setAba('agenda')}><Calendar size={20} /> <span>Agenda</span></button>
                    <button className={`nav-btn ${aba === 'perfil' ? 'active' : ''}`} onClick={() => setAba('perfil')}><User size={20} /> <span>Perfil</span></button>

                    {usuario.role === 'dono' && (
                        <>
                            <button className={`nav-btn ${aba === 'servicos' ? 'active' : ''}`} onClick={() => setAba('servicos')}><Scissors size={20} /> <span>Serviços</span></button>
                            <button className={`nav-btn ${aba === 'equipe' ? 'active' : ''}`} onClick={() => setAba('equipe')}><Users size={20} /> <span>Equipe</span></button>
                            <button className={`nav-btn ${aba === 'config' ? 'active' : ''}`} onClick={() => setAba('config')}><Settings size={20} /> <span>Config</span></button>
                            <button className={`nav-btn ${aba === 'financeiro' ? 'active' : ''}`} onClick={() => setAba('financeiro')}><CreditCard size={20} /> <span>Plano</span></button>
                        </>
                    )}
                </nav>
                <button className="nav-btn desktop-only" style={{ marginTop: 'auto', color: '#ef4444' }} onClick={() => { localStorage.removeItem('marcou_token'); window.location.reload(); }}><LogOut size={20} /> <span>Sair</span></button>
            </aside>

            <main className="main-content">
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }} className="page-header">
                    <div>
                        <h1>{aba === 'agenda' ? 'Início' : aba.charAt(0).toUpperCase() + aba.slice(1)}</h1>
                        <p style={{ margin: 0, color: 'var(--text-muted)' }}>Bem-vindo, {usuario.nome}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {usuario.foto_url ? (
                            <img src={usuario.foto_url} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} alt="Perfil" />
                        ) : (
                            <div style={{ width: 40, height: 40, background: '#e5e7eb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{usuario.nome.charAt(0)}</div>
                        )}
                    </div>
                </header>

                {loadingData ? (
                    <div style={{ padding: 50, textAlign: 'center' }}>
                        <div className="spinner"></div>
                        <p style={{ color: '#9ca3af', marginTop: 10 }}>Carregando dados...</p>
                    </div>
                ) : (
                    <>
                        {aba === 'agenda' && (
                            <div className="grid-2-col">
                                <div className="card">
                                    <h3>Novo Agendamento</h3>
                                    <form onSubmit={handleAgendar} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        {usuario.role === 'dono' && <div><label className="label">Cliente (Balcão)</label><input className="input" placeholder="Nome do cliente" value={novoAgendamento.nome} onChange={e => setNovoAgendamento({ ...novoAgendamento, nome: e.target.value })} /></div>}
                                        <div className="grid-booking">
                                            <div>
                                                <label className="label">Serviço</label>
                                                <select className="input" value={novoAgendamento.servicoId} onChange={e => setNovoAgendamento({ ...novoAgendamento, servicoId: e.target.value })} required>
                                                    <option value="">Selecione...</option>
                                                    {servicos.map(s => <option key={s.id} value={s.id}>{s.nome} - R$ {s.preco}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="label">Profissional</label>
                                                <select className="input" value={novoAgendamento.profissionalId} onChange={e => setNovoAgendamento({ ...novoAgendamento, profissionalId: e.target.value })} required>
                                                    <option value="">Selecione...</option>
                                                    {equipe.filter(p => p.atende_clientes).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div><label className="label">Data</label><input type="date" className="input" value={novoAgendamento.data} min={moment().format('YYYY-MM-DD')} onChange={e => setNovoAgendamento({ ...novoAgendamento, data: e.target.value })} required /></div>
                                        {slots.length > 0 ? <div><label className="label">Horários</label><div className="slots-grid">{slots.map(slot => (<div key={slot} className={`slot ${novoAgendamento.hora === slot ? 'selected' : ''}`} onClick={() => setNovoAgendamento({ ...novoAgendamento, hora: slot })}>{slot}</div>))}</div></div> : novoAgendamento.data && <div style={{ textAlign: 'center', color: '#999', padding: 10 }}>Sem horários livres.</div>}
                                        <div style={{ fontSize: '0.85rem', color: '#6b7280', background: '#f3f4f6', padding: 10, borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center' }}><AlertCircle size={16} /> <span>Pagamento no local.</span></div>
                                        <button type="submit" className="btn btn-cta" disabled={!novoAgendamento.hora}>Confirmar Agendamento</button>
                                    </form>
                                </div>
                                <div className="card"><h3>{usuario.role === 'dono' ? 'Agenda Geral' : 'Meus Agendamentos'}</h3>{agenda.length === 0 ? <p style={{ color: '#999' }}>Vazio.</p> : <div>{agenda.map(ag => (<div key={ag.id} className="list-item"><div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><div style={{ background: '#eff6ff', padding: '10px 14px', borderRadius: 10, textAlign: 'center', color: 'var(--primary)' }}><div style={{ fontWeight: '800', fontSize: '1.1rem' }}>{moment(ag.data_hora_inicio).format('DD')}</div><div style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>{moment(ag.data_hora_inicio).format('MMM')}</div></div><div><div style={{ fontWeight: 700 }}>{ag.Servico?.nome}</div><div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}><Clock size={14} /> {moment(ag.data_hora_inicio).format('HH:mm')} {usuario.role === 'dono' && <><User size={14} /> {ag.Cliente ? ag.Cliente.nome : ag.nome_cliente_avulso}</>}</div></div></div></div>))}</div>}</div>
                            </div>
                        )}
                        {/* Demais abas continuam idênticas ao código anterior, com classes novas aplicadas */}
                        {aba === 'perfil' && (<div className="card" style={{ maxWidth: 600, margin: '0 auto' }}><div className="avatar-area" onClick={() => fileRef.current.click()}>{perfil.foto_url ? <img src={perfil.foto_url} className="avatar-img" /> : <div className="avatar-img" style={{ background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>{perfil.nome.charAt(0)}</div>}<div className="avatar-plus"><Camera size={16} /></div></div><input type="file" ref={fileRef} hidden accept="image/*" onChange={(e) => handleUpload(e, 'perfil')} /><form onSubmit={salvarPerfil} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}><div><label className="label">Nome</label><input className="input" value={perfil.nome} onChange={e => setPerfil({ ...perfil, nome: e.target.value })} /></div><div><label className="label">Email</label><input className="input" value={perfil.email} disabled style={{ background: '#f3f4f6' }} /></div><div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f9fafb', padding: 15, borderRadius: 12 }}><input type="checkbox" checked={perfil.atende_clientes} onChange={e => setPerfil({ ...perfil, atende_clientes: e.target.checked })} style={{ width: 20, height: 20 }} /><div><strong style={{ display: 'block', fontSize: '0.95rem' }}>Atender Clientes</strong><span style={{ fontSize: '0.85rem', color: '#6b7280' }}>Marque para aparecer na agenda.</span></div></div>{usuario.role === 'dono' && (<div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #eee' }}><h3 style={{ marginBottom: 15 }}>Empresa</h3><div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 15 }}><div style={{ width: 60, height: 60, borderRadius: 10, background: '#f3f4f6', overflow: 'hidden', cursor: 'pointer' }} onClick={() => logoRef.current.click()}>{empresaConfig.logo_url ? <img src={empresaConfig.logo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Upload size={20} /></div>}</div><input type="file" ref={logoRef} hidden accept="image/*" onChange={(e) => handleUpload(e, 'logo')} /><div style={{ flex: 1 }}><label className="label">Nome do Negócio</label><input className="input" value={empresaConfig.nome} onChange={e => setEmpresaConfig({ ...empresaConfig, nome: e.target.value })} /></div></div><div><label className="label">Cor Tema</label><input type="color" className="input" style={{ height: 45, padding: 2 }} value={empresaConfig.cor_primaria} onChange={e => setEmpresaConfig({ ...empresaConfig, cor_primaria: e.target.value })} /></div></div>)}<button className="btn btn-primary" style={{ marginTop: 10 }}>Salvar Alterações</button></form></div>)}
                        {aba === 'servicos' && (<div className="grid-2-col"><div className="card" style={{ height: 'fit-content' }}><h3>{editId ? 'Editar' : 'Novo'} Serviço</h3><form onSubmit={handleService} style={{ display: 'grid', gap: 16 }}><div><label className="label">Nome</label><input className="input" value={svcForm.nome} onChange={e => setSvcForm({ ...svcForm, nome: e.target.value })} required /></div><div><label className="label">Descrição</label><input className="input" value={svcForm.descricao} onChange={e => setSvcForm({ ...svcForm, descricao: e.target.value })} /></div><div style={{ display: 'flex', gap: 10 }}><div style={{ flex: 1 }}><label className="label">Preço</label><input className="input" type="number" step="0.01" value={svcForm.preco} onChange={e => setSvcForm({ ...svcForm, preco: e.target.value })} required /></div><div style={{ flex: 1 }}><label className="label">Minutos</label><input className="input" type="number" value={svcForm.duracao_minutos} onChange={e => setSvcForm({ ...svcForm, duracao_minutos: e.target.value })} required /></div></div><button className="btn btn-primary">Salvar</button></form></div><div className="card"><h3>Lista</h3>{servicos.length === 0 && <p>Vazio</p>}{servicos.map(s => (<div key={s.id} className="list-item"><div><div style={{ fontWeight: 600 }}>{s.nome}</div><div style={{ fontSize: '0.85rem' }}>R${s.preco} • {s.duracao_minutos}m</div></div><div style={{ display: 'flex', gap: 5 }}><button onClick={() => { setEditId(s.id); setSvcForm(s) }} className="btn btn-icon"><Edit2 size={16} /></button><button onClick={() => deleteService(s.id)} className="btn btn-icon" style={{ color: 'red' }}><Trash2 size={16} /></button></div></div>))}</div></div>)}
                        {aba === 'equipe' && (<div className="grid-2-col"><div className="card" style={{ height: 'fit-content' }}><h3>Novo Membro</h3><form onSubmit={addMembro} style={{ display: 'grid', gap: 16 }}><input className="input" placeholder="Nome" value={novoMembro.nome} onChange={e => setNovoMembro({ ...novoMembro, nome: e.target.value })} required /><input className="input" placeholder="Email" value={novoMembro.email} onChange={e => setNovoMembro({ ...novoMembro, email: e.target.value })} required /><input className="input" placeholder="Senha" type="password" value={novoMembro.senha} onChange={e => setNovoMembro({ ...novoMembro, senha: e.target.value })} required /><select className="input" value={novoMembro.role} onChange={e => setNovoMembro({ ...novoMembro, role: e.target.value })}><option value="profissional">Profissional</option><option value="dono">Admin</option></select><button className="btn btn-primary">Adicionar</button></form></div><div className="card"><h3>Equipe</h3>{equipe.map(m => (<div key={m.id} className="list-item"><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{m.foto_url ? <img src={m.foto_url} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: 32, height: 32, background: '#eee', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{m.nome.charAt(0)}</div>}<div><div style={{ fontWeight: 600 }}>{m.nome}</div><div style={{ fontSize: '0.8rem' }}>{m.role}</div></div></div>{m.id !== usuario.id && <button onClick={() => removeMembro(m.id)} className="btn btn-icon" style={{ color: 'red' }}><Trash2 size={16} /></button>}</div>))}</div></div>)}
                        {aba === 'config' && (<div className="card"><h3>Horários</h3><button onClick={salvarHorarios} className="btn btn-primary" style={{ marginBottom: 20 }}>Salvar</button>{horarios.map((h, i) => (<div key={h.dia_semana} style={{ display: 'grid', gridTemplateColumns: '80px 50px 1fr', gap: 10, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #eee' }}><div style={{ fontWeight: 600 }}>{moment().day(h.dia_semana).format('dddd')}</div><input type="checkbox" checked={h.ativo} onChange={e => updateHorario(i, 'ativo', e.target.checked)} />{h.ativo ? <div style={{ display: 'flex', gap: 10 }}><input type="time" className="input" style={{ padding: 5, width: 80 }} value={h.abertura} onChange={e => updateHorario(i, 'abertura', e.target.value)} /> - <input type="time" className="input" style={{ padding: 5, width: 80 }} value={h.fechamento} onChange={e => updateHorario(i, 'fechamento', e.target.value)} /></div> : <span>Fechado</span>}</div>))}</div>)}
                    </>
                )}
            </main>
        </div>
    );
};

export default Dashboard;