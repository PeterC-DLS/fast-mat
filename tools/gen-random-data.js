import { addMatrixFlatSimple, addMatrixFunc } from "../mat.js";
import {
  getMat,
  getMatFlat,
  normalIntSampler,
  normalSampler,
} from "../utils/random-util.js";

function toTitleCase(str) {
  const [first, ...rest] = str;
  return first.toUpperCase() + rest.join("");
}

function serializeArray(array, constructor) {
  if (constructor.name === "Array") {
    return `[${
      array.map((x) => Array.isArray(x) ? serializeArray(x, constructor) : x)
        .join(", ")
    }]`;
  }
  if (!Array.isArray(array)) {
    array = array.data;
  }
  return `new ${constructor.name}([${array.join(", ")}])`;
}

function getPrefix(rows, cols) {
  return cols === rows ? `mat${rows}` : `matRect${rows}`; // rectangular (non-square) matrices
}

function generateSizedData(
  type,
  sampler,
  constructor,
  isFlat,
  size,
  cols,
) {
  const prefix = `export const ${getPrefix(size, cols)}`;

  const a = isFlat ? getMatFlat(size, cols, sampler) : getMat(size, cols, sampler);
  const b = isFlat ? getMatFlat(size, cols, sampler) : getMat(size, cols, sampler);
  const r = isFlat ? addMatrixFlatSimple(a, b, constructor) : addMatrixFunc(a, b);

  return `${prefix}A${toTitleCase(type)} = ${serializeArray(a, constructor)};
${prefix}B${toTitleCase(type)} = ${serializeArray(b, constructor)};
${prefix}Result${toTitleCase(type)} = ${serializeArray(r, constructor)}

`;
}

function writeTestFile(type, sampler, constructor, isFlat = false) {
  let out = ""; //lol string buffer
  const sizes = [1, 2, 4, 8, 16, 32, 64, 128, 256];

  for (const size of sizes) {
    out += generateSizedData(type, sampler, constructor, isFlat, size, size);
  }

  const lastShape = [sizes.at(-1), sizes.at(-1) / 2];
  out += generateSizedData(
    type,
    sampler,
    constructor,
    isFlat,
    lastShape[0],
    lastShape[1],
  );

  Deno.writeTextFileSync(`./temp/data/mat-data-${type.toLowerCase()}.js`, out);
}

Deno.mkdirSync("./temp/data", { recursive: true });
writeTestFile("num", normalSampler(0, 1e9), Array, false);
writeTestFile(
  "i32",
  normalIntSampler(0, Number.MIN_SAFE_INTEGER / 6),
  Int32Array,
  true,
);
writeTestFile("f64", normalSampler(0, 1e9), Float64Array, true);
writeTestFile(
  "f32",
  normalSampler(0, 1e4, (x) => Math.fround(x)),
  Float32Array,
  true,
);
