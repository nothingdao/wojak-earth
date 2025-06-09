// components/SparkleParticles.tsx
import { useCallback } from "react";
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";

export default function SparkleParticles() {
  /** @param {any} engine */
  const particlesInit = useCallback(async (engine: any) => {
    await loadFull(engine); // uses the same engine context
  }, []);

  return (
    <Particles
      id="sparkles"
      init={particlesInit}
      className="absolute inset-0 z-0"
      options={{
        fullScreen: false,
        background: {
          color: "#333",
        },
        particles: {
          number: {
            value: 30,
            density: {
              enable: true,
              area: 800,
            },
          },
          color: {
            value: "#ffffff",
          },
          shape: {
            type: "circle",
          },
          opacity: {
            value: 0.8,
            random: true,
            anim: {
              enable: true,
              speed: 1,
              opacity_min: 0.3,
              sync: false,
            },
          },
          size: {
            value: 2,
            random: true,
          },
          move: {
            enable: true,
            speed: 0.3,
            direction: "top",
            straight: false,
            outMode: "out",
          },
        },
      }}
    />
  );
}
