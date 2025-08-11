'use client';

import { useEffect, useState } from "react";
import dynamic from 'next/dynamic';

const WebGLCanvas = dynamic(
  () => import('@/components/WebGLCanvas'),
  {
    ssr: false,
    loading: () => <p className="text-white">Loading Canvas...</p>
  }
);

export default function Home() {
  const [size, setSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const resize = () => {
      setSize({ width: window.innerWidth - 20, height: window.innerHeight - 20 });
    };
    window.addEventListener('resize', resize);
    resize();
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-900">
      <h1 className="text-3xl font-bold text-white mb-4">Emergent Art Generator</h1>
      <div className="border-2 border-gray-600" style={{ width: size.width, height: size.height }}>
        <WebGLCanvas width={size.width} height={size.height} />
      </div>
    </main>
  );
}
