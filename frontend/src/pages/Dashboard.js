import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import moment from 'moment';
import 'moment/locale/pt-br';
import {
    Calendar, Users, Settings, Scissors, LogOut, Check, Clock,
    User, Save, Coffee, CreditCard, Camera, Upload, Smile, Briefcase, Trash2, Edit2, AlertCircle, Shield, Building, PlusCircle, Activity, ArrowLeft, Eye, ToggleLeft, ToggleRight
} from 'lucide-react';

moment.locale('pt-br');

// --- HELPER: Contraste de Cor ---
const getContrastYIQ = (hexcolor) => {
    if (!hexcolor) return '#000';
    hexcolor = hexcolor.replace("#", "");
    var r = parseInt(hexcolor.substr(0, 2), 16);
    var g = parseInt(hexcolor.substr(2, 2), 16);
    var b = parseInt(hexcolor.substr(4, 2), 16);
    var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#0f172a' : '#ffffff';
};

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

// --- COMPONENTE SUPER ADMIN ---
const SuperAdminView = () => {
    const [view, setView] = useState('list');
    const [empresas, setEmpresas] = useState([]);
    const [selectedEmpresa, setSelectedEmpresa] = useState(null);
    const [form, setForm] = useState({ nome: '', slug: '', email_dono: '', senha_dono: '', plano: 'pro' });
    const [editForm, setEditForm] = useState({});

    const loadEmpresas = async () => { try { const res = await api.get('/admin/empresas'); setEmpresas(res.data); } catch (e) { } };
    useEffect(() => { loadEmpresas(); }, []);

    const openDetails = async (id) => {
        try {
            const res = await api.get(`/admin/empresas/${id}`);
            setSelectedEmpresa(res.data);
            setEditForm({ nome: res.data.nome, slug: res.data.slug, cor_primaria: res.data.cor_primaria, plano: res.data.plano, status_assinatura: res.data.status_assinatura });
            setView('details');
        } catch (e) { alert("Erro ao carregar detalhes."); }
    };

    const createCompany = async (e) => {
        e.preventDefault();
        try { await api.post('/admin/empresas', form); alert("Sucesso!"); setForm({ nome: '', slug: '', email_dono: '', senha_dono: '', plano: 'pro' }); loadEmpresas(); } catch (e) { alert(e.response?.data?.erro); }
    };

    const saveCompany = async (e) => {
        e.preventDefault();
        try { await api.put(`/admin/empresas/${selectedEmpresa.id}`, editForm); alert("Atualizado!"); openDetails(selectedEmpresa.id); } catch (e) { alert("Erro."); }
    };

    if (view === 'details' && selectedEmpresa) {
        return (
            <div style={{ padding: 20 }}>
                <button onClick={() => { setView('list'); loadEmpresas() }} className="btn btn-ghost" style={{ marginBottom: 20 }}><ArrowLeft size={18} /> Voltar</button>
                <header style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                        <div style={{ width: 50, height: 50, borderRadius: 10, background: selectedEmpresa.cor_primaria, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: 20 }}>{selectedEmpresa.nome.charAt(0)}</div>
                        <div><h1 style={{ fontSize: '1.3rem', margin: 0 }}>{selectedEmpresa.nome}</h1><div style={{ color: '#64748b' }}>/{selectedEmpresa.slug}</div></div>
                    </div>
                    <span style={{ padding: '5px 10px', borderRadius: 20, background: selectedEmpresa.status_assinatura === 'ativa' ? '#dcfce7' : '#fee2e2', color: selectedEmpresa.status_assinatura === 'ativa' ? '#166534' : '#991b1b' }}>{selectedEmpresa.status_assinatura}</span>
                </header>
                <div className="grid-2-col" style={{ gridTemplateColumns: '2fr 1fr' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div className="card"><h3>Equipe</h3>{selectedEmpresa.usuarios?.map(u => <div key={u.id} className="list-item"><strong>{u.nome}</strong> <span>{u.role}</span></div>)}</div>
                        <div className="card"><h3>Serviços</h3>{selectedEmpresa.servicos?.map(s => <div key={s.id} className="list-item"><strong>{s.nome}</strong> <span>R${s.preco}</span></div>)}</div>
                    </div>
                    <div className="card" style={{ height: 'fit-content' }}>
                        <h3>Gerenciar</h3>
                        <form onSubmit={saveCompany} style={{ display: 'grid', gap: 15 }}>
                            <input className="input" value={editForm.nome} onChange={e => setEditForm({ ...editForm, nome: e.target.value })} />
                            <input className="input" value={editForm.slug} onChange={e => setEditForm({ ...editForm, slug: e.target.value })} />
                            <select className="input" value={editForm.status_assinatura} onChange={e => setEditForm({ ...editForm, status_assinatura: e.target.value })}><option value="ativa">Ativa</option><option value="bloqueada">Bloqueada</option></select>
                            <button className="btn btn-primary">Salvar</button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: 20 }}>
            <header style={{ marginBottom: 30 }}><h1 style={{ margin: 0 }}>Painel Master</h1></header>
            <div className="grid-2-col">
                <div className="card" style={{ height: 'fit-content' }}>
                    <h3>Nova Empresa</h3>
                    <form onSubmit={createCompany} style={{ display: 'grid', gap: 15 }}>
                        <input className="input" placeholder="Nome" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required />
                        <input className="input" placeholder="Slug" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} required />
                        <input className="input" placeholder="Email Dono" value={form.email_dono} onChange={e => setForm({ ...form, email_dono: e.target.value })} required />
                        <input className="input" placeholder="Senha" value={form.senha_dono} onChange={e => setForm({ ...form, senha_dono: e.target.value })} required />
                        <button className="btn btn-primary">Criar</button>
                    </form>
                </div>
                <div className="card">
                    <h3>Empresas</h3>
                    <div style={{ display: 'grid', gap: 10 }}>{empresas.map(e => (<div key={e.id} className="list-item" onClick={() => openDetails(e.id)} style={{ cursor: 'pointer' }}><strong>{e.nome}</strong> <Eye size={18} /></div>))}</div>
                </div>
            </div>
        </div>
    );
};

