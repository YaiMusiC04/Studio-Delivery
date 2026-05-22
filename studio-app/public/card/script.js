(function () {
  const canvas = document.getElementById("qr");
  const shareBtn = document.getElementById("share-btn");
  const cardUrl = window.location.origin + window.location.pathname;

  if (window.QRCode && canvas) {
    QRCode.toCanvas(
      canvas,
      cardUrl,
      {
        width: 320,
        margin: 1,
        errorCorrectionLevel: "H",
        color: { dark: "#000000", light: "#ffffff" },
      },
      function (err) {
        if (err) console.error(err);
      }
    );
  }

  if (shareBtn) {
    shareBtn.addEventListener("click", async function () {
      const shareData = {
        title: "YG Lens Photography",
        text: "YG Lens Photography",
        url: cardUrl,
      };
      try {
        if (navigator.share) {
          await navigator.share(shareData);
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(cardUrl);
          shareBtn.textContent = "Link copied";
          setTimeout(() => (shareBtn.textContent = "Share this card"), 1800);
        }
      } catch (_) {}
    });
  }
})();
