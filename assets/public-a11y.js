const app = document.getElementById("app");
const editableSelector = "input, select, textarea, button, a, [contenteditable='true']";

document.addEventListener(
  "keydown",
  (event) => {
    if (
      (event.key === "ArrowLeft" || event.key === "ArrowRight") &&
      event.target.closest(editableSelector)
    ) {
      event.stopImmediatePropagation();
    }
  },
  true
);

function enhanceAssessment() {
  if (!app) return;

  const question = app.querySelector(".qcard h3");
  const group = app.querySelector(".qopts");
  const options = [...app.querySelectorAll(".qopt")];
  const nativeRadios = [...app.querySelectorAll(".qopt-input")];

  if (!nativeRadios.length && question && group && options.length) {
    if (!question.id) question.id = "active-question";
    question.tabIndex = -1;
    group.setAttribute("role", "radiogroup");
    group.setAttribute("aria-labelledby", question.id);

    options.forEach((option) => {
      option.setAttribute("role", "radio");
      option.setAttribute("aria-checked", String(option.classList.contains("sel")));
      if (!option.dataset.keyboardReady) {
        option.dataset.keyboardReady = "true";
        option.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            option.click();
          }
        });
      }
    });
  }

  if (nativeRadios.length) {
    nativeRadios.forEach((radio) => {
      radio.closest(".qopt")?.classList.toggle("sel", radio.checked);
    });
  }

  const progress = app.querySelector("#progLabel");
  if (progress) {
    const text = progress.textContent;
    const percentage = Number(text.match(/(\d+)%/)?.[1] || 0);
    progress.setAttribute("role", "progressbar");
    progress.setAttribute("aria-valuemin", "0");
    progress.setAttribute("aria-valuemax", "100");
    progress.setAttribute("aria-valuenow", String(percentage));
    progress.setAttribute("aria-live", "polite");
  }

  app.querySelectorAll(".banner-err, .lockmsg").forEach((message) => {
    message.setAttribute("role", "alert");
  });

  app.querySelectorAll("input, select").forEach((control) => {
    const label = control.closest("label") || app.querySelector(`label[for="${control.id}"]`);
    if (label?.textContent.includes("*")) {
      control.required = true;
      control.setAttribute("aria-required", "true");
    }
  });
}

let previousQuestion = "";
const observer = new MutationObserver(() => {
  enhanceAssessment();
  const question = app?.querySelector(".qcard h3, .qlegend");
  if (question && question.textContent !== previousQuestion) {
    previousQuestion = question.textContent;
    requestAnimationFrame(() => question.focus({ preventScroll: true }));
  }
});

if (app) {
  app.setAttribute("aria-label", "Free Innovation Pulse Check");
  observer.observe(app, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  enhanceAssessment();
}
