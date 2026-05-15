import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "show-scratch-open-cards";

const cards = [
  {
    index: "01",
    text: "Ты красотка",
    hint: "Начнем с самого очевидного.",
  },
  {
    index: "02",
    text: "Ты очень особенная",
    hint: "И это уже не комплимент, а констатация.",

  },
    {
    index: "03",
    text: "Покажи сиськи 😊",
    hint: "❤️❤️❤️",
    finale: true,
  },
];

function getInitialOpenCards() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function ScratchCard({ index, text, hint, finale, isOpen, onReveal }) {
  const canvasRef = useRef(null);
  const layerRef = useRef(null);
  const pointerRef = useRef(null);
  const drawingRef = useRef(false);
  const moveCountRef = useRef(0);
  const openRef = useRef(false);
  const thresholdRef = useRef(0.48);

  useEffect(() => {
    openRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    const layer = layerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!layer || !canvas || !ctx) return undefined;

    const scratchRadius = 28;
    const sampleStep = 7;

    const paintMask = (width, height) => {
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, width, height);

      const fill = ctx.createLinearGradient(0, 0, 0, height);
      fill.addColorStop(0, "#dfd7e3");
      fill.addColorStop(0.58, "#cfc4d0");
      fill.addColorStop(1, "#b8aebc");
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, width, height);

      const shimmer = ctx.createLinearGradient(0, 0, width, height);
      shimmer.addColorStop(0, "rgba(255, 255, 255, 0.28)");
      shimmer.addColorStop(0.4, "rgba(255, 255, 255, 0.06)");
      shimmer.addColorStop(1, "rgba(255, 255, 255, 0.18)");
      ctx.fillStyle = shimmer;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.beginPath();
      ctx.ellipse(width * 0.24, height * 0.22, width * 0.18, height * 0.12, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(width * 0.76, height * 0.34, width * 0.12, height * 0.09, -0.3, 0, Math.PI * 2);
      ctx.fill();
    };

    let lastWidth = 0;
    let lastHeight = 0;

    const resizeCanvas = () => {
      const rect = layer.getBoundingClientRect();
      const nextWidth = Math.round(rect.width);
      const nextHeight = Math.round(rect.height);

      if (nextWidth === lastWidth && nextHeight === lastHeight) {
        return;
      }

      lastWidth = nextWidth;
      lastHeight = nextHeight;

      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(ratio, ratio);

      if (openRef.current) {
        ctx.clearRect(0, 0, rect.width, rect.height);
        return;
      }

      paintMask(rect.width, rect.height);
    };

    const getProgress = () => {
      const { width, height } = canvas;
      const pixels = ctx.getImageData(0, 0, width, height).data;
      let cleared = 0;

      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] === 0) cleared += 1;
      }

      return cleared / (width * height);
    };

    const reveal = () => {
      if (openRef.current) return;
      openRef.current = true;
      onReveal(index);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const maybeReveal = () => {
      if (getProgress() >= thresholdRef.current) {
        reveal();
      }
    };

    const erase = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, scratchRadius, 0, Math.PI * 2);
      ctx.fill();

      moveCountRef.current += 1;
      if (moveCountRef.current % sampleStep === 0) {
        maybeReveal();
      }
    };

    const onPointerDown = (event) => {
      if (openRef.current) return;
      pointerRef.current = event.pointerId;
      drawingRef.current = true;
      layer.setPointerCapture(event.pointerId);
      erase(event);
    };

    const onPointerMove = (event) => {
      if (!drawingRef.current || event.pointerId !== pointerRef.current) return;
      erase(event);
    };

    const stopDrawing = (event) => {
      if (event.pointerId !== pointerRef.current) return;
      drawingRef.current = false;
      pointerRef.current = null;
      layer.releasePointerCapture(event.pointerId);
      maybeReveal();
    };

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });

    resizeCanvas();
    resizeObserver.observe(layer);
    layer.addEventListener("pointerdown", onPointerDown);
    layer.addEventListener("pointermove", onPointerMove);
    layer.addEventListener("pointerup", stopDrawing);
    layer.addEventListener("pointercancel", stopDrawing);

    return () => {
      resizeObserver.disconnect();
      layer.removeEventListener("pointerdown", onPointerDown);
      layer.removeEventListener("pointermove", onPointerMove);
      layer.removeEventListener("pointerup", stopDrawing);
      layer.removeEventListener("pointercancel", stopDrawing);
    };
  }, [index, isOpen, onReveal]);

  if (isOpen) {
    return (
      <article
        className={`scratch-card scratch-card--revealed${
          finale ? " scratch-card--finale" : ""
        }`}
      >
        <div className="scratch-card__revealed-surface">
          <p className="scratch-card__index">{index}</p>
          <h2 className="scratch-card__title">{text}</h2>
          <p className="scratch-card__hint">{hint}</p>
        </div>
      </article>
    );
  }

  return (
    <article className={`scratch-card${finale ? " scratch-card--finale" : ""}`}>
      <div className="scratch-card__face">
        <p className="scratch-card__index">{index}</p>
        <h2 className="scratch-card__title">{text}</h2>
        <p className="scratch-card__hint">{hint}</p>
      </div>

      <div
        ref={layerRef}
        className="scratch-card__layer"
        aria-label={`Сотри карточку ${index}`}
      >
        <canvas ref={canvasRef} />
        <div className="scratch-card__overlay-copy">
          <strong>Сотри здесь</strong>
          <span>Проведи пальцем и открой фразу</span>
        </div>
      </div>
    </article>
  );
}

export default function App() {
  const [openCards, setOpenCards] = useState(getInitialOpenCards);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(openCards));
  }, [openCards]);

  const handleReveal = (cardIndex) => {
    setOpenCards((current) => {
      if (current[cardIndex]) {
        return current;
      }

      return {
        ...current,
        [cardIndex]: true,
      };
    });
  };

  return (
    <div className="app-shell">
      <main className="ticket">
        <div className="ticket__hero">
          <p className="ticket__kicker">FOR ANNA Romance scratch edition</p>
          <h1>Сотри и улыбнись</h1>
          <p className="ticket__lead">Небольшая серия нежных карточек только для тебя.</p>
        </div>

        <section className="ticket__cards">
          {cards.map((card) => (
            <ScratchCard
              key={card.index}
              {...card}
              isOpen={Boolean(openCards[card.index])}
              onReveal={handleReveal}
            />
          ))}
        </section>
      </main>
    </div>
  );
}
