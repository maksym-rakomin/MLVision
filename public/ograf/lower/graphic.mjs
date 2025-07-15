class Graphic extends HTMLElement {
  #playing = false;
  #iframe = null;

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
    iframe.width = '720';
    iframe.height = '300';
    iframe.style.border = 'none';
    // iframe.style.border = '1px solid #ccc';
    iframe.style.position = 'absolute';
    iframe.style.pointerEvents = 'none';
    iframe.style.transition = 'transform 0.2s ease-out';

    iframe.style.background = 'transparent';
    iframe.style.backgroundColor = 'transparent';

    this.appendChild(iframe);
    this.#iframe = iframe;
  }

  async dispose(_payload) {
    this.innerHTML = '';
    this.#playing = false;
  }

  async playAction(params) {
    if (this.#playing) return { code: 400, message: 'Bad equest, graphic already playing' };
    this.#playing = true;

    this.#iframe.contentWindow.play();
    return { code: 200, message: 'OK' };
  }

  async updateAction(params) {
    this.#iframe.contentWindow.update(JSON.stringify(params.data));
    return { code: 200, message: 'OK' };
  }

  async stopAction(params) {
    this.#playing = false;
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
