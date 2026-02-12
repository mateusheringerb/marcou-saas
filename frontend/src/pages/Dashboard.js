import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import moment from 'moment';
import 'moment/locale/pt-br';
// Ícones Profissionais
import {
    Calendar, Users, Settings, Scissors, Plus, Trash2, Edit2, LogOut,
    Check, Clock, User, Save, Coffee, Briefcase, ChevronRight
} from 'lucide-react';

moment.locale('pt-br');

const Dashboard = ({ usuario, empresa }) => {
    // --- ESTADOS ---
    const [aba, setAba] = useState('agenda');
    const [loading, setLoading] = useState(false);

    // Dados
    const [agenda, setAgenda] = useState([]);
    const [servicos, setServicos] = useState([]);
    const [equipe, setEquipe] = useState([]);
    const [slots, setSlots] = useState([]);

    // Horários (Inicializa para não piscar tela branca)
    const [horarios, setHorarios] = useState(
        Array.from({ length: 7 }, (_, i) => ({
            dia_semana: i, abertura: '09:00', fechamento: '18:00', almoco_inicio: '', almoco_fim: '', ativo: i !== 0
        }))
    );

    // Forms
    const [novoAgendamento, setNovoAgendamento] = useState({ nome: '', servicoId: '', profissionalId: '', data: '', hora: '' });
    const [novoMembro, setNovoMembro] = useState({ nome: '', email: '', senha: '', role: 'profissional' });
    const [svcForm, setSvcForm] = useState({ nome: '', descricao: '', preco: '', duracao_minutos: '' });
    const [editId, setEditId] = useState(null);

    // --- CARREGAMENTO OTIMIZADO ---
    const carregarDados = useCallback(async () => {
        setLoading(true);
        try {
            // Paraleliza requisições para performance
            const [resServicos, resAgenda] = await Promise.all([
                api.get('/servicos'),
                api.get(usuario.role === 'dono' ? '/agendamentos/empresa' : '/agendamentos/meus')
            ]);
            setServicos(resServicos.data);
            setAgenda(resAgenda.data);

            if (usuario.role === 'dono') {
                const resEquipe = await api.get('/equipe');
                setEquipe(resEquipe.data);

                const resHorarios = await api.get('/config/horarios');
                if (resHorarios.data.length > 0) {
                    setHorarios(prev => prev.map(p => {
                        const banco = resHorarios.data.find(b => b.dia_semana === p.dia_semana);
                        return banco ? { ...p, ...banco } : p;
                    }));
                }
            } else {
                const resEquipe = await api.get('/equipe');
                setEquipe(resEquipe.data);
            }
        } catch (e) { console.error("Erro carregamento:", e); }
        setLoading(false);
    }, [usuario.role]);

    useEffect(() => { carregarDados(); }, [carregarDados]);

    // Slots Dinâmicos (Só chama se tiver dados)
    useEffect(() => {
        const { data, servicoId, profissionalId } = novoAgendamento;
        if (data && servicoId && profissionalId) {
            api.get(`/disponibilidade?data=${data}&servicoId=${servicoId}&profissionalId=${profissionalId}`)
                .then(res => setSlots(res.data))
                .catch(() => setSlots([]));
        } else setSlots([]);
    }, [novoAgendamento.data, novoAgendamento.servicoId, novoAgendamento.profissionalId]);

    // --- AÇÕES ---

    // Agendar
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
            alert("Agendamento confirmado!");
            setNovoAgendamento({ nome: '', servicoId: '', profissionalId: '', data: '', hora: '' });
            setSlots([]);
            carregarDados();
        } catch (e) { alert("Erro: " + (e.response?.data?.erro || "Falha ao agendar")); }
    };

    // Serviços (Salvar/Editar)
    const handleService = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...svcForm, preco: parseFloat(svcForm.preco), duracao_minutos: parseInt(svcForm.duracao_minutos) };
            if (editId) await api.put(`/servicos/${editId}`, payload);
            else await api.post('/servicos', payload);

            setSvcForm({ nome: '', descricao: '', preco: '', duracao_minutos: '' }); setEditId(null);
            carregarDados();
            alert("Serviço salvo!");
        } catch (e) { alert("Erro ao salvar serviço."); }
    };

    const deleteService = async (id) => { if (window.confirm("Excluir?")) { await api.delete(`/servicos/${id}`); carregarDados(); } };

    // Equipe
    const addMembro = async (e) => {
        e.preventDefault();
        try {
            await api.post('/equipe', novoMembro);
            setNovoMembro({ nome: '', email: '', senha: '', role: 'profissional' });
            carregarDados();
            alert("Membro adicionado!");
        } catch (e) { alert(e.response?.data?.erro || "Erro ao adicionar."); }
    };

    const removeMembro = async (id) => { if (window.confirm("Remover?")) { await api.delete(`/equipe/${id}`); carregarDados(); } };

    // Horários
    const salvarHorarios = async () => {
        try {
            const payload = horarios.map(h => ({ ...h, dia_semana: parseInt(h.dia_semana) }));
            await api.post('/config/horarios', payload);
            alert("Configurações salvas!");
        } catch (e) { alert("Erro ao salvar."); }
    };

    const updateHorario = (i, field, val) => {
        const novos = [...horarios];
        novos[i][field] = val;
        setHorarios(novos);
    };

    // --- INTERFACE (JSX) ---
    return (
        <div className="layout">
            {/* SIDEBAR / BOTTOM BAR */}
            <aside className="sidebar">
                <div className="logo-desktop" style={{ marginBottom: 40, display: 'flex', alignItems: 'center', gap: 12 }}>
                    {empresa.logo_url && <img src={empresa.logo_url} alt="Logo" style={{ width: 36, height: 36, borderRadius: 8 }} />}
                    <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>{empresa.nome}</h2>
                </div>

                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button className={`nav-btn ${aba === 'agenda' ? 'active' : ''}`} onClick={() => setAba('agenda')}>
                        <Calendar size={20} /> <span>Agenda</span>
                    </button>
                    {usuario.role === 'dono' && (
                        <>
                            <button className={`nav-btn ${aba === 'servicos' ? 'active' : ''}`} onClick={() => setAba('servicos')}>
                                <Scissors size={20} /> <span>Serviços</span>
                            </button>
                            <button className={`nav-btn ${aba === 'equipe' ? 'active' : ''}`} onClick={() => setAba('equipe')}>
                                <Users size={20} /> <span>Equipe</span>
                            </button>
                            <button className={`nav-btn ${aba === 'config' ? 'active' : ''}`} onClick={() => setAba('config')}>
                                <Settings size={20} /> <span>Config</span>
                            </button>
                        </>
                    )}
                </nav>

                <button className="nav-btn logout-btn" style={{ marginTop: 'auto', color: '#ef4444' }} onClick={() => { localStorage.removeItem('marcou_token'); window.location.reload(); }}>
                    <LogOut size={20} /> <span>Sair</span>
                </button>
            </aside>

            {/* CONTEÚDO PRINCIPAL */}
            <main className="main-area">
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700 }}>
                            {aba === 'agenda' && 'Agenda'}
                            {aba === 'servicos' && 'Serviços'}
                            {aba === 'equipe' && 'Profissionais'}
                            {aba === 'config' && 'Configurações'}
                        </h1>
                        <p style={{ margin: 0, color: '#64748b' }}>Gerencie seu negócio</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, background: '#0f172a', borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                            {usuario.nome.charAt(0)}
                        </div>
                    </div>
                </header>

                {loading && <div style={{ textAlign: 'center', padding: 20 }}>Carregando...</div>}

                {/* ABA: AGENDA */}
                {aba === 'agenda' && !loading && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
                        <div className="card">
                            <h3 style={{ marginBottom: 20 }}>Novo Agendamento</h3>
                            <form onSubmit={handleAgendar} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {usuario.role === 'dono' && (
                                    <div>
                                        <label className="label">Cliente Avulso (Opcional)</label>
                                        <input className="input" placeholder="Nome do cliente" value={novoAgendamento.nome} onChange={e => setNovoAgendamento({ ...novoAgendamento, nome: e.target.value })} />
                                    </div>
                                )}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div>
                                        <label className="label">Serviço</label>
                                        <select className="input" value={novoAgendamento.servicoId} onChange={e => setNovoAgendamento({ ...novoAgendamento, servicoId: e.target.value })} required>
                                            <option value="">Selecione...</option>
                                            {servicos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Profissional</label>
                                        <select className="input" value={novoAgendamento.profissionalId} onChange={e => setNovoAgendamento({ ...novoAgendamento, profissionalId: e.target.value })} required>
                                            <option value="">Selecione...</option>
                                            {equipe.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Data</label>
                                    <input type="date" className="input" value={novoAgendamento.data} min={moment().format('YYYY-MM-DD')} onChange={e => setNovoAgendamento({ ...novoAgendamento, data: e.target.value })} required />
                                </div>

                                {slots.length > 0 ? (
                                    <div>
                                        <label className="label">Horários Disponíveis</label>
                                        <div className="slots-grid">
                                            {slots.map(slot => (
                                                <div key={slot} className={`slot ${novoAgendamento.hora === slot ? 'selected' : ''}`} onClick={() => setNovoAgendamento({ ...novoAgendamento, hora: slot })}>
                                                    {slot}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : novoAgendamento.data && (
                                    <div style={{ color: '#64748b', fontStyle: 'italic', padding: 10, textAlign: 'center', background: '#f8fafc', borderRadius: 8 }}>
                                        Nenhum horário disponível nesta data.
                                    </div>
                                )}

                                <button type="submit" className="btn btn-primary" disabled={!novoAgendamento.hora} style={{ marginTop: 10 }}>Confirmar Agendamento</button>
                            </form>
                        </div>

                        <div className="card">
                            <h3 style={{ marginBottom: 20 }}>Próximos Clientes</h3>
                            {agenda.length === 0 ? <p style={{ color: '#94a3b8' }}>Nenhum agendamento futuro.</p> : (
                                <div>
                                    {agenda.map(ag => (
                                        <div key={ag.id} className="list-item">
                                            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                                <div style={{ background: '#f1f5f9', padding: '10px 14px', borderRadius: 10, textAlign: 'center' }}>
                                                    <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{moment(ag.data_hora_inicio).format('DD')}</div>
                                                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>{moment(ag.data_hora_inicio).format('MMM')}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600 }}>{ag.Servico?.nome}</div>
                                                    <div style={{ fontSize: '0.9rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                                        <Clock size={14} /> {moment(ag.data_hora_inicio).format('HH:mm')}
                                                        <User size={14} style={{ marginLeft: 8 }} /> {ag.Cliente ? ag.Cliente.nome : ag.nome_cliente_avulso}
                                                    </div>
                                                </div>
                                            </div>
                                            <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: 20, fontWeight: 700 }}>CONFIRMADO</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ABA: SERVIÇOS */}
                {aba === 'servicos' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
                        <div className="card" style={{ height: 'fit-content' }}>
                            <h3>{editId ? 'Editar Serviço' : 'Novo Serviço'}</h3>
                            <form onSubmit={handleService} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div><label className="label">Nome</label><input className="input" value={svcForm.nome} onChange={e => setSvcForm({ ...svcForm, nome: e.target.value })} required placeholder="Ex: Corte Cabelo" /></div>
                                <div><label className="label">Descrição</label><input className="input" value={svcForm.descricao} onChange={e => setSvcForm({ ...svcForm, descricao: e.target.value })} placeholder="Detalhes..." /></div>
                                <div style={{ display: 'flex', gap: 16 }}>
                                    <div style={{ flex: 1 }}><label className="label">Preço (R$)</label><input className="input" type="number" step="0.01" value={svcForm.preco} onChange={e => setSvcForm({ ...svcForm, preco: e.target.value })} required /></div>
                                    <div style={{ flex: 1 }}><label className="label">Minutos</label><input className="input" type="number" value={svcForm.duracao_minutos} onChange={e => setSvcForm({ ...svcForm, duracao_minutos: e.target.value })} required /></div>
                                </div>
                                <button type="submit" className="btn btn-primary"><Save size={18} /> Salvar</button>
                                {editId && <button type="button" className="btn btn-ghost" onClick={() => { setEditId(null); setSvcForm({ nome: '', descricao: '', preco: '', duracao_minutos: '' }) }}>Cancelar</button>}
                            </form>
                        </div>
                        <div className="card">
                            <h3>Catálogo</h3>
                            {servicos.map(s => (
                                <div key={s.id} className="list-item">
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{s.nome}</div>
                                        <div style={{ fontSize: '0.9rem', color: '#64748b' }}>{s.descricao}</div>
                                        <div style={{ fontWeight: 600, marginTop: 4, color: '#0f172a' }}>R$ {s.preco} • {s.duracao_minutos} min</div>
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
                        <div className="card" style={{ height: 'fit-content' }}>
                            <h3>Adicionar Membro</h3>
                            <form onSubmit={addMembro} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <input className="input" placeholder="Nome" value={novoMembro.nome} onChange={e => setNovoMembro({ ...novoMembro, nome: e.target.value })} required />
                                <input className="input" placeholder="Email" value={novoMembro.email} onChange={e => setNovoMembro({ ...novoMembro, email: e.target.value })} required />
                                <input className="input" placeholder="Senha" type="password" value={novoMembro.senha} onChange={e => setNovoMembro({ ...novoMembro, senha: e.target.value })} required />
                                <select className="input" value={novoMembro.role} onChange={e => setNovoMembro({ ...novoMembro, role: e.target.value })}>
                                    <option value="profissional">Profissional</option>
                                    <option value="dono">Administrador</option>
                                </select>
                                <button className="btn btn-primary">Adicionar</button>
                            </form>
                        </div>
                        <div className="card">
                            <h3>Profissionais</h3>
                            {equipe.map(m => (
                                <div key={m.id} className="list-item">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 36, height: 36, background: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{m.nome.charAt(0)}</div>
                                        <div><div style={{ fontWeight: 600 }}>{m.nome}</div><div style={{ fontSize: '0.8rem', color: '#64748b' }}>{m.email}</div></div>
                                    </div>
                                    {m.id !== usuario.id && <button onClick={() => removeMembro(m.id)} className="btn-icon" style={{ color: '#ef4444' }}><Trash2 size={18} /></button>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ABA: CONFIGURAÇÕES */}
                {aba === 'config' && (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3>Horários de Funcionamento</h3>
                            <button onClick={salvarHorarios} className="btn btn-primary"><Save size={18} /> Salvar Tudo</button>
                        </div>
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                            {horarios.map((h, i) => (
                                <div key={h.dia_semana} style={{ display: 'grid', gridTemplateColumns: '100px 50px 1fr', gap: 10, alignItems: 'center', padding: '16px', background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                    <div style={{ fontWeight: 600 }}>{moment().day(h.dia_semana).format('dddd')}</div>
                                    <label className="switch"><input type="checkbox" checked={h.ativo} onChange={e => updateHorario(i, 'ativo', e.target.checked)} /><span className="slider"></span></label>

                                    {h.ativo ? (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <Clock size={16} color="#64748b" />
                                                <input type="time" className="input" style={{ padding: '6px', width: 90 }} value={h.abertura} onChange={e => updateHorario(i, 'abertura', e.target.value)} />
                                                <span>até</span>
                                                <input type="time" className="input" style={{ padding: '6px', width: 90 }} value={h.fechamento} onChange={e => updateHorario(i, 'fechamento', e.target.value)} />
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <Coffee size={16} color="#f59e0b" />
                                                <input type="time" className="input" style={{ padding: '6px', width: 90 }} value={h.almoco_inicio} onChange={e => updateHorario(i, 'almoco_inicio', e.target.value)} />
                                                <span>até</span>
                                                <input type="time" className="input" style={{ padding: '6px', width: 90 }} value={h.almoco_fim} onChange={e => updateHorario(i, 'almoco_fim', e.target.value)} />
                                            </div>
                                        </div>
                                    ) : <span style={{ color: '#ef4444', fontWeight: 500, fontStyle: 'italic' }}>Fechado</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Dashboard;