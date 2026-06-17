"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, MeshDistortMaterial } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

/**
 * Premium Siri-style audio-reactive blob.
 * R3F + drei MeshDistortMaterial. Cyan gradient sheen via colored lights.
 * Driven by a shared mutable `levelRef` (0..1) read inside useFrame —
 * no React re-renders.
 */
function Blob({ levelRef }: { levelRef: React.MutableRefObject<number> }) {
  const matRef = useRef<any>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const smooth = useRef(0);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const target = levelRef.current || 0;
    smooth.current += (target - smooth.current) * 0.1;
    const lvl = smooth.current;

    if (matRef.current) {
      matRef.current.distort = 0.28 + lvl * 0.55;
      matRef.current.speed = 1.4 + lvl * 3.5;
    }
    if (meshRef.current) {
      const s = 1 + lvl * 0.28 + Math.sin(t * 1.2) * 0.02;
      meshRef.current.scale.setScalar(s);
      meshRef.current.rotation.y = t * 0.16;
      meshRef.current.rotation.z = t * 0.07;
    }
    if (haloRef.current) {
      haloRef.current.scale.setScalar(1.35 + lvl * 0.55);
      (haloRef.current.material as THREE.Material & { opacity: number }).opacity =
        0.12 + lvl * 0.28;
    }
  });

  return (
    <group>
      {/* Additive glow halo */}
      <Sphere ref={haloRef} args={[1, 32, 32]}>
        <meshBasicMaterial
          color="#22d3ee"
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </Sphere>

      {/* Main liquid blob */}
      <Sphere ref={meshRef} args={[1, 128, 128]}>
        <MeshDistortMaterial
          ref={matRef}
          color="#06b6d4"
          emissive="#0e7490"
          emissiveIntensity={0.45}
          roughness={0.12}
          metalness={0.9}
          distort={0.3}
          speed={2}
        />
      </Sphere>
    </group>
  );
}

export default function VoiceOrb({
  levelRef,
}: {
  levelRef: React.MutableRefObject<number>;
}) {
  return (
    <div className="w-full h-full relative">
      {/* Soft ambient bloom behind the canvas */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[460px] h-[460px] max-w-[80vw] max-h-[80vw] rounded-full bg-cyan-500/20 blur-[130px]" />
      </div>

      <Canvas
        camera={{ position: [0, 0, 4], fov: 45 }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[3, 3, 3]} intensity={3} color="#22d3ee" />
        <pointLight position={[-3, -2, 2]} intensity={2.6} color="#3b82f6" />
        <pointLight position={[0, 3, -3]} intensity={2.2} color="#2dd4bf" />
        <Blob levelRef={levelRef} />
      </Canvas>
    </div>
  );
}
