const brandOptions = ["Honda", "Yamaha", "Suzuki", "Kawasaki", "BMW", "Dafra", "Shineray", "Royal Enfield", "Bajaj"];

const modelCatalog = {
  Honda: ["CG 125", "CG 150", "CG 160", "Biz 110i", "Biz 125", "PCX 160", "Pop 110i", "XRE 190", "XRE 300", "NXR 160 Bros"],
  Yamaha: ["Factor 125", "Factor 150", "Fazer 150", "Fazer 250", "Lander 250", "MT-03", "Neo 125", "XTZ 250"],
  Suzuki: ["Yes 125", "Intruder 125", "GSX 150"],
  Kawasaki: ["Ninja 300", "Z400", "Versys 300"],
  BMW: ["G 310 R", "G 310 GS", "F 850 GS"],
  Dafra: ["NH 190", "Citycom 300", "Next 300"],
  Shineray: ["Jet 125", "SHI 175", "Worker 125"],
  "Royal Enfield": ["Classic 350", "Meteor 350", "Himalayan 411"],
  Bajaj: ["Dominar 160", "Dominar 200", "Dominar 400"],
};

function getModelOptions(inputBrand = "", modelPrefix = "") {
  const normalizedBrand = brandOptions.find((brand) => brand.toLowerCase().startsWith(String(inputBrand || "").toLowerCase())) || inputBrand;
  const options = modelCatalog[normalizedBrand] || Object.values(modelCatalog).flat();

  if (!modelPrefix) {
    return options;
  }

  return options.filter((model) => model.toLowerCase().includes(modelPrefix.toLowerCase()));
}

export { brandOptions, getModelOptions };
