import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import api from './services/api';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import Dashboard from './pages/Dashboard';
import Footer from './components/Footer';

const AmbienteEmpresa = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [empresa, setEmpresa] = useState(null);
    const [usuario, setUsuario] = useState(null);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        api.get(`/empresa/${slug}`)
            .then(res => { setEmpresa(res.data); setCarregando(false); })
            .catch(() => { alert("Empresa não encontrada"); setCarregando(false); });

        const token = localStorage.getItem('marcou_token') || sessionStorage.getItem('marcou_token');
        // Validar token com backend se necessário
    }, [slug]);

    if (carregando) return <div style={{ padding: 20 }}>Carregando...</div>;
    if (!empresa) return <div style={{ padding: 20 }}>404 - Não encontrado</div>;

    if (usuario) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                <header style={{ background: empresa.cor_primaria, padding: '15px 20px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 style={{ margin: 0, fontSize: 18 }}>{empresa.nome}</h1>
                    <button onClick={() => {
                        localStorage.removeItem('marcou_token');
                        sessionStorage.removeItem('marcou_token');
                        setUsuario(null);
                    }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '5px 10px', borderRadius: 4, cursor: 'pointer' }}>Sair</button>
                </header>
                <main style={{ flex: 1 }}>
                    <Dashboard usuario={usuario} empresa={empresa} />
                </main>
                <Footer />
            </div>
        );
    }

    const isCadastro = window.location.pathname.includes('/cadastro');

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <header style={{ background: empresa.cor_primaria, padding: 20, color: '#fff', textAlign: 'center' }}>
                <h1 style={{ margin: 0 }}>{empresa.nome}</h1>
            </header>
            <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                {isCadastro ? (
                    <Cadastro empresa={empresa} aoLogar={setUsuario} />
                ) : (
                    <Login empresa={empresa} aoLogar={setUsuario} />
                )}
            </main>
            <Footer />
        </div>
    );
};

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<h1 style={{ textAlign: 'center', marginTop: 50 }}>Landing Page Marcou</h1>} />
                <Route path="/:slug" element={<AmbienteEmpresa />} />
                <Route path="/:slug/login" element={<AmbienteEmpresa />} />
                <Route path="/:slug/cadastro" element={<AmbienteEmpresa />} />
            </Routes>
        </Router>
    );
}
export default App;