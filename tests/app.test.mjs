import test from "node:test";
import assert from "node:assert/strict";
import { initFaq } from "../assets/js/app.js";

test("FAQ 按钮同步展开状态和答案可见性", () => {
  const listeners = new Map();
  const attributes = new Map([
    ["aria-expanded", "false"],
    ["aria-controls", "answer-1"],
  ]);
  const panel = { hidden: true };
  const button = {
    addEventListener(type, callback) {
      listeners.set(type, callback);
    },
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    setAttribute(name, value) {
      attributes.set(name, value);
    },
  };
  const root = {
    querySelectorAll(selector) {
      return selector === "[data-faq-trigger]" ? [button] : [];
    },
    getElementById(id) {
      return id === "answer-1" ? panel : null;
    },
  };

  initFaq(root);
  listeners.get("click")();

  assert.equal(attributes.get("aria-expanded"), "true");
  assert.equal(panel.hidden, false);

  listeners.get("click")();
  assert.equal(attributes.get("aria-expanded"), "false");
  assert.equal(panel.hidden, true);
});
