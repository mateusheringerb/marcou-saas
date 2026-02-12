import React from 'react';
const Footer = () => (
    <footer style={{ textAlign: 'center', padding: '20px', background: '#fff', borderTop: '1px solid #ddd', fontSize: '12px', color: '#666' }}>
        <p style={{ margin: 0 }}>&copy; {new Date().getFullYear()} Marcou. Todos os direitos reservados.</p>
        <p style={{ margin: '5px 0 0 0' }}>Um produto <strong>Ágape Connect</strong></p>
    </footer>
);
export default Footer;