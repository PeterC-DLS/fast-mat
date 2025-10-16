const canvas = document.createElement("canvas");
canvas.height = 256;
canvas.width = 256;
const context = canvas.getContext("webgl2");

document.body.append(canvas);

context.getExtension("EXT_color_buffer_float");

function createDataTexture(
  context,
  data = null,
  textureIndex = 0,
  width = 32,
  height = 32,
) {
  context.activeTexture(context.TEXTURE0 + textureIndex);
  const texture = context.createTexture();
  context.bindTexture(context.TEXTURE_2D, texture);

  context.texParameteri(
    context.TEXTURE_2D,
    context.TEXTURE_WRAP_S,
    context.CLAMP_TO_EDGE,
  );
  context.texParameteri(
    context.TEXTURE_2D,
    context.TEXTURE_WRAP_T,
    context.CLAMP_TO_EDGE,
  );
  context.texParameteri(
    context.TEXTURE_2D,
    context.TEXTURE_MIN_FILTER,
    context.NEAREST,
  );
  context.texParameteri(
    context.TEXTURE_2D,
    context.TEXTURE_MAG_FILTER,
    context.NEAREST,
  );

  context.texImage2D(
    context.TEXTURE_2D,
    0,
    context.R32F,
    width,
    height,
    0,
    context.RED,
    context.FLOAT,
    data,
  );
  return texture;
}

function compileProgram(context, vertexShaderText, fragmentShaderText) {
  const vertexShader = context.createShader(context.VERTEX_SHADER);
  context.shaderSource(vertexShader, vertexShaderText);
  context.compileShader(vertexShader);

  const fragmentShader = context.createShader(context.FRAGMENT_SHADER);
  context.shaderSource(fragmentShader, fragmentShaderText);
  context.compileShader(fragmentShader);

  if (!context.getShaderParameter(vertexShader, context.COMPILE_STATUS)) {
    console.error(
      `⚠ Failed to compile vertex shader: ${context.getShaderInfoLog(vertexShader)}`,
    );
  }
  if (!context.getShaderParameter(fragmentShader, context.COMPILE_STATUS)) {
    console.error(
      `⚠ Failed to compile fragment shader: ${
        context.getShaderInfoLog(fragmentShader)
      }`,
    );
  }

  const program = context.createProgram();

  context.attachShader(program, vertexShader);
  context.attachShader(program, fragmentShader);

  context.linkProgram(program);
  context.useProgram(program);

  return program;
}

function createScene(context, program) {
  const positions = new Float32Array([
    -1.0,
    -1.0,
    1.0,
    -1.0,
    1.0,
    1.0,
    -1.0,
    1.0,
  ]);
  const positionBuffer = context.createBuffer();
  context.bindBuffer(context.ARRAY_BUFFER, positionBuffer);
  context.bufferData(context.ARRAY_BUFFER, positions, context.STATIC_DRAW);

  const positionLocation = context.getAttribLocation(program, "aPosition");
  context.enableVertexAttribArray(positionLocation);
  context.vertexAttribPointer(positionLocation, 2, context.FLOAT, false, 0, 0);

  const uvs = new Float32Array([
    0.0,
    0.0,
    1.0,
    0.0,
    1.0,
    1.0,
    0.0,
    1.0,
  ]);
  const uvBuffer = context.createBuffer();
  context.bindBuffer(context.ARRAY_BUFFER, uvBuffer);
  context.bufferData(context.ARRAY_BUFFER, uvs, context.STATIC_DRAW);

  const texCoordLocation = context.getAttribLocation(program, "aUV");
  context.enableVertexAttribArray(texCoordLocation);
  context.vertexAttribPointer(texCoordLocation, 2, context.FLOAT, false, 0, 0);

  const indicies = new Uint16Array([
    0,
    1,
    2,
    0,
    2,
    3,
  ]);
  const indexBuffer = context.createBuffer();
  context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, indexBuffer);
  context.bufferData(
    context.ELEMENT_ARRAY_BUFFER,
    indicies,
    context.STATIC_DRAW,
  );
}

function addSampler(context, program, name, index) {
  const samplerLocation = context.getUniformLocation(program, name);
  context.uniform1i(samplerLocation, index);
}

function createFramebuffer(context, width, height, _n = 1) {
  const framebufferTexture = context.createTexture();
  context.bindTexture(context.TEXTURE_2D, framebufferTexture);
  context.texImage2D(
    context.TEXTURE_2D,
    0,
    context.R32F,
    width,
    height,
    0,
    context.RED,
    context.FLOAT,
    null,
  );

  const framebuffer = context.createFramebuffer();
  context.bindFramebuffer(context.FRAMEBUFFER, framebuffer);
  context.framebufferTexture2D(
    context.FRAMEBUFFER,
    context.COLOR_ATTACHMENT0,
    context.TEXTURE_2D,
    framebufferTexture,
    0,
  );
  return framebuffer;
}

const matrixAddVertexShaderText = `#version 300 es
	precision highp float;
	in vec3 aPosition;
	in vec2 aUV;

	out vec2 uv;

	void main(){
		gl_Position = vec4(aPosition, 1.0);
		uv = aUV;
	}
`;

const matrixAddFragmentShaderText = `#version 300 es
	precision highp float;
	uniform sampler2D samplerA;
	uniform sampler2D samplerB;

	in vec2 uv;

	layout (location=0) out vec4 glColor;
	layout (location=1) out vec4 glColor2;

	void main(){
		glColor = vec4(texture(samplerA, uv).r + texture(samplerB, uv).r, 0.0, 0.0, 1.0);
	}
`;

const program = compileProgram(
  context,
  matrixAddVertexShaderText,
  matrixAddFragmentShaderText,
);
createScene(context, program);
addSampler(context, program, "samplerA", 0);
addSampler(context, program, "samplerB", 1);
createFramebuffer(context, canvas.width, canvas.height, 2);

export function addMatrixWebGl(a, b) {
  const h = a.shape[0];
  const w = a.shape[1];
  context.viewport(0, 0, w, h);
  createDataTexture(context, a.data, 0, w, h);
  createDataTexture(context, b.data, 1, w, h);
  canvas.width = w;
  canvas.height = h;
  context.drawElements(context.TRIANGLES, 6, context.UNSIGNED_SHORT, 0);

  const result = new Float32Array(w * h);
  context.readPixels(0, 0, w, h, context.RED, context.FLOAT, result);

  return {
    shape: a.shape,
    data: result,
  };
}
