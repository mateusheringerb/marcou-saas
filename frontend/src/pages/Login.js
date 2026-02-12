import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import api from '../services/api';

const Login = ({ empresa, aoLogar }) => {
    const { slug } = useParams();
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [manter, setManter] = useState(false);

    const finish = (dados) => {
        if (manter) localStorage.setItem('marcou_token', dados.token);
        else sessionStorage.setItem('marcou_token', dados.token);
        aoLogar(dados.usuario);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/login', { email, senha });
            finish(res.data);
        } catch (error) { alert("Login falhou."); }
    };

    const googleSuccess = async (cred) => {
        try {
            const res = await api.post('/login/google', { token: cred.credential, slug });
            finish(res.data);
        } catch (error) { alert("Google Auth falhou."); }
    };

    return (
        <div className="card" style={{ maxWidth: 400, margin: '20px auto' }}>
            <h2 style={{ textAlign: 'center', color: empresa.cor_primaria }}>Entrar</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                <input className="input-modern" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                <input className="input-modern" type="password" placeholder="Senha" value={senha} onChange={e => setSenha(e.target.value)} required />
                <label style={{ fontSize: 14 }}><input type="checkbox" checked={manter} onChange={e => setManter(e.target.checked)} /> Manter conectado</label>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: empresa.cor_primaria }}>ENTRAR</button>
            </form>
            <div style={{ margin: '20px 0', textAlign: 'center', fontSize: 12, color: '#999' }}>OU ENTRE COM</div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <GoogleLogin onSuccess={googleSuccess} onError={() => console.log('Erro Google')} useOneTap />
            </div>
            <div style={{ marginTop: 20, textAlign: 'center', fontSize: 14 }}>
                <Link to={`/${slug}/cadastro`} style={{ color: empresa.cor_primaria }}>Criar conta grátis</Link>
            </div>
        </div>
    );
};
export default Login;