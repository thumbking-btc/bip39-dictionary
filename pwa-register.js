(function () {
  "use strict";

  var panel = document.getElementById("pwa-status-panel");
  var toggle = document.getElementById("pwa-status-toggle");
  var toggleLabel = document.getElementById("pwa-status-label");
  var details = document.getElementById("pwa-status-details");
  var connectionStatus = document.getElementById("pwa-connection-status");
  var offlineStatus = document.getElementById("pwa-offline-status");
  var installButton = document.getElementById("pwa-install-button");
  var guideInstallEntry = document.getElementById("pwa-guide-install-entry");
  var updateButton = document.getElementById("pwa-update-button");
  var installDialog = document.getElementById("pwa-install-dialog");
  var installTitle = document.getElementById("pwa-install-title");
  var installDescription = document.getElementById("pwa-install-description");
  var installManualHint = document.getElementById("pwa-install-manual-hint");
  var installConfirm = document.getElementById("pwa-install-confirm");
  var installGuide = document.getElementById("pwa-install-guide");
  var installLater = document.getElementById("pwa-install-later");

  if (!panel || !toggle || !details) return;

  var deferredInstallPrompt = null;
  var requestedUpdate = false;
  var refreshing = false;
  var offlineReady = false;
  var updateAvailable = false;
  var statusError = null;
  var installAutoTimer = null;
  var installReturnFocus = null;
  var installInviteKey = "bip39_pwa_install_invite_until_v2";
  var installInviteCooldown = 24 * 60 * 60 * 1000;

  if (toggleLabel) {
    toggleLabel.setAttribute("aria-live", "polite");
    toggleLabel.setAttribute("aria-atomic", "true");
  }

  function setExpanded(expanded) {
    toggle.setAttribute("aria-expanded", String(expanded));
    panel.dataset.expanded = String(expanded);
    details.hidden = !expanded;
  }

  function showDetails() {
    setExpanded(true);
  }

  function updateStatusPresentation() {
    var online = navigator.onLine !== false;
    panel.dataset.network = online ? "online" : "offline";

    if (connectionStatus) {
      connectionStatus.textContent = online
        ? "브라우저가 네트워크 연결을 감지했습니다."
        : "브라우저가 오프라인 상태를 감지했습니다.";
    }

    if (statusError) {
      if (offlineStatus) offlineStatus.textContent = statusError.message;
      if (toggleLabel) toggleLabel.textContent = statusError.label;
      return;
    }

    if (requestedUpdate) {
      if (offlineStatus) offlineStatus.textContent = "새 버전을 적용하고 있습니다.";
      if (toggleLabel) toggleLabel.textContent = "업데이트 적용 중";
      return;
    }

    if (updateAvailable) {
      if (offlineStatus) offlineStatus.textContent = "새 버전이 준비되었습니다.";
      if (toggleLabel) toggleLabel.textContent = "새 버전 준비 완료";
      return;
    }

    if (!offlineReady) {
      if (offlineStatus) {
        offlineStatus.textContent = online
          ? "오프라인 파일을 준비하고 있습니다."
          : "오프라인 파일 준비가 끝나지 않았습니다. 인터넷에 연결해 다시 열어 주세요.";
      }
      if (toggleLabel) {
        toggleLabel.textContent = online
          ? "오프라인 사용 준비 중"
          : "연결 후 준비 확인";
      }
      return;
    }

    if (offlineStatus) {
      offlineStatus.textContent = online
        ? "오프라인 사용 준비 완료"
        : "인터넷 연결 없이 저장된 사전을 사용하고 있습니다.";
    }
    if (toggleLabel) {
      toggleLabel.textContent = online
        ? "오프라인 준비됨"
        : "오프라인 사용 중";
    }
  }

  function setStatusError(message, label) {
    statusError = { message: message, label: label };
    updateStatusPresentation();
  }

  function setOfflineReady(ready) {
    offlineReady = Boolean(ready);
    panel.dataset.offlineReady = String(offlineReady);
    updateStatusPresentation();
  }

  function installedDisplayMode() {
    return (
      window.navigator.standalone === true ||
      ["standalone", "minimal-ui", "fullscreen", "window-controls-overlay"].some(
        function (mode) {
          return window.matchMedia("(display-mode: " + mode + ")").matches;
        },
      )
    );
  }

  function isAppleMobile() {
    var userAgent = navigator.userAgent || "";
    return (
      /iPhone|iPad|iPod/i.test(userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
  }

  function isAndroid() {
    return /Android/i.test(navigator.userAgent || "");
  }

  function isMobileBrowser() {
    return (
      isAppleMobile() ||
      isAndroid() ||
      /Mobile/i.test(navigator.userAgent || "") ||
      window.matchMedia("(max-width: 760px)").matches
    );
  }

  function isInAppBrowser() {
    var userAgent = navigator.userAgent || "";
    return /FBAN|FBAV|Instagram|KAKAOTALK|Line\/|NAVER|Daum|Discord|;\s*wv\)|\bwv\b|WebView/i.test(
      userAgent,
    );
  }

  function manualInstallMode() {
    if (isAppleMobile()) return isInAppBrowser() ? "inapp-ios" : "ios";
    if (isAndroid()) return isInAppBrowser() ? "inapp-android" : "android";
    return "desktop";
  }

  function installInviteSuppressed() {
    try {
      return Number(window.localStorage.getItem(installInviteKey) || 0) > Date.now();
    } catch {
      return false;
    }
  }

  function suppressInstallInvite() {
    try {
      window.localStorage.setItem(
        installInviteKey,
        String(Date.now() + installInviteCooldown),
      );
    } catch {
      // 비공개·앱 내 브라우저에서는 저장공간이 막힐 수 있습니다.
    }
  }

  function clearInstallInviteSuppression() {
    try {
      window.localStorage.removeItem(installInviteKey);
    } catch {
      // 설치 상태는 저장공간과 무관하게 display-mode로도 확인합니다.
    }
  }

  function installGuideHref(mode) {
    var anchor = mode === "ios" || mode === "inapp-ios" ? "iphone" : "android";
    if (mode === "desktop") anchor = "desktop";
    return "./install.html#" + anchor;
  }

  function setInstallEntry() {
    if (installedDisplayMode()) {
      if (installButton) installButton.hidden = true;
      if (guideInstallEntry) guideInstallEntry.hidden = true;
      return;
    }
    if (guideInstallEntry) guideInstallEntry.hidden = false;
    if (installButton) {
      installButton.hidden = false;
      installButton.disabled = false;
      installButton.textContent = deferredInstallPrompt ? "앱 설치" : "설치 방법";
    }
  }

  function hideInstallInvite(options) {
    if (!installDialog) return;
    var restoreFocus = options?.restoreFocus !== false;
    installDialog.hidden = true;
    installDialog.setAttribute("aria-hidden", "true");
    document.body.classList.remove("pwa-dialog-open");
    if (restoreFocus && installReturnFocus?.focus) installReturnFocus.focus();
    installReturnFocus = null;
  }

  function showInstallInvite(mode, options) {
    if (!installDialog || installedDisplayMode()) return;
    var automatic = options?.automatic === true;
    if (automatic && installInviteSuppressed()) return;

    var nativePrompt = mode === "native" && Boolean(deferredInstallPrompt);
    var manualMode = nativePrompt ? manualInstallMode() : mode;
    var title = "BIP39 사전을 홈 화면에 추가할까요?";
    var description = "홈 화면에서 바로 열고, 준비가 끝나면 인터넷 연결 없이 사용할 수 있습니다.";
    var hint = "설치 방법은 브라우저와 기기에 따라 조금 다릅니다.";

    if (nativePrompt) {
      title = "BIP39 사전을 앱으로 설치할까요?";
      hint = "설치를 누르면 브라우저의 실제 설치 확인창이 열립니다.";
    } else if (manualMode === "ios") {
      description = "iPhone에서는 Safari의 공유 메뉴에서 홈 화면에 추가할 수 있습니다.";
      hint = "Safari에서 공유 버튼 → 메뉴 펼치기 → 홈 화면에 추가 → 추가 순서로 진행하세요.";
    } else if (manualMode === "inapp-ios") {
      description = "현재 앱 안 브라우저에서는 홈 화면 설치 메뉴가 보이지 않을 수 있습니다.";
      hint = "브라우저 메뉴에서 Safari로 연 뒤 홈 화면에 추가하세요.";
    } else if (manualMode === "android") {
      description = "Android에서는 Chrome 메뉴에서 앱 설치 또는 홈 화면에 추가를 선택합니다.";
      hint = "Chrome 오른쪽 위 ⋮ → 앱 설치(또는 홈 화면에 추가) 순서로 진행하세요.";
    } else if (manualMode === "inapp-android") {
      description = "현재 앱 안 브라우저에서는 설치 기능이 제한될 수 있습니다.";
      hint = "브라우저 메뉴에서 Chrome으로 연 뒤 앱 설치를 선택하세요.";
    } else if (manualMode === "desktop") {
      description = "지원 브라우저에서는 주소창이나 브라우저 메뉴의 앱 설치 기능을 사용할 수 있습니다.";
      hint = "설치 아이콘이 없다면 Chrome·Edge 메뉴의 앱 설치 항목을 확인하세요.";
    }

    if (installTitle) installTitle.textContent = title;
    if (installDescription) installDescription.textContent = description;
    if (installManualHint) installManualHint.textContent = hint;
    if (installConfirm) {
      installConfirm.hidden = !nativePrompt;
      installConfirm.disabled = false;
      installConfirm.textContent = "앱으로 설치";
    }
    if (installGuide) {
      installGuide.hidden = nativePrompt;
      installGuide.href = installGuideHref(manualMode);
      installGuide.textContent = "설치 방법 보기";
    }

    installReturnFocus = document.activeElement;
    installDialog.hidden = false;
    installDialog.setAttribute("aria-hidden", "false");
    document.body.classList.add("pwa-dialog-open");
    (nativePrompt ? installConfirm : installGuide)?.focus?.();
  }

  function scheduleManualInstallInvite() {
    if (installedDisplayMode() || !isMobileBrowser() || installInviteSuppressed()) return;
    window.clearTimeout(installAutoTimer);
    installAutoTimer = window.setTimeout(function () {
      if (!deferredInstallPrompt) {
        showInstallInvite(manualInstallMode(), { automatic: true });
      }
    }, 450);
  }

  async function requestInstall(trigger) {
    if (!deferredInstallPrompt) {
      showInstallInvite(manualInstallMode(), { automatic: false });
      return;
    }
    window.clearTimeout(installAutoTimer);
    hideInstallInvite({ restoreFocus: false });
    if (trigger) trigger.disabled = true;
    if (installButton) installButton.disabled = true;
    try {
      await deferredInstallPrompt.prompt();
      var choice = await deferredInstallPrompt.userChoice;
      if (choice?.outcome !== "accepted") suppressInstallInvite();
    } catch {
      showInstallInvite(manualInstallMode(), { automatic: false });
    } finally {
      deferredInstallPrompt = null;
      if (trigger) trigger.disabled = false;
      setInstallEntry();
    }
  }

  function showUpdate(worker) {
    if (!worker || !updateButton) return;
    updateAvailable = true;
    updateButton.hidden = false;
    updateButton.onclick = function () {
      requestedUpdate = true;
      updateButton.disabled = true;
      updateButton.textContent = "업데이트 적용 중";
      updateStatusPresentation();
      worker.postMessage({ type: "SKIP_WAITING" });
    };
    updateStatusPresentation();
    showDetails();
  }

  function watchRegistration(registration) {
    if (registration.waiting && navigator.serviceWorker.controller) {
      showUpdate(registration.waiting);
    }

    registration.addEventListener("updatefound", function () {
      var installing = registration.installing;
      if (!installing) return;
      installing.addEventListener("statechange", function () {
        if (
          installing.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          showUpdate(registration.waiting || installing);
        }
      });
    });
  }

  toggle.addEventListener("click", function () {
    setExpanded(toggle.getAttribute("aria-expanded") !== "true");
  });

  window.addEventListener("online", updateStatusPresentation);
  window.addEventListener("offline", updateStatusPresentation);
  setOfflineReady(false);

  window.addEventListener("beforeinstallprompt", function (event) {
    if (installedDisplayMode()) return;
    event.preventDefault();
    window.clearTimeout(installAutoTimer);
    deferredInstallPrompt = event;
    setInstallEntry();
    showInstallInvite("native", { automatic: true });
  });

  window.addEventListener("appinstalled", function () {
    deferredInstallPrompt = null;
    window.clearTimeout(installAutoTimer);
    clearInstallInviteSuppression();
    hideInstallInvite({ restoreFocus: false });
    setInstallEntry();
    if (toggleLabel) toggleLabel.textContent = "앱 설치 완료";
  });

  if (installButton) {
    installButton.addEventListener("click", function () {
      if (deferredInstallPrompt) requestInstall(installButton);
      else showInstallInvite(manualInstallMode(), { automatic: false });
    });
  }

  if (installConfirm) {
    installConfirm.addEventListener("click", function () {
      requestInstall(installConfirm);
    });
  }

  if (installLater) {
    installLater.addEventListener("click", function () {
      suppressInstallInvite();
      hideInstallInvite();
    });
  }

  if (installDialog) {
    installDialog.addEventListener("click", function (event) {
      if (event.target !== installDialog) return;
      suppressInstallInvite();
      hideInstallInvite();
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape" || installDialog?.hidden !== false) return;
    suppressInstallInvite();
    hideInstallInvite();
  });

  setInstallEntry();
  if (installedDisplayMode()) {
    hideInstallInvite({ restoreFocus: false });
  } else {
    scheduleManualInstallInvite();
  }

  if (!("serviceWorker" in navigator)) {
    setStatusError(
      "이 브라우저에서는 앱 설치와 오프라인 저장을 지원하지 않습니다.",
      "브라우저 지원 확인 필요",
    );
    showDetails();
    return;
  }

  navigator.serviceWorker.addEventListener("message", function (event) {
    if (event.data?.type === "CACHE_STATUS") {
      setOfflineReady(event.data.ready === true);
    }
  });

  navigator.serviceWorker.addEventListener("controllerchange", function () {
    if (requestedUpdate && !refreshing) {
      refreshing = true;
      window.location.reload();
      return;
    }
    navigator.serviceWorker.controller?.postMessage({
      type: "GET_CACHE_STATUS",
    });
  });

  window.addEventListener("load", function () {
    navigator.serviceWorker
      .register("./sw.js", { scope: "./", updateViaCache: "none" })
      .then(function (registration) {
        watchRegistration(registration);
        return navigator.serviceWorker.ready;
      })
      .then(function (registration) {
        registration.active?.postMessage({ type: "GET_CACHE_STATUS" });
      })
      .catch(function () {
        setStatusError(
          "오프라인 준비를 완료하지 못했습니다. 연결 후 다시 열어 주세요.",
          "오프라인 준비 확인 필요",
        );
        showDetails();
      });
  });
})();
