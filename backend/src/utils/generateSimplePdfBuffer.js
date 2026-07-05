function escapePdfText(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapText(value, maxLength = 70) {
  const text = String(value || "").trim();

  if (!text) {
    return ["-"];
  }

  const words = text.split(/\s+/);
  const lines = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;

    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
      return;
    }

    current = next;
  });

  if (current) {
    lines.push(current);
  }

  return lines;
}

function formatCurrency(value) {
  return Number(value || 0).toFixed(2);
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const raw = String(value).trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/);

  if (match) {
    const [, year, month, day, hour, minute, second = "00"] = match;
    return `${day}/${month}/${year}, ${hour}:${minute}:${second}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  const second = String(date.getUTCSeconds()).padStart(2, "0");
  return `${day}/${month}/${year}, ${hour}:${minute}:${second}`;
}

function buildTextBlock(operations, x, y, lines, options = {}) {
  const font = options.font || "F1";
  const size = options.size || 12;
  const lineHeight = options.lineHeight || 15;
  const color = options.color || [0.09, 0.12, 0.2];
  let currentY = y;

  lines.forEach((line) => {
    operations.push("BT");
    operations.push(`/${font} ${size} Tf`);
    operations.push(`${color.join(" ")} rg`);
    operations.push(`${x} ${currentY} Td`);
    operations.push(`(${escapePdfText(line)}) Tj`);
    operations.push("ET");
    currentY -= lineHeight;
  });

  return currentY;
}

function drawFilledRect(operations, x, y, width, height, rgb) {
  operations.push(`${rgb.join(" ")} rg`);
  operations.push(`${x} ${y} ${width} ${height} re f`);
}

function drawStrokeRect(operations, x, y, width, height, rgb, lineWidth = 1) {
  operations.push(`${lineWidth} w`);
  operations.push(`${rgb.join(" ")} RG`);
  operations.push(`${x} ${y} ${width} ${height} re S`);
}

function drawLine(operations, x1, y1, x2, y2, rgb, lineWidth = 1) {
  operations.push(`${lineWidth} w`);
  operations.push(`${rgb.join(" ")} RG`);
  operations.push(`${x1} ${y1} m ${x2} ${y2} l S`);
}

function buildPdfBuffer(objects) {
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += object;
  });

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

function buildBinaryPdfBuffer(objectBuffers) {
  let pdfBuffer = Buffer.from("%PDF-1.4\n", "binary");
  const offsets = [0];

  objectBuffers.forEach((objectBuffer) => {
    offsets.push(pdfBuffer.length);
    pdfBuffer = Buffer.concat([pdfBuffer, objectBuffer]);
  });

  const xrefOffset = pdfBuffer.length;
  let xref = `xref\n0 ${objectBuffers.length + 1}\n0000000000 65535 f \n`;

  for (let index = 1; index < offsets.length; index += 1) {
    xref += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  xref += `trailer\n<< /Size ${objectBuffers.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.concat([pdfBuffer, Buffer.from(xref, "binary")]);
}

function generateSimplePdfBuffer(contentStream) {
  const contentLength = Buffer.byteLength(contentStream, "utf8");
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n",
    `6 0 obj\n<< /Length ${contentLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
  ];

  return buildPdfBuffer(objects);
}

function parseSignatureDataUrl(dataUrl = "") {
  const match = String(dataUrl || "").match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (!match) {
    return null;
  }

  return {
    mimeType: match[1].toLowerCase(),
    buffer: Buffer.from(match[2], "base64"),
  };
}

function getJpegSize(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  let offset = 2;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];

    if (marker === 0xd9 || marker === 0xda) {
      break;
    }

    const segmentLength = buffer.readUInt16BE(offset + 2);

    if (segmentLength < 2) {
      break;
    }

    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      ![0xc4, 0xc8, 0xcc].includes(marker)
    ) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }

    offset += 2 + segmentLength;
  }

  return null;
}

function generateAssinaturaRecebimentoPdfBuffer({ ordem, assinatura }) {
  const operations = [];
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 42;
  const contentWidth = pageWidth - margin * 2;
  let y = 800;
  const navy = [0.07, 0.12, 0.24];
  const border = [0.78, 0.82, 0.9];
  const ink = [0.09, 0.12, 0.2];
  const soft = [0.38, 0.43, 0.54];
  const white = [1, 1, 1];
  const signatureParsed = parseSignatureDataUrl(assinatura?.assinatura_data_url);
  const signatureSize = signatureParsed?.mimeType === "image/jpeg" ? getJpegSize(signatureParsed.buffer) : null;

  drawFilledRect(operations, 0, 0, pageWidth, pageHeight, [1, 1, 1]);
  drawFilledRect(operations, 0, 760, pageWidth, 82, navy);
  drawStrokeRect(operations, margin, 112, contentWidth, 616, border, 0.8);
  drawFilledRect(operations, margin, 686, contentWidth, 40, [0.97, 0.97, 0.99]);

  y = buildTextBlock(operations, margin, 804, ["JEBIL OFICINA"], {
    font: "F2",
    size: 22,
    lineHeight: 24,
    color: white,
  });
  buildTextBlock(operations, margin, y - 4, ["Contrato de recebimento das fotos da motocicleta"], {
    font: "F1",
    size: 11,
    lineHeight: 14,
    color: white,
  });

  buildTextBlock(operations, margin + 12, 702, [`OS: ${ordem?.numero_os || "-"}`], {
    font: "F2",
    size: 12,
    color: ink,
  });
  buildTextBlock(operations, 360, 702, [`Aceite em: ${formatDateTime(assinatura?.assinado_em || new Date())}`], {
    font: "F1",
    size: 10,
    color: ink,
  });

  const motoNome = `${ordem?.motocicleta_marca ? `${ordem.motocicleta_marca} ` : ""}${ordem?.motocicleta_modelo || "-"}`.trim();
  y = 664;
  y = buildTextBlock(operations, margin, y, [`Cliente: ${assinatura?.nome_cliente || ordem?.cliente_nome || "-"}`], {
    font: "F2",
    size: 16,
    lineHeight: 20,
    color: ink,
  });
  y = buildTextBlock(operations, margin, y - 2, [
    `Telefone: ${assinatura?.telefone_cliente || ordem?.cliente_telefone || "-"}`,
    `Motocicleta: ${motoNome} - ${ordem?.motocicleta_placa || "-"}`,
    `Orcamento de referencia: ${assinatura?.orcamento_referencia || "Ainda nao gerado"}`,
  ], { font: "F1", size: 11, lineHeight: 15, color: ink });

  y -= 4;
  drawLine(operations, margin, y, margin + contentWidth, y, border, 0.8);
  y -= 24;

  y = buildTextBlock(operations, margin, y, [assinatura?.termo_titulo || "Termo de recebimento"], {
    font: "F2",
    size: 12,
    lineHeight: 16,
    color: ink,
  });
  y = buildTextBlock(operations, margin, y - 6, wrapText(assinatura?.termo_texto || "-", 82), {
    font: "F1",
    size: 11,
    lineHeight: 15,
    color: ink,
  });

  y -= 10;
  drawLine(operations, margin, y, margin + contentWidth, y, border, 0.8);
  y -= 24;

  y = buildTextBlock(operations, margin, y, ["Confirmacoes registradas"], {
    font: "F2",
    size: 12,
    lineHeight: 16,
    color: ink,
  });
  y = buildTextBlock(operations, margin, y - 6, [
    `${assinatura?.recebeu_fotos_whatsapp ? "[X]" : "[ ]"} Cliente confirma o recebimento das fotos no WhatsApp.`,
    `${assinatura?.ciente_possivel_cobranca ? "[X]" : "[ ]"} Cliente ciente da possivel cobranca de diagnostico e/ou orcamento.`,
  ], {
    font: "F1",
    size: 11,
    lineHeight: 16,
    color: ink,
  });

  const signatureBoxX = margin;
  const signatureBoxY = 160;
  const signatureBoxWidth = 250;
  const signatureBoxHeight = 120;

  drawStrokeRect(operations, signatureBoxX, signatureBoxY, signatureBoxWidth, signatureBoxHeight, border, 0.8);
  buildTextBlock(operations, signatureBoxX + 14, signatureBoxY + signatureBoxHeight - 18, ["Assinatura do cliente"], {
    font: "F2",
    size: 11,
    lineHeight: 14,
    color: ink,
  });
  buildTextBlock(operations, signatureBoxX + 14, signatureBoxY - 16, [
    `Registrado em ${formatDateTime(assinatura?.assinado_em || new Date())}`,
  ], {
    font: "F1",
    size: 9,
    lineHeight: 12,
    color: soft,
  });

  if (signatureParsed && signatureSize) {
    const maxWidth = signatureBoxWidth - 28;
    const maxHeight = signatureBoxHeight - 34;
    const scale = Math.min(maxWidth / signatureSize.width, maxHeight / signatureSize.height);
    const drawWidth = signatureSize.width * scale;
    const drawHeight = signatureSize.height * scale;
    const drawX = signatureBoxX + 14 + (maxWidth - drawWidth) / 2;
    const drawY = signatureBoxY + 12 + (maxHeight - drawHeight) / 2;
    operations.push("q");
    operations.push(`${drawWidth} 0 0 ${drawHeight} ${drawX} ${drawY} cm`);
    operations.push("/Im1 Do");
    operations.push("Q");
  } else {
    buildTextBlock(operations, signatureBoxX + 14, signatureBoxY + 46, [
      "Assinatura digital registrada",
      "na OS do atendimento.",
    ], {
      font: "F1",
      size: 11,
      lineHeight: 16,
      color: soft,
    });
  }

  drawLine(operations, 336, 180, 520, 180, border, 0.8);
  buildTextBlock(operations, 336, 166, ["Recepcao responsavel pelo aceite"], {
    font: "F1",
    size: 9,
    lineHeight: 11,
    color: soft,
  });
  buildTextBlock(operations, 336, 196, [ordem?.usuario_abertura_nome || assinatura?.usuario_responsavel_nome || "-"], {
    font: "F2",
    size: 11,
    lineHeight: 13,
    color: ink,
  });

  const contentStream = operations.join("\n");
  const contentLength = Buffer.byteLength(contentStream, "utf8");
  const imageLength = signatureParsed && signatureSize ? signatureParsed.buffer.length : 0;
  const resources = signatureParsed && signatureSize
    ? "<< /Font << /F1 4 0 R /F2 5 0 R >> /XObject << /Im1 6 0 R >> >>"
    : "<< /Font << /F1 4 0 R /F2 5 0 R >> >>";
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources ${resources} /Contents ${signatureParsed && signatureSize ? "7 0 R" : "6 0 R"} >>\nendobj\n`,
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n",
  ];

  if (signatureParsed && signatureSize) {
    return buildBinaryPdfBuffer([
      Buffer.from("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n", "binary"),
      Buffer.from("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n", "binary"),
      Buffer.from(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources ${resources} /Contents 7 0 R >>\nendobj\n`, "binary"),
      Buffer.from("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n", "binary"),
      Buffer.from("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n", "binary"),
      Buffer.concat([
        Buffer.from(`6 0 obj\n<< /Type /XObject /Subtype /Image /Width ${signatureSize.width} /Height ${signatureSize.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageLength} >>\nstream\n`, "binary"),
        signatureParsed.buffer,
        Buffer.from("\nendstream\nendobj\n", "binary"),
      ]),
      Buffer.from(`7 0 obj\n<< /Length ${contentLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`, "binary"),
    ]);
  }

  objects.push(`6 0 obj\n<< /Length ${contentLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`);
  return buildPdfBuffer(objects);
}

function generateOrcamentoPdfBuffer({ ordem, orcamento, itens }) {
  const operations = [];
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 42;
  const contentWidth = pageWidth - margin * 2;
  let y = 800;
  const navy = [0.07, 0.12, 0.24];
  const border = [0.78, 0.82, 0.9];
  const ink = [0.09, 0.12, 0.2];
  const white = [1, 1, 1];

  drawFilledRect(operations, 0, 0, pageWidth, pageHeight, [1, 1, 1]);
  drawFilledRect(operations, 0, 760, pageWidth, 82, navy);
  drawFilledRect(operations, margin, 716, contentWidth, 34, [0.97, 0.97, 0.99]);
  drawStrokeRect(operations, margin, 112, contentWidth, 602, border, 0.8);

  y = buildTextBlock(operations, margin, 804, ["JEBIL OFICINA"], {
    font: "F2",
    size: 22,
    lineHeight: 24,
    color: white,
  });
  buildTextBlock(operations, margin, y - 4, ["Orcamento comercial"], {
    font: "F1",
    size: 11,
    lineHeight: 14,
    color: white,
  });

  buildTextBlock(operations, margin + 12, 728, [`Numero externo: ${orcamento.numero_externo || "-"}`], {
    font: "F2",
    size: 12,
    color: ink,
  });
  buildTextBlock(operations, 390, 728, [`Emitido em: ${formatDateTime(new Date())}`], {
    font: "F1",
    size: 10,
    color: ink,
  });

  const motoNome = `${ordem.motocicleta_marca ? `${ordem.motocicleta_marca} ` : ""}${ordem.motocicleta_modelo || "-"}`.trim();
  y = 690;
  y = buildTextBlock(operations, margin, y, [`Cliente: ${ordem.cliente_nome || "-"}`], { font: "F2", size: 16, lineHeight: 20 });
  y = buildTextBlock(operations, margin, y - 2, [
    `Moto: ${motoNome}`,
    `Placa: ${ordem.motocicleta_placa || "-"}    Cor: ${ordem.motocicleta_cor || "-"}    Prazo: ${formatDateTime(ordem.data_prometida)}`,
  ], { font: "F1", size: 11, lineHeight: 15, color: ink });

  drawLine(operations, margin, y - 4, margin + contentWidth, y - 4, border, 0.8);
  y -= 24;

  y = buildTextBlock(operations, margin, y, ["Queixa do cliente"], {
    font: "F2",
    size: 12,
    lineHeight: 15,
    color: ink,
  });
  y = buildTextBlock(operations, margin, y - 2, wrapText(ordem.queixa_principal || "-"), {
    font: "F1",
    size: 11,
    lineHeight: 14,
    color: ink,
  });

  y -= 10;
  drawLine(operations, margin, y, margin + contentWidth, y, border, 0.8);
  y -= 22;

  buildTextBlock(operations, margin, y, ["Itens do orcamento"], {
    font: "F2",
    size: 12,
    lineHeight: 15,
    color: ink,
  });
  y -= 28;

  drawFilledRect(operations, margin, y - 2, contentWidth, 24, [0.94, 0.95, 0.98]);
  buildTextBlock(operations, margin + 8, y + 13, ["Descricao"], { font: "F2", size: 10, lineHeight: 12, color: ink });
  buildTextBlock(operations, 360, y + 13, ["Qtd"], { font: "F2", size: 10, lineHeight: 12, color: ink });
  buildTextBlock(operations, 410, y + 13, ["Unit."], { font: "F2", size: 10, lineHeight: 12, color: ink });
  buildTextBlock(operations, 485, y + 13, ["Total"], { font: "F2", size: 10, lineHeight: 12, color: ink });
  y -= 12;

  itens.forEach((item, index) => {
    const itemLines = wrapText(`${String(index + 1).padStart(2, "0")} - ${item.descricao || "-"}`, 44);
    const rowHeight = Math.max(24, itemLines.length * 14 + (item.observacao ? 18 : 0));

    drawLine(operations, margin, y, margin + contentWidth, y, border, 0.5);
    y -= 16;

    buildTextBlock(operations, margin + 8, y, itemLines, { font: "F1", size: 11, lineHeight: 14, color: ink });
    buildTextBlock(operations, 356, y, [String(item.quantidade || 0)], { font: "F1", size: 11, lineHeight: 14, color: ink });
    buildTextBlock(operations, 404, y, [`R$ ${formatCurrency(item.valor_peca || 0)}`], { font: "F1", size: 11, lineHeight: 14, color: ink });
    buildTextBlock(operations, 478, y, [`R$ ${formatCurrency(item.valor_total || 0)}`], { font: "F2", size: 11, lineHeight: 14, color: ink });

    let lowestY = y - itemLines.length * 14;
    if (item.observacao) {
      lowestY = buildTextBlock(operations, margin + 18, lowestY + 2, wrapText(`Obs: ${item.observacao}`, 56), {
        font: "F1",
        size: 9,
        lineHeight: 12,
        color: ink,
      });
    }

    y -= rowHeight;
  });

  drawLine(operations, margin, y, margin + contentWidth, y, border, 0.8);
  y -= 34;

  buildTextBlock(operations, 332, y + 10, [`TOTAL GERAL: R$ ${formatCurrency(orcamento.valor_total || 0)}`], {
    font: "F2",
    size: 13,
    lineHeight: 14,
    color: ink,
  });

  y -= 56;

  if (orcamento.observacoes) {
    y = buildTextBlock(operations, margin, y, ["Observacoes finais"], {
      font: "F2",
      size: 12,
      lineHeight: 15,
      color: ink,
    });
    buildTextBlock(operations, margin, y - 4, wrapText(orcamento.observacoes, 76), {
      font: "F1",
      size: 11,
      lineHeight: 14,
      color: ink,
    });
  }

  return generateSimplePdfBuffer(operations.join("\n"));
}

module.exports = {
  generateOrcamentoPdfBuffer,
  generateAssinaturaRecebimentoPdfBuffer,
};
