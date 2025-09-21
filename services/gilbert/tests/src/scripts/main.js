// Import common configuration
import config from "./config.js";

class Main {
  // Private properties

  /**
   * Creates an instance of Main.
   * @memberof Main
   */
  constructor() {
  }

  /**
   * @description: The method to initialize the main class including UI, event bindings, etc
   * @memberof Main
   */
  async initialize() {
  }

  /**
   * @description The method to setup the UI 
   * @private
   * @memberof Main
   */
  async #setupUi() {

  } 
}

// Wait until the DOM content has loaded before initializing
listen(window, "DOMContentLoaded", () => {
  const main = new Main();
  main.initialize();
});
