class IconPaster {
  constructor() {
    this.canvas = document.getElementById('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.icons = [];
    this.selectedIcon = null;
    this.dragOffset = { x: 0, y: 0 };
    this.isDragging = false;
    this.backgroundImage = null;
    this.currentSize = 50;

    this.resizeCanvas();
    this.setupEventListeners();
    this.setupFileInput();
    this.setupFileDrop();

    const sizeSlider = document.getElementById('size-slider');
    sizeSlider.addEventListener('input', (e) => {
      this.currentSize = parseInt(e.target.value);
      this.icons.forEach(icon => {
        const ratio = icon.image.width / icon.image.height;
        icon.width = this.currentSize;
        icon.height = this.currentSize / ratio;
      });
      this.redraw();
    });

    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    const container = document.getElementById('canvas-container');
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
    this.redraw();
  }

  setupEventListeners() {
    this.canvas.addEventListener('mousedown', this.handleStart.bind(this));
    this.canvas.addEventListener('touchstart', this.handleStart.bind(this), { passive: false });
    window.addEventListener('mousemove', this.handleMove.bind(this));
    window.addEventListener('touchmove', this.handleMove.bind(this), { passive: false });
    window.addEventListener('mouseup', this.handleEnd.bind(this));
    window.addEventListener('touchend', this.handleEnd.bind(this));

    document.getElementById('delete-btn').addEventListener('click', () => {
      if (this.selectedIcon) {
        const index = this.icons.indexOf(this.selectedIcon);
        if (index !== -1) {
          this.icons.splice(index, 1);
          this.selectedIcon = null;
          this.redraw();
        }
      }
    });

    document.getElementById('save-btn').addEventListener('click', () => this.saveAsPNG());
  }

  setupFileInput() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.getElementById('load-btn').addEventListener('click', () => input.click());
    input.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.loadBackgroundImage(e.target.files[0]);
      }
    });
    document.body.appendChild(input);
  }

  setupFileDrop() {
    const highlight = () => {
      this.canvas.style.border = '2px dashed #FF5733';
    };

    const removeHighlight = () => {
      this.canvas.style.border = '';
    };

    this.canvas.addEventListener('dragover', (e) => {
      e.preventDefault();
      highlight();
    });

    this.canvas.addEventListener('dragleave', removeHighlight);

    this.canvas.addEventListener('drop', (e) => {
      e.preventDefault();
      removeHighlight();
      const pos = this.getEventPosition(e);

      if (e.ctrlKey || e.metaKey) {
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.loadBackgroundImage(e.dataTransfer.files[0]);
        }
        return;
      }

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        if (!this.backgroundImage) {
          this.loadBackgroundImage(e.dataTransfer.files[0]);
        } else {
          this.addIconFromFile(e.dataTransfer.files[0], pos);
        }
      } else if (e.dataTransfer.getData('text/html')) {
        const html = e.dataTransfer.getData('text/html');
        const imgUrl = this.extractImgUrlFromHTML(html);
        if (imgUrl) this.addIconFromUrl(imgUrl, pos);
      }
    });
  }

  extractImgUrlFromHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const img = doc.querySelector('img');
    return img ? img.src : null;
  }

  loadBackgroundImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.backgroundImage = img;
        this.redraw();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  addIconFromFile(file, pos) {
    if (!file.type.match('image.*')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.addIconAtPosition(pos.x, pos.y, img);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  addIconFromUrl(url, pos) {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      this.addIconAtPosition(pos.x, pos.y, img);
    };
    img.onerror = () => console.error('画像読み込み失敗:', url);
    img.src = url;
  }

  addIconAtPosition(x, y, img) {
    const ratio = img.width / img.height;
    const width = this.currentSize;
    const height = width / ratio;

    const newIcon = {
      image: img,
      x: x - width/2,
      y: y - height/2,
      width: width,
      height: height
    };

    this.icons.push(newIcon);
    this.selectedIcon = newIcon;
    document.getElementById('size-slider').value = width;
    this.redraw();
  }

  handleStart(e) {
    e.preventDefault();
    const pos = this.getEventPosition(e);
    this.selectedIcon = this.findIconAt(pos.x, pos.y);
    if (this.selectedIcon) {
      this.isDragging = true;
      this.dragOffset = {
        x: pos.x - this.selectedIcon.x,
        y: pos.y - this.selectedIcon.y
      };
      document.getElementById('size-slider').value = this.selectedIcon.width;
      this.currentSize = this.selectedIcon.width;
    } else {
      document.getElementById('size-slider').value = this.currentSize;
    }
    this.redraw();
  }

  handleMove(e) {
    if (!this.isDragging || !this.selectedIcon) return;
    e.preventDefault();
    const pos = this.getEventPosition(e);
    this.selectedIcon.x = pos.x - this.dragOffset.x;
    this.selectedIcon.y = pos.y - this.dragOffset.y;
    this.redraw();
  }

  handleEnd() {
    this.isDragging = false;
    this.redraw();
  }

  getEventPosition(e) {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  findIconAt(x, y) {
    for (let i = this.icons.length - 1; i >= 0; i--) {
      const icon = this.icons[i];
      if (x >= icon.x && x <= icon.x + icon.width &&
          y >= icon.y && y <= icon.y + icon.height) {
        return icon;
      }
    }
    return null;
  }

  redraw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.backgroundImage) {
      const ratio = Math.min(
        this.canvas.width / this.backgroundImage.width,
        this.canvas.height / this.backgroundImage.height
      );
      const width = this.backgroundImage.width * ratio;
      const height = this.backgroundImage.height * ratio;
      const x = (this.canvas.width - width) / 2;
      const y = (this.canvas.height - height) / 2;
      this.ctx.drawImage(this.backgroundImage, x, y, width, height);
    }

    this.icons.forEach(icon => {
      if (icon.image) {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(
          icon.x + icon.width/2,
          icon.y + icon.height/2,
          Math.min(icon.width, icon.height)/2,
          0,
          Math.PI * 2
        );
        this.ctx.closePath();
        this.ctx.clip();

        this.ctx.drawImage(icon.image, icon.x, icon.y, icon.width, icon.height);
        this.ctx.restore();

        if (icon === this.selectedIcon) {
          this.ctx.strokeStyle = '#0066FF';
          this.ctx.lineWidth = 2;
          this.ctx.setLineDash([5, 5]);
          this.ctx.beginPath();
          this.ctx.arc(
            icon.x + icon.width/2,
            icon.y + icon.height/2,
            Math.min(icon.width, icon.height)/2 + 3,
            0,
            Math.PI * 2
          );
          this.ctx.stroke();
          this.ctx.setLineDash([]);
        }
      }
    });
  }

  saveAsPNG() {
    this.selectedIcon = null;
    this.redraw();

    const link = document.createElement('a');
    link.download = 'icon-paster.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new IconPaster();
});
