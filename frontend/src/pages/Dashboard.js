import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import moment from 'moment';

const Dashboard = ({ usuario, empresa }) => {
    const [aba, setAba] = useState('agenda');
    const [agenda, setAgenda] = useState([]);
    const [servicos, setServicos] = useState([]);

    // Forms
    const [manual, setManual] = useState({ nome: '', servicoId: '', data: '', hora: '' });
    const [svcForm, setSvcForm] = useState({ nome: '', descricao: '', preco: '', duracao_minutos: '' });
    const [editId, setEditId] = useState(null);

    const loadData = useCallback(async () => {
        try {
            const rotaAgenda = usuario.role === 'dono' ? '/agendamentos/empresa' : '/agendamentos/meus';
            const res1 = await api.get(rotaAgenda);
            setAgenda(res1.data);
            const res2 = await api.get('/servicos');
            setServicos(res2.data);
        } catch (e) { console.error(e); }
    }, [usuario.role]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleManual = async (e) => {
        e.preventDefault();
        try {
            const inicio = moment(`${manual.data} ${manual.hora}`).format();
            await api.post('/agendar', { servicoId: manual.servicoId, profissionalId: usuario.id, dataHoraInicio: inicio, nomeClienteAvulso: manual.nome });
            alert("Agendado!"); setManual({ nome: '', servicoId: '', data: '', hora: '' }); loadData();
        } catch (e) { alert("Erro ao agendar"); }
    };

    const handleService = async (e) => {
        e.preventDefault();
        try {
            if (editId) await api.put(`/servicos/${editId}`, svcForm);
            else await api.post('/servicos', svcForm);
            alert("Salvo!"); setSvcForm({ nome: '', descricao: '', preco: '', duracao_minutos: '' }); setEditId(null); loadData();
        } catch (e) { alert("Erro ao salvar"); }
    };

    const deleteService = async (id) => {
        if (window.confirm("Excluir?")) {
            await api.delete(`/servicos/${id}`);
            loadData();
        }
    };

    return (
        <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <button onClick={() => setAba('agenda')} style={{ flex: 1, padding: 10, background: aba === 'agenda' ? empresa.cor_primaria : '#ddd', color: aba === 'agenda' ? '#fff' : '#000', border: 'none', borderRadius: 5 }}>Agenda</button>
                {usuario.role === 'dono' && <button onClick={() => setAba('servicos')} style={{ flex: 1, padding: 10, background: aba === 'servicos' ? empresa.cor_primaria : '#ddd', color: aba === 'servicos' ? '#fff' : '#000', border: 'none', borderRadius: 5 }}>Serviços</button>}
            </div>

            {aba === 'agenda' && (
                <div>
                    {usuario.role === 'dono' && (
                        <div style={{ background: '#eee', padding: 15, borderRadius: 8, marginBottom: 20 }}>
                            <h4>Agendar Manualmente</h4>
                            <form onSubmit={handleManual} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <input placeholder="Nome Cliente" value={manual.nome} onChange={e => setManual({ ...manual, nome: e.target.value })} style={{ gridColumn: 'span 2', padding: 8 }} />
                                <select value={manual.servicoId} onChange={e => setManual({ ...manual, servicoId: e.target.value })} style={{ gridColumn: 'span 2', padding: 8 }}>
                                    <option value="">Selecione Serviço...</option>
                                    {servicos.map(s => <option key={s.id} value={s.id}>{s.nome} - R${s.preco}</option>)}
                                </select>
                                <input type="date" value={manual.data} onChange={e => setManual({ ...manual, data: e.target.value })} style={{ padding: 8 }} />
                                <input type="time" value={manual.hora} onChange={e => setManual({ ...manual, hora: e.target.value })} style={{ padding: 8 }} />
                                <button type="submit" style={{ gridColumn: 'span 2', padding: 10, background: '#007bff', color: '#fff', border: 'none', borderRadius: 5 }}>Confirmar</button>
                            </form>
                        </div>
                    )}
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {agenda.map(a => (
                            <li key={a.id} style={{ background: '#fff', padding: 15, marginBottom: 10, borderRadius: 8, borderLeft: `5px solid ${empresa.cor_primaria}` }}>
                                <strong>{moment(a.data_hora_inicio).format('DD/MM HH:mm')}</strong> - {a.Servico?.nome}
                                <div style={{ color: '#666' }}>👤 {a.Cliente ? a.Cliente.nome : `${a.nome_cliente_avulso} (Manual)`}</div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {aba === 'servicos' && usuario.role === 'dono' && (
                <div>
                    <div style={{ background: '#eee', padding: 15, borderRadius: 8, marginBottom: 20 }}>
                        <h4>{editId ? 'Editar' : 'Novo'} Serviço</h4>
                        <form onSubmit={handleService} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <input placeholder="Nome" value={svcForm.nome} onChange={e => setSvcForm({ ...svcForm, nome: e.target.value })} style={{ padding: 8 }} />
                            <input placeholder="Descrição" value={svcForm.descricao} onChange={e => setSvcForm({ ...svcForm, descricao: e.target.value })} style={{ padding: 8 }} />
                            <div style={{ display: 'flex', gap: 10 }}>
                                <input placeholder="Preço" type="number" value={svcForm.preco} onChange={e => setSvcForm({ ...svcForm, preco: e.target.value })} style={{ padding: 8, flex: 1 }} />
                                <input placeholder="Minutos" type="number" value={svcForm.duracao_minutos} onChange={e => setSvcForm({ ...svcForm, duracao_minutos: e.target.value })} style={{ padding: 8, flex: 1 }} />
                            </div>
                            <button type="submit" style={{ padding: 10, background: '#28a745', color: '#fff', border: 'none', borderRadius: 5 }}>Salvar</button>
                            {editId && <button type="button" onClick={() => { setEditId(null); setSvcForm({ nome: '', descricao: '', preco: '', duracao_minutos: '' }) }} style={{ padding: 10 }}>Cancelar</button>}
                        </form>
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {servicos.map(s => (
                            <li key={s.id} style={{ background: '#fff', padding: 15, marginBottom: 10, borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <b>{s.nome}</b><br /><small>{s.descricao}</small><br />R${s.preco} - {s.duracao_minutos}min
                                </div>
                                <div>
                                    <button onClick={() => { setEditId(s.id); setSvcForm(s) }} style={{ marginRight: 5 }}>✏️</button>
                                    <button onClick={() => deleteService(s.id)}>🗑️</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};
export default Dashboard;