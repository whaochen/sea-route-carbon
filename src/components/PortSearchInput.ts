import { formatPortDisplay, searchPorts, type PortItem } from '../services/routeEngine';

export interface PortSearchOptions {
  placeholder?: string;
  initialPort?: PortItem;
  onChange?: (port: PortItem | null) => void;
}

export class PortSearchInput {
  private root: HTMLElement;
  private inputEl: HTMLInputElement;
  private clearBtn: HTMLButtonElement;
  private dropdownEl: HTMLUListElement;
  private selectedPort: PortItem | null = null;
  private results: PortItem[] = [];
  private activeIdx = -1;
  private onChange?: (port: PortItem | null) => void;

  constructor(mountEl: HTMLElement, options: PortSearchOptions = {}) {
    this.onChange = options.onChange;

    this.root = document.createElement('div');
    this.root.className = 'port-search';

    const inputWrap = document.createElement('div');
    inputWrap.className = 'port-search-input-wrap';

    this.inputEl = document.createElement('input');
    this.inputEl.type = 'text';
    this.inputEl.className = 'port-search-input';
    this.inputEl.placeholder = options.placeholder ?? '輸入代碼或中英文港名（如 TWKHH、高雄、鹿特丹）';
    this.inputEl.autocomplete = 'off';

    this.clearBtn = document.createElement('button');
    this.clearBtn.type = 'button';
    this.clearBtn.className = 'port-search-clear hidden';
    this.clearBtn.textContent = '✕';
    this.clearBtn.title = '清除港口';

    this.dropdownEl = document.createElement('ul');
    this.dropdownEl.className = 'port-search-dropdown hidden';

    inputWrap.appendChild(this.inputEl);
    inputWrap.appendChild(this.clearBtn);
    this.root.appendChild(inputWrap);
    this.root.appendChild(this.dropdownEl);

    mountEl.innerHTML = '';
    mountEl.appendChild(this.root);

    if (options.initialPort) {
      this.setPort(options.initialPort, false);
    }

    this.bindEvents();
  }

  public getPort(): PortItem | null {
    return this.selectedPort;
  }

  public setPort(port: PortItem | null, emit = true): void {
    this.selectedPort = port;
    if (port) {
      this.inputEl.value = formatPortDisplay(port);
      this.clearBtn.classList.remove('hidden');
    } else {
      this.inputEl.value = '';
      this.clearBtn.classList.add('hidden');
    }
    this.closeDropdown();
    if (emit) this.onChange?.(port);
  }

  private bindEvents(): void {
    this.inputEl.addEventListener('focus', () => {
      const q = this.selectedPort ? '' : this.inputEl.value;
      this.openDropdown(searchPorts(q));
    });

    this.inputEl.addEventListener('input', () => {
      this.selectedPort = null;
      this.clearBtn.classList.toggle('hidden', this.inputEl.value.length === 0);
      this.openDropdown(searchPorts(this.inputEl.value));
    });

    this.inputEl.addEventListener('keydown', (e) => {
      if (this.dropdownEl.classList.contains('hidden')) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.activeIdx = Math.min(this.activeIdx + 1, this.results.length - 1);
        this.highlightActive();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.activeIdx = Math.max(this.activeIdx - 1, 0);
        this.highlightActive();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (this.activeIdx >= 0 && this.results[this.activeIdx]) {
          this.setPort(this.results[this.activeIdx]);
        } else if (this.results[0]) {
          this.setPort(this.results[0]);
        }
      } else if (e.key === 'Escape') {
        this.closeDropdown();
      }
    });

    this.clearBtn.addEventListener('click', () => {
      this.setPort(null);
      this.inputEl.focus();
    });

    document.addEventListener('click', (e) => {
      if (!this.root.contains(e.target as Node)) {
        this.closeDropdown();
      }
    });
  }

  private openDropdown(items: PortItem[]): void {
    this.results = items;
    this.activeIdx = items.length > 0 ? 0 : -1;
    this.dropdownEl.innerHTML = '';

    if (items.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'port-option empty';
      empty.textContent = '找不到相符的港口，請嘗試輸入 5 碼 UN/LOCODE 或英文名稱';
      this.dropdownEl.appendChild(empty);
    } else {
      items.forEach((port, idx) => {
        const li = document.createElement('li');
        li.className = 'port-option' + (idx === this.activeIdx ? ' active' : '');
        li.innerHTML = `
          <span class="opt-code">${port.code}</span>
          <span class="opt-name">${port.zhName ? `${port.zhName} · ${port.name}` : port.name}</span>
          <span class="opt-country">${port.zhCountry ?? port.country}</span>
        `;
        li.addEventListener('mousedown', (e) => {
          e.preventDefault();
          this.setPort(port);
        });
        this.dropdownEl.appendChild(li);
      });
    }

    this.dropdownEl.classList.remove('hidden');
  }

  private highlightActive(): void {
    const children = this.dropdownEl.querySelectorAll('.port-option');
    children.forEach((el, idx) => {
      el.classList.toggle('active', idx === this.activeIdx);
    });
    const activeEl = children[this.activeIdx] as HTMLElement | undefined;
    activeEl?.scrollIntoView({ block: 'nearest' });
  }

  private closeDropdown(): void {
    this.dropdownEl.classList.add('hidden');
  }
}
