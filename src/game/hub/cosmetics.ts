export type CosmeticItem = {
  id: string;
  type: "hat" | "powder";
  name: string;
  icon: string;
  price: number;
  description: string;
};

export const COSMETICS: CosmeticItem[] = [
  {
    id: "fiocco",
    type: "hat",
    name: "FIOCCO ROSA",
    icon: "🎀",
    price: 15,
    description: "Un delizioso fiocco rosa fragola da mettere sull'orecchio!",
  },
  {
    id: "coroncina",
    type: "hat",
    name: "CORONCINA D'ORO",
    icon: "👑",
    price: 30,
    description: "Una luccicante coroncina da vera principessa delle nuvole!",
  },
  {
    id: "visiera",
    type: "hat",
    name: "CAPPELLINO BLU",
    icon: "🧢",
    price: 20,
    description: "Cappellino sportivo con visiera per le corse all'aperto!",
  },
  {
    id: "cuffia",
    type: "hat",
    name: "CUFFIA DA NOTTE",
    icon: "🌙",
    price: 25,
    description: "Cuffietta soffice a righe con morbido pon-pon per fare la nanna!",
  },
  {
    id: "cilindro",
    type: "hat",
    name: "CILINDRO ELEGANTE",
    icon: "🎩",
    price: 25,
    description: "Un cappello alto da grande prestigiatore con nastro dorato!",
  },
  {
    id: "occhiali",
    type: "hat",
    name: "OCCHIALI DA SOLE",
    icon: "🕶️",
    price: 18,
    description: "Occhiali scuri tondi per un orsetto super stiloso!",
  },
  {
    id: "rose",
    type: "powder",
    name: "BOROTALCO CUORICINI",
    icon: "🌸",
    price: 35,
    description: "Emette una deliziosa scia di cuoricini rosa quando salti!",
  },
  {
    id: "gold",
    type: "powder",
    name: "BOROTALCO STELLARE",
    icon: "✨",
    price: 40,
    description: "Scia dorata splendente con polvere di stelle magiche!",
  },
  {
    id: "rainbow",
    type: "powder",
    name: "BOROTALCO ARCOBALENO",
    icon: "🌈",
    price: 50,
    description: "Crea una nuvola multicolore e gioiosa ad ogni balzo!",
  },
];

/** Disegna l'accessorio in testa all'orsetto in modo procedurale, nitido a qualsiasi risoluzione. */
export function drawHat(
  ctx: CanvasRenderingContext2D,
  hatId: string,
  hx: number,
  hy: number,
  flip: number,
  scale = 1,
) {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.scale(flip * scale, scale);

  if (hatId === "coroncina") {
    // 👑 Coroncina d'Oro con gemme
    ctx.translate(2, -18);
    const gold = ctx.createLinearGradient(0, -10, 0, 10);
    gold.addColorStop(0, "#ffe066");
    gold.addColorStop(0.5, "#f59e0b");
    gold.addColorStop(1, "#b45309");
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.moveTo(-11, 4);
    ctx.lineTo(-13, -8);
    ctx.lineTo(-6, -2);
    ctx.lineTo(0, -12);
    ctx.lineTo(6, -2);
    ctx.lineTo(13, -8);
    ctx.lineTo(11, 4);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Gemme colorate sui 3 vertici
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(0, -7, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3b82f6";
    ctx.beginPath();
    ctx.arc(-6, -2, 1.5, 0, Math.PI * 2);
    ctx.arc(6, -2, 1.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (hatId === "fiocco") {
    // 🎀 Fiocco Rosa Fragola
    ctx.translate(9, -15);
    const pink = ctx.createLinearGradient(-10, -6, 10, 6);
    pink.addColorStop(0, "#ff85a2");
    pink.addColorStop(0.5, "#f43f5e");
    pink.addColorStop(1, "#be123c");

    // Ala sinistra
    ctx.fillStyle = pink;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-11, -9, -12, -2);
    ctx.quadraticCurveTo(-11, 6, 0, 0);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Ala destra
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(11, -9, 12, -2);
    ctx.quadraticCurveTo(11, 6, 0, 0);
    ctx.fill();
    ctx.stroke();

    // Nodo centrale
    ctx.fillStyle = "#ffe4e6";
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f43f5e";
    ctx.stroke();
  } else if (hatId === "visiera") {
    // 🧢 Cappellino da Esploratore
    ctx.translate(1, -16);
    const blue = ctx.createLinearGradient(0, -10, 0, 6);
    blue.addColorStop(0, "#60a5fa");
    blue.addColorStop(1, "#2563eb");
    ctx.fillStyle = blue;
    // Calotta
    ctx.beginPath();
    ctx.arc(0, 0, 13, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    // Visiera
    ctx.fillStyle = "#1d4ed8";
    ctx.beginPath();
    ctx.ellipse(8, 2, 9, 3, 0.2, 0, Math.PI * 2);
    ctx.fill();
    // Bottone sopra
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(0, -13, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (hatId === "cuffia") {
    // 🌙 Cuffia da Notte con pon-pon
    ctx.translate(-2, -16);
    const grad = ctx.createLinearGradient(0, -12, 14, 14);
    grad.addColorStop(0, "#a5b4fc");
    grad.addColorStop(1, "#6366f1");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-11, 2);
    ctx.quadraticCurveTo(-10, -14, 2, -14);
    ctx.quadraticCurveTo(14, -12, 18, 2);
    ctx.lineTo(13, 4);
    ctx.quadraticCurveTo(8, -6, 2, -6);
    ctx.quadraticCurveTo(-4, -6, -11, 2);
    ctx.closePath();
    ctx.fill();
    // Pon-pon bianco morbido
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(19, 4, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#e0e7ff";
    ctx.lineWidth = 1;
    ctx.stroke();
  } else if (hatId === "cilindro") {
    // 🎩 Cilindro Elegante
    ctx.translate(2, -18);
    // Tesa del cappello
    ctx.fillStyle = "#1e1b4b";
    ctx.beginPath();
    ctx.ellipse(0, 4, 14, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Corpo
    ctx.fillStyle = "#312e81";
    ctx.fillRect(-8, -14, 16, 17);
    // Nastro dorato
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(-8, 0, 16, 3);
    // Cima bombata
    ctx.fillStyle = "#4338ca";
    ctx.beginPath();
    ctx.ellipse(0, -14, 8, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (hatId === "occhiali") {
    // 🕶️ Occhiali da Sole tondi
    ctx.translate(6, -8);
    ctx.fillStyle = "#111827";
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 1.4;
    // Lente sinistra
    ctx.beginPath();
    ctx.arc(-5, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Lente destra
    ctx.beginPath();
    ctx.arc(5, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Ponte
    ctx.beginPath();
    ctx.moveTo(-0.5, -1);
    ctx.lineTo(0.5, -1);
    ctx.stroke();
  }

  ctx.restore();
}
