import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const LandingPage = () => {
    const [empresas, setEmpresas] = useState([]);

    useEffect(() => {
        // Busca as empresas automaticamente
        api.get('/empresas')
            .then(res => setEmpresas(res.data))
            .catch(() => console.log('Erro ao carregar empresas'));
    }, []);

    return (
        <div style={{ minHeight: '100vh', background: '#000', color: '#fff', display: 'flex', flexDirection: 'column' }}>
            <header style={{ padding: '80px 20px', textAlign: 'center', background: 'linear-gradient(to bottom, #1a1a1a, #000)' }}>
                <h1 style={{ fontSize: '3rem', marginBottom: '10px', background: 'linear-gradient(90deg, #fff, #aaa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Piscou, Marcou.</h1>
                <p style={{ fontSize: '1.2rem', color: '#888', maxWidth: '600px', margin: '0 auto' }}>A plataforma premium para agendamento.</p>
            </header>

            <div className="container" style={{ flex: 1 }}>
                <h2 style={{ textAlign: 'center', marginBottom: '40px', color: '#c0a062' }}>Espaços Parceiros</h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                    {empresas.map(emp => (
                        <Link to={`/${emp.slug}`} key={emp.id} style={{ textDecoration: 'none' }}>
                            <div style={{ background: '#111', borderRadius: '12px', padding: '25px', border: '1px solid #333', textAlign: 'center', transition: 'all 0.3s', height: '100%' }}
                                onMouseOver={e => e.currentTarget.style.borderColor = emp.cor_primaria}
                                onMouseOut={e => e.currentTarget.style.borderColor = '#333'}>

                                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: emp.cor_primaria, margin: '0 auto 15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>
                                    {emp.nome.charAt(0)}
                                </div>
                                <h3 style={{ color: '#fff', margin: '0 0 10px 0', fontSize: '1.2rem' }}>{emp.nome}</h3>
                                <span style={{ color: '#c0a062', fontSize: '0.9rem' }}>Agendar Agora &rarr;</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
            <footer style={{ textAlign: 'center', padding: '40px', borderTop: '1px solid #222', color: '#444' }}>&copy; 2026 Marcou SaaS.</footer>
        </div>
    );
};

export default LandingPage;