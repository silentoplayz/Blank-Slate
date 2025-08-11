'use client';

import WebGLCanvas from "@/components/WebGLCanvas";
import { useEffect, useState } from "react";

export default function Home() {
  const [size, setSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const resize = () => {
      // Make it slightly smaller than the window to avoid scrollbars
      setSize({ width: window.innerWidth - 20, height: window.innerHeight - 20 });
    };
    window.addEventListener('resize', resize);
    resize(); // Call once to set initial size
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-900">
      <h1 className="text-3xl font-bold text-white mb-4">Emergent Art Generator</h1>
      <div className="border-2 border-gray-600">
        <WebGLCanvas width={size.width} height={size.height} />
      </div>
    </main>
  );
}
