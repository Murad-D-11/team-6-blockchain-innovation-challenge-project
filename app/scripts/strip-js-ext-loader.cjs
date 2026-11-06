/**
 * Turbopack loader for the generated laya-bindings only. Its sources import "./client.js" meaning
 * client.ts (NodeNext style), which Turbopack does not resolve. This rewrites relative ".js"
 * specifiers to extensionless ones. The package itself is not touched.
 */
module.exports = function stripJsExt(source) {
  return String(source).replace(/(from\s+["']\.{1,2}\/[^"']+)\.js(["'])/g, "$1$2");
};
