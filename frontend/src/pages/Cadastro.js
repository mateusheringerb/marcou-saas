import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const Cadastro = ({ empresa, aoLogar }) => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [form, setForm] = useState({ nome: '', email: '', senha: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/cadastro', { ...form, slug });
            localStorage.setItem('marcou_token', res.data.token);
            aoLogar(res.data.usuario);
            navigate(`/${slug}`);
        } catch (error) { alert("Erro ao cadastrar."); }
    };

    return (
        <div style={{ padding: 25, maxWidth: 400, background: '#fff', borderRadius: 8, boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
            <h2 style={{ textAlign: 'center', color: empresa.cor_primaria }}>Criar Conta</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                <input placeholder="Nome" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required style={{ padding: 10 }} />
                <input placeholder="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required style={{ padding: 10 }} />
                <input placeholder="Senha" type="password" value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} required style={{ padding: 10 }} />
                <button type="submit" style={{ padding: 12, background: empresa.cor_primaria, color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer' }}>CADASTRAR</button>
            </form>
            <div style={{ marginTop: 20, textAlign: 'center', fontSize: 14 }}>
                <Link to={`/${slug}/login`}>Já tenho conta</Link>
            </div>
        </div>
    );
};
export default Cadastro;