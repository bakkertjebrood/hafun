(function () {
  'use strict';
  function applyHeight(iframe, height) {
    if (!iframe || !height) return;
    iframe.style.height = height + 'px';
  }
  function findIframe(source) {
    var iframes = document.querySelectorAll('iframe[data-hafun-resize]');
    for (var i = 0; i < iframes.length; i++) {
      if (iframes[i].contentWindow === source) return iframes[i];
    }
    return null;
  }
  window.addEventListener('message', function (e) {
    var data = e && e.data;
    if (!data || data.type !== 'hafun:resize') return;
    var iframe = findIframe(e.source);
    applyHeight(iframe, data.height);
  });
})();
