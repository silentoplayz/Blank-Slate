#version 300 es
// Simple pass-through vertex shader

// Input vertex data, directly from a buffer
in vec2 a_position;

// We don't need to do anything with the vertices,
// just pass them through to the fragment shader.
void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
}
