// main.js
(() => {
  const display = document.getElementById("display");
  const clockDisplay = document.getElementById("clock");
  const clockFormatter = clockDisplay
    ? new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;
  const keys = document.querySelector(".keys");

  let current = "0";
  let previous = null;
  let operator = null;       // "+", "-", "*", "/"
  let justEvaluated = false;
  let lastOp = null;         // { op: "+-*/", b: number } kartotiniam "="
  let memory = 0;

  const unicodeOpsMap = { "×": "*", "÷": "/", "−": "-", "-": "-", "+": "+" };

  function format(nStr) {
    if (nStr.length > 16) {
      const num = Number(nStr);
      if (!Number.isFinite(num)) return "Error";
      return num.toExponential(8);
    }
    return nStr;
  }

  function updateDisplay(value = current) {
    display.textContent = format(value);
  }

  function updateClock() {
    if (!clockDisplay) return;
    const now = new Date();
    clockDisplay.textContent = clockFormatter
      ? clockFormatter.format(now)
      : now.toLocaleTimeString();
  }

  function clearAll() {
    current = "0";
    previous = null;
    operator = null;
    lastOp = null;
    justEvaluated = false;
    updateDisplay();
  }

  function inputDigit(d) {
    if (justEvaluated) {
      current = d === "." ? "0." : d;
      justEvaluated = false;
      updateDisplay();
      return;
    }
    if (d === ".") {
      if (!current.includes(".")) current += ".";
    } else {
      current = current === "0" ? d : current + d;
    }
    updateDisplay();
  }

  function setOperator(opSymbol) {
    const op = unicodeOpsMap[opSymbol];
    if (!op) return;

    if (operator && previous !== null && !justEvaluated) {
      evaluate(false);
    } else {
      previous = current;
    }
    operator = op;
    justEvaluated = false;
    current = "0";
  }

  function compute(a, op, b) {
    if (op === "+") return a + b;
    if (op === "-") return a - b;
    if (op === "*") return a * b;
    if (op === "/") return b === 0 ? "Error" : a / b;
  }

  function evaluate(persistLastOp = true) {
    if (!operator || previous === null) {
      updateDisplay(current);
      return;
    }
    const a = Number(previous);
    const b = Number(current);
    const result = compute(a, operator, b);

    if (result === "Error") {
      clearAll();
      current = "Error";
      justEvaluated = true;
      updateDisplay();
      return;
    }

    current = String(result);
    if (persistLastOp) lastOp = { op: operator, b };
    previous = null;
    operator = null;
    justEvaluated = true;
    updateDisplay();
  }

  function pressEquals() {
    if (operator && previous !== null) {
      evaluate(true);
      return;
    }
    if (lastOp && Number.isFinite(Number(current))) {
      const a = Number(current);
      const { op, b } = lastOp;
      const result = compute(a, op, b);
      if (result === "Error") {
        clearAll();
        current = "Error";
      } else {
        current = String(result);
      }
      justEvaluated = true;
      updateDisplay();
    }
  }

  function handleMemoryPlus() {
    const n = Number(current);
    if (Number.isFinite(n)) memory += n;
  }

  // --- Vizualus mirksėjimas ---
  function flashKey(el) {
    if (!el) return;
    el.classList.add("flash");
    setTimeout(() => el.classList.remove("flash"), 150);
  }

  function findKeyByLabel(label) {
    const btns = document.querySelectorAll(".key");
    for (const k of btns) {
      if (k.textContent.trim() === label) return k;
    }
    return null;
  }

  // ==== Pointer įvykių (telefonai/planšetės/desktop) valdymas ====
  // Naudojame pointerdown/pointerup, kad neliktų 300ms delso ir nebūtų dvigubo „click“
  let activeKey = null;

  keys.addEventListener("pointerdown", (e) => {
    const key = e.target.closest(".key");
    if (!key) return;
    if (key.classList.contains("time-display")) return;
    // ant touch – neleisti generuoti papildomo mouse įvykio
    if (e.pointerType === "touch") e.preventDefault();
    activeKey = key;
    key.classList.add("is-pressed");
    flashKey(key);
  }, { passive: false });

  keys.addEventListener("pointerup", (e) => {
    const key = e.target.closest(".key");

    if (e.pointerType === "touch") e.preventDefault();

    // jei paleidom kitur nei paspaudėm – vis tiek vykdom to, ant kurio paleista
    key.classList.remove("is-pressed");
    handleKeyAction(key);
    activeKey = null;
  }, { passive: false });

  window.addEventListener("pointerup", (e) => {
    if (!keys.contains(e.target)) {
      if (activeKey) activeKey.classList.remove("is-pressed");
      activeKey = null;
    }
  });

  // „nutraukto“ paspaudimo atvejis – atšaukiam aktyvų
  keys.addEventListener("pointercancel", () => {
    if (activeKey) activeKey.classList.remove("is-pressed");
    activeKey = null;
  });

  function handleKeyAction(keyEl) {
    const text = keyEl.textContent.trim();

    if (keyEl.id === "clear" || text === "AC") {
      clearAll();
      return;
    }

    if (text === "M+") {
      handleMemoryPlus();
      return;
    }

    if (keyEl.id === "equals" || text === "=") {
      pressEquals();
      return;
    }

    if (keyEl.classList.contains("digit")) {
      inputDigit(text);
      return;
    }

    if (keyEl.classList.contains("operator")) {
      setOperator(text);
      return;
    }
  }

  // ==== Klaviatūra (desktop + BT klaviatūros mobiliuose) ====
  window.addEventListener("keydown", (e) => {
    const key = e.key;

    let btnToFlash = null;
    if (key >= "0" && key <= "9") btnToFlash = findKeyByLabel(key);
    else if (key === ".") btnToFlash = findKeyByLabel(".");
    else if (key === "+") btnToFlash = findKeyByLabel("+");
    else if (key === "-") btnToFlash = findKeyByLabel("−");
    else if (key === "*") btnToFlash = findKeyByLabel("×");
    else if (key === "/") btnToFlash = findKeyByLabel("÷");
    else if (key === "Enter" || key === "=") btnToFlash = document.getElementById("equals");
    else if (key === "Escape") btnToFlash = document.getElementById("clear");

    if (btnToFlash) flashKey(btnToFlash);

    if (key === "7") {
      const sevenKey = findKeyByLabel("7");
      if (sevenKey) sevenKey.classList.add("is-pressed");
    }

    if ((key >= "0" && key <= "9") || key === ".") {
      inputDigit(key);
      return;
    }
    if (key === "Enter" || key === "=") {
      e.preventDefault();
      pressEquals();
      return;
    }
    if (key === "+" || key === "-" || key === "*" || key === "/") {
      setOperator(key);
      return;
    }
    if (key === "Escape") {
      clearAll();
      return;
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.key === "7") {
      const sevenKey = findKeyByLabel("7");
      if (sevenKey) sevenKey.classList.remove("is-pressed");
    }
  });

  // Start
  updateDisplay();
  updateClock();
  setInterval(updateClock, 1000);
})();
