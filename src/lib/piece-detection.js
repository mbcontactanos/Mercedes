/**
 * Piece Detection Module - Computer Vision Analysis for Mercedes Parts
 * 
 * @fileoverview Módulo de análisis de visión artificial para detección y clasificación
 * de piezas industriales en Mercedes Vitoria OPS.
 * 
 * @description Este módulo implementa algoritmos de análisis de imagen post-TensorFlow
 * para refinar las detecciones de COCO-SSD y extraer características específicas de
 * piezas industriales como tornillos, tuercas, arandelas y componentes metálicos.
 * 
 * El pipeline de análisis consta de tres etapas:
 * 
 * 1. **Muestreo de Color (sampleDetectionColor)**
 *    Extrae el color promedio de la región detectada y clasifica el tono metálico.
 * 
 * 2. **Análisis Geométrico (getAxisDirection, getShapeHint)**
 *    Determina la orientación y forma de la pieza basándose en aspect ratio.
 * 
 * 3. **Identificación de Pieza (identifyPieceElement)**
 *    Combina características para clasificar y puntuar la detección.
 * 
 * @requires Canvas 2D API - Para extracción de píxeles (getImageData)
 * @requires TensorFlow.js COCO-SSD - Detecciones de entrada
 * 
 * @example
 * // Pipeline típico de uso
 * const colorFeatures = sampleDetectionColor(ctx, detection.bbox, width, height);
 * const pieceInfo = identifyPieceElement(detection, colorFeatures);
 * if (pieceInfo) {
 *   console.log(`Pieza detectada: ${pieceInfo.elementType} (${pieceInfo.pieceConfidence})`);
 * }
 * 
 * @author Mercedes Vitoria OPS Team
 * @version 2.0.0
 * @since 2024-01-15
 */

/* ═══════════════════════════════════════════════════════════════════════════════
   UTILITY FUNCTIONS
   
   Funciones auxiliares para operaciones matemáticas y clasificación básica.
   ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * clamp - Limita un valor numérico a un rango específico
 * 
 * @function
 * @param {number} value - Valor a limitar
 * @param {number} min - Límite inferior del rango
 * @param {number} max - Límite superior del rango
 * @returns {number} Valor limitado dentro del rango [min, max]
 * 
 * @description Función de utilidad que asegura que un valor numérico
 * esté dentro de los límites especificados. Esencial para evitar
 * índices fuera de rango al acceder a datos de imagen.
 * 
 * @example
 * clamp(150, 0, 100) // Returns: 100
 * clamp(-10, 0, 100) // Returns: 0
 * clamp(50, 0, 100)  // Returns: 50
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * classifyTone - Clasifica el tono de color en categorías de metal industrial
 * 
 * @function
 * @param {Object} color - Objeto con componentes RGB
 * @param {number} color.r - Componente rojo (0-255)
 * @param {number} color.g - Componente verde (0-255)
 * @param {number} color.b - Componente azul (0-255)
 * @returns {string} Etiqueta de clasificación de tono metálico
 * 
 * @description Analiza los valores RGB para determinar el tipo de metal
 * basándose en características cromáticas industriales.
 * 
 * Clasificaciones posibles:
 * - "metal-claro": Acero inoxidable, aluminio pulido, zinc galvanizado
 * - "metal-oxidado": Hierro oxidado, acero corroído, bronce antiguo
 * - "metal-calido": Cobre, latón, bronce, metales con acabado dorado
 * - "metal-frio": Acero azulado, titanio, metales cromados
 * 
 * Algoritmo:
 * 1. Calcula brightness como promedio de RGB
 * 2. Calcula warmth como diferencia R-B (tonos cálidos vs fríos)
 * 3. Aplica umbrales empíricos para clasificación
 * 
 * @example
 * classifyTone({ r: 200, g: 198, b: 195 }) // "metal-claro"
 * classifyTone({ r: 180, g: 100, b: 60 })  // "metal-oxidado"
 */
