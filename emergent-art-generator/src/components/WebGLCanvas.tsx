'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useWebGL } from '@/hooks/useWebGL';
import { useGAN } from '@/hooks/useGAN';
import * as tf from '@tensorflow/tfjs';

const GAN_RESOLUTION = 64; // Use a fixed, small resolution for the GAN

// --- WebGL Helper Functions ---
const compileShader = (gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null => {
  const shader = gl.createShader(type);
  if (!shader) {
    console.error("Failed to create shader");
    return null;
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
};
const createProgram = (gl: WebGL2RenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null => {
  const program = gl.createProgram();
  if (!program) {
    console.error("Failed to create program");
    return null;
  }
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
};
const createTexture = (gl: WebGL2RenderingContext, width: number, height: number, data: ArrayBufferView | null): WebGLTexture | null => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
};


interface WebGLCanvasProps {
  width: number;
  height: number;
}

const WebGLCanvas: React.FC<WebGLCanvasProps> = ({ width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gl = useWebGL(canvasRef);
  const { generate, train, modelsLoaded } = useGAN(GAN_RESOLUTION);
  const [glResources, setGlResources] = useState<any>(null);
  const [blendFactor, setBlendFactor] = useState(0.2);

  // 1. Fetch shaders and initialize WebGL resources
  useEffect(() => {
    if (gl && width > 0 && height > 0) {
      const init = async () => {
        const [caVert, caFrag, blendFrag] = await Promise.all([
          fetch('/glsl/ca.vert').then(res => res.text()),
          fetch('/glsl/ca.frag').then(res => res.text()),
          fetch('/glsl/blend.frag').then(res => res.text())
        ]);

        const renderVert = `#version 300 es
          in vec2 a_position; out vec2 v_texCoord;
          void main() { v_texCoord = a_position * 0.5 + 0.5; gl_Position = vec4(a_position, 0.0, 1.0); }`;

        const caProgram = createProgram(gl, compileShader(gl, gl.VERTEX_SHADER, caVert)!, compileShader(gl, gl.FRAGMENT_SHADER, caFrag)!);
        const renderProgram = createProgram(gl, compileShader(gl, gl.VERTEX_SHADER, renderVert)!, compileShader(gl, gl.FRAGMENT_SHADER, blendFrag)!);

        if (!caProgram || !renderProgram) return;

        const quadVertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

        const initialData = new Uint8Array(width * height * 4);
        for (let i = 0; i < initialData.length; i += 4) {
          const state = Math.random() > 0.5 ? 255 : 0;
          initialData.fill(state, i, i + 3);
          initialData[i + 3] = 255;
        }

        const tex1 = createTexture(gl, width, height, initialData);
        const tex2 = createTexture(gl, width, height, null);
        const ganTexture = createTexture(gl, GAN_RESOLUTION, GAN_RESOLUTION, null);

        const fb1 = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb1);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex1, 0);

        const fb2 = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb2);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex2, 0);

        setGlResources({
          caProgram, renderProgram, quadVertexBuffer,
          front: { tex: tex1, fb: fb1 },
          back: { tex: tex2, fb: fb2 },
          ganTexture
        });
      };
      init();
    }
  }, [gl, width, height]);

  // 2. Main Render Loop
  useEffect(() => {
    if (gl && glResources) {
      let animationFrameId: number;
      const render = () => {
        // --- 1. Update CA State ---
        gl.useProgram(glResources.caProgram);
        gl.bindFramebuffer(gl.FRAMEBUFFER, glResources.back.fb);
        gl.viewport(0, 0, width, height);

        const posAttrib = gl.getAttribLocation(glResources.caProgram, 'a_position');
        gl.enableVertexAttribArray(posAttrib);
        gl.bindBuffer(gl.ARRAY_BUFFER, glResources.quadVertexBuffer);
        gl.vertexAttribPointer(posAttrib, 2, gl.FLOAT, false, 0, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, glResources.front.tex);
        gl.uniform1i(gl.getUniformLocation(glResources.caProgram, 'u_prevState'), 0);
        gl.uniform2f(gl.getUniformLocation(glResources.caProgram, 'u_resolution'), width, height);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // --- 2. Generate GAN image and update texture ---
        if (modelsLoaded) {
            tf.tidy(() => {
                const generatedTensor = generate(1);
                if (generatedTensor) {
                    const reshaped = generatedTensor.reshape([GAN_RESOLUTION, GAN_RESOLUTION, 1]);
                    const normalizedTensor = reshaped.mul(127.5).add(127.5).asType('int32');
                    const repeatedTensor = normalizedTensor.tile([1, 1, 4]); // Repeat R channel to RGBA

                    repeatedTensor.data().then(data => {
                        gl.bindTexture(gl.TEXTURE_2D, glResources.ganTexture);
                        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, GAN_RESOLUTION, GAN_RESOLUTION, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(data));
                    });
                }
            });
        }

        // --- 3. Render to Canvas (Blending) ---
        gl.useProgram(glResources.renderProgram);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        const renderPosAttrib = gl.getAttribLocation(glResources.renderProgram, 'a_position');
        gl.enableVertexAttribArray(renderPosAttrib);
        gl.bindBuffer(gl.ARRAY_BUFFER, glResources.quadVertexBuffer);
        gl.vertexAttribPointer(renderPosAttrib, 2, gl.FLOAT, false, 0, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, glResources.back.tex);
        gl.uniform1i(gl.getUniformLocation(glResources.renderProgram, 'u_caTexture'), 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, glResources.ganTexture);
        gl.uniform1i(gl.getUniformLocation(glResources.renderProgram, 'u_ganTexture'), 1);

        gl.uniform1f(gl.getUniformLocation(glResources.renderProgram, 'u_blendFactor'), blendFactor);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // --- 4. Swap Buffers ---
        let temp = glResources.front;
        glResources.front = glResources.back;
        glResources.back = temp;

        animationFrameId = requestAnimationFrame(render);
      };
      render();
      return () => cancelAnimationFrame(animationFrameId);
    }
  }, [gl, glResources, modelsLoaded, generate, width, height, blendFactor]);

  // 3. Periodic GAN Training
  useEffect(() => {
      if (gl && modelsLoaded && glResources && canvasRef.current) {
          const intervalId = setInterval(() => {
              console.log("Training GAN...");
              tf.tidy(() => {
                  const realImages = tf.browser.fromPixels(canvasRef.current!)
                    .resizeBilinear([GAN_RESOLUTION, GAN_RESOLUTION])
                    .mean(2)
                    .toFloat()
                    .div(127.5).sub(1)
                    .expandDims(0)
                    .expandDims(-1);

                  train(realImages);
              });
          }, 5000);

          return () => clearInterval(intervalId);
      }
  }, [gl, modelsLoaded, glResources, train]);

  return (
    <div>
        <canvas ref={canvasRef} width={width} height={height} />
        <div style={{ position: 'absolute', bottom: '20px', left: '20px', color: 'white', backgroundColor: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '5px' }}>
            <label htmlFor="blend">Blend Factor: {blendFactor.toFixed(2)}</label>
            <input
                type="range"
                id="blend"
                min="0"
                max="1"
                step="0.01"
                value={blendFactor}
                onChange={(e) => setBlendFactor(parseFloat(e.target.value))}
            />
        </div>
    </div>
  );
};

export default WebGLCanvas;