// --- DASHBOARD PRINCIPAL ---
const Dashboard = ({ usuario, empresa }) => {
    if (usuario.role === 'admin_geral') {
        return (
            <div className="layout">
                <aside className="sidebar"><div style={{ marginBottom: 40, textAlign: 'center' }}><h2 style={{ fontSize: '1rem' }}>ADMIN</h2></div><button className="nav-btn desktop-only" onClick={() => { localStorage.removeItem('marcou_token'); window.location.reload() }} style={{ marginTop: 'auto', color: 'red' }}><LogOut size={20} /> Sair</button></aside>
                <main className="main-content"><SuperAdminView /></main>
            </div>
        );
    }

    const [aba, setAba] = useState('agenda');
    const [loadingData, setLoadingData] = useState(true);
    const [showSuccess, setShowSuccess] = useState(false);

    const [agenda, setAgenda] = useState([]);
    const [servicos, setServicos] = useState([]);
    const [equipe, setEquipe] = useState([]);
    const [slots, setSlots] = useState([]);

    // Agendamento Multi-Select
    const [selectedServices, setSelectedServices] = useState([]);
    const [profissionalId, setProfissionalId] = useState('');
    const [dataAgendamento, setDataAgendamento] = useState('');
    const [horaSelecionada, setHoraSelecionada] = useState('');
    const [nomeCliente, setNomeCliente] = useState('');

    const [perfil, setPerfil] = useState({ ...usuario });
    const [empresaConfig, setEmpresaConfig] = useState({ ...empresa });
    const fileRef = useRef(null);
    const logoRef = useRef(null);

    const [horarios, setHorarios] = useState(Array.from({ length: 7 }, (_, i) => ({ dia_semana: i, abertura: '09:00', fechamento: '18:00', almoco_inicio: '', almoco_fim: '', ativo: i !== 0 })));
    const [novoMembro, setNovoMembro] = useState({ nome: '', email: '', senha: '', role: 'profissional', atende_clientes: true });
    const [svcForm, setSvcForm] = useState({ nome: '', descricao: '', preco: '', duracao_minutos: '' });
    const [editId, setEditId] = useState(null);

    const headerTextColor = getContrastYIQ(empresaConfig.cor_primaria);

    const carregarTudo = useCallback(async () => {
        try {
            const [resS, resA, resE] = await Promise.allSettled([
                api.get('/servicos'),
                api.get(usuario.role === 'dono' ? '/agendamentos/empresa' : '/agendamentos/meus'),
                api.get('/equipe')
            ]);

            setServicos(resS.status === 'fulfilled' ? resS.value.data : []);
            setAgenda(resA.status === 'fulfilled' ? resA.value.data : []);
            if (resE.status === 'fulfilled') setEquipe(resE.value.data.filter(p => p.role !== 'admin_geral'));

            if (usuario.role === 'dono') {
                const resH = await api.get('/config/horarios').catch(() => ({ data: [] }));
                if (resH.data?.length) setHorarios(prev => prev.map(p => { const b = resH.data.find(x => x.dia_semana === p.dia_semana); return b ? { ...p, ...b } : p; }));
            }
        } catch (e) { console.error("Erro load", e); }
        setLoadingData(false);
    }, [usuario.role]);

    useEffect(() => { carregarTudo(); }, [carregarTudo]);

    // Busca Slots (Envia IDs múltiplos)
    useEffect(() => {
        if (dataAgendamento && selectedServices.length > 0 && profissionalId) {
            setSlots([]);
            api.get(`/disponibilidade?data=${dataAgendamento}&servicosIds=${selectedServices.join(',')}&profissionalId=${profissionalId}`)
                .then(res => setSlots(res.data))
                .catch(() => setSlots([]));
        } else setSlots([]);
    }, [dataAgendamento, selectedServices, profissionalId]);

    const toggleService = (id) => {
        if (selectedServices.includes(id)) setSelectedServices(selectedServices.filter(s => s !== id));
        else setSelectedServices([...selectedServices, id]);
    };

    const getTotalPrice = () => servicos.filter(s => selectedServices.includes(s.id)).reduce((acc, s) => acc + Number(s.preco), 0);

    const handleAgendar = async (e) => {
        e.preventDefault();
        try {
            const dataHoraInicio = moment(`${dataAgendamento} ${horaSelecionada}`).format();
            await api.post('/agendar', { servicosIds: selectedServices, profissionalId, dataHoraInicio, nomeClienteAvulso: nomeCliente });
            setShowSuccess(true);
            setSelectedServices([]); setProfissionalId(''); setDataAgendamento(''); setHoraSelecionada('');
            carregarTudo();
        } catch (e) { alert("Erro ao agendar."); }
    };

    const handleUpload = (e, tipo) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            if (tipo === 'perfil') setPerfil({ ...perfil, foto_url: reader.result });
            if (tipo === 'logo') setEmpresaConfig({ ...empresaConfig, logo_url: reader.result });
        };
        reader.readAsDataURL(file);
    };

    const salvarPerfil = async (e) => {
        e.preventDefault();
        try {
            await api.put('/perfil', perfil);
            if (usuario.role === 'dono') await api.put('/config/empresa', empresaConfig);
            alert("Salvo!");
            // Não recarrega, apenas mantém o estado
        } catch (e) { alert("Erro ao salvar."); }
    };

    const handleService = async (e) => { e.preventDefault(); try { const pl = { ...svcForm, preco: parseFloat(svcForm.preco), duracao_minutos: parseInt(svcForm.duracao_minutos) }; if (editId) await api.put(`/servicos/${editId}`, pl); else await api.post('/servicos', pl); setSvcForm({ nome: '', descricao: '', preco: '', duracao_minutos: '' }); setEditId(null); await carregarTudo(); alert("Salvo!"); } catch (e) { alert("Erro"); } };
    const deleteService = async (id) => { if (window.confirm('Excluir?')) { await api.delete(`/servicos/${id}`); carregarTudo(); } };
    const addMembro = async (e) => { e.preventDefault(); try { await api.post('/equipe', novoMembro); setNovoMembro({ nome: '', email: '', senha: '', role: 'profissional', atende_clientes: true }); await carregarTudo(); alert("Adicionado!"); } catch (e) { alert(e.response?.data?.erro); } };
    const removeMembro = async (id) => { if (window.confirm('Remover?')) { await api.delete(`/equipe/${id}`); carregarTudo(); } };
    const salvarHorarios = async () => { try { const pl = horarios.map(h => ({ ...h, dia_semana: parseInt(h.dia_semana) })); await api.post('/config/horarios', pl); alert("Salvo!"); } catch (e) { alert("Erro"); } };
    const updateHorario = (i, f, v) => { const n = [...horarios]; n[i][f] = v; setHorarios(n); };

    // Estilo Dinâmico
    const headerStyle = {
        background: empresaConfig.cor_primaria,
        color: headerTextColor,
        padding: '20px 30px',
        borderRadius: '0 0 20px 20px',
        marginBottom: 30,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
    };

    return (
        <div className="layout">
            {showSuccess && <ConfirmationModal onClose={() => setShowSuccess(false)} />}

            <aside className="sidebar">
                <div className="desktop-only" style={{ marginBottom: 40, textAlign: 'center' }}>
                    {empresaConfig.logo_url ? <img src={empresaConfig.logo_url} style={{ width: 60, height: 60, borderRadius: 12, objectFit: 'cover', marginBottom: 10 }} /> : <div style={{ width: 60, height: 60, background: empresaConfig.cor_primaria, borderRadius: 12, margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: 24 }}>{empresa.nome.charAt(0)}</div>}
                    <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>{empresa.nome}</h2>
                </div>
                <nav style={{ flex: 1, display: 'flex', flexDirection: window.innerWidth <= 768 ? 'row' : 'column', gap: 6 }}>
                    <button className={`nav-btn ${aba === 'agenda' ? 'active' : ''}`} onClick={() => setAba('agenda')}><Calendar size={20} /> <span>Agenda</span></button>
                    <button className={`nav-btn ${aba === 'perfil' ? 'active' : ''}`} onClick={() => setAba('perfil')}><User size={20} /> <span>Perfil</span></button>
                    {usuario.role === 'dono' && (<><button className={`nav-btn ${aba === 'servicos' ? 'active' : ''}`} onClick={() => setAba('servicos')}><Scissors size={20} /> <span>Serviços</span></button><button className={`nav-btn ${aba === 'equipe' ? 'active' : ''}`} onClick={() => setAba('equipe')}><Users size={20} /> <span>Equipe</span></button><button className={`nav-btn ${aba === 'config' ? 'active' : ''}`} onClick={() => setAba('config')}><Settings size={20} /> <span>Config</span></button><button className={`nav-btn ${aba === 'financeiro' ? 'active' : ''}`} onClick={() => setAba('financeiro')}><CreditCard size={20} /> <span>Plano</span></button></>)}
                </nav>
                <button className="nav-btn desktop-only" style={{ marginTop: 'auto', color: '#ef4444' }} onClick={() => { localStorage.removeItem('marcou_token'); window.location.reload(); }}><LogOut size={20} /> <span>Sair</span></button>
            </aside>

            <main className="main-content" style={{ padding: 0 }}>
                <header style={headerStyle}>
                    <div><h1 style={{ fontSize: '1.5rem', color: headerTextColor }}>{aba === 'agenda' ? 'Sua Agenda' : aba.toUpperCase()}</h1><p style={{ margin: 0, opacity: 0.8 }}>Bem-vindo, {usuario.nome}</p></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{perfil.foto_url ? <img src={perfil.foto_url} style={{ width: 45, height: 45, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${headerTextColor}` }} /> : <div style={{ width: 45, height: 45, background: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold' }}>{usuario.nome.charAt(0)}</div>}</div>
                </header>

                <div style={{ padding: '0 30px 30px 30px' }}>
                    {loadingData ? <div style={{ padding: 50, textAlign: 'center' }}><div className="spinner"></div></div> : (
                        <>
                            {aba === 'agenda' && (
                                <div className="grid-2-col">
                                    <div className="card">
                                        <h3>Novo Agendamento</h3>
                                        <form onSubmit={handleAgendar} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                            {usuario.role === 'dono' && <div><label className="label">Cliente Avulso</label><input className="input" placeholder="Nome" value={nomeCliente} onChange={e => setNomeCliente(e.target.value)} /></div>}

                                            <div>
                                                <label className="label">Selecione os Serviços</label>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                                                    {servicos.map(s => (
                                                        <div key={s.id} onClick={() => toggleService(s.id)} style={{ border: selectedServices.includes(s.id) ? '2px solid var(--primary)' : '1px solid #e2e8f0', background: selectedServices.includes(s.id) ? '#eff6ff' : '#fff', padding: 10, borderRadius: 8, cursor: 'pointer', textAlign: 'center' }}>
                                                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{s.nome}</div>
                                                            <div style={{ fontSize: '0.8rem', color: '#666' }}>R$ {s.preco}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="grid-booking">
                                                <div><label className="label">Profissional</label><select className="input" value={profissionalId} onChange={e => setProfissionalId(e.target.value)} required><option value="">Selecione...</option>{equipe.filter(p => p.atende_clientes).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
                                                <div><label className="label">Data</label><input type="date" className="input" value={dataAgendamento} min={moment().format('YYYY-MM-DD')} onChange={e => setDataAgendamento(e.target.value)} required /></div>
                                            </div>

                                            {slots.length > 0 ? <div><label className="label">Horários</label><div className="slots-grid">{slots.map(slot => (<div key={slot} className={`slot ${horaSelecionada === slot ? 'selected' : ''}`} onClick={() => setHoraSelecionada(slot)}>{slot}</div>))}</div></div> : (dataAgendamento && selectedServices.length > 0) && <div style={{ textAlign: 'center', color: '#999', padding: 10 }}>Sem horários livres.</div>}

                                            {selectedServices.length > 0 && <div style={{ background: '#f3f4f6', padding: 15, borderRadius: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Total:</strong> <strong>R$ {getTotalPrice().toFixed(2)}</strong></div><div style={{ fontSize: '0.8rem', color: '#666', marginTop: 5 }}><AlertCircle size={14} /> Pagar no local.</div></div>}
                                            <button type="submit" className="btn btn-cta" disabled={!horaSelecionada}>Confirmar</button>
                                        </form>
                                    </div>
                                    <div className="card"><h3>{usuario.role === 'dono' ? 'Agenda' : 'Meus Horários'}</h3>{agenda.length === 0 ? <p style={{ color: '#999' }}>Vazio.</p> : <div>{agenda.map(ag => (<div key={ag.id} className="list-item"><div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><div style={{ background: '#eff6ff', padding: '10px 14px', borderRadius: 10, textAlign: 'center', color: 'var(--primary)' }}><div style={{ fontWeight: '800', fontSize: '1.1rem' }}>{moment(ag.data_hora_inicio).format('DD')}</div></div><div><div style={{ fontWeight: 700 }}>{ag.observacoes || ag.Servico?.nome}</div><div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}><Clock size={14} /> {moment(ag.data_hora_inicio).format('HH:mm')} {usuario.role === 'dono' && <><User size={14} /> {ag.Cliente ? ag.Cliente.nome : ag.nome_cliente_avulso}</>}</div></div></div></div>))}</div>}</div>
                                </div>
                            )}
                            {aba === 'perfil' && (<div className="card" style={{ maxWidth: 600, margin: '0 auto' }}><div className="avatar-area" onClick={() => fileRef.current.click()}>{perfil.foto_url ? <img src={perfil.foto_url} className="avatar-img" /> : <div className="avatar-img" style={{ background: '#eee' }}>{perfil.nome.charAt(0)}</div>}<div className="avatar-plus"><Camera size={16} /></div></div><input type="file" ref={fileRef} hidden onChange={(e) => handleUpload(e, 'perfil')} /><form onSubmit={salvarPerfil} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}><input className="input" value={perfil.nome} onChange={e => setPerfil({ ...perfil, nome: e.target.value })} /><input className="input" value={perfil.email} disabled style={{ background: '#eee' }} /><div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f9fafb', padding: 15, borderRadius: 12 }}><div onClick={() => setPerfil({ ...perfil, atende_clientes: !perfil.atende_clientes })} style={{ cursor: 'pointer' }}>{perfil.atende_clientes ? <ToggleRight size={32} color="#10b981" /> : <ToggleLeft size={32} color="#999" />}</div><div><strong>Atender Clientes</strong><span style={{ display: 'block', fontSize: '0.8rem', color: '#666' }}>Aparecer na lista de profissionais.</span></div></div>{usuario.role === 'dono' && (<div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #eee' }}><h3>Empresa</h3><div style={{ display: 'flex', gap: 15, alignItems: 'center', marginBottom: 15 }}><div style={{ width: 60, height: 60, borderRadius: 10, background: '#eee', overflow: 'hidden', cursor: 'pointer' }} onClick={() => logoRef.current.click()}>{empresaConfig.logo_url ? <img src={empresaConfig.logo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Upload size={20} style={{ margin: '20px auto' }} />}</div><input type="file" ref={logoRef} hidden onChange={(e) => handleUpload(e, 'logo')} /><input className="input" value={empresaConfig.nome} onChange={e => setEmpresaConfig({ ...empresaConfig, nome: e.target.value })} /></div><input type="color" className="input" style={{ height: 45 }} value={empresaConfig.cor_primaria} onChange={e => setEmpresaConfig({ ...empresaConfig, cor_primaria: e.target.value })} /></div>)}<button className="btn btn-primary">Salvar</button></form></div>)}
                            {aba === 'servicos' && (<div className="grid-2-col"><div className="card" style={{ height: 'fit-content' }}><h3>{editId ? 'Editar' : 'Novo'}</h3><form onSubmit={handleService} style={{ display: 'grid', gap: 15 }}><input className="input" placeholder="Nome" value={svcForm.nome} onChange={e => setSvcForm({ ...svcForm, nome: e.target.value })} required /><input className="input" placeholder="Descrição" value={svcForm.descricao} onChange={e => setSvcForm({ ...svcForm, descricao: e.target.value })} /><div style={{ display: 'flex', gap: 10 }}><input className="input" type="number" placeholder="Preço" value={svcForm.preco} onChange={e => setSvcForm({ ...svcForm, preco: e.target.value })} required /><input className="input" type="number" placeholder="Minutos" value={svcForm.duracao_minutos} onChange={e => setSvcForm({ ...svcForm, duracao_minutos: e.target.value })} required /></div><button className="btn btn-primary">Salvar</button></form></div><div className="card"><h3>Lista</h3>{servicos.map(s => (<div key={s.id} className="list-item"><div><strong>{s.nome}</strong><br /><small>R${s.preco} • {s.duracao_minutos}m</small></div><div><button onClick={() => { setEditId(s.id); setSvcForm(s) }} className="btn btn-icon"><Edit2 size={16} /></button><button onClick={() => deleteService(s.id)} className="btn btn-icon" style={{ color: 'red' }}><Trash2 size={16} /></button></div></div>))}</div></div>)}
                            {aba === 'equipe' && (<div className="grid-2-col"><div className="card" style={{ height: 'fit-content' }}><h3>Novo Membro</h3><form onSubmit={addMembro} style={{ display: 'grid', gap: 15 }}><input className="input" placeholder="Nome" value={novoMembro.nome} onChange={e => setNovoMembro({ ...novoMembro, nome: e.target.value })} required /><input className="input" placeholder="Email" value={novoMembro.email} onChange={e => setNovoMembro({ ...novoMembro, email: e.target.value })} required /><input className="input" placeholder="Senha" value={novoMembro.senha} onChange={e => setNovoMembro({ ...novoMembro, senha: e.target.value })} required /><select className="input" value={novoMembro.role} onChange={e => setNovoMembro({ ...novoMembro, role: e.target.value })}><option value="profissional">Profissional</option><option value="dono">Admin</option></select><button className="btn btn-primary">Adicionar</button></form></div><div className="card"><h3>Equipe</h3>{equipe.map(m => (<div key={m.id} className="list-item"><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{m.foto_url ? <img src={m.foto_url} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: 32, height: 32, background: '#eee', borderRadius: '50%' }}></div>}<strong>{m.nome}</strong></div>{m.id !== usuario.id && <button onClick={() => removeMembro(m.id)} className="btn btn-icon" style={{ color: 'red' }}><Trash2 size={16} /></button>}</div>))}</div></div>)}
                            {aba === 'config' && (<div className="card"><h3>Horários</h3><button onClick={salvarHorarios} className="btn btn-primary" style={{ marginBottom: 15 }}>Salvar</button>{horarios.map((h, i) => (<div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}><div style={{ width: 80, fontWeight: 'bold' }}>{moment().day(h.dia_semana).format('dddd')}</div><input type="checkbox" checked={h.ativo} onChange={e => updateHorario(i, 'ativo', e.target.checked)} />{h.ativo ? <><input type="time" className="input" style={{ width: 90, padding: 5 }} value={h.abertura} onChange={e => updateHorario(i, 'abertura', e.target.value)} /> - <input type="time" className="input" style={{ width: 90, padding: 5 }} value={h.fechamento} onChange={e => updateHorario(i, 'fechamento', e.target.value)} /></> : <span>Fechado</span>}</div>))}</div>)}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;