function classifyTone({ r, g, b }) {
  /** Calcula el brillo como promedio de los tres canales RGB */
  const brightness = (r + g + b) / 3;
  
  /** Calcula la "calidez" como diferencia entre rojo y azul */
  const warmth = r - b;

  /** 
   * METAL CLARO: Alta luminosidad + componentes RGB equilibrados
   * Típico de acero inoxidable, aluminio y superficies pulidas
   */
  if (brightness > 170 && Math.abs(r - g) < 20 && Math.abs(g - b) < 20) {
    return "metal-claro";
  }

  /**
   * METAL OXIDADO: Alto warmth + baja luminosidad
   * Típico de superficies oxidadas, herrumbre, bronce antiguo
   */
  if (warmth > 36 && brightness < 132) {
    return "metal-oxidado";
  }

  /**
   * METAL CALIDO: Warmth moderado-alto
   * Típico de cobre, latón, acabados dorados
   */
  if (warmth > 24) {
    return "metal-calido";
  }

  /**
   * METAL FRIO: Default para superficies azuladas o neutras
   * Típico de acero cromado, titanio, superficies anodizadas
   */
  return "metal-frio";
}

/**
 * getAxisDirection - Determina la orientación principal del objeto
 * 
 * @function
 * @param {number} width - Ancho del bounding box en píxeles
 * @param {number} height - Alto del bounding box en píxeles
 * @returns {string} Dirección del eje principal: "horizontal" | "vertical" | "diagonal"
 * 
 * @description Analiza el aspect ratio del bounding box para determinar
 * si el objeto está orientado principalmente de forma horizontal,
 * vertical, o en una posición diagonal/indeterminada.
 * 
 * Umbrales:
 * - Horizontal: width >= height * 1.18 (18% más ancho que alto)
 * - Vertical: height >= width * 1.18 (18% más alto que ancho)
 * - Diagonal: Ninguno de los anteriores (aspect ratio cercano a 1:1)
 * 
 * @example
 * getAxisDirection(100, 50)  // "horizontal"
 * getAxisDirection(50, 100)  // "vertical"
 * getAxisDirection(100, 95)  // "diagonal"
 */
function getAxisDirection(width, height) {
  /**
   * HORIZONTAL: El ancho supera al alto por al menos 18%
   * Típico de tornillos vistos lateralmente, piezas alargadas
   */
  if (width >= height * 1.18) {
    return "horizontal";
  }

  /**
   * VERTICAL: La altura supera al ancho por al menos 18%
   * Típico de tornillos vistos frontalmente, piezas erguidas
   */
  if (height >= width * 1.18) {
    return "vertical";
  }

  /**
   * DIAGONAL: Aspect ratio cercano a 1:1
   * Indica vista oblicua o piezas de forma compacta (tuercas, arandelas)
   */
  return "diagonal";
}

/**
 * getShapeHint - Genera una descripción textual de la forma de la pieza
 * 
 * @function
 * @param {number} elongation - Ratio de elongación (mayor dimensión / menor dimensión)
 * @param {string} sizeKey - Clasificación de tamaño: "tiny" | "small" | "medium" | "large"
 * @returns {string} Descripción de forma: "muy-fina" | "alargada" | "compacta" | "estandar"
 * 
 * @description Combina el ratio de elongación con el tamaño para generar
 * una descripción semántica de la forma que ayuda en la identificación.
 * 
 * Clasificaciones:
 * - "muy-fina": Elongación >= 3 (piezas muy alargadas como varillas, cables)
 * - "alargada": Elongación >= 2 (tornillos largos, pasadores)
 * - "compacta": Piezas pequeñas con elongación baja (tuercas, arandelas)
 * - "estandar": Piezas de proporciones normales
 * 
 * @example
 * getShapeHint(4.0, "small")  // "muy-fina"
 * getShapeHint(2.5, "medium") // "alargada"
 * getShapeHint(1.2, "tiny")   // "compacta"
 */
function getShapeHint(elongation, sizeKey) {
  /**
   * MUY FINA: Elongación extrema (3:1 o mayor)
   * Típico de varillas, clavos largos, cables, tornillos de carrocería
   */
  if (elongation >= 3) {
    return "muy-fina";
  }

  /**
   * ALARGADA: Elongación alta (2:1 a 3:1)
   * Típico de tornillos estándar, pasadores, bulones
   */
  if (elongation >= 2) {
    return "alargada";
  }

  /**
   * COMPACTA: Piezas pequeñas sin elongación significativa
   * Típico de tuercas, arandelas, remaches, tornillos cortos
   */
  if (sizeKey === "tiny" || sizeKey === "small") {
    return "compacta";
  }

  /**
   * ESTANDAR: Proporciones normales en piezas de tamaño medio-grande
   */
  return "estandar";
}

