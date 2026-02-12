import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const LandingPage = () => {
    const [empresas, setEmpresas] = useState([]);

    useEffect(() => {
        api.get('/empresas')
            .then(res => setEmpresas(res.data))
            .catch(() => console.log('Erro ao carregar empresas'));
    }, []);

    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <header style={{ padding: '80px 20px', textAlign: 'center' }}>
                <h1 style={{ fontSize: '3.5rem', marginBottom: '16px', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.03em' }}>Marcou.</h1>
                <p style={{ fontSize: '1.2rem', color: '#94a3b8', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
                    A plataforma definitiva para agendamento de serviços de beleza e bem-estar. Simples, elegante, profissional.
                </p>
            </header>

            <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '30px' }}>
                    {empresas.map(emp => (
                        <Link to={`/${emp.slug}`} key={emp.id} style={{ textDecoration: 'none' }}>
                            <div style={{
                                background: 'rgba(30, 41, 59, 0.5)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: '24px',
                                padding: '32px',
                                border: '1px solid rgba(255,255,255,0.05)',
                                textAlign: 'center',
                                transition: 'all 0.3s',
                                height: '100%'
                            }}
                                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = emp.cor_primaria; }}
                                onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}>

                                <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: emp.cor_primaria, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 'bold', color: '#fff', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
                                    {emp.nome.charAt(0)}
                                </div>
                                <h3 style={{ color: '#fff', margin: '0 0 8px 0', fontSize: '1.4rem' }}>{emp.nome}</h3>
                                <div style={{ color: '#2563eb', fontSize: '0.95rem', fontWeight: '600', marginTop: 15, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                    Agendar Horário &rarr;
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LandingPage;