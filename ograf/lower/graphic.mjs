class Graphic extends HTMLElement {
  #playing = false;
  #iframe = null;
  #iframeLoaded = false;

  constructor() {
    super();
    this.nonRealTimeState = {};
  }

  connectedCallback() {}

  async load(loadParams) {
    const iframe = document.createElement('iframe');

    iframe.allowTransparency = true;

    // console.log(777, import.meta.resolve('./resources/index.html'));
    iframe.src = import.meta.resolve('./resources/index.html');
    iframe.width = '780';
    iframe.height = '300';
    iframe.style.border = 'none';
    // iframe.style.border = '1px solid #ccc';
    iframe.style.position = 'absolute';
    iframe.style.pointerEvents = 'none';
    iframe.style.transition = 'transform 0.2s ease-out';

    iframe.style.background = 'transparent';
    iframe.style.backgroundColor = 'transparent';

    // Store iframe reference first so it can be accessed by other methods
    this.#iframe = iframe;

    // Append iframe to DOM before waiting for load
    this.appendChild(iframe);

    // Wait for iframe to load before allowing updates
    await new Promise(resolve => {
      iframe.onload = () => {
        console.log('Iframe loaded successfully');
        this.#iframeLoaded = true;
        resolve();
      };
      // Fallback in case onload doesn't fire
      setTimeout(() => {
        if (!this.#iframeLoaded) {
          console.warn('Iframe load timeout reached, forcing loaded state');
          this.#iframeLoaded = true;
          resolve();
        }
      }, 1000);
    });
  }

  async dispose(_payload) {
    this.innerHTML = '';
    this.#playing = false;
  }

  async playAction(params) {
    if (this.#playing) return { code: 400, message: 'Bad request, graphic already playing' };

    // Check if iframe is loaded and play function exists
    if (!this.#iframe || !this.#iframeLoaded) {
      console.warn('Iframe not loaded yet, cannot play');
      return { code: 400, message: 'Iframe not loaded yet' };
    }

    if (!this.#iframe.contentWindow || typeof this.#iframe.contentWindow.play !== 'function') {
      console.warn('Play function not available in iframe');
      return { code: 400, message: 'Play function not available' };
    }

    this.#playing = true;
    this.#iframe.contentWindow.play();
    return { code: 200, message: 'OK' };
  }

  async updateAction(params) {
    // Check if iframe is loaded and update function exists
    if (!this.#iframe || !this.#iframeLoaded) {
      console.warn('Iframe not loaded yet, cannot update');
      return { code: 400, message: 'Iframe not loaded yet' };
    }

    if (!this.#iframe.contentWindow || typeof this.#iframe.contentWindow.update !== 'function') {
      console.warn('Update function not available in iframe');
      return { code: 400, message: 'Update function not available' };
    }

    this.#iframe.contentWindow.update(JSON.stringify(params.data));
    return { code: 200, message: 'OK' };
  }

  async stopAction(params) {
    this.#playing = false;

    // Check if iframe is loaded and stop function exists
    if (!this.#iframe || !this.#iframeLoaded) {
      console.warn('Iframe not loaded yet, cannot stop');
      return { code: 400, message: 'Iframe not loaded yet' };
    }

    if (!this.#iframe.contentWindow || typeof this.#iframe.contentWindow.stop !== 'function') {
      console.warn('Stop function not available in iframe');
      return { code: 400, message: 'Stop function not available' };
    }

    this.#iframe.contentWindow.stop();
    return { code: 200, message: 'OK' };
  }

  async customAction({ id: string, payload: any }) {
    return { code: 400, message: 'No custom actions supported' };
  }

  async goToTime(params) {}

  async setActionsSchedule(params) {}
}

export default Graphic;