/* ═══════════════════════════════════════════════════════════════════════════════
   EXPORTED FUNCTIONS
   
   Funciones públicas del módulo para análisis de detecciones.
   ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * sampleDetectionColor - Extrae y analiza el color promedio de una región detectada
 * 
 * @function
 * @param {CanvasRenderingContext2D} context - Contexto 2D del canvas con el frame
 * @param {Array<number>} bbox - Bounding box [x, y, width, height] de la detección
 * @param {number} frameWidth - Ancho total del frame en píxeles
 * @param {number} frameHeight - Alto total del frame en píxeles
 * @returns {Object} Objeto con características de color
 * @returns {Object} .averageColor - Color promedio {r, g, b}
 * @returns {string} .toneLabel - Clasificación de tono metálico
 * 
 * @description Realiza muestreo de píxeles en la región del bounding box
 * para calcular el color promedio y determinar el tipo de superficie metálica.
 * 
 * Proceso:
 * 1. Valida y clampea las coordenadas del bbox al frame
 * 2. Extrae datos de imagen con getImageData (máx 48x48 px para rendimiento)
 * 3. Muestrea cada 4to píxel (stride 16 en el array RGBA)
 * 4. Calcula promedio RGB
 * 5. Clasifica el tono usando classifyTone()
 * 
 * Optimizaciones de rendimiento:
 * - Limita el área de muestreo a 48x48 píxeles máximo
 * - Usa stride de 16 bytes (4 píxeles) para reducir iteraciones
 * - Evita crear objetos intermedios innecesarios
 * 
 * @example
 * const ctx = canvas.getContext("2d");
 * const detection = { bbox: [100, 50, 80, 40] };
 * const colorInfo = sampleDetectionColor(ctx, detection.bbox, 640, 480);
 * console.log(colorInfo.toneLabel); // "metal-claro"
 */
export function sampleDetectionColor(context, bbox, frameWidth, frameHeight) {
  /** Destructura las coordenadas del bounding box */
  const [x, y, width, height] = bbox;
  
  /** 
   * Clampea las coordenadas para evitar accesos fuera del frame
   * Esto previene errores cuando la detección está parcialmente fuera del canvas
   */
  const safeX = clamp(Math.floor(x), 0, frameWidth - 1);
  const safeY = clamp(Math.floor(y), 0, frameHeight - 1);
  const safeWidth = clamp(Math.floor(width), 1, frameWidth - safeX);
  const safeHeight = clamp(Math.floor(height), 1, frameHeight - safeY);
  
  /**
   * Extrae los datos de imagen limitando a 48x48 para rendimiento
   * getImageData retorna un Uint8ClampedArray con valores RGBA consecutivos
   */
  const imageData = context.getImageData(
    safeX, 
    safeY, 
    Math.min(safeWidth, 48), 
    Math.min(safeHeight, 48)
  ).data;

  /** Acumuladores para el cálculo del promedio RGB */
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  /**
   * Itera sobre los datos de imagen con stride de 16 bytes
   * Cada píxel ocupa 4 bytes (RGBA), stride 16 = muestrear cada 4 píxeles
   */
  for (let index = 0; index < imageData.length; index += 16) {
    r += imageData[index];       /** Canal rojo */
    g += imageData[index + 1];   /** Canal verde */
    b += imageData[index + 2];   /** Canal azul */
    count += 1;                  /** Contador de muestras */
  }

  /**
   * Fallback para el caso edge de no tener muestras válidas
   * Retorna un gris neutro que se clasificará como "metal-frio"
   */
  if (!count) {
    return { 
      averageColor: { r: 128, g: 128, b: 128 }, 
      toneLabel: "metal-frio" 
    };
  }

  /** Calcula el color promedio dividiendo los acumuladores por el count */
  const averageColor = {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
  };

  /**
   * Retorna el objeto con el color promedio y la clasificación de tono
   */
  return {
    averageColor,
    toneLabel: classifyTone(averageColor),
  };
}

