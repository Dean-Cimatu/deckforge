import { Routes, Route } from 'react-router-dom';

function PlaceholderPage({ name }: { name: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper font-sans">
      <p className="text-ink-muted">{name}</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PlaceholderPage name="DeckForge" />} />
    </Routes>
  );
}
