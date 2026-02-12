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
    const [slots, setSlots] = useState([]);

    // Forms
    const [novoAgendamento, setNovoAgendamento] = useState({ nome: '', servicoId: '', profissionalId: '', data: '', hora: '' });
    const [novoMembro, setNovoMembro] = useState({ nome: '', email: '', senha: '', role: 'profissional' });
    const [svcForm, setSvcForm] = useState({ nome: '', descricao: '', preco: '', duracao_minutos: '' });
    const [editId, setEditId] = useState(null);

    const loadData = useCallback(async () => {
        try {
            const rotaAgenda = usuario.role === 'dono' ? '/agendamentos/empresa' : '/agendamentos/meus';
            const [resAgenda, resServicos] = await Promise.all([api.get(rotaAgenda), api.get('/servicos')]);
            setAgenda(resAgenda.data);
            setServicos(resServicos.data);

            if (usuario.role === 'dono') {
                const [resEquipe, resHorarios] = await Promise.all([api.get('/equipe'), api.get('/config/horarios')]);
                setEquipe(resEquipe.data);
                if (resHorarios.data.length === 0) {
                    const padrao = Array.from({ length: 7 }, (_, i) => ({ dia_semana: i, abertura: '09:00', fechamento: '18:00', ativo: i !== 0 }));
                    setHorarios(padrao);
                } else setHorarios(resHorarios.data);
            } else {
                const resEquipe = await api.get('/equipe');
                setEquipe(resEquipe.data);
            }
        } catch (e) { console.error("Erro dados", e); }
    }, [usuario.role]);

    useEffect(() => { loadData(); }, [loadData]);

    useEffect(() => {
        const { data, servicoId, profissionalId } = novoAgendamento;
        if (data && servicoId && profissionalId) {
            api.get(`/disponibilidade?data=${data}&servicoId=${servicoId}&profissionalId=${profissionalId}`)
                .then(res => setSlots(res.data))
                .catch(() => setSlots([]));
        } else setSlots([]);
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
            alert("✅ Agendado!");
            setNovoAgendamento({ nome: '', servicoId: '', profissionalId: '', data: '', hora: '' });
            loadData();
        } catch (e) { alert("Erro ao agendar"); }
    };

    const addMembro = async (e) => {
        e.preventDefault();
        try {
            await api.post('/equipe', novoMembro);
            alert("✅ Membro adicionado!");
            setNovoMembro({ nome: '', email: '', senha: '', role: 'profissional' });
            loadData();
        } catch (e) { alert("Erro: Email já existe ou dados inválidos."); }
    };

    const removeMembro = async (id) => {
        if (!window.confirm("Remover?")) return;
        try { await api.delete(`/equipe/${id}`); loadData(); } catch (e) { alert("Erro"); }
    };

    const salvarHorarios = async () => {
        try {
            const payload = horarios.map(h => ({ ...h, dia_semana: parseInt(h.dia_semana) }));
            await api.post('/config/horarios', payload);
            alert("✅ Horários salvos!");
        } catch (e) { alert("Erro"); }
    };

    const handleService = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...svcForm, preco: parseFloat(svcForm.preco), duracao_minutos: parseInt(svcForm.duracao_minutos) };
            if (editId) await api.put(`/servicos/${editId}`, payload);
            else await api.post('/servicos', payload);
            alert("✅ Serviço salvo!");
            setSvcForm({ nome: '', descricao: '', preco: '', duracao_minutos: '' }); setEditId(null); loadData();
        } catch (e) { alert("Erro ao salvar serviço."); }
    };

    const deleteService = async (id) => { if (window.confirm("Excluir?")) { await api.delete(`/servicos/${id}`); loadData(); } };

    return (
        <div className="container">
            <div className="tabs">
                <button className={`tab-btn ${aba === 'agenda' ? 'active' : ''}`} onClick={() => setAba('agenda')}>📅 Agenda</button>
                {usuario.role === 'dono' && (
                    <>
                        <button className={`tab-btn ${aba === 'servicos' ? 'active' : ''}`} onClick={() => setAba('servicos')}>✂️ Serviços</button>
                        <button className={`tab-btn ${aba === 'equipe' ? 'active' : ''}`} onClick={() => setAba('equipe')}>👥 Equipe</button>
                        <button className={`tab-btn ${aba === 'config' ? 'active' : ''}`} onClick={() => setAba('config')}>⚙️ Config</button>
                    </>
                )}
            </div>

            {aba === 'agenda' && (
                <>
                    <div className="card">
                        <h3>Novo Agendamento</h3>
                        <form onSubmit={handleAgendar} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                            {usuario.role === 'dono' && (
                                <div style={{ gridColumn: '1/-1' }}><input className="input-modern" placeholder="Nome Balcão (Opcional)" value={novoAgendamento.nome} onChange={e => setNovoAgendamento({ ...novoAgendamento, nome: e.target.value })} /></div>
                            )}
                            <div><label>Serviço</label><select className="input-modern" value={novoAgendamento.servicoId} onChange={e => setNovoAgendamento({ ...novoAgendamento, servicoId: e.target.value })} required><option value="">Selecione...</option>{servicos.map(s => <option key={s.id} value={s.id}>{s.nome} ({s.duracao_minutos}min)</option>)}</select></div>
                            <div><label>Profissional</label><select className="input-modern" value={novoAgendamento.profissionalId} onChange={e => setNovoAgendamento({ ...novoAgendamento, profissionalId: e.target.value })} required><option value="">Selecione...</option>{equipe.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
                            <div><label>Data</label><input type="date" className="input-modern" value={novoAgendamento.data} min={moment().format('YYYY-MM-DD')} onChange={e => setNovoAgendamento({ ...novoAgendamento, data: e.target.value })} required /></div>
                            <div><label>Horário</label><select className="input-modern" value={novoAgendamento.hora} onChange={e => setNovoAgendamento({ ...novoAgendamento, hora: e.target.value })} required disabled={!slots.length}><option value="">{slots.length ? 'Escolha...' : 'Indisponível'}</option>{slots.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                            <button type="submit" className="btn btn-primary" style={{ gridColumn: '1/-1' }} disabled={!novoAgendamento.hora}>Confirmar</button>
                        </form>
                    </div>
                    <h3>Próximos</h3>
                    <div className="card" style={{ padding: 0 }}>{agenda.map(a => (<div key={a.id} className="list-item"><div><strong>{moment(a.data_hora_inicio).format('HH:mm')}</strong> - {a.Servico?.nome}<div>{moment(a.data_hora_inicio).format('DD/MM')} • {a.Cliente ? a.Cliente.nome : a.nome_cliente_avulso}</div></div><span style={{ color: '#27ae60' }}>Confirmado</span></div>))}</div>
                </>
            )}

            {aba === 'equipe' && (
                <>
                    <div className="card">
                        <h3>Novo Membro</h3>
                        <form onSubmit={addMembro} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <input className="input-modern" placeholder="Nome" value={novoMembro.nome} onChange={e => setNovoMembro({ ...novoMembro, nome: e.target.value })} style={{ flex: 1 }} required />
                            <input className="input-modern" placeholder="Email" value={novoMembro.email} onChange={e => setNovoMembro({ ...novoMembro, email: e.target.value })} style={{ flex: 1 }} required />
                            <input className="input-modern" placeholder="Senha" type="password" value={novoMembro.senha} onChange={e => setNovoMembro({ ...novoMembro, senha: e.target.value })} style={{ flex: 1 }} required />
                            <select className="input-modern" value={novoMembro.role} onChange={e => setNovoMembro({ ...novoMembro, role: e.target.value })} style={{ width: 150 }}><option value="profissional">Profissional</option><option value="dono">Admin</option></select>
                            <button type="submit" className="btn btn-primary">Adicionar</button>
                        </form>
                    </div>
                    <div className="card">{equipe.map(m => (<div key={m.id} className="list-item"><div><strong>{m.nome}</strong> ({m.role})<br />{m.email}</div>{m.id !== usuario.id && <button onClick={() => removeMembro(m.id)} className="btn btn-danger btn-icon">🗑️</button>}</div>))}</div>
                </>
            )}

            {aba === 'servicos' && (
                <>
                    <div className="card">
                        <h3>{editId ? 'Editar' : 'Novo'} Serviço</h3>
                        <form onSubmit={handleService} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                            <input className="input-modern" placeholder="Nome" value={svcForm.nome} onChange={e => setSvcForm({ ...svcForm, nome: e.target.value })} style={{ gridColumn: '1/-1' }} required />
                            <input className="input-modern" placeholder="Descrição" value={svcForm.descricao} onChange={e => setSvcForm({ ...svcForm, descricao: e.target.value })} style={{ gridColumn: '1/-1' }} />
                            <input className="input-modern" type="number" placeholder="Preço" value={svcForm.preco} onChange={e => setSvcForm({ ...svcForm, preco: e.target.value })} required />
                            <input className="input-modern" type="number" placeholder="Minutos" value={svcForm.duracao_minutos} onChange={e => setSvcForm({ ...svcForm, duracao_minutos: e.target.value })} required />
                            <button type="submit" className="btn btn-primary" style={{ gridColumn: '1/-1' }}>Salvar</button>
                        </form>
                    </div>
                    <div className="card">{servicos.map(s => (<div key={s.id} className="list-item"><div><strong>{s.nome}</strong><br />R${s.preco} - {s.duracao_minutos}min</div><div><button onClick={() => { setEditId(s.id); setSvcForm(s) }} className="btn btn-icon">✏️</button><button onClick={() => deleteService(s.id)} className="btn btn-danger btn-icon">🗑️</button></div></div>))}</div>
                </>
            )}

            {aba === 'config' && (
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}><h3>Horários</h3><button onClick={salvarHorarios} className="btn btn-primary">Salvar</button></div>
                    {horarios.map((h, i) => (<div key={h.dia_semana} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #eee' }}><div style={{ width: 100, fontWeight: 'bold' }}>{moment().day(h.dia_semana).format('dddd')}</div><input type="checkbox" checked={h.ativo} onChange={e => { const n = [...horarios]; n[i].ativo = e.target.checked; setHorarios(n) }} />{h.ativo ? <><input className="input-modern" type="time" style={{ width: 100 }} value={h.abertura} onChange={e => { const n = [...horarios]; n[i].abertura = e.target.value; setHorarios(n) }} /> até <input className="input-modern" type="time" style={{ width: 100 }} value={h.fechamento} onChange={e => { const n = [...horarios]; n[i].fechamento = e.target.value; setHorarios(n) }} /></> : <span style={{ color: '#999' }}>Fechado</span>}</div>))}
                </div>
            )}
        </div>
    );
};
export default Dashboard;