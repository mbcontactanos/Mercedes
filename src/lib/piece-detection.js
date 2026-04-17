function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function classifyTone({ r, g, b }) {
  const brightness = (r + g + b) / 3;
  const warmth = r - b;

  if (brightness > 170 && Math.abs(r - g) < 20 && Math.abs(g - b) < 20) {
    return "metal-claro";
  }

  if (warmth > 36 && brightness < 132) {
    return "metal-oxidado";
  }

  if (warmth > 24) {
    return "metal-calido";
  }

  return "metal-frio";
}

function getAxisDirection(width, height) {
  if (width >= height * 1.18) {
    return "horizontal";
  }

  if (height >= width * 1.18) {
    return "vertical";
  }

  return "diagonal";
}

function getShapeHint(elongation, sizeKey) {
  if (elongation >= 3) {
    return "muy-fina";
  }

  if (elongation >= 2) {
    return "alargada";
  }

  if (sizeKey === "tiny" || sizeKey === "small") {
    return "compacta";
  }

  return "estandar";
}

export function sampleDetectionColor(context, bbox, frameWidth, frameHeight) {
  const [x, y, width, height] = bbox;
  const safeX = clamp(Math.floor(x), 0, frameWidth - 1);
  const safeY = clamp(Math.floor(y), 0, frameHeight - 1);
  const safeWidth = clamp(Math.floor(width), 1, frameWidth - safeX);
  const safeHeight = clamp(Math.floor(height), 1, frameHeight - safeY);
  const imageData = context.getImageData(safeX, safeY, Math.min(safeWidth, 48), Math.min(safeHeight, 48)).data;

  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (let index = 0; index < imageData.length; index += 16) {
    r += imageData[index];
    g += imageData[index + 1];
    b += imageData[index + 2];
    count += 1;
  }

  if (!count) {
    return { averageColor: { r: 128, g: 128, b: 128 }, toneLabel: "metal-frio" };
  }

  const averageColor = {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
  };

  return {
    averageColor,
    toneLabel: classifyTone(averageColor),
  };
}

export function identifyPieceElement(detection, colorFeatures) {
  const width = detection.bbox[2];
  const height = detection.bbox[3];
  const aspectRatio = width / Math.max(height, 1);
  const elongation = Math.max(aspectRatio, 1 / Math.max(aspectRatio, 0.0001));
  const axisDirection = getAxisDirection(width, height);
  const compactness = detection.areaRatio / Math.max(detection.longestSideRatio, 0.0001);

  let orientation = "frontal";
  if (aspectRatio > 2.2) {
    orientation = "lateral";
  } else if (aspectRatio > 1.18) {
    orientation = "oblicua";
  } else if (aspectRatio < 0.82) {
    orientation = "frontal";
  }

  const geometryScore =
    detection.longestSideRatio < 0.52 && detection.areaRatio < 0.2 && compactness < 0.16 ? 0.52 : 0.26;
  const sizeScore = detection.sizeKey === "tiny" ? 0.26 : detection.sizeKey === "small" ? 0.22 : 0.1;
  const sourceScore = detection.source === "tile" || detection.source === "zoom" ? 0.14 : 0.06;
  const toneScore = colorFeatures.toneLabel.startsWith("metal") ? 0.16 : 0.03;
  const elongationScore = elongation >= 3 ? 0.2 : elongation >= 2 ? 0.16 : elongation >= 1.3 ? 0.1 : 0.04;
  const score = geometryScore + sizeScore + sourceScore + toneScore + elongationScore;

  if (score < 0.62) {
    return null;
  }

  return {
    elementType: "pieza",
    elementLabel: "pieza",
    orientation,
    axisDirection,
    shapeHint: getShapeHint(elongation, detection.sizeKey),
    elongation,
    majorSidePx: Math.max(width, height),
    minorSidePx: Math.max(Math.min(width, height), 1),
    orientationAngle: axisDirection === "horizontal" ? 0 : axisDirection === "vertical" ? 90 : 18,
    pieceConfidence: Math.min(0.99, Number(score.toFixed(2))),
    toneLabel: colorFeatures.toneLabel,
  };
}
