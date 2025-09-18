class KnobComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this._isConnected = false;
    this._isUpdatePending = false;

    // Binding methods to 'this'
    this._boundMove = this._move.bind(this);
    this._boundEnd = this._end.bind(this);
    this._boundHandleInput = this._handleInput.bind(this);
    this._boundHandleKeyDown = this._handleKeyDown.bind(this);
    this._boundHandleDoubleClick = this._handleDoubleClick.bind(this);
    this._boundHandleWheel = this._handleWheel.bind(this);
    this._boundStart = this._start.bind(this);
  }

  static get observedAttributes() {
    return ["label", "value", "min", "max", "step"];
  }

  connectedCallback() {
    // Revamped styles for a modern, themed look
    this.shadowRoot.innerHTML = `
      <style>
        *, *::before, *::after { box-sizing: border-box; }
        :host { 
          display: inline-block; 
          margin: 0 15px; /* Add spacing between knobs */
          --knob-size: 80px;
          --track-width: 8px;
          --track-color: #e9d5ff; /* Light purple for the track */
          --fill-color: #8b5cf6; /* Vibrant purple for the fill */
          --text-color: #585076;
          --value-color: #4c1d95;
        }
        .knob-container {
          width: var(--knob-size);
          position: relative;
          text-align: center;
          font-family: 'Inter', sans-serif;
          touch-action: none;
        }
        .dial {
          width: var(--knob-size);
          height: var(--knob-size);
          position: relative;
          cursor: ns-resize;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 4px 15px rgba(124, 58, 237, 0.1), 0 1px 2px rgba(0,0,0,0.05);
          border: 1px solid #ede9fe;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dial-visuals {
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            pointer-events: none;
        }
        .dial-tick {
            position: absolute;
            top: 4px;
            left: 50%;
            width: 2px;
            height: 12px;
            background: var(--fill-color);
            border-radius: 1px;
            transform-origin: center calc(var(--knob-size) / 2 - 4px);
            transform: translateX(-50%) rotate(var(--knob-deg, -135deg));
            transition: transform 0.1s;
            z-index: 10; /* Ensure tick is always on top */
        }
        .dial-svg {
  transform: rotate(-90deg); /* Rotate the entire SVG to start from top */
}

        .dial-svg path {
            fill: none;
            stroke-width: var(--track-width);
            stroke-linecap: round;
        }
        .track {
            stroke: var(--track-color);
        }
        .fill {
  stroke: var(--fill-color);
  stroke-linecap: round;
  transition: stroke-dashoffset 0.1s, stroke-opacity 0.1s;
  stroke-opacity: var(--fill-opacity, 1);
}

        .value-display {
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--value-color);
            user-select: none;
            pointer-events: none;
        }
        .label {
            margin-top: 0.75rem;
            color: var(--text-color);
            font-size: 0.875rem;
            font-weight: 500;
            white-space: normal;
            word-break: break-word;
            min-height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        /* Hidden input for accessibility and form integration */
        .input-hidden {
            position: absolute;
            width: 1px;
            height: 1px;
            opacity: 0;
            pointer-events: none;
        }
      </style>
      <div class="knob-container">
        <div class="dial" id="dial">
          <div class="dial-visuals">
            <div class="dial-tick"></div>
            <svg class="dial-svg" viewBox="0 0 80 80">
                <!-- Fixed Arc path: properly centered circle with 270-degree arc -->
                <circle fill="none" class="track" cx="40" cy="40" r="30" />
<circle fill="none" class="fill" cx="40" cy="40" r="30" />

            </svg>
          </div>
          <span class="value-display" id="value-display">0</span>
        </div>
        <div class="label" id="label"></div>
        <input type="number" class="input-hidden" id="knob-input" />
      </div>
    `;

    this.elements = {
      container: this.shadowRoot.querySelector(".knob-container"),
      dial: this.shadowRoot.querySelector("#dial"),
      input: this.shadowRoot.querySelector("#knob-input"),
      valueDisplay: this.shadowRoot.querySelector("#value-display"),
      label: this.shadowRoot.querySelector("#label"),
      fill: this.shadowRoot.querySelector(".fill"),
      tick: this.shadowRoot.querySelector(".dial-tick"),
    };

    this._hasPointerEvents = window.PointerEvent;
    this._isConnected = true;
    this._initialize();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (this._isConnected && oldValue !== newValue) {
      this._initialize();
    }
  }

  _initialize() {
    this.min = parseFloat(this.getAttribute("min")) || 0;
    this.max = parseFloat(this.getAttribute("max")) || 100;
    this.step = parseFloat(this.getAttribute("step")) || 1;
    this.value = parseFloat(this.getAttribute("value")) || this.min;
    this.label = this.getAttribute("label") || "Knob";

    this.elements.input.min = this.min;
    this.elements.input.max = this.max;
    this.elements.input.step = this.step;
    this.elements.input.value = this.value;
    this.elements.label.textContent = this.label;

    this._addEventListeners();
    this._requestUpdate();
  }

  _addEventListeners() {
    this._removeEventListeners(); // Prevent duplicate listeners
    this.elements.input.addEventListener("input", this._boundHandleInput);
    this.elements.input.addEventListener("keydown", this._boundHandleKeyDown);
    this.elements.dial.addEventListener(
      "dblclick",
      this._boundHandleDoubleClick
    );
    this.elements.dial.addEventListener("wheel", this._boundHandleWheel, {
      passive: false,
    });

    const startEvent = this._hasPointerEvents ? "pointerdown" : "mousedown";
    this.elements.dial.addEventListener(startEvent, this._boundStart);
  }

  _removeEventListeners() {
    this.elements.input.removeEventListener("input", this._boundHandleInput);
    this.elements.input.removeEventListener(
      "keydown",
      this._boundHandleKeyDown
    );
    this.elements.dial.removeEventListener(
      "dblclick",
      this._boundHandleDoubleClick
    );
    this.elements.dial.removeEventListener("wheel", this._boundHandleWheel);

    const startEvent = this._hasPointerEvents ? "pointerdown" : "mousedown";
    this.elements.dial.removeEventListener(startEvent, this._boundStart);
  }

  _requestUpdate() {
    if (this._isUpdatePending) return;
    this._isUpdatePending = true;
    requestAnimationFrame(() => {
      this._updateVisuals();
      this._isUpdatePending = false;
    });
  }

  _handleInput() {
    let currentValue = parseFloat(this.elements.input.value);
    if (isNaN(currentValue)) currentValue = this.min;

    // Clamp value within min/max
    currentValue = Math.max(this.min, Math.min(this.max, currentValue));

    // Round to the nearest step
    const step = this.step || 1;
    currentValue = Math.round(currentValue / step) * step;

    if (this.value !== currentValue) {
      this.value = currentValue;
      this.setAttribute("value", String(this.value));
      this.dispatchEvent(
        new CustomEvent("change", {
          bubbles: true,
          composed: true,
          detail: { value: this.value },
        })
      );
    }
    this._requestUpdate();
  }

  _updateVisuals() {
    const value = this.value; // Use the clamped value instead of input value

    // Update text display, format to max 2 decimal places if it's a float
    const isFloat = this.step < 1;
    this.elements.valueDisplay.textContent = isFloat ? value.toFixed(2) : value;

    const totalRange = this.max - this.min;
    const percent = totalRange === 0 ? 0 : (value - this.min) / totalRange;

    // Total rotation is 270 degrees (-135 to +135)
    // Map percent to 270° sweep starting at -135°
    const deg = percent * 270 - 135;
    this.elements.container.style.setProperty("--knob-deg", `${deg}deg`);

    // Handle fill visibility and offset
    if (percent === 0) {
      // Completely hide fill at 0
      this.elements.container.style.setProperty("--fill-opacity", "0");
      this.elements.container.style.setProperty("--dash-offset", `0`);
    } else {
      // Show fill and calculate proper offset
      this.elements.container.style.setProperty("--fill-opacity", "1");

      // Compute accurate arc/circumference values based on the circle r in the SVG
      // The SVG circle uses r=30 and we draw a 270deg arc (3/4 of the circle)
      const radius = 30; // must match SVG r attribute
      const circumference = 2 * Math.PI * radius;
      const arcLength = (270 / 360) * circumference; // length of the visible arc

      // strokeDasharray should be the arc length followed by a large gap so only the arc shows
      this.elements.fill.style.strokeDasharray = `${arcLength} ${circumference}`;

      // dashOffset: when percent=1 => offset should be 0 (full arc visible)
      // when percent=0 => offset should be arcLength (hidden)
      const dashOffset = arcLength * (1 - percent);
      this.elements.fill.style.strokeDashoffset = `${dashOffset}`;
    }
  }

  _handleDoubleClick() {
    // Reset to default value on double click
    const defaultValue = parseFloat(this.getAttribute("value")) || this.min;
    this.value = defaultValue;
    this.elements.input.value = defaultValue;
    this._requestUpdate();
  }

  _handleKeyDown(e) {
    const keyMap = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 };
    if (keyMap[e.key]) {
      e.preventDefault();
      const newValue = this.value + keyMap[e.key] * this.step;
      this.value = Math.max(this.min, Math.min(this.max, newValue));
      this.elements.input.value = this.value;
      this._handleInput();
    } else if (e.key === "Home") {
      e.preventDefault();
      this.value = this.min;
      this.elements.input.value = this.min;
      this._handleInput();
    } else if (e.key === "End") {
      e.preventDefault();
      this.value = this.max;
      this.elements.input.value = this.max;
      this._handleInput();
    }
  }

  _handleWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -this.step : this.step;
    const newValue = this.value + delta;
    this.value = Math.max(this.min, Math.min(this.max, newValue));
    this.elements.input.value = this.value;
    this._handleInput();
  }

  _start(e) {
    e.preventDefault();
    this.startY = e.pageY;
    this.startValue = this.value;

    const moveEvent = this._hasPointerEvents ? "pointermove" : "mousemove";
    const endEvent = this._hasPointerEvents ? "pointerup" : "mouseup";

    document.addEventListener(moveEvent, this._boundMove);
    document.addEventListener(endEvent, this._boundEnd, { once: true });
  }

  _move(e) {
    const diff = this.startY - e.pageY;
    const totalRange = this.max - this.min;
    // Sensitivity adjustment: 150px of vertical movement = full knob range
    const sensitivity = totalRange / 150;
    let newValue = this.startValue + diff * sensitivity;

    // Clamp the value during dragging
    newValue = Math.max(this.min, Math.min(this.max, newValue));

    // Round to the nearest step
    newValue = Math.round(newValue / this.step) * this.step;

    this.value = newValue;
    this.elements.input.value = newValue;
    this._requestUpdate();

    // Dispatch change event during drag
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        composed: true,
        detail: { value: this.value },
      })
    );
  }

  _end() {
    const moveEvent = this._hasPointerEvents ? "pointermove" : "mousemove";
    const endEvent = this._hasPointerEvents ? "pointerup" : "mouseup";
    document.removeEventListener(moveEvent, this._boundMove);
    document.removeEventListener(endEvent, this._boundEnd);
  }
}

customElements.define("knob-component", KnobComponent);
