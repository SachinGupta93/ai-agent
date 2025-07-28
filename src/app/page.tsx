import VoiceAgent from './components/VoiceAgent';
import MemoryDashboard from './components/MemoryDashboard';

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-white text-black">
      <VoiceAgent />
      <MemoryDashboard />
    </main>
  );
}
