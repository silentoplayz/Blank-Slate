import { useEffect, useState } from 'react';

export const useWebGL = (canvasRef: React.RefObject<HTMLCanvasElement>) => {
  const [gl, setGl] = useState<WebGL2RenderingContext | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const webglContext = canvasRef.current.getContext('webgl2');
      if (webglContext) {
        setGl(webglContext);
      } else {
        console.error("WebGL2 not supported");
        alert("Your browser does not support WebGL2. Please use a modern browser.");
      }
    }
  }, [canvasRef]);

  return gl;
};
