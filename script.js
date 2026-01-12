// ===== 데이터 예시 =====
// 실제로는 YTS API 결과나 직접 정리한 객체 배열을 써도 됨.
const rows = {
  korean: [
    {
      title: "한국 영화 1",
      thumb: "https://via.placeholder.com/400x250?text=KR+1",
      src: "https://www.w3schools.com/html/mov_bbb.mp4",
      subtitle: "한국 콘텐츠 예시",
      desc: "한국 영화 1의 간단한 설명입니다."
    },
    {
      title: "한국 영화 2",
      thumb: "https://via.placeholder.com/400x250?text=KR+2",
      src: "https://www.w3schools.com/html/mov_bbb.mp4",
      subtitle: "한국 콘텐츠 예시",
      desc: "한국 영화 2의 간단한 설명입니다."
    }
  ],
  trending: [
    {
      title: "요즘 뜨는 1",
      thumb: "https://via.placeholder.com/400x250?text=HOT+1",
      src: "https://www.w3schools.com/html/mov_bbb.mp4",
      subtitle: "지금 뜨는 콘텐츠",
      desc: "요즘 뜨는 1의 간단한 설명입니다."
    }
  ],
  top10: [
    {
      title: "TOP 1",
      thumb: "https://via.placeholder.com/400x250?text=TOP+1",
      src: "https://www.w3schools.com/html/mov_bbb.mp4",
      subtitle: "오늘 한국의 TOP 10",
      desc: "TOP 1 작품 설명입니다."
    }
  ]
};

// ===== HERO ELEMENTS =====
const heroVideo = document.getElementById("heroVideo");
const heroTitle = document.getElementById("heroTitle");
const heroSubtitle = document.getElementById("heroSubtitle");
const heroDesc = document.getElementById("heroDesc");

// 기본 히어로 소스 (원하면 바꿔도 됨)
heroVideo.src = "https://bodaponi.b-cdn.net/Whiplash.2014.720p.BluRay.H264.AAC-RARBG.mp4";

// ===== SLIDER 생성 =====
const sliders = document.querySelectorAll(".slider");
sliders.forEach((slider) => {
  const key = slider.dataset.row;
  const items = rows[key] || [];

  items.forEach((item) => {
    const card = document.createElement("button");
    card.className = "item";
    card.type = "button";
    card.setAttribute("data-video-src", item.src);
    card.setAttribute("data-title", item.title);
    card.setAttribute("data-subtitle", item.subtitle);
    card.setAttribute("data-desc", item.desc);

    card.innerHTML = `
      <img src="${item.thumb}" alt="${item.title}" />
      <div class="item-overlay"></div>
      <span class="item-title">${item.title}</span>
    `;

    card.addEventListener("click", () => {
      // 카드 클릭 시 히어로 업데이트
      const src = card.getAttribute("data-video-src");
      const title = card.getAttribute("data-title");
      const subtitle = card.getAttribute("data-subtitle");
      const desc = card.getAttribute("data-desc");

      if (src) {
        heroVideo.src = src;
        heroVideo.currentTime = 0;
        heroVideo.play().catch(() => {
          // 모바일에서 자동재생 막힐 수 있음
        });
      }
      if (title) heroTitle.textContent = title;
      if (subtitle) heroSubtitle.textContent = subtitle;
      if (desc) heroDesc.textContent = desc;
    });

    slider.appendChild(card);
  });
});

// ===== SLIDER 버튼 로직 (기존 아이디어 유지) =====
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

// ===== 모바일 메뉴 토글 (hover 대신 클릭) =====
const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
const menuList = document.querySelector(".menu-list");

if (mobileMenuBtn && menuList) {
  mobileMenuBtn.addEventListener("click", () => {
    menuList.style.display =
      menuList.style.display === "flex" ? "none" : "flex";
  });
}

// ===== hero 재생 버튼 (mute 토글 정도) =====
const heroPlayBtn = document.getElementById("heroPlayBtn");

if (heroPlayBtn) {
  heroPlayBtn.addEventListener("click", () => {
    if (heroVideo.paused) {
      heroVideo
        .play()
        .then(() => {
          heroVideo.muted = false;
        })
        .catch(() => {});
    } else {
      heroVideo.pause();
    }
  });
}
