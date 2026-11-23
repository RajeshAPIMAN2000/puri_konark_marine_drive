/**
 * Opens the device print dialog for QR print sheets.
 * Uses react-native-print when linked; otherwise falls back to Share.
 */
import { Platform, Share } from "react-native";

const escapeHtml = (value) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

export const buildQrPrintHtml = (items = []) => {
    const cards = (items || [])
        .map((item) => {
            const code = escapeHtml(item.code || "");
            const location = escapeHtml(item.locationName || item.place || "—");
            const zone =
                item.zoneName && item.zoneName !== item.zoneCode
                    ? escapeHtml(item.zoneName)
                    : `Zone ${escapeHtml(item.zoneCode || item.zone || "—")}`;
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                item.code || ""
            )}`;
            return `<div class="card">
  <img class="qr" src="${qrUrl}" alt="${code}" />
  <div class="code">${code}</div>
  <div class="loc">${location}</div>
  <div class="zone">${zone}</div>
</div>`;
        })
        .join("\n");

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PKMD QR Print Sheet</title>
  <style>
    @page { margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #F2F7FD;
      color: #0B1F3A;
    }
    h1 {
      font-size: 16px;
      margin: 0 0 12px;
      text-align: center;
    }
    .grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: flex-start;
    }
    .card {
      width: calc(33.333% - 8px);
      min-width: 140px;
      background: #fff;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 10px 8px;
      text-align: center;
      page-break-inside: avoid;
    }
    .qr {
      width: 100%;
      max-width: 160px;
      height: auto;
      aspect-ratio: 1 / 1;
      object-fit: contain;
      margin: 0 auto 8px;
      display: block;
    }
    .code { font-size: 11px; font-weight: 800; margin-bottom: 4px; }
    .loc { font-size: 12px; font-weight: 700; line-height: 1.25; margin-bottom: 4px; }
    .zone { font-size: 11px; color: #8A94A6; }
    @media print {
      body { background: #fff; padding: 0; }
      .card { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>PURI–KONARK MARINE DRIVE · QR Codes</h1>
  <div class="grid">
    ${cards || "<p>No QR codes to print.</p>"}
  </div>
</body>
</html>`;
};

export const printQrSheet = async (items = []) => {
    const html = buildQrPrintHtml(items);
    try {
        // eslint-disable-next-line global-require
        const RNPrint = require("react-native-print").default;
        if (RNPrint?.print) {
            await RNPrint.print({
                html,
                jobName: "PKMD QR Print Sheet",
            });
            return { ok: true };
        }
    } catch (_) {
        // Native module may be missing until rebuild
    }

    try {
        const text = (items || [])
            .map(
                (item) =>
                    `${item.code}\n${item.locationName || item.place}\nZone ${item.zoneCode || item.zone || "—"}`
            )
            .join("\n\n");
        await Share.share({
            title: "PKMD QR Print Sheet",
            message:
                Platform.OS === "ios"
                    ? text
                    : `${text}\n\nOpen this in a browser or printer app to print.`,
        });
        return { ok: true, fallback: "share" };
    } catch (e) {
        return { ok: false, message: e?.message || "Unable to open print dialog" };
    }
};
