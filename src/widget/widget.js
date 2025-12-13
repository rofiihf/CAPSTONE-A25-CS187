// src/widget/widget.js
(function () {
  if (window.__CHATBOT_WIDGET_LOADED__) return;
  window.__CHATBOT_WIDGET_LOADED__ = true;

  // =========================
  //    CONFIGURATION
  // =========================
  const config = window.__WIDGET_CONFIG__ || {
    BACKEND_URL: "http://localhost:5000",
    WIDGET_URL: "http://localhost:5000/widget/iframe.html"
  };

  const WIDGET_URL = config.WIDGET_URL;
  const API_BASE_URL = config.BACKEND_URL;

  console.log("Widget initialized with config:", config);

  // =========================
  //    INJECT STYLES
  // =========================
  function injectStyle(href) {
    try {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.id = "chatbot-widget-css";
      (document.head || document.documentElement).appendChild(link);
      return link;
    } catch (e) {
      console.warn("Widget: failed to inject CSS", e);
      return null;
    }
  }

  // =========================
  //    CREATE LAUNCHER
  // =========================
  function createLauncher() {
    const btn = document.createElement("div");
    btn.id = "chatbot-launcher";
    btn.setAttribute("role", "button");
    btn.setAttribute("aria-label", "Open chat");
    btn.setAttribute("aria-expanded", "false");
    btn.innerHTML = '<span class="launcher-icon">💬</span>';
    
    const badge = document.createElement("span");
    badge.className = "launcher-badge";
    badge.textContent = "";
    badge.style.display = "none";
    btn.appendChild(badge);
    
    return btn;
  }

  // =========================
  //    CREATE IFRAME
  // =========================
  function createIframeWrapper(src) {
    const wrap = document.createElement("div");
    wrap.id = "chatbot-wrapper";
    wrap.style.display = "none";

    const iframe = document.createElement("iframe");
    iframe.id = "chatbot-iframe";
    iframe.src = `${WIDGET_URL}?ts=${Date.now()}`;
    iframe.title = "Chatbot";
    iframe.setAttribute("frameborder", "0");
    iframe.setAttribute("allowtransparency", "true");
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.style.display = "block";
    
    // Less restrictive sandbox - allows popups for button clicks
    iframe.setAttribute(
      "sandbox",
      "allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"
    );
    
    wrap.appendChild(iframe);
    return { wrap, iframe };
  }

  // =========================
  //    STATE & INITIALIZATION
  // =========================
  let open = false;
  
  const cssPath = `${API_BASE_URL}/widget/widget.css`;
  
  const link = injectStyle(cssPath);
  const launcher = createLauncher();
  const { wrap: iframeWrapper, iframe } = createIframeWrapper(WIDGET_URL);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", appendToDom);
  } else {
    appendToDom();
  }

  function appendToDom() {
    document.body.appendChild(launcher);
    document.body.appendChild(iframeWrapper);
  }

  // =========================
  //    TOGGLE FUNCTIONALITY
  // =========================
  function toggle(openWanted) {
    open = typeof openWanted === "boolean" ? openWanted : !open;
    const wrapEl = document.getElementById("chatbot-wrapper");
    const btn = document.getElementById("chatbot-launcher");
    
    if (!wrapEl || !btn) return;
    
    wrapEl.style.display = open ? "block" : "none";
    btn.setAttribute("aria-expanded", String(open));
    
    if (open) {
      try { 
        iframe.contentWindow.focus(); 
      } catch (e) {
        console.warn("Widget: Cannot focus iframe", e);
      }
    }
  }

  // =========================
  //    EVENT LISTENERS
  // =========================
  launcher.addEventListener("click", () => {
    
    if (open) {
      toggle(false);
      return;
    }

    // kalau belum open → open + check auth
    toggle(true);

    try {
      iframe.contentWindow.postMessage(
        { type: "CHECK_AUTH" },
        "*"
      );
    } catch (e) {
      iframe.src = `${WIDGET_URL}?ts=${Date.now()}`;
    }
  });

  window.ChatbotWidget = {
    open: () => toggle(true),
    close: () => toggle(false),
    toggle: () => toggle(),
    getIframe: () => iframe,
    getConfig: () => config
  };

  iframe.addEventListener("load", () => {
    try {
      iframe.contentWindow.postMessage(
        { 
          type: "WIDGET_LOADED",
          config: config 
        }, 
        "*"
      );
    } catch (e) {
      console.warn("Widget: cannot postMessage to iframe", e);
    }
  });

  // Listen for messages from iframe
  window.addEventListener("message", (event) => {
    const { type, data, url } = event.data || {};

    switch (type) {
      
      case "NOT_AUTHENTICATED":
        console.warn("Widget: user not authenticated");
        startAuthPolling();
        break;

      case "REDIRECT_TO_LOGIN":
        console.log("Widget: Redirecting to login");
        stopAuthPolling();
        window.open("http://localhost:5500/#/login", "_blank");
        break;

      case "USER_LOGGED_IN":
        console.log("Widget: detected user logged in");

        try {
          iframe.contentWindow.postMessage(
            { type: "CHECK_AUTH" },
            "*"
          );
        } catch (e) {
          console.warn("Widget: iframe not ready, reloading iframe");
          iframe.src = `${WIDGET_URL}?ts=${Date.now()}`;
        }
        break;

      case "CLOSE_WIDGET":
        toggle(false);
        break;

      case "UPDATE_BADGE":
        updateBadge(data?.count);
        break;

      default:
        break;
    }
  });

  let authPoller = null;

  function startAuthPolling() {
    if (authPoller) return;

    authPoller = setInterval(() => {
      try {
        iframe.contentWindow.postMessage({ type: "CHECK_AUTH" }, "*");
      } catch {}
    }, 2000);
  }

  function stopAuthPolling() {
    clearInterval(authPoller);
    authPoller = null;
  }

  // =========================
  //    HELPER FUNCTIONS
  // =========================
  function updateBadge(count) {
    const badge = document.querySelector("#chatbot-launcher .launcher-badge");
    if (!badge) return;
    
    if (count > 0) {
      badge.textContent = count > 99 ? "99+" : count;
      badge.style.display = "flex";
    } else {
      badge.style.display = "none";
    }
  }

  console.log("✅ Chatbot widget loaded successfully");
  console.log("📍 Widget iframe:", WIDGET_URL);
  console.log("🔌 API base:", API_BASE_URL);
})();