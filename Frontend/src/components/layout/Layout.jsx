import Navbar from './Navbar';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="pt-16 max-w-2xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}