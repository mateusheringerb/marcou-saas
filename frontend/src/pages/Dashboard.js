import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import moment from 'moment';
import 'moment/locale/pt-br';
import {
    Calendar, Users, Settings, Scissors, Plus, Trash2, Edit2, LogOut,
    Check, X, Clock, DollarSign, User, AlertCircle, Save, Coffee
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

    // Horários (Inicializa com padrão para não ficar vazio na tela)
    const [horarios, setHorarios] = useState(
        Array.from({ length: 7 }, (_, i) => ({
            dia_semana: i,
            abertura: '09:00',
            fechamento: '18:00',
            almoco_inicio: '12:00',
            almoco_fim: '13:00',
            ativo: i !== 0 // Domingo fechado por padrão
        }))
    );

    // Forms
    const [novoAgendamento, setNovoAgendamento] = useState({ nome: '', servicoId: '', profissionalId: '', data: '', hora: '' });
    const [novoMembro, setNovoMembro] = useState({ nome: '', email: '', senha: '', role: 'profissional' });
    const [svcForm, setSvcForm] = useState({ nome: '', descricao: '', preco: '', duracao_minutos: '' });
    const [editId, setEditId] = useState(null);

    // --- CARREGAMENTO DE DADOS (INDIVIDUAL E ROBUSTO) ---
    const carregarTudo = useCallback(async () => {
        setLoading(true);

        // 1. Carregar Serviços
        try {
            const res = await api.get('/servicos');
            setServicos(res.data);
        } catch (e) { console.error("Erro serviços:", e); }

        // 2. Carregar Agenda
        try {
            const rota = usuario.role === 'dono' ? '/agendamentos/empresa' : '/agendamentos/meus';
            const res = await api.get(rota);
            setAgenda(res.data);
        } catch (e) { console.error("Erro agenda:", e); }

        // 3. Dados exclusivos do Dono
        if (usuario.role === 'dono') {
            try {
                const res = await api.get('/equipe');
                setEquipe(res.data);
            } catch (e) { console.error("Erro equipe:", e); }

            try {
                const res = await api.get('/config/horarios');
                if (res.data.length > 0) {
                    // Mescla o que veio do banco com o padrão local (garante que os 7 dias existam)
                    setHorarios(prev => prev.map(p => {
                        const doBanco = res.data.find(b => b.dia_semana === p.dia_semana);
                        return doBanco ? { ...p, ...doBanco } : p;
                    }));
                }
            } catch (e) { console.error("Erro horários:", e); }
        } else {
            // Cliente carrega equipe para poder agendar
            try {
                const res = await api.get('/equipe');
                setEquipe(res.data);
            } catch (e) { }
        }
        setLoading(false);
    }, [usuario.role]);

    useEffect(() => { carregarTudo(); }, [carregarTudo]);

    // Busca Slots Dinamicamente
    useEffect(() => {
        const { data, servicoId, profissionalId } = novoAgendamento;
        if (data && servicoId && profissionalId) {
            api.get(`/disponibilidade?data=${data}&servicoId=${servicoId}&profissionalId=${profissionalId}`)
                .then(res => setSlots(res.data))
                .catch(() => setSlots([]));
        } else setSlots([]);
    }, [novoAgendamento.data, novoAgendamento.servicoId, novoAgendamento.profissionalId]);


    // --- FUNÇÕES DE AÇÃO ---

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
            alert("Agendamento realizado com sucesso!");
            setNovoAgendamento({ nome: '', servicoId: '', profissionalId: '', data: '', hora: '' });
            setSlots([]);
            carregarTudo();
        } catch (e) { alert("Erro: " + (e.response?.data?.erro || "Falha ao agendar")); }
    };

    const handleService = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...svcForm,
                preco: parseFloat(svcForm.preco) || 0,
                duracao_minutos: parseInt(svcForm.duracao_minutos) || 30
            };

            if (editId) await api.put(`/servicos/${editId}`, payload);
            else await api.post('/servicos', payload);

            // Força atualização local imediata para feedback visual
            setSvcForm({ nome: '', descricao: '', preco: '', duracao_minutos: '' });
            setEditId(null);
            carregarTudo(); // Recarrega do backend para confirmar
            alert("Serviço salvo!");
        } catch (e) {
            console.error(e);
            alert("Erro ao salvar serviço.");
        }
    };

    const deleteService = async (id) => {
        if (!window.confirm("Tem certeza que deseja excluir?")) return;
        try { await api.delete(`/servicos/${id}`); carregarTudo(); } catch (e) { alert("Erro ao excluir."); }
    };

    const addMembro = async (e) => {
        e.preventDefault();
        try {
            await api.post('/equipe', novoMembro);
            setNovoMembro({ nome: '', email: '', senha: '', role: 'profissional' });
            carregarTudo();
            alert("Membro adicionado!");
        } catch (e) { alert(e.response?.data?.erro || "Erro ao adicionar membro."); }
    };

    const removeMembro = async (id) => {
        if (!window.confirm("Remover este membro?")) return;
        try { await api.delete(`/equipe/${id}`); carregarTudo(); } catch (e) { alert("Erro ao remover."); }
    };

    const salvarHorarios = async () => {
        try {
            // Garante envio limpo
            const payload = horarios.map(h => ({
                dia_semana: parseInt(h.dia_semana),
                abertura: h.abertura,
                fechamento: h.fechamento,
                almoco_inicio: h.almoco_inicio,
                almoco_fim: h.almoco_fim,
                ativo: h.ativo
            }));
            await api.post('/config/horarios', payload);
            alert("Configurações salvas!");
        } catch (e) { alert("Erro ao salvar horários."); }
    };

    const updateHorario = (index, campo, valor) => {
        const novos = [...horarios];
        novos[index][campo] = valor;
        setHorarios(novos);
    };

    // --- RENDERIZAÇÃO ---
    return (
        <div className="layout-container">
            {/* SIDEBAR */}
            <aside className="sidebar">
                <div style={{ marginBottom: 40, display: 'flex', alignItems: 'center', gap: 10 }}>
                    {empresa.logo_url && <img src={empresa.logo_url} alt="Logo" style={{ width: 32, height: 32, borderRadius: 8 }} />}
                    <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>{empresa.nome}</h2>
                </div>

                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <button className={`nav-item ${aba === 'agenda' ? 'active' : ''}`} onClick={() => setAba('agenda')}>
                        <Calendar size={18} /> Agenda
                    </button>
                    {usuario.role === 'dono' && (
                        <>
                            <button className={`nav-item ${aba === 'servicos' ? 'active' : ''}`} onClick={() => setAba('servicos')}>
                                <Scissors size={18} /> Serviços
                            </button>
                            <button className={`nav-item ${aba === 'equipe' ? 'active' : ''}`} onClick={() => setAba('equipe')}>
                                <Users size={18} /> Equipe
                            </button>
                            <button className={`nav-item ${aba === 'config' ? 'active' : ''}`} onClick={() => setAba('config')}>
                                <Settings size={18} /> Configurações
                            </button>
                        </>
                    )}
                </nav>

                <button className="nav-item" style={{ marginTop: 'auto', color: '#ef4444' }} onClick={() => { localStorage.removeItem('marcou_token'); window.location.reload(); }}>
                    <LogOut size={18} /> Sair
                </button>
            </aside>

            {/* CONTEÚDO */}
            <main className="main-content">
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.8rem' }}>
                            {aba === 'agenda' && 'Agenda'}
                            {aba === 'servicos' && 'Catálogo de Serviços'}
                            {aba === 'equipe' && 'Profissionais'}
                            {aba === 'config' && 'Horários & Regras'}
                        </h1>
                        <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.7 }}>Gerencie seu negócio com inteligência</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 600 }}>{usuario.nome}</div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{usuario.email}</div>
                        </div>
                        <div style={{ width: 40, height: 40, background: '#000', borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                            {usuario.nome.charAt(0)}
                        </div>
                    </div>
                </header>

                {/* ABA: AGENDA */}
                {aba === 'agenda' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 30 }}>
                        <div className="card">
                            <h3>Próximos Agendamentos</h3>
                            {agenda.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                                    <Calendar size={40} style={{ marginBottom: 10, opacity: 0.5 }} />
                                    <p>Nenhum agendamento encontrado.</p>
                                </div>
                            ) : (
                                <div>
                                    {agenda.map(ag => (
                                        <div key={ag.id} className="list-row">
                                            <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
                                                <div style={{ background: '#f1f5f9', padding: '10px', borderRadius: 8, textAlign: 'center', minWidth: 60 }}>
                                                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{moment(ag.data_hora_inicio).format('DD')}</div>
                                                    <div style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>{moment(ag.data_hora_inicio).format('MMM')}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{ag.Servico?.nome}</div>
                                                    <div style={{ fontSize: '0.9rem', color: '#666', display: 'flex', alignItems: 'center', gap: 5 }}>
                                                        <Clock size={14} /> {moment(ag.data_hora_inicio).format('HH:mm')}
                                                        <User size={14} style={{ marginLeft: 8 }} /> {ag.Cliente ? ag.Cliente.nome : ag.nome_cliente_avulso}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <span style={{ fontSize: '0.8rem', background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: 20, fontWeight: 600 }}>CONFIRMADO</span>
                                                {usuario.role === 'dono' && <div style={{ fontSize: '0.8rem', marginTop: 5, color: '#666' }}>{ag.Profissional?.nome}</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="card" style={{ height: 'fit-content' }}>
                            <h3>Novo Agendamento</h3>
                            <form onSubmit={handleAgendar} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                                {usuario.role === 'dono' && (
                                    <div>
                                        <label className="label">Cliente Avulso (Balcão)</label>
                                        <input className="input-field" placeholder="Nome do cliente" value={novoAgendamento.nome} onChange={e => setNovoAgendamento({ ...novoAgendamento, nome: e.target.value })} />
                                    </div>
                                )}
                                <div>
                                    <label className="label">Serviço</label>
                                    <select className="input-field" value={novoAgendamento.servicoId} onChange={e => setNovoAgendamento({ ...novoAgendamento, servicoId: e.target.value })} required>
                                        <option value="">Selecione...</option>
                                        {servicos.map(s => <option key={s.id} value={s.id}>{s.nome} ({s.duracao_minutos}min)</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Profissional</label>
                                    <select className="input-field" value={novoAgendamento.profissionalId} onChange={e => setNovoAgendamento({ ...novoAgendamento, profissionalId: e.target.value })} required>
                                        <option value="">Selecione...</option>
                                        {equipe.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Data</label>
                                    <input type="date" className="input-field" value={novoAgendamento.data} min={moment().format('YYYY-MM-DD')} onChange={e => setNovoAgendamento({ ...novoAgendamento, data: e.target.value })} required />
                                </div>

                                {slots.length > 0 ? (
                                    <div>
                                        <label className="label">Horários Disponíveis</label>
                                        <div className="time-grid">
                                            {slots.map(slot => (
                                                <div key={slot} className={`time-slot ${novoAgendamento.hora === slot ? 'selected' : ''}`} onClick={() => setNovoAgendamento({ ...novoAgendamento, hora: slot })}>
                                                    {slot}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    novoAgendamento.data && <div style={{ fontSize: '0.9rem', color: '#666', fontStyle: 'italic', textAlign: 'center', padding: 10 }}>Nenhum horário disponível ou dia fechado.</div>
                                )}

                                <button type="submit" className="btn btn-primary" disabled={!novoAgendamento.hora} style={{ marginTop: 10 }}>
                                    <Check size={18} /> Confirmar
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* ABA: SERVIÇOS */}
                {aba === 'servicos' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: 30 }}>
                        <div className="card" style={{ height: 'fit-content' }}>
                            <h3>{editId ? 'Editar Serviço' : 'Adicionar Serviço'}</h3>
                            <form onSubmit={handleService} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                                <div><label className="label">Nome</label><input className="input-field" value={svcForm.nome} onChange={e => setSvcForm({ ...svcForm, nome: e.target.value })} required placeholder="Ex: Corte Cabelo" /></div>
                                <div><label className="label">Descrição</label><input className="input-field" value={svcForm.descricao} onChange={e => setSvcForm({ ...svcForm, descricao: e.target.value })} placeholder="Detalhes..." /></div>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <div style={{ flex: 1 }}><label className="label">Preço (R$)</label><input className="input-field" type="number" step="0.01" value={svcForm.preco} onChange={e => setSvcForm({ ...svcForm, preco: e.target.value })} required /></div>
                                    <div style={{ flex: 1 }}><label className="label">Minutos</label><input className="input-field" type="number" value={svcForm.duracao_minutos} onChange={e => setSvcForm({ ...svcForm, duracao_minutos: e.target.value })} required /></div>
                                </div>
                                <button type="submit" className="btn btn-primary"><Save size={18} /> Salvar</button>
                                {editId && <button type="button" className="btn btn-secondary" onClick={() => { setEditId(null); setSvcForm({ nome: '', descricao: '', preco: '', duracao_minutos: '' }) }}>Cancelar</button>}
                            </form>
                        </div>

                        <div className="card">
                            <h3>Lista de Serviços</h3>
                            {servicos.length === 0 ? <p style={{ color: '#999' }}>Nenhum serviço cadastrado.</p> : (
                                <div>
                                    {servicos.map(s => (
                                        <div key={s.id} className="list-row">
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{s.nome}</div>
                                                <div style={{ fontSize: '0.9rem', color: '#666' }}>{s.descricao}</div>
                                                <div style={{ fontWeight: 500, marginTop: 4 }}>R$ {s.preco} • {s.duracao_minutos} min</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 5 }}>
                                                <button onClick={() => { setEditId(s.id); setSvcForm(s) }} className="btn-icon"><Edit2 size={18} /></button>
                                                <button onClick={() => deleteService(s.id)} className="btn-icon" style={{ color: '#ef4444' }}><Trash2 size={18} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ABA: EQUIPE */}
                {aba === 'equipe' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: 30 }}>
                        <div className="card" style={{ height: 'fit-content' }}>
                            <h3>Novo Profissional</h3>
                            <form onSubmit={addMembro} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                                <div><label className="label">Nome</label><input className="input-field" value={novoMembro.nome} onChange={e => setNovoMembro({ ...novoMembro, nome: e.target.value })} required /></div>
                                <div><label className="label">Email</label><input className="input-field" type="email" value={novoMembro.email} onChange={e => setNovoMembro({ ...novoMembro, email: e.target.value })} required /></div>
                                <div><label className="label">Senha</label><input className="input-field" type="password" value={novoMembro.senha} onChange={e => setNovoMembro({ ...novoMembro, senha: e.target.value })} required /></div>
                                <div>
                                    <label className="label">Permissão</label>
                                    <select className="input-field" value={novoMembro.role} onChange={e => setNovoMembro({ ...novoMembro, role: e.target.value })}>
                                        <option value="profissional">Profissional (Apenas Agenda)</option>
                                        <option value="dono">Administrador (Total)</option>
                                    </select>
                                </div>
                                <button type="submit" className="btn btn-primary"><Plus size={18} /> Cadastrar</button>
                            </form>
                        </div>
                        <div className="card">
                            <h3>Equipe Cadastrada</h3>
                            {equipe.length === 0 ? <p>Nenhum membro encontrado.</p> : (
                                <div>
                                    {equipe.map(m => (
                                        <div key={m.id} className="list-row">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ width: 40, height: 40, background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{m.nome.charAt(0)}</div>
                                                <div>
                                                    <div style={{ fontWeight: 600 }}>{m.nome}</div>
                                                    <div style={{ fontSize: '0.85rem', color: '#666' }}>{m.email}</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                                                <span style={{ fontSize: '0.75rem', background: '#e2e8f0', padding: '4px 8px', borderRadius: 4, textTransform: 'uppercase', fontWeight: 600 }}>{m.role}</span>
                                                {m.id !== usuario.id && <button onClick={() => removeMembro(m.id)} className="btn-icon" style={{ color: '#ef4444' }}><Trash2 size={18} /></button>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ABA: CONFIGURAÇÕES (HORÁRIOS & ALMOÇO) */}
                {aba === 'config' && (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3>Horários de Funcionamento & Almoço</h3>
                            <button onClick={salvarHorarios} className="btn btn-primary"><Save size={18} /> Salvar Alterações</button>
                        </div>

                        <div style={{ display: 'grid', gap: 0 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '100px 60px 1fr 1fr', gap: 10, padding: '10px 0', borderBottom: '2px solid #eee', fontWeight: 'bold', color: '#666', fontSize: '0.8rem' }}>
                                <div>DIA</div>
                                <div>STATUS</div>
                                <div>EXPEDIENTE (Início - Fim)</div>
                                <div>ALMOÇO (Início - Fim)</div>
                            </div>

                            {horarios.map((h, i) => (
                                <div key={h.dia_semana} style={{ display: 'grid', gridTemplateColumns: '100px 60px 1fr 1fr', gap: 10, alignItems: 'center', padding: '15px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <div style={{ fontWeight: 600 }}>{moment().day(h.dia_semana).format('dddd')}</div>

                                    <label className="switch">
                                        <input type="checkbox" checked={h.ativo} onChange={e => updateHorario(i, 'ativo', e.target.checked)} />
                                        <span className="slider"></span>
                                    </label>

                                    {h.ativo ? (
                                        <>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <input type="time" className="input-field" style={{ padding: '5px' }} value={h.abertura} onChange={e => updateHorario(i, 'abertura', e.target.value)} />
                                                <span style={{ color: '#999' }}>-</span>
                                                <input type="time" className="input-field" style={{ padding: '5px' }} value={h.fechamento} onChange={e => updateHorario(i, 'fechamento', e.target.value)} />
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <Coffee size={16} color="#c0a062" />
                                                <input type="time" className="input-field" style={{ padding: '5px' }} value={h.almoco_inicio || "12:00"} onChange={e => updateHorario(i, 'almoco_inicio', e.target.value)} />
                                                <span style={{ color: '#999' }}>-</span>
                                                <input type="time" className="input-field" style={{ padding: '5px' }} value={h.almoco_fim || "13:00"} onChange={e => updateHorario(i, 'almoco_fim', e.target.value)} />
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{ gridColumn: '3 / -1', color: '#ef4444', fontWeight: 500, fontStyle: 'italic', paddingLeft: 10 }}>
                                            Fechado
                                        </div>
                                    )}
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