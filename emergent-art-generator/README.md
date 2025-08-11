# Emergent Art Generator

This project is an experiment in combining cellular automata and generative adversarial networks (GANs) to create evolving, abstract visual patterns directly in the browser. It uses WebGL for GPU-accelerated graphics and TensorFlow.js for in-browser machine learning.

## Prerequisites

*   **Node.js**: Version 18.x or later is recommended. You can download it from [nodejs.org](https://nodejs.org/).
*   **npm**: This is the Node.js package manager and is included with the Node.js installation.
*   **A modern web browser**: Google Chrome, Mozilla Firefox, or Microsoft Edge with support for **WebGL2**.

## Installation

1.  Clone this repository to your local machine.

2.  Navigate into the project directory:
    ```bash
    cd emergent-art-generator
    ```

3.  Install the necessary dependencies:
    ```bash
    npm install
    ```

## Running the Application

1.  Start the Next.js development server:
    ```bash
    npm run dev
    ```

2.  Once the server is running (it will say `ready - started server on 0.0.0.0:3000`), open your browser and navigate to:
    ```
    http://localhost:3000
    ```

You should see the Emergent Art Generator in action. You can use the slider at the bottom of the page to control the blend between the cellular automaton's output and the GAN's generated art.

## Troubleshooting

*   **Blank Screen**: If you see a blank or black screen, please ensure that your browser supports WebGL2 and that it hasn't been disabled in your browser's settings. You can check your browser's WebGL2 status at [get.webgl.org/webgl2](https://get.webgl.org/webgl2/).
*   **Slow Performance**: The application's performance is highly dependent on the size of the canvas. If the animation is running slowly, try reducing the size of your browser window.
*   **Initial Load**: The application may take a few moments to start up, especially on the first load, as it initializes the GAN models with TensorFlow.js. Please be patient.
