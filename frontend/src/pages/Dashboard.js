import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import moment from 'moment';
import 'moment/locale/pt-br';
import {
    Calendar, Users, Settings, Scissors, LogOut, Check, Clock,
    User, Save, Coffee, CreditCard, Camera, Upload, Smile, Briefcase, Trash2, Edit2, AlertCircle
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

const Dashboard = ({ usuario, empresa }) => {
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

    // Horários Default
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

    // --- CARREGAMENTO INICIAL ---
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

    // --- UPLOAD (Base64) ---
    const handleUpload = (e, tipo) => {
        const file = e.target.files[0];
        if (!file) return;
        // Validação de tamanho no front (5MB aviso)
        if (file.size > 5 * 1024 * 1024) { alert("Imagem muito grande. Tente uma menor que 5MB."); return; }

        const reader = new FileReader();
        reader.onloadend = () => {
            if (tipo === 'perfil') setPerfil({ ...perfil, foto_url: reader.result });
            if (tipo === 'logo') setEmpresaConfig({ ...empresaConfig, logo_url: reader.result });
        };
        reader.readAsDataURL(file);
    };

    // --- AÇÕES ---
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
        } catch (e) { alert("Erro ao agendar. Tente outro horário."); }
    };

    const salvarPerfil = async (e) => {
        e.preventDefault();
        try {
            await api.put('/perfil', perfil);
            if (usuario.role === 'dono') await api.put('/config/empresa', empresaConfig);
            alert("Perfil atualizado com sucesso!");
            window.location.reload();
        } catch (e) { alert("Erro ao salvar. Verifique se a imagem não é pesada demais."); }
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

    // --- RENDER ---
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
                        {/* --- ABA AGENDA --- */}
                        {aba === 'agenda' && (
                            <div className="grid-2-col">
                                <div className="card">
                                    <h3>Novo Agendamento</h3>
                                    <form onSubmit={handleAgendar} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        {usuario.role === 'dono' && (
                                            <div><label className="label">Cliente (Balcão)</label><input className="input" placeholder="Nome do cliente" value={novoAgendamento.nome} onChange={e => setNovoAgendamento({ ...novoAgendamento, nome: e.target.value })} /></div>
                                        )}
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
                                                    {/* FILTRO DE ATENDIMENTO */}
                                                    {equipe.filter(p => p.atende_clientes).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div><label className="label">Data</label><input type="date" className="input" value={novoAgendamento.data} min={moment().format('YYYY-MM-DD')} onChange={e => setNovoAgendamento({ ...novoAgendamento, data: e.target.value })} required /></div>

                                        {slots.length > 0 ? (
                                            <div><label className="label">Horários</label><div className="slots-grid">{slots.map(slot => (<div key={slot} className={`slot ${novoAgendamento.hora === slot ? 'selected' : ''}`} onClick={() => setNovoAgendamento({ ...novoAgendamento, hora: slot })}>{slot}</div>))}</div></div>
                                        ) : novoAgendamento.data && <div style={{ textAlign: 'center', color: '#999', padding: 10, background: '#f9fafb', borderRadius: 8 }}>Nenhum horário livre nesta data.</div>}

                                        <div style={{ fontSize: '0.85rem', color: '#6b7280', background: '#f3f4f6', padding: 10, borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <AlertCircle size={16} /> <span>Pagamento realizado diretamente no estabelecimento.</span>
                                        </div>

                                        <button type="submit" className="btn btn-cta" disabled={!novoAgendamento.hora}>Confirmar Agendamento</button>
                                    </form>
                                </div>

                                <div className="card">
                                    <h3>{usuario.role === 'dono' ? 'Agenda Geral' : 'Meus Agendamentos'}</h3>
                                    {agenda.length === 0 ? <p style={{ color: '#999' }}>Nenhum agendamento.</p> : (
                                        <div>
                                            {agenda.map(ag => (
                                                <div key={ag.id} className="list-item">
                                                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                                        <div style={{ background: '#eff6ff', padding: '10px 14px', borderRadius: 10, textAlign: 'center', color: 'var(--primary)' }}>
                                                            <div style={{ fontWeight: '800', fontSize: '1.1rem' }}>{moment(ag.data_hora_inicio).format('DD')}</div>
                                                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>{moment(ag.data_hora_inicio).format('MMM')}</div>
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 700 }}>{ag.Servico?.nome}</div>
                                                            <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                                                <Clock size={14} /> {moment(ag.data_hora_inicio).format('HH:mm')}
                                                                {usuario.role === 'dono' && <><User size={14} /> {ag.Cliente ? ag.Cliente.nome : ag.nome_cliente_avulso}</>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* --- ABA PERFIL --- */}
                        {aba === 'perfil' && (
                            <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
                                <div className="avatar-area" onClick={() => fileRef.current.click()}>
                                    {perfil.foto_url ? <img src={perfil.foto_url} className="avatar-img" alt="Perfil" /> : <div className="avatar-img" style={{ background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>{perfil.nome.charAt(0)}</div>}
                                    <div className="avatar-plus"><Camera size={16} /></div>
                                </div>
                                <input type="file" ref={fileRef} hidden accept="image/*" onChange={(e) => handleUpload(e, 'perfil')} />

                                <form onSubmit={salvarPerfil} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div><label className="label">Nome</label><input className="input" value={perfil.nome} onChange={e => setPerfil({ ...perfil, nome: e.target.value })} /></div>
                                    <div><label className="label">Email</label><input className="input" value={perfil.email} disabled style={{ background: '#f3f4f6' }} /></div>

                                    {/* Toggle de Atendimento */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f9fafb', padding: 15, borderRadius: 12 }}>
                                        <input type="checkbox" checked={perfil.atende_clientes} onChange={e => setPerfil({ ...perfil, atende_clientes: e.target.checked })} style={{ width: 20, height: 20 }} />
                                        <div>
                                            <strong style={{ display: 'block', fontSize: '0.95rem' }}>Disponível para Agendamentos</strong>
                                            <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>Marque se você realiza atendimentos.</span>
                                        </div>
                                    </div>

                                    {usuario.role === 'dono' && (
                                        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #eee' }}>
                                            <h3 style={{ marginBottom: 15 }}>Dados da Empresa</h3>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 15 }}>
                                                <div style={{ width: 60, height: 60, borderRadius: 10, background: '#f3f4f6', overflow: 'hidden', cursor: 'pointer' }} onClick={() => logoRef.current.click()}>
                                                    {empresaConfig.logo_url ? <img src={empresaConfig.logo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Logo" /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Upload size={20} /></div>}
                                                </div>
                                                <input type="file" ref={logoRef} hidden accept="image/*" onChange={(e) => handleUpload(e, 'logo')} />
                                                <div style={{ flex: 1 }}><label className="label">Nome do Negócio</label><input className="input" value={empresaConfig.nome} onChange={e => setEmpresaConfig({ ...empresaConfig, nome: e.target.value })} /></div>
                                            </div>
                                            <div><label className="label">Cor Tema</label><input type="color" className="input" style={{ height: 45, padding: 2 }} value={empresaConfig.cor_primaria} onChange={e => setEmpresaConfig({ ...empresaConfig, cor_primaria: e.target.value })} /></div>
                                        </div>
                                    )}
                                    <button className="btn btn-primary" style={{ marginTop: 10 }}>Salvar Alterações</button>
                                </form>
                            </div>
                        )}

                        {/* --- ABA SERVIÇOS --- */}
                        {aba === 'servicos' && (
                            <div className="grid-2-col">
                                <div className="card" style={{ height: 'fit-content' }}>
                                    <h3>{editId ? 'Editar' : 'Novo'} Serviço</h3>
                                    <form onSubmit={handleService} style={{ display: 'grid', gap: 16 }}>
                                        <div><label className="label">Nome</label><input className="input" value={svcForm.nome} onChange={e => setSvcForm({ ...svcForm, nome: e.target.value })} required placeholder="Ex: Corte Cabelo" /></div>
                                        <div><label className="label">Descrição</label><input className="input" value={svcForm.descricao} onChange={e => setSvcForm({ ...svcForm, descricao: e.target.value })} /></div>
                                        <div style={{ display: 'flex', gap: 10 }}>
                                            <div style={{ flex: 1 }}><label className="label">Preço (R$)</label><input className="input" type="number" value={svcForm.preco} onChange={e => setSvcForm({ ...svcForm, preco: e.target.value })} required /></div>
                                            <div style={{ flex: 1 }}><label className="label">Minutos</label><input className="input" type="number" value={svcForm.duracao_minutos} onChange={e => setSvcForm({ ...svcForm, duracao_minutos: e.target.value })} required /></div>
                                        </div>
                                        <button className="btn btn-primary">Salvar Serviço</button>
                                    </form>
                                </div>
                                <div className="card">
                                    <h3>Cadastrados</h3>
                                    {servicos.map(s => (
                                        <div key={s.id} className="list-item">
                                            <div><div style={{ fontWeight: 600 }}>{s.nome}</div><div style={{ fontSize: '0.85rem', color: '#666' }}>R$ {s.preco} • {s.duracao_minutos}m</div></div>
                                            <div style={{ display: 'flex', gap: 5 }}>
                                                <button onClick={() => { setEditId(s.id); setSvcForm(s) }} className="btn btn-icon"><Edit2 size={18} /></button>
                                                <button onClick={() => deleteService(s.id)} className="btn btn-icon" style={{ color: 'red' }}><Trash2 size={18} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* --- ABA EQUIPE --- */}
                        {aba === 'equipe' && (
                            <div className="grid-2-col">
                                <div className="card" style={{ height: 'fit-content' }}>
                                    <h3>Novo Membro</h3>
                                    <form onSubmit={addMembro} style={{ display: 'grid', gap: 16 }}>
                                        <input className="input" placeholder="Nome" value={novoMembro.nome} onChange={e => setNovoMembro({ ...novoMembro, nome: e.target.value })} required />
                                        <input className="input" placeholder="Email" value={novoMembro.email} onChange={e => setNovoMembro({ ...novoMembro, email: e.target.value })} required />
                                        <input className="input" placeholder="Senha" type="password" value={novoMembro.senha} onChange={e => setNovoMembro({ ...novoMembro, senha: e.target.value })} required />
                                        <select className="input" value={novoMembro.role} onChange={e => setNovoMembro({ ...novoMembro, role: e.target.value })}>
                                            <option value="profissional">Profissional</option>
                                            <option value="dono">Administrador</option>
                                        </select>
                                        <button className="btn btn-primary">Adicionar Membro</button>
                                    </form>
                                </div>
                                <div className="card">
                                    <h3>Equipe</h3>
                                    {equipe.map(m => (
                                        <div key={m.id} className="list-item">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                {m.foto_url ? <img src={m.foto_url} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} alt="Foto" /> : <div style={{ width: 32, height: 32, background: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{m.nome.charAt(0)}</div>}
                                                <div><div style={{ fontWeight: 600 }}>{m.nome}</div><div style={{ fontSize: '0.8rem', color: '#666' }}>{m.role}</div></div>
                                            </div>
                                            {m.id !== usuario.id && <button onClick={() => removeMembro(m.id)} className="btn btn-icon" style={{ color: 'red' }}><Trash2 size={18} /></button>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* --- ABA CONFIG --- */}
                        {aba === 'config' && (
                            <div className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                                    <h3>Horários</h3>
                                    <button onClick={salvarHorarios} className="btn btn-primary">Salvar</button>
                                </div>
                                {horarios.map((h, i) => (
                                    <div key={h.dia_semana} style={{ display: 'grid', gridTemplateColumns: '80px 50px 1fr', gap: 10, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #eee' }}>
                                        <div style={{ fontWeight: 600 }}>{moment().day(h.dia_semana).format('dddd')}</div>
                                        <input type="checkbox" checked={h.ativo} onChange={e => updateHorario(i, 'ativo', e.target.checked)} />
                                        {h.ativo ? (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={14} /><input type="time" className="input" style={{ padding: 5, width: 80 }} value={h.abertura} onChange={e => updateHorario(i, 'abertura', e.target.value)} /><span>-</span><input type="time" className="input" style={{ padding: 5, width: 80 }} value={h.fechamento} onChange={e => updateHorario(i, 'fechamento', e.target.value)} /></div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Coffee size={14} /><input type="time" className="input" style={{ padding: 5, width: 80 }} value={h.almoco_inicio} onChange={e => updateHorario(i, 'almoco_inicio', e.target.value)} /><span>-</span><input type="time" className="input" style={{ padding: 5, width: 80 }} value={h.almoco_fim} onChange={e => updateHorario(i, 'almoco_fim', e.target.value)} /></div>
                                            </div>
                                        ) : <span style={{ color: 'red', fontSize: '0.9rem' }}>Fechado</span>}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* --- ABA FINANCEIRO --- */}
                        {aba === 'financeiro' && (
                            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                                <div style={{ background: '#eff6ff', width: 70, height: 70, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--primary)' }}>
                                    <CreditCard size={32} />
                                </div>
                                <h2>Plano Profissional</h2>
                                <p style={{ color: '#6b7280', margin: '10px 0 20px' }}>Gerencie faturas e cartões.</p>
                                <button className="btn btn-primary" onClick={() => alert('Em breve!')}>Ver Faturas</button>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default Dashboard;