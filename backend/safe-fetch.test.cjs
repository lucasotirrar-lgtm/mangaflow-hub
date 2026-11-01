"use strict";

const assert = require("node:assert");
const { isPrivateIp, detectImageType, validateUrlSafety } = require("./safe-fetch.cjs");

console.log("Iniciando testes de safe-fetch.cjs...");

// 1. Testes de detecção de IP privado (Anti-SSRF)
assert.strictEqual(isPrivateIp("127.0.0.1"), true, "127.0.0.1 deve ser privado");
assert.strictEqual(isPrivateIp("127.1.2.3"), true, "127.x deve ser privado");
assert.strictEqual(isPrivateIp("10.0.0.1"), true, "10.x deve ser privado");
assert.strictEqual(isPrivateIp("192.168.1.1"), true, "192.168.x deve ser privado");
assert.strictEqual(
  isPrivateIp("169.254.169.254"),
  true,
  "Cloud metadata 169.254.169.254 deve ser privado",
);
assert.strictEqual(isPrivateIp("172.16.0.1"), true, "172.16 deve ser privado");
assert.strictEqual(isPrivateIp("172.31.255.255"), true, "172.31 deve ser privado");
assert.strictEqual(isPrivateIp("::1"), true, "::1 (IPv6 localhost) deve ser privado");
assert.strictEqual(isPrivateIp("fe80::1"), true, "fe80:: link-local deve ser privado");

// IPs públicos válidos
assert.strictEqual(isPrivateIp("8.8.8.8"), false, "8.8.8.8 deve ser público");
assert.strictEqual(isPrivateIp("1.1.1.1"), false, "1.1.1.1 deve ser público");
assert.strictEqual(isPrivateIp("147.15.98.2"), false, "IP público do host deve ser público");
console.log("✔ Testes de IP anti-SSRF passaram.");

// 2. Testes de detecção de tipo de imagem por magic bytes
const jpegHeader = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);
assert.strictEqual(
  detectImageType(jpegHeader),
  "image/jpeg",
  "JPEG deve ser detectado corretamente",
);

const pngHeader = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);
assert.strictEqual(detectImageType(pngHeader), "image/png", "PNG deve ser detectado corretamente");

const webpHeader = Buffer.from("RIFF....WEBPVP8 ", "ascii");
assert.strictEqual(
  detectImageType(webpHeader),
  "image/webp",
  "WebP deve ser detectado corretamente",
);

const htmlContent = Buffer.from("<!DOCTYPE html><html><body>Error</body></html>", "utf-8");
assert.strictEqual(detectImageType(htmlContent), null, "HTML não deve ser aceito como imagem");

const phpContent = Buffer.from("<?php echo 'shell'; ?>", "utf-8");
assert.strictEqual(detectImageType(phpContent), null, "Script não deve ser aceito como imagem");
console.log("✔ Testes de magic bytes MIME passaram.");

// 3. Testes de validação de URL e allowlist
async function runUrlTests() {
  // Host não autorizado
  await assert.rejects(
    async () => {
      await validateUrlSafety("https://malicious-site.com/image.jpg");
    },
    /Host não autorizado pela allowlist/,
    "Host fora da allowlist deve ser rejeitado",
  );

  // Protocolo inválido (ex: file://, ftp://)
  await assert.rejects(
    async () => {
      await validateUrlSafety("file:///etc/passwd");
    },
    /Protocolo não permitido/,
    "Protocolo não HTTP/HTTPS deve ser rejeitado",
  );

  // Host permitido na allowlist com domínio válido (uploads.mangadex.org)
  const result = await validateUrlSafety("https://uploads.mangadex.org/covers/123.jpg");
  assert.ok(result.parsed);
  assert.ok(result.ip);
  assert.strictEqual(isPrivateIp(result.ip), false, "IP resolvido não deve ser privado");

  console.log("✔ Testes de validação de URL passaram.");
}

runUrlTests()
  .then(() => {
    console.log("TODOS OS TESTES DE safe-fetch.cjs PASSARAM COM SUCESSO!");
  })
  .catch((err) => {
    console.error("Erro nos testes:", err);
    process.exit(1);
  });
