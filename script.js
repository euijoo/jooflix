// ===== 데이터 예시 (기존 유지, src는 프록시 적용) =====
const rows = {
  korean: [
    {
      title: "한국 영화 1",
      thumb: "https://via.placeholder.com/400x250?text=KR+1",
      src: "https://bodaponi.b-cdn.net/%EC%B9%B4%EC%9A%B4%ED%8A%B8%20b.mp4",  // 원본 URL
      subtitle: "한국 콘텐츠 예시",
      desc: "한국 영화 1의 간단한 설명입니다."
    },
    {
      title: "한국 영화 2",
      thumb: "https://via.placeholder.com/400x250?text=KR+2",
      src: "https://bodaponi.b-cdn.net/%EC%B9%B4%EC%9A%B4%ED%8A%B8%20b.mp4",
      subtitle: "한국 콘텐츠 예시",
      desc: "한국 영화 2의 간단한 설명입니다."
    }
  ],
  trending: [
    {
      title: "요즘 뜨는 1",
      thumb: "https://via.placeholder.com/400x250?text=HOT+1",
      src: "https://bodaponi.b-cdn.net/%EC%B9%B4%EC%9A%B4%ED%8A%B8%20b.mp4",
      subtitle: "지금 뜨는 콘텐츠",
      desc: "요즘 뜨는 1의 간단한 설명입니다."
    }
  ],
  top10: [
    {
      title: "TOP 1",
      thumb: "https://via.placeholder.com/400x250?text=TOP+1",
      src: "https://bodaponi.b-cdn.net/%EC%B9%B4%EC%9A%B4%ED%8A%B8%20b.mp4",
      subtitle: "오늘 한국의 TOP 10",
      desc: "TOP 1 작품 설명입니다."
    }
  ]
};

// ===== CORS 프록시 함수 =====
function getProxyUrl(originalUrl) {
  return `https://api.allorigins.win/raw?url=${encodeURIComponent(originalUrl)}`;
}

// ===== HERO ELEMENTS & Video.js 초기화 =====
const heroVideoEl = document.getElementById("heroVideo");
const heroTitle = document.getElementById("heroTitle");
const heroSubtitle = document.getElementById("heroSubtitle");
const heroDesc = document.getElementById("heroDesc");

// Video.js 플레이어 초기화 (DOMContentLoaded 후 실행)
function initHeroPlayer(src) {
  const player = videojs(heroVideoEl, {
    fluid: true,
    responsive: true,
    playbackRates: [0.5, 1, 1.25, 1.5, 2],
    controlBar: {
      pictureInPictureToggle: false
    }
  });

  // 소스 설정 (프록시 적용)
  player.src({
    src: src ? getProxyUrl(src) : getProxyUrl("https://bodaponi.b-cdn.net/%EC%B9%B4%EC%9A%B4%ED%8A%B8%20b.mp4"),
    type: 'video/mp4'
  });

  // 자동 재생 + muted (모바일 호환)
  player.ready(() => {
    player.play().catch(() => {});  // autoplay 정책 무시
    player.muted(true);
    player.loop(true);
  });

  return player;
}

// DOM 로드 후 Video.js 초기화
document.addEventListener('DOMContentLoaded', () => {
  window.heroPlayer = initHeroPlayer();  // 전역으로 저장
});

// ===== SLIDER 생성 (프록시 적용) =====
const sliders = document.querySelectorAll(".slider");
sliders.forEach((slider) => {
  const key = slider.dataset.row;
  const items = rows[key] || [];

  items.forEach((item) => {
    const card = document.createElement("button");
    card.className = "item";
    card.type = "button";
    card.setAttribute("data-video-src", item.src);  // 원본 URL 저장
    card.setAttribute("data-title", item.title);
    card.setAttribute("data-subtitle", item.subtitle);
    card.setAttribute("data-desc", item.desc);

    card.innerHTML = `
      <img src="${item.thumb}" alt="${item.title}" />
      <div class="item-overlay"></div>
      <span class="item-title">${item.title}</span>
    `;

    card.addEventListener("click", () => {
      const src = card.getAttribute("data-video-src");
      const title = card.getAttribute("data-title");
      const subtitle = card.getAttribute("data-subtitle");
      const desc = card.getAttribute("data-desc");

      // Video.js 소스 변경 (프록시 적용)
      if (src && window.heroPlayer) {
        window.heroPlayer.src({
          src: getProxyUrl(src),
          type: 'video/mp4'
        });
        window.heroPlayer.currentTime(0);
        window.heroPlayer.play().catch(() => {});
      }
      if (title) heroTitle.textContent = title;
      if (subtitle) heroSubtitle.textContent = subtitle;
      if (desc) heroDesc.textContent = desc;
    });

    slider.appendChild(card);
  });
});

// ===== SLIDER 버튼 로직 (기존 유지) =====
const nextBtns = document.querySelectorAll(".next");
const prevBtns = document.querySelectorAll(".prev");

for (let i = 0; i < sliders.length; i++) {
  makeSlider(sliders[i], prevBtns[i], nextBtns[i]);
}

function makeSlider(element, prev, next) {
  const scrollAmount = () => element.getBoundingClientRect().width;

  next.addEventListener("click", () => {
    element.scrollBy({ left: scrollAmount(), behavior: "smooth" });
  });

  prev.addEventListener("click", () => {
    element.scrollBy({ left: -scrollAmount(), behavior: "smooth" });
  });
}

// ===== 모바일 메뉴 토글 =====
const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
const menuList = document.querySelector(".menu-list");

if (mobileMenuBtn && menuList) {
  mobileMenuBtn.addEventListener("click", () => {
    menuList.style.display = menuList.style.display === "flex" ? "none" : "flex";
  });
}

// ===== hero 재생 버튼 (Video.js 컨트롤) =====
const heroPlayBtn = document.getElementById("heroPlayBtn");

if (heroPlayBtn) {
  heroPlayBtn.addEventListener("click", () => {
    if (window.heroPlayer) {
      if (window.heroPlayer.paused()) {
        window.heroPlayer.play();
        window.heroPlayer.muted(false);
      } else {
        window.heroPlayer.pause();
      }
    }
  });
}
