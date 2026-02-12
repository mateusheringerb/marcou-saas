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
        <div className="card" style={{ maxWidth: 400, margin: '20px auto' }}>
            <h2 style={{ textAlign: 'center', color: empresa.cor_primaria }}>Criar Conta</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                <input className="input-modern" placeholder="Nome" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required />
                <input className="input-modern" placeholder="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                <input className="input-modern" placeholder="Senha" type="password" value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} required />
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: empresa.cor_primaria }}>CADASTRAR</button>
            </form>
            <div style={{ marginTop: 20, textAlign: 'center', fontSize: 14 }}>
                <Link to={`/${slug}/login`}>Já tenho conta</Link>
            </div>
        </div>
    );
};
export default Cadastro;