/**
 * identifyPieceElement - Identifica y clasifica una pieza industrial a partir de detección
 * 
 * @function
 * @param {Object} detection - Objeto de detección de COCO-SSD enriquecido
 * @param {Array<number>} detection.bbox - Bounding box [x, y, width, height]
 * @param {number} detection.areaRatio - Ratio del área vs frame total
 * @param {number} detection.longestSideRatio - Ratio del lado más largo vs frame
 * @param {string} detection.sizeKey - Clasificación de tamaño
 * @param {string} detection.source - Fuente de detección ("tile", "zoom", "global")
 * @param {Object} colorFeatures - Características de color de sampleDetectionColor()
 * @param {string} colorFeatures.toneLabel - Clasificación de tono metálico
 * @returns {Object|null} Información de la pieza o null si no cumple umbral
 * 
 * @description Algoritmo de scoring multi-factor que combina características
 * geométricas, cromáticas y contextuales para identificar piezas industriales.
 * 
 * Factores de puntuación:
 * - geometryScore (0.26-0.52): Compacidad y ratios de área/lado
 * - sizeScore (0.1-0.26): Bonus para piezas pequeñas (más probable que sean tornillos)
 * - sourceScore (0.06-0.14): Bonus para detecciones de tile/zoom (mayor precisión)
 * - toneScore (0.03-0.16): Bonus para tonos metálicos detectados
 * - elongationScore (0.04-0.2): Bonus para formas alargadas típicas de tornillería
 * 
 * Umbral de clasificación: score >= 0.62
 * 
 * @returns {Object} pieceInfo - Información detallada de la pieza detectada
 * @returns {string} pieceInfo.elementType - Siempre "pieza"
 * @returns {string} pieceInfo.elementLabel - Etiqueta legible "pieza"
 * @returns {string} pieceInfo.orientation - "frontal" | "lateral" | "oblicua"
 * @returns {string} pieceInfo.axisDirection - "horizontal" | "vertical" | "diagonal"
 * @returns {string} pieceInfo.shapeHint - "muy-fina" | "alargada" | "compacta" | "estandar"
 * @returns {number} pieceInfo.elongation - Ratio de elongación numérico
 * @returns {number} pieceInfo.majorSidePx - Lado mayor en píxeles
 * @returns {number} pieceInfo.minorSidePx - Lado menor en píxeles
 * @returns {number} pieceInfo.orientationAngle - Ángulo aproximado (0, 18, 90 grados)
 * @returns {number} pieceInfo.pieceConfidence - Confianza 0-0.99
 * @returns {string} pieceInfo.toneLabel - Clasificación de tono metálico
 * 
 * @example
 * const detection = {
 *   bbox: [100, 50, 30, 80],
 *   areaRatio: 0.01,
 *   longestSideRatio: 0.15,
 *   sizeKey: "small",
 *   source: "tile"
 * };
 * const colorFeatures = { toneLabel: "metal-claro" };
 * const pieceInfo = identifyPieceElement(detection, colorFeatures);
 * // Returns: { elementType: "pieza", pieceConfidence: 0.78, ... }
 */
