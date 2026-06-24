/**
 * VisionSimulator — educational 3D walk-through that simulates common vision
 * deficiencies (myopia, glaucoma, colour blindness, etc.) over a Three.js
 * scene. Ported from a native HTML/Three.js prototype into a self-contained
 * React component for Santix.
 *
 * - The Three.js scene runs imperatively inside a single useEffect (canvas ref).
 *   Look around by dragging (mouse / touch), walk with WASD.
 * - Vision effects are pure CSS: a `filter` on the canvas plus two gradient
 *   overlays (tunnel vision / macular spot) and SVG colour matrices for
 *   colour blindness. They are driven entirely by React state.
 * - Every listener, the ResizeObserver and the requestAnimationFrame loop are
 *   torn down on unmount, so nothing keeps running when the user navigates away.
 *
 * Educational demo — not a medical diagnosis.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Eye, Glasses } from "lucide-react";
import * as THREE from "three";
import { useLanguage } from "@/lib/useLanguage";

type DeficiencyId =
  | "none"
  | "myopia"
  | "hyperopia"
  | "astigmatism"
  | "cataract"
  | "glaucoma"
  | "amd"
  | "protanopia"
  | "deuteranopia"
  | "tritanopia";

type Deficiency = {
  id: DeficiencyId;
  ro: string;
  en: string;
  descRo: string;
  descEn: string;
};

const DEFICIENCIES: Deficiency[] = [
  {
    id: "none",
    ro: "Fără deficiență",
    en: "No deficiency",
    descRo: "Vedere de referință. Alege o deficiență pentru a vedea cum se schimbă câmpul vizual.",
    descEn: "Reference vision. Pick a deficiency to see how the field of view changes.",
  },
  {
    id: "myopia",
    ro: "Miopie (dioptrii negative)",
    en: "Myopia (short-sight)",
    descRo: "Obiectele depărtate apar neclare. Intensitatea crește gradul de blur.",
    descEn: "Distant objects appear blurry. Intensity increases the amount of blur.",
  },
  {
    id: "hyperopia",
    ro: "Hipermetropie (dioptrii pozitive)",
    en: "Hyperopia (long-sight)",
    descRo: "Dificultate la focalizarea pe aproape, simulată tot prin blur.",
    descEn: "Difficulty focusing up close, simulated here through blur.",
  },
  {
    id: "astigmatism",
    ro: "Astigmatism",
    en: "Astigmatism",
    descRo: "Imagine ușor dublată și întinsă pe orizontală, peste un blur fin.",
    descEn: "Slightly doubled image stretched horizontally over a soft blur.",
  },
  {
    id: "cataract",
    ro: "Cataractă",
    en: "Cataract",
    descRo: "Văl lăptos: contrast redus, luminozitate scăzută și o tentă gălbuie.",
    descEn: "Milky veil: reduced contrast, lower brightness and a yellowish tint.",
  },
  {
    id: "glaucoma",
    ro: "Glaucom — vedere tunel",
    en: "Glaucoma — tunnel vision",
    descRo: "Câmpul periferic se închide treptat, lăsând doar un tunel central.",
    descEn: "The peripheral field closes in, leaving only a central tunnel.",
  },
  {
    id: "amd",
    ro: "Degenerescență maculară",
    en: "Macular degeneration",
    descRo: "O pată întunecată acoperă centrul vederii, unde acuitatea e maximă.",
    descEn: "A dark spot covers the centre of vision, where acuity is highest.",
  },
  {
    id: "protanopia",
    ro: "Daltonism — protanopie",
    en: "Colour blindness — protanopia",
    descRo: "Lipsa receptorilor pentru roșu. Roșu și verde devin greu de distins.",
    descEn: "Missing red receptors. Red and green become hard to tell apart.",
  },
  {
    id: "deuteranopia",
    ro: "Daltonism — deuteranopie",
    en: "Colour blindness — deuteranopia",
    descRo: "Lipsa receptorilor pentru verde — cea mai frecventă formă.",
    descEn: "Missing green receptors — the most common form.",
  },
  {
    id: "tritanopia",
    ro: "Daltonism — tritanopie",
    en: "Colour blindness — tritanopia",
    descRo: "Lipsa receptorilor pentru albastru. Albastru și galben se confundă.",
    descEn: "Missing blue receptors. Blue and yellow get confused.",
  },
];

type VisionStyles = {
  filter: string;
  vignette: React.CSSProperties;
  macular: React.CSSProperties;
};

// Faithful port of the prototype's applyEffect() — maps a deficiency + intensity
// (0..100) to a CSS filter string and the two gradient overlays.
function computeVision(type: DeficiencyId, v: number): VisionStyles {
  const vignette: React.CSSProperties = { opacity: 0 };
  const macular: React.CSSProperties = { opacity: 0 };
  let filter = "none";

  switch (type) {
    case "myopia":
    case "hyperopia":
      filter = `blur(${((v / 100) * 9).toFixed(1)}px)`;
      break;
    case "astigmatism": {
      const b = ((v / 100) * 2.5).toFixed(1);
      const g = ((v / 100) * 6).toFixed(1);
      filter = `blur(${b}px) drop-shadow(${g}px 0 2px rgba(0,0,0,0.45)) drop-shadow(-${g}px 0 2px rgba(0,0,0,0.45))`;
      break;
    }
    case "cataract":
      filter = `blur(${((v / 100) * 6).toFixed(1)}px) brightness(${(1 - (v / 100) * 0.25).toFixed(2)}) contrast(${(1 - (v / 100) * 0.35).toFixed(2)}) sepia(${((v / 100) * 0.45).toFixed(2)})`;
      break;
    case "protanopia":
      filter = "url(#santix-protanopia)";
      break;
    case "deuteranopia":
      filter = "url(#santix-deuteranopia)";
      break;
    case "tritanopia":
      filter = "url(#santix-tritanopia)";
      break;
    case "glaucoma": {
      const clearR = 58 - (v / 100) * 44;
      vignette.opacity = 1;
      vignette.background = `radial-gradient(circle, transparent ${clearR}%, rgba(5,6,4,0.97) ${clearR + 24}%)`;
      break;
    }
    case "amd": {
      const spot = 9 + (v / 100) * 24;
      macular.opacity = 1;
      macular.background = `radial-gradient(circle, rgba(40,40,35,0.95) 0%, rgba(40,40,35,0.85) ${spot}%, transparent ${spot + 18}%)`;
      filter = `blur(${((v / 100) * 1).toFixed(1)}px)`;
      break;
    }
    case "none":
    default:
      filter = "none";
  }

  return { filter, vignette, macular };
}

function DeficiencySelect({
  value,
  onChange,
  lang,
}: {
  value: DeficiencyId;
  onChange: (id: DeficiencyId) => void;
  lang: "ro" | "en";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = DEFICIENCIES.find((d) => d.id === value) ?? DEFICIENCIES[0];

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClickOutside);
    return () => window.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left text-sm text-white transition-colors hover:border-[#00F2FE]/50 hover:bg-[#00F2FE]/10"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{lang === "en" ? current.en : current.ro}</span>
        <ChevronDown
          className={`size-4 shrink-0 text-[#00F2FE] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.14 }}
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-[260px] overflow-y-auto rounded-xl border border-white/10 bg-slate-900/80 p-1.5 backdrop-blur-xl"
            role="listbox"
          >
            {DEFICIENCIES.map((d) => {
              const active = d.id === value;
              return (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(d.id);
                      setOpen(false);
                    }}
                    className={[
                      "w-full truncate rounded-lg px-3 py-2 text-left text-[13px] transition-colors",
                      active
                        ? "bg-[#00F2FE]/15 text-[#9bf6ff]"
                        : "text-white/80 hover:bg-white/5 hover:text-white",
                    ].join(" ")}
                    role="option"
                    aria-selected={active}
                  >
                    {lang === "en" ? d.en : d.ro}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export function VisionSimulator() {
  const { lang } = useLanguage();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [deficiency, setDeficiency] = useState<DeficiencyId>("none");
  const [intensity, setIntensity] = useState(40);

  const vision = useMemo(() => computeVision(deficiency, intensity), [deficiency, intensity]);
  const current = DEFICIENCIES.find((d) => d.id === deficiency) ?? DEFICIENCIES[0];
  const isEn = lang === "en";

  // ── Three.js scene (imperative, fully torn down on unmount) ──────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9fc6df);
    scene.fog = new THREE.Fog(0x9fc6df, 18, 75);

    const camera = new THREE.PerspectiveCamera(68, 1, 0.1, 200);
    camera.position.set(0, 1.6, 6);
    camera.rotation.order = "YXZ";

    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const sun = new THREE.DirectionalLight(0xfff3d6, 0.9);
    sun.position.set(12, 22, 8);
    scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(220, 220),
      new THREE.MeshStandardMaterial({ color: 0x6f9b46 }),
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const grid = new THREE.GridHelper(220, 44, 0x3f6b2a, 0x3f6b2a);
    grid.position.y = 0.01;
    scene.add(grid);

    const makeTree = (x: number, z: number) => {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.2, 1.3, 8),
        new THREE.MeshStandardMaterial({ color: 0x6b4a2c }),
      );
      trunk.position.set(x, 0.65, z);
      const leaves = new THREE.Mesh(
        new THREE.ConeGeometry(0.85, 1.7, 9),
        new THREE.MeshStandardMaterial({ color: 0x2f6b34 }),
      );
      leaves.position.set(x, 1.9, z);
      scene.add(trunk, leaves);
    };
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 6 + Math.random() * 32;
      makeTree(Math.cos(a) * r, Math.sin(a) * r);
    }

    // colour test markers — useful for the colour-blindness modes
    const markerColors = [0xe23b3b, 0x35b04a, 0x3361e2, 0xe2c12d, 0xe27a1f, 0x8b3be2];
    markerColors.forEach((c, i) => {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.45, 18, 18),
        new THREE.MeshStandardMaterial({ color: c }),
      );
      const a = (i / markerColors.length) * Math.PI * 2;
      m.position.set(Math.cos(a) * 4.5, 0.6, Math.sin(a) * 4.5 - 2);
      scene.add(m);
    });

    const resize = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    // ── look + move ──
    const keys: Record<string, boolean> = {};
    const onKeyDown = (e: KeyboardEvent) => {
      keys[e.code] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    let yaw = 0;
    let pitch = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const startDrag = (x: number, y: number) => {
      dragging = true;
      lastX = x;
      lastY = y;
    };
    const moveDrag = (x: number, y: number) => {
      if (!dragging) return;
      const dx = x - lastX;
      const dy = y - lastY;
      lastX = x;
      lastY = y;
      yaw -= dx * 0.0045;
      pitch -= dy * 0.0045;
      pitch = Math.max(-1.1, Math.min(1.1, pitch));
    };
    const endDrag = () => {
      dragging = false;
    };

    const onMouseDown = (e: MouseEvent) => startDrag(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => moveDrag(e.clientX, e.clientY);
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      startDrag(t.clientX, t.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      moveDrag(t.clientX, t.clientY);
      e.preventDefault();
    };

    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", endDrag);
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", endDrag);

    const clock = new THREE.Clock();
    const fwdV = new THREE.Vector3();
    const rightV = new THREE.Vector3();
    const moveV = new THREE.Vector3();
    let raf = 0;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const speed = 3.1 * dt;

      camera.rotation.y = yaw;
      camera.rotation.x = pitch;

      fwdV.set(0, 0, -1).applyQuaternion(camera.quaternion);
      fwdV.y = 0;
      fwdV.normalize();
      rightV.set(1, 0, 0).applyQuaternion(camera.quaternion);
      rightV.y = 0;
      rightV.normalize();
      moveV.set(0, 0, 0);
      if (keys["KeyW"]) moveV.add(fwdV);
      if (keys["KeyS"]) moveV.sub(fwdV);
      if (keys["KeyD"]) moveV.add(rightV);
      if (keys["KeyA"]) moveV.sub(rightV);
      if (moveV.lengthSq() > 0) {
        moveV.normalize().multiplyScalar(speed);
        camera.position.add(moveV);
        camera.position.x = Math.max(-95, Math.min(95, camera.position.x));
        camera.position.z = Math.max(-95, Math.min(95, camera.position.z));
      }

      renderer.render(scene, camera);
    };

    resize();
    animate();

    // ── teardown: stop the loop and remove everything ──
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", endDrag);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", endDrag);
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) mat.dispose();
      });
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={wrapRef} className="absolute inset-0 m-4 mt-2 overflow-hidden rounded-3xl bg-black">
      <canvas
        ref={canvasRef}
        className="block h-full w-full cursor-grab touch-none active:cursor-grabbing"
        style={{ filter: vision.filter, transition: "filter 0.2s ease" }}
      />

      {/* effect overlays */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={vision.vignette}
      />
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={vision.macular}
      />

      {/* crosshair */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/50" />

      {/* hint */}
      <div className="pointer-events-none absolute bottom-4 left-4 max-w-[60%] rounded-lg bg-black/55 px-3 py-1.5 text-[11px] text-white/90">
        {isEn
          ? "WASD to walk · drag with the mouse / finger to look around"
          : "WASD ca să mergi · trage cu mouse-ul / degetul ca să privești în jur"}
      </div>

      {/* glassmorphic control panel */}
      <div className="absolute right-4 top-4 w-[290px] max-w-[calc(100%-2rem)] rounded-2xl border border-white/10 bg-slate-900/40 p-5 text-white shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-md">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#00F2FE]/30 to-[#00F2FE]/5 ring-1 ring-[#00F2FE]/25">
            <Glasses className="size-4.5 text-[#00F2FE]" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight">
              {isEn ? "Vision deficiency simulator" : "Simulator deficiențe de vedere"}
            </h2>
            <p className="text-[11px] text-white/55">
              {isEn ? "Educational demo, not a diagnosis" : "Demo educațional, nu un diagnostic"}
            </p>
          </div>
        </div>

        <label className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#00F2FE]/80">
          {isEn ? "Deficiency" : "Deficiență"}
        </label>
        <DeficiencySelect value={deficiency} onChange={setDeficiency} lang={lang} />

        <div className="mt-4 mb-1.5 flex items-center justify-between">
          <label
            htmlFor="vs-intensity"
            className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#00F2FE]/80"
          >
            {isEn ? "Intensity" : "Intensitate"}
          </label>
          <span className="text-xs font-bold tabular-nums text-[#9bf6ff]">{intensity}</span>
        </div>
        <input
          id="vs-intensity"
          type="range"
          min={0}
          max={100}
          value={intensity}
          onChange={(e) => setIntensity(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 [accent-color:#00F2FE]"
          style={{ accentColor: "#00F2FE" }}
        />

        <div className="mt-4 flex gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <Eye className="mt-0.5 size-3.5 shrink-0 text-[#00F2FE]" />
          <p className="text-[11.5px] leading-relaxed text-white/70">
            {isEn ? current.descEn : current.descRo}
          </p>
        </div>
      </div>

      {/* hidden SVG colour-matrix filters for colour blindness */}
      <svg aria-hidden className="absolute h-0 w-0">
        <defs>
          <filter id="santix-protanopia">
            <feColorMatrix
              type="matrix"
              values="0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0"
            />
          </filter>
          <filter id="santix-deuteranopia">
            <feColorMatrix
              type="matrix"
              values="0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0"
            />
          </filter>
          <filter id="santix-tritanopia">
            <feColorMatrix
              type="matrix"
              values="0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0"
            />
          </filter>
        </defs>
      </svg>
    </div>
  );
}
