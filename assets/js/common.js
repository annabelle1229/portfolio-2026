var mobile = (!/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? false : true);

gsap.registerPlugin(ScrollTrigger);

// ── Lenis smooth scroll ──
const lenis = new Lenis();
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);


function checkNavScroll() {
    $('#main-nav').toggleClass('scrolled', $(window).scrollTop() > 20);
}
$(function(){
    // ── Nav: scrolled class ──
    $(window).on('scroll', checkNavScroll);
    // ── Nav: hamburger toggle ──
    $('#hamburger').on('click', function() {
        $(this).toggleClass('open');
        $('#mobile-menu').toggleClass('open');
    });
    $('.mobile-link').on('click', function() {
        $('#hamburger').removeClass('open');
        $('#mobile-menu').removeClass('open');
    });
    $('a[href*="#"]').on('click', function(e) {
        const href = this.getAttribute('href');
        const hashIndex = href.indexOf('#');
        const hash = href.slice(hashIndex); // ex "#projects-sec"
        const path = href.slice(0, hashIndex); // ex "index.html"

        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const isCurrentPage = (path === '' || path === currentPage);

        const target = $(hash);

        if (isCurrentPage && target.length) {
            e.preventDefault();
            lenis.resize(); // 強制重新計算滾動範圍與元素位置
            lenis.scrollTo(target[0], {
                offset: -150,
                duration: 1.2
            });
        }
    });
})


// ── Career Swiper ──
let careerSwiperInstance = null;

function initCareerSwiper() {
    const el = document.querySelector('.career-swiper');
    if (!el || typeof Swiper === 'undefined') return;
    if (careerSwiperInstance) {
        careerSwiperInstance.destroy(true, true);
        careerSwiperInstance = null;
    }

    careerSwiperInstance = new Swiper('.career-swiper', {
        freeMode: {
            enabled: true,
            sticky: false,
            momentumRatio: 0.6,
        },
        slidesPerView: 1.2,
        spaceBetween: 24,
        grabCursor: true,
        mousewheel: true,
        breakpoints: {
            576: {
                slidesPerView: 2.2,
            },
            768: {
                slidesPerView: 3.2,
            },
            1200: {
                slidesPerView: 5,
                spaceBetween: 32,
            },
        },
    });
}

function destroyCareerSwiper() {
    if (careerSwiperInstance) {
        careerSwiperInstance.destroy(true, true);
        careerSwiperInstance = null;
    }
}


// ── 跨頁跳轉後處理 URL hash 錨點滾動 ──
function scrollToHashIfNeeded() {
    const hash = window.location.hash;
    if (hash) {
        const target = $(hash);
        if (target.length) {
            setTimeout(() => {
                lenis.scrollTo(target[0], { offset: -80, duration: 1 });
            }, 300);
        }
    }
}


// ════════════════════════════════════════
// ── GSAP動畫 + Barba ──
// ════════════════════════════════════════

