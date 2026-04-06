// Import common configuration
import "./config.js";

class Main {
  // Private properties

  /**
   * Creates an instance of Main.
   * @memberof Main
   */
  constructor() {}

  /**
   * @description: The method to initialize the main class including UI, event bindings, etc
   * @memberof Main
   */
  async initialize() {}
}

// Wait until the DOM content has loaded before initializing
window.addEventListener("DOMContentLoaded", () => {
  const main = new Main();
  main.initialize();
});
