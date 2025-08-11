#version 300 es
precision highp float;

uniform sampler2D u_caTexture;
uniform sampler2D u_ganTexture;
uniform float u_blendFactor; // 0.0 = only CA, 1.0 = only GAN

in vec2 v_texCoord;
out vec4 outColor;

void main() {
  vec4 caColor = texture(u_caTexture, v_texCoord);
  vec4 ganColor = texture(u_ganTexture, v_texCoord);

  // Simple linear interpolation
  outColor = mix(caColor, ganColor, u_blendFactor);
}
