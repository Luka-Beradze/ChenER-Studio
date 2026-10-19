import {
  type DiagramState,
  type ERShape,
  type ERLine,
  type Point,
  SHAPE_STYLE_CONSTANTS,
  computeLinePoints,
  computeLineLabelPositions,
  getDiagramBounds,
} from './erModel.ts';

export interface ExportOptions {
  scale?: number;
  backgroundColor?: string; // e.g., '#FFFFFF' or 'transparent'
  targetFrameId?: string;
  includeFrames?: boolean;
}

function drawArrowheadCanvas(
  ctx: CanvasRenderingContext2D,
  tip: Point,
  angle: number,
  style: ERLine['endArrow']
) {
  if (style === 'none') return;
  const size = 11;
  ctx.save();
  ctx.translate(tip.x, tip.y);
  ctx.rotate(angle);
  ctx.strokeStyle = '#111827';
  ctx.fillStyle = '#111827';
  ctx.lineWidth = 1.6;

  if (style === 'arrow') {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size * 0.52);
    ctx.lineTo(-size * 0.78, 0);
    ctx.lineTo(-size, size * 0.52);
    ctx.closePath();
    ctx.fill();
  } else if (style === 'triangle') {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size * 0.55);
    ctx.lineTo(-size, size * 0.55);
    ctx.closePath();
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.stroke();
  } else if (style === 'open') {
    ctx.beginPath();
    ctx.moveTo(-size, -size * 0.52);
    ctx.lineTo(0, 0);
    ctx.lineTo(-size, size * 0.52);
    ctx.stroke();
  } else if (style === 'circle') {
    ctx.beginPath();
    ctx.arc(-5, 0, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawTextMultiline(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  opts: {
    fontSize: number;
    color: string;
    isBold: boolean;
    isUnderline: boolean;
    align?: CanvasTextAlign;
  }
) {
  if (!text) return;
  const lines = text.split('\n');
  const weight = opts.isBold ? '700' : '500';
  ctx.font = `${weight} ${opts.fontSize}px "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.fillStyle = opts.color;
  ctx.textAlign = opts.align ?? 'center';
  ctx.textBaseline = 'middle';

  const lineHeight = opts.fontSize * 1.28;
  const totalHeight = (lines.length - 1) * lineHeight;
  const startY = cy - totalHeight / 2;

  lines.forEach((lineStr, idx) => {
    const y = startY + idx * lineHeight;
    ctx.fillText(lineStr, cx, y);
    if (opts.isUnderline && lineStr.trim().length > 0) {
      const metrics = ctx.measureText(lineStr);
      const w = metrics.width;
      const xStart =
        opts.align === 'left' ? cx : opts.align === 'right' ? cx - w : cx - w / 2;
      ctx.save();
      ctx.strokeStyle = opts.color;
      ctx.lineWidth = Math.max(1.2, opts.fontSize * 0.08);
      ctx.beginPath();
      ctx.moveTo(xStart, y + opts.fontSize * 0.44);
      ctx.lineTo(xStart + w, y + opts.fontSize * 0.44);
      ctx.stroke();
      ctx.restore();
    }
  });
}

export function renderDiagramToCanvas(
  state: DiagramState,
  options: ExportOptions = {}
): HTMLCanvasElement {
  const scale = options.scale ?? 2;
  const bounds = getDiagramBounds(state, 44, options.targetFrameId);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bounds.width * scale);
  canvas.height = Math.round(bounds.height * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.save();
  ctx.scale(scale, scale);

  if (options.backgroundColor && options.backgroundColor !== 'transparent') {
    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, 0, bounds.width, bounds.height);
  }

  ctx.translate(-bounds.x, -bounds.y);

  const shapeMap = new Map<string, ERShape>();
  for (const s of state.shapes) {
    shapeMap.set(s.id, s);
  }

  // 1. Render Frames first (bottom layer)
  if (options.includeFrames !== false) {
    for (const s of state.shapes) {
      if (s.type !== 'frame') continue;
      ctx.save();
      ctx.fillStyle = 'rgba(248, 250, 252, 0.55)';
      ctx.strokeStyle = s.frameColor || '#64748B';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.roundRect(s.x, s.y, s.width, s.height, 8);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);

      // Header tab
      if (s.text) {
        ctx.font = `600 ${s.fontSize}px "Plus Jakarta Sans", sans-serif`;
        const textWidth = ctx.measureText(s.text).width;
        ctx.fillStyle = '#F1F5F9';
        ctx.strokeStyle = s.frameColor || '#64748B';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(s.x + 12, s.y - 12, textWidth + 20, 24, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1E293B';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(s.text, s.x + 22, s.y);
      }
      ctx.restore();
    }
  }

  // 2. Render Lines
  for (const line of state.lines) {
    const source = shapeMap.get(line.sourceId);
    const target = shapeMap.get(line.targetId);
    if (!source || !target) continue;

    const pts = computeLinePoints(line, source, target);
    if (pts.length < 2) continue;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const tracePolyline = () => {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
    };

    if (line.isDouble) {
      // Draw thick outer dark stroke then crisp white inner stroke to create parallel double line
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 5.4;
      tracePolyline();
      ctx.stroke();

      ctx.strokeStyle =
        options.backgroundColor && options.backgroundColor !== 'transparent'
          ? options.backgroundColor
          : '#FFFFFF';
      ctx.lineWidth = 2.4;
      tracePolyline();
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 1.5;
      tracePolyline();
      ctx.stroke();
    }

    // Arrowheads
    const startAngle = Math.atan2(pts[0].y - pts[1].y, pts[0].x - pts[1].x);
    const endAngle = Math.atan2(
      pts[pts.length - 1].y - pts[pts.length - 2].y,
      pts[pts.length - 1].x - pts[pts.length - 2].x
    );
    drawArrowheadCanvas(ctx, pts[0], startAngle, line.startArrow);
    drawArrowheadCanvas(ctx, pts[pts.length - 1], endAngle, line.endArrow);

    // Line labels (start cardinality, middle role, end cardinality)
    const labelPos = computeLineLabelPositions(pts, line.labelPlacement, {
      start: line.startLabelOffset,
      middle: line.middleLabelOffset,
      end: line.endLabelOffset,
    });

    const drawLineLabelBadge = (text: string, pt: Point) => {
      if (!text.trim()) return;
      const lines = text.split('\n');
      const weight = line.isBold ? '700' : '500';
      ctx.font = `${weight} ${line.fontSize}px "Plus Jakarta Sans", sans-serif`;
      let maxW = 0;
      for (const l of lines) {
        maxW = Math.max(maxW, ctx.measureText(l).width);
      }
      const lineH = line.fontSize * 1.22;
      const boxW = maxW + 10;
      const boxH = lines.length * lineH + 4;

      if (line.labelPlacement === 'on-line') {
        ctx.fillStyle =
          options.backgroundColor && options.backgroundColor !== 'transparent'
            ? options.backgroundColor
            : '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(pt.x - boxW / 2, pt.y - boxH / 2, boxW, boxH, 4);
        ctx.fill();
      }

      drawTextMultiline(ctx, text, pt.x, pt.y, {
        fontSize: line.fontSize,
        color: '#0F172A',
        isBold: line.isBold,
        isUnderline: line.isUnderline,
      });
    };

    drawLineLabelBadge(line.startLabel, labelPos.start);
    drawLineLabelBadge(line.middleLabel, labelPos.middle);
    drawLineLabelBadge(line.endLabel, labelPos.end);

    ctx.restore();
  }

  // 3. Render Shapes (Entity, Relationship, Attribute, Generalization, Text)
  for (const s of state.shapes) {
    if (s.type === 'frame') continue;
    ctx.save();
    const cx = s.x + s.width / 2;
    const cy = s.y + s.height / 2;

    if (s.type === 'entity') {
      ctx.fillStyle = SHAPE_STYLE_CONSTANTS.entity.fill;
      ctx.strokeStyle = SHAPE_STYLE_CONSTANTS.entity.stroke;
      ctx.lineWidth = 1.5;
      ctx.fillRect(s.x, s.y, s.width, s.height);
      ctx.strokeRect(s.x, s.y, s.width, s.height);

      if (s.isDouble) {
        const inset = 5;
        ctx.strokeRect(
          s.x + inset,
          s.y + inset,
          Math.max(4, s.width - inset * 2),
          Math.max(4, s.height - inset * 2)
        );
      }

      drawTextMultiline(ctx, s.text, cx, cy, {
        fontSize: s.fontSize,
        color: SHAPE_STYLE_CONSTANTS.entity.textColor,
        isBold: s.isBold,
        isUnderline: s.isUnderline,
      });
    } else if (s.type === 'relationship') {
      const drawDiamond = (inset: number) => {
        ctx.beginPath();
        ctx.moveTo(cx, s.y + inset);
        ctx.lineTo(s.x + s.width - inset * 1.4, cy);
        ctx.lineTo(cx, s.y + s.height - inset);
        ctx.lineTo(s.x + inset * 1.4, cy);
        ctx.closePath();
      };

      ctx.fillStyle = SHAPE_STYLE_CONSTANTS.relationship.fill;
      ctx.strokeStyle = SHAPE_STYLE_CONSTANTS.relationship.stroke;
      ctx.lineWidth = 1.5;
      drawDiamond(0);
      ctx.fill();
      ctx.stroke();

      if (s.isDouble) {
        drawDiamond(5.5);
        ctx.stroke();
      }

      drawTextMultiline(ctx, s.text, cx, cy, {
        fontSize: s.fontSize,
        color: SHAPE_STYLE_CONSTANTS.relationship.textColor,
        isBold: s.isBold,
        isUnderline: s.isUnderline,
      });
    } else if (s.type === 'attribute') {
      const rx = s.width / 2;
      const ry = s.height / 2;
      ctx.fillStyle = SHAPE_STYLE_CONSTANTS.attribute.fill;
      ctx.strokeStyle = SHAPE_STYLE_CONSTANTS.attribute.stroke;
      ctx.lineWidth = 1.4;
      if (s.isDerived) {
        ctx.setLineDash([5, 4]);
      }

      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (s.isDouble) {
        const inset = 4.5;
        ctx.beginPath();
        ctx.ellipse(
          cx,
          cy,
          Math.max(2, rx - inset),
          Math.max(2, ry - inset),
          0,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }
      ctx.setLineDash([]);

      drawTextMultiline(ctx, s.text, cx, cy, {
        fontSize: s.fontSize,
        color: SHAPE_STYLE_CONSTANTS.attribute.textColor,
        isBold: s.isBold,
        isUnderline: s.isUnderline,
      });
    } else if (s.type === 'generalization') {
      const r = Math.min(s.width, s.height) / 2;
      ctx.fillStyle = SHAPE_STYLE_CONSTANTS.generalization.fill;
      ctx.strokeStyle = SHAPE_STYLE_CONSTANTS.generalization.stroke;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (s.isDouble) {
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(2, r - 4), 0, Math.PI * 2);
        ctx.stroke();
      }

      drawTextMultiline(ctx, s.text, cx, cy, {
        fontSize: s.fontSize,
        color: SHAPE_STYLE_CONSTANTS.generalization.textColor,
        isBold: s.isBold,
        isUnderline: s.isUnderline,
      });
    } else if (s.type === 'text') {
      drawTextMultiline(ctx, s.text, s.x + 8, cy, {
        fontSize: s.fontSize,
        color: SHAPE_STYLE_CONSTANTS.text.textColor,
        isBold: s.isBold,
        isUnderline: s.isUnderline,
        align: 'left',
      });
    }

    ctx.restore();
  }

  ctx.restore();
  return canvas;
}

export async function exportDiagramAsPng(
  state: DiagramState,
  filename = 'er-diagram.png',
  options: ExportOptions = {}
): Promise<void> {
  const canvas = renderDiagramToCanvas(state, {
    scale: options.scale ?? 2,
    backgroundColor: options.backgroundColor ?? '#FFFFFF',
    targetFrameId: options.targetFrameId,
  });

  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function copyDiagramPngToClipboard(
  state: DiagramState,
  options: ExportOptions = {}
): Promise<boolean> {
  const canvas = renderDiagramToCanvas(state, {
    scale: options.scale ?? 2,
    backgroundColor: options.backgroundColor ?? '#FFFFFF',
    targetFrameId: options.targetFrameId,
  });

  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      try {
        if (navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          resolve(true);
        } else {
          resolve(false);
        }
      } catch {
        resolve(false);
      }
    }, 'image/png');
  });
}

/**
 * Generates a self-contained, standards-compliant PDF 1.4 document embedding
 * the high-DPI rendered ER diagram image.
 */
export async function exportDiagramAsPdf(
  state: DiagramState,
  filename = 'er-diagram.pdf',
  options: ExportOptions = {}
): Promise<void> {
  const canvas = renderDiagramToCanvas(state, {
    scale: options.scale ?? 2,
    backgroundColor: '#FFFFFF',
    targetFrameId: options.targetFrameId,
  });

  const imgWidthPx = canvas.width;
  const imgHeightPx = canvas.height;
  // Convert to PDF points (72 pt per inch, at 2x scale)
  const pageWidthPt = Math.round(imgWidthPx / 2);
  const pageHeightPt = Math.round(imgHeightPx / 2);

  const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.96);
  const base64Data = jpegDataUrl.split(',')[1];
  const binaryImg = atob(base64Data);
  const imgBytes = new Uint8Array(binaryImg.length);
  for (let i = 0; i < binaryImg.length; i++) {
    imgBytes[i] = binaryImg.charCodeAt(i);
  }

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let byteLength = 0;

  const pushStr = (str: string) => {
    const encoded = encoder.encode(str);
    chunks.push(encoded);
    byteLength += encoded.byteLength;
  };

  const pushBytes = (bytes: Uint8Array) => {
    chunks.push(bytes);
    byteLength += bytes.byteLength;
  };

  const startObj = (id: number) => {
    offsets[id] = byteLength;
    pushStr(`${id} 0 obj\n`);
  };

  pushStr('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

  // 1: Catalog
  startObj(1);
  pushStr('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // 2: Pages
  startObj(2);
  pushStr('<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  // 3: Page
  startObj(3);
  pushStr(
    `<< /Type /Page /Parent 2 0 R /Resources << /XObject << /Im0 4 0 R >> >> /MediaBox [0 0 ${pageWidthPt} ${pageHeightPt}] /Contents 5 0 R >>\nendobj\n`
  );

  // 4: Image XObject (DCTDecode JPEG)
  startObj(4);
  pushStr(
    `<< /Type /XObject /Subtype /Image /Width ${imgWidthPx} /Height ${imgHeightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgBytes.byteLength} >>\nstream\n`
  );
  pushBytes(imgBytes);
  pushStr('\nendstream\nendobj\n');

  // 5: Content stream
  const contentStream = `q\n${pageWidthPt} 0 0 ${pageHeightPt} 0 0 cm\n/Im0 Do\nQ\n`;
  startObj(5);
  pushStr(`<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`);

  // Xref
  const xrefOffset = byteLength;
  pushStr('xref\n0 6\n0000000000 65535 f \n');
  for (let i = 1; i <= 5; i++) {
    const padded = String(offsets[i]).padStart(10, '0');
    pushStr(`${padded} 00000 n \n`);
  }

  pushStr(
    `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  );

  const blob = new Blob(chunks, { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