function initPage(namespace) {
    ScrollTrigger.getAll().forEach(t => t.kill());
    window.scrollTo(0, 0);
    lenis.scrollTo(0, { immediate: true });
    lenis.on('scroll', ScrollTrigger.update);

    checkNavScroll();
    $(window).off('scroll', checkNavScroll).on('scroll', checkNavScroll);

    const container = document.querySelector(`[data-barba-namespace="${namespace}"]`);

    initCommon(container);

    if (namespace === 'home') {
        initUFO();
        initIntro();
        initCareerSwiper();
    } else {
        destroyCareerSwiper();
    }
    
    if (namespace === 'projects') { 
        initProjects(); 
    }

    setTimeout(() => {
        if (namespace === 'projects') { 
            initLottieScroll(container); 
        }

        lenis.resize();
        ScrollTrigger.refresh();
        scrollToHashIfNeeded();
    }, 200); 
}
// common
function initCommon(container) {
    // ── h2 highlight ──
    const h2s = container ? container.querySelectorAll("h2") : document.querySelectorAll("h2");

    h2s.forEach(h2 => {
        ScrollTrigger.create({
            trigger: h2,
            start: "top center",
            onEnter: () => h2.classList.add("highlight"),
            onLeaveBack: () => h2.classList.remove("highlight")
        });
    });

    // ── data-fadein ──
    const fadeinEls = container
        ? container.querySelectorAll("[data-fadein]")
        : document.querySelectorAll("[data-fadein]");

    fadeinEls.forEach(el => {
        const delay = el.dataset.fadeinDelay ? parseInt(el.dataset.fadeinDelay) : 0;
        ScrollTrigger.create({
            trigger: el,
            start: "top 88%",
            onEnter: () => {
                if (delay) {
                    setTimeout(() => el.classList.add("is-visible"), delay);
                } else {
                    el.classList.add("is-visible");
                }
            },
            onLeaveBack: () => el.classList.remove("is-visible"),
        });
    });
}
// index UFO
function initUFO() {
    const wrapper = document.querySelector("#ufo-wrapper");
    const beam = document.querySelector(".ufo-beam");
    const glow = document.querySelector(".ground-glow");

    if (!wrapper) return;

    let mm = gsap.matchMedia();

    mm.add({ isMobile: "(max-width: 820px)", isDesktop: "(min-width: 821px)" }, (context) => {
        
        let { isMobile } = context.conditions;
        // 1. clear
        gsap.killTweensOf([wrapper, beam, glow]);
        gsap.set(wrapper, { clearProps: "all" });

        // 2. ── 初始化飛碟位置 ──
        gsap.set(wrapper, {
            rotationZ: isMobile ? -10 : -15,
            x: isMobile ? 170 : 120,
            y: isMobile ? 40 : 70,
            scale: isMobile ? 0.8 : 1,
            rotationY: 0
        });

        gsap.set(".ufo-beam", {
            rotation: isMobile ? 10 : 15,
            x: isMobile ? 2 : 4,
            y: isMobile ? -45 : -64,
            transformOrigin: "top center"
        });
        gsap.set(glow, { x: isMobile ? '-40px' : '-64px', rotation: 8 });
        // 飛碟淡淡地顯現
        gsap.to([wrapper, beam, glow], { opacity: 1, duration: 0.3 });

        // 3. ── 分段飛行軌跡 ──
        const flightTl = gsap.timeline({ paused: true });

        // Sec 1：往上起飛
        flightTl.to(wrapper, {
            x: isMobile ? 170 : 120, 
            y: () => -window.innerHeight * (isMobile ? 0.25 : 0.32),
            rotationZ: -8,
            rotationY: -5,
            scale: isMobile ? 0.9 : 1.1,
            ease: "power2.out",
            duration: 1
        })
        // Sec 2：往右飛
        .to(wrapper, {
            x: () => window.innerWidth * (isMobile ? 0.40 : 0.50),
            y: () => window.innerHeight * (isMobile ? 0.1 : 0.12),
            rotationZ: 14,
            rotationY: 20,
            scale: isMobile ? 1.0 : 1.15,
            ease: "power1.inOut",
            duration: 1
        })
        // Sec 3：往左飛
        .to(wrapper, {
            x: () => -window.innerWidth * (isMobile ? 0.55 : 0.4),
            y: () => window.innerHeight * -0.10,
            rotationZ: -50,
            rotationY: -5,
            scale: isMobile ? 0.7 : 1,
            ease: "power1.inOut",
            duration: 1
        })
        // Sec 4 : 回到中間
        .to(wrapper, {
            // x: isMobile ? 170 : 120,
            x: () => window.innerWidth * (isMobile ? 0.4 : 0.2),
            y: () => window.innerHeight * (isMobile ? 0.3 : 0.05),
            rotationZ: -8,
            rotationY: -5,
            scale: isMobile ? 0.9 : 1.1,
            ease: "power2.out",
            duration: 1
        });

        // 4. ── ScrollTrigger 綁定 ──
        const container = document.querySelector('[data-barba-namespace="home"]');
        const sections = container ? container.querySelectorAll("section") : document.querySelectorAll("section");
        const totalSections = sections.length;

        sections.forEach((sec, i) => {
            ScrollTrigger.create({
                trigger: sec,
                start: i === 0 ? "top top" : "top center",
                end: "bottom center",
                scrub: 2,
                invalidateOnRefresh: true,
                onUpdate: (self) => {
                    const p = (i + self.progress) / totalSections;
                    flightTl.progress(p);
                }
            });
        });

        // 5. ── 其他共用動畫 (光束、懸浮) ──
        gsap.to([beam, glow], {
            scrollTrigger: {
                trigger: "body",
                start: "top 20%",
                end: "bottom bottom",
                scrub: 1,
            },
            opacity: 0.9,
            scaleY: 1.2,
        });

        gsap.to("#ufo-img", {
            y: "+=14",
            rotation: "-=2",
            duration: 2.8,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });

        // resize後，GSAP clear
        return () => {
            flightTl.kill();
        };
    });
}
// index 星球公轉
function initIntro() {
    gsap.killTweensOf({});

    const orbitContainer = document.querySelector('#intro-orbit');
    if (!orbitContainer) return;

    const baseWidth = 1200;
    const scale = orbitContainer.offsetWidth / baseWidth;

    const planets = [
        { el: '.planet-1', orbitRx: 575 * scale, orbitRy: 440 * scale, startAngle: -100, tilt: -35 },
        { el: '.planet-2', orbitRx: 225 * scale, orbitRy: 180 * scale, startAngle: 30,   tilt: -35 },
        { el: '.planet-3', orbitRx: 410 * scale, orbitRy: 310 * scale, startAngle: 150,  tilt: -35 },
    ].filter(p => document.querySelector(p.el) !== null);

    if (planets.length === 0) return;

    const angles = planets.map(p => p.startAngle);
    const speeds = [0.2, 0.4, 0.3];

    // ── 軌道 svg ──
    const DEBUG_ORBIT = false; // debug開關
    if (DEBUG_ORBIT) {
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('class', 'debug-orbits');
        svg.style.cssText = `
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            pointer-events: none;
            overflow: visible;
        `;
        const g = document.createElementNS(svgNS, 'g');
        g.setAttribute('transform', `translate(${orbitContainer.offsetWidth / 2}, ${orbitContainer.offsetHeight / 2})`);
        planets.forEach(p => {
            const ellipse = document.createElementNS(svgNS, 'ellipse');
            ellipse.setAttribute('cx', 0);
            ellipse.setAttribute('cy', 0);
            ellipse.setAttribute('rx', p.orbitRx);
            ellipse.setAttribute('ry', p.orbitRy);
            ellipse.setAttribute('fill', 'none');
            ellipse.setAttribute('stroke', 'rgba(255,255,255,0.3)');
            ellipse.setAttribute('stroke-width', '1');
            ellipse.setAttribute('transform', `rotate(${p.tilt})`);
            g.appendChild(ellipse);
        });
        svg.appendChild(g);
        orbitContainer.appendChild(svg);
    }

    // 計算傾斜橢圓上的 x/y
    function getOrbitPos(p, angleDeg) {
        const rad = (angleDeg * Math.PI) / 180;
        const tiltRad = (p.tilt * Math.PI) / 180;
        const ex = Math.cos(rad) * p.orbitRx;
        const ey = Math.sin(rad) * p.orbitRy;
        return {
            x: ex * Math.cos(tiltRad) - ey * Math.sin(tiltRad),
            y: ex * Math.sin(tiltRad) + ey * Math.cos(tiltRad),
        };
    }

    // 先把行星定位到初始軌道位置
    planets.forEach((p) => {
        const pos = getOrbitPos(p, p.startAngle);
        gsap.set(p.el, { x: pos.x, y: pos.y, opacity: 1 });
    });

    function startOrbit() {
        planets.forEach((p, i) => {
            gsap.to({}, {
                repeat: -1,
                ease: 'none',
                onUpdate: function() {
                    angles[i] += speeds[i];
                    const pos = getOrbitPos(p, angles[i]);
                    // ── 2. 安全起見，更新時也確認元素還在畫面上 ──
                    if (document.querySelector(p.el)) {
                        gsap.set(p.el, { x: pos.x, y: pos.y });
                    }
                }
            });
        });
    }

    ScrollTrigger.create({
        trigger: '#index-sec2',
        start: 'top center',
        once: true,
        onEnter: () => startOrbit()
    });

    // resize 時重算
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            document.querySelector('.debug-orbits')?.remove();
            if (document.querySelector('#intro-orbit')) {
                initIntro();
            }
        }, 300);
    });
}
// project page
function initProjects() {
    // project kv bg
    const projectkvBg = document.querySelector('.projectkv-bg');
    if (!projectkvBg) return;
    
    gsap.killTweensOf(projectkvBg);
    gsap.set(projectkvBg, { y: 0 });

    gsap.to(projectkvBg, {
        scrollTrigger: {
            trigger: ".projectkv-bg",
            start: "top top",
            end: "bottom top",
            scrub: true,
            invalidateOnRefresh: true
        },
        y: "20%",
        ease: "none"
    });
}
// Lottie + ScrollTrigger
function initLottieScroll(container) {
    const players = container ? container.querySelectorAll('.lottie-player') : document.querySelectorAll('.lottie-player');
    if (players.length === 0 || typeof lottie === 'undefined') return;

    players.forEach((el) => {
        if (el.lottieInstance) return; 

        const jsonPath = el.dataset.lottiePath;
        if (!jsonPath) return;

        const anim = lottie.loadAnimation({
            container: el,
            renderer: 'svg',
            loop: true,
            autoplay: false,
            path: jsonPath
        });

        anim.addEventListener('DOMLoaded', () => {
            ScrollTrigger.create({
                trigger: el,
                start: "top 85%",
                end: "bottom 15%",
                toggleActions: "play none none none", 
                onEnter: () => anim.play(),
                invalidateOnRefresh: true
            });
        });

        el.lottieInstance = anim;
    });
}
// 換頁時釋放Lottie
function destroyLotties(container) {
    const players = container ? container.querySelectorAll('.lottie-player') : document.querySelectorAll('.lottie-player');
    players.forEach(el => {
        if (el.lottieInstance) {
            el.lottieInstance.destroy();
            el.innerHTML = '';
        }
    });
}

// ── Barba 換頁設定 ──
barba.init({
    transitions: [{
        name: 'smooth-transition',
        leave(data) {
            $(window).off('scroll', checkNavScroll);
            $('#main-nav').removeClass('scrolled');

            destroyLotties(data.current.container);
            return gsap.to(data.current.container, {
                opacity: 0,
                duration: 0.4,
                ease: "power1.inOut"
            });
        },
        enter(data) {
            gsap.set(data.next.container, { 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                width: '100%', 
                opacity: 0 
            });
            return gsap.to(data.next.container, {
                opacity: 1,
                duration: 0.5,
                delay: 0.1,
                onComplete: () => {
                    gsap.set(data.next.container, { clearProps: "position,top,left" });
                }
            });
        }
    }]
});
barba.hooks.after((data) => {
    initPage(data.next.namespace);
});


// ── 第一次進入頁面 ──
$(window).on('load', function() {
    const initNamespace = document.querySelector('[data-barba-namespace]')?.dataset.barbaNamespace;
    initPage(initNamespace);
});