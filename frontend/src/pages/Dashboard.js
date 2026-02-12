import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import moment from 'moment';
import 'moment/locale/pt-br';
import {
    Calendar, Users, Settings, Scissors, LogOut, Check, Clock,
    User, Save, Coffee, Home, CreditCard, Camera, Briefcase
} from 'lucide-react';

moment.locale('pt-br');

const Dashboard = ({ usuario, empresa }) => {
    // --- ESTADOS GLOBAIS ---
    const [aba, setAba] = useState('agenda');
    const [loading, setLoading] = useState(false);

    // Dados
    const [agenda, setAgenda] = useState([]);
    const [servicos, setServicos] = useState([]);
    const [equipe, setEquipe] = useState([]);
    const [slots, setSlots] = useState([]);
    const [perfil, setPerfil] = useState({ ...usuario, senha: '' }); // Dados editáveis

    // Dados da Empresa (Editáveis pelo Dono)
    const [empresaConfig, setEmpresaConfig] = useState({ ...empresa });

    // Horários
    const [horarios, setHorarios] = useState(
        Array.from({ length: 7 }, (_, i) => ({
            dia_semana: i, abertura: '09:00', fechamento: '18:00', almoco_inicio: '', almoco_fim: '', ativo: i !== 0
        }))
    );

    // Formulário de Agendamento
    const [novoAgendamento, setNovoAgendamento] = useState({ nome: '', servicoId: '', profissionalId: '', data: '', hora: '' });

    // --- CARREGAMENTO RESILIENTE (NÃO FALHA TUDO SE UM FALHAR) ---
    const carregarDados = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Agenda (Rota difere para cliente/dono)
            const rotaAgenda = usuario.role === 'dono' ? '/agendamentos/empresa' : '/agendamentos/meus';

            const results = await Promise.allSettled([
                api.get('/servicos'),
                api.get(rotaAgenda),
                api.get('/equipe') // Clientes também precisam ver equipe para agendar
            ]);

            if (results[0].status === 'fulfilled') setServicos(results[0].value.data);
            if (results[1].status === 'fulfilled') setAgenda(results[1].value.data);
            if (results[2].status === 'fulfilled') setEquipe(results[2].value.data);

            // 2. Dados Exclusivos do Dono
            if (usuario.role === 'dono') {
                const resHorarios = await api.get('/config/horarios').catch(() => ({ data: [] }));
                if (resHorarios.data.length > 0) {
                    setHorarios(prev => prev.map(p => {
                        const banco = resHorarios.data.find(b => b.dia_semana === p.dia_semana);
                        return banco ? { ...p, ...banco } : p;
                    }));
                }
            }
        } catch (e) { console.error("Erro geral no dashboard:", e); }
        setLoading(false);
    }, [usuario.role]);

    useEffect(() => { carregarDados(); }, [carregarDados]);

    // Slots Dinâmicos
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
                nomeClienteAvulso: novoAgendamento.nome // Só usado se for dono
            });
            alert("Agendamento confirmado!");
            setNovoAgendamento({ nome: '', servicoId: '', profissionalId: '', data: '', hora: '' });
            setSlots([]);
            carregarDados();
        } catch (e) { alert("Erro ao agendar."); }
    };

    const salvarPerfil = async (e) => {
        e.preventDefault();
        try {
            // Atualiza usuário
            await api.put('/perfil', perfil);

            // Se for dono, atualiza empresa também
            if (usuario.role === 'dono') {
                await api.put('/config/empresa', empresaConfig);
            }
            alert("Perfil atualizado! Recarregue para ver as mudanças.");
        } catch (e) { alert("Erro ao atualizar."); }
    };

    const salvarHorarios = async () => {
        try {
            const payload = horarios.map(h => ({ ...h, dia_semana: parseInt(h.dia_semana) }));
            await api.post('/config/horarios', payload);
            alert("Horários salvos!");
        } catch (e) { alert("Erro ao salvar."); }
    };

    const updateHorario = (i, field, val) => {
        const novos = [...horarios];
        novos[i][field] = val;
        setHorarios(novos);
    };

    // --- RENDER ---
    return (
        <div className="layout">
            {/* SIDEBAR */}
            <aside className="sidebar">
                <div className="desktop-only" style={{ marginBottom: 40, textAlign: 'center' }}>
                    {empresaConfig.logo_url ? (
                        <img src={empresaConfig.logo_url} alt="Logo" style={{ width: 60, height: 60, borderRadius: 12, objectFit: 'cover', marginBottom: 10 }} />
                    ) : (
                        <div style={{ width: 60, height: 60, background: empresaConfig.cor_primaria, borderRadius: 12, margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: 24 }}>
                            {empresaConfig.nome.charAt(0)}
                        </div>
                    )}
                    <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 800 }}>{empresaConfig.nome}</h2>
                </div>

                <nav style={{ flex: 1, display: 'flex', flexDirection: window.innerWidth <= 768 ? 'row' : 'column', gap: 8 }}>
                    <button className={`nav-btn ${aba === 'agenda' ? 'active' : ''}`} onClick={() => setAba('agenda')}>
                        <Calendar size={20} /> <span>Agenda</span>
                    </button>

                    {/* Botão Perfil (Todos têm) */}
                    <button className={`nav-btn ${aba === 'perfil' ? 'active' : ''}`} onClick={() => setAba('perfil')}>
                        <User size={20} /> <span>Perfil</span>
                    </button>

                    {/* Menus do Dono */}
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
                            <button className={`nav-btn ${aba === 'financeiro' ? 'active' : ''}`} onClick={() => setAba('financeiro')}>
                                <CreditCard size={20} /> <span>Assinatura</span>
                            </button>
                        </>
                    )}
                </nav>

                <button className="nav-btn desktop-only" style={{ marginTop: 'auto', color: '#ef4444' }} onClick={() => { localStorage.removeItem('marcou_token'); window.location.reload(); }}>
                    <LogOut size={20} /> <span>Sair</span>
                </button>
            </aside>

            {/* CONTEÚDO */}
            <main className="main-content">
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                    <div>
                        <h1 style={{ margin: 0 }}>
                            {aba === 'agenda' && (usuario.role === 'dono' ? 'Visão Geral' : 'Meus Agendamentos')}
                            {aba === 'perfil' && 'Meu Perfil'}
                            {aba === 'servicos' && 'Menu de Serviços'}
                            {aba === 'equipe' && 'Profissionais'}
                            {aba === 'financeiro' && 'Financeiro & Plano'}
                            {aba === 'config' && 'Horários & Regras'}
                        </h1>
                    </div>
                    {/* Foto de Perfil no Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {perfil.foto_url ? (
                            <img src={perfil.foto_url} alt="Perfil" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} />
                        ) : (
                            <div style={{ width: 40, height: 40, background: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                                {usuario.nome.charAt(0)}
                            </div>
                        )}
                    </div>
                </header>

                {/* ABA: AGENDA */}
                {aba === 'agenda' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
                        <div className="card">
                            <h3>📅 Novo Agendamento</h3>
                            <form onSubmit={handleAgendar} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {usuario.role === 'dono' && (
                                    <div><label className="label">Cliente Avulso</label><input className="input" placeholder="Nome do cliente (Balcão)" value={novoAgendamento.nome} onChange={e => setNovoAgendamento({ ...novoAgendamento, nome: e.target.value })} /></div>
                                )}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div>
                                        <label className="label">Serviço</label>
                                        <select className="input" value={novoAgendamento.servicoId} onChange={e => setNovoAgendamento({ ...novoAgendamento, servicoId: e.target.value })} required>
                                            <option value="">Selecione...</option>
                                            {servicos.map(s => <option key={s.id} value={s.id}>{s.nome} ({s.duracao_minutos}min)</option>)}
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
                                <div><label className="label">Data</label><input type="date" className="input" value={novoAgendamento.data} min={moment().format('YYYY-MM-DD')} onChange={e => setNovoAgendamento({ ...novoAgendamento, data: e.target.value })} required /></div>
                                {slots.length > 0 ? (
                                    <div><label className="label">Horários</label><div className="slots-grid">{slots.map(slot => (<div key={slot} className={`slot ${novoAgendamento.hora === slot ? 'selected' : ''}`} onClick={() => setNovoAgendamento({ ...novoAgendamento, hora: slot })}>{slot}</div>))}</div></div>
                                ) : novoAgendamento.data && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 10 }}>Sem horários livres.</div>}
                                <button type="submit" className="btn btn-cta" disabled={!novoAgendamento.hora}>Confirmar Agendamento</button>
                            </form>
                        </div>

                        <div className="card">
                            <h3>📌 {usuario.role === 'dono' ? 'Agenda Completa' : 'Seus Horários'}</h3>
                            {agenda.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Nenhum agendamento encontrado.</p> : (
                                <div>
                                    {agenda.map(ag => (
                                        <div key={ag.id} className="list-item">
                                            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                                <div style={{ background: '#f0f9ff', padding: '10px 14px', borderRadius: 10, textAlign: 'center', color: 'var(--primary)' }}>
                                                    <div style={{ fontWeight: '800', fontSize: '1.1rem' }}>{moment(ag.data_hora_inicio).format('DD')}</div>
                                                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>{moment(ag.data_hora_inicio).format('MMM')}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{ag.Servico?.nome}</div>
                                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                                        <Clock size={14} /> {moment(ag.data_hora_inicio).format('HH:mm')}
                                                        <User size={14} style={{ marginLeft: 8 }} /> {ag.Cliente ? ag.Cliente.nome : ag.nome_cliente_avulso}
                                                        {usuario.role === 'dono' && <span>(com {ag.Profissional?.nome})</span>}
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

                {/* ABA: PERFIL (Novo) */}
                {aba === 'perfil' && (
                    <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <div className="avatar-upload">
                                {perfil.foto_url ? <img src={perfil.foto_url} className="avatar-img" alt="Perfil" /> : <div className="avatar-img" style={{ background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>{perfil.nome.charAt(0)}</div>}
                                <div className="avatar-overlay"><Camera size={14} /></div>
                            </div>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Cole o link da sua foto abaixo</p>
                        </div>

                        <form onSubmit={salvarPerfil} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div><label className="label">Nome Completo</label><input className="input" value={perfil.nome} onChange={e => setPerfil({ ...perfil, nome: e.target.value })} required /></div>
                            <div><label className="label">Email</label><input className="input" value={perfil.email} onChange={e => setPerfil({ ...perfil, email: e.target.value })} required /></div>
                            <div><label className="label">Foto URL (Link)</label><input className="input" value={perfil.foto_url || ''} onChange={e => setPerfil({ ...perfil, foto_url: e.target.value })} placeholder="https://..." /></div>
                            <div><label className="label">Nova Senha (Opcional)</label><input className="input" type="password" value={perfil.senha} onChange={e => setPerfil({ ...perfil, senha: e.target.value })} placeholder="Deixe vazio para manter" /></div>

                            {/* Campos da Empresa (Só Dono vê) */}
                            {usuario.role === 'dono' && (
                                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, marginTop: 10 }}>
                                    <h3>Dados do Negócio</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        <div><label className="label">Nome da Empresa</label><input className="input" value={empresaConfig.nome} onChange={e => setEmpresaConfig({ ...empresaConfig, nome: e.target.value })} /></div>
                                        <div><label className="label">Logo URL</label><input className="input" value={empresaConfig.logo_url || ''} onChange={e => setEmpresaConfig({ ...empresaConfig, logo_url: e.target.value })} placeholder="https://..." /></div>
                                        <div><label className="label">Cor do Tema (Hex)</label><input className="input" type="color" style={{ height: 50 }} value={empresaConfig.cor_primaria} onChange={e => setEmpresaConfig({ ...empresaConfig, cor_primaria: e.target.value })} /></div>
                                    </div>
                                </div>
                            )}

                            <button type="submit" className="btn btn-primary" style={{ marginTop: 20 }}>Salvar Alterações</button>
                        </form>
                    </div>
                )}

                {/* ABA: FINANCEIRO (Placeholder) */}
                {aba === 'financeiro' && usuario.role === 'dono' && (
                    <div className="card" style={{ textAlign: 'center', padding: 50 }}>
                        <div style={{ background: '#eff6ff', width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--primary)' }}>
                            <CreditCard size={40} />
                        </div>
                        <h2>Plano Profissional</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: 30 }}>Gerencie sua assinatura e faturas.</p>
                        <div style={{ display: 'inline-block', padding: '10px 20px', background: '#f3f4f6', borderRadius: 8, fontWeight: 700 }}>Em breve: Integração com Pagamento</div>
                    </div>
                )}

                {/* ABA: CONFIGURAÇÕES (Horários) */}
                {aba === 'config' && usuario.role === 'dono' && (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3>⏰ Horários de Funcionamento</h3>
                            <button onClick={salvarHorarios} className="btn btn-primary">Salvar</button>
                        </div>
                        {horarios.map((h, i) => (
                            <div key={h.dia_semana} style={{ display: 'grid', gridTemplateColumns: '100px 50px 1fr', gap: 10, alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ fontWeight: 700 }}>{moment().day(h.dia_semana).format('dddd')}</div>
                                <label className="switch"><input type="checkbox" checked={h.ativo} onChange={e => updateHorario(i, 'ativo', e.target.checked)} /><span className="slider"></span></label>
                                {h.ativo ? (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={16} /><input type="time" className="input" style={{ padding: '6px', width: 90 }} value={h.abertura} onChange={e => updateHorario(i, 'abertura', e.target.value)} /><span>-</span><input type="time" className="input" style={{ padding: '6px', width: 90 }} value={h.fechamento} onChange={e => updateHorario(i, 'fechamento', e.target.value)} /></div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Coffee size={16} /><input type="time" className="input" style={{ padding: '6px', width: 90 }} value={h.almoco_inicio} onChange={e => updateHorario(i, 'almoco_inicio', e.target.value)} /><span>-</span><input type="time" className="input" style={{ padding: '6px', width: 90 }} value={h.almoco_fim} onChange={e => updateHorario(i, 'almoco_fim', e.target.value)} /></div>
                                    </div>
                                ) : <span style={{ color: 'var(--danger)', fontWeight: 700, fontStyle: 'italic' }}>Fechado</span>}
                            </div>
                        ))}
                    </div>
                )}

                {/* ABA: SERVIÇOS & EQUIPE (Manter código similar ao anterior, mas com as classes CSS novas) */}
                {/* ... (Por brevidade, use a lógica do código anterior mas com as classes 'card', 'input', 'list-item' novas) ... */}
                {/* Se quiser o código completo dessas abas também, me avise, mas a lógica é idêntica à versão anterior, só muda o visual */}
            </main>
        </div>
    );
};

export default Dashboard;