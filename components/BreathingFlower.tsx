"use client";

import { useEffect, useRef, useState } from "react";
import { BreathingDot } from "./BreathingDot";

// A soft smoky orb with the Flower of Life whispering through it. The geometry
// is veiled by animated, domain-warped smoke; it blooms on inhale and collapses
// toward a point on exhale. Rendered in a fragment shader (the smoke is per-
// pixel noise). Falls back to the dot if WebGL is unavailable. Warm red only.

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_scale;
uniform float u_dim;

float hash(vec3 p){ p=fract(p*0.3183099+vec3(0.1,0.2,0.3)); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise(vec3 x){
  vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1.0,0.0,0.0)),f.x),
                 mix(hash(i+vec3(0.0,1.0,0.0)),hash(i+vec3(1.0,1.0,0.0)),f.x),f.y),
             mix(mix(hash(i+vec3(0.0,0.0,1.0)),hash(i+vec3(1.0,0.0,1.0)),f.x),
                 mix(hash(i+vec3(0.0,1.0,1.0)),hash(i+vec3(1.0,1.0,1.0)),f.x),f.y),f.z);
}
float fbm(vec3 p){ float a=0.5,s=0.0; for(int k=0;k<4;k++){ s+=a*noise(p); p=p*2.03+vec3(1.7,9.2,-3.3); a*=0.5; } return s; }

const int RINGS=4;

void main(){
  vec2 uv=(gl_FragCoord.xy*2.0-u_res)/u_res.y;
  float spread=clamp((u_scale-0.4)/0.6,0.0,1.0);
  float breathScale=0.12+0.88*spread;       // collapses to a point on exhale
  float R=0.105*breathScale;
  float spacing=R*0.98;
  float Rmax=float(RINGS)*spacing*1.04;
  float rot=u_time*0.06;
  float cR=cos(rot), sR=sin(rot);
  float ax=spacing, bx=spacing*0.5, by=spacing*0.8660254;

  // soft sacred geometry
  float s=0.0;
  for(int i=-RINGS;i<=RINGS;i++){
    for(int j=-RINGS;j<=RINGS;j++){
      float fi=float(i), fj=float(j);
      if((abs(fi)+abs(fj)+abs(fi+fj))*0.5 > float(RINGS)) continue;
      float x=fi*ax+fj*bx;
      float y=fj*by;
      float dl=length(vec2(x,y));
      float zf=sqrt(max(0.0,1.0-(dl/Rmax)*(dl/Rmax)));
      float reff=R*(0.42+0.58*zf);
      float depthB=0.32+0.68*zf;
      vec2 c=vec2(x*cR-y*sR, x*sR+y*cR);
      float d=length(uv-c)/reff;
      s += smoothstep(0.62,0.93,d)*(1.0-smoothstep(0.93,1.22,d))*depthB;
    }
  }
  float geom=s*1.05;

  float dist=length(uv);
  float t=u_time;
  float wx=fbm(vec3(uv.x*1.6+t*0.2, uv.y*1.6, t*0.15));
  float wy=fbm(vec3(uv.x*1.6, uv.y*1.6+t*0.2, t*0.15+3.0));
  float smk=fbm(vec3(uv.x*2.2+1.4*wx, uv.y*2.2+1.4*wy-t*0.3, t*0.2));
  smk=pow(max(smk,0.0),1.3);
  smk*=exp(-pow(dist/(Rmax*1.3),2.0));

  float bloom=exp(-dist*2.3)*0.4;
  float val=geom*1.0 + smk*1.0 + bloom;
  float lum=1.0-exp(-val*1.5);
  float hi=smoothstep(0.74,1.0,lum);
  vec3 col=vec3(lum, lum*lum*0.18+hi*0.2, lum*lum*0.05+hi*0.09);
  col*=(1.0-smoothstep(0.85,1.3,dist)); // vignette
  col*=(1.0-u_dim);
  gl_FragColor=vec4(col,1.0);
}
`;

const VERT = `attribute vec2 a_pos; void main(){ gl_Position=vec4(a_pos,0.0,1.0); }`;

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

type Props = { scale: number; phaseMs: number; dimmed: boolean };

export function BreathingFlower(props: Props) {
  const [failed, setFailed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    if (failed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
    if (!gl) {
      setFailed(true);
      return;
    }
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) {
      setFailed(true);
      return;
    }
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      setFailed(true);
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uScale = gl.getUniformLocation(prog, "u_scale");
    const uDim = gl.getUniformLocation(prog, "u_dim");

    const SIZE = 320;
    canvas.width = SIZE;
    canvas.height = SIZE;
    gl.viewport(0, 0, SIZE, SIZE);
    gl.uniform2f(uRes, SIZE, SIZE);

    const tween = { cur: 0.4, from: 0.4, to: 0.4, start: 0, dur: 1 };
    let dim = 0;
    const t0 = performance.now();
    let raf = 0;
    let lastDraw = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - lastDraw < 33) return; // ~30fps
      lastDraw = now;
      const p = propsRef.current;
      if (tween.to !== p.scale) {
        tween.from = tween.cur;
        tween.to = p.scale;
        tween.start = now;
        tween.dur = Math.max(200, p.phaseMs);
      }
      const k = Math.min(1, (now - tween.start) / tween.dur);
      tween.cur = tween.from + (tween.to - tween.from) * easeInOut(k);
      dim += ((p.dimmed ? 1 : 0) - dim) * 0.03;

      gl.uniform1f(uTime, (now - t0) / 1000);
      gl.uniform1f(uScale, tween.cur);
      gl.uniform1f(uDim, dim);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      const lose = gl.getExtension("WEBGL_lose_context");
      if (lose) lose.loseContext();
    };
  }, [failed]);

  if (failed) return <BreathingDot {...props} />;

  return (
    <canvas
      ref={canvasRef}
      className="h-[26rem] w-[26rem]"
      style={{ maxWidth: "94vw", maxHeight: "94vw" }}
    />
  );
}
