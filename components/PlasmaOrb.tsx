"use client";

import { useEffect, useRef, useState } from "react";
import { NebulaOrb } from "./NebulaOrb";

// Volumetric red plasma, raymarched in a fragment shader: a glowing smoke
// sphere with a hot core, depth, fresnel-ish bloom and organic flow. It
// breathes with the session. If WebGL or the shader is unavailable, we fall
// back to the canvas nebula so the screen is never blank.

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
float fbm(vec3 p){ float a=0.5,s=0.0; for(int i=0;i<5;i++){ s+=a*noise(p); p=p*2.03+vec3(1.7,9.2,-3.3); a*=0.5; } return s; }

void main(){
  vec2 uv=(gl_FragCoord.xy*2.0-u_res)/u_res.y;
  vec3 ro=vec3(0.0,0.0,-3.2);
  vec3 rd=normalize(vec3(uv,1.7));
  float t=u_time*0.22;
  float br=mix(0.8,1.12,clamp((u_scale-0.4)/0.6,0.0,1.0));
  float ca=cos(t*0.3), sa=sin(t*0.3);

  float b=dot(ro,rd), c=dot(ro,ro)-br*br, h=b*b-c;
  vec3 col=vec3(0.0); float alpha=0.0; float fres=0.0;
  if(h>0.0){
    h=sqrt(h);
    float tn=max(-b-h,0.0), tf=-b+h;
    vec3 en=normalize(ro+rd*tn);
    fres=pow(1.0-clamp(dot(en,-rd),0.0,1.0),2.6); // rim -> defined 3D orb
    float dt=(tf-tn)/48.0;
    float tt=tn+dt*hash(vec3(gl_FragCoord.xy,1.0));
    for(int i=0;i<48;i++){
      vec3 pos=ro+rd*tt;
      vec3 sp=pos; sp.xz=mat2(ca,-sa,sa,ca)*sp.xz;
      vec3 wv=vec3(fbm(sp*2.0+vec3(0.0,t,0.0)),
                   fbm(sp*2.0+vec3(t,1.0,0.0)),
                   fbm(sp*2.0+vec3(0.0,t*0.7,2.0)));
      vec3 q=sp*3.6+0.9*wv;
      float body=fbm(q+vec3(0.0,-t*1.4,0.0));
      float ridg=1.0-abs(2.0*noise(q*1.6+vec3(0.0,-t,0.0))-1.0);
      float grain=noise(q*4.0+vec3(0.0,-t*1.2,0.0));
      float d=body*0.6+ridg*ridg*0.5+grain*0.18; // veins + granulation
      float rr=length(pos)/br;
      float dens=smoothstep(1.02,0.0,rr)*d;
      dens=pow(max(dens,0.0),1.7)*5.2;
      float temp=dens*(1.0-rr*0.4)+(1.0-rr)*0.5;
      vec3 cc=mix(vec3(0.45,0.03,0.0),vec3(1.0,0.2,0.03),smoothstep(0.0,0.55,temp));
      cc=mix(cc,vec3(1.0,0.58,0.3),smoothstep(0.75,1.5,temp));
      float a=dens*0.16;
      col+=cc*a*(1.0-alpha);
      alpha+=a*(1.0-alpha);
      if(alpha>0.995) break;
      tt+=dt;
    }
  }
  float dist=length(uv);
  // fresnel rim — a defined glowing edge
  col+=vec3(1.0,0.34,0.12)*fres*0.9;
  // a thin, restrained flame edge (much less smoke)
  vec2 hv=mat2(ca,-sa,sa,ca)*uv;
  float wx=fbm(vec3(hv*2.4,t*0.4));
  float wy=fbm(vec3(hv*2.4+vec2(5.0,0.0),t*0.4+2.0));
  float wisp=fbm(vec3(hv*3.0+1.0*vec2(wx,wy),t*0.5));
  wisp=pow(max(wisp,0.0),2.4);
  float shell=exp(-abs(dist-br)*9.0);
  col+=vec3(1.0,0.34,0.13)*shell*wisp*1.1;
  // tight inner bloom
  float glow=exp(-dist*3.6/br)*0.22;
  col+=vec3(1.0,0.3,0.12)*glow;

  col*=1.18;
  col=vec3(1.0)-exp(-col*1.5);
  col*=smoothstep(1.15,0.5,dist);
  col*=(1.0-u_dim);
  gl_FragColor=vec4(col,1.0);
}
`;

const VERT = `attribute vec2 a_pos; void main(){ gl_Position=vec4(a_pos,0.0,1.0); }`;

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

type Props = {
  scale: number;
  phaseMs: number;
  dimmed: boolean;
};

export function PlasmaOrb(props: Props) {
  const [failed, setFailed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    if (failed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
    });
    if (!gl) {
      setFailed(true);
      return;
    }

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
        return null;
      }
      return s;
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
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "u_time");
    const uRes = gl.getUniformLocation(prog, "u_res");
    const uScale = gl.getUniformLocation(prog, "u_scale");
    const uDim = gl.getUniformLocation(prog, "u_dim");

    const SIZE = 384; // internal resolution — higher for crisper detail
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
      if (now - lastDraw < 33) return; // ~30fps: easier on the battery
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

  if (failed) return <NebulaOrb {...props} />;

  return (
    <canvas
      ref={canvasRef}
      className="h-[26rem] w-[26rem]"
      style={{ maxWidth: "92vw", maxHeight: "92vw", mixBlendMode: "screen" }}
    />
  );
}
