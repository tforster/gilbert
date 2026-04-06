/**
 * Simple cross-runtime HTML minifier
 * Focuses on the most impactful optimizations:
 * - Remove HTML comments
 * - Collapse whitespace
 * - Remove unnecessary spaces around tags
 * - Basic attribute optimisation
 */

class SimpleHtmlMinifier {
  /**
   * Minify HTML content
   * @param {string} html - HTML content to minify
   * @param {Object} options - Minification options
   * @returns {string} - Minified HTML
   */
  static minify(html, options = {}) {
    const config = {
      removeComments: options.keep_comments === false,
      collapseWhitespace: options.allow_removing_spaces_between_attributes !== false,
      minifyCSS: options.minify_css === true,
      minifyJS: options.minify_js === true,
      ...options,
    };

    let result = html;

    // Remove HTML comments (but preserve conditional comments)
    if (config.removeComments) {
      result = result.replace(/<!--(?!\s*\[if\s)[\s\S]*?-->/g, "");
    }

    // Remove unnecessary whitespace between tags
    if (config.collapseWhitespace) {
      // Remove whitespace between closing tag and opening tag
      result = result.replace(/>\s+</g, "><");

      // Collapse multiple whitespace within text content to single space
      result = result.replace(/\s+/g, " ");

      // Remove leading/trailing whitespace from the entire document
      result = result.trim();

      // Remove spaces around = in attributes
      result = result.replace(/\s*=\s*/g, "=");

      // Remove trailing spaces before >
      result = result.replace(/\s+>/g, ">");

      // Remove leading spaces after <
      result = result.replace(/<\s+/g, "<");
    }

    // Basic CSS minification within <style> tags
    if (config.minifyCSS) {
      result = result.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (match, css) => {
        const minifiedCSS = css
          .replace(/\/\*[\s\S]*?\*\//g, "") // Remove CSS comments
          .replace(/\s*{\s*/g, "{") // Remove spaces around {
          .replace(/\s*}\s*/g, "}") // Remove spaces around }
          .replace(/\s*;\s*/g, ";") // Remove spaces around ;
          .replace(/\s*:\s*/g, ":") // Remove spaces around :
          .replace(/\s+/g, " ") // Collapse whitespace
          .trim();
        return match.replace(css, minifiedCSS);
      });
    }

    // Basic JS minification within <script> tags (very conservative)
    if (config.minifyJS) {
      result = result.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, (match, js) => {
        // Only do very safe JS minification
        const minifiedJS = js
          .replace(/\/\/.*$/gm, "") // Remove single-line comments
          .replace(/\/\*[\s\S]*?\*\//g, "") // Remove multi-line comments
          .replace(/^\s+/gm, "") // Remove leading whitespace
          .replace(/\s+$/gm, "") // Remove trailing whitespace
          .replace(/\n+/g, "\n") // Collapse multiple newlines
          .trim();
        return match.replace(js, minifiedJS);
      });
    }

    return result;
  }
}

export default SimpleHtmlMinifier;
