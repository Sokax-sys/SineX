import "./chunk-35NIH65G.mjs";
import {
  ShaderGradient
} from "./chunk-BYSGI2QR.mjs";
import "./chunk-BKMGN7IO.mjs";
import "./chunk-DSIOXOQF.mjs";
import "./chunk-WBM42ICI.mjs";
import "./chunk-KCZDDKBV.mjs";
import "./chunk-WGOL3MLC.mjs";
import "./chunk-JBKKXJCP.mjs";
import "./chunk-7BFELETX.mjs";
import "./chunk-5GPUOR7T.mjs";
import "./chunk-2VIS2AGB.mjs";
import "./chunk-USQFKVUW.mjs";
import "./chunk-DWLT4BQE.mjs";
import "./chunk-SYDD76HL.mjs";
import "./chunk-LKO254JH.mjs";
import "./chunk-3U6A2N6D.mjs";
import "./chunk-V6C23KXN.mjs";
import "./chunk-N6TUE7XZ.mjs";
import "./chunk-HUYBA3PT.mjs";
import "./chunk-4NRCS6EB.mjs";
import "./chunk-X2NOPSAQ.mjs";
import "./chunk-QKZLNDW3.mjs";
import "./chunk-7MQZP53X.mjs";
import "./chunk-KVNOYXXU.mjs";
import "./chunk-F5B5J54Z.mjs";
import "./chunk-DVQMBFUX.mjs";
import "./chunk-EQTKUIXJ.mjs";
import "./chunk-OCJL2RD2.mjs";
import "./chunk-MLRQCKCE.mjs";
import "./chunk-NVTGOKBX.mjs";
import "./chunk-6UO646F3.mjs";
import "./chunk-GQGWMWFI.mjs";
import "./chunk-UFLDQTA4.mjs";
import "./chunk-RCWZ7ABO.mjs";
import "./chunk-M6YQJKKS.mjs";
import "./chunk-RC4IPMNP.mjs";
import "./chunk-YWJ356YP.mjs";
import "./chunk-LGYLXRYF.mjs";
import "./chunk-NMTOFHU2.mjs";
import "./chunk-7FD3F5WW.mjs";
import "./chunk-RB2QN26O.mjs";
import "./chunk-VFPIX6YY.mjs";
import "./chunk-M2UKK3GL.mjs";
import "./chunk-LGIHHJF3.mjs";
import "./chunk-D4AFFT4Y.mjs";
import "./chunk-AL6D2YG3.mjs";
import "./chunk-U3MMOSPO.mjs";
import "./chunk-NXGPRRJB.mjs";
import "./chunk-VCPCEEQD.mjs";
import "./chunk-RPLUTTMB.mjs";
import "./chunk-HLT4HSIO.mjs";
import "./chunk-MRCFRG7B.mjs";
import "./chunk-HJIIE5WO.mjs";
import "./chunk-KVOD4WQQ.mjs";
import "./chunk-3DHY3MAN.mjs";
import "./chunk-QRRZJ6IM.mjs";
import {
  formatFramerProps
} from "./chunk-536SBTFK.mjs";
import "./chunk-BI5IV7LU.mjs";
import "./chunk-XS23OVEI.mjs";
import {
  propertyControls
} from "./chunk-RJXQ2OEQ.mjs";
import "./chunk-PR7ME7PU.mjs";
import {
  ShaderGradientCanvas,
  useShaderGradientCanvasContext
} from "./chunk-3DLC4NOF.mjs";
import "./chunk-JITLJLKU.mjs";
import "./chunk-RVPDO3VD.mjs";
import {
  __objRest,
  __spreadValues
} from "./chunk-ZGGKM7OZ.mjs";

// src/FramerShaderGradient.tsx
import { ControlType } from "framer";
import { jsx } from "react/jsx-runtime";
function FramerShaderGradient(_a) {
  var _b = _a, {
    position,
    rotation,
    cameraAngle,
    noise,
    canvas
  } = _b, rest = __objRest(_b, [
    "position",
    "rotation",
    "cameraAngle",
    "noise",
    "canvas"
  ]);
  const props = formatFramerProps(__spreadValues({
    position,
    rotation,
    cameraAngle,
    noise,
    canvas
  }, rest));
  return /* @__PURE__ */ jsx(ShaderGradient, __spreadValues({}, props));
}
FramerShaderGradient.propertyControls = propertyControls(ControlType);
export {
  FramerShaderGradient,
  ShaderGradientCanvas,
  useShaderGradientCanvasContext
};