export function identifyPieceElement(detection, colorFeatures) {
  /** Extrae dimensiones del bounding box */
  const width = detection.bbox[2];
  const height = detection.bbox[3];
  
  /** 
   * Calcula el aspect ratio (ancho/alto)
   * Protege contra división por cero con Math.max
   */
  const aspectRatio = width / Math.max(height, 1);
  
  /**
   * Calcula la elongación como el ratio entre dimensiones mayor y menor
   * Siempre >= 1, independiente de la orientación
   */
  const elongation = Math.max(aspectRatio, 1 / Math.max(aspectRatio, 0.0001));
  
  /** Determina la orientación principal basada en dimensiones */
  const axisDirection = getAxisDirection(width, height);
  
  /**
   * Calcula la compacidad: ratio entre área y lado más largo
   * Valores bajos indican formas alargadas, valores altos indican formas compactas
   */
  const compactness = detection.areaRatio / Math.max(detection.longestSideRatio, 0.0001);

  /**
   * Determina la orientación visual de la pieza basada en aspect ratio
   * - aspectRatio > 2.2: Vista lateral (pieza muy alargada horizontalmente)
   * - aspectRatio > 1.18: Vista oblicua (ligeramente alargada)
   * - aspectRatio < 0.82: Vista frontal (más alta que ancha)
   * - else: Asumimos frontal por defecto
   */
  let orientation = "frontal";
  if (aspectRatio > 2.2) {
    orientation = "lateral";
  } else if (aspectRatio > 1.18) {
    orientation = "oblicua";
  } else if (aspectRatio < 0.82) {
    orientation = "frontal";
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     SISTEMA DE SCORING MULTI-FACTOR
     
     Cada factor contribuye a la puntuación final que determina si la
     detección corresponde a una pieza industrial válida.
     ═══════════════════════════════════════════════════════════════════════════ */

  /**
   * GEOMETRY SCORE (0.26 - 0.52)
   * Bonus alto si la pieza tiene características geométricas típicas:
   * - longestSideRatio < 0.52: No ocupa demasiado del frame
   * - areaRatio < 0.2: Área pequeña relativa al frame
   * - compactness < 0.16: Forma alargada o compacta (no cuadrada grande)
   */
  const geometryScore =
    detection.longestSideRatio < 0.52 && detection.areaRatio < 0.2 && compactness < 0.16 
      ? 0.52 
      : 0.26;
  
  /**
   * SIZE SCORE (0.1 - 0.26)
   * Bonus para piezas pequeñas (más probable que sean tornillos/tuercas)
   */
  const sizeScore = detection.sizeKey === "tiny" 
    ? 0.26 
    : detection.sizeKey === "small" 
      ? 0.22 
      : 0.1;
  
  /**
   * SOURCE SCORE (0.06 - 0.14)
   * Bonus para detecciones de tile/zoom (mayor resolución y precisión)
   */
  const sourceScore = detection.source === "tile" || detection.source === "zoom" 
    ? 0.14 
    : 0.06;
  
  /**
   * TONE SCORE (0.03 - 0.16)
   * Bonus para tonos clasificados como metálicos
   */
  const toneScore = colorFeatures.toneLabel.startsWith("metal") 
    ? 0.16 
    : 0.03;
  
  /**
   * ELONGATION SCORE (0.04 - 0.2)
   * Bonus progresivo para formas alargadas (típicas de tornillería)
   */
  const elongationScore = elongation >= 3 
    ? 0.2 
    : elongation >= 2 
      ? 0.16 
      : elongation >= 1.3 
        ? 0.1 
        : 0.04;
  
  /** Puntuación total combinando todos los factores */
  const score = geometryScore + sizeScore + sourceScore + toneScore + elongationScore;

  /**
   * UMBRAL DE CLASIFICACIÓN
   * Si la puntuación no alcanza 0.62, descartamos la detección
   * Esto filtra falsos positivos de COCO-SSD que no son piezas industriales
   */
  if (score < 0.62) {
    return null;
  }

  /**
   * Retorna el objeto con toda la información de la pieza identificada
   */
  return {
    elementType: "pieza",                                    /** Tipo de elemento detectado */
    elementLabel: "pieza",                                   /** Etiqueta legible para UI */
    orientation,                                             /** Orientación visual */
    axisDirection,                                           /** Dirección del eje principal */
    shapeHint: getShapeHint(elongation, detection.sizeKey),  /** Descripción de forma */
    elongation,                                              /** Ratio de elongación numérico */
    majorSidePx: Math.max(width, height),                    /** Dimensión mayor en px */
    minorSidePx: Math.max(Math.min(width, height), 1),       /** Dimensión menor en px */
    orientationAngle: axisDirection === "horizontal"         /** Ángulo aproximado */
      ? 0 
      : axisDirection === "vertical" 
        ? 90 
        : 18,
    pieceConfidence: Math.min(0.99, Number(score.toFixed(2))), /** Confianza 0-0.99 */
    toneLabel: colorFeatures.toneLabel,                      /** Clasificación de tono */
  };
}
