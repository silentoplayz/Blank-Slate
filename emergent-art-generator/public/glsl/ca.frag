#version 300 es
// Fragment shader for Conway's Game of Life

precision highp float;

// The previous state of the automaton, passed in as a texture
uniform sampler2D u_prevState;
// The resolution of our canvas, to calculate texture coordinates
uniform vec2 u_resolution;

// The output of the shader
out vec4 outColor;

// Function to get the state of a neighbor cell
float getNeighbor(vec2 offset) {
    // gl_FragCoord.xy gives us the pixel coordinates.
    // We divide by resolution to get texture coordinates (0.0 to 1.0).
    // Then we add the offset and sample the texture.
    // .r extracts the red channel, where we store the state (0.0 or 1.0).
    return texture(u_prevState, (gl_FragCoord.xy + offset) / u_resolution).r;
}

void main() {
    // Get the state of the current cell
    float currentState = texture(u_prevState, gl_FragCoord.xy / u_resolution).r;

    // Count live neighbors
    float liveNeighbors = 0.0;
    liveNeighbors += getNeighbor(vec2(-1.0, -1.0));
    liveNeighbors += getNeighbor(vec2(-1.0,  0.0));
    liveNeighbors += getNeighbor(vec2(-1.0,  1.0));
    liveNeighbors += getNeighbor(vec2( 0.0, -1.0));
    liveNeighbors += getNeighbor(vec2( 0.0,  1.0));
    liveNeighbors += getNeighbor(vec2( 1.0, -1.0));
    liveNeighbors += getNeighbor(vec2( 1.0,  0.0));
    liveNeighbors += getNeighbor(vec2( 1.0,  1.0));

    // Apply Conway's Game of Life rules
    float newState = currentState;
    if (currentState > 0.5) { // If cell is alive
        if (liveNeighbors < 2.0 || liveNeighbors > 3.0) {
            newState = 0.0; // Dies
        }
    } else { // If cell is dead
        if (liveNeighbors == 3.0) {
            newState = 1.0; // Becomes alive
        }
    }

    // Output the new state as a color (black or white)
    outColor = vec4(vec3(newState), 1.0);
}
