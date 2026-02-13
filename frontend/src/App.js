import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import Dashboard from './pages/Dashboard';
import LandingPage from './pages/LandingPage';
import api from './services/api';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/:slug" element={<RotaEmpresa />} />
                <Route path="/:slug/cadastro" element={<RotaCadastro />} />
            </Routes>
        </BrowserRouter>
    );
}

const RotaEmpresa = () => {
    const [empresa, setEmpresa] = useState(null);
    const [usuario, setUsuario] = useState(null);
    const slug = window.location.pathname.split('/')[1];

    useEffect(() => {
        api.get(`/empresa/${slug}`).then(res => setEmpresa(res.data)).catch(() => { });
        const token = localStorage.getItem('marcou_token');
        if (token) {
            // Decodifica token ou busca perfil (simplificado aqui, idealmente busca /me)
            const payload = JSON.parse(atob(token.split('.')[1]));
            // Em produção real, chame api.get('/perfil') para dados frescos
            // Aqui usamos o payload para velocidade, mas o Dashboard atualiza depois
            setUsuario({ ...payload, nome: payload.nome || 'Usuário' });
        }
    }, [slug]);

    if (!empresa) return <div style={{ padding: 50, textAlign: 'center' }}>Carregando estabelecimento...</div>;

    const handleLogin = (user) => setUsuario(user);

    return usuario ? <Dashboard usuario={usuario} empresa={empresa} /> : <Login empresa={empresa} aoLogar={handleLogin} />;
};

const RotaCadastro = () => {
    const slug = window.location.pathname.split('/')[1];
    return <Cadastro slug={slug} />;
};

export default App;