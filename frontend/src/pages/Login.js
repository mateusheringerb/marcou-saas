import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import api from '../services/api';

const Login = ({ empresa, aoLogar }) => {
    const { slug } = useParams();
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/login', { email, senha });
            localStorage.setItem('marcou_token', res.data.token);
            aoLogar(res.data.usuario);
        } catch (error) { alert("Dados incorretos."); }
    };

    const googleSuccess = async (cred) => {
        try {
            const res = await api.post('/login/google', { token: cred.credential, slug });
            localStorage.setItem('marcou_token', res.data.token);
            aoLogar(res.data.usuario);
        } catch (error) { alert("Erro Google."); }
    };

    return (
        <div className="login-wrap">
            <div className="login-box">
                <div style={{ textAlign: 'center', marginBottom: 30 }}>
                    {empresa.logo_url ? (
                        <img src={empresa.logo_url} alt="Logo" style={{ height: 60, marginBottom: 15, borderRadius: 8, objectFit: 'contain' }} />
                    ) : (
                        <h1 style={{ color: empresa.cor_primaria, fontSize: '1.8rem', margin: 0 }}>{empresa.nome}</h1>
                    )}
                    <p style={{ color: '#64748b' }}>Agende seu horário.</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div>
                        <label className="label">E-mail</label>
                        <input className="input" type="email" placeholder="exemplo@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div>
                        <label className="label">Senha</label>
                        <input className="input" type="password" placeholder="••••••" value={senha} onChange={e => setSenha(e.target.value)} required />
                    </div>

                    <div style={{ textAlign: 'right', marginBottom: 20 }}>
                        <span style={{ fontSize: '0.85rem', color: '#64748b', cursor: 'pointer' }}>Esqueci minha senha</span>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', background: empresa.cor_primaria }}>Entrar</button>
                </form>

                <div style={{ display: 'flex', alignItems: 'center', margin: '25px 0' }}>
                    <div style={{ flex: 1, height: 1, background: '#e5e7eb' }}></div>
                    <span style={{ padding: '0 10px', color: '#9ca3af', fontSize: '0.8rem' }}>OU</span>
                    <div style={{ flex: 1, height: 1, background: '#e5e7eb' }}></div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <GoogleLogin onSuccess={googleSuccess} onError={() => console.log('Erro')} useOneTap shape="pill" />
                </div>

                <div style={{ textAlign: 'center', marginTop: 30, fontSize: '0.9rem' }}>
                    Novo por aqui? <Link to={`/${slug}/cadastro`} style={{ color: empresa.cor_primaria, fontWeight: '700', textDecoration: 'none' }}>Criar Conta</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;