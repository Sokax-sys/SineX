(function () {
  if (window.electron) return;

  const noop = function () {};
  const noopResolve = function () { return Promise.resolve(); };
  const noopTrue = function () { return Promise.resolve(true); };
  const noopFalse = function () { return Promise.resolve(false); };
  const noopNull = function () { return Promise.resolve(null); };
  const noopObj = function () { return Promise.resolve({}); };
  const noopVal = function (v) { return function () { return Promise.resolve(v); }; };
  const noopEmptyArr = function () { return Promise.resolve([]); };

  const secureStore = new Map();

  function makeEmitter() {
    var listeners = new Set();
    return {
      on: function (cb) { listeners.add(cb); return cb; },
      off: function (h) { listeners.delete(h); },
      emit: function (data) { listeners.forEach(function (cb) { try { cb(data); } catch (e) {} }); },
    };
  }

  var m3u8 = makeEmitter();
  var subtitle = makeEmitter();
  var dlProgress = makeEmitter();
  var confirmClose = makeEmitter();
  var pipOpened = makeEmitter();
  var pipClosed = makeEmitter();
  var webviewFsEnter = makeEmitter();
  var webviewFsLeave = makeEmitter();
  var blockStats = makeEmitter();
  var updateProg = makeEmitter();
  var winMax = makeEmitter();
  var backupReq = makeEmitter();

  window.electron = {
    onM3u8Found: m3u8.on,
    offM3u8Found: m3u8.off,
    onSubtitleFound: subtitle.on,
    offSubtitleFound: subtitle.off,
    onDownloadProgress: dlProgress.on,
    offDownloadProgress: dlProgress.off,
    checkDownloader: noopNull,
    runDownload: noopNull,
    getDownloads: noopEmptyArr,
    deleteDownload: noopResolve,
    showInFolder: noopResolve,
    fileExists: noopFalse,
    scanDirectory: noopResolve,
    pickFolder: noopNull,
    openExternal: function (url) { window.open(url, "_blank"); return Promise.resolve(); },
    openPath: noopResolve,
    getInstallPath: noopNull,
    openPathAtTime: noopResolve,
    pruneSubtitlePaths: noopObj,
    onConfirmClose: confirmClose.on,
    offConfirmClose: confirmClose.off,
    respondClose: noop,
    resolveAllManga: noopNull,
    setPlayerVideo: noop,
    debugAllManga: noopNull,
    getAppVersion: noopVal("2.4.0"),
    onWebviewEnterFullscreen: webviewFsEnter.on,
    offWebviewEnterFullscreen: webviewFsEnter.off,
    onWebviewLeaveFullscreen: webviewFsLeave.on,
    offWebviewLeaveFullscreen: webviewFsLeave.off,
    onBlockedUpdate: blockStats.on,
    offBlockedUpdate: blockStats.off,
    getBlockStats: noopObj,
    showNotification: function (_a) {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try { new Notification(_a.title, { body: _a.body, silent: true }); } catch (e) {}
      }
    },
    quitApp: noop,
    playerStopped: noop,
    getCacheSize: noopNull,
    getDownloadsSize: noopNull,
    clearAppCache: noopResolve,
    queryVideoProgress: noopNull,
    clearWatchData: noopResolve,
    deleteAllDownloads: noopResolve,
    resetApp: noopResolve,
    searchSubtitles: noopNull,
    getSubtitleUrl: noopNull,
    downloadSubtitlesForFile: noopNull,
    deleteSubtitleFile: noopResolve,
    wyzieOpenRedeem: noopResolve,
    wyzieValidateKey: noopNull,
    secureGet: function (key) { return Promise.resolve(secureStore.get(key) || null); },
    secureSet: function (key, value) { secureStore.set(key, value); return Promise.resolve(); },
    openPipWindow: noopResolve,
    closePipWindow: noopResolve,
    getPipWebContentsId: noopNull,
    onPipOpened: pipOpened.on,
    offPipOpened: pipOpened.off,
    onPipClosed: pipClosed.on,
    offPipClosed: pipClosed.off,
    getVideoUrl: noopNull,
    windowMinimize: noop,
    windowToggleMaximize: noop,
    windowClose: noop,
    windowIsMaximized: noopFalse,
    getPlatform: noopNull,
    onWindowMaximize: winMax.on,
    offWindowMaximize: winMax.off,
    getVideoDuration: noopNull,
    setZoomFactor: noop,
    detectUpdateFormat: noopNull,
    downloadAndInstallUpdate: noopNull,
    cancelUpdate: noop,
    onUpdateProgress: updateProg.on,
    offUpdateProgress: updateProg.off,
    getScheduledBackupSettings: noopNull,
    setScheduledBackupSettings: noopResolve,
    performScheduledBackup: noopResolve,
    onScheduledBackupRequested: backupReq.on,
    offScheduledBackupRequested: backupReq.off,
  };

  if (typeof Notification !== "undefined" && Notification.permission === "default") {
    try { Notification.requestPermission(); } catch (e) {}
  }
})();
