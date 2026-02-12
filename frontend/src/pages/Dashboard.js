import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import moment from 'moment';
import 'moment/locale/pt-br';

moment.locale('pt-br');

const Dashboard = ({ usuario, empresa }) => {
    const [aba, setAba] = useState('agenda');
    const [agenda, setAgenda] = useState([]);
    const [servicos, setServicos] = useState([]);
    const [equipe, setEquipe] = useState([]);
    const [horarios, setHorarios] = useState([]);

    // Estados Agendamento
    const [slots, setSlots] = useState([]);
    const [novoAgendamento, setNovoAgendamento] = useState({
        nome: '', servicoId: '', profissionalId: '', data: '', hora: ''
    });

    // Estados Gestão
    const [novoMembro, setNovoMembro] = useState({ nome: '', email: '', senha: '', role: 'profissional' });
    const [svcForm, setSvcForm] = useState({ nome: '', descricao: '', preco: '', duracao_minutos: '' });
    const [editId, setEditId] = useState(null);

    const loadData = useCallback(async () => {
        try {
            const rotaAgenda = usuario.role === 'dono' ? '/agendamentos/empresa' : '/agendamentos/meus';
            const [resAgenda, resServicos] = await Promise.all([
                api.get(rotaAgenda),
                api.get('/servicos')
            ]);
            setAgenda(resAgenda.data);
            setServicos(resServicos.data);

            if (usuario.role === 'dono') {
                const [resEquipe, resHorarios] = await Promise.all([
                    api.get('/equipe'),
                    api.get('/config/horarios')
                ]);
                setEquipe(resEquipe.data);

                if (resHorarios.data.length === 0) {
                    const padrao = Array.from({ length: 7 }, (_, i) => ({
                        dia_semana: i, abertura: '09:00', fechamento: '18:00', ativo: i !== 0
                    }));
                    setHorarios(padrao);
                } else {
                    setHorarios(resHorarios.data);
                }
            } else {
                // Para clientes, carrega equipe básica
                const resEquipePublica = await api.get('/equipe');
                setEquipe(resEquipePublica.data);
            }
        } catch (e) { console.error("Erro dados", e); }
    }, [usuario.role]);

    useEffect(() => { loadData(); }, [loadData]);

    // Busca Slots quando muda Data, Serviço ou Profissional
    useEffect(() => {
        const { data, servicoId, profissionalId } = novoAgendamento;
        if (data && servicoId && profissionalId) {
            api.get(`/disponibilidade?data=${data}&servicoId=${servicoId}&profissionalId=${profissionalId}`)
                .then(res => setSlots(res.data))
                .catch(e => console.error(e));
        } else {
            setSlots([]);
        }
    }, [novoAgendamento.data, novoAgendamento.servicoId, novoAgendamento.profissionalId]);

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
        } catch (e) { alert("Erro ao adicionar membro."); }
    };

    const removeMembro = async (id) => {
        if (!window.confirm("Remover?")) return;
        try { await api.delete(`/equipe/${id}`); loadData(); } catch (e) { alert("Erro"); }
    };

    const salvarHorarios = async () => {
        try { await api.post('/config/horarios', horarios); alert("Horários salvos!"); } catch (e) { alert("Erro"); }
    };

    const updateHorario = (dia, campo, valor) => {
        setHorarios(horarios.map(h => h.dia_semana === dia ? { ...h, [campo]: valor } : h));
    };

    const handleService = async (e) => {
        e.preventDefault();
        try {
            if (editId) await api.put(`/servicos/${editId}`, svcForm);
            else await api.post('/servicos', svcForm);
            alert("Salvo!"); setSvcForm({ nome: '', descricao: '', preco: '', duracao_minutos: '' }); setEditId(null); loadData();
        } catch (e) { alert("Erro ao salvar"); }
    };
    const deleteService = async (id) => { if (window.confirm("Excluir?")) { await api.delete(`/servicos/${id}`); loadData(); } };

    return (
        <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: 5, marginBottom: 20, overflowX: 'auto' }}>
                <BtnAba label="📅 Agenda" active={aba === 'agenda'} onClick={() => setAba('agenda')} />
                {usuario.role === 'dono' && (
                    <>
                        <BtnAba label="✂️ Serviços" active={aba === 'servicos'} onClick={() => setAba('servicos')} />
                        <BtnAba label="👥 Equipe" active={aba === 'equipe'} onClick={() => setAba('equipe')} />
                        <BtnAba label="⚙️ Configurações" active={aba === 'config'} onClick={() => setAba('config')} />
                    </>
                )}
            </div>

            {aba === 'agenda' && (
                <div>
                    <div style={{ background: '#fff', padding: 20, borderRadius: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: 20 }}>
                        <h3 style={{ marginTop: 0 }}>Novo Agendamento</h3>
                        <form onSubmit={handleAgendar} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                            {usuario.role === 'dono' && (
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label>Nome do Cliente (Balcão)</label>
                                    <input style={inputStyle} value={novoAgendamento.nome} onChange={e => setNovoAgendamento({ ...novoAgendamento, nome: e.target.value })} placeholder="Deixe vazio se for você mesmo" />
                                </div>
                            )}
                            <div>
                                <label>Serviço</label>
                                <select style={inputStyle} value={novoAgendamento.servicoId} onChange={e => setNovoAgendamento({ ...novoAgendamento, servicoId: e.target.value })} required>
                                    <option value="">Selecione...</option>
                                    {servicos.map(s => <option key={s.id} value={s.id}>{s.nome} ({s.duracao_minutos} min)</option>)}
                                </select>
                            </div>
                            <div>
                                <label>Profissional</label>
                                <select style={inputStyle} value={novoAgendamento.profissionalId} onChange={e => setNovoAgendamento({ ...novoAgendamento, profissionalId: e.target.value })} required>
                                    <option value="">Selecione...</option>
                                    {equipe.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                </select>
                            </div>
                            <div>
                                <label>Data</label>
                                <input type="date" style={inputStyle} value={novoAgendamento.data} min={moment().format('YYYY-MM-DD')} onChange={e => setNovoAgendamento({ ...novoAgendamento, data: e.target.value })} required />
                            </div>
                            <div>
                                <label>Horário Disponível</label>
                                <select style={inputStyle} value={novoAgendamento.hora} onChange={e => setNovoAgendamento({ ...novoAgendamento, hora: e.target.value })} required disabled={slots.length === 0}>
                                    <option value="">{slots.length > 0 ? 'Escolha um horário...' : 'Selecione data/profissional'}</option>
                                    {slots.map(slot => <option key={slot} value={slot}>{slot}</option>)}
                                </select>
                            </div>
                            <button type="submit" style={{ gridColumn: 'span 2', padding: 12, background: empresa.cor_primaria, color: '#fff', border: 'none', borderRadius: 5, fontSize: 16, cursor: 'pointer' }} disabled={!novoAgendamento.hora}>
                                Confirmar Agendamento
                            </button>
                        </form>
                    </div>
                    <h3>Próximos Agendamentos</h3>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {agenda.map(ag => (
                            <li key={ag.id} style={{ background: '#fff', padding: 15, marginBottom: 10, borderRadius: 8, borderLeft: `5px solid ${empresa.cor_primaria}`, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <strong>{moment(ag.data_hora_inicio).format('DD/MM HH:mm')}</strong> - {ag.Servico?.nome}
                                <div style={{ color: '#666', fontSize: 14, marginTop: 5 }}>
                                    👤 {ag.Cliente ? ag.Cliente.nome : <b>{ag.nome_cliente_avulso}</b>}
                                    {usuario.role === 'dono' && ag.Profissional && ` | ✂️ ${ag.Profissional.nome}`}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {aba === 'equipe' && usuario.role === 'dono' && (
                <div>
                    <div style={{ background: '#fff', padding: 20, borderRadius: 10, marginBottom: 20 }}>
                        <h3>Adicionar Membro</h3>
                        <form onSubmit={addMembro} style={{ display: 'grid', gap: 10 }}>
                            <input style={inputStyle} placeholder="Nome" value={novoMembro.nome} onChange={e => setNovoMembro({ ...novoMembro, nome: e.target.value })} required />
                            <input style={inputStyle} placeholder="Email" type="email" value={novoMembro.email} onChange={e => setNovoMembro({ ...novoMembro, email: e.target.value })} required />
                            <input style={inputStyle} placeholder="Senha" type="password" value={novoMembro.senha} onChange={e => setNovoMembro({ ...novoMembro, senha: e.target.value })} required />
                            <select style={inputStyle} value={novoMembro.role} onChange={e => setNovoMembro({ ...novoMembro, role: e.target.value })}>
                                <option value="profissional">Profissional (Barbeiro)</option>
                                <option value="dono">Administrador</option>
                            </select>
                            <button type="submit" style={btnStyle(empresa.cor_primaria)}>Adicionar</button>
                        </form>
                    </div>
                    {equipe.map(m => (
                        <div key={m.id} style={{ background: '#fff', padding: 15, marginBottom: 10, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div><strong>{m.nome}</strong> - {m.email}</div>
                            {m.id !== usuario.id && <button onClick={() => removeMembro(m.id)} style={btnStyle('#dc3545')}>Remover</button>}
                        </div>
                    ))}
                </div>
            )}

            {aba === 'config' && usuario.role === 'dono' && (
                <div>
                    <div style={{ background: '#fff', padding: 20, borderRadius: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}><h3>Horários</h3><button onClick={salvarHorarios} style={btnStyle('#28a745')}>Salvar</button></div>
                        {horarios.map((h, index) => (
                            <div key={h.dia_semana} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: 10, background: index % 2 === 0 ? '#f9f9f9' : '#fff' }}>
                                <div style={{ width: 100, fontWeight: 'bold' }}>{moment().day(h.dia_semana).format('dddd')}</div>
                                <input type="checkbox" checked={h.ativo} onChange={e => updateHorario(h.dia_semana, 'ativo', e.target.checked)} />
                                {h.ativo ? <><input type="time" value={h.abertura} onChange={e => updateHorario(h.dia_semana, 'abertura', e.target.value)} style={inputStyle} /> até <input type="time" value={h.fechamento} onChange={e => updateHorario(h.dia_semana, 'fechamento', e.target.value)} style={inputStyle} /></> : <span>Fechado</span>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {aba === 'servicos' && usuario.role === 'dono' && (
                <div>
                    <div style={{ background: '#fff', padding: 20, borderRadius: 10, marginBottom: 20 }}>
                        <h4>{editId ? 'Editar' : 'Novo'} Serviço</h4>
                        <form onSubmit={handleService} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <input placeholder="Nome" value={svcForm.nome} onChange={e => setSvcForm({ ...svcForm, nome: e.target.value })} style={inputStyle} />
                            <input placeholder="Descrição" value={svcForm.descricao} onChange={e => setSvcForm({ ...svcForm, descricao: e.target.value })} style={inputStyle} />
                            <div style={{ display: 'flex', gap: 10 }}>
                                <input placeholder="Preço" type="number" value={svcForm.preco} onChange={e => setSvcForm({ ...svcForm, preco: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
                                <input placeholder="Minutos" type="number" value={svcForm.duracao_minutos} onChange={e => setSvcForm({ ...svcForm, duracao_minutos: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
                            </div>
                            <button type="submit" style={btnStyle(empresa.cor_primaria)}>Salvar</button>
                        </form>
                    </div>
                    {servicos.map(s => (
                        <div key={s.id} style={{ background: '#fff', padding: 15, marginBottom: 10, borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
                            <div><b>{s.nome}</b><br />R${s.preco} - {s.duracao_minutos}min</div>
                            <div>
                                <button onClick={() => { setEditId(s.id); setSvcForm(s) }} style={{ marginRight: 5, cursor: 'pointer', border: 'none', background: 'none', fontSize: 20 }}>✏️</button>
                                <button onClick={() => deleteService(s.id)} style={{ cursor: 'pointer', border: 'none', background: 'none', fontSize: 20 }}>🗑️</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const BtnAba = ({ label, active, onClick }) => (
    <button onClick={onClick} style={{ padding: '10px 20px', background: active ? '#1a1a1a' : '#ddd', color: active ? '#fff' : '#000', border: 'none', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 'bold' }}>{label}</button>
);
const inputStyle = { padding: 10, borderRadius: 5, border: '1px solid #ccc', width: '100%' };
const btnStyle = (bg) => ({ padding: 10, background: bg, color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 'bold' });

export default Dashboard;