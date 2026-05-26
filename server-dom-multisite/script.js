/*
  СЕРВЕР-ДОМ interactions
  Backend integration: set API_ENDPOINT to your form endpoint and adjust payload mapping if needed.
*/

(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  // Current year in footer
  const yearNode = qs('[data-year]');
  if (yearNode) yearNode.textContent = new Date().getFullYear();

  // Header state and mobile menu
  const header = qs('[data-header]');
  const navToggle = qs('[data-nav-toggle]');
  const navPanel = qs('[data-nav-panel]');
  const setHeader = () => header?.classList.toggle('scrolled', window.scrollY > 12);
  setHeader();
  window.addEventListener('scroll', setHeader, { passive: true });

  navToggle?.addEventListener('click', () => {
    const open = !navPanel.classList.contains('open');
    navPanel.classList.toggle('open', open);
    navToggle.classList.toggle('active', open);
    navToggle.setAttribute('aria-expanded', String(open));
  });
  qsa('.nav-panel a, .brand').forEach((link) => {
    link.addEventListener('click', () => {
      navPanel?.classList.remove('open');
      navToggle?.classList.remove('active');
      navToggle?.setAttribute('aria-expanded', 'false');
    });
  });

  // Cursor glow
  const cursorGlow = qs('.cursor-glow');
  if (cursorGlow && !prefersReducedMotion) {
    let gx = window.innerWidth / 2;
    let gy = window.innerHeight / 2;
    let tx = gx;
    let ty = gy;
    window.addEventListener('pointermove', (event) => {
      tx = event.clientX;
      ty = event.clientY;
    }, { passive: true });
    const moveGlow = () => {
      gx += (tx - gx) * 0.14;
      gy += (ty - gy) * 0.14;
      cursorGlow.style.left = `${gx}px`;
      cursorGlow.style.top = `${gy}px`;
      requestAnimationFrame(moveGlow);
    };
    moveGlow();
  }

  // Neural canvas background: lightweight particles + mouse attraction
  const canvas = qs('#neuralCanvas');
  if (canvas && !prefersReducedMotion) {
    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let particles = [];
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pointer = { x: -9999, y: -9999, active: false };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(120, Math.max(48, Math.floor((width * height) / 15000)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r: Math.random() * 1.6 + 0.5,
        hue: Math.random() > 0.72 ? 280 : 188,
      }));
    };

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
    }, { passive: true });
    window.addEventListener('pointerleave', () => { pointer.active = false; });

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      for (const p of particles) {
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const dist = Math.hypot(dx, dy);
        if (pointer.active && dist < 180) {
          const force = (180 - dist) / 180;
          p.vx += (dx / Math.max(dist, 1)) * force * 0.018;
          p.vy += (dy / Math.max(dist, 1)) * force * 0.018;
        }

        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.992;
        p.vy *= 0.992;

        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;

        ctx.beginPath();
        ctx.fillStyle = `hsla(${p.hue}, 95%, 68%, .75)`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 132) {
            const alpha = (1 - dist / 132) * 0.16;
            ctx.strokeStyle = `rgba(34, 211, 238, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      if (pointer.active) {
        const grd = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 190);
        grd.addColorStop(0, 'rgba(34, 211, 238, .16)');
        grd.addColorStop(0.55, 'rgba(168, 85, 247, .06)');
        grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, 190, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';
      requestAnimationFrame(render);
    };

    resize();
    render();
  }

  // Scroll reveals and staggered blocks
  const revealItems = qsa('[data-reveal], [data-stagger] > *');
  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('in-view'));
  }

  // Cards/buttons pointer light + 3D tilt
  const interactiveSurfaces = qsa('.glass-card, .btn');
  interactiveSurfaces.forEach((el) => {
    el.addEventListener('pointermove', (event) => {
      const rect = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${event.clientX - rect.left}px`);
      el.style.setProperty('--my', `${event.clientY - rect.top}px`);
    }, { passive: true });
  });

  qsa('[data-tilt]').forEach((el) => {
    if (prefersReducedMotion) return;
    let raf = 0;
    el.addEventListener('pointermove', (event) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        const isHero = el.classList.contains('server-stack');
        if (isHero) {
          el.style.transform = `rotateX(${54 - y * 8}deg) rotateZ(${-36 + x * 7}deg) translateY(-8px)`;
        } else {
          el.style.transform = `perspective(900px) rotateX(${-y * 7}deg) rotateY(${x * 7}deg) translateY(-6px)`;
        }
      });
    }, { passive: true });
    el.addEventListener('pointerleave', () => {
      cancelAnimationFrame(raf);
      el.style.transform = '';
    });
  });

  // Magnetic CTA effect
  qsa('.magnetic').forEach((el) => {
    if (prefersReducedMotion) return;
    el.addEventListener('pointermove', (event) => {
      const rect = el.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      el.style.transform = `translate(${x * 0.13}px, ${y * 0.13}px)`;
    }, { passive: true });
    el.addEventListener('pointerleave', () => {
      el.style.transform = '';
    });
  });

  // Cinematic sticky rack parallax
  const rack = qs('[data-rack-sculpture]');
  const cinematic = qs('.cinematic');
  if (rack && cinematic && !prefersReducedMotion) {
    let ticking = false;
    const updateRack = () => {
      const rect = cinematic.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const progress = Math.min(1, Math.max(0, -rect.top / Math.max(total, 1)));
      const rotate = -42 + progress * 24;
      const lift = -18 * Math.sin(progress * Math.PI);
      rack.style.transform = `rotateX(${58 - progress * 8}deg) rotateZ(${rotate}deg) translateY(${lift}px)`;
      qsa('.rack-layer', rack).forEach((layer, index) => {
        const spread = (progress - 0.5) * (index + 1) * 18;
        layer.style.transform = `translateZ(${110 - index * 38}px) translateX(${spread}px)`;
      });
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateRack);
        ticking = true;
      }
    }, { passive: true });
    updateRack();
  }

  // Animated counters
  const counters = qsa('[data-counter]');
  const animateCounter = (node) => {
    const target = parseFloat(node.dataset.counter);
    const suffix = node.dataset.suffix || '';
    const decimals = String(target).includes('.') ? 2 : 0;
    const duration = 1500;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      const value = target * eased;
      node.textContent = `${value.toLocaleString('ru-RU', {
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals,
      })}${suffix}`;
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if ('IntersectionObserver' in window && counters.length) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.45 });
    counters.forEach((counter) => counterObserver.observe(counter));
  } else {
    counters.forEach(animateCounter);
  }

  // Configurator wizard and estimate
  const configForm = qs('#serverConfigForm');
  if (configForm) {
    const steps = qsa('.config-step', configForm);
    const nextBtn = qs('[data-next-step]', configForm);
    const prevBtn = qs('[data-prev-step]', configForm);
    const requestBtn = qs('[data-config-request]', configForm);
    const progress = qs('[data-config-progress]', configForm);
    const estimateNode = qs('[data-estimate]', configForm);
    const recommendationNode = qs('[data-recommendation]', configForm);
    const ramInput = qs('[data-range="ram"]', configForm);
    const ramValue = qs('[data-ram-value]', configForm);
    let stepIndex = 0;

    const recommendations = {
      virtualization: 'Balanced 2U для виртуализации, баз данных и корпоративных сервисов.',
      ai: 'GPU-ready платформа с усиленным питанием, airflow и быстрым NVMe scratch.',
      storage: 'Storage-узел с масштабируемыми полками, RAID/HBA или ZFS/Ceph архитектурой.',
      edge: 'Компактный edge-сервер с удаленным управлением и низким энергопотреблением.',
    };

    const formatCurrency = (value) => `от ${Math.round(value).toLocaleString('ru-RU')} ₽`;
    const calculateEstimate = () => {
      const data = new FormData(configForm);
      let total = 0;
      qsa('input[type="radio"]:checked', configForm).forEach((input) => {
        total += Number(input.dataset.price || 0);
      });
      const ram = Number(data.get('ram') || 512);
      total += ram * 1200;
      const task = data.get('task') || 'virtualization';
      if (estimateNode) estimateNode.textContent = formatCurrency(total);
      if (recommendationNode) recommendationNode.textContent = recommendations[task] || recommendations.virtualization;
      if (ramValue) ramValue.textContent = String(ram);
      return { total, task, ram, data };
    };

    const showStep = (index) => {
      stepIndex = Math.min(Math.max(index, 0), steps.length - 1);
      steps.forEach((step, i) => step.classList.toggle('active', i === stepIndex));
      if (progress) progress.style.width = `${((stepIndex + 1) / steps.length) * 100}%`;
      if (prevBtn) prevBtn.disabled = stepIndex === 0;
      if (nextBtn) nextBtn.style.display = stepIndex === steps.length - 1 ? 'none' : 'inline-flex';
      if (requestBtn) requestBtn.style.display = stepIndex === steps.length - 1 ? 'inline-flex' : 'none';
    };

    configForm.addEventListener('input', calculateEstimate);
    ramInput?.addEventListener('input', calculateEstimate);
    nextBtn?.addEventListener('click', () => showStep(stepIndex + 1));
    prevBtn?.addEventListener('click', () => showStep(stepIndex - 1));
    requestBtn?.addEventListener('click', () => {
      const { total, task, ram, data } = calculateEstimate();
      const leadComment = qs('textarea[name="comment"]', qs('#leadForm'));
      const text = [
        'Интересует расчет серверной конфигурации:',
        `Задача: ${task}`,
        `CPU: ${data.get('cpu')}`,
        `RAM: ${ram} ГБ`,
        `Storage: ${data.get('storage')}`,
        `Cooling/SLA: ${data.get('cooling')}`,
        `Ориентир: ${formatCurrency(total)}`,
      ].join('\n');
      if (leadComment && !leadComment.value.trim()) leadComment.value = text;
    });

    calculateEstimate();
    showStep(0);
  }

  // Solution modal
  const modal = qs('[data-modal]');
  const modalContent = qs('[data-modal-content]');
  const modalClose = qs('[data-close-modal]');
  const modalData = {
    rack: {
      title: 'Rack-серверы 1U/2U',
      text: 'Универсальные платформы для виртуализации, терминальных ферм, web/backend, SQL/NoSQL и корпоративных сервисов. Поддерживаем dual PSU, IPMI/Redfish, 10/25/100G NIC и hot-swap диски.',
      tags: ['1U/2U', 'DDR5 ECC', 'RAID/HBA', 'IPMI', 'VM-ready'],
    },
    gpu: {
      title: 'GPU/AI-серверы',
      text: 'Платформы для обучения моделей, inference, VDI, render и HPC. Рассчитываем теплопакет, питание, плотность GPU, NVMe scratch и сетевую фабрику для кластеров.',
      tags: ['до 8 GPU', 'NVLink/PCIe', '4kW PSU', 'Liquid-ready', 'HPC'],
    },
    storage: {
      title: 'Системы хранения',
      text: 'All-flash, hybrid и capacity storage для backup, архивов, аналитики и виртуализации. Проектируем ZFS/Ceph, object storage, репликацию и политики снапшотов.',
      tags: ['NVMe/SAS/SATA', 'ZFS/Ceph', 'Snapshots', 'Replication', 'WORM'],
    },
    edge: {
      title: 'Edge-серверы',
      text: 'Компактные узлы для филиалов, retail, производства и IoT. Удаленное управление, устойчивость к нестабильной среде, низкое энергопотребление и быстрый swap модулей.',
      tags: ['Compact', 'Low-power', 'Remote mgmt', 'IoT', 'Retail'],
    },
    custom: {
      title: 'Кастомные сборки и кластеры',
      text: 'Нестандартные конфигурации под конкретный SLA, rack layout, гипервизор, Kubernetes, базы данных, GPU-кластеры и ограничения по шуму/питанию/охлаждению.',
      tags: ['HA Cluster', 'Kubernetes', 'Proxmox', 'VMware', 'Rack layout'],
    },
  };

  qsa('[data-open-modal]').forEach((button) => {
    button.addEventListener('click', () => {
      const item = modalData[button.dataset.openModal];
      if (!item || !modal || !modalContent) return;
      modalContent.innerHTML = `
        <h3>${item.title}</h3>
        <p>${item.text}</p>
        <div class="modal-tags">${item.tags.map((tag) => `<span>${tag}</span>`).join('')}</div>
        <a class="btn btn-primary" href="#contacts" data-close-and-go>Запросить спецификацию</a>
      `;
      if (typeof modal.showModal === 'function') modal.showModal();
      else modal.setAttribute('open', '');
      qs('[data-close-and-go]', modalContent)?.addEventListener('click', () => modal.close?.());
    });
  });
  modalClose?.addEventListener('click', () => modal?.close());
  modal?.addEventListener('click', (event) => {
    const rect = modal.getBoundingClientRect();
    const inDialog = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inDialog) modal.close();
  });

  // Lead form: ready for backend via fetch/API
  const leadForm = qs('#leadForm');
  const API_ENDPOINT = '/.netlify/functions/lead'; // Netlify Function. For another backend, replace this URL.
  leadForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = qs('[data-form-status]', leadForm);
    const submit = qs('button[type="submit"]', leadForm);
    const payload = Object.fromEntries(new FormData(leadForm).entries());

    if (status) {
      status.className = 'form-status';
      status.textContent = 'Отправляем заявку…';
    }
    if (submit) submit.disabled = true;

    try {
      if (API_ENDPOINT) {
        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      } else {
        // Demo mode for static preview. Replace with fetch above by setting API_ENDPOINT.
        await new Promise((resolve) => setTimeout(resolve, 750));
        console.info('Lead payload:', payload);
      }
      if (status) {
        status.classList.add('ok');
        status.textContent = 'Готово! Заявка подготовлена. В демо-режиме данные выведены в console.info.';
      }
      leadForm.reset();
    } catch (error) {
      console.error(error);
      if (status) {
        status.classList.add('error');
        status.textContent = 'Не удалось отправить форму. Проверьте подключение API или попробуйте позже.';
      }
    } finally {
      if (submit) submit.disabled = false;
    }
  });
})();
