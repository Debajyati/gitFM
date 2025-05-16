export default {
  atob: (token) => Buffer.from(token).toString("base64"),
  btoa: (base64token) => Buffer.from(base64token, "base64").toString("ascii"),
};
