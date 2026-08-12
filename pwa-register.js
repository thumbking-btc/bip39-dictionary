(function () {
  "use strict";

  var panel = document.getElementById("pwa-status-panel");
  var toggle = document.getElementById("pwa-status-toggle");
  var toggleLabel = document.getElementById("pwa-status-label");
  var details = document.getElementById("pwa-status-details");
  var connectionStatus = document.getElementById("pwa-connection-status");
  var offlineStatus = document.getElementById("pwa-offline-status");
  var installButton = document.getElementById("pwa-install-button");
  var updateButton = document.getElementById("pwa-update-button");

  if (!panel || !toggle || !details) return;

  var deferredInstallPrompt = null;
  var requestedUpdate = false;
  var refreshing = false;
  var offlineReady = false;
  var updateAvailable = false;
  var statusError = null;

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

  function isStandalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
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
    event.preventDefault();
    deferredInstallPrompt = event;
    if (installButton) installButton.hidden = false;
    showDetails();
  });

  window.addEventListener("appinstalled", function () {
    deferredInstallPrompt = null;
    if (installButton) installButton.hidden = true;
    if (toggleLabel) toggleLabel.textContent = "앱 설치 완료";
  });

  if (installButton) {
    installButton.addEventListener("click", async function () {
      if (!deferredInstallPrompt) return;
      installButton.disabled = true;
      await deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      installButton.hidden = true;
      installButton.disabled = false;
    });
  }

  if (isStandalone() && installButton) installButton.hidden = true;

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
