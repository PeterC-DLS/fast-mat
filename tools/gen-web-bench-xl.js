import strategyInfo from "../strategies.js";

import useWebGPU from "./use-webgpu.js";

const sizes = [32, 64, 128, 256, 512, 1024];
const strategies = Object.entries(strategyInfo)
  .filter(([k, _v]) => !/unrolled/.test(k) && (useWebGPU || !/webgpu/.test(k)))
  .map(([_k, v]) => v);

function getExport(i) {
  if (typeof (i.export) === "function") {
    return sizes.map((s) => i.export(s)).join(", ");
  }

  return i.export;
}
function getImportFuncs() {
  let importList = "";
  const modules = {};

  for (const strat of strategies) {
    if (modules[strat.module]) {
      modules[strat.module].push(strat);
    } else {
      modules[strat.module] = [strat];
    }
  }

  for (const [key, imports] of Object.entries(modules)) {
    importList += `import {\n${
      imports.map((i) => getExport(i)).join(", ")
    }\n} from "${key}";\n`;
  }

  return importList + "\n";
}

function getPrefix(rows, cols) {
  return cols === rows ? `mat${rows}` : `matRect${rows}`; // rectangular (non-square) matrices
}

function getArgument(name, size, cols, typeSuffix) {
  const prefix = getPrefix(size, cols);

  const arg = `${prefix}${name}${typeSuffix}`;
  if (["F64", "F32", "I32"].includes(typeSuffix)) {
    return `{ shape: [${size}, ${cols}], data: ${arg} }`;
  }
  return arg;
}

function callFunction(strat, size, cols) {
  let typeSuffix;
  switch (strat.inputType) {
    case "flatNum": {
      typeSuffix = "Flat";
      break;
    }
    case "f64": {
      typeSuffix = "F64";
      break;
    }
    case "f32": {
      typeSuffix = "F32";
      break;
    }
    case "i32": {
      typeSuffix = "I32";
      break;
    }
    case "nestedNum":
    default: {
      typeSuffix = "Num";
    }
  }

  if (typeof (strat.export) === "function") {
    return `await ${strat.export(size)}(${getArgument("A", size, cols, typeSuffix)}, ${
      getArgument("B", size, cols, typeSuffix)
    })`;
  }
  return `await ${strat.export}(${getArgument("A", size, cols, typeSuffix)}, ${
    getArgument("B", size, cols, typeSuffix)
  })`;
}

//Constuct Test File
let testFile = "";

testFile +=
  `import { getMat, getMatFlat, normalSampler, normalIntSampler } from "../../utils/random-util.js";\n`;

function generateSizedData(rows, cols) {
  const prefix = `const ${getPrefix(rows, cols)}`;

  return `${prefix}ANum = getMat(${rows}, ${cols}, normalSampler(0, 1e9));
${prefix}BNum = getMat(${rows}, ${cols}, normalSampler(0, 1e9));
${prefix}AFlat = { shape: [${rows}, ${cols}], data: getMatFlat(${rows}, ${cols}, normalSampler(0, 1e9)) };
${prefix}BFlat = { shape: [${rows}, ${cols}], data: getMatFlat(${rows}, ${cols}, normalSampler(0, 1e9)) };
${prefix}AI32 = new Int32Array(getMatFlat(${rows}, ${cols}, normalIntSampler(0, Number.MIN_SAFE_INTEGER / 6)));
${prefix}BI32 = new Int32Array(getMatFlat(${rows}, ${cols}, normalIntSampler(0, Number.MIN_SAFE_INTEGER / 6)));
${prefix}AF32 = new Float32Array(getMatFlat(${rows}, ${cols}, normalSampler(0, 1e4)));
${prefix}BF32 = new Float32Array(getMatFlat(${rows}, ${cols}, normalSampler(0, 1e4)));
${prefix}AF64 = new Float64Array(getMatFlat(${rows}, ${cols}, normalSampler(0, 1e9)));
${prefix}BF64 = new Float64Array(getMatFlat(${rows}, ${cols}, normalSampler(0, 1e9)));
`;
}
for (const size of sizes) {
  testFile += generateSizedData(size, size);
}
const lastShape = [sizes.at(-1), sizes.at(-1) / 2];
testFile += generateSizedData(lastShape[0], lastShape[1]);

//strats

testFile += getImportFuncs(strategies);

//libs

testFile += `import { bench } from "../../web/bench.js"\n\n`;
testFile += `const tick = () => new Promise((res) => setTimeout(res, 0));\n`; //make sure we have a bit of render time between tests to update user
testFile += `const runs = [];\n\n`;

testFile += `document.body.innerHTML = "Running...";\n\n`;

//tests

function addRunLines(strat, rows, cols) {
  let runLines =
    `runs.push(await bench("Add ${rows}x${cols} (${strat.name})", { group: "${rows}x${cols}" }, async () => {`;
  runLines += callFunction(strat, rows, cols);
  runLines += `}));\n\n`;

  return runLines;
}

for (const strat of strategies) {
  testFile += `await tick();\n`;
  for (const size of sizes) {
    testFile += addRunLines(strat, size, size);
  }

  testFile += addRunLines(strat, lastShape[0], lastShape[1]);
}

testFile += `await fetch(".", {
	method: "POST",
	body: JSON.stringify({
		benches: runs
	})
});`;

testFile += `console.log("Complete!");\n`;
testFile += `document.body.innerHTML = "Complete!";\n`;

Deno.mkdirSync("./temp/web", { recursive: true });
Deno.writeTextFileSync("./temp/web/web-bench-xl.js", testFile);
