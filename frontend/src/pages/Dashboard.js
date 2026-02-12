import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import moment from 'moment';
import 'moment/locale/pt-br';
// ÍCONES PROFISSIONAIS (Sem Emojis)
import {
    Calendar, Users, Settings, Scissors, Plus, Trash2, Edit2, LogOut,
    Check, X, Clock, DollarSign, User, ChevronRight, Menu
} from 'lucide-react';

moment.locale('pt-br');

const Dashboard = ({ usuario, empresa }) => {
    const [aba, setAba] = useState('agenda');
    const [agenda, setAgenda] = useState([]);
    const [servicos, setServicos] = useState([]);
    const [equipe, setEquipe] = useState([]);
    const [horarios, setHorarios] = useState([]);
    const [slots, setSlots] = useState([]);

    // Forms
    const [novoAgendamento, setNovoAgendamento] = useState({ nome: '', servicoId: '', profissionalId: '', data: '', hora: '' });
    const [novoMembro, setNovoMembro] = useState({ nome: '', email: '', senha: '', role: 'profissional' });
    const [svcForm, setSvcForm] = useState({ nome: '', descricao: '', preco: '', duracao_minutos: '' });
    const [editId, setEditId] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true); // Mobile toggle

    const loadData = useCallback(async () => {
        try {
            const rotaAgenda = usuario.role === 'dono' ? '/agendamentos/empresa' : '/agendamentos/meus';
            const [resAgenda, resServicos] = await Promise.all([api.get(rotaAgenda), api.get('/servicos')]);
            setAgenda(resAgenda.data);
            setServicos(resServicos.data);

            if (usuario.role === 'dono') {
                const [resEquipe, resHorarios] = await Promise.all([api.get('/equipe'), api.get('/config/horarios')]);
                setEquipe(resEquipe.data);

                // Inicializa horários se vazio
                if (resHorarios.data.length === 0) {
                    const padrao = Array.from({ length: 7 }, (_, i) => ({
                        dia_semana: i, abertura: '09:00', fechamento: '18:00', ativo: i !== 0
                    }));
                    setHorarios(padrao);
                } else {
                    // Ordena por dia da semana
                    const ordenado = resHorarios.data.sort((a, b) => a.dia_semana - b.dia_semana);
                    setHorarios(ordenado);
                }
            } else {
                const resEquipe = await api.get('/equipe');
                setEquipe(resEquipe.data);
            }
        } catch (e) { console.error("Erro dados", e); }
    }, [usuario.role]);

    useEffect(() => { loadData(); }, [loadData]);

    // Busca Slots
    useEffect(() => {
        const { data, servicoId, profissionalId } = novoAgendamento;
        if (data && servicoId && profissionalId) {
            api.get(`/disponibilidade?data=${data}&servicoId=${servicoId}&profissionalId=${profissionalId}`)
                .then(res => setSlots(res.data))
                .catch(() => setSlots([]));
        } else setSlots([]);
    }, [novoAgendamento.data, novoAgendamento.servicoId, novoAgendamento.profissionalId]);

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
            alert("Agendamento Confirmado!");
            setNovoAgendamento({ nome: '', servicoId: '', profissionalId: '', data: '', hora: '' });
            loadData();
        } catch (e) { alert("Erro: " + (e.response?.data?.erro || "Falha")); }
    };

    const addMembro = async (e) => {
        e.preventDefault();
        try {
            await api.post('/equipe', novoMembro);
            alert("Membro adicionado!");
            setNovoMembro({ nome: '', email: '', senha: '', role: 'profissional' });
            loadData();
        } catch (e) { alert("Erro: " + (e.response?.data?.erro || "Verifique os dados")); }
    };

    const removeMembro = async (id) => {
        if (!window.confirm("Remover membro?")) return;
        try { await api.delete(`/equipe/${id}`); loadData(); } catch (e) { alert("Erro"); }
    };

    const salvarHorarios = async () => {
        try {
            const payload = horarios.map(h => ({
                dia_semana: parseInt(h.dia_semana),
                abertura: h.abertura,
                fechamento: h.fechamento,
                ativo: h.ativo
            }));
            await api.post('/config/horarios', payload);
            alert("Horários atualizados com sucesso!");
        } catch (e) { alert("Erro ao salvar horários."); }
    };

    const updateHorario = (index, campo, valor) => {
        const novos = [...horarios];
        novos[index][campo] = valor;
        setHorarios(novos);
    };

    const handleService = async (e) => {
        e.preventDefault();
        try {
            // Conversão explicita para evitar erro no backend
            const payload = {
                ...svcForm,
                preco: parseFloat(svcForm.preco),
                duracao_minutos: parseInt(svcForm.duracao_minutos)
            };
            if (editId) await api.put(`/servicos/${editId}`, payload);
            else await api.post('/servicos', payload);

            alert("Serviço salvo!");
            setSvcForm({ nome: '', descricao: '', preco: '', duracao_minutos: '' }); setEditId(null); loadData();
        } catch (e) { alert("Erro ao salvar serviço."); }
    };

    const deleteService = async (id) => { if (window.confirm("Excluir?")) { await api.delete(`/servicos/${id}`); loadData(); } };

    // --- RENDER ---
    return (
        <div className="layout-container">
            {/* SIDEBAR (Barra Lateral) */}
            <aside className="sidebar" style={{ display: sidebarOpen ? 'flex' : 'none' }}>
                <div style={{ marginBottom: 40, display: 'flex', alignItems: 'center', gap: 10 }}>
                    {empresa.logo_url && <img src={empresa.logo_url} alt="Logo" style={{ width: 32, height: 32, borderRadius: 8 }} />}
                    <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{empresa.nome}</h2>
                </div>

                <nav style={{ flex: 1 }}>
                    <button className={`nav-item ${aba === 'agenda' ? 'active' : ''}`} onClick={() => setAba('agenda')}>
                        <Calendar size={20} /> Agenda
                    </button>
                    {usuario.role === 'dono' && (
                        <>
                            <button className={`nav-item ${aba === 'servicos' ? 'active' : ''}`} onClick={() => setAba('servicos')}>
                                <Scissors size={20} /> Serviços
                            </button>
                            <button className={`nav-item ${aba === 'equipe' ? 'active' : ''}`} onClick={() => setAba('equipe')}>
                                <Users size={20} /> Equipe
                            </button>
                            <button className={`nav-item ${aba === 'config' ? 'active' : ''}`} onClick={() => setAba('config')}>
                                <Settings size={20} /> Configurações
                            </button>
                        </>
                    )}
                </nav>

                <button className="nav-item" style={{ marginTop: 'auto', color: '#ef4444' }} onClick={() => { localStorage.removeItem('marcou_token'); window.location.reload(); }}>
                    <LogOut size={20} /> Sair
                </button>
            </aside>

            {/* CONTEÚDO PRINCIPAL */}
            <main className="main-content">
                {/* Header Mobile Toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
                    <h1 style={{ margin: 0 }}>
                        {aba === 'agenda' && 'Agenda'}
                        {aba === 'servicos' && 'Gerenciar Serviços'}
                        {aba === 'equipe' && 'Equipe Profissional'}
                        {aba === 'config' && 'Horários de Funcionamento'}
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Olá, {usuario.nome}</span>
                        <div style={{ width: 32, height: 32, background: empresa.cor_primaria, borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                            {usuario.nome.charAt(0)}
                        </div>
                    </div>
                </div>

                {/* ABA: AGENDA */}
                {aba === 'agenda' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 30 }}>
                        <div className="card">
                            <h3>Novo Agendamento</h3>
                            <form onSubmit={handleAgendar} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                                {usuario.role === 'dono' && (
                                    <div>
                                        <label className="label">Cliente (Balcão)</label>
                                        <input className="input-field" placeholder="Nome do cliente (opcional)" value={novoAgendamento.nome} onChange={e => setNovoAgendamento({ ...novoAgendamento, nome: e.target.value })} />
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: 15 }}>
                                    <div style={{ flex: 1 }}>
                                        <label className="label">Serviço</label>
                                        <select className="input-field" value={novoAgendamento.servicoId} onChange={e => setNovoAgendamento({ ...novoAgendamento, servicoId: e.target.value })} required>
                                            <option value="">Selecione...</option>
                                            {servicos.map(s => <option key={s.id} value={s.id}>{s.nome} ({s.duracao_minutos}min)</option>)}
                                        </select>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label className="label">Profissional</label>
                                        <select className="input-field" value={novoAgendamento.profissionalId} onChange={e => setNovoAgendamento({ ...novoAgendamento, profissionalId: e.target.value })} required>
                                            <option value="">Selecione...</option>
                                            {equipe.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Data</label>
                                    <input type="date" className="input-field" value={novoAgendamento.data} min={moment().format('YYYY-MM-DD')} onChange={e => setNovoAgendamento({ ...novoAgendamento, data: e.target.value })} required />
                                </div>

                                {slots.length > 0 && (
                                    <div>
                                        <label className="label">Horários Disponíveis</label>
                                        <div className="time-grid">
                                            {slots.map(slot => (
                                                <div
                                                    key={slot}
                                                    className={`time-slot ${novoAgendamento.hora === slot ? 'selected' : ''}`}
                                                    onClick={() => setNovoAgendamento({ ...novoAgendamento, hora: slot })}
                                                >
                                                    {slot}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button type="submit" className="btn btn-primary" disabled={!novoAgendamento.hora} style={{ marginTop: 10 }}>
                                    <Check size={18} /> Confirmar Agendamento
                                </button>
                            </form>
                        </div>

                        <div className="card">
                            <h3>Próximos Agendamentos</h3>
                            {agenda.length === 0 ? <p>Nenhum agendamento futuro.</p> : (
                                <div>
                                    {agenda.map(ag => (
                                        <div key={ag.id} className="list-row">
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <Clock size={16} color={empresa.cor_primaria} />
                                                    {moment(ag.data_hora_inicio).format('HH:mm')} - {ag.Servico?.nome}
                                                </div>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <Calendar size={14} /> {moment(ag.data_hora_inicio).format('DD/MM')}
                                                    <User size={14} style={{ marginLeft: 8 }} /> {ag.Cliente ? ag.Cliente.nome : ag.nome_cliente_avulso}
                                                    {usuario.role === 'dono' && ag.Profissional && ` • ${ag.Profissional.nome}`}
                                                </div>
                                            </div>
                                            <span style={{ fontSize: '0.75rem', background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: 20, fontWeight: 600 }}>
                                                CONFIRMADO
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ABA: SERVIÇOS */}
                {aba === 'servicos' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: 30 }}>
                        <div className="card" style={{ height: 'fit-content' }}>
                            <h3>{editId ? 'Editar Serviço' : 'Novo Serviço'}</h3>
                            <form onSubmit={handleService} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                                <div>
                                    <label className="label">Nome</label>
                                    <input className="input-field" placeholder="Ex: Corte Degradê" value={svcForm.nome} onChange={e => setSvcForm({ ...svcForm, nome: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="label">Descrição</label>
                                    <input className="input-field" placeholder="Ex: Inclui lavagem" value={svcForm.descricao} onChange={e => setSvcForm({ ...svcForm, descricao: e.target.value })} />
                                </div>
                                <div style={{ display: 'flex', gap: 15 }}>
                                    <div style={{ flex: 1 }}>
                                        <label className="label">Preço (R$)</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: 10, top: 10, color: '#999' }}>R$</span>
                                            <input className="input-field" style={{ paddingLeft: 35 }} type="number" step="0.01" value={svcForm.preco} onChange={e => setSvcForm({ ...svcForm, preco: e.target.value })} required />
                                        </div>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label className="label">Duração (min)</label>
                                        <input className="input-field" type="number" value={svcForm.duracao_minutos} onChange={e => setSvcForm({ ...svcForm, duracao_minutos: e.target.value })} required />
                                    </div>
                                </div>
                                <button type="submit" className="btn btn-primary">
                                    <Check size={18} /> Salvar Serviço
                                </button>
                                {editId && (
                                    <button type="button" className="btn btn-secondary" onClick={() => { setEditId(null); setSvcForm({ nome: '', descricao: '', preco: '', duracao_minutos: '' }) }}>
                                        Cancelar
                                    </button>
                                )}
                            </form>
                        </div>

                        <div className="card">
                            <h3>Seus Serviços</h3>
                            {servicos.map(s => (
                                <div key={s.id} className="list-row">
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{s.nome}</div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{s.descricao || "Sem descrição"}</div>
                                        <div style={{ marginTop: 4, fontWeight: 500, color: empresa.cor_primaria }}>R$ {s.preco} • {s.duracao_minutos} min</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button onClick={() => { setEditId(s.id); setSvcForm(s) }} className="btn-icon"><Edit2 size={18} /></button>
                                        <button onClick={() => deleteService(s.id)} className="btn-icon" style={{ color: '#ef4444' }}><Trash2 size={18} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ABA: EQUIPE */}
                {aba === 'equipe' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: 30 }}>
                        <div className="card" style={{ height: 'fit-content' }}>
                            <h3>Cadastrar Profissional</h3>
                            <form onSubmit={addMembro} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                                <div><label className="label">Nome</label><input className="input-field" value={novoMembro.nome} onChange={e => setNovoMembro({ ...novoMembro, nome: e.target.value })} required /></div>
                                <div><label className="label">Email</label><input className="input-field" type="email" value={novoMembro.email} onChange={e => setNovoMembro({ ...novoMembro, email: e.target.value })} required /></div>
                                <div><label className="label">Senha</label><input className="input-field" type="password" value={novoMembro.senha} onChange={e => setNovoMembro({ ...novoMembro, senha: e.target.value })} required /></div>
                                <div>
                                    <label className="label">Função</label>
                                    <select className="input-field" value={novoMembro.role} onChange={e => setNovoMembro({ ...novoMembro, role: e.target.value })}>
                                        <option value="profissional">Profissional (Agenda Própria)</option>
                                        <option value="dono">Administrador (Acesso Total)</option>
                                    </select>
                                </div>
                                <button type="submit" className="btn btn-primary"><Plus size={18} /> Adicionar</button>
                            </form>
                        </div>
                        <div className="card">
                            <h3>Membros da Equipe</h3>
                            {equipe.map(m => (
                                <div key={m.id} className="list-row">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 40, height: 40, background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{m.nome.charAt(0)}</div>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{m.nome}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{m.email}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                                        <span style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '4px 8px', borderRadius: 4, textTransform: 'uppercase', fontWeight: 600 }}>{m.role}</span>
                                        {m.id !== usuario.id && <button onClick={() => removeMembro(m.id)} className="btn-icon" style={{ color: '#ef4444' }}><Trash2 size={18} /></button>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ABA: CONFIGURAÇÕES (HORÁRIOS) */}
                {aba === 'config' && (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3>Horários de Funcionamento</h3>
                            <button onClick={salvarHorarios} className="btn btn-primary"><Check size={18} /> Salvar Alterações</button>
                        </div>

                        {horarios.map((h, i) => (
                            <div key={h.dia_semana} style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                                <div style={{ width: 120, fontWeight: 600 }}>{moment().day(h.dia_semana).format('dddd')}</div>

                                <label className="switch" style={{ marginRight: 20 }}>
                                    <input type="checkbox" checked={h.ativo} onChange={e => updateHorario(i, 'ativo', e.target.checked)} />
                                    <span className="slider"></span>
                                </label>

                                {h.ativo ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <input type="time" className="input-field" style={{ width: 110 }} value={h.abertura} onChange={e => updateHorario(i, 'abertura', e.target.value)} />
                                        <span style={{ color: '#999' }}>até</span>
                                        <input type="time" className="input-field" style={{ width: 110 }} value={h.fechamento} onChange={e => updateHorario(i, 'fechamento', e.target.value)} />
                                    </div>
                                ) : (
                                    <span style={{ color: '#ef4444', fontSize: '0.9rem', fontWeight: 500 }}>Fechado</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Dashboard;