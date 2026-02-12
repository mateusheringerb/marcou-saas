import React from 'react';
const Footer = () => (
    <footer style={{ textAlign: 'center', padding: '30px', background: '#fff', borderTop: '1px solid #eee', fontSize: '13px', color: '#888' }}>
        <p style={{ margin: 0 }}>&copy; {new Date().getFullYear()} Marcou. All rights reserved.</p>
    </footer>
);
export default Footer;