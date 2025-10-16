import { genMatAddBody, genMatAddFlatBody } from "../mat-dynamic.js";

const sizes = [1, 2, 4, 8, 16, 32, 64, 128, 256];

function genMatAddFunctionString(rows, cols) {
  return `export function addMatrix${rows}x${cols}Nested(a,b){\n${
    genMatAddBody(rows, cols)
  }\n}`;
}
function genMatAddFlatFunctionString(rows, cols) {
  return `export function addMatrix${rows}x${cols}Flat(a,b){\n\t${
    genMatAddFlatBody(rows, cols)
  }\n}`;
}

const lastShape = [sizes.at(-1), sizes.at(-1) / 2];

function genStaticMatAddFunctions(sizes, functionGenerator) {
  let out = ""; //lol string buffer

  for (const size of sizes) {
    out += functionGenerator(size, size) + "\n\n";
  }
  out += functionGenerator(lastShape[0], lastShape[1]) + "\n\n";

  return out;
}

function genDynamicMatAddFunctions(sizes) {
  return `import { genMatAddFunc, genMatAddFlatFunc } from "../../mat-dynamic.js";

${
    sizes.map((size) =>
      `export const addMatrix${size}x${size}Dyn = genMatAddFunc(${size},${size});`
    ).join(";\n")
  }
export const addMatrix${lastShape[0]}x${lastShape[1]}Dyn = genMatAddFunc(${
    lastShape[0]
  },${lastShape[1]});`;
}

function writeFile(type, content) {
  Deno.writeTextFileSync(
    `./temp/presized/mat-presized-${type.toLowerCase()}.js`,
    content,
  );
}

Deno.mkdirSync("./temp/presized", { recursive: true });
writeFile("nested", genStaticMatAddFunctions(sizes, genMatAddFunctionString));
writeFile("flat", genStaticMatAddFunctions(sizes, genMatAddFlatFunctionString));
writeFile("dynamic", genDynamicMatAddFunctions(sizes));
