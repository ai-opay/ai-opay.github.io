const recommendations = {
  google: {
    product: "gemini",
    recharge: {
      title: "Gemini 代充值",
      reason: "适合重视 Google 生态与多模态能力，并希望保留自己账号的用户。",
      href: "guides/gemini.html#recharge",
    },
    account: {
      title: "Gemini 成品账号",
      reason: "适合希望使用 Gemini，又不想处理账号注册流程的用户。",
      href: "guides/gemini.html#account",
    },
  },
  general: {
    product: "chatgpt",
    recharge: {
      title: "ChatGPT 代充值",
      reason: "适合需要通用工作、图像与数据分析，并希望保留自己账号的用户。",
      href: "guides/chatgpt.html#recharge",
    },
    account: {
      title: "ChatGPT 成品账号",
      reason: "适合希望快速使用 ChatGPT 或 Codex，又不想处理注册流程的用户。",
      href: "guides/chatgpt.html#account",
    },
  },
  coding: {
    product: "claude",
    recharge: {
      title: "Claude 代充值",
      reason: "适合重视代码、长文本和 Claude Code 的已有账号用户。",
      href: "guides/claude.html#recharge",
    },
    account: {
      title: "Claude 成品账号",
      reason: "适合希望快速使用 Claude Pro 或 Max，又不想处理注册流程的用户。",
      href: "guides/claude.html#account",
    },
  },
};

export function recommendPlan({ scenario, hasAccount }) {
  if (!Object.hasOwn(recommendations, scenario)) throw new TypeError("未知的使用场景");
  if (typeof hasAccount !== "boolean") throw new TypeError("hasAccount 必须是布尔值");

  const fulfillment = hasAccount ? "recharge" : "account";
  const recommendation = recommendations[scenario];
  return {
    product: recommendation.product,
    fulfillment,
    ...recommendation[fulfillment],
  };
}

function renderResult(container, result) {
  const label = document.createElement("span");
  label.className = "result-label";
  label.textContent = "更适合你的起点";

  const title = document.createElement("h3");
  title.textContent = result.title;

  const reason = document.createElement("p");
  reason.textContent = result.reason;

  const link = document.createElement("a");
  link.className = "button";
  link.href = result.href;
  link.textContent = "查看对应攻略 →";

  container.replaceChildren(label, title, reason, link);
}

export function initSelector(root = document) {
  const form = root.querySelector("[data-selector-form]");
  if (!form) return false;

  const resultContainer = root.querySelector("[data-selector-result]");
  const title = root.getElementById?.("selector-title");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const scenario = data.get("scenario");
    const accountValue = data.get("hasAccount");

    if (!scenario || !accountValue) {
      if (resultContainer) {
        resultContainer.querySelector(".result-label")?.replaceChildren("还差一个选择");
        resultContainer.querySelector("h3")?.replaceChildren("请回答两个问题");
        resultContainer.querySelector("p")?.replaceChildren("选择使用场景和账号状态后，再查看建议。");
      }
      title?.focus();
      return;
    }

    const result = recommendPlan({ scenario, hasAccount: accountValue === "yes" });
    if (resultContainer) renderResult(resultContainer, result);
  });

  return true;
}

if (typeof document !== "undefined") initSelector(document);
