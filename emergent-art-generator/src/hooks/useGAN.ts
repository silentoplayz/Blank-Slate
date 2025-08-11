import * as tf from '@tensorflow/tfjs';
import { useEffect, useState, useCallback } from 'react';

const LATENT_DIM = 100;

export const useGAN = (resolution: number) => {
  const [generator, setGenerator] = useState<tf.LayersModel | null>(null);
  const [discriminator, setDiscriminator] = useState<tf.LayersModel | null>(null);
  const [gan, setGan] = useState<tf.LayersModel | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  useEffect(() => {
    const createModels = async () => {
      if (modelsLoaded || !resolution) return;

      await tf.ready();
      tf.setBackend('webgl');
      console.log(`Using TensorFlow.js backend: ${tf.getBackend()}`);

      const adamOptimizer = tf.train.adam(0.0002, 0.5);

      // --- Define Discriminator ---
      const disc = tf.sequential({ name: 'discriminator' });
      disc.add(tf.layers.conv2d({
          inputShape: [resolution, resolution, 1],
          filters: 32,
          kernelSize: 5,
          strides: 2, // -> resolution/2
          padding: 'same'
      }));
      disc.add(tf.layers.leakyReLU());
      disc.add(tf.layers.dropout({ rate: 0.3 }));
      disc.add(tf.layers.conv2d({
          filters: 64,
          kernelSize: 5,
          strides: 2, // -> resolution/4
          padding: 'same'
      }));
      disc.add(tf.layers.leakyReLU());
      disc.add(tf.layers.dropout({ rate: 0.3 }));
      disc.add(tf.layers.flatten());
      disc.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
      disc.compile({ optimizer: adamOptimizer, loss: 'binaryCrossentropy', metrics: ['accuracy'] });
      setDiscriminator(disc);

      // --- Define Generator ---
      const gen = tf.sequential({ name: 'generator' });
      // We'll use Conv2DTranspose to upsample from a small latent space representation
      const startSize = Math.floor(resolution / 4);
      gen.add(tf.layers.dense({ inputShape: [LATENT_DIM], units: startSize * startSize * 128 }));
      gen.add(tf.layers.reshape({ targetShape: [startSize, startSize, 128] }));

      // Upsample to resolution/2
      gen.add(tf.layers.conv2dTranspose({
          filters: 64, kernelSize: 4, strides: 2, padding: 'same', activation: 'relu'
      }));
      // Upsample to resolution
      gen.add(tf.layers.conv2dTranspose({
          filters: 32, kernelSize: 4, strides: 2, padding: 'same', activation: 'relu'
      }));
      // Final layer to get to a single channel image
      gen.add(tf.layers.conv2d({
          filters: 1, kernelSize: 5, padding: 'same', activation: 'tanh'
      }));
      setGenerator(gen);

      // --- Define Combined GAN model ---
      const ganModel = tf.sequential({ name: 'gan' });
      disc.trainable = false;
      ganModel.add(gen);
      ganModel.add(disc);
      ganModel.compile({ optimizer: adamOptimizer, loss: 'binaryCrossentropy' });
      setGan(ganModel);

      setModelsLoaded(true);
      console.log(`GAN models created with internal resolution ${resolution}x${resolution}.`);
    }

    createModels();
  }, [resolution, modelsLoaded]); // Reruns if resolution changes

  const generate = useCallback((batchSize: number = 1): tf.Tensor | null => {
    if (generator) {
      return tf.tidy(() => {
        const noise = tf.randomNormal([batchSize, LATENT_DIM]);
        return generator.predict(noise) as tf.Tensor;
      });
    }
    return null;
  }, [generator]);

  const train = useCallback(async (realImages: tf.Tensor) => {
    if (discriminator && gan && modelsLoaded) {
      const batchSize = realImages.shape[0];

      const realLabels = tf.ones([batchSize, 1]);
      const fakeLabels = tf.zeros([batchSize, 1]);

      // Train Discriminator
      const fakeImages = tf.tidy(() => generate(batchSize) as tf.Tensor);
      if(!fakeImages) return;

      const dLossReal = await discriminator.trainOnBatch(realImages, realLabels);
      const dLossFake = await discriminator.trainOnBatch(fakeImages, fakeLabels);

      // Train Generator
      const noise = tf.randomNormal([batchSize, LATENT_DIM]);
      const gLoss = await gan.trainOnBatch(noise, realLabels);

      tf.dispose([fakeImages, realLabels, fakeLabels, noise]);

      const dLoss = (dLossReal[0] as number + dLossFake[0] as number) / 2;
      console.log(`dLoss: ${dLoss.toFixed(4)}, gLoss: ${(gLoss as number).toFixed(4)}`);
    }
  }, [discriminator, gan, modelsLoaded, generate]);

  return { generate, train, modelsLoaded };
};
