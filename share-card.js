(function () {
  function createShareCardTools(context) {
    const SHARE_CARD_TEMPLATES = window.GameRewindShareCardTemplates || [];

    function getShareCardTemplate(templateKey) {
      return SHARE_CARD_TEMPLATES.find((template) => template.key === templateKey) || SHARE_CARD_TEMPLATES[0];
    }

    function getShareCardTemplateExportBackground(template) {
      const embeddedBackgrounds = window.GameRewindShareCardBackgrounds || {};
      return embeddedBackgrounds[template.key] || template.backgroundUrl || "";
    }

    function isSingleItem(item) {
      return item && item.label === "Single";
    }

    function appendSingleArtwork(imageWrap, imageUrl, altText, onError) {
      const background = document.createElement("img");
      background.src = imageUrl;
      background.alt = "";
      background.loading = "lazy";
      background.referrerPolicy = "no-referrer";
      background.className = "single-art-bg";

      const image = document.createElement("img");
      image.src = imageUrl;
      image.alt = altText;
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      image.className = "single-art-main";

      let failed = false;
      function handleError() {
        if (failed) return;
        failed = true;
        background.remove();
        image.remove();
        onError();
      }

      background.addEventListener("error", handleError, { once: true });
      image.addEventListener("error", handleError, { once: true });

      imageWrap.appendChild(background);
      imageWrap.appendChild(image);
    }

    function getShareCardItems(game, selections, gameImageUrl = "", includedCategories = null) {
      const gameItem = includedCategories && includedCategories.game === false
        ? []
        : [{
          label: "Game",
          title: game.console ? `${game.title} - ${game.console}` : game.title,
          imageUrl: gameImageUrl
        }];

      return [
        ...gameItem,
        ...context.getRetroWeekendItems(game, selections, includedCategories).map((item) => ({
          label: item.label,
          title: item.title,
          imageUrl: item.imageUrl || ""
        }))
      ];
    }

    function buildRetroWeekendShareText(game, selections, includedCategories = null) {
      const lines = [
        "My Game Rewind UK Retro Weekend",
        `${game.title}${game.console ? ` - ${game.console}` : ""}`,
        `${context.monthNameFromNumber(game.month)} ${game.year}`,
        "",
        ...getShareCardItems(game, selections, "", includedCategories).map((item) => `${item.label}: ${item.title}`),
        "",
        "Made with Game Rewind UK"
      ];

      return lines.join("\n");
    }

    function renderHtmlShareCard(target, game, selections, gameImageUrl = "", includedCategories = null, templateKey = "standard") {
      const items = getShareCardItems(game, selections, gameImageUrl, includedCategories).slice(0, 6);
      const template = getShareCardTemplate(templateKey);

      target.innerHTML = "";

      const shell = document.createElement("div");
      shell.className = `html-share-card html-share-card--${template.key}`;
      const templateBackground = template.backgroundUrl || "";
      shell.style.setProperty("--share-card-bg", templateBackground ? `url("${templateBackground}")` : "none");

      const content = document.createElement("div");
      content.className = "html-share-card-content";

      const brand = document.createElement("div");
      brand.className = "html-share-card-brand";
      brand.textContent = "GAME REWIND UK";

      const templateTag = document.createElement("div");
      templateTag.className = "html-share-card-template-tag";
      templateTag.textContent = template.label;

      const title = document.createElement("div");
      title.className = "html-share-card-title";
      title.textContent = "YOUR RETRO WEEKEND";

      const meta = document.createElement("div");
      meta.className = "html-share-card-meta";
      meta.textContent = `${context.monthNameFromNumber(game.month)} ${game.year}`;

      const grid = document.createElement("div");
      grid.className = "html-share-card-grid";

      if (!items.length) {
        const empty = document.createElement("div");
        empty.className = "html-share-card-empty";
        empty.textContent = "No categories selected.";
        grid.appendChild(empty);
      }

      items.forEach((item) => {
        const tile = document.createElement("div");
        tile.className = "html-share-card-tile";

        const imageWrap = document.createElement("div");
        imageWrap.className = isSingleItem(item) ? "html-share-card-image html-share-card-image--single" : "html-share-card-image";

        if (item.imageUrl) {
          if (isSingleItem(item)) {
            appendSingleArtwork(
              imageWrap,
              item.imageUrl,
              `${item.label}: ${item.title}`,
              () => {
                imageWrap.classList.add("is-placeholder");
                context.setImagePendingPlaceholder(imageWrap, item.label);
              }
            );
          } else {
            const image = document.createElement("img");
            image.src = item.imageUrl;
            image.alt = `${item.label}: ${item.title}`;
            image.loading = "lazy";
            image.referrerPolicy = "no-referrer";
            image.addEventListener("error", () => {
              image.remove();
              imageWrap.classList.add("is-placeholder");
              context.setImagePendingPlaceholder(imageWrap, item.label);
            }, { once: true });
            imageWrap.appendChild(image);
          }
        } else {
          imageWrap.classList.add("is-placeholder");
          context.setImagePendingPlaceholder(imageWrap, item.label);
        }

        const label = document.createElement("div");
        label.className = "html-share-card-label";
        label.textContent = item.label;

        const name = document.createElement("div");
        name.className = "html-share-card-name";
        name.textContent = item.title;

        tile.appendChild(imageWrap);
        tile.appendChild(label);
        tile.appendChild(name);
        grid.appendChild(tile);
      });

      const footer = document.createElement("div");
      footer.className = "html-share-card-footer";
      footer.textContent = "gamerewind.uk";

      if (template.showBrand !== false) {
        content.appendChild(brand);
      }
      if (template.showTemplateTag !== false) {
        content.appendChild(templateTag);
      }
      content.appendChild(title);
      content.appendChild(meta);
      content.appendChild(grid);
      if (template.showFooter !== false) {
        content.appendChild(footer);
      }
      shell.appendChild(content);
      target.appendChild(shell);
    }

    function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines = Infinity) {
      const words = String(text || "").split(/\s+/).filter(Boolean);
      const lines = [];
      let line = "";

      words.forEach((word) => {
        const testLine = line ? `${line} ${word}` : word;
        if (ctx.measureText(testLine).width <= maxWidth || !line) {
          line = testLine;
          return;
        }

        lines.push(line);
        line = word;
      });

      if (line) {
        lines.push(line);
      }

      const visibleLines = lines.slice(0, maxLines);
      if (lines.length > maxLines && visibleLines.length) {
        let lastLine = visibleLines[visibleLines.length - 1];
        while (lastLine.length && ctx.measureText(`${lastLine}...`).width > maxWidth) {
          lastLine = lastLine.slice(0, -1).trim();
        }
        visibleLines[visibleLines.length - 1] = `${lastLine}...`;
      }

      visibleLines.forEach((lineText, index) => {
        ctx.fillText(lineText, x, y + (index * lineHeight));
      });

      return y + (visibleLines.length * lineHeight);
    }

    function loadImageFromDataUrl(src) {
      return new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = src;
      });
    }

    function blobToDataUrl(blob) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve("");
        reader.readAsDataURL(blob);
      });
    }

    function getCanvasSafeImageUrl(src) {
      const value = String(src || "").trim();
      if (!value || value.startsWith("data:") || value.startsWith("blob:")) {
        return value;
      }

      if (!/^https?:\/\//i.test(value)) {
        try {
          return new URL(value, window.location.href).href;
        } catch (err) {
          return value;
        }
      }

      if (value.includes("images.weserv.nl/")) {
        return value;
      }

      try {
        const url = new URL(value);
        if (url.origin === window.location.origin) {
          return url.href;
        }
      } catch (err) {
        return value;
      }

      return `https://images.weserv.nl/?url=${encodeURIComponent(value)}`;
    }

    async function loadShareCardImage(src) {
      if (!src) return null;

      const canvasSafeSrc = getCanvasSafeImageUrl(src);
      if (!canvasSafeSrc) return null;

      if (canvasSafeSrc.startsWith("data:")) {
        return loadImageFromDataUrl(canvasSafeSrc);
      }

      try {
        const response = await fetch(canvasSafeSrc, {
          mode: "cors",
          referrerPolicy: "no-referrer"
        });
        if (!response.ok) return null;

        const blob = await response.blob();
        const dataUrl = await blobToDataUrl(blob);
        return dataUrl ? loadImageFromDataUrl(dataUrl) : null;
      } catch (err) {
        return null;
      }
    }

    async function loadShareCardTemplateBackground(src) {
      const value = String(src || "").trim();
      if (!value) return null;

      if (value.startsWith("data:")) {
        return loadImageFromDataUrl(value);
      }

      let imageSrc = value;
      try {
        imageSrc = new URL(value, window.location.href).href;
      } catch (err) {
        imageSrc = value;
      }

      try {
        const response = await fetch(imageSrc);
        if (!response.ok) return null;

        const blob = await response.blob();
        const dataUrl = await blobToDataUrl(blob);
        return dataUrl ? loadImageFromDataUrl(dataUrl) : null;
      } catch (err) {
        return null;
      }
    }

    function drawCanvasImageContain(ctx, image, x, y, width, height) {
      const imageRatio = image.width / image.height;
      const boxRatio = width / height;
      let drawWidth = width;
      let drawHeight = height;

      if (imageRatio > boxRatio) {
        drawHeight = width / imageRatio;
      } else {
        drawWidth = height * imageRatio;
      }

      const drawX = x + ((width - drawWidth) / 2);
      const drawY = y + ((height - drawHeight) / 2);
      ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    }

    function drawCanvasImageCover(ctx, image, x, y, width, height) {
      const imageRatio = image.width / image.height;
      const boxRatio = width / height;
      let sourceWidth = image.width;
      let sourceHeight = image.height;
      let sourceX = 0;
      let sourceY = 0;

      if (imageRatio > boxRatio) {
        sourceWidth = image.height * boxRatio;
        sourceX = (image.width - sourceWidth) / 2;
      } else {
        sourceHeight = image.width / boxRatio;
        sourceY = (image.height - sourceHeight) / 2;
      }

      ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
    }

    async function drawRetroWeekendShareCard(canvas, game, selections, gameImageUrl = "", includedCategories = null, templateKey = "standard") {
      const ctx = canvas.getContext("2d");
      const width = 1080;
      const height = 1920;
      const items = getShareCardItems(game, selections, gameImageUrl, includedCategories).slice(0, 6);
      const template = getShareCardTemplate(templateKey);
      const loadedImages = await Promise.all([
        loadShareCardTemplateBackground(getShareCardTemplateExportBackground(template)),
        ...items.map((item) => loadShareCardImage(item.imageUrl))
      ]);
      const backgroundImage = loadedImages[0];
      const itemImages = loadedImages.slice(1);
      const box = template.box;

      canvas.width = width;
      canvas.height = height;

      if (backgroundImage) {
        drawCanvasImageCover(ctx, backgroundImage, 0, 0, width, height);
      } else if (template.key === "standard") {
        const bg = ctx.createLinearGradient(0, 0, width, height);
        bg.addColorStop(0, "#080914");
        bg.addColorStop(0.55, "#121223");
        bg.addColorStop(1, "#071a22");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = "rgba(255, 246, 216, 0.12)";
        ctx.lineWidth = 1;
        for (let y = 0; y < height; y += 18) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        for (let x = 0; x < width; x += 36) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }

        ctx.strokeStyle = "#46dfff";
        ctx.lineWidth = 6;
        ctx.strokeRect(36, 36, width - 72, height - 72);
        ctx.strokeStyle = "#ffd84a";
        ctx.lineWidth = 3;
        ctx.strokeRect(52, 52, width - 104, height - 104);
      } else {
        ctx.fillStyle = "#080914";
        ctx.fillRect(0, 0, width, height);
      }

      if (template.panel && template.panel !== "rgba(0, 0, 0, 0)") {
        ctx.fillStyle = template.panel;
        ctx.fillRect(box.x, box.y, box.width, box.height);
      }

      const inset = 28;
      const contentX = box.x + inset;
      const contentWidth = box.width - (inset * 2);
      let cursorY = box.y + inset;

      ctx.textAlign = "center";

      if (template.showBrand !== false) {
        ctx.fillStyle = template.accent;
        ctx.font = "700 24px 'Chakra Petch', sans-serif";
        ctx.fillText("GAME REWIND UK", box.x + (box.width / 2), cursorY + 24);
        cursorY += 34;
      }

      if (template.showTemplateTag !== false) {
        ctx.fillStyle = template.muted;
        ctx.font = "700 22px 'Chakra Petch', sans-serif";
        ctx.fillText(template.label.toUpperCase(), box.x + (box.width / 2), cursorY + 24);
        cursorY += 34;
      }

      ctx.fillStyle = template.text;
      ctx.font = "700 46px 'Chakra Petch', sans-serif";
      ctx.fillText("YOUR RETRO WEEKEND", box.x + (box.width / 2), cursorY + 56);

      ctx.fillStyle = template.muted;
      ctx.font = "700 30px 'Chakra Petch', sans-serif";
      ctx.fillText(`${context.monthNameFromNumber(game.month)} ${game.year}`, box.x + (box.width / 2), cursorY + 100);
      ctx.textAlign = "left";

      cursorY += 142;

      if (!items.length) {
        ctx.fillStyle = template.text;
        ctx.font = "700 28px 'Chakra Petch', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("No categories selected.", box.x + (box.width / 2), cursorY + 80);
        ctx.textAlign = "left";
      }

      const gap = 18;
      const columns = 3;
      const cardWidth = (contentWidth - (gap * (columns - 1))) / columns;
      const footerSpace = template.showFooter === false ? 12 : 70;
      const remainingHeight = Math.max(360, box.y + box.height - cursorY - footerSpace);
      const rows = Math.max(1, Math.ceil(items.length / columns));
      const itemHeight = Math.min(390, (remainingHeight - (gap * (rows - 1))) / rows);
      const imageHeight = Math.max(130, itemHeight - 112);

      items.forEach((item, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const x = contentX + (column * (cardWidth + gap));
        const y = cursorY + (row * (itemHeight + gap));
        const image = itemImages[index];
        const strokeWidth = template.key === "game-box" ? 0 : 2;
        const imageInset = strokeWidth || 2;
        const imageX = x + imageInset;
        const imageY = y + imageInset;
        const imageWidth = cardWidth - (imageInset * 2);
        const insetImageHeight = imageHeight - imageInset;

        ctx.fillStyle = template.key === "web-y2k" || template.key === "game-box"
          ? "rgba(255, 255, 255, 0.72)"
          : "rgba(0, 0, 0, 0.48)";
        ctx.fillRect(x, y, cardWidth, itemHeight);

        if (image) {
          try {
            if (isSingleItem(item)) {
              ctx.save();
              ctx.beginPath();
              ctx.rect(imageX, imageY, imageWidth, insetImageHeight);
              ctx.clip();

              ctx.save();
              ctx.filter = "blur(16px) saturate(1.25)";
              drawCanvasImageCover(ctx, image, imageX - 12, imageY - 12, imageWidth + 24, insetImageHeight + 24);
              ctx.restore();

              ctx.fillStyle = "rgba(0, 0, 0, 0.26)";
              ctx.fillRect(imageX, imageY, imageWidth, insetImageHeight);
            }

            if (isSingleItem(item)) {
              const singleZoom = 1.16;
              const zoomWidth = imageWidth * singleZoom;
              const zoomHeight = insetImageHeight * singleZoom;
              drawCanvasImageCover(
                ctx,
                image,
                imageX - ((zoomWidth - imageWidth) / 2),
                imageY - ((zoomHeight - insetImageHeight) / 2),
                zoomWidth,
                zoomHeight
              );
              ctx.restore();
            } else {
              drawCanvasImageContain(ctx, image, imageX, imageY, imageWidth, insetImageHeight);
            }
          } catch (err) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
            ctx.fillRect(imageX, imageY, imageWidth, insetImageHeight);
          }
        } else {
          ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
          ctx.fillRect(imageX, imageY, imageWidth, insetImageHeight);
          ctx.fillStyle = template.accent;
          ctx.font = "700 22px 'Chakra Petch', sans-serif";
          ctx.fillText(item.label.toUpperCase(), x + 16, y + 68);
          ctx.fillStyle = template.muted;
          ctx.font = "700 18px 'Chakra Petch', sans-serif";
          ctx.fillText("IMAGE PENDING", x + 16, y + 100);
        }

        if (template.key !== "game-box") {
          ctx.strokeStyle = template.muted;
          ctx.lineWidth = strokeWidth;
          ctx.strokeRect(x, y, cardWidth, itemHeight);
        }

        ctx.fillStyle = template.accent;
        ctx.font = "700 18px 'Chakra Petch', sans-serif";
        ctx.fillText(item.label.toUpperCase(), x + 14, y + imageHeight + 28);

        ctx.fillStyle = template.text;
        ctx.font = "700 21px 'Chakra Petch', sans-serif";
        wrapCanvasText(ctx, item.title, x + 14, y + imageHeight + 58, cardWidth - 28, 26, 3);
      });

      if (template.showFooter !== false) {
        ctx.fillStyle = template.footer;
        ctx.font = "700 24px 'Chakra Petch', sans-serif";
        ctx.fillText("gamerewind.uk", contentX, box.y + box.height - 24);
      }

      return canvas;
    }

    function getShareCardFileName(game, extension) {
      const monthAbbreviations = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthPart = monthAbbreviations[(game.month || 1) - 1] || "Month";
      const yearPart = String(game.year || "").slice(-2) || "YY";
      return `RetroWeekend${monthPart}${yearPart}.${extension}`;
    }

    function canvasToBlob(canvas, type = "image/png", quality = 0.9) {
      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), type, quality);
      });
    }

    function isMobileShareDevice() {
      return window.matchMedia("(pointer: coarse)").matches ||
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
    }

    function downloadShareCard(dataUrl, game, extension = "png") {
      const link = document.createElement("a");

      link.href = dataUrl;
      link.download = getShareCardFileName(game, extension);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }

    async function shareOrDownloadMobileJpg(canvas, game) {
      const blob = await canvasToBlob(canvas, "image/jpeg", 0.9);
      if (!blob) {
        throw new Error("Could not create JPG");
      }

      const file = new File([blob], getShareCardFileName(game, "jpg"), { type: "image/jpeg" });
      if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
        await navigator.share({
          files: [file],
          title: "My Game Rewind UK Retro Weekend",
          text: "Made with Game Rewind UK"
        });
        return;
      }

      downloadShareCard(URL.createObjectURL(blob), game, "jpg");
    }

    return {
      appendSingleArtwork,
      buildRetroWeekendShareText,
      downloadShareCard,
      drawRetroWeekendShareCard,
      isMobileShareDevice,
      isSingleItem,
      renderHtmlShareCard,
      shareOrDownloadMobileJpg
    };
  }

  window.GameRewindShareCard = {
    createShareCardTools
  };
})();
