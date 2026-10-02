import * as THREE from 'three';

/**
 * Agua estilizada y barata: ondas por suma de senos (normal analítica),
 * fresnel hacia el color del cielo como pseudo-reflejo, brillo especular del
 * sol y espuma junto a los bordes. Un solo shader, sin texturas ni render a
 * textura (no sacrifica FPS en Chromebooks).
 */
export function createWaterMaterial(size: { x: number; z: number }): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: true,
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      time: { value: 0 },
      deep: { value: new THREE.Color(0x1f7fc4) },
      shallow: { value: new THREE.Color(0x56c6f0) },
      skyCol: { value: new THREE.Color(0xd7eeff) },
      sunDir: { value: new THREE.Vector3(-0.5, 1, 0.35).normalize() },
      halfSize: { value: new THREE.Vector2(size.x / 2, size.z / 2) },
    },
    vertexShader: `
      varying vec3 vWorld; varying vec2 vLocal;
      #include <fog_pars_vertex>
      void main(){
        vLocal = position.xz;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vec4 mvPosition = viewMatrix * w;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform float time; uniform vec3 deep; uniform vec3 shallow; uniform vec3 skyCol; uniform vec3 sunDir; uniform vec2 halfSize;
      varying vec3 vWorld; varying vec2 vLocal;
      #include <fog_pars_fragment>
      void main(){
        vec2 p = vWorld.xz;
        // Derivadas de la suma de ondas → normal.
        float dx = cos(p.x * 2.1 + time * 1.7) * 0.06 + cos((p.x + p.y) * 3.3 - time * 2.3) * 0.04;
        float dz = cos(p.y * 1.7 - time * 1.3) * 0.06 + cos((p.x + p.y) * 3.3 - time * 2.3) * 0.04;
        vec3 n = normalize(vec3(-dx, 1.0, -dz));
        vec3 v = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
        vec3 col = mix(deep, shallow, 0.5 + 0.5 * sin(p.x * 0.7 + p.y * 0.5 + time * 0.4));
        col = mix(col, skyCol, fres * 0.65);
        vec3 h = normalize(sunDir + v);
        col += vec3(1.0, 0.95, 0.85) * pow(max(dot(n, h), 0.0), 120.0) * 1.4;
        // Espuma en los bordes del estanque.
        vec2 edge = halfSize - abs(vLocal);
        float e = min(edge.x, edge.y);
        float foam = smoothstep(0.35, 0.0, e) * (0.6 + 0.4 * sin(time * 3.0 + (p.x + p.y) * 6.0));
        col = mix(col, vec3(1.0), clamp(foam, 0.0, 1.0) * 0.7);
        gl_FragColor = vec4(col, 0.86);
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
}
