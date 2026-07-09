const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const {
  buildRetentionCutoffDate,
  normalizeManagedUploadPath,
} = require("../src/services/orderRetentionService");

test("buildRetentionCutoffDate supports the photo retention period", () => {
  const cutoff = buildRetentionCutoffDate(3);
  const now = new Date();

  assert.equal(cutoff instanceof Date, true);
  assert.equal(Number.isNaN(cutoff.getTime()), false);
  assert.equal(cutoff.getTime() < now.getTime(), true);
});

test("buildRetentionCutoffDate supports the order retention period", () => {
  const cutoff = buildRetentionCutoffDate(12);
  const now = new Date();

  assert.equal(cutoff instanceof Date, true);
  assert.equal(Number.isNaN(cutoff.getTime()), false);
  assert.equal(cutoff.getTime() < now.getTime(), true);
});

test("normalizeManagedUploadPath accepts only managed upload folders", () => {
  const managedPhotoPath = normalizeManagedUploadPath("/uploads/fotos-entrada/teste.jpg");
  const managedPdfPath = normalizeManagedUploadPath("/uploads/assinaturas-pdf/contrato.pdf");
  const unmanagedPath = normalizeManagedUploadPath("/uploads/mecanicos/avatar.png");
  const externalPath = normalizeManagedUploadPath("../fora.txt");

  assert.equal(managedPhotoPath, path.resolve(process.cwd(), ".//uploads/fotos-entrada/teste.jpg"));
  assert.equal(managedPdfPath, path.resolve(process.cwd(), ".//uploads/assinaturas-pdf/contrato.pdf"));
  assert.equal(unmanagedPath, null);
  assert.equal(externalPath, null);
});
