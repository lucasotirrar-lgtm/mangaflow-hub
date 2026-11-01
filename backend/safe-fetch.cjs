"use strict";

const dns = require("node:dns").promises;
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const http = require("node:http");
const https = require("node:https");

const DEFAULT_ALLOWED_DOMAINS = [
  "uploads.mangadex.org",
  "cmdxd98sb0x3yprd.mangadex.network",
  "meo.comick.pictures",
  "meo3.comick.pictures",
  "meo2.comick.pictures",
  "comick.app",
  "comick.live",
  "comick.io",
];

function isPrivateIp(ip) {
  if (!ip) return true;
  // IPv4 checks
  if (ip === "127.0.0.1" || ip.startsWith("127.")) return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("169.254.")) return true; // Link-local & cloud metadata
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;

  // IPv6 checks
  if (ip === "::1" || ip === "::") return true;
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80")) return true;

  return false;
}

async function validateUrlSafety(urlStr, allowedDomains = DEFAULT_ALLOWED_DOMAINS) {
  let parsed;
  try {
    parsed = new URL(urlStr);
  } catch {
    throw new Error("URL inválida");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`Protocolo não permitido: ${parsed.protocol}`);
  }

  const hostname = parsed.hostname.toLowerCase();

  // Allowlist match (exact or subdomain)
  const isAllowed = allowedDomains.some(
    (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`),
  );
  if (!isAllowed) {
    throw new Error(`Host não autorizado pela allowlist: ${hostname}`);
  }

  // DNS resolution & private IP protection
  const { address } = await dns.lookup(hostname, { verbatim: true });
  if (isPrivateIp(address)) {
    throw new Error(`SSRF bloqueado: IP de destino restrito (${address})`);
  }

  return { parsed, ip: address };
}

function detectImageType(buffer) {
  if (!buffer || buffer.length < 12) return null;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return "image/png";
  }
  // WebP: RIFF .... WEBP
  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  // AVIF: ....ftypavif
  if (buffer.toString("ascii", 4, 12) === "ftypavif") {
    return "image/avif";
  }
  return null;
}

/**
 * Safely stream an image from a validated remote source,
 * computes its SHA-256 and writes it atomically to destination.
 */
async function safeDownloadImage({
  url,
  destinationPath,
  headers = {},
  maxSizeBytes = 25 * 1024 * 1024, // 25 MB max
  timeoutMs = 20000,
  allowedDomains = DEFAULT_ALLOWED_DOMAINS,
}) {
  const { parsed } = await validateUrlSafety(url, allowedDomains);

  const tempPath = `${destinationPath}.tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });

  const client = parsed.protocol === "https:" ? https : http;
  const requestHeaders = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)",
    Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    ...headers,
  };

  return new Promise((resolve, reject) => {
    let resolved = false;
    const cleanup = () => {
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch {}
    };

    const req = client.get(url, { headers: requestHeaders, timeout: timeoutMs }, (res) => {
      // Handle redirect safely (up to 3 hops)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        cleanup();
        const nextUrl = new URL(res.headers.location, url).toString();
        return resolve(
          safeDownloadImage({
            url: nextUrl,
            destinationPath,
            headers,
            maxSizeBytes,
            timeoutMs,
            allowedDomains,
          }),
        );
      }

      if (res.statusCode !== 200) {
        cleanup();
        return reject(new Error(`Download falhou com HTTP ${res.statusCode}`));
      }

      const hash = crypto.createHash("sha256");
      const fileStream = fs.createWriteStream(tempPath);
      let totalBytes = 0;
      let headBuffer = Buffer.alloc(0);

      res.on("data", (chunk) => {
        totalBytes += chunk.length;
        if (totalBytes > maxSizeBytes) {
          req.destroy(new Error(`Tamanho de arquivo excedeu o limite de ${maxSizeBytes} bytes`));
          return;
        }
        if (headBuffer.length < 32) {
          headBuffer = Buffer.concat([headBuffer, chunk]).subarray(0, 32);
        }
        hash.update(chunk);
        fileStream.write(chunk);
      });

      res.on("end", () => {
        fileStream.end(async () => {
          const detectedMime = detectImageType(headBuffer);
          if (!detectedMime) {
            cleanup();
            return reject(new Error("Formato de arquivo inválido ou não reconhecido como imagem"));
          }

          const sha256 = hash.digest("hex");
          try {
            // Atomic rename to final destination
            fs.renameSync(tempPath, destinationPath);
            resolved = true;
            resolve({
              sha256,
              byteSize: totalBytes,
              mimeType: detectedMime,
              internalPath: destinationPath,
            });
          } catch (err) {
            cleanup();
            reject(err);
          }
        });
      });

      res.on("error", (err) => {
        fileStream.destroy();
        cleanup();
        reject(err);
      });
    });

    req.on("error", (err) => {
      cleanup();
      reject(err);
    });

    req.on("timeout", () => {
      req.destroy(new Error("Timeout ao transferir asset"));
      cleanup();
    });
  });
}

module.exports = {
  DEFAULT_ALLOWED_DOMAINS,
  detectImageType,
  isPrivateIp,
  safeDownloadImage,
  validateUrlSafety,
};
