import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const LandingPage = () => {
    const [empresas, setEmpresas] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/empresas')
            .then(res => setEmpresas(res.data))
            .catch(err => console.error("Erro ao carregar:", err))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: '#fff', fontFamily: 'Nunito, sans-serif', padding: '40px 20px' }}>
            <header style={{ textAlign: 'center', marginBottom: 60 }}>
                <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: 10, background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Piscou, Marcou.</h1>
                <p style={{ color: '#94a3b8', fontSize: '1.2rem' }}>Seu agendamento simplificado.</p>
            </header>

            {loading ? (
                <div style={{ textAlign: 'center', color: '#64748b' }}>Carregando parceiros...</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 30, maxWidth: 1200, margin: '0 auto' }}>
                    {empresas.map(emp => (
                        <Link to={`/${emp.slug}`} key={emp.id} style={{ textDecoration: 'none' }}>
                            <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 30, textAlign: 'center', transition: '0.3s' }}
                                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                {emp.logo_url ?
                                    <img src={emp.logo_url} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', marginBottom: 20 }} /> :
                                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: emp.cor_primaria, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 24, color: '#fff' }}>{emp.nome.charAt(0)}</div>
                                }
                                <h3 style={{ color: '#fff', margin: '0 0 10px 0' }}>{emp.nome}</h3>
                                <span style={{ color: '#3b82f6', fontWeight: 600, fontSize: '0.9rem' }}>Agendar Agora &rarr;</span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LandingPage;