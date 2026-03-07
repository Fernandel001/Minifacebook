import Navbar from './Navbar';

export default function Layout({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <main className="layout-main">
        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
}