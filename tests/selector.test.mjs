import test from "node:test";
import assert from "node:assert/strict";
import { initSelector, recommendPlan } from "../assets/js/selector.js";

const cases = [
  {
    input: { scenario: "google", hasAccount: true },
    expected: {
      product: "gemini",
      fulfillment: "recharge",
      title: "Gemini 代充值",
      reason: "适合重视 Google 生态与多模态能力，并希望保留自己账号的用户。",
      href: "guides/gemini.html#recharge",
    },
  },
  {
    input: { scenario: "google", hasAccount: false },
    expected: {
      product: "gemini",
      fulfillment: "account",
      title: "Gemini 成品账号",
      reason: "适合希望使用 Gemini，又不想处理账号注册流程的用户。",
      href: "guides/gemini.html#account",
    },
  },
  {
    input: { scenario: "general", hasAccount: true },
    expected: {
      product: "chatgpt",
      fulfillment: "recharge",
      title: "ChatGPT 代充值",
      reason: "适合需要通用工作、图像与数据分析，并希望保留自己账号的用户。",
      href: "guides/chatgpt.html#recharge",
    },
  },
  {
    input: { scenario: "general", hasAccount: false },
    expected: {
      product: "chatgpt",
      fulfillment: "account",
      title: "ChatGPT 成品账号",
      reason: "适合希望快速使用 ChatGPT 或 Codex，又不想处理注册流程的用户。",
      href: "guides/chatgpt.html#account",
    },
  },
  {
    input: { scenario: "coding", hasAccount: true },
    expected: {
      product: "claude",
      fulfillment: "recharge",
      title: "Claude 代充值",
      reason: "适合重视代码、长文本和 Claude Code 的已有账号用户。",
      href: "guides/claude.html#recharge",
    },
  },
  {
    input: { scenario: "coding", hasAccount: false },
    expected: {
      product: "claude",
      fulfillment: "account",
      title: "Claude 成品账号",
      reason: "适合希望快速使用 Claude Pro 或 Max，又不想处理注册流程的用户。",
      href: "guides/claude.html#account",
    },
  },
];

for (const { input, expected } of cases) {
  test(`${input.scenario}/${input.hasAccount ? "已有账号" : "无账号"} 返回正确建议`, () => {
    assert.deepEqual(recommendPlan(input), expected);
  });
}

test("非法场景抛出 TypeError", () => {
  assert.throws(() => recommendPlan({ scenario: "unknown", hasAccount: true }), TypeError);
});

test("对象原型属性不能被当成合法场景", () => {
  assert.throws(() => recommendPlan({ scenario: "toString", hasAccount: true }), TypeError);
  assert.throws(() => recommendPlan({ scenario: "constructor", hasAccount: false }), TypeError);
});

test("hasAccount 必须是布尔值", () => {
  assert.throws(() => recommendPlan({ scenario: "coding", hasAccount: "yes" }), TypeError);
});

test("页面没有选择器时安全返回", () => {
  assert.equal(initSelector({ querySelector: () => null }), false);
});
